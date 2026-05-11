const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, getAllOrders, updateOrderToDelivered, updateOrderToPaid } = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.get('/admin', protect, admin, getAllOrders);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
router.put('/:id/pay', protect, updateOrderToPaid);

module.exports = router;
