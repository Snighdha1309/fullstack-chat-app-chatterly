import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                 (import.meta.env.MODE === "development" ? "http://localhost:5001" : "/");

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  error: null,

  // Unified error handler
  handleError: (error, defaultMessage) => {
    const message = error.response?.data?.message || defaultMessage;
    console.error("Auth Error:", message, error);
    set({ error: message });
    return { success: false, message };
  },

  // Auth state check
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      if (res.data) {
        set({ authUser: res.data });
        get().connectSocket();
      }
    } catch (error) {
      get().handleError(error, "Session check failed");
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Signup with improved validation
  signup: async (data) => {
    set({ isSigningUp: true, error: null });
    try {
      const res = await axiosInstance.post("/auth/signup", {
        ...data,
        email: data.email.toLowerCase().trim()
      });
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true };
    } catch (error) {
      return get().handleError(error, "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Login with credentials normalization
  login: async ({ email, password }) => {
    set({ isLoggingIn: true, error: null });
    try {
      const res = await axiosInstance.post("/auth/login", {
        email: email.toLowerCase().trim(),
        password
      }, {
        withCredentials: true
      });
      
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true, data: res.data };
    } catch (error) {
      return get().handleError(error, "Invalid credentials");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Logout with socket cleanup
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      get().disconnectSocket();
      set({ authUser: null, onlineUsers: [] });
      return { success: true };
    } catch (error) {
      return get().handleError(error, "Logout failed");
    }
  },

  // Profile update
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true, error: null });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      return { success: true };
    } catch (error) {
      return get().handleError(error, "Profile update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // Socket management
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser?._id || socket?.connected) return;

    const newSocket = io(BASE_URL, {
      transports: ["websocket"],
      auth: {
        token: authUser.token // Assuming your backend uses token auth
      },
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });

    // Socket event handlers
    newSocket
      .on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);
        useChatStore.getState().subscribeToMessages();
      })
      .on("disconnect", () => console.warn("⚠️ Socket disconnected"))
      .on("connect_error", (err) => {
        console.error("❌ Socket error:", err.message);
        setTimeout(() => get().connectSocket(), 5000); // Reconnect after 5s
      })
      .on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));

    set({ socket: newSocket });
  },

  // Proper socket cleanup
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
      if (socket.connected) socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },

  // Clear auth state
  clearAuth: () => set({ 
    authUser: null, 
    error: null,
    onlineUsers: [] 
  })
}));