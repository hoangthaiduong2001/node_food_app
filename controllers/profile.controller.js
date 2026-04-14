const UserModel = require("../model/user.model");

const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.params.id;

    const user = await UserModel.findById(userId).select(
      "username email address phone img role provider createdAt updatedAt",
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Get profile successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.params.id;

    const { username, phone, address, img } = req.body;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (username) user.username = username;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (img) user.img = img;

    await user.save();

    return res.status(200).json({
      message: "Update profile successfully",
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        img: user.img,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Username or email already exists",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
