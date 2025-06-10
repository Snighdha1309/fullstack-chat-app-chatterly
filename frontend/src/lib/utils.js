export function formatMessageTime(date) {
  if (!date) return "Invalid Date";
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
