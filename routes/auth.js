const authController = require("../controllers/auth.controller");
require("../middleware/authentication");

const router = require("express").Router();

router.route("/checkLogin").get(authController.isLogin);

router.route("/signup").post(authController.signup);

router.route("/login").post(authController.login);

router.route("/logout").get(authController.logout);

router.route("/forgotPassword").post(authController.forgetPassword);

router.post("/google", authController.googleLogin);

router.route("/updatePassword").put(authController.updatePassword);

router.route("/refreshToken").post(authController.refreshToken);

router
  .route("/updatePassword/:token")
  .put(authController.updatePasswordWithToken);

module.exports = router;
