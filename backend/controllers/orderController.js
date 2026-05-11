const Order = require('../models/Order');
const Product = require('../models/Product');

const createOrder = async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;
  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({ message: 'No order items' });
  }
  const itemsFromDB = await Product.find({ _id: { $in: orderItems.map(item => item.product) } });
  const itemsPrice = orderItems.reduce((acc, item) => {
    const dbItem = itemsFromDB.find(p => p._id.toString() === item.product);
    return acc + (dbItem ? dbItem.price * item.quantity : 0);
  }, 0);
  const shippingPrice = itemsPrice > 100 ? 0 : 10;
  const taxPrice = Math.round(itemsPrice * 0.15 * 100) / 100;
  const totalPrice = itemsPrice + shippingPrice + taxPrice;
  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  });
  res.status(201).json(order);
};

const getUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
};

const getAllOrders = async (req, res) => {
  const orders = await Order.find({}).populate('user', 'id name');
  res.json(orders);
};

const updateOrderToDelivered = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'Delivered';
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
};

const updateOrderToPaid = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
};

module.exports = { createOrder, getUserOrders, getAllOrders, updateOrderToDelivered, updateOrderToPaid };
