const walletController = require("../controllers/wallet.controller");

const router = require("express").Router();

router.post("/", walletController.createWallet);

router.post("/topup", walletController.topUpWallet);

router.post("/refund", walletController.refundWallet);

router.post("/payment", walletController.paymentWithWallet);

router.get("/balance/:userId", walletController.getWalletBalance);

module.exports = router;
