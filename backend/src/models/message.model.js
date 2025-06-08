const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    audio: {
      type: String, // optional if you allow voice notes
    },
    video: {
      type: String, // <-- Add this line for video URL
    },
  },
  { timestamps: true }
);
const  Message = mongoose.model("Message",messageSchema);
export default Message;
