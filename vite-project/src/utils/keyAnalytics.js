const timestamp = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0

export function keyUsage(lastUsed, now) {
    if (lastUsed == null) return 'never'
    if (!timestamp(lastUsed) || lastUsed > now) return 'unknown'
    const age = now - lastUsed
    return age <= 86400 ? 'recent' : age <= 7 * 86400 ? 'week' : 'older'
}

export function summarizeKeys(data, now) {
    const rows = (Array.isArray(data?.api_keys) ? data.api_keys : [])
        .filter((row) => row && typeof row === 'object' && typeof row.key === 'string' && row.key)
        .map((row) => ({
            ...row,
            name: typeof row.name === 'string' && row.name.trim() ? row.name : 'Unnamed key',
            user_id: typeof row.user_id === 'string' && row.user_id ? row.user_id : 'Unassigned',
            created_at: timestamp(row.created_at) ? row.created_at : null,
            last_used: timestamp(row.last_used) ? row.last_used : null,
            usage: keyUsage(row.last_used, now),
            isAdmin: row.user_id === 'master',
        }))
    const usage = [
        { key: 'recent', label: 'Last 24 hours', color: '#34d399' },
        { key: 'week', label: '1–7 days ago', color: '#38bdf8' },
        { key: 'older', label: 'Over 7 days ago', color: '#a78bfa' },
        { key: 'never', label: 'Never used', color: '#64748b' },
        { key: 'unknown', label: 'Unknown usage', color: '#fbbf24' },
    ].map((bucket) => ({ ...bucket, count: rows.filter((row) => row.usage === bucket.key).length }))
    const owners = new Map()
    for (const row of rows) owners.set(row.user_id, (owners.get(row.user_id) || 0) + 1)
    return {
        rows,
        total: rows.length,
        clients: rows.filter((row) => !row.isAdmin).length,
        admins: rows.filter((row) => row.isAdmin).length,
        recent: usage[0].count,
        never: usage[3].count,
        usage,
        owners: [...owners].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    }
}

export function filterKeys(rows, { search = '', role = 'all', usage = 'all', sort = 'newest' } = {}) {
    const query = search.trim().toLowerCase()
    return rows
        .filter(
            (row) =>
                (role === 'all' || (role === 'admin' ? row.isAdmin : !row.isAdmin)) &&
                (usage === 'all' || row.usage === usage) &&
                (!query || [row.name, row.user_id].some((value) => value.toLowerCase().includes(query)))
        )
        .sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name)
            if (sort === 'used')
                return (b.last_used ?? -1) - (a.last_used ?? -1) || a.name.localeCompare(b.name)
            return (b.created_at ?? -1) - (a.created_at ?? -1) || a.name.localeCompare(b.name)
        })
}

export function keyDate(value, fallback = 'Not reported') {
    if (!timestamp(value)) return fallback
    const date = new Date(value * 1000)
    return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString()
}

export function keyFormPayload(values) {
    return { user_id: values.user_id.trim(), name: values.name.trim() || 'Generated Key' }
}
