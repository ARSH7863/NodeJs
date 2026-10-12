const socket = require("socket.io");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:5173",
    },
  });

  io.on("connection", (socket) => {
    // Handle events
    socket.on("joinChat", ({ firstName, userId, targetUserId }) => {
      // Sort IDs so room ID is identical regardless of who initiates
      const roomId = [userId, targetUserId].sort().join("_");
      console.log(`User ${firstName || userId} joining Room: ${roomId}`);

      socket.join(roomId);
    });

    socket.on("sendMessage", ({ firstName, userId, targetUserId, text }) => {
      const roomId = [userId, targetUserId].sort().join("_");
      console.log(`${firstName} sent: ${text} in Room: ${roomId}`);

      // Broadcast message to everyone in the room (or socket.to(roomId).emit(...) to exclude sender)
      io.to(roomId).emit("messageReceived", {
        firstName,
        text,
        senderId: userId,
        createdAt: new Date(),
      });
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
