export const measured = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0

export const pollingOptions = (paused, interval) => ({
    refetchInterval: paused ? false : interval,
    refetchOnWindowFocus: !paused,
    refetchOnReconnect: !paused,
    retry: (count, error) => ![401, 403].includes(error?.statusCode || error?.response?.status) && count < 1,
})

export function groupBackendRoutes(backends) {
    const routes = new Map()
    for (const backend of backends) {
        if (!routes.has(backend.route))
            routes.set(backend.route, {
                route: backend.route,
                instances: [],
                healthy: 0,
                unhealthy: 0,
                unknown: 0,
            })
        const group = routes.get(backend.route)
        group.instances.push(backend)
        group[['healthy', 'unhealthy'].includes(backend.status) ? backend.status : 'unknown']++
    }
    return [...routes.values()].sort(
        (a, b) => b.unhealthy - a.unhealthy || b.unknown - a.unknown || a.route.localeCompare(b.route)
    )
}

export function bytesLabel(bytes) {
    if (!measured(bytes)) return '—'
    if (!bytes) return '0 B'
    const unit = Math.min(4, Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024))))
    return (
        (bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: unit ? 1 : 0 }) +
        ' ' +
        ['B', 'KiB', 'MiB', 'GiB', 'TiB'][unit]
    )
}

export function modelSummary(data) {
    const models = (Array.isArray(data?.models) ? data.models : [])
        .filter(
            (model) => model && typeof model === 'object' && typeof (model.name || model.model) === 'string'
        )
        .map((model) => ({
            ...model,
            name: model.name || model.model,
            family: model.details?.family || 'Unknown',
            size: measured(model.size) ? model.size : null,
        }))
    const families = new Map()
    for (const model of models) families.set(model.family, (families.get(model.family) || 0) + 1)
    const sized = models.filter((model) => model.size != null)
    return {
        models,
        families: [...families].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
        size: sized.reduce((sum, model) => sum + model.size, 0),
        sized: sized.length,
        quantizations: new Set(models.map((model) => model.details?.quantization_level).filter(Boolean)).size,
    }
}

export function filterModels(models, { search = '', family = 'all', sort = 'name' } = {}) {
    const query = search.trim().toLowerCase()
    return models
        .filter(
            (model) =>
                (family === 'all' || model.family === family) &&
                [
                    model.name,
                    model.family,
                    model.details?.parameter_size,
                    model.details?.quantization_level,
                ].some((value) =>
                    String(value || '')
                        .toLowerCase()
                        .includes(query)
                )
        )
        .sort((a, b) =>
            sort === 'size'
                ? (b.size ?? -1) - (a.size ?? -1) || a.name.localeCompare(b.name)
                : sort === 'modified'
                  ? (Date.parse(b.modified_at) || 0) - (Date.parse(a.modified_at) || 0) ||
                    a.name.localeCompare(b.name)
                  : a.name.localeCompare(b.name)
        )
}

export function validUrl(value, protocols = ['http:', 'https:'], optional = false) {
    if (!value.trim()) return optional
    try {
        const url = new URL(value.trim())
        return protocols.includes(url.protocol) && Boolean(url.hostname)
    } catch {
        return false
    }
}

export function tunnelPayload(values) {
    const payload = {
        server_url: values.server_url.trim(),
        client_name: values.client_name.trim(),
        local_target: values.local_target.trim(),
    }
    // The API treats an empty token as clearing it. Blank input must preserve the credential.
    if (values.token) payload.token = values.token
    return payload
}
