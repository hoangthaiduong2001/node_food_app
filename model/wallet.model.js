const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const transactionSchema = new Schema(
  {
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

const walletSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    walletPassword: {
      type: String,
      required: true,
    },

    transactions: [transactionSchema],
  },
  { timestamps: true },
);

walletSchema.virtual("user", {
  ref: "UserModel",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

walletSchema.pre("save", async function (next) {
  if (!this.isModified("walletPassword")) return next();

  const salt = await bcrypt.genSalt(10);
  this.walletPassword = await bcrypt.hash(this.walletPassword, salt);

  next();
});

walletSchema.set("toJSON", {
  virtuals: true,
  transform(_, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("WalletModel", walletSchema);
