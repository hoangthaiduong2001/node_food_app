const OrderModel = require("../model/order.model");

const addNewOrder = async (req, res) => {
  const Order = new OrderModel(req.body);
  try {
    const newOrder = await Order.save();
    res
      .status(200)
      .json({ message: "Added a new Order successfully!", data: newOrder });
  } catch (error) {
    console.log("error", error);
    res.status(400).json(error);
  }
};

const getOrder = async (req, res) => {
  const id = req.params.id;
  try {
    const order = await OrderModel.findById(id)
      .populate("customer", "username")
      .populate("products.product", "title price img")
      .exec();
    res.status(200).json({ message: "Get order successfully", data: order });
  } catch (error) {
    console.log("error", error);
    res.status(400).json(error);
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
      .populate("customer", "username address")
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
    await OrderModel.findOneAndUpdate({ _id: id }, { $set: req.body }).exec();
    res.status(200).json({ message: "Update order successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};

const paymentOrder = async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  try {
    await OrderModel.findOneAndUpdate(
      { _id: id },
      {
        $set: data,
      }
    ).exec();
    res.status(200).json({ message: "Payment successfully" });
  } catch (error) {
    console.log("error", error);
    res.status(400).json(error);
  }
};

module.exports = {
  addNewOrder,
  getOrder,
  getOrders,
  deleteOrder,
  updateOrder,
  paymentOrder,
};
