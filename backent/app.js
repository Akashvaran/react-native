const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoutes");
const messageRouter = require("./routes/messageRoutes");
const groupRouter = require("./routes/groupRoutes");


const app = express();

const allowedOrigins = [
  "exp://192.168.1.2:8081", 
];

app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/chat", messageRouter);
app.use("/groups",groupRouter );

module.exports = app;