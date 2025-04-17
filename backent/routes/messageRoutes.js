const express = require("express");
const { getMessages, getUnreadMessages } = require("../controllers/messageController");
const protectRoutes = require("../middleware/verfication");

const messageRouter = express.Router();

messageRouter.get("/messages/:sender/:receiver", protectRoutes, getMessages);
messageRouter.get("/unread/:userId",protectRoutes,getUnreadMessages );


module.exports = messageRouter;
