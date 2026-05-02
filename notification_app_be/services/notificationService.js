const repo = require("../repositories/notificationRepository");
const Log = require("../../logging_middleware/index");

const cache = {};

async function createNotification(data) {
  await Log("backend", "info", "service", "createNotification called");
  const result = repo.createNotification(data);
  if (!result) {
    await Log("backend", "error", "service", "createNotification failed");
    throw { status: 500, message: "Failed to create notification" };
  }
  
  Object.keys(cache).forEach(key => {
    if (key.startsWith(data.userId + "-")) delete cache[key];
  });

  await Log("backend", "info", "service", "createNotification succeeded");
  return result;
}

async function getNotificationsByUserId(userId, limit = 10, offset = 0) {
  await Log("backend", "info", "service", "getNotificationsByUserId called");
  
  const cacheKey = `${userId}-${limit}-${offset}`;
  if (cache[cacheKey]) {
    await Log("backend", "info", "service", "getNotificationsByUserId cache hit");
    return cache[cacheKey];
  }

  const result = repo.getNotificationsByUserId(userId, limit, offset);
  cache[cacheKey] = result;
  
  await Log("backend", "info", "service", "getNotificationsByUserId succeeded");
  return result;
}

async function markAsRead(notificationId) {
  await Log("backend", "info", "service", "markAsRead called");
  const result = repo.markAsRead(notificationId);
  if (!result) {
    await Log("backend", "warn", "service", "markAsRead: notification not found");
    throw { status: 404, message: "Notification not found" };
  }
  await Log("backend", "info", "service", "markAsRead succeeded");
  return result;
}

async function getPlacementNotificationsLast7Days() {
  await Log("backend", "info", "service", "getPlacementNotificationsLast7Days called");
  const result = repo.getPlacementNotificationsLast7Days();
  await Log("backend", "info", "service", "getPlacementNotificationsLast7Days succeeded");
  return result;
}

module.exports = {
  createNotification,
  getNotificationsByUserId,
  markAsRead,
  getPlacementNotificationsLast7Days,
};
