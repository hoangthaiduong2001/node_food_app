const notificationController = require("../controllers/notification.controller");

const router = require("express").Router();

router.route("/").get(notificationController.getAllNotification);

router.route("/:id").put(notificationController.updateNotificationById);
//   .put(orderController.updateOrder)
//   .delete(orderController.deleteOrder);

router.route("/all").put(notificationController.markAllNotificationsAsRead);

module.exports = router;
