'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Shield, ShoppingBag, ArrowLeft, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Toast from '@/components/Toast';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const subtotal = getTotal();
  const shipping = items.length > 0 ? 5.99 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Required';
    if (!formData.email.trim()) newErrors.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone.trim()) newErrors.phone = 'Required';
    if (!formData.address.trim()) newErrors.address = 'Required';
    if (!formData.city.trim()) newErrors.city = 'Required';
    if (!formData.state.trim()) newErrors.state = 'Required';
    if (!formData.zip.trim()) newErrors.zip = 'Required';
    if (!formData.country) newErrors.country = 'Required';

    if (paymentMethod === 'credit-card') {
      if (!cardNumber.trim()) newErrors.cardNumber = 'Required';
      else if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) newErrors.cardNumber = 'Invalid card number';
      if (!expiryDate.trim()) newErrors.expiryDate = 'Required';
      else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) newErrors.expiryDate = 'MM/YY';
      if (!cvv.trim()) newErrors.cvv = 'Required';
      else if (!/^\d{3,4}$/.test(cvv)) newErrors.cvv = 'Invalid CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
    setToast({ visible: true, message: 'Order placed successfully!', type: 'success' });
    clearCart();
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  if (items.length === 0 && !submitted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="container-width px-4">
            <div className="flex flex-col items-center justify-center py-20">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <ShoppingBag className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-6" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Your cart is empty
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Add some items before checking out
              </p>
              <Link href="/shop" className="btn-primary">
                Go Shopping
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="container-width px-4">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/cart"
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </Link>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 dark:text-white">
            Checkout
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Shipping Address
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.address ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.city ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        State / Province
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.state ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.zip ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Country
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                          errors.country ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Payment Method
                  </h2>

                  <div className="space-y-3">
                    {[
                      { value: 'credit-card', label: 'Credit Card' },
                      { value: 'paypal', label: 'PayPal' },
                      { value: 'stripe', label: 'Stripe' },
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          paymentMethod === method.value
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={method.value}
                          checked={paymentMethod === method.value}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4 text-primary accent-primary"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {method.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  <AnimatePresence>
                    {paymentMethod === 'credit-card' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Card Number
                          </label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                              errors.cardNumber ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Expiry Date
                            </label>
                            <input
                              type="text"
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(e.target.value)}
                              placeholder="MM/YY"
                              maxLength={5}
                              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                                errors.expiryDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              CVV
                            </label>
                            <input
                              type="text"
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value)}
                              placeholder="123"
                              maxLength={4}
                              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all ${
                                errors.cvv ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                              }`}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-4 gradient-bg text-white rounded-2xl text-lg font-bold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  Place Order - {formatPrice(total)}
                </motion.button>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sticky top-28">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Order Summary
                  </h2>

                  <div className="space-y-4 mb-6">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Shipping</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(shipping)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Tax (8%)</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(tax)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                      <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
                      <span className="text-base font-bold text-primary">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Shield className="w-4 h-4 text-green-500" />
                      Secure checkout with SSL encryption
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}
