export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const categories = [
  { id: 1, name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80' },
  { id: 2, name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80' },
  { id: 3, name: 'Home & Living', image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80' },
  { id: 4, name: 'Beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80' },
  { id: 5, name: 'Sports', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
  { id: 6, name: 'Accessories', image: 'https://images.unsplash.com/photo-1603400521630-9f2de124b33b?w=400&q=80' },
];

export const products = [
  { id: 1, name: 'Wireless Noise-Cancelling Headphones', price: 299.99, discountPrice: 199.99, rating: 4.8, reviews: 2456, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', category: 'Electronics', stock: true, badge: 'Hot' },
  { id: 2, name: 'Premium Smart Watch Pro', price: 399.99, discountPrice: 299.99, rating: 4.7, reviews: 1892, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80', category: 'Electronics', stock: true, badge: 'Sale' },
  { id: 3, name: 'Designer Leather Handbag', price: 249.99, discountPrice: 149.99, rating: 4.9, reviews: 3210, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80', category: 'Fashion', stock: true, badge: 'Popular' },
  { id: 4, name: 'Minimalist Running Shoes', price: 179.99, discountPrice: 129.99, rating: 4.6, reviews: 1547, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', category: 'Sports', stock: true, badge: 'New' },
  { id: 5, name: 'Smart Home Speaker System', price: 199.99, discountPrice: 149.99, rating: 4.5, reviews: 987, image: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=500&q=80', category: 'Electronics', stock: true, badge: '' },
  { id: 6, name: 'Organic Skincare Collection', price: 89.99, discountPrice: 59.99, rating: 4.8, reviews: 2103, image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b8ccb0?w=500&q=80', category: 'Beauty', stock: true, badge: 'Trending' },
  { id: 7, name: 'Premium Yoga Mat', price: 79.99, discountPrice: 49.99, rating: 4.7, reviews: 876, image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80', category: 'Sports', stock: true, badge: '' },
  { id: 8, name: 'Wireless Earbuds Pro', price: 159.99, discountPrice: 99.99, rating: 4.6, reviews: 3456, image: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=500&q=80', category: 'Electronics', stock: true, badge: 'Bestseller' },
  { id: 9, name: 'Casual Denim Jacket', price: 129.99, discountPrice: 89.99, rating: 4.5, reviews: 1234, image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80', category: 'Fashion', stock: true, badge: '' },
  { id: 10, name: 'Portable Bluetooth Speaker', price: 69.99, discountPrice: 49.99, rating: 4.4, reviews: 2345, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80', category: 'Electronics', stock: true, badge: 'Sale' },
  { id: 11, name: 'Luxury Scented Candle Set', price: 49.99, discountPrice: 34.99, rating: 4.9, reviews: 4567, image: 'https://images.unsplash.com/photo-1602523961358-f9f03b2c84e6?w=500&q=80', category: 'Home & Living', stock: true, badge: 'Popular' },
  { id: 12, name: 'Fitness Tracker Band', price: 99.99, discountPrice: 69.99, rating: 4.3, reviews: 789, image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500&q=80', category: 'Sports', stock: false, badge: '' },
];

export const reviews = [
  { id: 1, name: 'Sarah Johnson', text: 'Absolutely love the quality! Fast shipping and amazing customer service. Will definitely buy again.', rating: 5, avatar: 'https://i.pravatar.cc/100?img=1' },
  { id: 2, name: 'Michael Chen', text: 'The best online shopping experience I have ever had. Products exceeded my expectations!', rating: 5, avatar: 'https://i.pravatar.cc/100?img=2' },
  { id: 3, name: 'Emily Rodriguez', text: 'Great prices and premium quality. The headphones are incredible for the price point.', rating: 4, avatar: 'https://i.pravatar.cc/100?img=3' },
  { id: 4, name: 'David Kim', text: 'Fast delivery and the product was exactly as described. Highly recommended!', rating: 5, avatar: 'https://i.pravatar.cc/100?img=4' },
  { id: 5, name: 'Lisa Thompson', text: 'I was skeptical at first but the quality blew me away. My new favorite store!', rating: 5, avatar: 'https://i.pravatar.cc/100?img=5' },
];

export const brandPartners = [
  { id: 1, name: 'Nike', image: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg' },
  { id: 2, name: 'Adidas', image: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg' },
  { id: 3, name: 'Apple', image: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { id: 4, name: 'Samsung', image: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
  { id: 5, name: 'Sony', image: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
  { id: 6, name: 'LG', image: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/LG_logo.svg' },
];
