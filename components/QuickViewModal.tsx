'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Star, Minus, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

interface Product {
  id: number;
  name: string;
  price: number;
  discountPrice: number;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  stock: boolean;
  badge: string;
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  if (!product) return null;

  const renderStars = () => {
    const full = Math.floor(product.rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i < full ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      );
    }
    return stars;
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: product.name, price: product.discountPrice, image: product.image });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:shadow-md transition-shadow"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative h-80 md:h-auto">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {product.category}
                </p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {product.name}
                </h2>

                <div className="flex items-center gap-1 mb-4">
                  {renderStars()}
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(product.discountPrice)}
                  </span>
                  {product.price > product.discountPrice && (
                    <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                  )}
                </div>

                {product.stock ? (
                  <p className="text-sm text-green-600 dark:text-green-400 mb-4">In Stock</p>
                ) : (
                  <p className="text-sm text-red-500 mb-4">Out of Stock</p>
                )}

                {product.stock && (
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </motion.button>
                      <span className="w-10 text-center font-semibold text-gray-900 dark:text-white">
                        {quantity}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </motion.button>
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={!product.stock}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart — {formatPrice(product.discountPrice * quantity)}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
