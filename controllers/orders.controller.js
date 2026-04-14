const OrderModel = require("../model/order.model");
const NotificationModel = require("../model/notification.model");
const UserModel = require("../model/user.model");
const CartModel = require("../model/cart.model");
const WalletModel = require("../model/wallet.model");
const TransactionModel = require("../model/transaction.model");
const createNotification = require("../utils/notification");

const addNewOrder = async (req, res) => {
  try {
    const {
      userId,
      products,
      address,
      phone,
      name,
      paymentMethod,
      description,
      shippingFee,
    } = req.body;

    if (!userId || !products?.length || !address || !phone || !name) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const user = await UserModel.findById(userId).select("username");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const order = new OrderModel({
      userId,
      products,
      address,
      phone,
      name,
      paymentMethod,
      description,
      shippingFee,
      status: "waiting",
      payment: paymentMethod === "cod" ? "unpaid" : "paid",
    });

    const newOrder = await order.save();

    const notification = await NotificationModel.create({
      userId,
      title: "Order placed successfully",
      message: `Your order #${newOrder._id} has been created`,
      type: "order",
      data: {
        orderId: newOrder._id,
      },
    });

    const io = req.app.get("io");

    io.to(userId.toString()).emit("notification", notification);

    io.emit("admin:newOrder", {
      orderId: newOrder._id,
      userId,
    });

    return res.status(201).json({
      message: "Added a new Order successfully!",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("Add order error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getOrderByUserId = async (req, res) => {
  const userId = req.params.userId;
  const { status } = req.query;
  try {
    const query = { userId };

    if (status) {
      const validStatus = ["waiting", "received", "cancelled"];

      if (!validStatus.includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      query.status = status;
    }

    const orders = await OrderModel.find(query)
      .select("status total name paymentMethod address createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = orders.map((order) => ({
      id: order._id.toString(),
      deliveryStatus: order.status,
      address: order.address,
      paymentMethod: order.paymentMethod,
      totalPrice: order.total,
      name: order.name,
    }));

    res.status(200).json({
      message: "Get orders by user successfully",
      data: formatted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOrderDetail = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await OrderModel.findById(orderId)
      .populate("user", "username email")
      .populate("products.productId", "title price img discount")
      .lean();

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const formatted = {
      id: order._id.toString(),
      name: order.name,
      phone: order.phone,
      address: order.address,
      deliveryStatus: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.payment,
      description: order.description,
      shippingFee: order.shippingFee,
      totalPrice: order.total,

      products: order.products.map((item) => ({
        id: item.productId?._id,
        title: item.productId?.title,
        price: item.productId?.price,
        discount: item.productId?.discount,
        img: item.productId?.img,
        quantity: item.quantity,
      })),

      user: order.user
        ? {
            username: order.user.username,
            email: order.user.email,
          }
        : null,

      createdAt: order.createdAt,
    };

    return res.status(200).json({
      message: "Get order detail successfully",
      data: formatted,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
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
  const { deliveryStatus } = req.body;

  try {
    const order = await OrderModel.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (["received", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        message: "Order already finalized",
      });
    }

    if (!["received", "cancelled"].includes(deliveryStatus)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    if (order.status === deliveryStatus) {
      return res.status(400).json({
        message: "Order already has this status",
      });
    }

    const io = req.app.get("io");

    if (
      deliveryStatus === "cancelled" &&
      order.paymentMethod === "wallet" &&
      order.payment === "paid"
    ) {
      const wallet = await WalletModel.findOne({ userId: order.userId });

      if (!wallet) {
        return res.status(404).json({
          message: "Wallet not found",
        });
      }

      const refundAmount = Number(order.total);

      wallet.balance += refundAmount;
      await wallet.save();

      await TransactionModel.create({
        userId: order.userId,
        walletId: wallet._id,
        type: "refund",
        amount: refundAmount,
        status: "success",
        description: `Refund order ${order._id}`,
        orderId: order._id,
      });

      await createNotification({
        userId: order.userId,
        title: "Refund successful",
        message: `You have been refunded ${refundAmount.toLocaleString()}đ`,
        type: "wallet",
        data: {
          orderId: order._id,
          amount: refundAmount,
        },
        io,
      });
    }

    order.status = deliveryStatus;

    if (deliveryStatus === "received" && order.paymentMethod === "cod") {
      order.payment = "paid";
    }

    await order.save();

    await createNotification({
      userId: order.userId,
      title:
        deliveryStatus === "received" ? "Order delivered" : "Order cancelled",
      message:
        deliveryStatus === "received"
          ? `Your order ${order._id} has been delivered`
          : `Your order ${order._id} has been cancelled`,
      type: "order",
      data: {
        orderId: order._id,
      },
      io,
    });

    if (deliveryStatus === "received") {
      const cart = await CartModel.findOne({ userId: order.userId });

      if (cart) {
        order.products.forEach((orderItem) => {
          const cartItem = cart.products.find(
            (item) =>
              item.product.toString() === orderItem.productId.toString(),
          );

          if (cartItem) {
            cartItem.quantity -= orderItem.quantity;

            if (cartItem.quantity <= 0) {
              cart.products = cart.products.filter(
                (item) =>
                  item.product.toString() !== orderItem.productId.toString(),
              );
            }
          }
        });

        await cart.save();
      }
    }

    return res.status(200).json({
      message: "Update order status successfully",
    });
  } catch (error) {
    console.error("Update order error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const paymentOrderCod = async (req, res) => {
  const id = req.params.id;

  try {
    const order = await OrderModel.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentMethod !== "cod") {
      return res.status(400).json({
        message: "This API is only for COD payment",
      });
    }

    if (order.payment === "paid") {
      return res.status(403).json({
        message: "Order has already been paid",
      });
    }

    if (order.status !== "received") {
      return res.status(400).json({
        message: "Cannot complete payment before receiving order",
      });
    }

    order.payment = "paid";
    await order.save();

    res.status(200).json({
      message: "COD payment completed successfully",
      data: order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

const orderAgain = async (req, res) => {
  try {
    const { userId, products } = req.body;

    if (!userId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Missing userId or products",
      });
    }

    for (const item of products) {
      if (!item.productId || item.quantity <= 0) {
        return res.status(400).json({
          message: "Invalid productId or quantity",
        });
      }
    }

    let cart = await CartModel.findOne({ user: userId });

    if (cart) {
      products.forEach((p) => {
        const existingProduct = cart.products.find(
          (item) => item.product.toString() === p.productId,
        );

        if (existingProduct) {
          existingProduct.quantity += p.quantity;
        } else {
          cart.products.push({
            product: p.productId,
            quantity: p.quantity,
          });
        }
      });

      await cart.save();

      return res.status(200).json({
        message: "Cart updated successfully",
        data: cart,
      });
    }

    const newCart = new CartModel({
      user: userId,
      products: products.map((p) => ({
        product: p.productId,
        quantity: p.quantity,
      })),
    });

    await newCart.save();

    return res.status(201).json({
      message: "New cart created successfully",
      data: newCart,
    });
  } catch (error) {
    console.error("Order again error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  addNewOrder,
  getOrderByUserId,
  getOrders,
  getOrderDetail,
  deleteOrder,
  updateOrder,
  updateOrderStatus,
  paymentOrderCod,
  orderAgain,
};
