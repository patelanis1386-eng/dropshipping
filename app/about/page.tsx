'use client';
import { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, useInView } from 'framer-motion';
import { Package, Users, Globe, Award } from 'lucide-react';

const stats = [
  { icon: Award, value: 5, suffix: '+', label: 'Years in Business' },
  { icon: Users, value: 50, suffix: 'K+', label: 'Happy Customers' },
  { icon: Package, value: 10, suffix: 'K+', label: 'Products' },
  { icon: Globe, value: 100, suffix: '+', label: 'Countries' },
];

const team = [
  { name: 'Sarah Johnson', role: 'CEO & Founder', img: 'https://i.pravatar.cc/200?img=1' },
  { name: 'Michael Chen', role: 'CTO', img: 'https://i.pravatar.cc/200?img=2' },
  { name: 'Emily Rodriguez', role: 'Head of Design', img: 'https://i.pravatar.cc/200?img=3' },
  { name: 'David Kim', role: 'Marketing Director', img: 'https://i.pravatar.cc/200?img=4' },
];

const features = [
  { title: 'Fast Shipping', desc: 'Free worldwide shipping on all orders. Delivery within 3-5 business days.', icon: Package },
  { title: 'Quality Products', desc: 'Every product is carefully selected and quality checked before reaching you.', icon: Award },
  { title: '24/7 Support', desc: 'Our dedicated support team is available around the clock to help you.', icon: Users },
];

function Counter({ target, suffix, isCounting }: { target: number; suffix: string; isCounting: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isCounting) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, isCounting]);

  return <>{count}{suffix}</>;
}

function CounterCard({ stat }: { stat: typeof stats[0] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = stat.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="text-center p-6"
    >
      <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
        <Counter target={stat.value} suffix={stat.suffix} isCounting={isInView} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <section className="relative py-24 md:py-32 gradient-bg overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="container-width px-4 relative z-10 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              About ShopPro
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto"
            >
              Our mission is to provide premium products at unbeatable prices with an exceptional shopping experience.
            </motion.p>
          </div>
        </section>

        <section className="section-padding bg-white dark:bg-gray-900">
          <div className="container-width px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Our Story
                </h2>
                <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                  <p>
                    Founded in 2020, ShopPro started with a simple vision: make premium products accessible to everyone. What began as a small online store has grown into a global marketplace serving customers across 100+ countries.
                  </p>
                  <p>
                    We partner with top manufacturers and brands to bring you the best products at competitive prices. Our team of experts carefully curates every item to ensure it meets our high standards of quality and design.
                  </p>
                  <p>
                    From electronics to fashion, home living to beauty, we offer a diverse range of products that cater to every lifestyle. Customer satisfaction is at the heart of everything we do.
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80"
                    alt="Our team at work"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 gradient-bg rounded-2xl -z-10" />
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-secondary rounded-2xl -z-10 opacity-60" />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="section-padding bg-gray-50 dark:bg-gray-950">
          <div className="container-width px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <CounterCard key={stat.label} stat={stat} />
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding bg-white dark:bg-gray-900">
          <div className="container-width px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Meet Our Team
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                Passionate people dedicated to bringing you the best shopping experience
              </p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="w-48 h-48 rounded-2xl overflow-hidden mx-auto mb-4 ring-2 ring-gray-100 dark:ring-gray-700 ring-offset-4 ring-offset-white dark:ring-offset-gray-900 transition-transform group-hover:scale-105">
                    <img
                      src={member.img}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding bg-gray-50 dark:bg-gray-950">
          <div className="container-width px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose Us
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                We go above and beyond to ensure your satisfaction
              </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm card-hover"
                  >
                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
