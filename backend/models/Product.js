const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  discountPrice: { type: Number, default: 0 },
  images: [{ type: String }],
  category: { type: String, required: true },
  brand: { type: String, default: '' },
  stock: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  reviews: [reviewSchema],
  specifications: { type: Map, of: String, default: {} },
  countInStock: { type: Number, required: true, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
