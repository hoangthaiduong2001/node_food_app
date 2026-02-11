const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    match: /.+\@.+\..+/,
    unique: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  img: {
    type: String,
    default:
      "https://storage.googleapis.com/cloud-image-food-app.firebasestorage.app/images/1770179834033-default_icon.jpg",
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  provider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },
  refreshToken: {
    type: String,
  },
});

userSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { username: { $exists: true, $ne: null } },
  },
);

userSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("There was a duplicate key error"));
  } else {
    next();
  }
});

module.exports = mongoose.model("UserModel", userSchema);
