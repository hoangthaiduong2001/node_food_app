const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadFileController = require("../controllers/uploadFile.controller");

const storageEngine = multer.diskStorage({
  destination: "./images",
  filename: (req, file, callback) => {
    callback(null, `${Date.now()}--${file.originalname}`);
  },
});

const upload = multer({ storage: storageEngine });

router
  .route("/images")
  .post(upload.single("file"), uploadFileController.uploadImage);

module.exports = router;
