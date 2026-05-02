const { randomUUID } = require("crypto");

const store = [];

function createNotification(data) {
  const notification = {
    id: randomUUID(),
    userId: data.userId,
    type: data.type,
    message: data.message,
    metadata: data.metadata || {},
    isRead: false,
    createdAt: new Date(),
  };
  store.push(notification);
  return notification;
}

function getNotificationsByUserId(userId, limit = 10, offset = 0) {
  return store
    .filter((n) => n.userId === userId)
    .slice(offset, offset + limit);
}

function markAsRead(notificationId) {
  const notification = store.find((n) => n.id === notificationId);
  if (!notification) return null;
  notification.isRead = true;
  return notification;
}

function getPlacementNotificationsLast7Days() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return store.filter(
    (n) => n.type === "placement" && new Date(n.createdAt) >= sevenDaysAgo
  );
}

module.exports = {
  createNotification,
  getNotificationsByUserId,
  markAsRead,
  getPlacementNotificationsLast7Days,
};
