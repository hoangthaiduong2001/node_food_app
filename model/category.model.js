const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema(
  {
    name: String,
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductModel",
      },
    ],
    status: {
      type: String,
      enum: ["enabled", "disabled"],
      default: "enabled",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CategoryModel", categorySchema);
