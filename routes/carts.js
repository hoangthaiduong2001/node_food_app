const cartController = require("../controllers/carts.controller");

const router = require("express").Router();

router
  .route("/")
  .get(cartController.getCart)
  .post(cartController.addCart)
  .put(cartController.updateCart)
  .delete(cartController.deleteForUser);

router
  .route("/:cartId")
  .get(cartController.getCartByCartId)
  .delete(cartController.deleteForAdmin);

module.exports = router;
