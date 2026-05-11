'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

function getTimeLeft(endDate: Date) {
  const diff = endDate.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function OfferBanner() {
  const endDate = useRef(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endDate.current));
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(endDate.current));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden gradient-bg py-16 md:py-24">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        className="container-width px-4 relative z-10 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-6">
          <Clock className="w-4 h-4" />
          Limited Time Offer
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
          Summer Sale - Up to 50% Off!
        </h2>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Don&apos;t miss out on amazing deals on premium products. Shop now and save big!
        </p>

        <div className="flex items-center justify-center gap-4 md:gap-6 mb-10">
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Minutes', value: timeLeft.minutes },
            { label: 'Seconds', value: timeLeft.seconds },
          ].map((unit) => (
            <div key={unit.label} className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-2">
                <span className="text-2xl md:text-3xl font-bold text-white">
                  {String(unit.value).padStart(2, '0')}
                </span>
              </div>
              <span className="text-white/70 text-xs md:text-sm font-medium">{unit.label}</span>
            </div>
          ))}
        </div>

        <Link href="/shop" className="btn-primary text-lg px-10 py-4 bg-white text-primary hover:bg-white/90 inline-flex">
          Shop the Sale
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </section>
  );
}
