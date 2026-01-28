const NotificationModel = require("../model/notification.model");

const getAllNotification = async (req, res) => {
  const start = req.query.start ?? 1;
  const end = req.query.count ?? 10;
  req.session.isAuth = true;
  try {
    const notification = await NotificationModel.find()
      .sort({ createdAt: -1 })
      .skip(parseInt(start) - 1)
      .limit(parseInt(end))
      .exec();
    res.status(200).json({ data: notification });
  } catch (error) {
    console.log("error", error);
    res.status(400).json(error);
  }
};

const updateNotificationById = async (req, res) => {
  const id = req.params.id;

  try {
    const updatedNotification = await NotificationModel.findByIdAndUpdate(
      id,
      { status: "read" },
      { new: true }
    ).exec();

    if (!updatedNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(400).json({ message: "Failed to update notification", error });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await NotificationModel.updateMany(
      { status: "unread" },
      { $set: { status: "read" } }
    );

    res.status(200).json({
      message: "All unread notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(400).json({ message: "Failed to update notifications", error });
  }
};

module.exports = {
  getAllNotification,
  updateNotificationById,
  markAllNotificationsAsRead,
};
