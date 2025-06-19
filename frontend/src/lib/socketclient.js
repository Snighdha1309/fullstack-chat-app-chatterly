import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
  autoConnect: false, // Manual connection after auth
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
  transports: ['websocket'],
  closeOnBeforeunload: false, // Prevents disconnect on page refresh
});

// Authentication handler
export const connectSocket = (userId) => {
  if (userId && !socket.connected) {
    socket.auth = { userId };
    socket.connect();
    
    // Debugging
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });
    
    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });
  }
  return socket;
};

// Graceful cleanup
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.removeAllListeners(); // Prevent memory leaks
    socket.disconnect();
  }
};

// Auto-reconnect only for unexpected disconnections
socket.on('disconnect', (reason) => {
  console.log(`Disconnected (reason: ${reason})`);
  if (reason === 'io server disconnect') {
    // Server forcefully disconnected (e.g., auth failed)
    socket.auth = { userId: socket.auth?.userId }; // Reuse existing auth
    socket.connect();
  }
  // Do NOT auto-reconnect for 'io client disconnect' (user-initiated)
});

// Ping/pong monitoring (optional but recommended)
socket.on('ping', () => console.debug('🏓 Ping received'));
socket.on('pong', (latency) => console.debug('🏓 Pong sent:', latency, 'ms'));

export default socket;