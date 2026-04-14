const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const session = require("express-session");
const corsOptions = require("./config/corsOptions");
const errorHandler = require("./middleware/errorHandler");
const { connectDb, sessionCollection } = require("./config/db");
const { auth } = require("./middleware/authentication");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const MessageModel = require("./model/message.model");

const PORT = process.env.PORT || 3500;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set("io", io);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (userId) => {
    if (!userId) return;

    onlineUsers.set(userId, socket.id);

    socket.join(userId);

    console.log("Register user:", userId);

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`Join conversation: ${conversationId}`);
  });

  socket.on("sendMessage", async (data) => {
    console.log("SEND MESSAGE TRIGGERED:", data);

    try {
      const { conversationId, senderId, receiverId, text } = data;

      const message = await MessageModel.create({
        conversationId,
        senderId,
        text,
      });

      io.to(conversationId).emit("newMessage", message);

      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessageAlert", {
          _id: message._id,
          conversationId,
          senderId,
          text,
          createdAt: message.createdAt,
        });
      }

      io.emit("conversation:updated", {
        conversationId,
        senderId,
        receiverId,
        text,
        createdAt: message.createdAt,
      });
    } catch (err) {
      console.error("Send message error:", err);
    }
  });

  socket.on("typing", ({ conversationId, senderId }) => {
    if (!conversationId) return;

    socket.to(conversationId).emit("typing", {
      conversationId,
      senderId,
    });
  });

  socket.on("stopTyping", ({ conversationId, senderId }) => {
    if (!conversationId) return;

    socket.to(conversationId).emit("stopTyping", {
      conversationId,
      senderId,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });
});
app.set("trust proxy", 1);

connectDb();

app.use(cors({ origin: "http://localhost:3001", credentials: true }));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'Il}/mav@hCn*CK!>""Zx=6?%p&oLgz<y',
    resave: false,
    saveUninitialized: false,
    store: sessionCollection(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    cookie: {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: false,
      httpOnly: true,
    },
  }),
);

app.use("/products", auth, require("./routes/products"));
app.use("/orders", auth, require("./routes/orders"));
app.use("/carts", auth, require("./routes/carts"));
app.use("/categories", auth, require("./routes/categories"));
app.use("/reviews", auth, require("./routes/reviews"));
app.use("/password", auth, require("./routes/users"));
app.use("/auth", require("./routes/auth"));
app.use("/user", auth, require("./routes/users"));
app.use("/notification", auth, require("./routes/notification"));
app.use("/upload", auth, require("./routes/uploadFile"));
app.use("/wallet", auth, require("./routes/wallet"));
app.use("/transaction", auth, require("./routes/transaction"));
app.use("/profile", auth, require("./routes/profile"));
app.use("/chat", auth, require("./routes/chat"));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
