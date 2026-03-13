const UserModel = require("../model/user.model");
const jwt = require("jsonwebtoken");

const isAdminAuth = async (req, res, next) => {
  if (req.session.isLogin) {
    const user = await UserModel.findById(req.session?.user).exec();
    if (user && user.role === "admin") {
      next();
    } else {
      return res.status(400).json({ message: "authorized" });
    }
  } else {
    res.status(400).json("Unauthorized");
  }
};

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Token has been revoked" });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Access token expired or invalid",
    });
  }
};

module.exports = { isAdminAuth, auth };
