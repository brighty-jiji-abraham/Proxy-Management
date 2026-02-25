import moment from "moment"
import logger from "./logger.js"

export const convertToUTC = (time) => {
    try {
        return moment(time).utc().toISOString()
    } catch (error) {
        logger.error("ERROR FROM convertToUTC: ", error)
        throw error
    }
}