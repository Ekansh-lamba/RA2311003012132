const service = require("../services/notificationService");
const priorityInboxService = require("../services/priorityInboxService");
const Log = require("../../logging_middleware/index");

async function createNotification(req, res) {
  await Log("backend", "info", "controller", "POST /notifications called");
  try {
    const notification = await service.createNotification(req.body);
    return res.status(201).json(notification);
  } catch (err) {
    await Log("backend", "error", "controller", err.message || "createNotification error");
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function getNotificationsByUserId(req, res) {
  await Log("backend", "info", "controller", "GET /notifications/:userId called");
  try {
    const notifications = await service.getNotificationsByUserId(req.params.userId);
    return res.status(200).json(notifications);
  } catch (err) {
    await Log("backend", "error", "controller", err.message || "getNotifications error");
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function markAsRead(req, res) {
  await Log("backend", "info", "controller", "PATCH /notifications/:id/read called");
  try {
    const notification = await service.markAsRead(req.params.notificationId);
    return res.status(200).json(notification);
  } catch (err) {
    await Log("backend", "error", "controller", err.message || "markAsRead error");
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function getPlacementNotificationsLast7Days(req, res) {
  await Log("backend", "info", "controller", "GET /notifications/placement/recent called");
  try {
    const notifications = await service.getPlacementNotificationsLast7Days();
    return res.status(200).json(notifications);
  } catch (err) {
    await Log("backend", "error", "controller", err.message || "getPlacement error");
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function getPriorityInbox(req, res) {
  await Log("backend", "info", "controller", "GET /notifications/priority called");
  try {
    const { userId, limit } = req.query;
    const result = await priorityInboxService.getPriorityInbox(userId, limit);
    return res.status(200).json(result);
  } catch (err) {
    await Log("backend", "error", "controller", err.message || "getPriorityInbox error");
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  createNotification,
  getNotificationsByUserId,
  markAsRead,
  getPlacementNotificationsLast7Days,
  getPriorityInbox,
};
