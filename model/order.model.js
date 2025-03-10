const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    address: {
      type: String,
      required: true,
      maxlength: 200,
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
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (!this.isModified("products")) return next();
  let totalPrice = 0;
  for (const item of this.products) {
    const product = await mongoose.model("ProductModel").findById(item.product);
    if (product) {
      totalPrice += product.price * item.quantity;
    }
  }
  this.total = totalPrice;
  next();
});

module.exports = mongoose.model("OrderModel", orderSchema);
