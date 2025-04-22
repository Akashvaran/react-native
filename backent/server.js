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
  "exp://192.168.1.4:8081",
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

  socket.on("markAsRead", async ({ sender, receiver }) => {
    try {
      await Message.updateMany(
        { sender, receiver, read: false },
        { $set: { read: true } }
      );
      socketServer.to(users[sender]).emit("messagesRead", { sender, receiver });
    } catch (error) {
      console.error("[socket/markAsRead] Error:", error);
    }
  });
  
  socket.on("editMessage", async ({ messageId, newText, sender }) => {
    try {
      const updatedMessage = await Message.findOneAndUpdate(
        { _id: messageId, sender },
        { $set: { message: newText, isEdited: true } },
        { new: true }
      );
  
      if (!updatedMessage) {
        return socket.emit("error", { message: "Message not found or not authorized" });
      }
  
      const messageData = {
        _id: updatedMessage._id,
        text: updatedMessage.message,
        isEdited: true,
        senderId: updatedMessage.sender,
        receiverId: updatedMessage.receiver
      };
  
      socketServer.to(users[updatedMessage.sender]).emit("messageEdited", messageData);
      if (users[updatedMessage.receiver]) {
        socketServer.to(users[updatedMessage.receiver]).emit("messageEdited", messageData);
      }
    } catch (error) {
      console.error("[socket/editMessage] Error:", error);
      socket.emit("error", { message: "Failed to edit message" });
    }
  });
  
  socket.on("deleteMessage", async ({ messageId, sender }) => {
    try {
      const message = await Message.findOneAndDelete({
        _id: messageId,
        sender
      });
  
      if (!message) {
        return socket.emit("error", { message: "Message not found or not authorized" });
      }
  
      socketServer.emit("messageDeleted", messageId);
      if (users[message.receiver]) {
        socketServer.to(users[message.receiver]).emit("messageDeleted", messageId);
      }
    } catch (error) {
      console.error("[socket/deleteMessage] Error:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });
  
  socket.on("sendMessage", async ({ sender, receiver, message, timestamp, audioData }) => {
    console.log(audioData);
    
    try {
      let newMessage;
      
      if (audioData) {
        newMessage = new Message({
          sender,
          receiver,
          audio: {
            data: audioData.audio,
            duration: audioData.duration,
            mimeType: audioData.mimeType,
            fileName: audioData.fileName 
          },
          read: false,
          createdAt: timestamp
        });
      } else {
        newMessage = new Message({
          sender,
          receiver,
          message,
          read: false,
          createdAt: timestamp
        });
      }
      
      await newMessage.save();
  
      const messageData = {
        _id: newMessage._id,
        senderId: sender,
        receiverId: receiver,
        text: newMessage.message || '[Audio message]',
        audio: newMessage.audio,
        status: "delivered",
        createdAt: newMessage.createdAt,
        isEdited: false
      };
  
      socket.emit("receiveMessage", messageData);
      
      if (users[receiver]) {
        socket.to(users[receiver]).emit("receiveMessage", messageData);
      }
    } catch (error) {
      console.error("[socket/sendMessage] Error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("typing", ({ sender, receiver }) => {
    if (users[receiver]) {
      socket.to(users[receiver]).emit("typing-server", sender);
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

  socket.on("sendGroupMessage", async ({ groupId, senderId, content, audio }) => {
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
        audio: audio,
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
      console.error("Error sending group message:", error);
      socket.emit("error", { message: "Failed to send group message" });
    }
  });

  socket.on("updateGroupMessage", async ({ messageId, groupId, senderId, content }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit("error", { message: "Group not found" });
      }

      const isMember = group.members.some(m => m.user.toString() === senderId);
      if (!isMember) {
        return socket.emit("error", { message: "Not a group member" });
      }

      const updatedMessage = await GroupMessage.findOneAndUpdate(
        { 
          _id: messageId,
          sender: senderId,
          group: groupId
        },
        { 
          $set: { 
            message: content,
            isEdited: true,
            updatedAt: new Date()
          } 
        },
        { new: true }
      ).populate('sender', 'name');

      if (!updatedMessage) {
        return socket.emit("error", { message: "Message not found or not authorized" });
      }

      socketServer.to(groupId).emit("groupMessageUpdated", {
        _id: updatedMessage._id,
        message: updatedMessage.message,
        isEdited: true,
        updatedAt: updatedMessage.updatedAt,
        sender: updatedMessage.sender
      });

    } catch (error) {
      console.error("[socket/updateGroupMessage] Error:", error);
      socket.emit("error", { message: "Failed to update message" });
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

  socket.on('deleteGroupMessageForEveryone', async ({ messageId, groupId, userId }) => {
    try {
      const message = await GroupMessage.findById(messageId);
      if (!message) {
        return socket.emit('error', { message: "Message not found" });
      }

      const group = await Group.findById(groupId);
      const isAdmin = group.members.some(m => 
        m.user.toString() === userId && m.role === 'admin'
      );
      
      if (message.sender.toString() !== userId && !isAdmin) {
        return socket.emit('error', { message: "Not authorized to delete this message" });
      }

      await GroupMessage.deleteOne({ _id: messageId });

      socketServer.to(groupId).emit('groupMessageDeleted', {
        messageId,
        deletedFor: 'all'
      });

    } catch (error) {
      console.error("[socket/deleteGroupMessageForEveryone] Error:", error);
      socket.emit('error', { message: "Failed to delete message for everyone" });
    }
  });

  socket.on('deleteGroupMessageForMe', async ({ messageId, groupId, userId }) => {
    try {
      const message = await GroupMessage.findById(messageId);
      if (!message) {
        return socket.emit('error', { message: "Message not found" });
      }

      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }

      const group = await Group.findById(groupId);
      if (message.deletedFor.length === group.members.length) {
        await message.deleteOne();
        socketServer.to(groupId).emit('groupMessageDeleted', {
          messageId,
          deletedFor: 'all'
        });
      } else {
        socket.emit('groupMessageDeleted', {
          messageId,
          deletedFor: userId
        });
      }

    } catch (error) {
      console.error("[socket/deleteGroupMessageForMe] Error:", error);
      socket.emit('error', { message: "Failed to delete message for you" });
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

  socket.on("promoteToAdmin", async ({ groupId, memberId, requestingUserId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit("error", { message: "Group not found" });
      }

      const requester = group.members.find(m => m.user.toString() === requestingUserId);
      if (!requester || requester.role !== "owner") {
        return socket.emit("error", { message: "Only the group owner can manage admin roles" });
      }

      const member = group.members.find(m => m.user.toString() === memberId);
      if (!member) {
        return socket.emit("error", { message: "User not a member of the group" });
      }

      member.role = member.role === "admin" ? "member" : "admin";
      await group.save();

      socketServer.to(groupId).emit("memberRoleChanged", {
        groupId,
        memberId,
        newRole: member.role
      });
    } catch (error) {
      console.error("Error changing member role:", error);
      socket.emit("error", { message: "Failed to change member role" });
    }
  });

  socket.on("leaveGroup", async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit("error", { message: "Group not found" });
      }
  
      const member = group.members.find(m => m.user.toString() === userId);
      if (member?.role === 'owner') {
        return socket.emit("error", { message: "Group owner cannot leave. Transfer ownership first." });
      }
  
      group.members = group.members.filter(member => 
        member.user.toString() !== userId.toString()
      );
      
      await group.save();
  
      socketServer.to(groupId).emit("memberLeft", {
        groupId,
        memberId: userId
      });
  
      socket.emit("groupLeft", { groupId });
  
      socket.leave(groupId);
      
      console.log(`User ${userId} left group ${groupId}`);
    } catch (error) {
      console.error("Error leaving group:", error);
      socket.emit("error", { message: "Failed to leave group" });
    }
  });

socket.on("transferOwnership", async ({ groupId, newOwnerId, requestingUserId }) => {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return socket.emit("error", { message: "Group not found" });
    }

    if (group.createdBy.toString() !== requestingUserId) {
      return socket.emit("error", { message: "Only the group owner can transfer ownership" });
    }

    const isMember = group.members.some(m => m.user.toString() === newOwnerId);
    if (!isMember) {
      return socket.emit("error", { message: "New owner must be a group member" });
    }

    group.createdBy = newOwnerId;
    
    group.members = group.members.map(member => {
      if (member.user.toString() === newOwnerId) {
        member.role = "owner";
      } else if (member.user.toString() === requestingUserId) {
        member.role = "admin";
      }
      return member;
    });

    await group.save();

    socketServer.to(groupId).emit("ownershipTransferred", {
      groupId,
      newOwnerId,
      previousOwnerId: requestingUserId
    });

  } catch (error) {
    console.error("[socket/transferOwnership] Error:", error);
    socket.emit("error", { message: "Failed to transfer ownership" });
  }
});

socket.on("deleteGroup", async ({ groupId, requestingUserId }) => {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return socket.emit("error", { message: "Group not found" });
    }

    if (group.createdBy.toString() !== requestingUserId) {
      return socket.emit("error", { message: "Only the group owner can delete the group" });
    }
    await GroupMessage.deleteMany({ group: groupId });

    await Group.deleteOne({ _id: groupId });

    socketServer.to(groupId).emit("groupDeleted", { groupId });
    
    socketServer.socketsLeave(groupId);

  } catch (error) {
    console.error("[socket/deleteGroup] Error:", error);
    socket.emit("error", { message: "Failed to delete group" });
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

const PORT = process.env.PORT ;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 