'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import TrendingProducts from '@/components/TrendingProducts';
import CategoriesSection from '@/components/CategoriesSection';
import BestSellers from '@/components/BestSellers';
import Testimonials from '@/components/Testimonials';
import OfferBanner from '@/components/OfferBanner';
import Newsletter from '@/components/Newsletter';
import BrandPartners from '@/components/BrandPartners';
import LoadingScreen from '@/components/LoadingScreen';
import ScrollToTop from '@/components/ScrollToTop';

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <BrandPartners />
        <CategoriesSection />
        <TrendingProducts />
        <BestSellers />
        <OfferBanner />
        <Testimonials />
        <Newsletter />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
