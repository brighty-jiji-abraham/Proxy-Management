const measured = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0

export function summarizeBackends(data) {
    const priority = { unhealthy: 0, unknown: 1, healthy: 2 }
    const backends = Object.entries(data || {})
        .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value))
        .map(([id, backend]) => ({
            ...backend,
            id,
            route: backend.route || id.replace(/:\d+$/, ''),
            name: backend.name || backend.route || id,
            status: ['healthy', 'unhealthy'].includes(backend.status) ? backend.status : 'unknown',
            response_time: measured(backend.response_time) ? backend.response_time : null,
        }))
        .sort((a, b) => priority[a.status] - priority[b.status] || a.name.localeCompare(b.name))
    const healthy = backends.filter((backend) => backend.status === 'healthy').length
    const unhealthy = backends.filter((backend) => backend.status === 'unhealthy').length
    return {
        backends,
        healthy,
        unhealthy,
        unknown: backends.length - healthy - unhealthy,
        total: backends.length,
        routes: new Set(backends.map((backend) => backend.route)).size,
        healthyPercent: backends.length ? (healthy / backends.length) * 100 : null,
    }
}

export function summarizeMonitoring(data) {
    const total = measured(data?.requests_total) ? data.requests_total : null
    const errors = measured(data?.errors_total) ? data.errors_total : null
    // MonitoringService already returns error_rate as a percentage, not a fraction.
    const errorRate =
        total > 0
            ? measured(data?.error_rate)
                ? data.error_rate
                : errors == null
                  ? null
                  : (errors / total) * 100
            : null
    const statuses = Object.entries(data?.status_codes || {})
        .filter(([, count]) => measured(count) && count > 0)
        .map(([code, count]) => ({
            code,
            count,
            color: code.startsWith('2')
                ? '#34d399'
                : code.startsWith('3')
                  ? '#38bdf8'
                  : code.startsWith('4')
                    ? '#fbbf24'
                    : code.startsWith('5')
                      ? '#fb7185'
                      : '#a78bfa',
        }))
        .sort((a, b) => b.count - a.count)
    return {
        total,
        errors,
        errorRate,
        statuses,
        statusTotal: statuses.reduce((sum, status) => sum + status.count, 0),
        average: total > 0 && measured(data?.avg_response_time_ms) ? data.avg_response_time_ms : null,
        rpm: measured(data?.requests_per_minute) ? data.requests_per_minute : null,
        uptime: measured(data?.uptime_seconds) ? data.uptime_seconds : null,
        paths: Object.entries(data?.popular_paths || {})
            .filter(([, count]) => measured(count) && count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5),
    }
}

export function uptimeLabel(seconds) {
    if (!measured(seconds)) return '—'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days) return `${days}d ${hours}h ${minutes}m`
    if (hours) return `${hours}h ${minutes}m`
    if (minutes) return `${minutes}m ${Math.floor(seconds % 60)}s`
    return `${Math.floor(seconds)}s`
}

export function filterBackends(backends, search = '', status = 'all') {
    const query = search.trim().toLowerCase()
    return backends.filter(
        (backend) =>
            (status === 'all' || backend.status === status) &&
            (!query ||
                [backend.name, backend.route, backend.url, backend.error].some((value) =>
                    String(value || '')
                        .toLowerCase()
                        .includes(query)
                ))
    )
}
