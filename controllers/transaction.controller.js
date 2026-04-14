const TransactionModel = require("../model/transaction.model");
const WalletModel = require("../model/wallet.model");

const getRecentTransactions = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await WalletModel.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    const transactions = await TransactionModel.find({
      walletId: wallet._id,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      message: "Get recent transactions success",
      data: transactions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = 5 } = req.query;

    const wallet = await WalletModel.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const query = {
      walletId: wallet._id,
    };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const transactions = await TransactionModel.find(query)
      .sort({ _id: -1 })
      .limit(Number(limit));

    const formatted = transactions.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      amount: item.amount,
      status: item.status,
      description: item.description,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const nextCursor =
      transactions.length > 0
        ? transactions[transactions.length - 1]._id.toString()
        : null;

    return res.json({
      message: "Get transaction history success",
      data: formatted,
      nextCursor,
      hasMore: transactions.length === Number(limit),
    });
  } catch (err) {
    console.error("Transaction history error:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getRecentTransactions,
  getTransactionHistory,
};
