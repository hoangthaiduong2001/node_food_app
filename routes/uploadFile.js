const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const uploadFileController = require("../controllers/uploadFile.controller");

router
  .route("/images")
  .post(upload.single("file"), uploadFileController.uploadImage);

module.exports = router;
