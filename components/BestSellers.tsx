'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShoppingCart, Star } from 'lucide-react';
import { products, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

const badgeColors: Record<string, string> = {
  Bestseller: 'bg-yellow-500',
  Hot: 'bg-red-500',
  Sale: 'bg-green-500',
  Popular: 'bg-purple-500',
  New: 'bg-blue-500',
  Trending: 'bg-pink-500',
};

export default function BestSellers() {
  const addItem = useCartStore((s) => s.addItem);
  const bestSellers = products.slice(0, 4);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="section-padding bg-gray-50">
      <div className="container-width">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Best Sellers</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Our most popular products loved by customers worldwide.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="group bg-white rounded-2xl overflow-hidden shadow-premium hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-2"
            >
              <div className="relative overflow-hidden aspect-square">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {product.badge && (
                  <span
                    className={`absolute top-3 left-3 px-3 py-1.5 text-white text-xs font-bold rounded-full ${
                      badgeColors[product.badge] || 'bg-primary'
                    }`}
                  >
                    {product.badge === 'Bestseller' && '⭐ '}
                    {product.badge === 'Hot' && '🔥 '}
                    {product.badge === 'Sale' && '🏷️ '}
                    {product.badge === 'Popular' && '👍 '}
                    {product.badge === 'New' && '✨ '}
                    {product.badge === 'Trending' && '📈 '}
                    {product.badge}
                  </span>
                )}
                {product.discountPrice < product.price && (
                  <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    -{Math.round((1 - product.discountPrice / product.price) * 100)}%
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">({product.reviews})</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(product.discountPrice)}
                  </span>
                  {product.price !== product.discountPrice && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() =>
                    addItem({
                      id: product.id,
                      name: product.name,
                      price: product.discountPrice,
                      image: product.image,
                    })
                  }
                  disabled={!product.stock}
                  className="w-full btn-primary justify-center text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
