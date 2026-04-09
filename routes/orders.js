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

router.route("/user/:userId").get(orderController.getOrderByUserId);

router.route("/:orderId").get(orderController.getOrderDetail);

router.route("/status/:id").put(orderController.updateOrderStatus);

router.route("/paymentCod/:id").put(orderController.paymentOrderCod);

router.route("/paymentWallet/:id").put(orderController.paymentOrderCod);

module.exports = router;
