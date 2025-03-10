const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema(
  {
    review: {
      type: {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductModel",
        },
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          // type: String,
          ref: "UserModel",
        },
        rating: { type: Number, min: 1, max: 5 },
        content: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["show", "hide"],
          default: "show",
        },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReviewModel", reviewSchema);
