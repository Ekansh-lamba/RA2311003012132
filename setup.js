require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const NAME = "Ekansh Lamba";
const EMAIL = "ekanshlamba6226@gmail.com";
const ROLL = "RA2311003012132";
const ACCESS_CODE = "QkbpxH";

const CLIENT_ID = "7ef5c351-ebd3-406f-a2bf-489d9d72e878";
const CLIENT_SECRET = "cvuRUfGThKXADkEA";

async function getTokenAndTest() {
  console.log("\n=== STEP 1: GET TOKEN ===");
  let token;

  try {
    const tokenRes = await axios.post(process.env.TOKEN_URL, {
      email: EMAIL,
      name: NAME,
      rollNo: ROLL,
      accessCode: ACCESS_CODE,
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });
    console.log("Token Response:", JSON.stringify(tokenRes.data, null, 2));
    token = tokenRes.data.access_token || tokenRes.data.token || tokenRes.data.accessToken;
  } catch (err) {
    if (err.response) {
      console.error("Token failed:", err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error("Token error:", err.message);
    }
    process.exit(1);
  }

  console.log("\n=== STEP 2: UPDATE .env ===");
  const envPath = path.join(__dirname, ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent
    .replace(/^AUTH_TOKEN=.*$/m, `AUTH_TOKEN=${token}`)
    .replace(/^CLIENT_ID=.*$/m, `CLIENT_ID=${CLIENT_ID}`)
    .replace(/^CLIENT_SECRET=.*$/m, `CLIENT_SECRET=${CLIENT_SECRET}`);
  fs.writeFileSync(envPath, envContent);
  console.log(".env updated!");
  console.log(`CLIENT_ID     : ${CLIENT_ID}`);
  console.log(`CLIENT_SECRET : ${CLIENT_SECRET}`);
  console.log(`AUTH_TOKEN    : Bearer ${token}`);

  console.log("\n=== STEP 3: TEST DEPOT API ===");
  try {
    const depotRes = await axios.get(process.env.DEPOT_API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Depots Response:", JSON.stringify(depotRes.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("Depot API failed:", err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error("Depot API error:", err.message);
    }
  }

  console.log("\n=== STEP 4: TEST VEHICLE API ===");
  try {
    const vehicleRes = await axios.get(process.env.VEHICLE_API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Vehicles Response:", JSON.stringify(vehicleRes.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("Vehicle API failed:", err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error("Vehicle API error:", err.message);
    }
  }

  console.log("\n=== SETUP COMPLETE ===");
}

getTokenAndTest();
