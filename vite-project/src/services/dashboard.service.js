import api from "../api/api.js"

const dashboardServices = {
    getDashboardDetails: async () => {
        try {
            const response = await api.get("/backends")
            return response;
        } catch (error) {
            console.log("ERROR FROM getDashboardDetails: ", error)
            return error
        }
    },
    getConfigDetails: async () => {
        try {
            const response = await api.get("/config")
            return response;
        } catch (error) {
            console.log("ERROR FROM getConfigDetails: ", error)
            return error
        }
    },
    getMetricsDetails: async () => {
        try {
            const response = await api.get("/metrics")
            return response;
        } catch (error) {
            console.log("ERROR FROM getMetricsDetails: ", error)
            return error
        }
    }
}

export default dashboardServices;