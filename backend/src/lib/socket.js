import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";

const app = express();
const server = http.createServer(app);

// User connection tracking
const userConnections = new Map(); // { socketId: { userId, lastActive, ip } }
const MAX_SOCKETS_PER_USER = 3;
const CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function getReceiverSocketId(userId) {
  return [...userConnections.entries()]
    .find(([_, data]) => data.userId === userId)?.[0];
}

const io = new Server(server, {
  cors: {
    origin: getAutoAllowedOrigins(),
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 5 * 60 * 1000,
    skipMiddlewares: false,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Automatic origin detection
function getAutoAllowedOrigins() {
  const origins = new Set([
    'http://localhost:5173', // Default development
    process.env.RENDER_EXTERNAL_URL, // Auto-detected on Render
    process.env.PRODUCTION_URL // Future custom domain
  ]);
  
  // Optional: Add any additional URLs from environment
  if (process.env.FRONTEND_URLS) {
    process.env.FRONTEND_URLS.split(',').forEach(url => origins.add(url));
  }

  return Array.from(origins).filter(Boolean); // Remove empty values
}

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.query.userId;
    if (!userId) throw new Error("User ID required");
    
    // Optional token verification
    // await verifyToken(socket.handshake.auth.token);
    
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  const { userId } = socket.handshake.query;
  const ip = socket.handshake.address;

  console.log(`✅ Connection: ${socket.id} (User: ${userId}, IP: ${ip})`);

  // Connection limit check
  const userConnectionsCount = [...userConnections.values()]
    .filter(conn => conn.userId === userId).length;
  
  if (userConnectionsCount >= MAX_SOCKETS_PER_USER) {
    console.warn(`Connection limit reached for user ${userId}`);
    return socket.disconnect(true);
  }

  // Store connection
  userConnections.set(socket.id, {
    userId,
    lastActive: Date.now(),
    ip
  });

  // Join user rooms
  socket.join([userId, `user_${userId}`]);

  // Message handling
  socket.on("send_message", async ({ receiverId, text, image }, callback) => {
    try {
      if (!receiverId || (!text && !image)) {
        throw new Error("Invalid message data");
      }

      // Update activity
      userConnections.get(socket.id).lastActive = Date.now();

      // Save to DB
      const message = await Message.create({
        sender: userId,
        receiver: receiverId,
        content: text,
        image,
        status: 'delivered'
      });

      // Deliver message
      io.to(`user_${receiverId}`).emit("receive_message", message);
      socket.emit("message_delivered", { messageId: message._id });

      callback?.({ status: "success", messageId: message._id });
    } catch (error) {
      console.error("Message error:", error);
      callback?.({ status: "error", message: error.message });
      socket.emit("message_error", { error: error.message });
    }
  });

  // Presence features
  socket.on("typing", (receiverId) => {
    socket.to(`user_${receiverId}`).emit("typing", { userId, isTyping: true });
  });

  // Cleanup
  socket.on("disconnect", (reason) => {
    userConnections.delete(socket.id);
    updateOnlineUsers();
    console.log(`❌ Disconnected (${reason})`);
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  updateOnlineUsers();
});

// Helper functions
function updateOnlineUsers() {
  const onlineUsers = [...new Set(
    [...userConnections.values()].map(c => c.userId)
  )];
  io.emit("online_users", onlineUsers);
}

// Stale connection cleanup
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  userConnections.forEach((conn, socketId) => {
    if (now - conn.lastActive > CONNECTION_TIMEOUT) {
      io.sockets.sockets.get(socketId)?.disconnect();
      userConnections.delete(socketId);
      cleaned++;
    }
  });

  if (cleaned > 0) {
    console.log(`♻️ Cleaned ${cleaned} stale connections`);
    updateOnlineUsers();
  }
}, 60 * 1000);

// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    connections: userConnections.size,
    uptime: process.uptime()
  });
});

export { io, app, server };