import { useState, useEffect, Fragment } from "react"
import { auth, db, getProducts, getProductById, addProduct, updateProduct, deleteProduct, getOrders, createOrder, updateOrder, updateOrderStatus, getReviews, addReview, subscribeNewsletter, getCategories, getUsers, getNewsletterSubscribers, getBanner, updateBanner, getProductCategories, addProductCategory, deleteProductCategory, getNextOrderNumber, getOrderByOrderNumber, updateOrderTracking, deleteOrder, getSavedAddress, saveUserAddress, getShippingSettings, updateShippingSettings, getUserCart, saveUserCart, getUserWishlist, saveUserWishlist, saveUserOrders, getUserOrders } from "../firebase"
import { fmt, disc } from "../data"
import { readLocalProducts, writeLocalProducts, mergeProducts } from "../helpers"
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore"

function AdminPage({ products, setProducts, orders, setOrders, shipping, setShipping, banner, setBanner, productCategories, setProductCategories, adminTab, setAdminTab, nav, showToast, cart, setCart, wishlist, setWishlist }) {
  const tabs = ["dashboard", "products", "orders", "checkouts", "categories", "customers", "analytics"]
  const [showForm, setShowForm] = useState(false)
  const [editProd, setEditProd] = useState(null)
  const [form, setForm] = useState({ name: "", category: (productCategories?.[0] || "electronics"), price: "", original: "", stock: "", desc: "", img: "", badge: "New Arrival" })
  const [customers, setCustomers] = useState([])
  const [subs, setSubs] = useState([])
  const [catInput, setCatInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [productError, setProductError] = useState("")
  const [trackModalOrder, setTrackModalOrder] = useState(null)
  const [trackForm, setTrackForm] = useState({ trackingNumber: "", carrier: "", estimatedDelivery: "", steps: [] })
  const [orderSearch, setOrderSearch] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState("all")
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [expandedCustomer, setExpandedCustomer] = useState(null)

  useEffect(() => {
    if (adminTab === "customers") { getUsers().then(setCustomers).catch(() => {}); getNewsletterSubscribers().then(setSubs).catch(() => {}) }
  }, [adminTab])

  const openForm = (p) => {
    setEditProd(p)
    setForm(p ? { name: p.name, category: p.category, price: String(p.price), original: String(p.original), stock: String(p.stock), desc: p.desc, img: p.img, badge: p.badge } : { name: "", category: "electronics", price: "", original: "", stock: "", desc: "", img: "", badge: "New Arrival" })
    setProductError("")
    setShowForm(true)
  }

  const save = async () => {
    if (savingProduct) return
    if (!form.name.trim()) return setProductError("Product name is required.")
    if (!form.price || Number.isNaN(Number(form.price)) || Number(form.price) <= 0) return setProductError("Enter a valid product price.")
    setSavingProduct(true)
    setProductError("")
    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        original: Number(form.original) || Number(form.price),
        stock: Number(form.stock) || 0,
        desc: form.desc,
        img: form.img || "https://images.unsplash.com/photo-1505740420928-5e560c06d30a?w=600&q=80",
        badge: form.badge,
        rating: editProd?.rating || 4.8,
        reviews: editProd?.reviews || 0,
        shipping: editProd?.shipping || "Free Shipping",
      }
      if (editProd) {
        await updateProduct(editProd.id, data)
        setProducts(prev => prev.map(p => p.id === editProd.id ? { ...p, ...data } : p))
      } else {
        const localProduct = { id: "local-" + Date.now(), ...data, localOnly: true }
        const localProducts = [localProduct, ...readLocalProducts()]
        writeLocalProducts(localProducts)
        setProducts(prev => mergeProducts([localProduct], prev))
        setShowForm(false)
        setProductError("")
        showToast("Product added. Firebase sync will continue in the background.", "info")
        addProduct(data).then((id) => {
          writeLocalProducts(readLocalProducts().filter(p => p.id !== localProduct.id))
          setProducts(prev => prev.map(p => p.id === localProduct.id ? { id, ...data } : p))
        }).catch((e) => {
          const msg = e.code === "permission-denied"
            ? "Firestore save failed: Permission denied."
            : "Firestore save failed: " + (e.message || "Unknown error.")
          setProductError(msg)
          showToast(msg, "error")
        })
        return
      }
      setShowForm(false)
      setProductError("")
    } catch (e) {
      const msg = e.code === "permission-denied" || e.code === "auth/permission-denied" ? "Firestore refused this save." :
                  e.message?.includes("timed out") ? e.message :
                  e.message || "Product could not be saved."
      setProductError(msg)
    } finally {
      setSavingProduct(false)
    }
  }

  const del = async (id) => {
    if (!confirm("Delete this product? It will be removed from all users' carts and wishlists.")) return
    writeLocalProducts(readLocalProducts().filter(p => p.id !== id))
    setProducts(prev => prev.filter(p => p.id !== id))
    if (!id?.startsWith("local-")) {
      try {
        await deleteProduct(id)
        const users = await getUsers()
        await Promise.all(users.map(async (u) => {
          const updates = []
          if (u.cart?.some(i => i.id === id)) {
            updates.push(saveUserCart(u.id, u.cart.filter(i => i.id !== id)))
          }
          if (u.wishlist?.some(i => i.id === id)) {
            updates.push(saveUserWishlist(u.id, u.wishlist.filter(i => i.id !== id)))
          }
          return Promise.all(updates)
        }))
        showToast("Product deleted from all users")
      } catch (e) {
        console.error("Delete cleanup error:", e)
        showToast("Product deleted, but some user caches may remain", "info")
      }
    }
  }

  const uploadImg = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
      const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd })
      const d = await r.json(); setForm(p => ({ ...p, img: d.secure_url }))
    } catch (_) { alert("Upload failed.") }
    setUploading(false)
  }

  const ordTotal = orders.reduce((s, o) => s + (typeof o.total === "number" ? o.total : 0), 0)
  const ordCount = orders.length
  const aov = ordCount > 0 ? ordTotal / ordCount : 0
  const catCounts = {}
  products.forEach(p => { const c = p.category || "uncategorized"; catCounts[c] = (catCounts[c] || 0) + 1 })
  const productSales = {}
  orders.forEach(o => (o.items || []).forEach(i => { const key = i.id || i.name; productSales[key] = productSales[key] || { name: i.name, qty: 0, revenue: 0, img: i.img || "" }; productSales[key].qty += i.qty || 1; productSales[key].revenue += (i.price || 0) * (i.qty || 1) }))
  const bestSellers = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10)
  const catRevenue = {}
  orders.forEach(o => (o.items || []).forEach(i => { const prod = products.find(p => p.id === i.id); const c = prod?.category || "uncategorized"; catRevenue[c] = (catRevenue[c] || 0) + (i.price || 0) * (i.qty || 1) }))
  const customerData = {}
  orders.forEach(o => { const email = o.email || "guest"; if (!customerData[email]) customerData[email] = { name: o.customerName || "Guest", email, phone: o.phone || "", address: o.address || "", orders: [], totalSpent: 0 }; customerData[email].orders.push(o); customerData[email].totalSpent += o.total || 0 })
  const customerList = Object.values(customerData).sort((a, b) => b.totalSpent - a.totalSpent)
  const repeatCustomers = customerList.filter(c => c.orders.length > 1)
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false
    if (orderSearch) { const s = orderSearch.toLowerCase(); return (o.orderNumber || "").toLowerCase().includes(s) || (o.customerName || "").toLowerCase().includes(s) || (o.email || "").toLowerCase().includes(s) || (o.phone || "").includes(s) }
    return true
  })

  const STATUS_COLORS = { Pending: "#f59e0b", Confirmed: "#3b82f6", Processing: "#8b5cf6", Shipped: "#06b6d4", Delivered: "#10b981", Cancelled: "#ef4444" }
  const ALL_STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"]

  const updateStatus = async (o, newStatus) => {
    try { await updateOrderStatus(o.id, newStatus); if (o.userId && o.userId !== "guest") { try { const uo = await getUserOrders(o.userId); if (uo) { const upd = uo.map(x => x.id === o.id ? { ...x, status: newStatus } : x); await saveUserOrders(o.userId, upd) } } catch (_) {} }; setOrders(prev => prev.map(order => order.id === o.id ? { ...order, status: newStatus } : order)); showToast("Status updated to " + newStatus) } catch (e) { showToast("Failed to update status", "info") }
  }

  const handleDeleteOrder = async (o) => {
    if (!confirm(`Delete order ${o.orderNumber || o.id?.slice(0, 8)} from admin?`)) return
    try {
      await deleteOrder(o.id)
      setOrders(prev => prev.filter(order => order.id !== o.id))
      showToast("Order removed from admin")
    } catch (e) {
      showToast("Failed to delete order", "info")
    }
  }

  const handleDeleteCustomerOrders = async (customerEmail) => {
    if (!confirm(`Remove all orders for ${customerEmail} from admin?`)) return
    const customerOrders = orders.filter(o => o.email === customerEmail)
    try {
      await Promise.all(customerOrders.map(o => deleteOrder(o.id)))
      setOrders(prev => prev.filter(o => o.email !== customerEmail))
      showToast(`Removed ${customerOrders.length} order(s) for ${customerEmail}`)
    } catch (e) {
      showToast("Failed to remove customer orders", "info")
    }
  }

  const handleSaveTracking = async () => {
    const o = trackModalOrder
    try {
      const steps = trackForm.steps; const shipped = steps.find(s => s.label === "Shipped")?.done; const delivered = steps.find(s => s.label === "Delivered")?.done; const newStatus = delivered ? "Delivered" : shipped ? "Shipped" : o.status
      await updateOrderTracking(o.id, { trackingNumber: trackForm.trackingNumber, carrier: trackForm.carrier, estimatedDelivery: trackForm.estimatedDelivery, trackingSteps: steps })
      await updateOrderStatus(o.id, newStatus)
      const uid = o.userId
      if (uid && uid !== "guest") { try { const uo = await getUserOrders(uid); if (uo) { const upd = uo.map(x => x.id === o.id ? { ...x, trackingNumber: trackForm.trackingNumber, carrier: trackForm.carrier, estimatedDelivery: trackForm.estimatedDelivery, trackingSteps: steps, status: newStatus } : x); await saveUserOrders(uid, upd) } } catch (_) {} }
      setOrders(prev => prev.map(order => order.id === o.id ? { ...order, trackingNumber: trackForm.trackingNumber, carrier: trackForm.carrier, estimatedDelivery: trackForm.estimatedDelivery, trackingSteps: steps, status: newStatus } : order))
      showToast("Tracking updated!"); setTrackModalOrder(null)
    } catch (e) { showToast("Failed to save tracking", "info") }
  }

  const T = (l) => ({ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 1, color: "#767676", textAlign: "left", padding: "14px 16px" })
  const SIDEBAR_ICONS = { dashboard: "\u2302", products: "\u2606", orders: "\u2637", checkouts: "\u2705", categories: "\u2630", customers: "\u266B", analytics: "\u2191" }

  return (
    <>
    <div style={{ display: "flex", minHeight: "100vh" }} className="admin-page">
      <aside className="admin-sidebar" style={{ width: 220, background: "#1a1a1a", color: "#fff", padding: "28px 0", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div className="hide-mobile" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, padding: "0 24px 28px", borderBottom: "1px solid #2a2a2a", marginBottom: 12 }}>LUXEDROP</div>
        {tabs.map(t => (
          <div key={t} onClick={() => setAdminTab(t)} style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer", background: adminTab === t ? "rgba(139,102,68,0.15)" : "transparent", color: adminTab === t ? "#8b6644" : "#aaa", fontWeight: adminTab === t ? 700 : 400, display: "flex", alignItems: "center", gap: 10, borderRight: adminTab === t ? "3px solid #8b6644" : "3px solid transparent" }}>
            <span className="sidebar-icon" style={{ fontSize: 16 }}>{SIDEBAR_ICONS[t]}</span>
            <span className="sidebar-label" style={{ textTransform: "capitalize" }}>{t}</span>
            {t === "orders" && orders.length > 0 && <span style={{ marginLeft: "auto", background: "#8b6644", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{orders.length}</span>}
          </div>
        ))}
        <div className="hide-mobile" onClick={() => nav("home")} style={{ padding: "13px 24px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#aaa", cursor: "pointer", marginTop: 20 }}>&#x2190; Back to Store</div>
      </aside>
      <main style={{ flex: 1, padding: 32, background: "#f8f5f0", overflowY: "auto", minHeight: "100vh" }}>

        {adminTab === "dashboard" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600 }}>Dashboard</h2>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <div className="admin-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Revenue", value: fmt(ordTotal), change: ordCount + " orders", icon: "\uD83D\uDCC8", color: "#10b981" },
                { label: "Orders", value: ordCount, change: ordCount > 0 ? "AOV " + fmt(aov) : "No orders yet", icon: "\uD83D\uDCCB", color: "#3b82f6" },
                { label: "Products", value: products.length, change: Object.keys(catCounts).length + " categories", icon: "\uD83D\uDCE6", color: "#8b5cf6" },
                { label: "Customers", value: customerList.length, change: repeatCustomers.length + " returning", icon: "\uD83D\uDC65", color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div><div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", letterSpacing: 1 }}>{s.label.toUpperCase()}</div><div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{s.value}</div></div>
                    <div style={{ fontSize: 28 }}>{s.icon}</div>
                  </div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: s.color, fontWeight: 600, marginTop: 10 }}>{s.change}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Homepage Banner</h3>
              {[{ key: "label", label: "Label", placeholder: "MEGA FESTIVE SALE" },{ key: "title", label: "Title (HTML)", placeholder: "Up to &lt;strong&gt;60% Off&lt;/strong&gt;" },{ key: "subtitle", label: "Subtitle (HTML)", placeholder: "Use code LUXE50" },{ key: "btnText", label: "Button Text", placeholder: "Shop Sale" },{ key: "bgColor", label: "Background", placeholder: "linear-gradient(135deg, #8b6644, #e8a87c)" }].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={banner?.[key] || ""} onChange={e => setBanner(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none" }} />
                </div>
              ))}
              <button onClick={async () => { try { await updateBanner(banner); showToast("Banner saved!") } catch (e) { showToast("Failed to save banner", "info") } }} className="hover-btn" style={{ background: "#8b6644", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 4 }}>Save Banner</button>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Shipping Settings</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={shipping?.freeShipping ?? true} onChange={e => setShipping(p => ({ ...p, freeShipping: e.target.checked }))} style={{ width: 18, height: 18 }} /> Free Shipping
                </label>
              </div>
              {!shipping?.freeShipping && <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Shipping Cost (&#x20B9;)</label>
                <input type="number" value={shipping?.cost || ""} onChange={e => setShipping(p => ({ ...p, cost: Number(e.target.value) }))} placeholder="e.g. 50" style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none" }} />
              </div>}
              <button onClick={async () => { try { await updateShippingSettings(shipping); showToast("Shipping saved!") } catch (e) { showToast("Failed", "info") } }} className="hover-btn" style={{ background: "#8b6644", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save Shipping</button>
            </div>
            <div className="admin-dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Recent Orders</h3>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0ede8", fontFamily: "'Jost',sans-serif", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{o.orderNumber || o.id?.slice(0, 8)}</span>
                    <span style={{ color: "#767676" }}>{fmt(o.total)}</span>
                    <span style={{ color: STATUS_COLORS[o.status] || "#f59e0b", fontWeight: 600 }}>{o.status}</span>
                  </div>
                ))}
                {orders.length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 13 }}>No orders yet</p>}
              </div>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Best Sellers</h3>
                {bestSellers.slice(0, 5).map(p => (
                  <div key={p.name} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f0ede8", alignItems: "center" }}>
                    <img src={p.img} alt={p.name} loading="lazy" decoding="async" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                    <div style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: 13 }}><div style={{ fontWeight: 600 }}>{p.name.slice(0, 22)}</div><div style={{ color: "#767676" }}>{p.qty} sold</div></div>
                  </div>
                ))}
                {bestSellers.length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 13 }}>No sales data yet</p>}
              </div>
            </div>
          </div>
        )}

        {adminTab === "products" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600 }}>Products ({products.length})</h2>
              <button onClick={() => openForm(null)} style={{ background: "#8b6644", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Add Product</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {Object.entries(catCounts).map(([cat, count]) => (
                <span key={cat} style={{ background: "#fff", borderRadius: 20, padding: "6px 14px", fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666", border: "1px solid #e0d8ce" }}>
                  <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{cat}</span>
                  <span style={{ marginLeft: 6, color: "#8b6644", fontWeight: 700 }}>{count}</span>
                </span>
              ))}
            </div>
            <div className="admin-table-wrap" style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8f5f0" }}>
                  <tr>{["Image", "Name", "Category", "Price", "Stock", "Margin", "Actions"].map(h => <th key={h} style={T(h)}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f8f5f0" }}>
                      <td style={{ padding: "12px 16px" }}><img src={p.img} alt={p.name} loading="lazy" decoding="async" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /></td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", textTransform: "capitalize" }}>{p.category}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13 }}>{fmt(p.price)}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: p.stock < 10 ? "#ef4444" : p.stock < 100 ? "#f59e0b" : "#10b981" }}>{p.stock}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#10b981", fontWeight: 600 }}>{disc(p.price, p.original)}%</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openForm(p)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#3b82f6", background: "#eff6ff", border: "none", padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => del(p.id)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#dc2626", background: "#fef2f2", border: "none", padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === "orders" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600 }}>Orders ({filteredOrders.length})</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search order ID, customer..." style={{ padding: "8px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", width: 220 }} />
                <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} style={{ padding: "8px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", background: "#fff" }}>
                  <option value="all">All Status</option>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }} className="admin-orders-table">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8f5f0" }}>
                  <tr>{["Order", "Customer", "Items", "Total", "Payment", "Status", "Date", "Action"].map(h => <th key={h} style={T(h)}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => {
                    const totalQty = (o.items || []).reduce((s, i) => s + (i.qty || 1), 0)
                    const showDetail = expandedOrder === o.id
                    return (
                      <Fragment key={o.id}>
                        <tr style={{ borderBottom: showDetail ? "none" : "1px solid #f0ede8", cursor: "pointer", background: showDetail ? "#faf8f5" : "transparent" }} onClick={() => setExpandedOrder(showDetail ? null : o.id)}>
                          <td style={{ padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13 }}>{o.orderNumber || o.id?.slice(0, 8)}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13 }}>{o.customerName || "Guest"}</div>
                            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676" }}>{o.email}</div>
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13 }}>{totalQty} items</td>
                          <td style={{ padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13 }}>{fmt(o.total)}</td>
                          <td style={{ padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676" }}>{o.paymentMethod || "N/A"}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: (STATUS_COLORS[o.status] || "#f59e0b") + "22", color: STATUS_COLORS[o.status] || "#f59e0b" }}>{o.status || "Pending"}</span>
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676" }}>{o.date || ""}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
                              <select value={o.status} onChange={e => updateStatus(o, e.target.value)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #e0d8ce", background: "#fff", cursor: "pointer" }}>
                                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={e => { e.stopPropagation(); setTrackForm({ trackingNumber: o.trackingNumber || "", carrier: o.carrier || "", estimatedDelivery: o.estimatedDelivery || "", steps: (o.trackingSteps || []).map(s => ({ ...s })) }); setTrackModalOrder(o) }} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#3b82f6", background: "#eff6ff", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Tracking</button>
                              <button onClick={e => { e.stopPropagation(); handleDeleteOrder(o) }} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#dc2626", background: "#fef2f2", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                        {showDetail && (
                          <tr style={{ borderBottom: "1px solid #f0ede8", background: "#faf8f5" }}>
                            <td colSpan={8} style={{ padding: "0 16px 20px" }}>
                              <div className="admin-order-detail" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: 16 }}>
                                <div>
                                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 8 }}>CUSTOMER</div>
                                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.7 }}>
                                    <div><strong>{o.customerName || "Guest"}</strong></div>
                                    <div style={{ color: "#767676" }}>{o.email}</div>
                                    {o.phone && <div style={{ color: "#767676" }}>{o.phone}</div>}
                                  </div>
                                  {o.address && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", marginTop: 8, lineHeight: 1.5 }}>{o.address}</div>}
                                </div>
                                <div>
                                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 8 }}>PAYMENT &amp; SHIPPING</div>
                                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.7 }}>
                                    <div>Method: <strong>{o.paymentMethod || "N/A"}</strong></div>
                                    <div>Status: <strong>{o.status || "Pending"}</strong></div>
                                    {o.trackingNumber && <div>Tracking: <strong>{o.trackingNumber}</strong></div>}
                                    {o.carrier && <div>Courier: <strong>{o.carrier}</strong></div>}
                                    {o.estimatedDelivery && <div>Est. Delivery: <strong>{o.estimatedDelivery}</strong></div>}
                                  </div>
                                </div>
                              </div>
                              <div style={{ padding: "0 16px 16px" }}>
                                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 12 }}>PRODUCTS</div>
                                {(o.items || []).map((item, idx) => {
                                  const prod = products.find(p => p.id === item.id)
                                  return (
                                    <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0ede8" }}>
                                      <img src={item.img || prod?.img || ""} alt={item.name || "product"} loading="lazy" decoding="async" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: "#f0ede8" }} />
                                      <div style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: 13 }}>
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        <div style={{ color: "#767676", fontSize: 12 }}>{fmt(item.price)} x {item.qty || 1}</div>
                                      </div>
                                      <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13 }}>{fmt((item.price || 0) * (item.qty || 1))}</div>
                                    </div>
                                  )
                                })}
                                {(o.items || []).length === 0 && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676" }}>No product details</div>}
                                <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 0 0", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 15 }}>Total: {fmt(o.total)}</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {filteredOrders.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#767676", fontFamily: "'Jost',sans-serif" }}>No orders found</td></tr>}
                </tbody>
              </table>
            </div>
            {orders.length > 0 && filteredOrders.length === 0 && (
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button onClick={() => { setOrderSearch(""); setOrderStatusFilter("all") }} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#8b6644", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear filters</button>
              </div>
            )}
          </div>
        )}

        {adminTab === "checkouts" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600 }}>Checkout Details ({orders.length})</h2>
              <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search orders..." style={{ padding: "8px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", width: 220, maxWidth: "100%" }} />
            </div>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, fontFamily: "'Jost',sans-serif", color: "#767676" }}>No checkout records found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredOrders.map(o => {
                  const totalQty = (o.items || []).reduce((s, i) => s + (i.qty || 1), 0)
                  return (
                    <div key={o.id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f0ede8" }}>
                        <div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 15, color: "#8b6644" }}>{o.orderNumber || o.id?.slice(0, 10)}</div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", marginTop: 2 }}>{o.date || ""}</div>
                        </div>
                        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20, background: (STATUS_COLORS[o.status] || "#f59e0b") + "22", color: STATUS_COLORS[o.status] || "#f59e0b" }}>{o.status || "Pending"}</span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 6 }}>CUSTOMER</div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                            <div style={{ fontWeight: 600 }}>{o.customerName || "Guest"}</div>
                            <div style={{ color: "#767676", wordBreak: "break-all" }}>{o.email}</div>
                            {o.phone && <div style={{ color: "#767676" }}>{o.phone}</div>}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 6 }}>SHIPPING ADDRESS</div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.6, color: "#555" }}>
                            {o.address ? o.address.split(",").map((line, i) => <div key={i}>{line.trim()}</div>) : <span style={{ color: "#767676" }}>N/A</span>}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 6 }}>PAYMENT</div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                            <div><strong>Method:</strong> {o.paymentMethod || "N/A"}</div>
                            <div><strong>Total:</strong> {fmt(o.total)}</div>
                            <div><strong>Items:</strong> {totalQty}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 8 }}>PRODUCTS</div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
                            <thead>
                              <tr style={{ background: "#f8f5f0" }}>
                                {["Product", "Price", "Qty", "Subtotal"].map(h => <th key={h} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676", padding: "8px 12px", textAlign: "left" }}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {(o.items || []).map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #f0ede8" }}>
                                  <td style={{ padding: "8px 12px", fontFamily: "'Jost',sans-serif", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                    <img src={item.img || ""} alt={item.name || "product"} loading="lazy" decoding="async" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                                  </td>
                                  <td style={{ padding: "8px 12px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", whiteSpace: "nowrap" }}>{fmt(item.price)}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: "'Jost',sans-serif", fontSize: 13, textAlign: "center" }}>{item.qty || 1}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{fmt((item.price || 0) * (item.qty || 1))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #f0ede8", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <button onClick={() => handleDeleteOrder(o)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#dc2626", background: "#fef2f2", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                        <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 16 }}>
                          Total: {fmt(o.total)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {adminTab === "categories" && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>Product Categories</h2>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <input value={catInput} onChange={e => setCatInput(e.target.value)} placeholder="New category name" style={{ flex: 1, padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", textTransform: "lowercase" }} />
              <button onClick={async () => { const name = catInput.trim().toLowerCase(); if (!name) return; if (productCategories.includes(name)) return showToast("Category already exists", "info"); try { await addProductCategory({ name }); setProductCategories(prev => [...prev, name]); setCatInput(""); showToast("Category added!") } catch (e) { showToast("Failed to add category", "info") } }} style={{ background: "#8b6644", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {productCategories.map(cat => {
                const count = products.filter(p => p.category === cat).length
                return (
                  <div key={cat} style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{cat}</span>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, background: "#f0ede8", borderRadius: 10, padding: "2px 8px", color: "#767676", fontWeight: 600 }}>{count}</span>
                    <button onClick={async () => { if (!confirm(`Delete category "${cat}"?`)) return; try { const cats = await getProductCategories(); const found = cats.find(c => c.name === cat); if (found) await deleteProductCategory(found.id); setProductCategories(prev => prev.filter(c => c !== cat)); showToast(`Category "${cat}" deleted`) } catch (e) { showToast("Failed to delete category", "info") } }} style={{ background: "#fef2f2", color: "#dc2626", border: "none", padding: "4px 12px", borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {adminTab === "customers" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600 }}>Customers ({customerList.length})</h2>
              <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search customers..." style={{ padding: "8px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", width: 220 }} />
            </div>
            {customerList.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.email.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
              <div key={c.email} style={{ background: "#fff", borderRadius: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => setExpandedCustomer(expandedCustomer === c.email ? null : c.email)}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#8b6644", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Jost',sans-serif", flexShrink: 0 }}>{c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, fontFamily: "'Jost',sans-serif" }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name} {c.orders.length > 1 && <span style={{ fontSize: 11, color: "#10b981", background: "#d1fae5", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>Repeat</span>}</div>
                    <div style={{ fontSize: 13, color: "#767676" }}>{c.email} {c.phone && <span>&middot; {c.phone}</span>}</div>
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "'Jost',sans-serif", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(c.totalSpent)}</div>
                    <div style={{ fontSize: 12, color: "#767676" }}>{c.orders.length} orders</div>
                    <button onClick={e => { e.stopPropagation(); handleDeleteCustomerOrders(c.email) }} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#dc2626", background: "#fef2f2", border: "none", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                  </div>
                </div>
                {expandedCustomer === c.email && (
                  <div style={{ borderTop: "1px solid #f0ede8", padding: "16px 24px 20px", background: "#faf8f5", borderRadius: "0 0 16px 16px" }}>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: 1, color: "#8b6644", fontWeight: 700, marginBottom: 12 }}>ORDER HISTORY</div>
                    {c.orders.map(o => (
                      <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0ede8", fontFamily: "'Jost',sans-serif", fontSize: 13 }}>
                        <div><span style={{ fontWeight: 600 }}>{o.orderNumber || o.id?.slice(0, 8)}</span><span style={{ color: "#767676", marginLeft: 8 }}>{o.date || ""}</span></div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ color: STATUS_COLORS[o.status] || "#f59e0b", fontWeight: 600, fontSize: 12 }}>{o.status || "Pending"}</span>
                          <span style={{ fontWeight: 700 }}>{fmt(o.total)}</span>
                        </div>
                      </div>
                    ))}
                    {c.orders.length === 0 && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676" }}>No orders found</div>}
                  </div>
                )}
              </div>
            ))}
            {customerList.length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 14 }}>No customers with orders yet.</p>}
            {subs.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Newsletter Subscribers ({subs.length})</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {subs.map(s => <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13 }}>{s.email}</div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {adminTab === "analytics" && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 28 }}>Analytics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
              {[
                ["Total Revenue", fmt(ordTotal), "from " + ordCount + " orders", "#10b981"],
                ["Orders", String(ordCount), ordCount > 0 ? "AOV " + fmt(aov) : "No data", "#3b82f6"],
                ["Avg Order Value", ordCount > 0 ? fmt(aov) : "$0", "per transaction", "#8b5cf6"],
                ["Categories", String(Object.keys(catRevenue).length), "with sales", "#f59e0b"],
              ].map(([l, v, c, col]) => (
                <div key={l} style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", letterSpacing: 1, marginBottom: 8 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 30, fontWeight: 700 }}>{v}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: col, fontWeight: 600, marginTop: 8 }}>{c}</div>
                </div>
              ))}
            </div>
            <div className="admin-analytics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Best Selling Products</h3>
                {bestSellers.slice(0, 8).map((p, i) => (
                  <div key={p.name} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f0ede8", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", fontWeight: 700, width: 20 }}>#{i + 1}</span>
                    <img src={p.img} alt={p.name} loading="lazy" decoding="async" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                    <div style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: 12 }}><div style={{ fontWeight: 600 }}>{p.name.slice(0, 24)}</div><div style={{ color: "#767676" }}>{p.qty} sold &middot; {fmt(p.revenue)}</div></div>
                  </div>
                ))}
                {bestSellers.length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 13 }}>No sales data yet</p>}
              </div>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Category Performance</h3>
                {Object.entries(catRevenue).sort((a, b) => b[1] - a[1]).map(([cat, rev]) => {
                  const pct = ordTotal > 0 ? (rev / ordTotal * 100) : 0
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{cat}</span>
                        <span style={{ color: "#767676" }}>{fmt(rev)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ height: 8, background: "#f0ede8", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#8b6644,#e8b48c)", borderRadius: 10 }} />
                      </div>
                    </div>
                  )
                })}
                {Object.keys(catRevenue).length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 13 }}>No category data yet</p>}
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Orders by Status</h3>
              {ALL_STATUSES.map(s => {
                const count = orders.filter(o => o.status === s).length
                const pct = orders.length ? (count / orders.length * 100).toFixed(0) : 0
                if (count === 0) return null
                return (
                  <div key={s} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{s}</span>
                      <span style={{ color: "#767676" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 10, background: "#f0ede8", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: pct + "%", background: STATUS_COLORS[s] || "#f59e0b", borderRadius: 10 }} />
                    </div>
                  </div>
                )
              })}
              {orders.length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 13 }}>No orders yet</p>}
            </div>
          </div>
        )}

      </main>
    </div>
    {showForm && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setShowForm(false)}>
        <div className="modal-inner" style={{ background: "#fff", borderRadius: 20, padding: 32, width: "90%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>{editProd ? "Edit Product" : "Add Product"}</h3>
          {[["name", "Product Name"], ["price", "Price"], ["original", "Original Price"], ["stock", "Stock"], ["desc", "Description"]].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>{l}</label>
              {k === "desc" ? <textarea value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} rows={3} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", resize: "vertical" }} /> : <input value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />}
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", background: "#fff" }}>
              {(productCategories.length ? productCategories : ["electronics", "fashion", "beauty", "home"]).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Badge</label>
            <select value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", background: "#fff" }}>
              {["Best Seller", "Trending", "New Arrival", "Hot Deal", "Editor's Pick", "Top Rated"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Image</label>
            {form.img && <img src={form.img} alt="Product preview" decoding="async" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", marginBottom: 8, display: "block" }} />}
            <label className="hover-btn" style={{ display: "inline-block", background: "#f0ede8", color: "#555", padding: "10px 18px", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer" }}>
              {uploading ? "Uploading..." : "Upload to Cloudinary"}
              <input type="file" accept="image/*" onChange={uploadImg} style={{ display: "none" }} />
            </label>
            <input value={form.img} onChange={e => setForm(p => ({ ...p, img: e.target.value }))} placeholder="Or paste image URL" style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", marginTop: 8 }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setShowForm(false)} disabled={savingProduct} style={{ flex: 1, background: "#f0ede8", color: "#555", border: "none", padding: "12px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: savingProduct ? "not-allowed" : "pointer" }}>Cancel</button>
            <button onClick={save} disabled={savingProduct} className="hover-btn" style={{ flex: 1, background: savingProduct ? "#ccc" : "#8b6644", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: savingProduct ? "not-allowed" : "pointer" }}>{savingProduct ? "Saving..." : editProd ? "Update" : "Create"}</button>
          </div>
          {productError && <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 8, padding: "10px 12px", fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>{productError}</div>}
        </div>
      </div>
    )}
    {trackModalOrder && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setTrackModalOrder(null)}>
        <div className="modal-inner" style={{ background: "#fff", borderRadius: 20, padding: 32, width: "90%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Tracking — {trackModalOrder.orderNumber || trackModalOrder.id?.slice(0, 8)}</h3>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", marginBottom: 20 }}>{trackModalOrder.customerName || trackModalOrder.email}</p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Tracking Number</label>
            <input value={trackForm.trackingNumber} onChange={e => setTrackForm(p => ({ ...p, trackingNumber: e.target.value }))} placeholder="e.g. 1Z999AA10123456784" style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Carrier</label>
              <input value={trackForm.carrier} onChange={e => setTrackForm(p => ({ ...p, carrier: e.target.value }))} placeholder="e.g. India Post" style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Est. Delivery</label>
              <input value={trackForm.estimatedDelivery} onChange={e => setTrackForm(p => ({ ...p, estimatedDelivery: e.target.value }))} placeholder="e.g. May 25" style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none" }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666", display: "block", marginBottom: 8 }}>Tracking Steps</label>
            {trackForm.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <input type="checkbox" checked={step.done} onChange={e => { const s = [...trackForm.steps]; s[i] = { ...s[i], done: e.target.checked }; if (e.target.checked && !s[i].date) s[i].date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }); setTrackForm(p => ({ ...p, steps: s })) }} style={{ width: 16, height: 16 }} />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, flex: 1, color: step.done ? "#1a1a1a" : "#767676", fontWeight: step.done ? 600 : 400 }}>{step.label}</span>
                <input value={step.date || ""} onChange={e => { const s = [...trackForm.steps]; s[i] = { ...s[i], date: e.target.value }; setTrackForm(p => ({ ...p, steps: s })) }} placeholder="Date" style={{ width: 100, padding: "6px 10px", border: "1px solid #e0d8ce", borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 12, outline: "none" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setTrackModalOrder(null)} style={{ flex: 1, background: "#f0ede8", color: "#555", border: "none", padding: "12px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSaveTracking} className="hover-btn" style={{ flex: 1, background: "#8b6644", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Save Tracking</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default AdminPage
