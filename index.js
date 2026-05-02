require("dotenv").config();

const express = require("express");
const Log = require("./logging_middleware/index");
const schedulerRouter = require("./vehicle_maintenance_scheduler/index");
const notificationApp = require("./notification_app_be/index");

const app = express();

app.use(express.json());

app.use("/scheduler", schedulerRouter);
app.use("/api", notificationApp);

app.use(async (err, req, res, next) => {
  await Log("backend", "fatal", "handler", err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await Log("backend", "info", "handler", `Server started on port ${PORT}`);
});