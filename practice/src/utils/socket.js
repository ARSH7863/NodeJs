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

    socket.on("sendMessage", async ({ firstName, userId, targetUserId, text }) => {
      try {
        const roomId = [userId, targetUserId].sort().join("_");
        console.log(`${firstName} sent: ${text} in Room: ${roomId}`);

        // Persist message in MongoDB
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
        });

        await chat.save();

        const messageData = {
          firstName,
          text,
          senderId: userId,
          targetUserId,
          createdAt: new Date(),
        };

        // 1. Broadcast message to everyone currently inside the conversation room
        io.to(roomId).emit("messageReceived", messageData);

        // 2. ALSO send a direct notification to target user's personal room
        // (Even if they are viewing someone else's chat or elsewhere on the app)
        io.to(`user_${targetUserId}`).emit("newNotification", {
          senderId: userId,
          firstName,
          text,
          createdAt: new Date(),
        });
      } catch (err) {
        console.error("Error saving message:", err);
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
