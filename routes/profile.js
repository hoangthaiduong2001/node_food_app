const profileController = require("../controllers/profile.controller");

const router = require("express").Router();

router
  .route("/")
  .get(profileController.getProfile)
  .put(profileController.updateProfile);

module.exports = router;
