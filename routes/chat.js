const router = require("express").Router();
const controller = require("../controllers/chat.controller");

router.get("/conversations", controller.getConversations);
router.post("/conversation", controller.createConversation);
router.get("/messages/:conversationId", controller.getMessages);
router.post("/message", controller.sendMessage);
router.get("/chat-users", controller.getChatUsers);

module.exports = router;
