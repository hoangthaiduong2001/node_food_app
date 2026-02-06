const userController = require("../controllers/user.controller");
const authController = require("../controllers/auth.controller");
require("../middleware/authentication");

const router = require("express").Router();

router.route("/checkLogin").get(userController.isLogin);

router.route("/signup").post(userController.signup);

router.route("/login").post(userController.login);

router.route("/logout").get(userController.logout);

router.route("/forgotPassword").post(userController.forgetPassword);

router.post("/google", authController.googleLogin);

router
  .route("/updatePassword/:token")
  .put(userController.updatePasswordWithToken);

module.exports = router;
