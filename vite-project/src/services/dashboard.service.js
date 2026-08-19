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
        (await api.post("/api-keys/validate", { api_key })).data,
}

export default dashboardServices;
