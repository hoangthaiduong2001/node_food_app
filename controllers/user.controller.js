const UserModel = require("../model/user.model");
const bcrypt = require("bcrypt");
const bucket = require("../config/firebase");
const mongoose = require("mongoose");

const getAllUser = async (req, res) => {
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
    if (start && end) {
      const user = await UserModel.find(filter)
        .select("-password")
        .where("role")
        .ne("admin")
        .skip(start - 1 ?? 0)
        .limit(end ?? 10)
        .exec();
      res.status(200).json({ data: user });
    } else {
      const users = await UserModel.find(filter)
        .select("-password")
        .where("role")
        .ne("admin")
        .exec();
      res.status(200).json({ data: users });
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

const getUserById = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await UserModel.findById(id).exec();
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(400).json(error);
  }
};

const createUser = async (req, res, next) => {
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 12);
  try {
    const user = new UserModel({
      ...req.body,
      password: hashedPassword,
    });
    await user.save();
    const { password, ...userWithoutPassword } = user.toObject();
    res
      .status(201)
      .json({ message: "Create user successfully", data: userWithoutPassword });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const updateData = { ...req.body };

    if (req.file) {
      const fileName = `users/${Date.now()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      await file.makePublic();

      updateData.img = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Update user successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      message: "Update user failed",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  const id = req.params.id;
  try {
    await UserModel.deleteOne({ _id: id });
    res.status(200).json({ message: "Delete user successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};

module.exports = {
  getAllUser,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};
