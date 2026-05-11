"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Menu,
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={20} />, active: true },
  { label: "Products", icon: <Package size={20} /> },
  { label: "Orders", icon: <ShoppingCart size={20} /> },
  { label: "Customers", icon: <Users size={20} /> },
  { label: "Analytics", icon: <BarChart3 size={20} /> },
  { label: "Settings", icon: <SettingsIcon size={20} /> },
];

const statsCards = [
  { icon: <DollarSign size={24} />, value: "$124,592", label: "Total Revenue", change: "+12.5%", up: true, gradient: "from-indigo-500 to-purple-600" },
  { icon: <ShoppingCart size={24} />, value: "2,345", label: "Orders", change: "+8.2%", up: true, gradient: "from-pink-500 to-rose-600" },
  { icon: <Package size={24} />, value: "1,287", label: "Products", change: "-3.1%", up: false, gradient: "from-amber-500 to-orange-600" },
  { icon: <Users size={24} />, value: "8,934", label: "Customers", change: "+18.7%", up: true, gradient: "from-emerald-500 to-teal-600" },
];

const monthlySales = [32, 45, 28, 62, 48, 75, 53, 68, 82, 57, 71, 90];

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const recentOrders = [
  { id: "#ORD-001", customer: "Alice Johnson", product: "Wireless Headphones", status: "Delivered", total: "$89.99" },
  { id: "#ORD-002", customer: "Bob Smith", product: "Smartwatch Pro", status: "Shipped", total: "$249.00" },
  { id: "#ORD-003", customer: "Carol White", product: "Bluetooth Speaker", status: "Pending", total: "$59.99" },
  { id: "#ORD-004", customer: "David Lee", product: "USB-C Hub", status: "Shipped", total: "$34.99" },
  { id: "#ORD-005", customer: "Eve Davis", product: "Mechanical Keyboard", status: "Delivered", total: "$129.99" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "Delivered": return "bg-emerald-100 text-emerald-700";
    case "Shipped": return "bg-blue-100 text-blue-700";
    case "Pending": return "bg-amber-100 text-amber-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateTime] = useState(new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
            <span className="text-lg font-bold text-gray-900">ShopPro Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? "gradient-bg text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all">
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </nav>
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors">
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-gray-500">{dateTime}</span>
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {statsCards.map((card) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 border border-gray-200 card-hover"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-md`}>
                    {card.icon}
                  </div>
                  <span className={`flex items-center gap-1 text-sm font-medium ${card.up ? "text-emerald-600" : "text-red-500"}`}>
                    {card.up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {card.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Sales Overview</h3>
              <div className="flex items-end gap-2 md:gap-3 h-48">
                {monthlySales.map((value, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${value}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 transition-colors cursor-pointer"
                      style={{ maxHeight: "100%" }}
                    />
                    <span className="text-[10px] text-gray-400 hidden sm:block">{monthLabels[index]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Conversion Rate</span>
                    <span className="font-medium text-gray-900">3.24%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-full w-[32%] rounded-full gradient-bg" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Avg. Order Value</span>
                    <span className="font-medium text-gray-900">$78.50</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-full w-[65%] rounded-full gradient-bg-secondary" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Return Rate</span>
                    <span className="font-medium text-gray-900">2.1%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-full w-[21%] rounded-full bg-amber-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Product</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{order.customer}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">{order.product}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{order.total}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
