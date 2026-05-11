'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { brandPartners } from '@/lib/utils';

export default function BrandPartners() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

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
            <span className="gradient-text">Trusted Brands</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            We partner with world-class brands to bring you the best products.
          </p>
        </motion.div>

        <div className="relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="flex"
          >
            <motion.div
              animate={{
                x: [0, -1920],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex gap-16 md:gap-24 items-center shrink-0"
            >
              {[...brandPartners, ...brandPartners].map((brand, index) => (
                <div
                  key={`${brand.id}-${index}`}
                  className="flex items-center justify-center h-16 md:h-20 w-32 md:w-40 grayscale hover:grayscale-0 transition-all duration-300 hover:scale-110"
                >
                  <img
                    src={brand.image}
                    alt={brand.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
