const CategoryModel = require("../model/category.model");

const getAllCategory = async (req, res) => {
  const { start, end, search } = req.query;
  let filter = {};
  if (search) {
    filter = {
      $or: [
        {
          name: new RegExp(search),
        },
      ],
    };
  }
  try {
    // const categories = await CategoryModel.find(filter)
    //   .skip(start - 1 ?? 0)
    //   .limit(end ?? 10)
    //   .exec();
    const categories = await CategoryModel.find().populate(
      "products.product",
      "_id title price discount img"
    );
    res
      .status(200)
      .json({ message: "Get all categories successfully", data: categories });
  } catch (err) {
    res.status(500).json(err);
  }
};

const getCategoriesById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await CategoryModel.findById(id).populate(
      "products.product",
      "_id title price discount img"
    );
    res.status(200).json({
      message: "Get information categories successfully",
      data: product,
    });
  } catch (error) {
    res.status(404).json(error);
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
        existingCategory.products.map((p) => p.product.toString())
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
  const id = req.params.id;
  try {
    await CategoryModel.findOneAndUpdate(
      { _id: id },
      { $set: req.body }
    ).exec();
    res.status(200).json({ message: "Update category successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};

const deleteCategoryDetail = async (req, res) => {
  try {
    const { categoryId, productId } = req.params;

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      { $pull: { products: { product: { _id: productId } } } },
      { new: true }
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
