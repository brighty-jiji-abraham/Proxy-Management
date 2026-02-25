import dotenv from "dotenv"
import logger from "../utils/logger.js"
import mongoose from "mongoose"
import { seedUser } from "./user.seeder.js"

dotenv.config()

const seedAll = async () => {
    try {
        await mongoose.connect(process.env.connectionURL)

        await seedUser()

    } catch (error) {
        logger.error("ERROR FROM seedAll: ", error)
    } finally {
        await mongoose.disconnect()
        process.exit()
    }
}

seedAll()