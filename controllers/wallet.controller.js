const WalletModel = require("../model/wallet.model");
const mongoose = require("mongoose");
const TransactionModel = require("../model/transaction.model");
const NotificationModel = require("../model/notification.model");
const OrderModel = require("../model/order.model");
const bcrypt = require("bcrypt");
const createNotification = require("../utils/notification");

const isValidPin = (pin) => /^\d{6}$/.test(pin);

const getWalletBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "Missing userId",
      });
    }

    const wallet = await WalletModel.findOne({ userId }).select("balance");

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    return res.status(200).json({
      message: "Get wallet balance successfully",
      data: {
        balance: wallet.balance,
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const createWallet = async (req, res) => {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      return res.status(400).json({
        message: "Missing userId or pin",
      });
    }

    if (!isValidPin(pin)) {
      return res.status(400).json({
        message: "PIN must be 6 digits",
      });
    }

    const existingWallet = await WalletModel.findOne({ userId });

    if (existingWallet) {
      return res.status(200).json({
        message: "Wallet already exists",
      });
    }

    await WalletModel.create({
      userId,
      pin,
    });

    return res.status(201).json({
      message: "Create wallet success",
    });
  } catch (error) {
    console.error("Create wallet error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const topUpWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amount, pin } = req.body;

    if (!userId || !amount || !pin) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const wallet = await WalletModel.findOne({ userId }).session(session);

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const isMatch = await bcrypt.compare(pin, wallet.pin);

    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const transaction = await TransactionModel.create(
      [
        {
          userId,
          walletId: wallet._id,
          type: "topup",
          amount,
          status: "pending",
          description: `Top up ${amount} VND`,
        },
      ],
      { session },
    );

    wallet.balance += amount;
    await wallet.save({ session });

    transaction[0].status = "success";
    await transaction[0].save({ session });

    const notification = await NotificationModel.create(
      [
        {
          userId,
          title: "Top-up successful 💰",
          message: `You added ${amount.toLocaleString()} VND to your wallet`,
          type: "wallet",
          data: {
            amount,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const io = req.app.get("io");
    io.to(userId.toString()).emit("notification", notification[0]);

    return res.json({
      message: "Top up success",
      data: {
        balance: wallet.balance,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);

    return res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
};

const refundWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({
        message: "Missing orderId or userId",
      });
    }

    const order = await OrderModel.findById(orderId).session(session);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentMethod !== "wallet") {
      return res.status(400).json({
        message: "Only wallet payment can be refunded",
      });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        message: "Order not paid yet",
      });
    }

    const existedRefund = await TransactionModel.findOne({
      orderId,
      type: "refund",
      status: "success",
    }).session(session);

    if (existedRefund) {
      return res.status(400).json({
        message: "Order already refunded",
      });
    }

    const wallet = await WalletModel.findOne({ userId }).session(session);

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    const refundAmount = order.totalPrice;

    const transaction = await TransactionModel.create(
      [
        {
          walletId: wallet._id,
          type: "refund",
          amount: refundAmount,
          status: "pending",
          orderId,
          description: "Refund for cancelled order",
        },
      ],
      { session },
    );

    wallet.balance += refundAmount;
    await wallet.save({ session });

    transaction[0].status = "success";
    await transaction[0].save({ session });

    await session.commitTransaction();

    return res.json({
      message: "Refund success",
      data: {
        balance: wallet.balance,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);

    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    session.endSession();
  }
};

const paymentWithWallet = async (req, res) => {
  try {
    const { userId, pin, payload } = req.body;

    if (!userId || !pin || !payload) {
      return res.status(400).json({
        message: "Missing fields",
      });
    }

    const wallet = await WalletModel.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    const isMatch = await bcrypt.compare(pin, wallet.pin);
    if (!isMatch) {
      return res.status(400).json({
        message: "Wrong password",
      });
    }

    const { products, shippingFee = 0 } = payload;

    if (!products || products.length === 0) {
      return res.status(400).json({
        message: "No products",
      });
    }

    let totalPrice = 0;

    for (const item of products) {
      const product = await mongoose
        .model("ProductModel")
        .findById(item.productId);

      if (!product) continue;

      totalPrice += (product.price - product.discount) * item.quantity;
    }

    const totalAmount = totalPrice + shippingFee;

    if (wallet.balance < totalAmount) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    const order = await OrderModel.create({
      ...payload,
      userId,
      total: totalAmount,
      payment: "paid",
      paymentMethod: "wallet",
    });

    wallet.balance -= totalAmount;
    await wallet.save();

    await TransactionModel.create({
      userId,
      walletId: wallet._id,
      type: "payment",
      amount: totalAmount,
      status: "success",
      description: `Pay order ${order._id}`,
      orderId: order._id,
    });

    const io = req.app.get("io");

    await createNotification({
      userId,
      title: "Payment successful",
      message: `You paid ${totalAmount.toLocaleString()}đ for your order`,
      type: "wallet",
      data: {
        orderId: order._id,
        amount: totalAmount,
      },
      io,
    });

    return res.status(200).json({
      message: "Payment success",
      data: {
        orderId: order._id,
        balance: wallet.balance,
      },
    });
  } catch (error) {
    console.error("Payment error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getWalletBalance,
  createWallet,
  topUpWallet,
  refundWallet,
  paymentWithWallet,
};
