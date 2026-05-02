const axios = require("axios");

const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const VALID_PACKAGES = ["controller", "service", "repository", "handler", "db", "route", "middleware"];

async function Log(stack, level, pkg, message) {
  if (!VALID_STACKS.includes(stack)) return;
  if (!VALID_LEVELS.includes(level)) return;
  if (!pkg || typeof pkg !== "string" || pkg.trim() === "" || !VALID_PACKAGES.includes(pkg)) return;

  try {
    const response = await axios.post(
      process.env.LOG_API_URL,
      { stack, level, package: pkg, message },
      { headers: { Authorization: `Bearer ${process.env.AUTH_TOKEN}` } }
    );
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error(err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

module.exports = Log;
