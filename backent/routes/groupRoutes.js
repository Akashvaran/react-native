const express = require("express");
const { createGroup, getUserGroups, getGroupMessages} = require("../controllers/groupController");
const protectRoutes = require("../middleware/verfication");


const groupRouter = express.Router();


groupRouter.post("/create",protectRoutes, createGroup);
groupRouter.get("/:id",protectRoutes,getUserGroups);
groupRouter.get("/:groupId/messages",protectRoutes, getGroupMessages);


module.exports = groupRouter;