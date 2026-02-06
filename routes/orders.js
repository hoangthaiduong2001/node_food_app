const orderController = require("../controllers/orders.controller");

const router = require("express").Router();

router
  .route("/")
  .get(orderController.getOrders)
  .post(orderController.addNewOrder);

router
  .route("/:id")
  .put(orderController.updateOrder)
  .delete(orderController.deleteOrder);

router.route("/:userId").get(orderController.getOrderByUserId);

router.route("/status/:id").put(orderController.updateOrderStatus);

router.route("/payment/:id").put(orderController.paymentOrder);

module.exports = router;
