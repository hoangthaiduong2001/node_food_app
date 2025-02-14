const ReviewModel = require("../model/review.model");

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
    const data = await ReviewModel.find({ "review.product": id }).exec();
    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const addReview = async (req, res) => {
  const review = new ReviewModel(req.body);
  try {
    const newReview = await review.save();
    req.session.review = newReview._id;
    res.status(200).json({ message: "Add review successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};

const updateStatusReview = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const data = await ReviewModel.findOneAndUpdate(
      { "review._id": id },
      { $set: { "review.$.status": status } },
      { new: true }
    ).exec();
    console.log("data", data);
    res.status(200).json({ message: "Update status review successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};

const deleteItemFromCart = async (req, res) => {
  const cartId = req.session.cart;
  const productsId = req.query.productsId;
  if (!cartId || !productsId) {
    return res
      .status(400)
      .json({ message: "Cart ID or Product ID is missing" });
  }
  try {
    const updatedCart = await CartModel.findOneAndUpdate(
      { _id: cartId },
      { $pull: { products: { _id: productsId } } },
      { new: true }
    ).exec();

    if (!updatedCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({
      message: "Item deleted from cart successfully",
      updatedCart,
    });
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

module.exports = {
  getReviews,
  addReview,
  getReviewByIdProduct,
  updateStatusReview,
};
