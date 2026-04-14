const NotificationModel = require("../model/notification.model");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const notifications = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await NotificationModel.countDocuments({ userId });

    return res.status(200).json({
      message: "Get notifications successfully",
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await NotificationModel.countDocuments({
      userId,
      isRead: false,
    });

    return res.status(200).json({
      message: "Get unread count successfully",
      data: count,
    });
  } catch (error) {
    console.error("Unread count error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
