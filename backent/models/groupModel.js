const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot exceed 200 characters"]
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUser",
      required: true
    },
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUser"
    }],
    members: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser",
        required: true
      },
      role: {
        type: String,
        enum: ["owner", "member", "admin"],
        default: "member"
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

groupSchema.pre("save", function(next) {
  if (this.isNew) {
    // this.admins = [this.createdBy];
    this.members.push({
      user: this.createdBy,
      role: "owner"
    });
  }
  next();
});

const Group = mongoose.model("ChatGroup", groupSchema);

module.exports = Group;