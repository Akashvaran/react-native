const mongoose = require("mongoose");

// const locationSchema = new mongoose.Schema({
//   lat: Number,
//   lng: Number,
//   name: String, 
// }, { _id: false });

const fileSchema = new mongoose.Schema({
  text: { type: String }, 
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  mimeType: String,
  duration: Number,        
}, { _id: false });

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
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'video', 'document', 'location'],
      required: true
    },
    content: {     
      file: fileSchema,    
      // location: locationSchema,
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
