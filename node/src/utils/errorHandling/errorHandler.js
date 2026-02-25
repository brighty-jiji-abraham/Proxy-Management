import logger from "../logger.js";
import { errorMessage } from "../response.js";

const errorHandler = (err, req, res, next) => {
    logger.warn("------ERROR LOG FROM MIDDLEWARE------");
    logger.warn(`${req?.method ?? ""} ${req?.url ?? ""}:`)
    logger.error(`${err.code ? JSON.stringify(err) : err}\n`)

    if (err.code) {
        errorMessage({ code: err.code }).then((response) => {
            logger.error("ERROR Message: ", response.data.data.description)
            return res.status(422).json(response.data);
        })
    } else if (res && !res.headersSent) {
        return res.status(err.statusCode || 500).json({
            status: false,
            data: {
                error: err.name,
                description: err.message,
            }
        });
    }

}

export default errorHandler