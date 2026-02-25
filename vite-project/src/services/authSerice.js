import api from "../api/api"

const authSerices = {
    login: async (data) => {
        try {
            const response = await api.post("/login", data)
            console.log("resposnse from API: ", response);
            
            return response
        } catch (error) {
            console.log("ERROR FROM Login: ", error)
            return error
        }
    },
    checkUser: async () => {
        try {
            const response = await api.get("/check-user")
            return response
        } catch (error) {
            console.log("ERROR FROM checkUser: ", error)
            return error
        }
    }
}


export default authSerices