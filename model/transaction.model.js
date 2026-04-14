const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = new Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletModel",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["topup", "payment", "refund"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    description: {
      type: String,
      default: "",
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderModel",
    },
  },
  { timestamps: true },
);

transactionSchema.set("toJSON", {
  virtuals: true,
  transform(_, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("TransactionModel", transactionSchema);
