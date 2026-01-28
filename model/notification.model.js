const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    username: { type: String, required: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderModel",
    },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationModel", notificationSchema);
