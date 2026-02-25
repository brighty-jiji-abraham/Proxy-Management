import User from "../../models/user.model.js";
import bcrypt from "bcrypt"
import logger from "../../utils/logger.js";
import jwt from "jsonwebtoken"
import { successMessage } from "../../utils/response.js";
import FormData from 'form-data';
import https from 'https';
import { sendMail } from "../../services/mail.service.js";
import Otp from "../../models/otp.model.js";
import { convertToUTC } from "../../utils/timeHandling.js";
import moment from "moment";

export const registerUser = async (req, res, next) => {
    try {
        const payload = req.body;
        if (payload.password !== payload.confirmPasswod) {
            throw { code: 1000 }
        }

        const doesEmailExists = await User.findOne({
            email: payload.email
        })

        if (doesEmailExists) {
            throw { code: 1001 }
        }

        const doesUsernameExists = await User.findOne({
            username: payload.username
        })

        if (doesUsernameExists) {
            throw { code: 1002 }
        }

        await User.create({
            companyName: payload.companyName,
            username: payload.username,
            email: payload.email,
            password: payload.password,
            phone: payload.phone
        })

        const response = await successMessage({ data: { message: "User registered successfully" } });
        return res.status(200).json(response.data);
    } catch (error) {
        console.log("ERROR FROM registerUser: ", error)
        return next(error);
    }
}

export const loginUser = async (req, res, next) => {
    try {
        const payload = req.body;

        const user = await User.findOne({
            username: payload.username
        })
        if (!user) throw { code: 1003 }

        const isMatch = await bcrypt.compare(payload.password, user.password)
        if (!isMatch) throw { code: 1004 }

        const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        const response = await successMessage({ data: { message: "Successfully Logined", accessToken } });
        return res.status(200).json(response.data);
    } catch (error) {
        logger.error("ERROR FROM loginUser: ", error)
        return next(error);
    }
}

export const dashboard = async (req, res, next) => {
    try {
        logger.info("user: ", req.user)
        const response = await successMessage({ data: { message: "Welcome" } });
        return res.status(200).json(response.data);
    } catch (error) {
        logger.error("ERROR FROM dashboard: ", error)
        return next(error);
    }
}

export const predictDisease = async (req, res, next) => {
    try {
        const contentType = req.headers['content-type'];
        logger.warn("contentType: ", contentType)

        const options = {
            hostname: process.env.PYTHON_IP,
            port: process.env.PYTHON_PORT,
            path: '/predict',
            method: 'POST',
            headers: {
                'Content-Type': contentType,
            },
            rejectUnauthorized: false,
        };

        const proxy = https.request(options, (pythonRes) => {
            let data = '';

            pythonRes.on('data', (chunk) => {
                data += chunk;
            });

            pythonRes.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    res.status(pythonRes.statusCode || 200).json(parsed);
                } catch (error) {
                    logger.error("ERROR from pythonCall: ", error)
                    res.status(pythonRes.statusCode || 200).send(data);
                }
            });
        });

        proxy.on('error', (err) => {
            console.error('Error forwarding to Python:', err);
            res.status(500).send('Error');
        });

        req.pipe(proxy);
    } catch (error) {
        logger.error("ERROR FROM predictDisease: ", error)
        return next(error);
    }
}

export const forgotPassword = async (req, res, next) => {
    try {
        const { username } = req.body;
        // const username = "ahmedz1dane"

        const user = await User.findOne({
            username
        })

        if (!user) {
            throw { code: 1006 }
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const date = new Date(Date.now() + 1 * 60 * 1000)
        const standardDateFormat = convertToUTC(date)

        await Otp.findOneAndUpdate(
            { userId: user._id },
            {
                otp: code,
                expiresIn: standardDateFormat,
                status: false
            },
            {
                upsert: true,
                new: true,
            }
        );

        const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7;">
          <div style="max-width: 500px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #333333;">Password Reset Code</h2>
            <p style="color: #555555;">Use the following code to reset your password:</p>
            <div style="font-size: 24px; font-weight: bold; color: #1a73e8; margin: 20px 0;">${code}</div>
            <p style="color: #999999; font-size: 12px;">This code will expire in 10 minutes.</p>
          </div>
        </div>
      `;

        await sendMail(
            user.email,
            "Your Password Reset Code",
            `Your verification code is: ${code}`,
            html
        )

        const response = await successMessage({ data: { message: "Check your mail" } });

        return res.status(200).json(response.data);
    } catch (error) {
        logger.error("ERROR FROM forgotPassword: ", error)
        return next(error);
    }
}

export const checkOtp = async (req, res, next) => {
    try {
        const { username, otp } = req.body;

        const user = await User.findOne({
            username
        })

        if (!user) {
            throw { code: 1006 }
        }

        const otpDetails = await Otp.findOne({
            userId: user._id
        })

        if (!otpDetails) {
            throw { code: 1008 }
        } else if (otpDetails.status) {
            throw { code: 1009 }
        } else if (otp != otpDetails.otp) {
            throw { code: 1007 }
        }

        const response = await successMessage({ data: { message: "Otp is correct" } });
        return res.status(200).json(response.data);
    } catch (error) {
        logger.error("ERROR FROM checkOtp: ", error)
        return next(error);
    }
}

export const changePassword = async (req, res, next) => {
    try {
        const { username, otp, newPassword, confirmNewPassword } = req.body;

        if (newPassword != confirmNewPassword) {
            throw { code: 1000 }
        }

        const user = await User.findOne({ username })

        if (!user) {
            throw { code: 1006 }
        }

        const otpDetails = await Otp.findOne({
            userId: user._id
        })

        if (!otpDetails) {
            throw { code: 1008 }
        } else if (otpDetails.status) {
            throw { code: 1009 }
        } else if (otp != otpDetails.otp) {
            throw { code: 1007 }
        }

        user.password = newPassword
        await user.save();

        otpDetails.status = true
        await otpDetails.save()

        const response = await successMessage({ data: { message: "Password Changed Successfully" } });
        return res.status(200).json(response.data);
    } catch (error) {
        logger.error("ERROR FROM changePassword: ", error)
        return next(error);
    }
}

export const checkUser = async (req, res, next) => {
    try {
        const response = await successMessage({ data: { message: "User is Logged in Successfully" } });
        return res.status(200).json(response.data);
    } catch (error) {
        logger.error("ERROR FROM checkUser: ", error);
        return next(error);
    }
}