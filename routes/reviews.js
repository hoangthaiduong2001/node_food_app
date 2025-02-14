const reviewController = require("../controllers/reviews.controller");

const router = require("express").Router();

router
  .route("/")
  .get(reviewController.getReviews)
  .post(reviewController.addReview);

router
  .route("/:id")
  .get(reviewController.getReviewByIdProduct)
  .put(reviewController.updateStatusReview);

module.exports = router;
