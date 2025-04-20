const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema({
  data: {
    type: String, 
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    default: 'audio/m4a'
  },
  fileName: {
    type: String,
    required: true
  }
}, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUser",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUser",
      required: true,
    },
    message: {
      type: String,
    },
    audio: {
      type: audioSchema
    },
    read: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Message = mongoose.model("ChatMessage", messageSchema);

module.exports = Message;