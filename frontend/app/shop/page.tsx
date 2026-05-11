'use client';
import { useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { products, formatPrice, categories } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';

export default function ShopPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('best-selling');
  const [sortOpen, setSortOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const brands = ['Nike', 'Adidas', 'Apple', 'Samsung'];
  const ratingOptions = [4, 3, 2, 1];

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const toggleBrand = (name: string) => {
    setSelectedBrands(prev =>
      prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
    );
  };

  const clearAll = () => {
    setSelectedCategories([]);
    setMinPrice(0);
    setMaxPrice(500);
    setRatingFilter(null);
    setSelectedBrands([]);
    setSearchQuery('');
  };

  const sortOptions = [
    { value: 'best-selling', label: 'Best Selling' },
    { value: 'price-low', label: 'Price Low-High' },
    { value: 'price-high', label: 'Price High-Low' },
    { value: 'new-arrivals', label: 'New Arrivals' },
  ];

  const hasActiveFilters = selectedCategories.length > 0 || minPrice > 0 || maxPrice < 500 || ratingFilter !== null || selectedBrands.length > 0 || searchQuery;

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(p => selectedCategories.includes(p.category));
    }

    result = result.filter(p => p.discountPrice >= minPrice && p.discountPrice <= maxPrice);

    if (ratingFilter !== null) {
      result = result.filter(p => p.rating >= ratingFilter);
    }

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.discountPrice - b.discountPrice);
        break;
      case 'price-high':
        result.sort((a, b) => b.discountPrice - a.discountPrice);
        break;
      case 'new-arrivals':
        result.sort((a, b) => b.id - a.id);
        break;
      case 'best-selling':
        result.sort((a, b) => b.reviews - a.reviews);
        break;
    }

    return result;
  }, [selectedCategories, minPrice, maxPrice, ratingFilter, selectedBrands, sortBy, searchQuery]);

  const selectedSortLabel = sortOptions.find(o => o.value === sortBy)?.label || 'Best Selling';

  const FilterSidebar = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h3>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-sm text-primary hover:underline font-medium">
            Clear All
          </button>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Category</h4>
        <div className="space-y-2">
          {categories.map(cat => (
            <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.name)}
                onChange={() => toggleCategory(cat.name)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Price Range</h4>
        <div className="px-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatPrice(minPrice)}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatPrice(maxPrice)}</span>
          </div>
          <div className="relative h-2">
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div
              className="absolute h-full bg-primary rounded-full"
              style={{ left: `${(minPrice / 500) * 100}%`, right: `${100 - (maxPrice / 500) * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={minPrice}
              onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 10))}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
            />
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 10))}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Rating</h4>
        <div className="space-y-2">
          {ratingOptions.map(stars => (
            <label key={stars} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={ratingFilter === stars}
                onChange={() => setRatingFilter(ratingFilter === stars ? null : stars)}
                className="w-4 h-4 border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {stars}+ Stars
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Brand</h4>
        <div className="space-y-2">
          {brands.map(brand => (
            <label key={brand} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container-width px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shop</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-48 text-gray-900 dark:text-white"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  {selectedSortLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden"
                    >
                      {sortOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            sortBy === opt.value
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-8">
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-28 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <FilterSidebar />
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                    Try adjusting your search or filter criteria
                  </p>
                  <button
                    onClick={clearAll}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product, i) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 z-50 shadow-2xl lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
                <FilterSidebar />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
