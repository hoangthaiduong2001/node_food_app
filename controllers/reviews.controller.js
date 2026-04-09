const ReviewModel = require("../model/review.model");
const ProductModel = require("../model/product.model");
const UserModel = require("../model/user.model");
const { convertMongoId } = require("../utils/convertId");
const mongoose = require("mongoose");

const getReviews = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      filter["review.content"] = { $regex: search, $options: "i" };
    }

    const reviews = await ReviewModel.find(filter)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate("review.product", "title img")
      .populate("review.reviewer", "username")
      .lean();

    const total = await ReviewModel.countDocuments(filter);

    const data = convertMongoId(reviews);

    res.status(200).json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getReviewByIdProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await ReviewModel.find({ "review.product": id })
      .select("-_id -review.username")
      .populate("review.product", "title img")
      .populate("review.reviewer", "username")
      .exec();
    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const addReview = async (req, res) => {
  const { productId, userId, content, rating } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid productId" });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid userId" });
  }

  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  try {
    const [product, user] = await Promise.all([
      ProductModel.findById(productId),
      UserModel.findById(userId),
    ]);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyReviewed = await ReviewModel.findOne({
      "review.product": productId,
      "review.reviewer": userId,
    });

    if (alreadyReviewed) {
      return res.status(400).json({
        message: "You already reviewed this product",
      });
    }

    const newReview = await ReviewModel.create({
      review: {
        product: productId,
        reviewer: userId,
        username: user.username,
        content,
        rating,
      },
    });

    res.status(201).json({
      message: "Review added successfully",
      data: newReview,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateStatusReview = async (req, res) => {
  const { reviewId } = req.params;
  const { status } = req.body;
  try {
    const data = await ReviewModel.findOneAndUpdate(
      { "review._id": reviewId },
      { $set: { "review.status": status } },
      { new: true },
    ).exec();

    if (!data) {
      return res.status(404).json({ message: "Review not found" });
    }

    res
      .status(200)
      .json({ message: "Update status review successfully", data });
  } catch (error) {
    res.status(400).json({ message: "Error updating review", error });
  }
};

const deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  const { userId } = req.body;

  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    return res.status(404).json({
      message: "Review not found",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({
      message: "Invalid review id",
    });
  }

  try {
    const review = await ReviewModel.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (review.review.reviewer?.toString() !== userId) {
      return res.status(403).json({
        message: "You can only delete your review",
      });
    }

    await ReviewModel.findByIdAndDelete(reviewId);

    res.status(200).json({
      message: "Delete review successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getReviews,
  addReview,
  getReviewByIdProduct,
  updateStatusReview,
  deleteReview,
};
