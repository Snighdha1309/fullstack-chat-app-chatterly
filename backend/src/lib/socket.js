import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// ✅ Move this to the top
const userSocketMap = {}; // {userId: socketId}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log("🧠 Mapped user:", userId, "→", socket.id);
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
