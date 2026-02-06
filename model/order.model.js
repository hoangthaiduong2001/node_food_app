const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    total: {
      type: Number,
      default: 0,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductModel",
        },
        quantity: { type: Number, default: 1 },
      },
    ],
    status: {
      type: String,
      enum: ["waiting", "received", "cancelled"],
      default: "waiting",
    },
    payment: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    date: {
      type: Date,
    },
  },
  { timestamps: true },
);

orderSchema.virtual("user", {
  ref: "UserModel",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

orderSchema.set("toJSON", {
  virtuals: true,
  transform(_, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.userId;
    delete ret.__v;
    return ret;
  },
});

orderSchema.pre("save", async function (next) {
  if (!this.isModified("products")) return next();
  let totalPrice = 0;
  for (const item of this.products) {
    const product = await mongoose.model("ProductModel").findById(item.product);
    if (product) {
      totalPrice += (product.price - product.discount) * item.quantity;
    }
  }
  this.total = totalPrice;
  next();
});

module.exports = mongoose.model("OrderModel", orderSchema);
