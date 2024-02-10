export const getTimestamp = () => Math.floor(Date.now() / 1000);

// Timestamp in seconds
export const getTimestampFromDate = (date: Date) => Math.floor(new Date(date).getTime() / 1000);
