const ProductModel = require("../model/product.model");
const fs = require("fs");

const getAllProducts = async (req, res) => {
  const { start, end, search, category } = req.query;
  let filter = {};
  if (search) {
    filter = {
      $or: [
        {
          title: new RegExp(search),
        },
      ],
    };
  }
  if (category) {
    if (Object.keys(filter).length !== 0) {
      const newOption = filter.$or;
      newOption.push({ "category[0].name": category });
      filter = { $or: newOption };
    } else {
      filter = {
        $or: [
          {
            "category.0.name": category,
          },
        ],
      };
    }
  }
  try {
    const Products = await ProductModel.aggregate([
      {
        $lookup: {
          from: "categorymodels",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $match: filter },
      {
        $facet: {
          data:
            start && end
              ? [{ $skip: +start - 1 || 0 }, { $limit: +end || 10 }]
              : [],
          count: [{ $count: "total" }],
        },
      },
    ]);
    const response = {
      data: Products[0]?.data || [],
      total: Products[0]?.count[0]?.total || 0,
    };
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(err);
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await ProductModel.findById(id).populate("category");
    // product = { ...product, averageRating: product.averageRating };
    res
      .status(200)
      .json({ message: "Get information product successfully", data: product });
  } catch (error) {
    console.log("error", error);
    res.status(404).json(error);
  }
};

const addNewProduct = async (req, res) => {
  let data = req.body;
  if (req.file) {
    const filePath = process.env.API || "http://localhost:3500";
    data = { ...data, img: `${filePath}/images/${req.file.filename}` };
  }
  const product = new ProductModel(data);
  try {
    await product.save();
    //product.averageRating;
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
  let data = req.body;
  if (req.file) {
    const filePath = process.env.API || "http://localhost:3500";
    data = { ...data, img: `${filePath}/images/${req.file.filename}` };
  }
  try {
    const product = await ProductModel.findByIdAndUpdate(
      id,
      {
        $set: data,
      },
      { new: true }
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

const uploadImage = async (req, res) => {
  if (req.file) {
    const filePath = process.env.API || "http://localhost:3500";
    const id = req.params.id;
    await ProductModel.updateOne(
      { _id: id },
      { img: `${filePath}/images/${req.file.filename}` }
    ).exec();
    res.status(200).json({ message: "Upload image successfully" });
  } else {
    res.status(500).json("err");
  }
};
module.exports = {
  deleteProduct,
  getAllProducts,
  getProductById,
  addNewProduct,
  updateProduct,
  uploadImage,
};
