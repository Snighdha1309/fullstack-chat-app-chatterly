/**
 * Formats a date into a clean time string for chat messages
 * @param {Date|string} date - The date to format (can be Date object or ISO string)
 * @param {Object} [options] - Optional formatting options
 * @param {boolean} [options.withSeconds=false] - Whether to include seconds
 * @param {string} [options.locale='en-US'] - Locale for formatting
 * @returns {string} Formatted time string or "Invalid Date" if date is invalid
 */
export function formatMessageTime(date, options = {}) {
  // Validate input
  if (!date) return "Invalid Date";
  
  // Handle both Date objects and strings
  const d = date instanceof Date ? date : new Date(date);
  
  // Check validity
  if (isNaN(d.getTime())) {
    console.warn('Invalid date provided to formatMessageTime:', date);
    return "Invalid Date";
  }

  // Default options
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  };

  // Add seconds if requested
  if (options.withSeconds) {
    defaultOptions.second = '2-digit';
  }

  try {
    return d.toLocaleTimeString(options.locale || 'en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting time:', error);
    // Fallback to ISO time if formatting fails
    return d.toISOString().substring(11, 16); // Returns "HH:MM"
  }
}

/**
 * Groups messages by their date
 * @param {Array} messages - Array of message objects
 * @returns {Array} Array of grouped messages with date headers
 */
export function groupMessagesByDate(messages = []) {
  const groups = {};
  
  messages.forEach((message) => {
    if (!message?.createdAt) return;
    
    try {
      const date = new Date(message.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      groups[date] = groups[date] || [];
      groups[date].push(message);
    } catch (err) {
      console.error('Error grouping message by date:', err);
    }
  });

  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages
  }));
}

// Optional utility functions you might find useful:
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatDateHeader(date) {
  const today = new Date();
  const messageDate = new Date(date);
  
  if (isSameDay(today, messageDate)) {
    return 'Today';
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isSameDay(yesterday, messageDate)) {
    return 'Yesterday';
  }
  
  return messageDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}