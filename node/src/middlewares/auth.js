import User from "../models/user.model.js";
import logger from "../utils/logger.js"
import jwt from "jsonwebtoken"


const authVerify = async (req, res, next) => {
    try {
        let token = undefined;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization && req.headers.authorization.split(' ')[1];
        } else if (req.cookies.authToken) {
            token = req.cookies.authToken
        }


        if (!token) {
            throw { code: 1005 }
        }
        logger.warn("hloooooooooo: ")

        const decoded2 = jwt.decode(token);
        console.log(new Date(decoded2.exp * 1000)); // This shows the expiry time
        console.log("Server time:", new Date());


        const decoded = jwt.verify(token.trim(), process.env.JWT_SECRET)
        logger.warn("decoded: ", decoded)

        const user = await User.findById(decoded.userId).select({
            password: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0
        });

        if (!user) {
            throw { code: 1006 }
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error("ERROR FROM authVerify: ", error)
        return next(error);
    }
}

export default authVerify