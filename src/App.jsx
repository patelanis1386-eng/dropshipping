import { useState, useEffect, useRef, Fragment } from "react"
import { auth, db, onAuthStateChanged, signUp, signIn, logOut, resetPassword, signInWithGoogle, signInAsGuest, getProducts, getProductById, addProduct, updateProduct, deleteProduct, getOrders, createOrder, updateOrder, updateOrderStatus, getReviews, addReview, subscribeNewsletter, getCategories, getUsers, getNewsletterSubscribers, getBanner, updateBanner, getProductCategories, addProductCategory, deleteProductCategory, getNextOrderNumber, getOrderByOrderNumber, updateOrderTracking, deleteOrder, getSavedAddress, saveUserAddress, getShippingSettings, updateShippingSettings, getUserCart, saveUserCart, getUserWishlist, saveUserWishlist, saveUserOrders, getUserOrders } from "./firebase"
import { SEED_REVIEWS, SEED_CATEGORIES, fmt, disc } from "./data"
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore"

const Stars = ({ n }) => "\u2605".repeat(Math.floor(n)) + (n % 1 >= 0.5 ? "\u00BD" : "") + "\u25A0".repeat(5 - Math.ceil(n))
const LOCAL_PRODUCTS_KEY = "luxedrop_local_products"
const CART_KEY = "luxedrop_cart"
const WISHLIST_KEY = "luxedrop_wishlist"

const readLocalProducts = () => {
  if (typeof localStorage === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY) || "[]")
  } catch (_) {
    return []
  }
}

const writeLocalProducts = (products) => {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products))
}

