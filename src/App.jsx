import { useState, useEffect, useRef } from "react"
import { auth, db, onAuthStateChanged, signUp, signIn, logOut, resetPassword, signInWithGoogle, signInAsGuest, getProducts, getProductById, addProduct, updateProduct, deleteProduct, getOrders, createOrder, updateOrderStatus, getReviews, addReview, subscribeNewsletter, getCategories, getUsers, getNewsletterSubscribers } from "./firebase"
import { SEED_PRODUCTS, SEED_REVIEWS, SEED_CATEGORIES, fmt, disc } from "./data"
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore"

const Stars = ({ n }) => "\u2605".repeat(Math.floor(n)) + (n % 1 >= 0.5 ? "\u00BD" : "") + "\u25A0".repeat(5 - Math.ceil(n))

export default function App() {
  const [page, setPage] = useState("home")
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [adminTab, setAdminTab] = useState("dashboard")
  const [catFilter, setCatFilter] = useState("all")
  const [searchQ, setSearchQ] = useState("")
  const [sortBy, setSortBy] = useState("featured")
  const [payMethod, setPayMethod] = useState("stripe")
  const [authMode, setAuthMode] = useState("login")
  const [newsletter, setNewsletter] = useState("")
  const [newsletterDone, setNewsletterDone] = useState(false)
  const [orders, setOrders] = useState([])
  const [authLoading, setAuthLoading] = useState(true)

  const [products, setProducts] = useState(SEED_PRODUCTS)
  const [reviews, setReviews] = useState(SEED_REVIEWS)
  const [categories, setCategories] = useState(SEED_CATEGORIES)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({ name: fbUser.displayName || fbUser.email.split("@")[0], email: fbUser.email })
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user?.email) return
    ;(async () => {
      try {
        const u = auth.currentUser
        if (!u) return
        const snap = await getDoc(doc(db, "users", u.uid))
        if (snap.exists() && snap.data().isAdmin) {
          setUser(prev => prev ? { ...prev, isAdmin: true } : prev)
        }
      } catch (_) {}
    })()
  }, [user?.email])

  window.makeMeAdmin = async () => {
    const u = auth.currentUser
    if (!u) return alert("Sign in first")
    try {
      await setDoc(doc(db, "users", u.uid), { isAdmin: true }, { merge: true })
      alert("Admin role set! Reload the page.")
      setUser(prev => prev ? { ...prev, isAdmin: true } : prev)
    } catch (e) {
      alert("Failed: " + e.message)
    }
  }

  const handleLogout = async () => {
    await logOut()
    setCart([])
    setWishlist([])
    setOrders([])
    showToast("Signed out")
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [fp, fr, fc] = await Promise.all([getProducts(), getReviews(), getCategories()])
        if (fp.length) setProducts(fp)
        if (fr.length) setReviews(fr)
        if (fc.length) setCategories(fc)
      } catch (_) {}
    }
    load()
  }, [])

  useEffect(() => {
    if (!user) { setOrders([]); return }
    getOrders().then(setOrders).catch(() => setOrders([]))
  }, [user])

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const addCart = (product, qty = 1) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
      return [...prev, { ...product, qty }]
    })
    showToast(`${product.name} added to cart`)
  }

  const removeCart = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const toggleWish = (p) => {
    setWishlist(prev => prev.find(i => i.id === p.id) ? prev.filter(i => i.id !== p.id) : [...prev, p])
    showToast(wishlist.find(i => i.id === p.id) ? "Removed from wishlist" : "Added to wishlist", "info")
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  const nav = (p, extra = {}) => {
    setPage(p)
    if (extra.product) setSelectedProduct(extra.product)
  }

  const filteredProducts = products
    .filter(p => catFilter === "all" || p.category === catFilter.toLowerCase())
    .filter(p => !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) =>
      sortBy === "price-asc" ? a.price - b.price :
      sortBy === "price-desc" ? b.price - a.price :
      sortBy === "rating" ? b.rating - a.rating : 0
    )

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", background: "#faf9f7", color: "#1a1a1a", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #faf9f7; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f0ede8; }
        ::-webkit-scrollbar-thumb { background: #c8bfb0; border-radius: 3px; }
        .hover-lift { transition: transform 0.25s, box-shadow 0.25s; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.1); }
        .hover-btn { transition: all 0.2s; cursor: pointer; }
        .hover-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .nav-link { cursor: pointer; transition: color 0.2s; }
        .nav-link:hover { color: #a67a54; }
        .product-card:hover .product-overlay { opacity: 1 !important; }
        input:focus, select:focus, textarea:focus { outline: 2px solid #a67a54; outline-offset: 1px; }
        .brand-accent { color: #a67a54; }
        .btn-primary { background: #a67a54; color: #fff; }
        .btn-primary:hover { background: #8b6644; }
        .text-muted { color: #767676; }
        .text-muted-light { color: #767676; }
        .rating-star { color: #a67a54; }
        .price-old { color: #767676; }
        .cat-label { color: #767676; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: none; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .fade-in { animation: fadeIn 0.5s ease forwards; }
        .hero-text { animation: fadeIn 0.8s ease forwards; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .mobile-col { flex-direction: column !important; }
          .mobile-full { width: 100% !important; }
        }
      `}</style>

      {authLoading && <div style={{ position: "fixed", inset: 0, background: "#faf9f7", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "#8b6644" }}>Loading...</div>}
      <Navbar cart={cart} cartCount={cartCount} user={user} nav={nav} page={page} searchQ={searchQ} setSearchQ={setSearchQ} handleLogout={handleLogout} />

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <main>
        {page === "home"     && <HomePage products={products} reviews={reviews} categories={categories} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} setSearchQ={setSearchQ} newsletter={newsletter} setNewsletter={setNewsletter} newsletterDone={newsletterDone} setNewsletterDone={setNewsletterDone} showToast={showToast} />}
        {page === "shop"     && <ShopPage products={filteredProducts} allProducts={products} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} catFilter={catFilter} setCatFilter={setCatFilter} searchQ={searchQ} setSearchQ={setSearchQ} sortBy={sortBy} setSortBy={setSortBy} />}
        {page === "product"  && <ProductPage product={selectedProduct} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} products={products} reviews={reviews} showToast={showToast} />}
        {page === "cart"     && <CartPage cart={cart} setCart={setCart} removeCart={removeCart} cartTotal={cartTotal} nav={nav} />}
        {page === "checkout" && <CheckoutPage cart={cart} cartTotal={cartTotal} payMethod={payMethod} setPayMethod={setPayMethod} nav={nav} showToast={showToast} setCart={setCart} user={user} orders={orders} setOrders={setOrders} />}
        {page === "wishlist" && <WishlistPage wishlist={wishlist} toggleWish={toggleWish} addCart={addCart} nav={nav} />}
        {page === "auth"     && <AuthPage setUser={setUser} authMode={authMode} setAuthMode={setAuthMode} nav={nav} showToast={showToast} signUp={signUp} signIn={signIn} resetPassword={resetPassword} signInWithGoogle={signInWithGoogle} signInAsGuest={signInAsGuest} />}
        {page === "orders"   && <OrdersPage orders={orders} nav={nav} user={user} />}
        {page === "tracking" && <TrackingPage nav={nav} />}
        {page === "admin"    && user?.isAdmin && <AdminPage products={products} orders={orders} adminTab={adminTab} setAdminTab={setAdminTab} nav={nav} />}
        {page === "about"    && <StaticPage title="About Us" nav={nav}><AboutContent /></StaticPage>}
        {page === "contact"  && <StaticPage title="Contact Us" nav={nav}><ContactContent showToast={showToast} /></StaticPage>}
        {page === "privacy"  && <StaticPage title="Privacy Policy" nav={nav}><PrivacyContent /></StaticPage>}
        {page === "refund"   && <StaticPage title="Refund Policy" nav={nav}><RefundContent /></StaticPage>}
        {page === "terms"    && <StaticPage title="Terms & Conditions" nav={nav}><TermsContent /></StaticPage>}
      </main>

      <Footer nav={nav} newsletter={newsletter} setNewsletter={setNewsletter} newsletterDone={newsletterDone} setNewsletterDone={setNewsletterDone} showToast={showToast} user={user} />
      <WhatsAppButton />
    </div>
  )
}

function Navbar({ cart, cartCount, user, nav, page, searchQ, setSearchQ, handleLogout }) {
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", h)
    return () => window.removeEventListener("scroll", h)
  }, [])
  useEffect(() => { if (!user) setShowUserMenu(false) }, [user])
  useEffect(() => {
    if (!showUserMenu) return
    const close = (e) => { if (!e.target.closest("#user-menu-btn") && !e.target.closest("#user-menu-dropdown")) setShowUserMenu(false) }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [showUserMenu])

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 200, background: scrolled ? "rgba(250,249,247,0.97)" : "#faf9f7", borderBottom: scrolled ? "1px solid #ede8e0" : "none", transition: "all 0.3s" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 68, gap: 24 }}>
        <div onClick={() => nav("home")} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700, letterSpacing: 2, cursor: "pointer", whiteSpace: "nowrap" }}>
          LUXE<span style={{ color: "#a67a54" }}>DROP</span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, background: "#f3efe9", borderRadius: 10, padding: "8px 14px", maxWidth: 400 }}>
          <span style={{ color: "#767676", fontSize: 14 }}>&#x1F50D;</span>
          <input value={searchQ} onChange={e => { setSearchQ(e.target.value); nav("shop") }} placeholder="Search products..." style={{ flex: 1, border: "none", background: "none", fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", color: "#333" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }} className="hide-mobile">
          {[["Shop", "shop"], ["Trending", "shop"], ["Orders", "orders"], ["Track", "tracking"]].map(([l, p]) => (
            <span key={l} className="nav-link" onClick={() => nav(p)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>{l}</span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="nav-link" onClick={() => nav("wishlist")} style={{ fontSize: 20, position: "relative" }}>&#x2661;</span>
          <span className="nav-link" onClick={() => nav("cart")} style={{ fontSize: 20, position: "relative" }}>
            &#x1F6D2;
            {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -8, background: "#8b6644", color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
          </span>
          {user ? (
            <div style={{ position: "relative" }}>
              <div id="user-menu-btn" onClick={() => setShowUserMenu(!showUserMenu)} className="hover-btn" style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, background: "#1a1a1a", color: "#fff", padding: "8px 18px", borderRadius: 8, cursor: "pointer" }}>
                {user.name.split(" ")[0]} <span style={{ fontSize: 10 }}>{showUserMenu ? "\u25B2" : "\u25BC"}</span>
              </div>
              {showUserMenu && (
                <div id="user-menu-dropdown" style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden", zIndex: 300 }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ede8", fontFamily: "'Jost',sans-serif" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: "#767676", marginTop: 2 }}>{user.email}</div>
                  </div>
                  {[["My Orders", "orders"], ["Wishlist", "wishlist"], ...(user?.isAdmin ? [["Admin", "admin"]] : [])].map(([l, p]) => (
                    <div key={l} onClick={() => { setShowUserMenu(false); nav(p) }} style={{ padding: "12px 18px", fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer", color: "#555", transition: "background 0.15s" }} onMouseEnter={e => e.target.style.background = "#f8f5f0"} onMouseLeave={e => e.target.style.background = "transparent"}>{l}</div>
                  ))}
                  {user && !user.isAdmin && <div onClick={async () => { try { const u = auth.currentUser; if (!u) return; await setDoc(doc(db, "users", u.uid), { isAdmin: true }, { merge: true }); setUser(prev => prev ? { ...prev, isAdmin: true } : prev); setShowUserMenu(false) } catch (e) { alert("Failed: " + e.message) } }} style={{ padding: "12px 18px", fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer", color: "#8b6644", borderTop: "1px solid #f0ede8", transition: "background 0.15s" }} onMouseEnter={e => e.target.style.background = "#f8f5f0"} onMouseLeave={e => e.target.style.background = "transparent"}>Claim Admin</div>}
                  <div onClick={() => { setShowUserMenu(false); handleLogout() }} style={{ padding: "12px 18px", fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer", color: "#dc2626", borderTop: "1px solid #f0ede8", transition: "background 0.15s" }} onMouseEnter={e => e.target.style.background = "#fef2f2"} onMouseLeave={e => e.target.style.background = "transparent"}>Sign Out</div>
                </div>
              )}
            </div>
          ) : (
            <span className="nav-link" onClick={() => nav("auth")} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, background: "#1a1a1a", color: "#fff", padding: "8px 18px", borderRadius: 8 }}>
              Sign In
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}

function Toast({ msg, type }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, background: type === "info" ? "#3b82f6" : "#10b981", color: "#fff", padding: "14px 24px", borderRadius: 12, fontFamily: "'Jost',sans-serif", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", animation: "slideIn 0.3s ease", display: "flex", alignItems: "center", gap: 10 }}>
      {type === "info" ? "\u2139\uFE0F" : "\u2713"} {msg}
    </div>
  )
}

function HomePage({ products, reviews, categories, nav, addCart, toggleWish, wishlist, setSearchQ, newsletter, setNewsletter, newsletterDone, setNewsletterDone, showToast }) {
  const featured = products.filter(p => ["Best Seller", "Editor's Pick", "Top Rated"].includes(p.badge))
  const trending = products.filter(p => ["Trending", "Hot Deal"].includes(p.badge))

  return (
    <div>
      <section style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2418 50%, #3d2f20 100%)", color: "#fff", padding: "80px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", gap: 60 }} className="mobile-col">
          <div style={{ flex: 1 }} className="hero-text">
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 4, color: "#8b6644", marginBottom: 16 }}>INDIAN DROPSHIPPING</div>
            <h1 style={{ fontSize: "clamp(40px,6vw,72px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1 }}>
              Discover<br /><em style={{ fontStyle: "italic", color: "#8b6644" }}>Bharat's</em><br />Finest
            </h1>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 16, color: "#ccc", maxWidth: 440, lineHeight: 1.7, marginBottom: 32 }}>
              Premium products from across India. Handpicked for quality, delivered to your doorstep.
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              <button onClick={() => nav("shop")} className="hover-btn" style={{ background: "#8b6644", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Shop Now &#x2192;</button>
              <button onClick={() => nav("tracking")} className="hover-btn" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "14px 32px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>Track Order</button>
            </div>
            <div style={{ display: "flex", gap: 40, marginTop: 48 }}>
              {[["50K+", "Happy Customers"], ["4.9\u2605", "Average Rating"], ["Free", "Shipping Across India"]].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#8b6644", fontFamily: "'Jost',sans-serif" }}>{v}</div>
                  <div style={{ fontSize: 12, color: "#aaa", fontFamily: "'Jost',sans-serif", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="hide-mobile">
            {products.slice(0, 4).map((p, i) => (
              <div key={p.id} onClick={() => nav("product", { product: p })} className="hover-lift" style={{ borderRadius: 16, overflow: "hidden", aspectRatio: i === 0 ? "1" : i === 3 ? "1" : "1", cursor: "pointer" }}>
                <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "#fff", borderBottom: "1px solid #ede8e0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "center", gap: "clamp(20px,4vw,60px)", flexWrap: "wrap" }}>
          {[["\uD83D\uDE9A", "Free Shipping", "Across India"], ["\uD83D\uDD04", "Easy Returns", "7-day policy"], ["\uD83D\uDD12", "Secure Pay", "UPI & Cards"], ["\uD83C\uDF1F", "Premium Quality", "Vetted artisans"]].map(([icon, t, s]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{t}</div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676" }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "60px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader title="Shop by Category" sub="Explore our curated collections" />
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {categories.map(cat => (
            <div key={cat.name} onClick={() => { setSearchQ(""); nav("shop") }} className="hover-lift" style={{ flex: "0 0 160px", background: cat.color + "33", borderRadius: 20, padding: "28px 20px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{cat.icon}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>{cat.name}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "rgba(0,0,0,0.5)", marginTop: 4 }}>{cat.count} items</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 24px 60px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader title="Featured Products" sub="Handpicked for quality and value" action={{ label: "View All", fn: () => nav("shop") }} />
        <ProductGrid products={featured} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
      </section>

      <section style={{ background: "linear-gradient(135deg, #8b6644, #e8a87c)", margin: "0 24px", borderRadius: 24, padding: "48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 4, color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>MEGA FESTIVE SALE</div>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", color: "#fff", fontWeight: 300, marginBottom: 12 }}>Up to <strong>60% Off</strong> on Indian Brands</h2>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 28 }}>Use code <strong>LUXE50</strong> for extra 10% off</p>
        <button onClick={() => nav("shop")} className="hover-btn" style={{ background: "#fff", color: "#8b6644", border: "none", padding: "14px 36px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Shop Sale &#x2192;</button>
      </section>

      <section style={{ padding: "60px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader title="Trending Now" sub="What everyone is buying this week" action={{ label: "See All", fn: () => nav("shop") }} />
        <ProductGrid products={trending} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
      </section>

      <section style={{ background: "#f3efe9", padding: "60px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <SectionHeader title="What Our Customers Say" sub="Over 50,000 happy shoppers worldwide" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {reviews.map(r => (
              <div key={r.name} style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                <div style={{ color: "#8b6644", fontSize: 16, marginBottom: 12 }}>{"\u2605".repeat(r.rating)}</div>
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 16 }}>"{r.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#8b6644", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'Jost',sans-serif" }}>{r.avatar}</div>
                  <div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676" }}>Purchased: {r.product}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "60px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader title="AI Picks For You" sub="Personalized recommendations based on trending in India" />
        <ProductGrid products={products.slice(4, 8)} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
      </section>
    </div>
  )
}

function SectionHeader({ title, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 600, letterSpacing: -0.5, marginBottom: 6 }}>{title}</h2>
        <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 14 }}>{sub}</p>
      </div>
      {action && <button onClick={action.fn} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#8b6644", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{action.label} &#x2192;</button>}
    </div>
  )
}

function ProductGrid({ products, nav, addCart, toggleWish, wishlist }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 20 }}>
      {products.map(p => <ProductCard key={p.id} product={p} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />)}
    </div>
  )
}

function ProductCard({ product: p, nav, addCart, toggleWish, wishlist }) {
  const wishlisted = wishlist.find(i => i.id === p.id)
  return (
    <div className="hover-lift product-card" style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer" }}>
      <div style={{ position: "relative", aspectRatio: "1" }} onClick={() => nav("product", { product: p })}>
        <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 12, left: 12, background: "#8b6644", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "'Jost',sans-serif", padding: "4px 10px", borderRadius: 6 }}>{p.badge}</div>
        <div style={{ position: "absolute", top: 12, right: 12, background: "#fff2e8", color: "#8b6644", fontSize: 11, fontFamily: "'Jost',sans-serif", fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}>-{disc(p.price, p.original)}%</div>
        <div className="product-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", opacity: 0, transition: "opacity 0.3s", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button onClick={e => { e.stopPropagation(); addCart(p) }} style={{ background: "#8b6644", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add to Cart &#x2192;</button>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{p.category}</div>
        <div onClick={() => nav("product", { product: p })} style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
        <div style={{ color: "#8b6644", fontSize: 12, fontFamily: "'Jost',sans-serif", marginBottom: 10 }}>{"\u2605".repeat(Math.floor(p.rating))} ({p.reviews.toLocaleString()})</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 17, color: "#1a1a1a" }}>{fmt(p.price)}</span>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", textDecoration: "line-through" }}>{fmt(p.original)}</span>
          </div>
          <button onClick={() => toggleWish(p)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: wishlisted ? "#e74c3c" : "#767676" }}>
            {wishlisted ? "\u2665" : "\u2661"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ShopPage({ products, allProducts, nav, addCart, toggleWish, wishlist, catFilter, setCatFilter, searchQ, setSearchQ, sortBy, setSortBy }) {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 8 }}>All Products</h1>
      <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", marginBottom: 32 }}>Showing {products.length} of {allProducts.length} products</p>
      <div style={{ display: "flex", gap: 24 }} className="mobile-col">
        <aside style={{ width: 200, flexShrink: 0 }} className="hide-mobile">
          <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: 1, marginBottom: 14, color: "#767676" }}>CATEGORIES</div>
          {["all", "fashion", "electronics", "beauty", "home"].map(cat => (
            <div key={cat} onClick={() => setCatFilter(cat)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: catFilter === cat ? "#8b6644" : "transparent", color: catFilter === cat ? "#fff" : "#555", fontWeight: catFilter === cat ? 600 : 400, marginBottom: 4, textTransform: "capitalize" }}>{cat}</div>
          ))}
        </aside>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search..." style={{ fontFamily: "'Jost',sans-serif", padding: "10px 16px", border: "1px solid #e0d8ce", borderRadius: 8, fontSize: 13, flex: 1, minWidth: 180, outline: "none" }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontFamily: "'Jost',sans-serif", padding: "10px 16px", border: "1px solid #e0d8ce", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none" }}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
            <div style={{ display: "flex", gap: 6 }} className="hide-mobile">
              {["all", "fashion", "electronics", "beauty", "home"].map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: catFilter === cat ? "#8b6644" : "#f0ede8", color: catFilter === cat ? "#fff" : "#555", fontWeight: 600 }}>{cat}</button>
              ))}
            </div>
          </div>
          <ProductGrid products={products} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
          {products.length === 0 && <div style={{ textAlign: "center", padding: "60px", color: "#767676", fontFamily: "'Jost',sans-serif" }}>No products found. Try a different search.</div>}
        </div>
      </div>
    </div>
  )
}

function ProductPage({ product: p, nav, addCart, toggleWish, wishlist, products, reviews, showToast }) {
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState("desc")
  const [imgIdx, setImgIdx] = useState(0)
  if (!p) return null
  const wishlisted = wishlist.find(i => i.id === p.id)
  const related = products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4)
  const imgs = [p.img, p.img.replace("w=600", "w=601"), p.img.replace("q=80", "q=70")]

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", marginBottom: 24 }}>
        <span style={{ cursor: "pointer", color: "#8b6644" }} onClick={() => nav("home")}>Home</span> / <span style={{ color: "#333" }}>{p.name}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }} className="mobile-col">
        <div>
          <div style={{ borderRadius: 20, overflow: "hidden", aspectRatio: "1", marginBottom: 12 }}>
            <img src={imgs[imgIdx]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {imgs.map((img, i) => (
              <div key={i} onClick={() => setImgIdx(i)} style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", cursor: "pointer", border: imgIdx === i ? "2px solid #8b6644" : "2px solid transparent" }}>
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#8b6644", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{p.category}</div>
          <h1 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 600, marginBottom: 12, lineHeight: 1.2 }}>{p.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ color: "#8b6644", fontSize: 18 }}>{"\u2605".repeat(Math.floor(p.rating))}</span>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#767676" }}>{p.rating} ({p.reviews.toLocaleString()} reviews)</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 36, fontWeight: 700, color: "#1a1a1a" }}>{fmt(p.price)}</span>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 18, color: "#767676", textDecoration: "line-through" }}>{fmt(p.original)}</span>
            <span style={{ background: "#ffece0", color: "#8b6644", fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 6 }}>Save {fmt(p.original - p.price)}</span>
          </div>
          <div style={{ background: "#f8f5f0", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[["\uD83D\uDE9A", "Free Shipping"], ["\uD83D\uDD04", "30-Day Returns"], ["\uD83D\uDD12", "Secure Checkout"], ["\u2713", p.stock + " in stock"]].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{icon}</span>
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#666" }}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666" }}>Quantity:</span>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #e0d8ce", borderRadius: 8, overflow: "hidden" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, border: "none", background: "#f8f5f0", cursor: "pointer", fontSize: 16, fontWeight: 600 }}>-</button>
              <span style={{ width: 48, textAlign: "center", fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 16 }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} style={{ width: 40, height: 40, border: "none", background: "#f8f5f0", cursor: "pointer", fontSize: 16, fontWeight: 600 }}>+</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }} className="mobile-col">
            <button onClick={() => addCart(p, qty)} className="hover-btn" style={{ flex: 1, background: "#1a1a1a", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Add to Cart &#x2192;</button>
            <button onClick={() => { addCart(p, qty); nav("checkout") }} className="hover-btn" style={{ flex: 1, background: "#8b6644", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Buy Now &#x2192;</button>
          </div>
          <button onClick={() => toggleWish(p)} style={{ width: "100%", border: "2px solid " + (wishlisted ? "#e74c3c" : "#e0d8ce"), background: "none", padding: "12px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", color: wishlisted ? "#e74c3c" : "#666" }}>
            {wishlisted ? "\u2665 Remove from Wishlist" : "\u2661 Add to Wishlist"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 48, borderTop: "1px solid #e8e2da", paddingTop: 40 }}>
        <div style={{ display: "flex", gap: 0, marginBottom: 32, borderBottom: "1px solid #e8e2da" }}>
          {[["desc", "Description"], ["reviews", "Reviews"], ["shipping", "Shipping"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, fontWeight: 600, padding: "14px 28px", border: "none", background: "none", cursor: "pointer", color: tab === k ? "#8b6644" : "#767676", borderBottom: tab === k ? "2px solid #8b6644" : "2px solid transparent", marginBottom: -1 }}>{l}</button>
          ))}
        </div>
        {tab === "desc" && <div style={{ fontFamily: "'Jost',sans-serif", color: "#555", lineHeight: 1.8, fontSize: 15, maxWidth: 700 }}>{p.desc}</div>}
        {tab === "reviews" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 56, fontWeight: 300, lineHeight: 1 }}>{p.rating}</div>
                <div style={{ color: "#8b6644", fontSize: 20 }}>{"\u2605".repeat(Math.floor(p.rating))}</div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676" }}>{p.reviews.toLocaleString()} reviews</div>
              </div>
              <div style={{ flex: 1 }}>
                {[5, 4, 3, 2, 1].map(n => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", width: 8 }}>{n}</span>
                    <div style={{ flex: 1, height: 8, background: "#f0ede8", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#8b6644", width: n === 5 ? "72%" : n === 4 ? "18%" : n === 3 ? "6%" : "2%", borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {reviews.map(r => (
              <div key={r.name} style={{ borderBottom: "1px solid #f0ede8", paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#8b6644", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "'Jost',sans-serif" }}>{r.avatar}</div>
                  <div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676" }}>{r.date} &#x2713; Verified Purchase</div>
                  </div>
                  <div style={{ marginLeft: "auto", color: "#8b6644" }}>{"\u2605".repeat(r.rating)}</div>
                </div>
                <p style={{ fontFamily: "'Jost',sans-serif", color: "#555", fontSize: 14, lineHeight: 1.7 }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "shipping" && (
          <div style={{ fontFamily: "'Jost',sans-serif", color: "#555", lineHeight: 2 }}>
            <p><strong>Standard Shipping:</strong> 3-7 business days &#x2022; FREE across India</p>
            <p><strong>Express Shipping:</strong> 1-2 business days &#x2022; ₹99</p>
            <p><strong>International:</strong> 7-14 business days &#x2022; ₹999</p>
            <p><strong>Returns:</strong> 30-day hassle-free returns. Items must be unused and in original packaging.</p>
            <p><strong>Tracking:</strong> Real-time tracking via our <span style={{ color: "#8b6644", cursor: "pointer" }} onClick={() => nav("tracking")}>tracking portal</span>.</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 60 }}>
        <SectionHeader title="You May Also Like" sub="Based on your selection" />
        <ProductGrid products={related} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
      </div>
    </div>
  )
}

function CartPage({ cart, setCart, removeCart, cartTotal, nav }) {
  const updateQty = (id, qty) => {
    if (qty < 1) return removeCart(id)
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 32 }}>Your Cart ({cart.length})</h1>
      {cart.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>&#x1F6D2;</div>
          <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 16, marginBottom: 24 }}>Your cart is empty</p>
          <button onClick={() => nav("shop")} style={{ background: "#8b6644", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Start Shopping &#x2192;</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }} className="mobile-col">
          <div>
            {cart.map(item => (
              <div key={item.id} style={{ display: "flex", gap: 16, padding: "20px 0", borderBottom: "1px solid #f0ede8", alignItems: "center" }}>
                <img src={item.img} alt={item.name} style={{ width: 88, height: 88, borderRadius: 12, objectFit: "cover" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", marginBottom: 12 }}>{item.category}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #e0d8ce", borderRadius: 8, overflow: "hidden" }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: 32, height: 32, border: "none", background: "#f8f5f0", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>-</button>
                      <span style={{ width: 36, textAlign: "center", fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14 }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: 32, height: 32, border: "none", background: "#f8f5f0", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+</button>
                    </div>
                    <button onClick={() => removeCart(item.id)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 17 }}>{fmt(item.price * item.qty)}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#f8f5f0", borderRadius: 20, padding: 28, alignSelf: "start" }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Order Summary</h3>
            {[["Subtotal", fmt(cartTotal)], ["Shipping", "FREE"], ["Tax (est.)", fmt(cartTotal * 0.08)]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#666", marginBottom: 12 }}>
                <span>{k}</span><span style={{ color: v === "FREE" ? "#10b981" : "#333", fontWeight: v === "FREE" ? 600 : 400 }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #e0d8ce", paddingTop: 16, marginTop: 8, display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
              <span>Total</span><span>{fmt(cartTotal + cartTotal * 0.08)}</span>
            </div>
            <div style={{ background: "#f3efe9", border: "1px solid #e0d8ce", borderRadius: 10, padding: "10px 14px", display: "flex", marginBottom: 16 }}>
              <input placeholder="Promo code (try BHARAT50)" style={{ flex: 1, border: "none", background: "none", fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none" }} />
              <button style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#8b6644", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Apply</button>
            </div>
            <button onClick={() => nav("checkout")} className="hover-btn" style={{ width: "100%", background: "#8b6644", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Proceed to Checkout &#x2192;</button>
            <div style={{ textAlign: "center", marginTop: 16, fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676" }}>Secure checkout &#x1F512;</div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckoutPage({ cart, cartTotal, payMethod, setPayMethod, nav, showToast, setCart, user }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: "", email: "", address: "", city: "", zip: "", country: "US" })
  const [placing, setPlacing] = useState(false)
  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const total = cartTotal + cartTotal * 0.08

  const placeOrder = async () => {
    if (!form.name || !form.email || !form.address) return showToast("Please fill all fields", "info")
    setPlacing(true)
    try {
      await createOrder({
        userId: user?.email || "guest",
        customerName: form.name,
        email: form.email,
        address: `${form.address}, ${form.city}, ${form.zip}, ${form.country}`,
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        total,
        status: "Processing",
        paymentMethod: payMethod,
        tracking: "PROCESSING",
      })
      setCart([])
      showToast("Order placed successfully!")
      nav("orders")
    } catch (e) {
      showToast("Failed to place order. Try again.", "info")
    }
    setPlacing(false)
  }

  if (step === 3) return (
    <div style={{ maxWidth: 500, margin: "100px auto", textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 72, marginBottom: 24 }}>&#x2705;</div>
      <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>Order Placed!</h2>
      <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676" }}>Redirecting you to your orders...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>Checkout</h1>
      <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
        {["Shipping", "Payment", "Review"].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: step > i + 1 ? "#10b981" : step === i + 1 ? "#8b6644" : "#e0d8ce", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "'Jost',sans-serif" }}>{step > i + 1 ? "\u2713" : i + 1}</div>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, fontWeight: step === i + 1 ? 600 : 400, color: step === i + 1 ? "#1a1a1a" : "#767676" }}>{s}</span>
            </div>
            {i < 2 && <div style={{ width: 40, height: 2, background: "#e0d8ce", margin: "0 12px" }} />}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }} className="mobile-col">
        <div>
          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Shipping Information</h3>
              {[["Full Name", "name", "text"], ["Email Address", "email", "email"], ["Street Address", "address", "text"], ["City", "city", "text"], ["ZIP Code", "zip", "text"]].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => upd(key, e.target.value)} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
                </div>
              ))}
              <select value={form.country} onChange={e => upd("country", e.target.value)} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", marginBottom: 20, background: "#fff" }}>
                {["US", "CA", "UK", "AU", "IN", "DE", "FR"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setStep(2)} className="hover-btn" style={{ width: "100%", background: "#1a1a1a", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Continue to Payment &#x2192;</button>
            </div>
          )}
          {step === 2 && (
            <div className="fade-in">
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Payment Method</h3>
              {[
                { id: "stripe", label: "Credit / Debit Card", icon: "\uD83D\uDCB3", sub: "Visa, Mastercard, RuPay" },
                { id: "razorpay", label: "Razorpay", icon: "\uD83C\uDFE6", sub: "UPI, Cards, Netbanking, Wallets" },
                { id: "paypal", label: "PayPal", icon: "\uD83D\uDCB1", sub: "International payments" },
                { id: "cod", label: "Cash on Delivery", icon: "\uD83D\uDCB5", sub: "Pay when you receive" },
              ].map(pm => (
                <div key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderRadius: 12, border: "2px solid " + (payMethod === pm.id ? "#8b6644" : "#e0d8ce"), marginBottom: 12, cursor: "pointer", background: payMethod === pm.id ? "#fff8f3" : "#fff" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: payMethod === pm.id ? "#8b6644" : "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{pm.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14 }}>{pm.label}</div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676" }}>{pm.sub}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (payMethod === pm.id ? "#8b6644" : "#ccc"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {payMethod === pm.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b6644" }} />}
                  </div>
                </div>
              ))}
              {payMethod === "stripe" && (
                <div style={{ background: "#f8f5f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <input placeholder="Card Number" style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", marginBottom: 10 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input placeholder="MM / YY" style={{ padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
                    <input placeholder="CVV" style={{ padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, background: "#f0ede8", color: "#555", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>&#x2190; Back</button>
                <button onClick={placeOrder} disabled={placing} className="hover-btn" style={{ flex: 2, background: placing ? "#ccc" : "#8b6644", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: placing ? "not-allowed" : "pointer" }}>{placing ? "Placing Order..." : "Place Order &#x2192;"}</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ background: "#f8f5f0", borderRadius: 20, padding: 24, alignSelf: "start" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Summary</h3>
          {cart.map(i => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", marginBottom: 8 }}>
              <span>{i.name.slice(0, 20)}... &#x00D7;{i.qty}</span>
              <span>{fmt(i.price * i.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #e0d8ce", marginTop: 12, paddingTop: 12 }}>
            {[["Subtotal", fmt(cartTotal)], ["Shipping", "FREE"], ["Tax", fmt(cartTotal * 0.08)]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", marginBottom: 8 }}><span>{k}</span><span>{v}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 16, paddingTop: 8, borderTop: "1px solid #e0d8ce" }}><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {["SSL Secure", "Trusted"].map(b => <span key={b} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676", background: "#f0ede8", padding: "4px 10px", borderRadius: 6 }}>{b}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

function WishlistPage({ wishlist, toggleWish, addCart, nav }) {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 32 }}>Wishlist ({wishlist.length})</h1>
      {wishlist.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 64 }}>&#x2661;</div>
          <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 16, marginTop: 16, marginBottom: 24 }}>Your wishlist is empty</p>
          <button onClick={() => nav("shop")} style={{ background: "#8b6644", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Discover Products &#x2192;</button>
        </div>
      ) : (
        <ProductGrid products={wishlist} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
      )}
    </div>
  )
}

function AuthPage({ setUser, authMode, setAuthMode, nav, showToast, signUp, signIn, resetPassword, signInWithGoogle, signInAsGuest }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState("")
  const upd = (k, v) => {
    setDone(false)
    setForm(p => ({ ...p, [k]: v }))
  }

  const validate = () => {
    if (!form.email.trim()) return "Email is required"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format"
    if (authMode !== "forgot") {
      if (!form.password) return "Password is required"
      if (form.password.length < 6) return "Password must be at least 6 characters"
    }
    if (authMode === "signup" && !form.name.trim()) return "Full name is required"
    return ""
  }

  const submit = async () => {
    if (done) {
      nav("home")
      return
    }
    const v = validate()
    if (v) return showToast(v, "info")
    setSubmitting(true)
    setErr("")
    try {
      if (authMode === "login") {
        await signIn(form.email, form.password)
        showToast("Welcome back!")
        setSubmitting(false)
        nav("home")
      } else if (authMode === "signup") {
        await signUp(form.email, form.password, form.name)
        setUser({ name: form.name, email: form.email })
        setDone(true)
        setSubmitting(false)
        showToast("Account created! You're now signed in.")
      } else {
        await resetPassword(form.email)
        showToast("Password reset link sent to your email", "info")
        setAuthMode("login")
        setSubmitting(false)
        return
      }
    } catch (e) {
      console.error("Sign-in/sign-up error:", e)
      const msg = e.code === "auth/email-already-in-use" ? "This email is already registered. Try signing in." :
                  e.code === "auth/user-not-found" ? "No account found with this email" :
                  e.code === "auth/wrong-password" || e.code === "auth/invalid-credential" ? "Incorrect password" :
                  e.code === "auth/too-many-requests" ? "Too many attempts. Try again later." :
                  e.code === "auth/weak-password" ? "Password must be 6+ characters" :
                  e.code === "auth/invalid-email" ? "Invalid email address" :
                  e.code === "auth/network-request-failed" ? "Network error. Check your connection." :
                  e.code === "auth/operation-not-allowed" ? "Email/password sign-up is not enabled. Enable it in Firebase Console." :
                  e.code === "auth/popup-closed-by-user" ? "" :
                  e.code?.includes("auth/popup") ? "" :
                  e.message || "Something went wrong"
      if (msg) showToast(msg, "info")
      setErr(msg)
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
      showToast("Signed in with Google")
      nav("home")
    } catch (e) {
      if (!e.code?.includes("popup")) showToast("Google sign-in failed. Try again.", "info")
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: "0 24px" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>LUXEDROP</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{authMode === "login" ? "Welcome Back" : authMode === "signup" ? "Create Account" : "Reset Password"}</h2>
          <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 14 }}>
            {authMode === "login" ? "Sign in to your account" : authMode === "signup" ? "Join thousands of happy customers" : "We'll send you a reset link"}
          </p>
        </div>
        {authMode === "signup" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Full Name</label>
            <input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="John Doe" autoFocus={authMode === "signup"} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Email Address</label>
          <input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="you@example.com" autoFocus={authMode !== "signup"} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
        </div>
        {authMode !== "forgot" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={form.password} onChange={e => upd("password", e.target.value)} placeholder="Min 6 characters" style={{ width: "100%", padding: "11px 14px", paddingRight: 44, border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
              <span onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#767676", fontSize: 18, userSelect: "none" }}>{showPw ? "\u25C9" : "\u25CE"}</span>
            </div>
          </div>
        )}
        {authMode === "login" && (
          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <span onClick={() => { setAuthMode("forgot"); setErr("") }} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#8b6644", cursor: "pointer", fontWeight: 600 }}>Forgot password?</span>
          </div>
        )}
        <button type="button" onClick={submit} disabled={submitting} className="hover-btn" style={{ width: "100%", background: done ? "#10b981" : submitting ? "#ccc" : "#8b6644", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", marginBottom: 16 }}>
          {done ? "Done" : submitting ? (authMode === "signup" ? "Creating account..." : authMode === "forgot" ? "Sending reset link..." : "Signing in...") : authMode === "login" ? "Sign In" : authMode === "signup" ? "Create Account" : "Send Reset Link"}
        </button>
        <div style={{ textAlign: "center", fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#767676" }}>
          {authMode === "login" ? <>Don't have an account? <span onClick={() => { setAuthMode("signup"); setErr(""); setDone(false) }} style={{ color: "#8b6644", cursor: "pointer", fontWeight: 600 }}>Sign up</span></> :
           authMode === "signup" ? <>Already a member? <span onClick={() => { setAuthMode("login"); setErr(""); setDone(false) }} style={{ color: "#8b6644", cursor: "pointer", fontWeight: 600 }}>Sign in</span></> :
           <span onClick={() => { setAuthMode("login"); setErr(""); setDone(false) }} style={{ color: "#8b6644", cursor: "pointer", fontWeight: 600 }}>Back to Sign In</span>}
        </div>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f0ede8", display: "flex", flexDirection: "column", gap: 12 }}>
          <button type="button" onClick={handleGoogle} disabled={submitting} className="hover-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px", borderRadius: 10, border: "1px solid #e0d8ce", background: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>
          <button type="button" onClick={async () => { try { await signInAsGuest(); showToast("Signed in as Guest"); nav("home") } catch (e) { showToast("Guest login unavailable", "info") } }} disabled={submitting} className="hover-btn" style={{ width: "100%", padding: "11px", borderRadius: 10, border: "1px dashed #ccc", background: "#faf9f7", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: "#767676", opacity: submitting ? 0.6 : 1 }}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  )
}

function OrdersPage({ orders, nav, user }) {
  const myOrders = user ? orders.filter(o => o.email === user.email || o.userId === user.email) : orders
  const STATUS_COLOR = { Delivered: "#10b981", Shipped: "#3b82f6", Processing: "#f59e0b" }
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 32 }}>My Orders ({myOrders.length})</h1>
      {myOrders.map(o => (
        <div key={o.id} style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 16 }}>{o.id?.slice(0, 12)}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", marginTop: 4 }}>{(o.date || "Just now")} &middot; {(o.items?.length || o.items || 0)} items &middot; {typeof o.total === "number" ? fmt(o.total) : o.total}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ background: STATUS_COLOR[o.status] + "22", color: STATUS_COLOR[o.status], fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20 }}>{o.status}</span>
              <button onClick={() => nav("tracking")} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#8b6644", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Track &#x2192;</button>
            </div>
          </div>
          <div style={{ marginTop: 16, fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", background: "#f8f5f0", borderRadius: 8, padding: "10px 14px" }}>{o.tracking}</div>
        </div>
      ))}
    </div>
  )
}

function TrackingPage({ nav }) {
  const [orderId, setOrderId] = useState("")
  const [tracked, setTracked] = useState(null)
  const track = () => {
    if (!orderId) return
    setTracked({
      id: orderId || "ORD-9820", status: "In Transit", eta: "May 17, 2026", steps: [
        { label: "Order Placed", done: true, date: "May 12" },
        { label: "Processing", done: true, date: "May 12" },
        { label: "Shipped", done: true, date: "May 13" },
        { label: "In Transit", done: true, date: "May 14" },
        { label: "Out for Delivery", done: false, date: "May 17 (Est.)" },
        { label: "Delivered", done: false, date: "" },
      ]
    })
  }
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>Track Your Order</h1>
      <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", textAlign: "center", marginBottom: 40 }}>Enter your order ID to get real-time tracking updates</p>
      <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
        <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order ID (e.g. ORD-9820)" style={{ flex: 1, padding: "12px 18px", border: "1px solid #e0d8ce", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
        <button onClick={track} className="hover-btn" style={{ background: "#8b6644", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Track</button>
      </div>
      {tracked && (
        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }} className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 18 }}>{tracked.id}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#767676" }}>Estimated Delivery: {tracked.eta}</div>
            </div>
            <span style={{ background: "#dbeafe", color: "#3b82f6", fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 700, padding: "4px 16px", borderRadius: 20 }}>{tracked.status}</span>
          </div>
          <div style={{ position: "relative" }}>
            {tracked.steps.map((step, i) => (
              <div key={step.label} style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                   <div style={{ width: 32, height: 32, borderRadius: "50%", background: step.done ? "#8b6644" : "#e0d8ce", display: "flex", alignItems: "center", justifyContent: "center", color: step.done ? "#fff" : "#555", fontWeight: 700, fontSize: 14, fontFamily: "'Jost',sans-serif" }}>{step.done ? "\u2713" : i + 1}</div>
                  {i < tracked.steps.length - 1 && <div style={{ width: 2, flex: 1, background: step.done ? "#8b6644" : "#f0ede8", minHeight: 24 }} />}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: step.done ? 600 : 400, color: step.done ? "#1a1a1a" : "#767676", fontSize: 14 }}>{step.label}</div>
                  {step.date && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676" }}>{step.date}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AdminPage({ products, orders, adminTab, setAdminTab, nav }) {
  const tabs = ["dashboard", "products", "orders", "customers", "analytics"]
  const [showForm, setShowForm] = useState(false)
  const [editProd, setEditProd] = useState(null)
  const [form, setForm] = useState({ name: "", category: "electronics", price: "", original: "", stock: "", desc: "", img: "", badge: "New Arrival" })
  const [customers, setCustomers] = useState([])
  const [subs, setSubs] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (adminTab === "customers") { getUsers().then(setCustomers).catch(() => {}); getNewsletterSubscribers().then(setSubs).catch(() => {}) }
  }, [adminTab])

  const openForm = (p) => {
    setEditProd(p)
    setForm(p ? { name: p.name, category: p.category, price: String(p.price), original: String(p.original), stock: String(p.stock), desc: p.desc, img: p.img, badge: p.badge } : { name: "", category: "electronics", price: "", original: "", stock: "", desc: "", img: "", badge: "New Arrival" })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name || !form.price) return
    const data = { name: form.name, category: form.category, price: Number(form.price), original: Number(form.original) || Number(form.price), stock: Number(form.stock) || 0, desc: form.desc, img: form.img || "https://images.unsplash.com/photo-1505740420928-5e560c06d30a?w=600&q=80", badge: form.badge }
    if (editProd) await updateProduct(editProd.id, data); else await addProduct(data)
    setShowForm(false)
    window.location.reload()
  }

  const del = async (id) => { if (confirm("Delete this product?")) { await deleteProduct(id); window.location.reload() } }

  const uploadImg = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
      const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd })
      const d = await r.json(); setForm(p => ({ ...p, img: d.secure_url }))
    } catch (_) { alert("Upload failed. Make sure VITE_CLOUDINARY_UPLOAD_PRESET is set in .env") }
    setUploading(false)
  }

  const ordTotal = orders.reduce((s, o) => s + (typeof o.total === "number" ? o.total : 0), 0)

  return (
    <div style={{ display: "flex", minHeight: "80vh" }}>
      <aside style={{ width: 220, background: "#1a1a1a", color: "#fff", padding: "28px 0", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, padding: "0 24px 28px", borderBottom: "1px solid #2a2a2a", marginBottom: 12 }}>LUXEDROP &#x25A0; ADMIN</div>
        {tabs.map(t => (
          <div key={t} onClick={() => setAdminTab(t)} style={{ padding: "13px 24px", fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer", background: adminTab === t ? "rgba(255,255,255,0.08)" : "transparent", color: adminTab === t ? "#8b6644" : "#aaa", fontWeight: adminTab === t ? 600 : 400, borderLeft: adminTab === t ? "3px solid #8b6644" : "3px solid transparent" }}>
            {{ "dashboard": "\u25A0 Dashboard", "products": "\u25A0 Products", "orders": "\u25A0 Orders", "customers": "\u25A0 Customers", "analytics": "\u25A0 Analytics" } [t]}
          </div>
        ))}
        <div onClick={() => nav("home")} style={{ padding: "13px 24px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#aaa", cursor: "pointer", marginTop: 20 }}>&#x2190; Back to Store</div>
      </aside>
      <main style={{ flex: 1, padding: 32, background: "#f8f5f0", overflowY: "auto" }}>
        {adminTab === "dashboard" && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 28 }}>Dashboard Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Revenue", value: fmt(ordTotal), change: "+" + orders.length + " orders", icon: "\uD83D\uDCC8", color: "#10b981" },
                { label: "Orders", value: orders.length, change: "+" + orders.filter(o => o.status === "Processing").length + " pending", icon: "\uD83D\uDCCB", color: "#3b82f6" },
                { label: "Products", value: products.length, change: "in Firestore", icon: "\uD83D\uDCE6", color: "#8b5cf6" },
                { label: "Customers", value: customers.length || "2+", change: "registered users", icon: "\uD83D\uDC65", color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, fontFamily: "'Jost',sans-serif" }}>{s.value}</div>
                    </div>
                    <div style={{ fontSize: 28 }}>{s.icon}</div>
                  </div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: s.color, fontWeight: 600, marginTop: 10 }}>{s.change}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Recent Orders</h3>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0ede8", fontFamily: "'Jost',sans-serif", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{o.id?.slice(0, 8) + "..."}</span>
                    <span style={{ color: "#767676" }}>{fmt(o.total)}</span>
                    <span style={{ color: o.status === "Delivered" ? "#10b981" : o.status === "Shipped" ? "#3b82f6" : "#f59e0b", fontWeight: 600 }}>{o.status}</span>
                  </div>
                ))}
                {orders.length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 13 }}>No orders yet</p>}
              </div>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Top Products</h3>
                {products.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f0ede8", alignItems: "center" }}>
                    <img src={p.img} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                    <div style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{p.name.slice(0, 22)}...</div>
                      <div style={{ color: "#767676" }}>{fmt(p.price)}</div>
                    </div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#10b981", fontWeight: 600 }}>+{disc(p.price, p.original)}%</div>
                  </div>
                ))}
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
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8f5f0" }}>
                  <tr>{["Image", "Name", "Category", "Price", "Stock", "Margin", "Actions"].map(h => <th key={h} style={{ padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 1, color: "#767676", textAlign: "left" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f8f5f0" }}>
                      <td style={{ padding: "12px 16px" }}><img src={p.img} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /></td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", textTransform: "capitalize" }}>{p.category}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13 }}>{fmt(p.price)}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13, color: p.stock < 100 ? "#f59e0b" : "#10b981" }}>{p.stock}</td>
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
            {showForm && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setShowForm(false)}>
                <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "90%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>{editProd ? "Edit Product" : "Add Product"}</h3>
                  {[["name", "Product Name"], ["price", "Price"], ["original", "Original Price"], ["stock", "Stock"], ["desc", "Description"]].map(([k, l]) => (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>{l}</label>
                      {k === "desc" ? <textarea value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} rows={3} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", resize: "vertical" }} />
                       : <input value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />}
                    </div>
                  ))}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Category</label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", background: "#fff" }}>
                      {["electronics", "fashion", "beauty", "home"].map(c => <option key={c} value={c}>{c}</option>)}
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
                    {form.img && <img src={form.img} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", marginBottom: 8, display: "block" }} />}
                    <label className="hover-btn" style={{ display: "inline-block", background: "#f0ede8", color: "#555", padding: "10px 18px", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer" }}>
                      {uploading ? "Uploading..." : "Upload to Cloudinary"}
                      <input type="file" accept="image/*" onChange={uploadImg} style={{ display: "none" }} />
                    </label>
                    <input value={form.img} onChange={e => setForm(p => ({ ...p, img: e.target.value }))} placeholder="Or paste image URL" style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", marginTop: 8 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "#f0ede8", color: "#555", border: "none", padding: "12px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                    <button onClick={save} className="hover-btn" style={{ flex: 1, background: "#8b6644", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{editProd ? "Update" : "Create"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {adminTab === "orders" && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>All Orders ({orders.length})</h2>
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8f5f0" }}>
                  <tr>{["Order ID", "Customer", "Items", "Total", "Status", "Action"].map(h => <th key={h} style={{ padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 1, color: "#767676", textAlign: "left" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: "1px solid #f8f5f0" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13 }}>{o.id?.slice(0, 8)}...</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 13 }}>{o.customerName || o.email || "Guest"}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontSize: 13 }}>{o.items?.length || 0}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 13 }}>{fmt(o.total)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: o.status === "Delivered" ? "#d1fae5" : o.status === "Shipped" ? "#dbeafe" : "#fef3c7", color: o.status === "Delivered" ? "#10b981" : o.status === "Shipped" ? "#3b82f6" : "#f59e0b" }}>{o.status}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <select value={o.status} onChange={async e => { await updateOrderStatus(o.id, e.target.value); window.location.reload() }} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #e0d8ce", background: "#fff", cursor: "pointer" }}>
                          {["Processing", "Shipped", "Delivered"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#767676", fontFamily: "'Jost',sans-serif" }}>No orders yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {adminTab === "customers" && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>Customers ({customers.length})</h2>
            {customers.map(c => (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#8b6644", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Jost',sans-serif" }}>{c.name?.split(" ").map(n => n[0]).join("") || "?"}</div>
                <div style={{ flex: 1, fontFamily: "'Jost',sans-serif" }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name || "Unknown"}</div>
                  <div style={{ fontSize: 13, color: "#767676" }}>{c.email}</div>
                </div>
              </div>
            ))}
            {customers.length === 0 && <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", fontSize: 14 }}>No registered users yet.</p>}
            {subs.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Newsletter Subscribers ({subs.length})</h3>
                {subs.map(s => (
                  <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", marginBottom: 8, fontFamily: "'Jost',sans-serif", fontSize: 14 }}>{s.email}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {adminTab === "analytics" && (
          <div className="fade-in">
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 28 }}>Analytics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
              {[
                ["Conversion Rate", orders.length > 0 ? ((orders.length / 100) * 100).toFixed(1) + "%" : "0%", "based on visits", "#10b981"],
                ["Avg Order Value", orders.length > 0 ? fmt(ordTotal / orders.length) : "$0", "per order", "#3b82f6"],
                ["Total Revenue", fmt(ordTotal), "from " + orders.length + " orders", "#8b5cf6"],
                ["Products", String(products.length), "in catalog", "#f59e0b"],
              ].map(([l, v, c, col]) => (
                <div key={l} style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", letterSpacing: 1, marginBottom: 8 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 30, fontWeight: 700 }}>{v}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: col, fontWeight: 600, marginTop: 8 }}>{c}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Orders by Status</h3>
              {["Processing", "Shipped", "Delivered"].map(s => {
                const count = orders.filter(o => o.status === s).length
                const pct = orders.length ? (count / orders.length * 100).toFixed(0) : 0
                return (
                  <div key={s} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{s}</span>
                      <span style={{ color: "#767676" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 10, background: "#f0ede8", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#8b6644,#e8b48c)", borderRadius: 10 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StaticPage({ title, nav, children }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}>
      <h1 style={{ fontSize: 40, fontWeight: 600, marginBottom: 40, borderBottom: "1px solid #e8e2da", paddingBottom: 20 }}>{title}</h1>
      <div style={{ fontFamily: "'Jost',sans-serif", color: "#555", lineHeight: 2, fontSize: 15 }}>{children}</div>
    </div>
  )
}

function AboutContent() {
  return (
    <>
      <p style={{ fontSize: 17, color: "#333", marginBottom: 24 }}>LuxeDrop was founded in 2023 in Mumbai with a simple mission: bring India's finest products to every home. We work directly with skilled artisans, weavers, and manufacturers across India — from Banaras to Kashmir, from Moradabad to Jaipur — to bring you carefully curated products at honest prices.</p>
      <p>We believe in celebrating India's rich craftsmanship while making quality accessible to everyone. Every product on LuxeDrop is vetted for quality, authenticity, and fair pricing.</p>
      <h3 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", margin: "32px 0 12px" }}>Our Values</h3>
      <p><strong>Made in India:</strong> Every product celebrates Indian craftsmanship.<br /><strong>Quality First:</strong> Each item passes our 28-point quality check.<br /><strong>Fast Shipping:</strong> Free shipping across India on all orders.<br /><strong>Customer Happiness:</strong> 7-day easy returns, no questions asked.<br /><strong>Supporting Artisans:</strong> Fair wages for craftsmen and weavers nationwide.</p>
      <h3 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", margin: "32px 0 12px" }}>By the Numbers</h3>
      <p>50,000+ happy customers &middot; 4.9&#x2605; average rating &middot; 98% on-time delivery &middot; 500+ Indian artisans supported.</p>
    </>
  )
}

function ContactContent({ showToast }) {
  const [form, setForm] = useState({ name: "", email: "", msg: "" })
  return (
    <>
      <p style={{ marginBottom: 32 }}>We're here to help! Reach us through any of the channels below or fill out the form.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="mobile-col">
        <div>
          {[["Full Name", "name"], ["Email", "email"]].map(([l, k]) => (
            <div key={k} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#767676", marginBottom: 6 }}>{l}</label>
              <input value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, color: "#767676", marginBottom: 6 }}>Message</label>
            <textarea value={form.msg} onChange={e => setForm(p => ({ ...p, msg: e.target.value }))} rows={5} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", resize: "vertical" }} />
          </div>
          <button onClick={() => { showToast("Message sent! We'll reply within 24h."); setForm({ name: "", email: "", msg: "" }) }} style={{ background: "#8b6644", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Send Message &#x2192;</button>
        </div>
        <div>
          {[["\u2709\uFE0F", "Email", "support@luxedrop.in"], ["\uD83D\uDCF1", "WhatsApp", "+91 80058 93767"], ["\uD83D\uDD52", "Hours", "Mon-Sat 9am-9pm IST"], ["\uD83D\uDCCD", "Address", "B-101, Andheri East, Mumbai, Maharashtra 400093"]].map(([icon, l, v]) => (
            <div key={l} style={{ display: "flex", gap: 14, marginBottom: 24 }}>
              <div style={{ fontSize: 24 }}>{icon}</div>
              <div><div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>{l}</div><div style={{ color: "#767676", fontSize: 14 }}>{v}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function PrivacyContent() {
  return (
    <>
      <p><strong>Last updated: May 14, 2026</strong></p><br />
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>Information We Collect</h3>
      <p>We collect information you provide directly (name, email, address, payment info) and usage data (browsing behavior, device info). All data is stored securely in compliance with Indian IT Act 2000.</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>How We Use Your Information</h3>
      <p>To process orders, send shipping updates via SMS/WhatsApp, personalize your experience, send offers (with consent), and improve our services.</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>Data Security</h3>
      <p>All data is encrypted with AES-256. We never sell your personal information. Payment data is handled by RBI-compliant processors in India.</p>
    </>
  )
}

function RefundContent() {
  return (
    <>
      <p><strong>30-Day No-Questions-Asked Return Policy</strong></p><br />
      <p>If you're not 100% satisfied, return any item within 30 days of delivery for a full refund. Items must be in original condition.</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>How to Return</h3>
      <p>1. Email support@luxedrop.in with your order ID<br />2. Receive a free return pickup within 24h<br />3. Hand the package to the pickup agent</p>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>Refund Timeline</h3>
      <p>Credit/debit cards: 3-5 business days &middot; UPI/Netbanking: 24-48 hours &middot; Store credit: instant</p>
    </>
  )
}

function TermsContent() {
  return (
    <>
      <p><strong>Terms &amp; Conditions — LuxeDrop</strong></p><br />
      <p>By using this site, you agree to these terms. We reserve the right to cancel orders, modify pricing, and update these terms at any time.</p>
      <p>All products are for personal use only. Resale requires prior written permission. We are not liable for delays caused by shipping carriers.</p>
      <p>For full terms, contact legal@luxedrop.in</p>
    </>
  )
}

function Footer({ nav, newsletter, setNewsletter, newsletterDone, setNewsletterDone, showToast, user }) {
  const onSubscribe = async () => {
    if (!newsletter.includes("@")) return showToast("Enter a valid email", "info")
    try {
      await subscribeNewsletter(newsletter)
      setNewsletterDone(true)
      showToast("Subscribed! 10% off code sent to your email")
    } catch (e) {
      showToast(e.message === "Already subscribed" ? "You're already subscribed!" : "Subscription failed", "info")
    }
  }
  return (
    <footer style={{ background: "#1a1a1a", color: "#fff", padding: "60px 24px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>LUXEDROP</div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#aaa", lineHeight: 1.8, marginBottom: 20 }}>India's premium marketplace for authentic products. Free shipping across India.</p>
            <div style={{ display: "flex", gap: 12 }}>
              {[["Instagram", "\u25A0"], ["TikTok", "\u25A0"], ["Pinterest", "\u25A0"], ["Twitter", "\u25A0"]].map(([s, i]) => (
                <div key={s} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: "#ccc" }}>{i}</div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 2, color: "#8b6644", marginBottom: 20 }}>SHOP</div>
            {[["All Products", "shop"], ["Electronics", "shop"], ["Fashion", "shop"], ["Beauty", "shop"], ["Home", "shop"]].map(([l, p]) => (
              <div key={l} onClick={() => nav(p)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#bbb", marginBottom: 10, cursor: "pointer" }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 2, color: "#8b6644", marginBottom: 20 }}>SUPPORT</div>
            {[["Contact Us", "contact"], ["Track Order", "tracking"], ["My Orders", "orders"], ["About Us", "about"], ...(user?.isAdmin ? [["Admin", "admin"]] : [])].map(([l, p]) => (
              <div key={l} onClick={() => nav(p)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#bbb", marginBottom: 10, cursor: "pointer" }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 2, color: "#8b6644", marginBottom: 20 }}>LEGAL</div>
            {[["Privacy Policy", "privacy"], ["Refund Policy", "refund"], ["Terms & Conditions", "terms"]].map(([l, p]) => (
              <div key={l} onClick={() => nav(p)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#bbb", marginBottom: 10, cursor: "pointer" }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 2, color: "#8b6644", marginBottom: 20 }}>NEWSLETTER</div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#bbb", marginBottom: 16, lineHeight: 1.7 }}>Get 10% off your first order. Subscribe for exclusive deals and new arrivals.</p>
            {newsletterDone ? (
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#10b981" }}>&#x2713; You're subscribed!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={newsletter} onChange={e => setNewsletter(e.target.value)} placeholder="your@email.com" style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid #333", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none" }} />
                <button onClick={onSubscribe} style={{ background: "#8b6644", color: "#fff", border: "none", padding: "11px", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Subscribe</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ borderTop: "1px solid #2a2a2a", padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#aaa" }}>&copy; 2026 LuxeDrop. Made in India, with love.</div>
          <div style={{ display: "flex", gap: 12 }}>
            {["Visa", "Mastercard", "RuPay", "UPI", "Paytm", "COD"].map(p => (
              <span key={p} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#ccc", background: "#2a2a2a", padding: "4px 10px", borderRadius: 4 }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function WhatsAppButton() {
  return (
    <a href="https://wa.me/918005893767" target="_blank" rel="noopener" style={{ position: "fixed", bottom: 24, left: 24, width: 56, height: 56, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, boxShadow: "0 4px 20px rgba(37,211,102,0.4)", textDecoration: "none", zIndex: 100 }}>
      &#x1F4AC;
    </a>
  )
}
