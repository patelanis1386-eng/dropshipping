import Link from 'next/link';
import { Mail, MapPin, Phone, CreditCard, Globe, MessageCircle, Camera, Play } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-width px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link href="/" className="text-2xl font-bold mb-4 block">
              <span className="gradient-text">Shop</span>
              <span className="text-white">Pro</span>
            </Link>
            <p className="text-gray-400 mb-6">
              Your premium destination for quality products at unbeatable prices. Shop with confidence.
            </p>
            <div className="flex gap-4">
              {[Globe, MessageCircle, Camera, Play].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
            <div className="flex flex-col gap-3">
              {['Home', 'Shop', 'Categories', 'About Us', 'Contact', 'FAQ'].map((link) => (
                <Link key={link} href="#" className="text-gray-400 hover:text-white transition-colors">
                  {link}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">Customer Service</h3>
            <div className="flex flex-col gap-3">
              {['Shipping Info', 'Returns & Exchanges', 'Size Guide', 'Privacy Policy', 'Terms of Service', 'Track Order'].map((link) => (
                <Link key={link} href="#" className="text-gray-400 hover:text-white transition-colors">
                  {link}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">Contact Info</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1 shrink-0" />
                <span className="text-gray-400">123 Commerce St, New York, NY 10001</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span className="text-gray-400">support@shoppro.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span className="text-gray-400">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary shrink-0" />
                <span className="text-gray-400">Secure Payments</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© 2026 ShopPro. All rights reserved.</p>
          <div className="flex gap-3">
            {['Visa', 'Mastercard', 'PayPal', 'Amex'].map((brand) => (
              <span key={brand} className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-400">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
