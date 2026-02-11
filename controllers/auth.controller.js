const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const UserModel = require("../model/user.model");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const TokenModel = require("../model/token.model");
const checkToken = require("../middleware/checkRefreshToken");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    let user = await UserModel.findOne({
      $or: [{ googleId: sub }, { email }],
    });

    if (user && !user.googleId) {
      user.googleId = sub;
      user.provider = "google";
      await user.save();
    }

    if (!user) {
      user = await UserModel.create({
        googleId: sub,
        email,
        username: name,
        img: picture,
        provider: "google",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await TokenModel.create({
      user: user._id,
      token: refreshToken,
      type: "refresh",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      message: "Login with Google successfully",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        img: user.img,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({
      message: "Google login failed",
    });
  }
};

const signup = async (req, res) => {
  const { password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new UserModel({
      ...req.body,
      password: hashedPassword,
    });

    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await TokenModel.create({
      user: user._id,
      token: refreshToken,
      type: "refresh",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: "Signup successfully",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await TokenModel.create({
      user: user._id,
      token: refreshToken,
      type: "refresh",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      message: "Login successfully",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;

  await TokenModel.findOneAndUpdate(
    { token: refreshToken, type: "refresh" },
    { revoked: true },
  );

  res.json({ message: "Logout successfully" });
};
const isLogin = async (req, res, next) => {
  if ((await req.session?.isLogin) && (await req.session?.user)) {
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
  user.resetPasswordExpires = Date.now() + 900000;
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
    req.session.isLogin = true;
    req.session.user = user._id;
    res.status(200).json({ message: "password is updated ...." });
  } catch (error) {
    return res.status(400).json({ message: error });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  try {
    const isValid = await checkToken(refreshToken);

    if (!isValid) {
      return res.status(403).json({ message: "Refresh token revoked" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const newAccessToken = generateAccessToken({
      _id: decoded.userId,
      role: decoded.role,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: "Refresh token expired or invalid" });
  }
};

module.exports = {
  googleLogin,
  signup,
  login,
  logout,
  isLogin,
  forgetPassword,
  updatePassword,
  updatePasswordWithToken,
  refreshToken,
};
