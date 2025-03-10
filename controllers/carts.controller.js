const CartModel = require("../model/cart.model");

const getCart = async (req, res) => {
  if (await req?.session?.cart) {
    const cart = req.session.cart;

    const Cart = await CartModel.findById(cart).populate("products.product");
    const count = await CartModel.find({ _id: cart }).count();
    res.status(200).json({ cart: Cart, count: count });
  } else if ((await req.session?.user) && (await !req.session?.cart)) {
    let Cart = await CartModel.find({ user: req.session?.user }).populate(
      "products.product"
    );
    if (!Cart.length) {
      data = { user: req.session?.user };
      Cart = await new CartModel(data).save();
    }
    req.session.cart = Cart._id;
    res.status(200).json(Cart);
  } else if ((await !req?.session?.user) && (await !req?.session?.cart)) {
    const data = {};
    const Cart = await new CartModel(data).save();

    if (Cart) {
      req.session.cart = Cart._id;
      res.status(200).json(Cart);
    }
  } else res.status(400).json("error");
};

const addCart = async (req, res) => {
  const cart = new CartModel(req.body);
  try {
    const newCart = await cart.save();
    req.session.cart = newCart._id;
    res.status(200).json({ message: "Create a new cart successfully" });
  } catch (error) {}
};

const updateCart = async (req, res) => {
  const idCart = req.session.cart;
  const { product, quantity } = req.body;
  try {
    const cart = await CartModel.findOneAndUpdate(
      { _id: idCart },
      { $push: { products: { product, quantity } } },
      { new: true }
    ).exec();
    res.status(200).json({ cart: cart, count: cart?.products.length });
  } catch (error) {
    res.status(400).json(error);
  }
};

const deleteItemFromCart = async (req, res) => {
  const cartId = req.session.cart;
  const productsId = req.query.productsId;
  if (!cartId || !productsId) {
    return res
      .status(400)
      .json({ message: "Cart ID or Product ID is missing" });
  }
  try {
    const updatedCart = await CartModel.findOneAndUpdate(
      { _id: cartId },
      { $pull: { products: { _id: productsId } } },
      { new: true }
    ).exec();

    if (!updatedCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({
      message: "Item deleted from cart successfully",
      updatedCart,
    });
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

module.exports = { addCart, updateCart, getCart, deleteItemFromCart };
