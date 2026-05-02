const repo = require("../repositories/notificationRepository");
const Log = require("../../logging_middleware/index");

async function createNotification(data) {
  await Log("backend", "info", "service", "createNotification called");
  const result = repo.createNotification(data);
  if (!result) {
    await Log("backend", "error", "service", "createNotification failed");
    throw { status: 500, message: "Failed to create notification" };
  }
  await Log("backend", "info", "service", "createNotification succeeded");
  return result;
}

async function getNotificationsByUserId(userId) {
  await Log("backend", "info", "service", "getNotificationsByUserId called");
  const result = repo.getNotificationsByUserId(userId);
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
