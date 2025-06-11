import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Load selectedUser from localStorage
const storedUser = localStorage.getItem("selectedUser");
const initialSelectedUser = storedUser ? JSON.parse(storedUser) : null;

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: initialSelectedUser,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users.");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    if (!userId) return;
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/chat/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages.");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message.");
    }
  },

  subscribeToMessages: (userId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket || !userId) return;

    socket.off("newMessage"); // remove existing listener

    socket.on("newMessage", (newMessage) => {
      const isRelevantMessage =
        newMessage.senderId === userId || newMessage.receiverId === userId;

      if (!isRelevantMessage) return;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
    }
  },

  setSelectedUser: async (selectedUser) => {
    if (selectedUser) {
      localStorage.setItem("selectedUser", JSON.stringify(selectedUser));
    } else {
      localStorage.removeItem("selectedUser");
    }

    set({ selectedUser });

    if (selectedUser?._id) {
      await get().getMessages(selectedUser._id);
      get().subscribeToMessages(selectedUser._id);
    }
  },
}));
