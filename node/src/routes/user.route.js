import { Router } from "express";
import { changePassword, checkOtp, checkUser, dashboard, forgotPassword, loginUser, predictDisease, registerUser } from "../controller/app/user.controller.js";
import authVerify from "../middlewares/auth.js";

const router = Router();

router.post("/register-user", registerUser)
router.post("/login", loginUser)
router.post("/predict", predictDisease)
router.get("/dashboard", authVerify, dashboard)

router.post("/forgot-password", forgotPassword)
router.post("/check-otp", checkOtp)
router.post("/change-password", changePassword)

router.get("/check-user", authVerify, checkUser)

export default router;