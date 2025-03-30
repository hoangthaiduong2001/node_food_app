const CartModel = require("../model/cart.model");

const getCart = async (req, res) => {
  try {
    let cart;

    cart = await CartModel.find()
      .populate("products.product", "title price discount")
      .populate("user", "username");

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const formattedCarts = cart.map((data) => ({
      _id: data._id,
      username: data.user?.username || "",
      products:
        data.products?.map((item) => ({
          productName: item.product?.title || "Unknown Product",
          quantity: item.quantity,
          totalPrice:
            ((item.product?.price || 0) - (item.product?.discount || 0)) *
            item.quantity,
        })) || [],
    }));
    res
      .status(200)
      .json({ message: "Get all cart successfully", data: formattedCarts });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCartByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cart = await CartModel.findOne({ user: userId })
      .populate("products.product", "title price discount") // Populate product details
      .populate("user", "username"); // Populate user details

    if (!cart) {
      return res.status(404).json({ message: "Cart not found for this user" });
    }

    // Format response
    const formattedCart = {
      _id: cart._id,
      username: cart.user?.username || "Guest",
      products: cart.products.map((item) => ({
        productName: item.product?.title || "Unknown Product",
        quantity: item.quantity,
        totalPrice:
          (item.product.price - item.product.discount) * item.quantity,
      })),
    };

    res
      .status(200)
      .json({ message: "Cart retrieved successfully", data: formattedCart });
  } catch (error) {
    console.error("Error fetching cart by user ID:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

const addCart = async (req, res) => {
  try {
    const { user, products } = req.body;
    let cart = await CartModel.findOne({ user });

    if (cart) {
      products.forEach((newItem) => {
        const existingProduct = cart.products.find(
          (item) => item.product.toString() === newItem.product
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
      const newCart = new CartModel({ user, products });
      await newCart.save();

      res
        .status(201)
        .json({ message: "New cart created successfully", cart: newCart });
    }
  } catch (error) {
    console.error("Error creating/updating cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateCart = async (req, res) => {
  try {
    const idCart = req.session.cart;
    const { product, quantity } = req.body;

    if (!idCart) {
      return res.status(400).json({ error: "No active cart session" });
    }

    let cart = await CartModel.findById(idCart);

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const existingProduct = cart.products.find(
      (item) => item.product.toString() === product
    );

    existingProduct.quantity = quantity;
    await cart.save();

    res.status(200).json({
      message: "Cart updated successfully",
      data: cart,
      count: cart.products.length,
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteItemFromCart = async (req, res) => {
  try {
    const cartId = req.session.cart;
    const productId = req.query.productId;
    if (!cartId || !productId) {
      return res
        .status(400)
        .json({ message: "Cart ID or Product ID is missing" });
    }

    let cart = await CartModel.findById(cartId);

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find product in cart
    const productIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Remove the product from cart
    cart.products.splice(productIndex, 1);

    // If cart is empty after removal, delete the cart
    if (cart.products.length === 0) {
      await CartModel.findByIdAndDelete(cartId);
      req.session.cart = null; // Clear session
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

module.exports = {
  getCartByUserId,
  addCart,
  updateCart,
  getCart,
  deleteItemFromCart,
};
