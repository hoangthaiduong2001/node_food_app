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
    const categories = await CategoryModel.find(filter)
      .skip(start - 1 ?? 0)
      .limit(end ?? 10)
      .exec();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json(err);
  }
};

const getCategoriesById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await CategoryModel.findById(id);
    res.status(200).json(product);
  } catch (error) {
    res.status(404).json(error);
  }
};

const addNewCategory = async (req, res) => {
  let data = req.body;
  const category = new CategoryModel(data);
  try {
    await category.save();
    res
      .status(200)
      .json({ message: "Add a new category successfully", category: category });
  } catch (err) {
    res.status(500).json(err);
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
};
