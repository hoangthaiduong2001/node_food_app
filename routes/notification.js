const router = require("express").Router();
const controller = require("../controllers/notification.controller");

router.get("/", controller.getNotifications);
router.get("/unread-count", controller.getUnreadCount);
router.patch("/read-all", controller.markAllAsRead);
router.patch("/:id/read", controller.markAsRead);

module.exports = router;
