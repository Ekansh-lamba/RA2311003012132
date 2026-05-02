const express = require("express");
const axios = require("axios");
const knapsack = require("./knapsack");
const Log = require("../logging_middleware/index");

const router = express.Router();

router.get("/run", async (req, res) => {
  try {
    await Log("backend", "info", "controller", "Scheduler run initiated");

    const depotsResponse = await axios.get(process.env.DEPOT_API_URL, {
      headers: { Authorization: `Bearer ${process.env.AUTH_TOKEN}` },
    });
    const depots = depotsResponse.data.depots;
    await Log("backend", "info", "service", "Depots fetched");

    const vehiclesResponse = await axios.get(process.env.VEHICLE_API_URL, {
      headers: { Authorization: `Bearer ${process.env.AUTH_TOKEN}` },
    });
    const allTasks = vehiclesResponse.data.vehicles.map((v) => ({
      id: v.TaskID,
      duration: v.Duration,
      impact: v.Impact,
    }));
    await Log("backend", "info", "service", "Tasks fetched");

    const results = depots.map((depot) => {
      const selectedTasks = knapsack(depot.MechanicHours, allTasks);
      const totalImpact = selectedTasks.reduce((sum, t) => sum + t.impact, 0);
      const totalDuration = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
      return {
        depotId: depot.ID,
        selectedTasks,
        totalImpact,
        totalDuration,
      };
    });

    await Log("backend", "info", "service", "Knapsack solved for all depots");

    return res.json(results);
  } catch (err) {
    await Log("backend", "error", "controller", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
