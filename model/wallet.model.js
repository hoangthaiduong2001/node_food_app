const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

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

    pin: {
      type: String,
      required: true,
    },
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
  if (!this.isModified("pin")) return next();

  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);

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
