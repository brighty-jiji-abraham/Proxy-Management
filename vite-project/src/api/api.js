import axios from "axios";


const api = axios.create({
    baseURL: import.meta.env.VITE_baseURL
})

api.interceptors.request.use((req) => {
    if(req.data instanceof FormData){
        req.headers = req.headers || {}
        req.headers["Content-Type"] = "multipart/form-data"
    }
    req.headers["X-API-Key"] = "your-master-api-key-here"
    // req.headers["authorization"] = `Bearer ${localStorage.getItem("accessToken")}`
    return req
})


// api.interceptors.response.use((res) => {
//     // if (res.status === 200) {
//     //     return res;
//     // }
// })
export default api