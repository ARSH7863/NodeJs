const express = require("express");
const chatRouter = express.Router();
const Chat = require("../models/chat");
const { userAuth } = require("../middleware/auth");

// Fetch chat history between logged-in user and target user
chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    let chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    }).populate({
      path: "messages.senderId",
      select: "firstName lastName photoURL",
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, targetUserId],
        messages: [],
      });
      await chat.save();
    } else {
      // Mark all incoming messages from targetUserId as read
      await Chat.updateOne(
        { _id: chat._id },
        {
          $set: {
            "messages.$[msg].status": "read",
          },
        },
        {
          arrayFilters: [
            { "msg.senderId": targetUserId, "msg.status": "delivered" },
          ],
        }
      );
    }

    res.json(chat);
  } catch (err) {
    console.error("Error fetching chat:", err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

module.exports = chatRouter;
