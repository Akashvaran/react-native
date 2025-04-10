const express = require("express");
const { createGroup, getUserGroups, getGroupMessages} = require("../controllers/groupController");

const groupRouter = express.Router();


groupRouter.post("/create",createGroup);
groupRouter.get("/:id",getUserGroups);
groupRouter.get("/:groupId/messages", getGroupMessages);


module.exports = groupRouter;