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