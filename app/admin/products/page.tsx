"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Plus,
  X,
  Image as ImageIcon,
  Loader,
  Trash2,
  Menu,
} from "lucide-react";
import { products as staticProducts, formatPrice, truncate } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import AdminRoute from "@/components/AdminRoute";

interface Product {
  id: number;
  name: string;
  price: number;
  discountPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  stock: boolean;
  badge: string;
}

const categories = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Beauty",
  "Sports",
  "Accessories",
];

const navLinks = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} />, active: false },
  { label: "Products", href: "/admin/products", icon: <Package size={20} />, active: true },
  { label: "Orders", href: "/admin/orders", icon: <ShoppingCart size={20} />, active: false },
  { label: "Customers", href: "/admin/customers", icon: <Users size={20} />, active: false },
];

export default function AdminProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [productList, setProductList] = useState<Product[]>(staticProducts);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    category: "Electronics",
    price: "",
    discountPrice: "",
    description: "",
    stock: true,
  });

  const resetForm = () => {
    setForm({
      name: "",
      category: "Electronics",
      price: "",
      discountPrice: "",
      description: "",
      stock: true,
    });
    setUploadedUrl("");
    setUploading(false);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    const data = new FormData();
    data.append("image", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const json = await res.json();
      if (json.url) setUploadedUrl(json.url);
    } catch {
      console.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleSave = () => {
    if (!form.name || !form.price || !uploadedUrl) return;
    const newProduct: Product = {
      id: Date.now(),
      name: form.name,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : undefined,
      rating: 0,
      reviews: 0,
      image: uploadedUrl,
      category: form.category,
      stock: form.stock,
      badge: "",
    };
    setProductList((prev) => [newProduct, ...prev]);
    closeModal();
  };

  const handleDelete = (id: number) => {
    setProductList((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <AdminRoute>
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
            <span className="text-lg font-bold text-gray-900">ShopPro Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                link.active
                  ? "gradient-bg text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {link.icon}
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Products</h1>
            </div>
            <button
              onClick={openModal}
              className="btn-primary text-sm py-2 px-4"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Category
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productList.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px]">
                        {truncate(product.name, 40)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {product.discountPrice
                          ? formatPrice(product.discountPrice)
                          : formatPrice(product.price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                        {product.category}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-sm">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              product.stock ? "bg-emerald-500" : "bg-red-400"
                            }`}
                          />
                          {product.stock ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-premium-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Add Product</h2>
                  <button
                    onClick={closeModal}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Enter product name"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Discount Price <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.discountPrice}
                        onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Enter product description"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Stock Status
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, stock: true })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.stock ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            form.stock ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-sm text-gray-600">
                        {form.stock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Image Upload
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        dragOver
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader size={32} className="text-primary animate-spin" />
                          <span className="text-sm text-gray-500">Uploading...</span>
                        </div>
                      ) : uploadedUrl ? (
                        <div className="relative inline-block">
                          <img
                            src={uploadedUrl}
                            alt="Preview"
                            className="max-h-40 rounded-lg object-cover mx-auto"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); setUploadedUrl(""); }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <ImageIcon size={24} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Drop image here or click to browse
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Supports: JPG, PNG, WebP
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={!form.name || !form.price || !uploadedUrl || uploading}
                    className="w-full btn-primary justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                  >
                    Save Product
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </AdminRoute>
  );
}
