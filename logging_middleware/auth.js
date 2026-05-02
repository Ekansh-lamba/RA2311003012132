const axios = require("axios");

async function register(clientName) {
  const response = await axios.post(process.env.REGISTER_URL, { clientName });
  return {
    clientId: response.data.clientId,
    clientSecret: response.data.clientSecret,
  };
}

async function getToken(clientId, clientSecret) {
  const response = await axios.post(process.env.TOKEN_URL, {
    clientId,
    clientSecret,
  });
  return response.data.access_token;
}

module.exports = { register, getToken };
