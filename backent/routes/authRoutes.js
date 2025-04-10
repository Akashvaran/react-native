const express=require('express');
const { signup, login, getAllUsers, logout, Verify } = require('../controllers/authController');
const protectRoutes = require('../middleware/verfication');

const authRouter =express.Router()

authRouter.post('/signup',signup)
authRouter.post('/login',login)
authRouter.get('/getuser',protectRoutes,getAllUsers)
authRouter.get('/Verify',Verify)
authRouter.post('/logout',logout)

module.exports=authRouter