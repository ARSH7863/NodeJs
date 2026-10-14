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

    // Filter messages created after the user's last clearedAt timestamp (if any)
    const userClearInfo = chat.clearedBy?.find(
      (c) => c.userId?.toString() === userId.toString()
    );

    const filteredChat = chat.toObject();
    if (userClearInfo && userClearInfo.clearedAt) {
      filteredChat.messages = filteredChat.messages.filter(
        (msg) => new Date(msg.createdAt) > new Date(userClearInfo.clearedAt)
      );
    }

    res.json(filteredChat);
  } catch (err) {
    console.error("Error fetching chat:", err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// Clear chat history for the logged-in user ONLY
chatRouter.delete("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Update or add clearedAt for this user only
    if (!chat.clearedBy) {
      chat.clearedBy = [];
    }

    const existingIndex = chat.clearedBy.findIndex(
      (c) => c.userId?.toString() === userId.toString()
    );

    if (existingIndex > -1) {
      chat.clearedBy[existingIndex].clearedAt = new Date();
    } else {
      chat.clearedBy.push({
        userId,
        clearedAt: new Date(),
      });
    }

    await chat.save();

    res.json({ message: "Chat cleared successfully for you" });
  } catch (err) {
    console.error("Error clearing chat:", err);
    res.status(500).json({ error: "Failed to clear chat history" });
  }
});

module.exports = chatRouter;
