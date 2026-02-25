import mongoose from "mongoose";
import bcrypt from "bcrypt"
import logger from "../utils/logger.js";

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    phone: {
        type: Number,
        trim: true
    }
}, { timestamps: true })

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")){
        return next();
    } 

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt)
        next()
    } catch (error) {
        console.log("ERROR FROM userSchema.pre: ", error)
        next();
    }

})

const User = mongoose.model("User", UserSchema)

export default User