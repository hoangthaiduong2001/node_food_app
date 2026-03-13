const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const UserModel = require("../model/user.model");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const {
  generateAccessToken,
  generateRefreshToken,
  capitalizeChar,
} = require("../utils/jwt");
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
  try {
    let { username, email, password, address, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    username = username.trim();
    email = email.trim().toLowerCase();

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
      username,
      email,
      password: hashedPassword,
      address,
      phone,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await TokenModel.create({
      user: user._id,
      token: refreshToken,
      type: "refresh",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.status(201).json({
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
    console.error(error);

    if (error.code === 11000) {
      const duplicatedField = Object.keys(error.keyPattern)[0];

      return res.status(400).json({
        message: `${capitalizeChar(duplicatedField)} already exists`,
        field: duplicatedField,
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        message: firstError.message,
        field: firstError.path,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(401).json({
        message: "Username does not exist",
        field: "username",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect password",
        field: "password",
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

    return res.status(200).json({
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
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const refreshDoc = await TokenModel.findOne({
      token: refreshToken,
      type: "refresh",
      revoked: false,
    });

    if (!refreshDoc) {
      return res.status(400).json({ message: "Invalid refresh token" });
    }

    const userId = refreshDoc.user;

    refreshDoc.revoked = true;
    await refreshDoc.save();

    await UserModel.findByIdAndUpdate(userId, {
      $inc: { tokenVersion: 1 },
    });

    res.json({ message: "Logout successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
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

const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;

    email = email.trim().toLowerCase();

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: "If this email exists, an OTP has been sent",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const hashedOtp = await bcrypt.hash(otp, 10);

    await UserModel.updateOne(
      { _id: user._id },
      {
        resetPasswordOtp: hashedOtp,
        resetPasswordOtpExpires: Date.now() + 5 * 60 * 1000,
      },
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html: `
        <h3>Password Reset OTP</h3>
        <p>Your OTP code is:</p>
        <h1>${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
      `,
    });

    return res.status(200).json({
      message: "OTP sent to email",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user || !user.resetPasswordOtp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (user.resetPasswordOtpExpires < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    return res.status(200).json({
      message: "OTP verified",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
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

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    if (user.resetPasswordOtpExpires < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await UserModel.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        resetPasswordOtp: null,
        resetPasswordOtpExpires: null,
      },
    );

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
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
    const tokenDoc = await TokenModel.findOne({
      token: refreshToken,
      type: "refresh",
      revoked: false,
    });

    if (!tokenDoc) {
      return res.status(403).json({ message: "Refresh token revoked" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(403).json({ message: "Token version mismatch" });
    }

    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "10m" },
    );

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
  forgotPassword,
  verifyOtp,
  resetPassword,
  updatePassword,
  updatePasswordWithToken,
  refreshToken,
};
