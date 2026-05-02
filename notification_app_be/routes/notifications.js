const express = require("express");
const controller = require("../controllers/notificationController");

const router = express.Router();

router.post("/notifications", controller.createNotification);
router.get("/notifications/placement/recent", controller.getPlacementNotificationsLast7Days);
router.get("/notifications/priority", controller.getPriorityInbox);
router.get("/notifications/:userId", controller.getNotificationsByUserId);
router.patch("/notifications/:notificationId/read", controller.markAsRead);

module.exports = router;
