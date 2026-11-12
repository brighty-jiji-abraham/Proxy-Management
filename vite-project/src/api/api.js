import axios from "axios";
import { readCredential, saveCredential } from '../utils/credentialStorage'

// Base URL of the proxy's admin API, e.g. http://localhost:2000/admin
const api = axios.create({
    baseURL: import.meta.env.VITE_baseURL
})

// The master key gates every write endpoint on the proxy (/admin/backends/add,
// /admin/api-keys, /admin/config). It used to be hardcoded here as the literal
// placeholder "your-master-api-key-here" from .env.example, which meant the UI
// only ever worked against an unconfigured proxy. It now comes from the build
// env and can also be overridden at runtime from the login screen.
//
// NOTE: a Vite env var is baked into the built bundle and is readable by anyone
// who loads the page. That is acceptable only because this UI is meant to run
// on the same private machine as the proxy. Do not deploy it publicly.
export const getApiKey = () =>
    readCredential(localStorage, sessionStorage, import.meta.env.VITE_apiKey || '')

export const setApiKey = (key, { remember = true } = {}) =>
    saveCredential(key, remember, localStorage, sessionStorage)

api.interceptors.request.use((req) => {
    if (req.data instanceof FormData) {
        req.headers = req.headers || {}
        req.headers["Content-Type"] = "multipart/form-data"
    }
    const key = getApiKey()
    if (key) req.headers["X-API-Key"] = key
    return req
})

// Surface the proxy's own error payload rather than axios' generic message:
// the admin API returns {error, message} and that is what the user needs.
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const payload = err?.response?.data
        err.friendlyMessage =
            payload?.error || payload?.message || err.message || "Request failed"
        err.statusCode = err?.response?.status
        return Promise.reject(err)
    }
)

export default api
