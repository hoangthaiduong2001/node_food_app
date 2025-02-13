const userController = require("../controllers/user.controller");

const router = require("express").Router();

router.route("/").get(userController.isLogin);

router.route("/signup").post(userController.signup);

router.route("/login").post(userController.login);

router.route("/logout").get(userController.logout);

router.route("/forgetpassword").post(userController.forgetPassword);

router.route("/updatepassword").put(userController.updatePassword);

router
  .route("/updatepassword/:token")
  .put(userController.updatePasswordWithToken);

module.exports = router;
