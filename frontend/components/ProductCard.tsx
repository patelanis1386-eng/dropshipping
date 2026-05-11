'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Eye } from 'lucide-react';
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

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const renderStars = () => {
    const full = Math.floor(product.rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < full ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      );
    }
    return stars;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl dark:shadow-gray-800/50 transition-all duration-300"
    >
      <div className="relative overflow-hidden">
        <motion.img
          src={product.image}
          alt={product.name}
          className="w-full h-64 object-cover"
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.5 }}
        />
        {product.badge && (
          <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
            {product.badge}
          </span>
        )}
        {!product.stock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">Out of Stock</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsWishlisted(!isWishlisted)}
            className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <Heart
              className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-300'}`}
            />
          </motion.button>
          {onQuickView && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onQuickView(product)}
              className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:shadow-md transition-shadow"
            >
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </motion.button>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{product.category}</p>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">{product.name}</h3>

        <div className="flex items-center gap-1 mb-2">
          {renderStars()}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({product.reviews})</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatPrice(product.discountPrice)}
          </span>
          {product.price > product.discountPrice && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>
          )}
        </div>

        {product.stock && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-3">In Stock</p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => addItem({ id: product.id, name: product.name, price: product.discountPrice, image: product.image })}
          disabled={!product.stock}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </motion.button>
      </div>
    </motion.div>
  );
}
