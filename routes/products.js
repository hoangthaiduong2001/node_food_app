const express = require("express");
const router = express.Router();
const productController = require("../controllers/products.controller");
const upload = require("../middleware/upload");

router
  .route("/")
  .get(productController.getAllProducts)
  .post(upload.single("file"), productController.addNewProduct);

router
  .route("/:id")
  .get(productController.getProductById)
  .put(upload.single("file"), productController.updateProduct)
  .delete(productController.deleteProduct);

module.exports = router;
