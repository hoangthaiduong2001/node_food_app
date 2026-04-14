const ConversationModel = require("../model/conversation.model");
const MessageModel = require("../model/message.model");
const UserModel = require("../model/user.model");

const getChatUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const users = await UserModel.find({
      _id: { $ne: currentUserId },
    })
      .select("_id username email img")
      .limit(50);

    return res.status(200).json({
      message: "Get chat users successfully",
      data: users,
    });
  } catch (error) {
    console.error("Get chat users error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  const messages = await MessageModel.find({ conversationId }).sort({
    createdAt: 1,
  });

  res.json({
    message: "Get messages",
    data: messages,
  });
};

const getConversations = async (req, res) => {
  const userId = req.user.id;

  const conversations = await ConversationModel.find({
    members: { $in: [userId] },
  }).sort({ updatedAt: -1 });

  res.json({
    message: "Get conversations",
    data: conversations,
  });
};

const createConversation = async (req, res) => {
  const { receiverId } = req.body;
  const userId = req.user.id;

  let conversation = await ConversationModel.findOne({
    members: { $all: [userId, receiverId] },
  });

  if (!conversation) {
    conversation = await ConversationModel.create({
      members: [userId, receiverId],
    });
  }

  res.json({
    message: "Conversation ready",
    data: conversation,
  });
};

const sendMessage = async (req, res) => {
  const { conversationId, text } = req.body;
  const senderId = req.user.id;

  const message = await MessageModel.create({
    conversationId,
    senderId,
    text,
  });

  res.json({
    message: "Send message success",
    data: message,
  });
};

module.exports = {
  getChatUsers,
  getMessages,
  getConversations,
  createConversation,
  sendMessage,
};
