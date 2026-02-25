import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import userRouter from "./routes/user.route.js"
import './db/db.js'
import errorHandler from './utils/errorHandling/errorHandler.js'
import logger from './utils/logger.js'

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000


app.use(cors({
    origin: "*",
    credentials: true,
}));

app.use("/app", userRouter)

const server = app.listen(PORT, () => {
    try {
        console.log(`Listening to the port ${PORT}`)
    } catch (error) {
        logger.error("ERROR FROM port connection: ", error)
    }
})

app.use(errorHandler)

app.use((req, res) => {
    res.status(200).json({ "message": "No such API" })
})