const orderController = require("../controllers/orders.controller");

const router = require("express").Router();

router
  .route("/")
  .get(orderController.getOrders)
  .post(orderController.addNewOrder);

router
  .route("/:id")
  .get(orderController.getOrder)
  .put(orderController.updateOrder)
  .delete(orderController.deleteOrder);

router.route("/payment/:id").put(orderController.paymentOrder);

module.exports = router;
