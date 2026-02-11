const TokenModel = require("../model/token.model");

const checkRefreshToken = async (refreshToken) => {
  const validToken = await TokenModel.findOne({
    token: refreshToken,
    type: "refresh",
    revoked: false,
  });

  return !!validToken;
};

module.exports = checkRefreshToken;
