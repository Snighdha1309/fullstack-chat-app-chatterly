import { useEffect, useRef, useMemo, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime, groupMessagesByDate } from "../lib/utils";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import socket from "../lib/socketclient";

const ChatContainer = () => {
  const {
    messages,
    isMessagesLoading,
    selectedUser,
    setSelectedUser,
    addMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [error, setError] = useState(null);

  // Initialize socket and message listeners
  useEffect(() => {
    if (!authUser?._id || !selectedUser?._id) return;

    // Connect socket with user ID
    socket.auth = { userId: authUser._id };
    socket.connect();

    // Message receiver listener
    const handleNewMessage = (message) => {
      if (
        [message.senderId, message.receiverId].includes(authUser._id) &&
        [message.senderId, message.receiverId].includes(selectedUser._id)
      ) {
        addMessage(message);
      }
    };

    socket.on("newMessage", handleNewMessage);

    // Error handling
    socket.on("connect_error", (err) => {
      setError(`Connection error: ${err.message}`);
      setTimeout(() => setError(null), 5000); // Auto-dismiss after 5 seconds
    });

    return () => {
      if (socket.connected) {
        socket.off("newMessage", handleNewMessage);
        socket.disconnect();
      }
    };
  }, [authUser?._id, selectedUser?._id, addMessage]);

  // Load selectedUser from localStorage safely
  useEffect(() => {
    if (typeof window !== "undefined" && !selectedUser) {
      const savedUser = localStorage.getItem("selectedUser");
      try {
        if (savedUser) setSelectedUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse selectedUser", err);
        localStorage.removeItem("selectedUser");
        setError("Failed to load conversation");
      }
    }
  }, [selectedUser, setSelectedUser]);

  // Optimized message filtering and grouping
  const filteredMessages = useMemo(() => {
    return (messages || [])
      .filter(
        (m) =>
          (m.text || m.image || m.audio || m.video || m.file) &&
          m.createdAt &&
          !isNaN(new Date(m.createdAt))
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages]);

  // Scroll to bottom only if user hasn't scrolled up
  useEffect(() => {
    if (!messageEndRef.current || !messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredMessages.length]);

  if (isMessagesLoading || !selectedUser) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Error Notification */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <ChatHeader />

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {groupMessagesByDate(filteredMessages).map((group) => (
          <div key={group.date} className="space-y-4">
            <div className="divider text-xs text-gray-500 before:bg-gray-300 after:bg-gray-300">
              {group.date}
            </div>
            {group.messages.map((message) => (
              <div
                key={`${message._id}-${message.createdAt || Date.now()}`}
                className={`chat ${
                  message.senderId === authUser._id ? "chat-end" : "chat-start"
                }`}
              >
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img
                      src={
                        message.senderId === authUser._id
                          ? authUser.profilePic || "/avatar.png"
                          : selectedUser.profilePic || "/avatar.png"
                      }
                      alt="profile"
                      onError={(e) => {
                        e.currentTarget.src = "/avatar.png";
                      }}
                    />
                  </div>
                </div>
                <div className="chat-header mb-1">
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
                <div className="chat-bubble flex flex-col">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                      onError={(e) => {
                        e.currentTarget.src = "/image-error.png";
                        e.currentTarget.alt = "Failed to load image";
                        e.currentTarget.className =
                          "sm:max-w-[200px] rounded-md mb-2 border border-error";
                      }}
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;