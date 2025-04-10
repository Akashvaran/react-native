const mongoose = require("mongoose");

const GroupMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUser",
      required: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatGroup",
      required:true
    },
    message: {
      type: String,
      required: true
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUser"
    }],
    isEdited: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUser"
    }]
  },
  { timestamps: true }
);



const GroupMessage = mongoose.model("GroupChatMessage", GroupMessageSchema);

module.exports = GroupMessage;