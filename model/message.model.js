const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConversationModel",
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
    },
    text: String,

    image: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("MessageModel", messageSchema);
