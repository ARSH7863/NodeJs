const socket = require("socket.io");
const Chat = require("../models/chat");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://13.61.17.142",
        "https://devtinder7863.netlify.app",
      ],
      credentials: true,  // Required for withCredentials: true on client
    },
  });

  io.on("connection", (socket) => {
    // 1. Join user's personal room for direct notifications
    socket.on("joinUser", ({ userId }) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined personal room: user_${userId}`);
      }
    });

    // 2. Join a specific chat conversation room
    socket.on("joinChat", ({ firstName, userId, targetUserId }) => {
      // Sort IDs so room ID is identical regardless of who initiates
      const roomId = [userId, targetUserId].sort().join("_");
      console.log(`User ${firstName || userId} joining Room: ${roomId}`);

      socket.join(roomId);
    });

    socket.on("sendMessage", async ({ firstName, userId, targetUserId, text, tempId }) => {
      try {
        const roomId = [userId, targetUserId].sort().join("_");
        console.log(`${firstName} sent: ${text} in Room: ${roomId}`);

        // Persist message in MongoDB with status 'delivered'
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
          status: "delivered",
        });

        await chat.save();

        // Get the saved message (last one pushed)
        const savedMessage = chat.messages[chat.messages.length - 1];

        const messageData = {
          firstName,
          text,
          senderId: userId,
          targetUserId,
          msgId: savedMessage._id,
          status: "delivered",
          createdAt: savedMessage.createdAt,
        };

        // 1. Broadcast to everyone in the conversation room
        io.to(roomId).emit("messageReceived", messageData);

        // 2. Ack back to sender only — confirms delivery, carries tempId→msgId mapping
        socket.emit("messageSent", { tempId, msgId: savedMessage._id, status: "delivered" });

        // 3. Notify recipient's personal room (for cross-chat notifications)
        io.to(`user_${targetUserId}`).emit("newNotification", {
          senderId: userId,
          firstName,
          text,
          createdAt: savedMessage.createdAt,
        });
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

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

module.exports = initializeSocket;
