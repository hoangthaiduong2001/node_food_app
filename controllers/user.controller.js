const UserModel = require("../model/user.model");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const signup = async (req, res, next) => {
  const { password, email } = req.body;

  const hasedPassword = await bcrypt.hash(password, 12);
  try {
    const user = new UserModel({
      ...req.body,
      password: hasedPassword,
    });
    await user.save();
    req.session.islogin = true;
    req.session.user = user._id;
    res
      .status(201)
      .json({ message: "You have successfully registered. Please login now" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res, next) => {
  const { password, username } = req.body;
  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(404).json({ message: "Incorrect password" });
    }

    req.session.islogin = true;
    req.session.user = user._id;
    req.session.save();
    user.password = undefined;
    res.status(200).json({ message: "You have login successfully", user });
  } catch (error) {
    res.status(404).json({ message: error });
  }
};

const logout = async (req, res, next) => {
  try {
    req.session.islogin = false;
    res.status(200).json({ message: "you have logout successfully" });
  } catch (error) {
    res.status(404).json({ message: error });
  }
};

const isLogin = async (req, res, next) => {
  if ((await req.session?.islogin) && (await req.session?.user)) {
    const user = await UserModel.findById(req.session.user);
    const newUser = {
      email: user.email,
      role: user.role,
      username: user.username,
    };
    res.status(200).json(newUser);
  } else {
    res.status(404).json({ message: "You are not login" });
  }
};
const forgetPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email: email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "30m",
  });
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 900000; // 15 minutes
  await user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset your password",
    html: `<p>Please click this <a href="http://localhost:3000/reset-password/${token}">link</a> to reset your password.</p>`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
    res.status(200).json({ message: "Reset link sent to email" });
  });
};

const updatePassword = async (req, res, next) => {
  const user_id = req.session.user;
  const user = await UserModel.findOne({
    _id: user_id,
  });
  if (!user) {
    return res.status(400).json({ message: "User do not exist" });
  }
  user.password = await bcrypt.hash(req.body.password, 12);
  try {
    await user.save();
    req.session.user = user._id;
    res.status(200).json({ message: "Password is updated" });
  } catch (error) {
    return res.status(400).json({ message: error });
  }
};

const updatePasswordWithToken = async (req, res, next) => {
  const { token } = req.params;

  const user = await UserModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
  user.password = await bcrypt.hash(req.body.password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  try {
    await user.save();
    req.session.islogin = true;
    req.session.user = user._id;
    res.status(200).json({ message: "password is updated ...." });
  } catch (error) {
    return res.status(400).json({ message: error });
  }
};

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
    const user = await UserModel.findById(id).select("-password").exec();
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(400).json(error);
  }
};

const createUser = async (req, res, next) => {
  const { password } = req.body;
  const hasedPassword = await bcrypt.hash(password, 12);
  try {
    const user = new UserModel({
      ...req.body,
      password: hasedPassword,
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
  try {
    const user = await UserModel.findOneAndUpdate(
      { _id: id },
      { $set: req.body },
      { new: true }
    )
      .select("-password")
      .exec();
    res.status(200).json({ message: "Update user successfully", data: user });
  } catch (error) {
    res.status(400).json(error);
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
  signup,
  login,
  logout,
  isLogin,
  forgetPassword,
  updatePassword,
  updatePasswordWithToken,
  getAllUser,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};
