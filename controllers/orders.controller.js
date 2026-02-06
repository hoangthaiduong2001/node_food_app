const OrderModel = require("../model/order.model");
const NotificationModel = require("../model/notification.model");
const UserModel = require("../model/user.model");

const addNewOrder = async (req, res) => {
  const Order = new OrderModel(req.body);
  try {
    const user = await UserModel.findById(req.body.userId).select("username");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const notification = new NotificationModel({
      username: user.username,
      order: Order._id,
      status: "unread",
    });

    const newOrder = await Order.save();
    await notification.save();

    const io = req.app.get("io");
    const listNotification = await NotificationModel.find();
    io.emit("newOrder", listNotification);

    res.status(200).json({
      message: "Added a new Order successfully!",
      data: newOrder,
    });
  } catch (error) {
    console.log("error", error);
    res.status(400).json(error);
  }
};

const getOrderByUserId = async (req, res) => {
  const userId = req.params.userId;
  try {
    const orders = await OrderModel.find({ userId })
      .populate("user", "username email")
      .populate("products.product", "title price img")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Get orders by user successfully",
      data: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOrders = async (req, res) => {
  const search = req.query.search;
  const start = req.query.start ?? 1;
  const end = req.query.count ?? 10;
  const filter = {};
  req.session.isAuth = true;
  if (search) filter = { title: search };
  try {
    const orders = await OrderModel.find(filter)
      .populate("user", "username address")
      .populate("products.product", "title price discount img")
      .skip(parseInt(start) - 1)
      .limit(parseInt(end))
      .exec();
    const count = await OrderModel.find(filter).count();
    res.status(200).json({ data: orders, count });
  } catch (error) {
    console.log("error", error);
    res.status(400).json(error);
  }
};

const deleteOrder = async (req, res) => {
  const id = req.params.id;
  try {
    await OrderModel.deleteOne({ _id: id });
    res.status(200).json({ message: "Delete order successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};

const updateOrder = async (req, res) => {
  const id = req.params.id;

  try {
    const order = await OrderModel.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.payment === "paid") {
      return res.status(403).json({
        message: "Order has already been paid and cannot be updated",
      });
    }

    if (order.status !== "waiting") {
      return res.status(403).json({
        message: "Only orders with status 'waiting' can be updated",
      });
    }

    if ("status" in req.body || "payment" in req.body) {
      return res.status(400).json({
        message: "Status and payment cannot be updated via this API",
      });
    }

    const allowedFields = ["products", "date"];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    await OrderModel.findByIdAndUpdate(id, { $set: updateData });

    res.status(200).json({
      message: "Update order successfully",
    });
  } catch (error) {
    res.status(400).json(error);
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.payment === "paid") {
      return res.status(403).json({
        message: "Cannot update status of a paid order",
      });
    }

    if (!["waiting", "received", "cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    if (order.status === status) {
      return res.status(400).json({
        message: "Order already has this status",
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      message: "Update order status successfully",
      data: order,
    });
  } catch (error) {
    res.status(400).json(error);
  }
};

const paymentOrder = async (req, res) => {
  const id = req.params.id;
  const { payment } = req.body;

  try {
    const order = await OrderModel.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.payment === "paid") {
      return res.status(403).json({
        message: "Order has already been paid",
      });
    }

    if (payment !== "paid") {
      return res.status(400).json({
        message: "Invalid payment update",
      });
    }

    order.payment = "paid";
    await order.save();

    res.status(200).json({
      message: "Payment successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};

module.exports = {
  addNewOrder,
  getOrderByUserId,
  getOrders,
  deleteOrder,
  updateOrder,
  updateOrderStatus,
  paymentOrder,
};
