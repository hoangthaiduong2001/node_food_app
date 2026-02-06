const multer = require("multer");

const storageEngine = multer.memoryStorage();

const upload = multer({
  storage: storageEngine,
  limits: {
    fileSize: 1 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Upload file error"), false);
    }
  },
});

module.exports = upload;
