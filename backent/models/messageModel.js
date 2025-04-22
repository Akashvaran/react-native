const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  text: { type: String }, 
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  mimeType: String,
  duration: Number,
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
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'video', 'document', 'location'],
      required: true
    },
    content: {     
      file: fileSchema,    
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

