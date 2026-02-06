const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const UserModel = require("../model/user.model");

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

    if (!user) {
      user = await UserModel.create({
        googleId: sub,
        email,
        username: name,
        img: picture,
        provider: "google",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login with Google success",
      token,
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

module.exports = { googleLogin };
