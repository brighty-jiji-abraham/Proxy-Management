export const number = (value) => new Intl.NumberFormat().format(value ?? 0)

export const duration = (value) => {
    if (value == null || !Number.isFinite(value)) return '—'
    return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
}

export const timeLabel = (timestamp) =>
    new Date(timestamp * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })

export const isFailed = (request) => Boolean(request.error) || request.status == null || request.status >= 400

export function percentile(values, percent) {
    if (!values.length) return null
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1)]
}

// Connect observed averages without treating quiet minutes as zero latency.
// Flag spans with missing samples so the chart can distinguish them visually.
export function latencySeries(series) {
    const points = series.flatMap((bucket, index) =>
        bucket.count > 0 && Number.isFinite(bucket.avg_ms) && bucket.avg_ms >= 0
            ? [{ index, minute: bucket.minute, ms: bucket.avg_ms }]
            : []
    )
    const segments = points.slice(1).map((point, index) => ({
        from: points[index],
        to: point,
        gap: point.index - points[index].index > 1 || point.minute - points[index].minute > 60,
    }))
    return { points, segments }
}

const STATUS_GROUPS = [
    { key: '2xx', label: 'Successful', color: '#34d399' },
    { key: '3xx', label: 'Redirected', color: '#38bdf8' },
    { key: '4xx', label: 'Client errors', color: '#fbbf24' },
    { key: '5xx', label: 'Server errors', color: '#fb7185' },
    { key: '1xx', label: 'Informational', color: '#a78bfa' },
    { key: 'other', label: 'No HTTP status', color: '#94a3b8' },
]

// Traffic buckets cover every call. Individual records are a bounded sample;
// keep their percentiles and breakdowns separate from the aggregate metrics.
export function analyzeCalls(data, requestedMinutes = 60) {
    const windowMinutes = Math.min(requestedMinutes, data?.window_minutes || 60)
    const series = (data?.traffic || []).slice(-windowMinutes)
    const start = series[0]?.minute
    const end = series.at(-1)?.minute + 60
    const requests = (data?.requests || []).filter((r) => r.at >= start && r.at < end)
    const total = series.reduce((sum, bucket) => sum + bucket.count, 0)
    const errors = series.reduce((sum, bucket) => sum + bucket.errors, 0)
    const latencies = requests.map((r) => r.ms).filter((ms) => Number.isFinite(ms) && ms >= 0)
    const statuses = STATUS_GROUPS.map((group) => ({ ...group, count: 0 }))
    const distribution = [
        { label: '< 100 ms', max: 100, count: 0 },
        { label: '100–300', max: 300, count: 0 },
        { label: '300–500', max: 500, count: 0 },
        { label: '500–1k', max: 1000, count: 0 },
        { label: '1–3 s', max: 3000, count: 0 },
        { label: '≥ 3 s', max: Infinity, count: 0 },
    ]
    const endpoints = new Map()
    const clients = new Set()
    const backends = new Set()
    const methods = new Map()
    for (const request of requests) {
        const key =
            request.status >= 100 && request.status < 600 ? `${Math.floor(request.status / 100)}xx` : 'other'
        statuses.find((group) => group.key === key).count += 1
        if (request.client) clients.add(request.client)
        if (request.backend) backends.add(request.backend)
        methods.set(request.method || 'Unknown', (methods.get(request.method || 'Unknown') || 0) + 1)
        const endpointKey = JSON.stringify([request.method, request.route, request.path])
        const endpoint = endpoints.get(endpointKey) || {
            method: request.method,
            route: request.route,
            path: request.path,
            count: 0,
            errors: 0,
        }
        endpoint.count += 1
        endpoint.errors += isFailed(request) ? 1 : 0
        endpoints.set(endpointKey, endpoint)
    }
    for (const ms of latencies)
        distribution.find((bucket) => ms < bucket.max || bucket.max === Infinity).count += 1
    const peak = series.reduce((best, bucket) => (bucket.count > (best?.count || 0) ? bucket : best), null)

    // Compare equal, completed intervals; the live minute is still accumulating.
    const completed = series.slice(0, -1)
    const half = Math.floor(completed.length / 2)
    const previous = half ? completed.slice(-half * 2, -half).reduce((sum, b) => sum + b.count, 0) : 0
    const recent = half ? completed.slice(-half).reduce((sum, b) => sum + b.count, 0) : 0
    const trend = previous > 0 ? ((recent - previous) / previous) * 100 : null

    return {
        series,
        requests,
        total,
        errors,
        windowMinutes,
        peak,
        trend,
        trendMinutes: half,
        successRate: total ? ((total - errors) / total) * 100 : null,
        average: total ? series.reduce((sum, b) => sum + b.avg_ms * b.count, 0) / total : null,
        rpm: series.length ? total / series.length : 0,
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        slow: latencies.filter((ms) => ms >= 1000).length,
        statuses,
        distribution,
        clients: clients.size,
        backends: backends.size,
        methods: [...methods].sort((a, b) => b[1] - a[1]),
        endpoints: [...endpoints.values()].sort((a, b) => b.count - a.count).slice(0, 5),
        slowest: requests
            .filter((r) => Number.isFinite(r.ms))
            .reduce((best, r) => (!best || r.ms > best.ms ? r : best), null),
    }
}

export function filterCalls(requests, { search = '', outcome = 'all', method = 'all' } = {}) {
    const query = search.trim().toLowerCase()
    return requests.filter((r) => {
        if (outcome === 'errors' && !isFailed(r)) return false
        if (outcome === 'slow' && !(r.ms >= 1000)) return false
        if (method !== 'all' && r.method !== method) return false
        return (
            !query ||
            [r.path, r.client, r.method, r.route, r.error, r.status, r.backend].some(
                (value) => value != null && String(value).toLowerCase().includes(query)
            )
        )
    })
}

export function callsCsv(requests) {
    const cell = (value) => {
        let text = String(value ?? '')
        // Request paths and other caller-controlled fields must stay text in Excel.
        if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
        return `"${text.replaceAll('"', '""')}"`
    }
    return [
        [
            'Time (UTC)',
            'Method',
            'Service',
            'Path',
            'Caller',
            'Status',
            'Duration (ms)',
            'Backend',
            'Error',
            'Protocol',
        ],
        ...requests.map((r) => [
            new Date(r.at * 1000).toISOString(),
            r.method,
            r.route,
            r.path,
            r.client,
            r.status,
            r.ms,
            r.backend,
            r.error,
            r.kind === 'ws' ? 'WebSocket' : 'HTTP',
        ]),
    ]
        .map((row) => row.map(cell).join(','))
        .join('\r\n')
}
