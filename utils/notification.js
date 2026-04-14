const NotificationModel = require("../model/notification.model");

const createNotification = async ({
  userId,
  title,
  message,
  type = "system",
  data = {},
  io,
}) => {
  const notification = await NotificationModel.create({
    userId,
    title,
    message,
    type,
    data,
  });

  if (io) {
    io.to(userId.toString()).emit("notification", notification);
  }

  return notification;
};

module.exports = createNotification;
