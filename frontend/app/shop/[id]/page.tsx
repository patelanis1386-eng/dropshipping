'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, ShoppingCart, Zap, Truck, RotateCcw, Clock, Star, ChevronLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { products, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const product = products.find(p => p.id === Number(params.id));
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [imgPos, setImgPos] = useState({ x: 50, y: 50 });
  const [zoomed, setZoomed] = useState(false);

  if (!product) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Product Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">The product you are looking for does not exist or has been removed.</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Shop
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const galleryImages = [
    product.image,
    product.image.replace('w=500', 'w=500&fit=crop&crop=left'),
    product.image.replace('w=500', 'w=500&fit=crop&crop=right'),
    product.image,
  ];

  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating - fullStars >= 0.5;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setImgPos({ x, y });
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: product.name, price: product.discountPrice, image: product.image });
    }
  };

  const handleBuyNow = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: product.name, price: product.discountPrice, image: product.image });
    }
    router.push('/cart');
  };

  const specs = [
    'Premium quality materials',
    'Designed for durability and longevity',
    'Lightweight and comfortable',
    'Water-resistant construction',
    'Easy maintenance and cleaning',
    'Eco-friendly packaging',
  ];

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container-width px-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
            <span>/</span>
            <Link href={`/shop?category=${product.category}`} className="hover:text-primary transition-colors">{product.category}</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
            <div>
              <div
                className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 mb-4 cursor-crosshair"
                onMouseEnter={() => setZoomed(true)}
                onMouseLeave={() => setZoomed(false)}
                onMouseMove={handleMouseMove}
              >
                <motion.img
                  src={galleryImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-[400px] md:h-[500px] object-cover"
                  style={{
                    transform: zoomed ? 'scale(2)' : 'scale(1)',
                    transformOrigin: `${imgPos.x}% ${imgPos.y}%`,
                  }}
                  transition={{ duration: 0.2 }}
                />
                {product.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === i
                        ? 'border-primary shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img src={img} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < fullStars
                          ? 'fill-yellow-400 text-yellow-400'
                          : i === fullStars && hasHalf
                            ? 'fill-yellow-400/50 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(product.discountPrice)}
                </span>
                {product.price > product.discountPrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">{formatPrice(product.price)}</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      {Math.round((1 - product.discountPrice / product.price) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Premium quality product with latest design. Perfect for everyday use. Features include durable construction, elegant design, and comfortable fit.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Specifications</h3>
                <ul className="space-y-2">
                  {specs.map((spec, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-6 py-3 font-semibold text-gray-900 dark:text-white min-w-[60px] text-center border-x border-gray-200 dark:border-gray-700">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {product.stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={!product.stock}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBuyNow}
                  disabled={!product.stock}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-5 h-5" />
                  Buy Now
                </motion.button>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <Truck className="w-5 h-5 text-primary shrink-0" />
                  <span>Free shipping on orders over $50</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <RotateCcw className="w-5 h-5 text-primary shrink-0" />
                  <span>30-day return policy</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <span>2-3 business days delivery</span>
                </div>
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You May Also Like</h2>
                <Link
                  href="/shop"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((rp, i) => (
                  <motion.div
                    key={rp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                  >
                    <ProductCard product={rp} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
