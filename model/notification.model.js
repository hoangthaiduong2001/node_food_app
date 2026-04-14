const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["order", "wallet", "promotion", "system"],
      default: "system",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    data: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderModel",
      },
      amount: Number,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("NotificationModel", notificationSchema);
