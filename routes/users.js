const upload = require("../middleware/upload");
const userController = require("../controllers/user.controller");
require("../middleware/authentication");

const router = require("express").Router();

router
  .route("/")
  .get(userController.getAllUser)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUserById)
  .put(upload.single("file"), userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
