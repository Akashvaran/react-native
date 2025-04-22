const AuthModel = require("../models/authModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id, email) => {
    return jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const signup = async (req, res, next) => {
    console.log(req.body);
    
    const { name, email, mobile, password } = req.body;

    try {
        const existingUser = await AuthModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new AuthModel({ name, email, mobile, password: hashPassword });

        await newUser.save();

        const token = generateToken(newUser._id, newUser.email);
        res.cookie("jwt", token, { maxAge: 3600000, httpOnly: true });

        res.status(201).json({
            message: "User signed up successfully",
            user: { id: newUser._id, name: newUser.name },
            token
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    console.log(req.body);
    
    const { email, password } = req.body;

    try {
        const user = await AuthModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken(user._id, user.email);
        res.cookie("jwt", token, { maxAge: 3600000, httpOnly: true });

        res.status(200).json({
            message: "Login successful",
            user: { id: user._id, name: user.name },
            token
        });
    } catch (err) {
        next(err);
    }


};


const getAllUsers = async (req, res, next) => {
    try {
        const users = await AuthModel.find();
        res.status(200).json({
            message: "successfully get the user",
            users,
        });
    } catch (err) {
        next(err);
    }
};


 const Verify = async (req, res) => {
    // console.log(req.body)
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ status: false, msg: "Not authorized" });
        }
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ status: true, user: decodedData });
    } catch (err) {
        res.status(401).json({ status: false, msg: "Invalid token" });
    }
};

const logout = async (req, res, next) => {
    try {
        
        
        res.cookie("jwt", "", { maxAge: 1, httpOnly: true }); 

        res.status(200).json({ message: "Logout successful" });
    } catch (err) {
        next(err);
    }
};

    module.exports = {
        signup,
        login,
        getAllUsers,
        Verify,
        logout
    };
