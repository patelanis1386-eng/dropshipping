'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Heart, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { products, formatPrice } from '@/lib/utils';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<number[]>([]);
  const { addItem } = useCartStore();

  useEffect(() => {
    const stored = localStorage.getItem('wishlist');
    if (stored) {
      try {
        setWishlist(JSON.parse(stored));
      } catch {
        setWishlist([]);
      }
    }
  }, []);

  const updateWishlist = (newWishlist: number[]) => {
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
  };

  const removeFromWishlist = (id: number) => {
    updateWishlist(wishlist.filter((itemId) => itemId !== id));
  };

  const moveToCart = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      addItem({ id: product.id, name: product.name, price: product.discountPrice, image: product.image });
      removeFromWishlist(id);
    }
  };

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 bg-gray-50 dark:bg-gray-950">
        <div className="container-width px-4">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/shop"
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 dark:text-white"
          >
            My Wishlist
          </motion.h1>

          {wishlistProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Heart className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-6" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Your wishlist is empty
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Save your favorite items here
              </p>
              <Link href="/shop" className="btn-primary">
                Explore Products
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {wishlistProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden group"
                  >
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={() => removeFromWishlist(product.id)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
                        {product.name}
                      </h3>
                      <p className="text-sm font-bold text-primary mb-3">
                        {formatPrice(product.discountPrice)}
                      </p>
                      <button
                        onClick={() => moveToCart(product.id)}
                        className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Move to Cart
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
