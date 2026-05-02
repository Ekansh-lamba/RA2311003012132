const axios = require("axios");

async function register(clientName) {
  const response = await axios.post(process.env.REGISTER_URL, {
    email: process.env.USER_EMAIL,
    name: clientName,
    mobileNo: process.env.USER_MOBILE,
    githubUsername: process.env.USER_GITHUB,
    rollNo: process.env.USER_ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
  });
  return {
    clientId: response.data.clientId || response.data.clientID,
    clientSecret: response.data.clientSecret,
  };
}

async function getToken(clientId, clientSecret) {
  const response = await axios.post(process.env.TOKEN_URL, {
    email: process.env.USER_EMAIL,
    name: process.env.USER_NAME,
    rollNo: process.env.USER_ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    clientID: clientId,
    clientSecret,
  });
  return response.data.access_token || response.data.token || response.data.accessToken;
}

module.exports = { register, getToken };
