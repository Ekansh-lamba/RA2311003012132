const express = require("express");
const notificationRoutes = require("./routes/notifications");

const app = express();

app.use(express.json());
app.use("/api", notificationRoutes);

module.exports = app;
