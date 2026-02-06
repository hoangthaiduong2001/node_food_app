const UserModel = require("../model/user.model");

const isAdminAuth = async (req, res, next) => {
  if (req.session.isLogin) {
    const user = await UserModel.findById(req.session?.user).exec();
    if (user && user.role === "admin") {
      next();
    } else {
      return res.status(400).json({ message: "authorized" });
    }
  } else {
    res.status(400).json("Un Authorization");
  }
};

module.exports = isAdminAuth;
