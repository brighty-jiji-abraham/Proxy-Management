import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config()

const connectDB = async () => {
    try {
        const connectionURL = process.env.connectionURL
        await mongoose.connect(connectionURL)
        console.log("Connected to Database Successfully");
    } catch (error) {
        console.error("ERROR FROM connectDB: ", error)
        process.exit(1)
    }
}

connectDB()




