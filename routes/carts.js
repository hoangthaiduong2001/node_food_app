const cartController = require("../controllers/carts.controller");

const router = require("express").Router();

router
  .route("/")
  .get(cartController.getCart)
  .post(cartController.addCart)
  .put(cartController.updateCart)
  .delete(cartController.deleteItemFromCart);

router.route("/:userId").get(cartController.getCartByUserId);

module.exports = router;
