const cartController = require("../controllers/carts.controller");

const router = require("express").Router();

router
  .route("/")
  .get(cartController.getCart)
  .post(cartController.addCart)
  .put(cartController.updateCart)
  .put(cartController.deleteItemFromCart);

module.exports = router;
