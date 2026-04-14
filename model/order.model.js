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
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductModel",
        },
        quantity: { type: Number, default: 1 },
      },
    ],

    address: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "wallet"],
      default: "cod",
    },

    payment: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    description: {
      type: String,
      default: "",
    },

    shippingFee: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["waiting", "processing", "shipping", "received", "cancelled"],
      default: "waiting",
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
    const product = await mongoose
      .model("ProductModel")
      .findById(item.productId);

    if (product) {
      totalPrice += (product.price - product.discount) * item.quantity;
    }
  }

  this.total = totalPrice + (this.shippingFee || 0);

  next();
});

module.exports = mongoose.model("OrderModel", orderSchema);
