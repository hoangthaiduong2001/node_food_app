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

const PORT = process.env.PORT || 3500;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set("io", io);
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
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

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
