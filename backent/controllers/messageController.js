const Message = require("../models/messageModel");

const getMessages = async (req, res,) => {
  try {
    const { sender, receiver } = req.params;
    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

const getUnreadMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const unreadMessages = await Message.find({ receiver: userId, read: false });
    res.json(unreadMessages);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

module.exports = { getMessages, getUnreadMessages };
