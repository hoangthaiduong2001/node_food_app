const ReviewModel = require("../model/review.model");
const ProductModel = require("../model/product.model");

const getReviews = async (req, res) => {
  const search = req.query.search;
  const start = req.query.start ?? 1;
  const end = req.query.count ?? 10;
  const filter = {};
  req.session.isAuth = true;
  if (search) filter = { title: search };
  try {
    const data = await ReviewModel.find(filter)
      .skip(parseInt(start) - 1)
      .limit(parseInt(end))
      .select("-_id -review.username")
      .populate("review.product", "title img")
      .populate("review.reviewer", "username")
      .exec();
    res.status(200).json({ data });
  } catch (error) {
    console.log("error", error);
    res.status(400).json(error);
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
  try {
    const { productId, userId, username, rating, content } = req.body.review;

    const review = new ReviewModel({
      review: {
        product: productId,
        reviewer: userId,
        username,
        content,
        rating,
      },
    });
    await review.save();

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      {
        $push: {
          reviews: {
            userId,
            username,
            rating,
            content,
          },
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res
      .status(200)
      .json({ message: "Review added successfully", data: review });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateStatusReview = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const data = await ReviewModel.findOneAndUpdate(
      { "review._id": id },
      { $set: { "review.status": status } },
      { new: true }
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
  const id = req.params.id;
  try {
    const data = await ReviewModel.deleteOne({
      "review._id": id,
    }).exec();
    res.status(200).json({ message: "Review has been deleted" });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {
  getReviews,
  addReview,
  getReviewByIdProduct,
  updateStatusReview,
  deleteReview,
};
