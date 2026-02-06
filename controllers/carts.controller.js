const CartModel = require("../model/cart.model");
const mongoose = require("mongoose");

const getCart = async (req, res) => {
  try {
    let cart;

    cart = await CartModel.find()
      .populate("products.product", "_id title price discount img")
      .populate("user", "_id username");

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const formattedCarts = cart.map((data) => ({
      _id: data._id,
      username: data.user?.username || "",
      userId: data.user._id,
      cart:
        data.products?.map((item) => ({
          productId: item.product._id,
          productName: item.product?.title || "Unknown Product",
          quantity: item.quantity,
          img: item.product.img || "img",
          totalPrice:
            ((item.product?.price || 0) - (item.product?.discount || 0)) *
            item.quantity,
        })) || [],
    }));
    res
      .status(200)
      .json({ message: "Get all cart successfully", data: formattedCarts });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCartByCartId = async (req, res) => {
  try {
    const cartId = req.params.cartId;

    if (!cartId) {
      return res.status(400).json({ message: "Cart ID is required" });
    }

    const cart = await CartModel.findById(cartId)
      .populate("products.product", "title price discount img")
      .populate("user", "username");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const formattedCart = {
      _id: cart._id,
      username: cart.user?.username || "Guest",
      cart: cart.products.map((item) => ({
        productName: item.product?.title || "Unknown Product",
        quantity: item.quantity,
        img: item.product?.img || "img",
        totalPrice:
          (item.product.price - item.product.discount) * item.quantity,
      })),
    };

    res.status(200).json({
      message: "Cart retrieved successfully",
      data: formattedCart,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

const getCartByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await CartModel.findOne({ user: userId })
      .populate("user", "username")
      .populate("products.product", "title price discount img")
      .lean();

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found for this user",
      });
    }

    const formattedCart = {
      _id: cart._id,
      userId: cart.user?._id,
      username: cart.user?.username || "Guest",
      products: cart.products.map((item) => {
        const price = item.product
          ? item.product.price - (item.product.discount || 0)
          : 0;

        return {
          productId: item.product?._id,
          productName: item.product?.title || "Unknown Product",
          quantity: item.quantity,
          img: item.product?.img || "",
          unitPrice: price,
          totalPrice: price * item.quantity,
        };
      }),
    };

    res.status(200).json({
      message: "Get cart successfully",
      data: formattedCart,
    });
  } catch (error) {
    console.error("Error fetching cart by userId:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const addCart = async (req, res) => {
  try {
    const { userId, products } = req.body;
    let cart = await CartModel.findOne({ user: userId });
    if (cart) {
      products.forEach((newItem) => {
        const existingProduct = cart.products.find(
          (item) => item.product.toString() === newItem.product,
        );

        if (existingProduct) {
          existingProduct.quantity += newItem.quantity;
        } else {
          cart.products.push(newItem);
        }
      });

      await cart.save();
      res
        .status(200)
        .json({ message: "Cart updated successfully", data: cart });
    } else {
      const newCart = new CartModel({ user: userId, products });
      await newCart.save();

      res
        .status(201)
        .json({ message: "New cart created successfully", cart: newCart });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateCart = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found for this user" });
    }

    const existingProduct = cart.products.find(
      (item) => item.product.toString() === productId,
    );
    existingProduct.quantity = quantity;
    await cart.save();
    res.status(200).json({
      message: "Cart updated successfully",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteForUser = async (req, res) => {
  try {
    const { userId } = req.query;
    const { productId } = req.query;

    if (!userId || !productId) {
      return res
        .status(400)
        .json({ message: "User ID or Product ID is missing" });
    }

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found for this user" });
    }

    const productIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.products.splice(productIndex, 1);

    if (cart.products.length === 0) {
      await CartModel.deleteOne({ user: userId }); // Delete cart if empty
      return res.status(200).json({ message: "Cart deleted as it was empty" });
    }

    await cart.save();

    res.status(200).json({
      message: "Item deleted from cart successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

const deleteForAdmin = async (req, res) => {
  try {
    const cartId = req.params.cartId;
    const deletedCart = await CartModel.findByIdAndDelete(cartId);

    if (!deletedCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({
      message: "Cart deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

module.exports = {
  getCartByUserId,
  addCart,
  updateCart,
  getCart,
  deleteForUser,
  deleteForAdmin,
};
