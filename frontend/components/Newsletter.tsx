'use client';
import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Mail, Send } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert('Subscribed successfully!');
      setEmail('');
    }
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden gradient-bg-secondary py-16 md:py-24">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/10"
        />
        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white/10"
        />
        <motion.div
          animate={{ x: [0, 30, 0], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-white/10"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        className="container-width px-4 relative z-10 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-6">
          <Mail className="w-4 h-4" />
          Newsletter
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Stay in the Loop
        </h2>
        <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto mb-8">
          Subscribe to get exclusive deals, new arrivals, and insider-only discounts straight to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
          <div className="relative flex-1 w-full">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-white/40 transition-all"
            />
          </div>
          <button
            type="submit"
            className="btn-primary bg-white text-primary hover:bg-white/90 px-8 py-3.5 shrink-0"
          >
            Subscribe
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </section>
  );
}
