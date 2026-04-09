const CategoryModel = require("../model/category.model");
const mongoose = require("mongoose");

const getAllCategory = async (req, res) => {
  const { start = 1, end = 10, search } = req.query;

  let filter = {};

  if (search) {
    filter = {
      name: new RegExp(search, "i"),
    };
  }

  try {
    const categories = await CategoryModel.find(filter)
      .select("_id name status")
      .skip(start - 1)
      .limit(Number(end))
      .lean();

    const result = categories.map((c) => ({
      id: c._id,
      name: c.name,
      status: c.status,
    }));

    res.status(200).json({
      message: "Get all categories successfully",
      data: result,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

const getCategoriesById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const category = await CategoryModel.findById(id)
      .populate("products", "_id title price discount img desc")
      .lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const result = {
      ...category,
      id: category._id,
      products: category.products.map((p) => ({
        ...p,
        id: p._id,
        _id: undefined,
      })),
    };

    delete result._id;

    res.json({
      message: "Get category successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addNewCategory = async (req, res) => {
  try {
    let { name, products } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    let productList = [];
    if (products && Array.isArray(products)) {
      productList = products.map((item) => ({ product: item.product }));
    }

    let existingCategory = await CategoryModel.findOne({ name });

    if (existingCategory) {
      const productIds = new Set(
        existingCategory.products.map((p) => p.product.toString()),
      );

      productList.forEach((p) => {
        if (!productIds.has(p.product.toString())) {
          existingCategory.products.push(p);
        }
      });

      await existingCategory.save();

      return res.status(200).json({
        message: "Products added to existing category",
        data: existingCategory,
      });
    }

    const category = new CategoryModel({
      name,
      products: productList,
    });

    await category.save();

    res.status(201).json({
      message: "Category added successfully",
      data: category,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await CategoryModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    res.json({
      message: "Update category successfully",
      category,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCategoryDetail = async (req, res) => {
  try {
    const { categoryId, productId } = req.params;

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      { $pull: { products: { product: { _id: productId } } } },
      { new: true },
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Product removed from category successfully",
      category: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

const deleteCategory = async (req, res) => {
  const id = req.params.id;
  try {
    await CategoryModel.findByIdAndDelete(id).exec();
    res.status(200).json({ message: "Category has been deleted" });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {
  deleteCategory,
  getAllCategory,
  getCategoriesById,
  updateCategory,
  addNewCategory,
  deleteCategoryDetail,
};
