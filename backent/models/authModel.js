const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        minlength: [5, "Name must be at least 5 characters"],
        maxlength: [20, "Name must be at most 20 characters"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
    },
    mobile: {
        type: String,
        required: [true, "Mobile number is required"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters long"],
    },
    }, {
    timestamps: true,
});

const AuthModel = mongoose.model("ChatUser", userSchema);

module.exports = AuthModel;
