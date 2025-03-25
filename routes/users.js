const userController = require("../controllers/user.controller");
require("../middleware/authentication");

const router = require("express").Router();

router.route("/checkLogin").get(userController.isLogin);

router.route("/signup").post(userController.signup);

router.route("/login").post(userController.login);

router.route("/logout").get(userController.logout);

router.route("/forgetpassword").post(userController.forgetPassword);

router.route("/updatepassword").put(userController.updatePassword);

router
  .route("/")
  .get(userController.getAllUser)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUserById)
  .put(userController.updateUser)
  .delete(userController.deleteUser);

router
  .route("/updatepassword/:token")
  .put(userController.updatePasswordWithToken);

module.exports = router;
