const express = require("express");
const notificationRoutes = require("./routes/notifications");

const router = express.Router();

router.use(express.json());
router.use(notificationRoutes);

module.exports = router;
