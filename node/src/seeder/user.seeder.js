import mongoose from "mongoose"
import logger from "../utils/logger.js"
import User from "../models/user.model.js"

export const seedUser = async () => {
    try {
        const _id = new mongoose.Types.ObjectId("67caecb5a9b0e2dfc30784c1")
        const userData = {
            _id,
            username: "brighty",
            companyName: "Sisco pvt.",
            email: "brightyjiji@teamioss.in",
            password: "12345678",
            phone: 9207863690
        }

        const existingUser = await User.findById({ _id })

        if (!existingUser) {
            return await User.create(userData)
        }
    } catch (error) {
        logger.error("ERROR FROM seedUser: ", error)
    }
}