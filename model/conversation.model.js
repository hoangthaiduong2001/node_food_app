const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("ConversationModel", conversationSchema);
