const socket = require("socket.io");
const Chat = require("../models/chat");

// Map to track active connections: userId -> Set of socket IDs
const onlineUsers = new Map();

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://13.61.17.142",
        "https://devtinder7863.netlify.app",
      ],
      credentials: true, // Required for withCredentials: true on client
    },
  });

  io.on("connection", (socket) => {
    let authenticatedUserId = null;

    // 1. Join user's personal room for direct notifications & presence
    socket.on("joinUser", async ({ userId }) => {
      if (!userId) return;
      authenticatedUserId = String(userId);
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined personal room: user_${userId}`);

      // Track online status
      if (!onlineUsers.has(authenticatedUserId)) {
        onlineUsers.set(authenticatedUserId, new Set());
      }
      onlineUsers.get(authenticatedUserId).add(socket.id);

      // Broadcast online status to others
      io.emit("userOnline", { userId: authenticatedUserId });

      // Mark all pending 'sent' messages addressed to this user as 'delivered' in MongoDB
      try {
        await Chat.updateMany(
          {
            participants: authenticatedUserId,
            "messages.status": "sent",
          },
          {
            $set: {
              "messages.$[msg].status": "delivered",
            },
          },
          {
            arrayFilters: [
              { "msg.senderId": { $ne: authenticatedUserId }, "msg.status": "sent" },
            ],
          }
        );

        // Notify all senders that their messages were delivered (✓ -> ✓✓)
        socket.broadcast.emit("messagesDelivered", { recipientId: authenticatedUserId });

        // Deliver offline toast notifications for unread messages received while away
        const chats = await Chat.find({
          participants: authenticatedUserId,
        }).populate("messages.senderId", "firstName lastName");

        for (const chat of chats) {
          const userClearInfo = chat.clearedBy?.find(
            (c) => c.userId?.toString() === authenticatedUserId
          );
          const clearedAt = userClearInfo ? new Date(userClearInfo.clearedAt) : null;

          // Find unread/delivered messages sent by other users
          const offlineMessages = chat.messages.filter((m) => {
            const isFromOther = String(m.senderId?._id || m.senderId) !== authenticatedUserId;
            const notRead = m.status !== "read";
            const afterClear = clearedAt ? new Date(m.createdAt) > clearedAt : true;
            return isFromOther && notRead && afterClear;
          });

          // Emit a notification toast for recent offline messages
          if (offlineMessages.length > 0) {
            const lastMsg = offlineMessages[offlineMessages.length - 1];
            socket.emit("newNotification", {
              senderId: lastMsg.senderId?._id || lastMsg.senderId,
              firstName: lastMsg.senderId?.firstName || "Someone",
              text: lastMsg.text,
              createdAt: lastMsg.createdAt,
            });
          }
        }
      } catch (err) {
        console.error("Error updating offline messages on login:", err);
      }
    });

    // 2. Join a specific chat conversation room
    socket.on("joinChat", ({ firstName, userId, targetUserId }) => {
      // Sort IDs so room ID is identical regardless of who initiates
      const roomId = [userId, targetUserId].sort().join("_");

      // Leave previous chat room if user switched contacts
      if (socket.currentRoom && socket.currentRoom !== roomId) {
        socket.leave(socket.currentRoom);
        console.log(`Socket ${socket.id} left Room: ${socket.currentRoom}`);
      }

      socket.currentRoom = roomId;
      console.log(`User ${firstName || userId} joining Room: ${roomId}`);
      socket.join(roomId);
    });

    // Explicit leave room event when user switches contact or exits chat
    socket.on("leaveChat", ({ userId, targetUserId }) => {
      if (userId && targetUserId) {
        const roomId = [userId, targetUserId].sort().join("_");
        socket.leave(roomId);
        console.log(`User ${userId} left Room: ${roomId}`);
      }
    });

    socket.on("sendMessage", async ({ firstName, userId, targetUserId, text, tempId }) => {
      try {
        const roomId = [userId, targetUserId].sort().join("_");
        console.log(`${firstName} sent: ${text} in Room: ${roomId}`);

        // Check if recipient is online
        const targetIdStr = String(targetUserId);
        const senderIdStr = String(userId);
        const isRecipientOnline =
          onlineUsers.has(targetIdStr) &&
          onlineUsers.get(targetIdStr).size > 0;

        console.log(`[sendMessage] Sender: ${senderIdStr}, Target: ${targetIdStr}, isRecipientOnline: ${isRecipientOnline}`);
        console.log(`[sendMessage] Current online users:`, Array.from(onlineUsers.keys()));

        // If online -> delivered (✓✓), if offline -> sent (✓)
        const deliveryStatus = isRecipientOnline ? "delivered" : "sent";

        // Persist message in MongoDB with appropriate status
        let chat = await Chat.findOne({
          participants: { $all: [userId, targetUserId] },
        });

        if (!chat) {
          chat = new Chat({
            participants: [userId, targetUserId],
            messages: [],
          });
        }

        chat.messages.push({
          senderId: userId,
          text,
          status: deliveryStatus,
        });

        await chat.save();

        // Get the saved message (last one pushed)
        const savedMessage = chat.messages[chat.messages.length - 1];

        const messageData = {
          _id: savedMessage._id,
          firstName,
          text,
          senderId: userId,
          targetUserId,
          msgId: savedMessage._id,
          status: deliveryStatus,
          createdAt: savedMessage.createdAt,
        };

        // 1. Broadcast to everyone in the conversation room
        io.to(roomId).emit("messageReceived", messageData);

        // 2. Ack back to sender only — carries delivery status (sent vs delivered)
        socket.emit("messageSent", {
          tempId,
          msgId: savedMessage._id,
          status: deliveryStatus,
        });

        // 3. Notify recipient's personal room ONLY if recipient is online and NOT the sender
        if (isRecipientOnline && targetIdStr !== senderIdStr) {
          io.to(`user_${targetUserId}`).emit("newNotification", {
            senderId: userId,
            firstName,
            text,
            createdAt: savedMessage.createdAt,
          });
        }
      } catch (err) {
        console.error("Error saving message:", err);
      }
    });

    // Mark messages as read: recipient tells server they've seen the chat
    socket.on("markRead", async ({ readerId, senderId }) => {
      try {
        if (!readerId || !senderId) return;

        const roomId = [readerId, senderId].sort().join("_");

        // Flip all 'delivered' messages from senderId → 'read' in DB
        await Chat.updateOne(
          { participants: { $all: [readerId, senderId] } },
          {
            $set: {
              "messages.$[msg].status": "read",
            },
          },
          {
            arrayFilters: [
              { "msg.senderId": senderId, "msg.status": "delivered" },
            ],
          }
        );

        // 1. Notify everyone currently inside the conversation room in real time
        io.to(roomId).emit("messagesRead", { readerId });

        // 2. Also notify the sender's personal room in case they are browsing outside the chat
        io.to(`user_${senderId}`).emit("messagesRead", { readerId });
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    });

    // Handle typing event
    socket.on("typing", ({ firstName, userId, targetUserId }) => {
      const roomId = [userId, targetUserId].sort().join("_");
      // Broadcast to everyone in the room except the sender
      socket.to(roomId).emit("typing", { userId, firstName });
    });

    // Handle stop typing event
    socket.on("stopTyping", ({ userId, targetUserId }) => {
      const roomId = [userId, targetUserId].sort().join("_");
      socket.to(roomId).emit("stopTyping", { userId });
    });

    // Handle clear chat event (Only clears for the requesting user)
    socket.on("clearChat", async ({ userId, targetUserId }) => {
      try {
        const chat = await Chat.findOne({
          participants: { $all: [userId, targetUserId] },
        });

        if (chat) {
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
        }

        // Notify ONLY the user who initiated the clear (not the other user)
        socket.emit("chatCleared", { userId, targetUserId });
      } catch (err) {
        console.error("Error clearing chat via socket:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      if (authenticatedUserId && onlineUsers.has(authenticatedUserId)) {
        onlineUsers.get(authenticatedUserId).delete(socket.id);
        if (onlineUsers.get(authenticatedUserId).size === 0) {
          onlineUsers.delete(authenticatedUserId);
          io.emit("userOffline", { userId: authenticatedUserId });
          console.log(`User ${authenticatedUserId} is now offline`);
        }
      }
    });
  });
};

module.exports = initializeSocket;
