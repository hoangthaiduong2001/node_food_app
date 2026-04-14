const transactionController = require("../controllers/transaction.controller");

const router = require("express").Router();

router.get("/recent/:userId", transactionController.getRecentTransactions);

router.get("/history/:userId", transactionController.getTransactionHistory);

module.exports = router;