const mergeProducts = (...groups) => {
  const seen = new Set()
  return groups.flat().filter((p) => {
    if (!p?.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

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

  const [products, setProducts] = useState(() => readLocalProducts())
  const [reviews, setReviews] = useState(SEED_REVIEWS)
  const [categories, setCategories] = useState(SEED_CATEGORIES)
  const [banner, setBanner] = useState(null)
  const [shipping, setShipping] = useState({ freeShipping: true, cost: 0, label: "Free Shipping" })
  const [productCategories, setProductCategories] = useState(["fashion", "electronics", "beauty", "home"])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, name: fbUser.displayName || fbUser.email.split("@")[0], email: fbUser.email })
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
    if (u.email !== "patelanis5304@gmail.com") return alert("Only patelanis5304@gmail.com can claim admin")
    try {
      await setDoc(doc(db, "users", u.uid), { isAdmin: true }, { merge: true })
      alert("Admin role set! Reload the page.")
      setUser(prev => prev ? { ...prev, isAdmin: true } : prev)
    } catch (e) {
      alert("Failed: " + e.message)
    }
  }

  const handleLogout = async () => {
    const uid = user?.uid
    if (uid) { saveUserCart(uid, cart).catch(() => {}); saveUserWishlist(uid, wishlist).catch(() => {}); saveUserOrders(uid, orders).catch(() => {}) }
    await logOut()
    setCart([])
    setWishlist([])
    setOrders([])
    localStorage.removeItem(CART_KEY)
    localStorage.removeItem(WISHLIST_KEY)
    showToast("Signed out")
  }

  useEffect(() => {
    const load = async () => {
      const localProducts = readLocalProducts()
      try {
        const [fp, fr, fc, fb, fpc, fs] = await Promise.all([getProducts(), getReviews(), getCategories(), getBanner(), getProductCategories(), getShippingSettings()])
        setProducts(mergeProducts(localProducts, fp))
        if (fr.length) setReviews(fr)
        if (fc.length) setCategories(fc)
        if (fb) setBanner(fb)
        if (fpc.length) setProductCategories(fpc.map(c => c.name))
        if (fs) setShipping(fs)
      } catch (_) {
        setProducts(localProducts)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const validIds = new Set(products.map(p => p.id))
    setCart(prev => prev.filter(i => validIds.has(i.id)))
    setWishlist(prev => prev.filter(i => validIds.has(i.id)))
  }, [products])

  useEffect(() => {
    if (!user) { setOrders([]); return }
    if (user?.isAdmin) {
      getOrders().then(setOrders).catch(() => setOrders([]))
    } else {
      getUserOrders(user.uid).then(o => { if (o?.length) setOrders(o) }).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    if (user?.uid) return
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart, user?.uid])
  useEffect(() => {
    if (user?.uid) return
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist))
  }, [wishlist, user?.uid])

  useEffect(() => {
    if (user?.uid) return
    try {
      const c = JSON.parse(localStorage.getItem(CART_KEY) || "[]")
      const w = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]")
      if (c.length) setCart(c)
      if (w.length) setWishlist(w)
    } catch (_) {}
  }, [user?.uid])

  const firestoreLoaded = useRef(false)
  useEffect(() => {
    if (!user?.uid) { firestoreLoaded.current = false; return }
    firestoreLoaded.current = false
    localStorage.removeItem(CART_KEY)
    localStorage.removeItem(WISHLIST_KEY)
    ;(async () => {
      try {
        const [fcart, fwish] = await Promise.all([getUserCart(user.uid), getUserWishlist(user.uid)])
        if (fcart && fcart.length > 0) setCart(fcart)
        else setCart([])
        if (fwish && fwish.length > 0) setWishlist(fwish)
        else setWishlist([])
      } catch (_) {}
      firestoreLoaded.current = true
    })()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || !firestoreLoaded.current) return
    const t = setTimeout(() => saveUserCart(user.uid, cart).catch(() => {}), 500)
    return () => clearTimeout(t)
  }, [cart, user?.uid])

  useEffect(() => {
    if (!user?.uid || !firestoreLoaded.current) return
    const t = setTimeout(() => saveUserWishlist(user.uid, wishlist).catch(() => {}), 500)
    return () => clearTimeout(t)
  }, [wishlist, user?.uid])

  useEffect(() => {
    if (!user?.uid || !firestoreLoaded.current || user?.isAdmin) return
    const t = setTimeout(() => saveUserOrders(user.uid, orders).catch(() => {}), 500)
    return () => clearTimeout(t)
  }, [orders, user?.uid, user?.isAdmin])

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleClaimAdmin = async () => {
    const u = auth.currentUser
    if (!u) return
    if (u.email !== "patelanis5304@gmail.com") return
    try {
      await setDoc(doc(db, "users", u.uid), { isAdmin: true }, { merge: true })
      setUser(prev => prev ? { ...prev, isAdmin: true } : prev)
    } catch (e) {
      alert("Admin claim failed: " + e.message + "\n\nTry running: makeMeAdmin() in console instead.")
    }
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
        .show-mobile { display: none !important; }
        @media (max-width: 900px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          .mobile-col { flex-direction: column !important; }
          .mobile-full { width: 100% !important; }
          h1:not(.hero-text h1) { font-size: 24px !important; }
          h2 { font-size: 22px !important; }
          nav > div { padding: 0 12px !important; height: 58px !important; gap: 12px !important; }
          nav input { font-size: 13px !important; }
          section.hero-section { padding: 40px 16px !important; }
          section.hero-section h1 { font-size: 36px !important; }
          section.hero-section p { font-size: 15px !important; }
          .hero-stats { gap: 20px !important; margin-top: 32px !important; }
          .hero-stats > div > div:first-child { font-size: 18px !important; }
          .product-grid { grid-template-columns: repeat(2,1fr) !important; gap: 12px !important; }
          .product-card-body { padding: 10px !important; }
          .product-name { font-size: 13px !important; }
          .product-price { font-size: 15px !important; }
          section.banner-section { margin: 0 12px !important; padding: 32px 20px !important; border-radius: 16px !important; }
          section.banner-section h2 { font-size: 24px !important; }
          div.review-grid { grid-template-columns: 1fr !important; }
          .product-page div.mobile-col { grid-template-columns: 1fr !important; gap: 24px !important; }
          .product-page div.mobile-col img + div img { width: 56px !important; height: 56px !important; }
          .product-info h1 { font-size: 22px !important; }
          .cart-layout { grid-template-columns: 1fr !important; }
          .cart-item { gap: 12px !important; }
          .cart-item img { width: 64px !important; height: 64px !important; }
          .checkout-layout { grid-template-columns: 1fr !important; }
          .admin-page { flex-direction: column !important; }
          .admin-sidebar { width: 100% !important; display: flex !important; overflow-x: auto !important; padding: 8px 0 !important; }
          .admin-sidebar { height: auto !important; position: relative !important; top: auto !important; flex-direction: row !important; padding: 0 !important; gap: 0 !important; overflow-x: auto !important; width: 100% !important; }
          .admin-sidebar > div { flex-shrink: 0 !important; white-space: nowrap !important; padding: 10px 12px !important; font-size: 12px !important; background: transparent !important; border-right: none !important; border-bottom: 3px solid transparent !important; gap: 4px !important; }
          .admin-main { padding: 16px !important; }
          .admin-sidebar .hide-mobile { display: none !important; }
          .admin-table-wrap { overflow-x: auto !important; }
          .admin-table-wrap table { min-width: 600px !important; }
          .admin-orders-table { overflow-x: auto !important; }
          .admin-orders-table table { min-width: 650px !important; }
          div.admin-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 12px !important; }
          div.admin-dashboard-grid { grid-template-columns: 1fr !important; }
          .admin-page main input, .admin-page main select { width: 100% !important; max-width: 100% !important; }
          .admin-page main > div > div:first-child > div { flex: 1 !important; }
          .admin-page main > div > div:first-child > div input { width: 100% !important; }
          .admin-page main > div > div:first-child > div select { width: 100% !important; }
          .modal-inner { width: 100% !important; max-width: 100% !important; min-height: 100vh !important; max-height: 100vh !important; border-radius: 0 !important; padding: 24px 16px !important; }
          footer > div > div:first-child { grid-template-columns: repeat(2,1fr) !important; gap: 24px !important; }
          .page-content { padding: 24px 16px !important; }
          .shop-page { padding: 24px 16px !important; }
          .static-page { padding: 32px 16px !important; }
          .static-page h1 { font-size: 28px !important; }
          .tracking-page { padding: 32px 20px !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .product-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          section.hero-section { padding: 28px 12px !important; }
          section.hero-section h1 { font-size: 28px !important; }
          .hero-buttons { flex-direction: column !important; gap: 10px !important; }
          .hero-buttons button { width: 100% !important; }
          .hero-stats { gap: 16px !important; flex-wrap: wrap !important; }
          .hero-stats > div { flex: 1 1 40% !important; }
          .product-card-body { padding: 8px !important; }
          .product-name { font-size: 12px !important; }
          .product-price { font-size: 14px !important; }
          .admin-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
          .admin-main { padding: 12px !important; }
          .admin-main h2 { font-size: 20px !important; }
          .admin-main .admin-table-wrap table { min-width: 500px !important; }
          .checkout-steps { gap: 6px !important; flex-wrap: wrap !important; }
          .checkout-steps > div { font-size: 12px !important; }
          .checkout-steps > div > div { width: 24px !important; height: 24px !important; font-size: 11px !important; }
          nav > div { gap: 8px !important; }
          .tracking-page input { font-size: 14px !important; }
          .modal-inner { padding: 20px 14px !important; }
          .admin-order-detail { grid-template-columns: 1fr !important; }
          .admin-analytics-grid { grid-template-columns: 1fr !important; }
          .admin-sidebar .sidebar-label { display: none !important; }
          .admin-sidebar > div { padding: 10px 8px !important; font-size: 11px !important; }
          .admin-sidebar > div > span:first-child { font-size: 18px !important; }
        }
      `}</style>

      {authLoading && <div style={{ position: "fixed", inset: 0, background: "#faf9f7", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "#8b6644" }}>Loading...</div>}
      <Navbar cart={cart} cartCount={cartCount} user={user} nav={nav} page={page} searchQ={searchQ} setSearchQ={setSearchQ} handleLogout={handleLogout} handleClaimAdmin={handleClaimAdmin} />

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <main>
        {page === "home"     && <HomePage products={products} reviews={reviews} categories={categories} banner={banner} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} setSearchQ={setSearchQ} newsletter={newsletter} setNewsletter={setNewsletter} newsletterDone={newsletterDone} setNewsletterDone={setNewsletterDone} showToast={showToast} />}
        {page === "shop"     && <ShopPage products={filteredProducts} allProducts={products} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} catFilter={catFilter} setCatFilter={setCatFilter} searchQ={searchQ} setSearchQ={setSearchQ} sortBy={sortBy} setSortBy={setSortBy} productCategories={productCategories} />}
        {page === "product"  && <ProductPage product={selectedProduct} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} products={products} reviews={reviews} showToast={showToast} />}
        {page === "cart"     && <CartPage cart={cart} setCart={setCart} removeCart={removeCart} cartTotal={cartTotal} nav={nav} shipping={shipping} />}
        {page === "checkout" && <CheckoutPage cart={cart} cartTotal={cartTotal} payMethod={payMethod} setPayMethod={setPayMethod} nav={nav} showToast={showToast} setCart={setCart} user={user} orders={orders} setOrders={setOrders} shipping={shipping} />}
        {page === "wishlist" && <WishlistPage wishlist={wishlist} toggleWish={toggleWish} addCart={addCart} nav={nav} />}
        {page === "auth"     && <AuthPage setUser={setUser} authMode={authMode} setAuthMode={setAuthMode} nav={nav} showToast={showToast} signUp={signUp} signIn={signIn} resetPassword={resetPassword} signInWithGoogle={signInWithGoogle} signInAsGuest={signInAsGuest} />}
        {page === "orders"   && <OrdersPage orders={orders} setOrders={setOrders} nav={nav} user={user} />}
        {page === "tracking" && <TrackingPage nav={nav} />}
        {page === "admin"    && user?.isAdmin && <AdminPage products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} shipping={shipping} setShipping={setShipping} banner={banner} setBanner={setBanner} productCategories={productCategories} setProductCategories={setProductCategories} adminTab={adminTab} setAdminTab={setAdminTab} nav={nav} showToast={showToast} cart={cart} setCart={setCart} wishlist={wishlist} setWishlist={setWishlist} />}
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

function Navbar({ cart, cartCount, user, nav, page, searchQ, setSearchQ, handleLogout, handleClaimAdmin }) {
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  const mobileNav = (p) => { setMobileMenuOpen(false); nav(p) }

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 200, background: scrolled ? "rgba(250,249,247,0.97)" : "#faf9f7", borderBottom: scrolled ? "1px solid #ede8e0" : "none", transition: "all 0.3s" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 68, gap: 24 }}>
        <div onClick={() => nav("home")} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700, letterSpacing: 2, cursor: "pointer", whiteSpace: "nowrap" }}>
          LUXE<span style={{ color: "#a67a54" }}>DROP</span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, background: "#f3efe9", borderRadius: 10, padding: "8px 14px", maxWidth: 400 }} className="hide-mobile">
          <span style={{ color: "#767676", fontSize: 14 }}>&#x1F50D;</span>
          <input value={searchQ} onChange={e => { setSearchQ(e.target.value); nav("shop") }} placeholder="Search products..." style={{ flex: 1, border: "none", background: "none", fontFamily: "'Jost',sans-serif", fontSize: 13, outline: "none", color: "#333" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }} className="hide-mobile">
          {[["Home", "home"], ["Shop", "shop"], ["Trending", "shop"], ["Orders", "orders"], ["Track", "tracking"]].map(([l, p]) => (
            <span key={l} className="nav-link" onClick={() => nav(p)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>{l}</span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="nav-link show-mobile" onClick={() => nav("shop")} style={{ fontSize: 18, position: "relative" }}>&#x1F50D;</span>
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
                  {user && !user.isAdmin && user.email === "patelanis5304@gmail.com" && <div onClick={async () => { handleClaimAdmin(); setShowUserMenu(false) }} style={{ padding: "12px 18px", fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer", color: "#8b6644", borderTop: "1px solid #f0ede8", transition: "background 0.15s" }} onMouseEnter={e => e.target.style.background = "#f8f5f0"} onMouseLeave={e => e.target.style.background = "transparent"}>Claim Admin</div>}
                  <div onClick={() => { setShowUserMenu(false); handleLogout() }} style={{ padding: "12px 18px", fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: "pointer", color: "#dc2626", borderTop: "1px solid #f0ede8", transition: "background 0.15s" }} onMouseEnter={e => e.target.style.background = "#fef2f2"} onMouseLeave={e => e.target.style.background = "transparent"}>Sign Out</div>
                </div>
              )}
            </div>
          ) : (
            <span className="nav-link" onClick={() => nav("auth")} style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, background: "#1a1a1a", color: "#fff", padding: "8px 14px", borderRadius: 8 }}>
              Sign In
            </span>
          )}
          <div className="show-mobile" onClick={() => setMobileMenuOpen(true)} style={{ fontSize: 22, cursor: "pointer", color: "#1a1a1a", padding: 4, userSelect: "none" }}>&#x2630;</div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500 }} onClick={() => setMobileMenuOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 280, background: "#fff", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)", zIndex: 501, animation: "slideIn 0.25s ease", padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>LUXEDROP</div>
              <span onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 24, cursor: "pointer", color: "#767676", userSelect: "none" }}>&#x2715;</span>
            </div>
            {[["Home", "home"], ["Shop", "shop"], ["Trending", "shop"], ["Orders", "orders"], ["Track Order", "tracking"], ["Wishlist", "wishlist"], ["Cart", "cart"], ["About Us", "about"], ["Contact Us", "contact"], ...(user?.isAdmin ? [["Admin Panel", "admin"]] : [])].map(([l, p]) => (
              <div key={l} onClick={() => mobileNav(p)} style={{ fontFamily: "'Jost',sans-serif", fontSize: 16, fontWeight: 500, padding: "14px 0", borderBottom: "1px solid #f0ede8", cursor: "pointer", color: "#333" }}>{l}</div>
            ))}
            {user && <div onClick={() => { setMobileMenuOpen(false); handleLogout() }} style={{ fontFamily: "'Jost',sans-serif", fontSize: 16, fontWeight: 500, padding: "14px 0", cursor: "pointer", color: "#dc2626", marginTop: "auto" }}>Sign Out</div>}
            {!user && <div onClick={() => mobileNav("auth")} style={{ fontFamily: "'Jost',sans-serif", fontSize: 16, fontWeight: 600, padding: "14px 0", cursor: "pointer", color: "#8b6644", marginTop: "auto" }}>Sign In</div>}
          </div>
        </div>
      )}
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

function HomePage({ products, reviews, categories, banner, nav, addCart, toggleWish, wishlist, setSearchQ, newsletter, setNewsletter, newsletterDone, setNewsletterDone, showToast }) {
  const featured = products.filter(p => ["Best Seller", "Editor's Pick", "Top Rated", "New Arrival"].includes(p.badge))
  const trending = products.filter(p => ["Trending", "Hot Deal"].includes(p.badge))

  return (
    <div>
      <section className="hero-section" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2418 50%, #3d2f20 100%)", color: "#fff", padding: "80px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div className="hero-text">
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 4, color: "#8b6644", marginBottom: 16 }}>INDIAN DROPSHIPPING</div>
            <h1 style={{ fontSize: "clamp(40px,6vw,72px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1 }}>
              Discover<br /><em style={{ fontStyle: "italic", color: "#8b6644" }}>Bharat's</em><br />Finest
            </h1>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 16, color: "#ccc", maxWidth: 600, lineHeight: 1.7, marginBottom: 32, margin: "0 auto 32px" }}>
              Premium products from across India. Handpicked for quality, delivered to your doorstep.
            </p>
            <div className="hero-buttons" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <button onClick={() => nav("shop")} className="hover-btn" style={{ background: "#8b6644", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Shop Now &#x2192;</button>
              <button onClick={() => nav("tracking")} className="hover-btn" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "14px 32px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>Track Order</button>
            </div>

          </div>
        </div>
      </section>

      <section style={{ background: "#fff", borderBottom: "1px solid #ede8e0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "center", gap: "clamp(20px,4vw,60px)", flexWrap: "wrap" }}>
          {[["\uD83D\uDD04", "Easy Returns", "7-day policy"], ["\uD83D\uDD12", "Secure Pay", "UPI & Cards"], ["\uD83C\uDF1F", "Premium Quality", "Vetted artisans"]].map(([icon, t, s]) => (
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
          {categories.map(cat => {
            const count = cat.productCategory ? products.filter(p => p.category === cat.productCategory).length : 0
            return (
            <div key={cat.name} onClick={() => { setSearchQ(""); nav("shop") }} className="hover-lift" style={{ flex: "0 0 160px", background: cat.color + "33", borderRadius: 20, padding: "28px 20px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{cat.icon}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>{cat.name}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "rgba(0,0,0,0.5)", marginTop: 4 }}>{count} items</div>
            </div>
            )
          })}
        </div>
      </section>

      <section style={{ padding: "20px 24px 60px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader title="Featured Products" sub="Handpicked for quality and value" action={{ label: "View All", fn: () => nav("shop") }} />
        <ProductGrid products={featured} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
      </section>

      <section className="banner-section" style={{ background: banner?.bgColor || "linear-gradient(135deg, #8b6644, #e8a87c)", margin: "0 24px", borderRadius: 24, padding: "48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: 4, color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>{banner?.label || "MEGA FESTIVE SALE"}</div>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", color: "#fff", fontWeight: 300, marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: banner?.title || "Up to <strong>60% Off</strong> on Indian Brands" }} />
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 28 }} dangerouslySetInnerHTML={{ __html: banner?.subtitle || "Use code <strong>LUXE50</strong> for extra 10% off" }} />
        <button onClick={() => nav("shop")} className="hover-btn" style={{ background: "#fff", color: "#8b6644", border: "none", padding: "14px 36px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{banner?.btnText || "Shop Sale"} &#x2192;</button>
      </section>

      <section style={{ padding: "60px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader title="Trending Now" sub="What everyone is buying this week" action={{ label: "See All", fn: () => nav("shop") }} />
        <ProductGrid products={trending} nav={nav} addCart={addCart} toggleWish={toggleWish} wishlist={wishlist} />
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
    <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 20 }}>
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
      <div className="product-card-body" style={{ padding: 16 }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: "#767676", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }} className="product-category">{p.category}</div>
        <div onClick={() => nav("product", { product: p })} className="product-name" style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
        <div style={{ color: "#8b6644", fontSize: 12, fontFamily: "'Jost',sans-serif", marginBottom: 10 }}>{"\u2605".repeat(Math.floor(p.rating))} ({p.reviews.toLocaleString()})</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="product-price" style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 17, color: "#1a1a1a" }}>{fmt(p.price)}</span>
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

function ShopPage({ products, allProducts, nav, addCart, toggleWish, wishlist, catFilter, setCatFilter, searchQ, setSearchQ, sortBy, setSortBy, productCategories }) {
  return (
    <div className="shop-page" style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 8 }}>All Products</h1>
      <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", marginBottom: 32 }}>Showing {products.length} of {allProducts.length} products</p>
      <div style={{ display: "flex", gap: 24 }} className="mobile-col">
        <aside style={{ width: 200, flexShrink: 0 }} className="hide-mobile">
          <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: 1, marginBottom: 14, color: "#767676" }}>CATEGORIES</div>
          {["all", ...productCategories].map(cat => (
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
              {["all", ...productCategories].map(cat => (
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
    <div className="product-page" style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
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
        <div className="product-info">
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

function CartPage({ cart, setCart, removeCart, cartTotal, nav, shipping }) {
  const shippingCost = cartTotal >= 999 ? 0 : (shipping?.freeShipping ? 0 : (shipping?.cost || 0))
  const shippingLabel = cartTotal >= 999 ? "FREE" : (shipping?.freeShipping ? "FREE" : fmt(shippingCost))
  const isFree = cartTotal >= 999 || shipping?.freeShipping
  const total = cartTotal + cartTotal * 0.08 + (isFree ? 0 : (shipping?.cost || 0))
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
        <div className="cart-layout mobile-col" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
          <div>
            {cart.map(item => (
              <div key={item.id} className="cart-item" style={{ display: "flex", gap: 16, padding: "20px 0", borderBottom: "1px solid #f0ede8", alignItems: "center" }}>
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
            {[["Subtotal", fmt(cartTotal)], ["Shipping", shippingLabel], ["GST (8%)", fmt(cartTotal * 0.08)]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#666", marginBottom: 12 }}>
                <span>{k}</span><span style={{ color: v === "FREE" ? "#10b981" : "#333", fontWeight: v === "FREE" ? 600 : 400 }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #e0d8ce", paddingTop: 16, marginTop: 8, display: "flex", justifyContent: "space-between", fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
              <span>Total</span><span>{fmt(total)}</span>
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

function CheckoutPage({ cart, cartTotal, payMethod, setPayMethod, nav, showToast, setCart, user, shipping, setOrders }) {
  const INDIAN_STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"]
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" })
  useEffect(() => { if (user?.uid) getSavedAddress(user.uid).then(a => { if (a) setForm(f => ({ ...f, ...a })) }).catch(() => {}) }, [user])
  const [placing, setPlacing] = useState(false)
  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const isFreeShip = cartTotal >= 999 || shipping?.freeShipping
  const shippingCost = isFreeShip ? 0 : (shipping?.cost || 0)
  const total = cartTotal + cartTotal * 0.08 + shippingCost
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const placeOrder = async () => {
    if (!form.name || !form.email || !form.phone || !form.address || !form.city || !form.state || !form.pincode) return showToast("Please fill all fields", "info")
    if (!/^\d{10}$/.test(form.phone)) return showToast("Enter a valid 10-digit phone number", "info")
    if (!/^\d{6}$/.test(form.pincode)) return showToast("Enter a valid 6-digit pincode", "info")
    setPlacing(true)
    try {
      const orderNumber = await getNextOrderNumber()
      if (user?.uid) saveUserAddress(user.uid, { name: form.name, email: form.email, phone: form.phone, address: form.address, city: form.city, state: form.state, pincode: form.pincode }).catch(() => {})
      const orderId = await createOrder({
        orderNumber,
        userId: user?.uid || "guest",
        customerName: form.name,
        email: form.email,
        phone: form.phone,
        address: `${form.address}, ${form.city}, ${form.state}, ${form.pincode}, India`,
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, img: i.img })),
        total,
        status: "Pending",
        paymentMethod: payMethod,
        trackingNumber: "",
        carrier: "",
        estimatedDelivery: "",
        trackingSteps: [
          { label: "Order Placed", done: true, date: today },
          { label: "Processing", done: false, date: "" },
          { label: "Shipped", done: false, date: "" },
          { label: "In Transit", done: false, date: "" },
          { label: "Out for Delivery", done: false, date: "" },
          { label: "Delivered", done: false, date: "" },
        ],
      })
      const newOrder = { id: orderId, orderNumber, userId: user?.uid || "guest", customerName: form.name, email: form.email, phone: form.phone, address: `${form.address}, ${form.city}, ${form.state}, ${form.pincode}, India`, items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, img: i.img })), total, status: "Pending", paymentMethod: payMethod, date: today, trackingNumber: "", carrier: "", estimatedDelivery: "", trackingSteps: [{ label: "Order Placed", done: true, date: today }, { label: "Processing", done: false, date: "" }, { label: "Shipped", done: false, date: "" }, { label: "In Transit", done: false, date: "" }, { label: "Out for Delivery", done: false, date: "" }, { label: "Delivered", done: false, date: "" }] }
      setOrders(prev => [newOrder, ...prev])
      if (user?.uid) { const updated = [newOrder, ...orders]; saveUserOrders(user.uid, updated).catch(() => {}) }
      setCart([])
      showToast("Order placed successfully! Your order number is " + orderNumber)
      nav("orders")
    } catch (e) {
      console.error("placeOrder error:", e)
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
      <div className="checkout-steps" style={{ display: "flex", gap: 0, marginBottom: 40 }}>
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
      <div className="checkout-layout mobile-col" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
        <div>
          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Shipping Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Full Name</label>
                  <input type="text" value={form.name} onChange={e => upd("name", e.target.value)} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Email Address</label>
                  <input type="email" value={form.email} onChange={e => upd("email", e.target.value)} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => upd("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Street Address</label>
                <input type="text" value={form.address} onChange={e => upd("address", e.target.value)} placeholder="House / Flat / Street" style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>City</label>
                  <input type="text" value={form.city} onChange={e => upd("city", e.target.value)} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Pincode</label>
                  <input type="text" value={form.pincode} onChange={e => upd("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit pincode" style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>State</label>
                <select value={form.state} onChange={e => upd("state", e.target.value)} style={{ width: "100%", padding: "11px 14px", border: "1px solid #e0d8ce", borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={() => setStep(2)} className="hover-btn" style={{ width: "100%", background: "#1a1a1a", color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Continue to Payment &#x2192;</button>
            </div>
          )}
          {step === 2 && (
            <div className="fade-in">
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Payment Method</h3>
              {[
                { id: "stripe", label: "Credit / Debit Card", icon: "\uD83D\uDCB3", sub: "Visa, Mastercard, RuPay" },
                { id: "razorpay", label: "UPI / GPay / PhonePe", icon: "\uD83C\uDFE6", sub: "Instant payment via UPI apps" },
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
            {[["Subtotal", fmt(cartTotal)], ["Shipping", isFreeShip ? "FREE" : fmt(shippingCost)], ["GST (8%)", fmt(cartTotal * 0.08)]].map(([k, v]) => (
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
    if (v) {
      setErr(v)
      showToast(v, "info")
      return
    }
    setSubmitting(true)
    setErr("")
    try {
      if (authMode === "login") {
        await signIn(form.email, form.password)
        showToast("Welcome back!")
        nav("home")
      } else if (authMode === "signup") {
        await signUp(form.email, form.password, form.name)
        setUser({ name: form.name, email: form.email })
        setDone(true)
        showToast("Account created! You're now signed in.")
      } else {
        await resetPassword(form.email)
        showToast("Password reset link sent to your email", "info")
        setAuthMode("login")
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
                  e.code === "auth/configuration-not-found" ? "Firebase Auth is not configured for this project." :
                  e.code === "auth/popup-closed-by-user" ? "" :
                  e.code?.includes("auth/popup") ? "" :
                  e.message || "Something went wrong"
      if (msg) showToast(msg, "info")
      setErr(msg)
    } finally {
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
        {err && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 8, padding: "10px 12px", fontFamily: "'Jost',sans-serif", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
            {err}
          </div>
        )}
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

function OrdersPage({ orders, nav, user, setOrders }) {
  useEffect(() => {
    if (!user?.uid || user?.isAdmin) return
    getUserOrders(user.uid).then(o => { if (o?.length) setOrders(o) }).catch(() => {})
  }, [user?.uid])
  const myOrders = user ? orders.filter(o => o.email === user.email || o.userId === user.email) : orders
  const STATUS_COLOR = { Pending: "#f59e0b", Confirmed: "#3b82f6", Processing: "#8b5cf6", Shipped: "#06b6d4", Delivered: "#10b981", Cancelled: "#ef4444" }
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 32 }}>My Orders ({myOrders.length})</h1>
      {myOrders.map(o => (
        <div key={o.id} style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 16 }}>{o.orderNumber || o.id?.slice(0, 12)}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", marginTop: 4 }}>{(o.date || "Just now")} &middot; {(o.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0)} items &middot; {typeof o.total === "number" ? fmt(o.total) : o.total}</div>
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
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const track = async () => {
    if (!orderId.trim()) return
    setLoading(true)
    setNotFound(false)
    setTracked(null)
    try {
      const val = orderId.trim().toUpperCase()
      const order = val.length === 10 ? await getOrderByOrderNumber(val) : null
      if (order) {
        setTracked(order)
      } else {
        setNotFound(true)
      }
    } catch (e) {
      setNotFound(true)
    }
    setLoading(false)
  }
  const STATUS_COLOR = { Pending: "#f59e0b", Confirmed: "#3b82f6", Processing: "#8b5cf6", Shipped: "#06b6d4", "In Transit": "#8b5cf6", Delivered: "#10b981", Cancelled: "#ef4444" }
  return (
    <div className="tracking-page" style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>Track Your Order</h1>
      <p style={{ fontFamily: "'Jost',sans-serif", color: "#767676", textAlign: "center", marginBottom: 40 }}>Enter your order number to get real-time tracking updates</p>
      <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
        <input value={orderId} onChange={e => setOrderId(e.target.value)} onKeyDown={e => e.key === "Enter" && track()} placeholder="Enter 10-digit order number (e.g. AX3K9M2P1Q)" style={{ flex: 1, padding: "12px 18px", border: "1px solid #e0d8ce", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontSize: 14, outline: "none" }} />
        <button onClick={track} className="hover-btn" style={{ background: "#8b6644", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 10, fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{loading ? "Loading..." : "Track"}</button>
      </div>
      {notFound && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 12, padding: "24px 28px", textAlign: "center", fontFamily: "'Jost',sans-serif" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#x1F50D;</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Order Not Found</div>
          <div style={{ fontSize: 14, color: "#c2410c" }}>No order found with that number. Please check and try again.</div>
        </div>
      )}
      {tracked && (
        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }} className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: 700, fontSize: 18 }}>{tracked.orderNumber || tracked.id?.slice(0, 10)}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: "#767676" }}>{tracked.customerName || tracked.email}</div>
              {tracked.estimatedDelivery && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676", marginTop: 4 }}>Estimated Delivery: {tracked.estimatedDelivery}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ background: (STATUS_COLOR[tracked.status] || "#f59e0b") + "22", color: STATUS_COLOR[tracked.status] || "#f59e0b", fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 700, padding: "4px 16px", borderRadius: 20 }}>{tracked.status}</span>
              {tracked.trackingNumber && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: "#767676", marginTop: 6 }}>Tracking #: {tracked.trackingNumber}{tracked.carrier ? " (" + tracked.carrier + ")" : ""}</div>}
            </div>
          </div>
          {(tracked.trackingSteps || []).length > 0 && (
            <div style={{ position: "relative", marginTop: 8 }}>
              {(tracked.trackingSteps || []).map((step, i) => (
                <div key={step.label} style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: step.done ? "#8b6644" : "#e0d8ce", display: "flex", alignItems: "center", justifyContent: "center", color: step.done ? "#fff" : "#555", fontWeight: 700, fontSize: 14, fontFamily: "'Jost',sans-serif" }}>{step.done ? "\u2713" : i + 1}</div>
                    {i < tracked.trackingSteps.length - 1 && <div style={{ width: 2, flex: 1, background: step.done ? "#8b6644" : "#f0ede8", minHeight: 24 }} />}
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontWeight: step.done ? 600 : 400, color: step.done ? "#1a1a1a" : "#767676", fontSize: 14 }}>{step.label}</div>
                    {step.date && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: "#767676" }}>{step.date}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {(tracked.trackingSteps || []).length === 0 && (
            <div style={{ fontFamily: "'Jost',sans-serif", color: "#767676", textAlign: "center", padding: 20, fontSize: 14 }}>Tracking details not yet available for this order.</div>
          )}
        </div>
      )}
    </div>
  )
}

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
            <span style={{ fontSize: 16 }}>{SIDEBAR_ICONS[t]}</span>
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
                    <img src={p.img} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
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
                      <td style={{ padding: "12px 16px" }}><img src={p.img} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /></td>
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
                                      <img src={item.img || prod?.img || ""} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: "#f0ede8" }} />
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
                                    <img src={item.img || ""} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
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
                    <img src={p.img} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
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
            {form.img && <img src={form.img} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", marginBottom: 8, display: "block" }} />}
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

function StaticPage({ title, nav, children }) {
  return (
    <div className="static-page" style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}>
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
      <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
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
