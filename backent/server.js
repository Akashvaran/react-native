const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const database = require("./config/database");
const Message = require("./models/messageModel");
const GroupMessage = require("./models/chatMessageModel");
const Group = require("./models/groupModel");
const app = require("./app");

dotenv.config();
database();

const httpServer = http.createServer(app);

const allowedOrigins = [
  "http://localhost:8000",
  "exp://192.168.1.3:8081",
];

const socketServer = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = {};
const inactiveUsers = new Set();

socketServer.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on("registerUser", (userId) => {
    users[userId] = socket.id;
    socket.join(userId);
    socketServer.emit("userOnline", Object.keys(users));
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("sendMessage", async ({ sender, receiver, message }) => {
    try {
      const newMessage = new Message({
        sender,
        receiver,
        message,
        read: false,
      });
      await newMessage.save();

      const messageData = {
        _id: newMessage._id,
        senderId: sender,
        receiverId: receiver,
        text: message,
        status: "delivered",
        createdAt: newMessage.createdAt
      };

      socket.emit("receiveMessage", messageData);

      if (users[receiver]) {
        socket.to(users[receiver]).emit("receiveMessage", messageData);
        socket.to(users[receiver]).emit("newMessageNotification", {
          senderId: sender,
          message: message,
        });
      }
    } catch (error) {
      console.error("[socket/sendMessage] Error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("joinGroup", async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId).populate('members.user');
      if (!group) {
        return socket.emit("error", { message: "Group not found" });
      }

      const isMember = group.members.some(member => member.user._id.toString() === userId);
      if (!isMember) {
        return socket.emit("error", { message: "Not a group member" });
      }

      socket.join(groupId);
      socket.emit("groupJoined", groupId);
      console.log(`User ${userId} joined group ${groupId}`);
    } catch (error) {
      console.error("[socket/joinGroup] Error:", error);
      socket.emit("error", { message: "Failed to join group" });
    }
  });

  socket.on("leaveGroup", ({ groupId, userId }) => {
    socket.leave(groupId);
    socket.emit("groupLeft", groupId);
    console.log(`User ${userId} left group ${groupId}`);
  });

  socket.on("sendGroupMessage", async ({ groupId, senderId, content }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit("error", { message: "Group not found" });
      }

      const isMember = group.members.some(member => 
        member.user.toString() === senderId.toString()
      );
      
      if (!isMember) {
        return socket.emit("error", { message: "Not a group member" });
      }

      const newMessage = new GroupMessage({
        sender: senderId,
        group: groupId,
        message: content,
        readBy: [senderId]
      });

      await newMessage.save();

      const populatedMessage = await GroupMessage.populate(newMessage, [
        { path: "sender", select: "name" },
        { path: "group", select: "name" }
      ]);

      const messageObj = populatedMessage.toObject();
      messageObj.status = "delivered";

      socketServer.to(groupId).emit("newGroupMessage", messageObj);

    } catch (error) {
      console.error("[socket/sendGroupMessage] Error:", error);
      socket.emit("error", { message: "Failed to send group message" });
    }
  });

socket.on("addGroupMember", async ({ groupId, newMemberId, requestingUserId }) => {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return socket.emit("error", { message: "Group not found" });
    }

    const isAdmin = group.members.some(
      m => m.user.toString() === requestingUserId && m.role === "admin"
    );
    if (!isAdmin) {
      return socket.emit("error", { message: "Only admins can add members" });
    }

    const isAlreadyMember = group.members.some(m => m.user.toString() === newMemberId);
    if (isAlreadyMember) {
      return socket.emit("error", { message: "User is already a member" });
    }

    group.members.push({ user: newMemberId, role: "member" });
    await group.save();

    const populatedGroup = await Group.findById(groupId).populate('members.user');
    socketServer.to(groupId).emit("memberAdded", {
      groupId,
      newMember: populatedGroup.members.find(m => m.user._id.toString() === newMemberId)
    });
  } catch (error) {
    console.error("[socket/addGroupMember] Error:", error);
    socket.emit("error", { message: "Failed to add member" });
  }
});

socket.on("promoteToAdmin", async ({ groupId, memberId, requestingUserId }) => {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return socket.emit("error", { message: "Group not found" });
    }

    if (group.createdBy.toString() !== requestingUserId) {
      return socket.emit("error", { message: "Only the group creator can promote members" });
    }

    const member = group.members.find(m => m.user.toString() === memberId);
    if (!member) {
      return socket.emit("error", { message: "User not a member of the group" });
    }

    member.role = "admin";
    await group.save();

    socketServer.to(groupId).emit("memberPromoted", {
      groupId,
      memberId,
      newRole: "admin"
    });
  } catch (error) {
    console.error("socket promoteToAdmin Error:", error);
    socket.emit("error", { message: "Failed to promote member" });
  }
});

socket.on("removeGroupMember", async ({ groupId, memberId, requestingUserId }) => {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return socket.emit("error", { message: "Group not found" });
    }

    const isAdmin = group.members.some(
      m => m.user.toString() === requestingUserId && m.role === "admin"
    );
    const isCreator = group.createdBy.toString() === requestingUserId;

    if (!isAdmin && !isCreator) {
      return socket.emit("error", { message: "Only admins or the creator can remove members" });
    }

    if (group.createdBy.toString() === memberId) {
      return socket.emit("error", { message: "Cannot remove the group creator" });
    }

    group.members = group.members.filter(m => m.user.toString() !== memberId);
    await group.save();

    socketServer.to(groupId).emit("memberRemoved", {
      groupId,
      memberId
    });

    if (users[memberId]) {
      socketServer.to(users[memberId]).emit("youWereRemoved", {
        groupId
      });
    }
  } catch (error) {
    console.error("socket removeGroupMember Error:", error);
    socket.emit("error", { message: "Failed to remove member" });
  }
});

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    Object.keys(users).forEach((userId) => {
      if (users[userId] === socket.id) {
        delete users[userId];
        inactiveUsers.delete(userId);
        socketServer.emit("userOffline", userId);
      }
    });
  });
});

const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});