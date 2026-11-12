import api from "../api/api.js"

/**
 * Every endpoint the proxy's admin API exposes.
 *
 * Auth, per proxy_server/routes/admin.py:
 *   - reads (backends, routes, metrics, websocket-sessions, tunnel) need no key
 *   - writes (backends/add, backends/remove, api-keys) need the MASTER key,
 *     and so does /config
 *
 * Each call returns the response body directly and lets errors propagate, so
 * react-query can drive its own isError / isLoading state. The previous version
 * caught everything and returned the error object as if it were data, which
 * made a failed request indistinguishable from an empty one.
 */
const dashboardServices = {
    // --- health and status ----------------------------------------------
    checkConnection: async ({ signal } = {}) => {
        const start = performance.now()
        const response = await api.get('/health', { timeout: 5000, signal })
        if (response.data?.status !== 'healthy' || response.data?.component !== 'admin-panel')
            throw new Error('The configured address did not return the proxy admin health check.')
        return { roundTrip: Math.round(performance.now() - start) }
    },
    getDashboardDetails: async () => (await api.get("/backends")).data,
    getBackendsSummary: async () => (await api.get("/backends/summary")).data,
    getRouteBackends: async (route) =>
        (await api.get(`/backends/${route.replace(/^\//, "")}`)).data,

    getConfigDetails: async () => (await api.get("/config")).data,
    getMetricsDetails: async () => (await api.get("/metrics")).data,
    getRoutes: async () => (await api.get("/routes")).data,
    getLoadBalancerStats: async () => (await api.get("/load-balancer/stats")).data,
    getWebsocketSessions: async () => (await api.get("/websocket-sessions")).data,

    // --- tunnel -----------------------------------------------------------
    // Served by the Kingdom, not the tunnel head: the head's /_tunnel/* lives
    // on a private port on the public server that the browser cannot reach.
    getTunnelStatus: async () => (await api.get("/tunnel")).data,

    // Tunnel settings live in MongoDB alongside the routes, so they can be
    // edited here instead of in .env. The token is never sent back - the API
    // reports only whether one is set.
    getTunnelConfig: async () => (await api.get("/tunnel/config")).data,

    // Recent requests plus a per-minute traffic series, held in memory by the
    // tunnel client. Resets with the proxy - the durable record is its log.
    getTunnelRequests: async (limit = 100) =>
        (await api.get(`/tunnel/requests?limit=${limit}`)).data,
    saveTunnelConfig: async (fields) =>
        (await api.post("/tunnel/config", fields)).data,

    // --- call history per service (master key) ----------------------------
    // Every request each backend route was asked, newest first, plus a
    // per-minute traffic series. route = "/crawler" etc, or omit for all.
    // In memory on the proxy, so it resets when the proxy restarts.
    getServiceRequests: async ({ route, limit = 200, errors = false } = {}) => {
        const params = new URLSearchParams({ limit: String(limit) })
        if (route) params.set("route", route)
        if (errors) params.set("errors", "1")
        return (await api.get(`/services/requests?${params}`)).data
    },
    clearServiceRequests: async (route) =>
        (await api.post("/services/requests/clear", route ? { route } : {})).data,

    // --- backend management (master key) ----------------------------------
    addBackend: async ({ route, url }) =>
        (await api.post("/backends/add", { route, url })).data,
    removeBackend: async ({ route, url }) =>
        (await api.post("/backends/remove", { route, url })).data,

    // --- API keys (master key) --------------------------------------------
    listApiKeys: async () => (await api.get("/api-keys")).data,
    createApiKey: async ({ user_id, name }) =>
        (await api.post("/api-keys", { user_id, name })).data,
    revokeApiKey: async (api_key) =>
        (await api.post("/api-keys/revoke", { api_key })).data,
    validateApiKey: async (api_key) =>
        (await api.post("/api-keys/validate", { api_key }, { timeout: 15000 })).data,
}

export default dashboardServices;
