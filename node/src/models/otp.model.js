import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    otp: {
        type: Number,
        required: true,
        minlength: 6,
        maxlength: 6
    },
    status: {
        type: Boolean,
        default: false,
    },
    expiresIn: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
}, { timestamps: true })

const Otp = mongoose.model("Otp", otpSchema)

export default Otp