const ProductModel = require("../model/product.model");
const ReviewModel = require("../model/review.model");
const mongoose = require("mongoose");
const bucket = require("../config/firebase");
const fs = require("fs");

const getAllProducts = async (req, res) => {
  const { limit = 4, offset = 0, search, category } = req.query;

  try {
    const pipeline = [];

    pipeline.push({
      $lookup: {
        from: "categorymodels",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    });

    const match = {};

    if (search) {
      match.title = { $regex: search, $options: "i" };
    }

    if (category) {
      match["category.name"] = category;
    }

    if (Object.keys(match).length) {
      pipeline.push({ $match: match });
    }

    pipeline.push({
      $project: {
        id: { $toString: "$_id" },
        title: 1,
        price: 1,
        desc: 1,
        img: 1,
        _id: 0,
      },
    });

    pipeline.push({
      $facet: {
        data: [{ $skip: Number(offset) }, { $limit: Number(limit) }],
        count: [{ $count: "total" }],
      },
    });

    const result = await ProductModel.aggregate(pipeline);

    const products = result[0]?.data || [];
    const total = result[0]?.count[0]?.total || 0;

    res.status(200).json({
      data: products,
      total,
      hasMore: Number(offset) + products.length < total,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

const getTopRatedProducts = async (req, res) => {
  try {
    const products = await ProductModel.aggregate([
      {
        $addFields: {
          averageRating: {
            $cond: [
              { $gt: [{ $size: "$reviews" }, 0] },
              { $avg: "$reviews.rating" },
              0,
            ],
          },
        },
      },

      {
        $sort: { averageRating: -1 },
      },

      {
        $limit: 3,
      },

      {
        $project: {
          id: "$_id",
          title: 1,
          desc: 1,
          img: 1,
          averageRating: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json(products);
  } catch (err) {
    res.status(400).json(err);
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid product id",
    });
  }

  try {
    const product = await ProductModel.findById(id)
      .populate("category", "name")
      .lean();

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const reviewDocs = await ReviewModel.find({
      "review.product": id,
      "review.status": "show",
    })
      .populate("review.reviewer", "username img")
      .lean();

    const formattedReviews = reviewDocs.map((doc) => ({
      id: doc._id.toString(),
      userId: doc.review.reviewer?._id?.toString(),
      username: doc.review.reviewer?.username || "Anonymous",
      img:
        doc.review.reviewer?.img ||
        "https://storage.googleapis.com/cloud-image-food-app.firebasestorage.app/images/default_icon.jpg",
      rating: doc.review.rating,
      content: doc.review.content ?? "",
    }));
    const avg =
      formattedReviews.length > 0
        ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) /
          formattedReviews.length
        : 0;

    const formatted = {
      id: product._id.toString(),
      title: product.title,
      price: product.price,
      discount: product.discount ?? 0,
      desc: product.desc,
      img: product.img,
      averageRating: Number(avg.toFixed(1)),
      totalReviews: formattedReviews.length,
      reviews: formattedReviews.slice(0, 5),
    };

    return res.status(200).json({
      message: "Get product successfully",
      data: formatted,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const searchProducts = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return res.status(200).json({
      message: "Empty query",
      data: [],
    });
  }

  try {
    const products = await ProductModel.find({
      title: { $regex: q, $options: "i" },
    })
      .limit(10)
      .select("title img price")
      .lean();

    const formatted = products.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      img: p.img,
      price: p.price,
    }));

    return res.status(200).json({
      message: "Search success",
      data: formatted,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const addNewProduct = async (req, res) => {
  let data = req.body;
  if (req.file) {
    const fileName = `product/${Date.now()}-${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    await file.makePublic();
    data.img = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }

  const product = new ProductModel(data);
  try {
    await product.save();
    res
      .status(200)
      .json({ message: "Add a new product successfully", data: product });
  } catch (err) {
    console.log("err", err);
    res.status(500).json(err);
  }
};

const updateProduct = async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  let data = req.body;

  try {
    if (req.file) {
      const fileName = `product/${Date.now()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      await file.makePublic();

      data.img = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }
    const product = await ProductModel.findByIdAndUpdate(
      id,
      {
        $set: data,
      },
      { new: true },
    ).exec();
    res
      .status(200)
      .json({ message: "Update a product successfully", data: product });
  } catch (error) {
    res.status(500).json(error);
  }
};

const deleteProduct = async (req, res) => {
  const id = req.params.id;
  try {
    const product = await ProductModel.findByIdAndDelete(id).exec();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product?.img) {
      try {
        const filePath = `.${product.img.replace(/^.*\/images\//, "/images/")}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Could not delete the file. " + err });
          }
          res
            .status(200)
            .json({ message: "Product and associated file have been deleted" });
        });
      } catch (err) {
        res.status(500).json({ message: "Could not delete the file. " + err });
      }
    } else {
      res.status(200).json({ message: "Product has been deleted" });
    }
  } catch (error) {
    console.log("123", error);
    res.status(500).json(err);
  }
};

module.exports = {
  deleteProduct,
  getAllProducts,
  searchProducts,
  getTopRatedProducts,
  getProductById,
  addNewProduct,
  updateProduct,
};
