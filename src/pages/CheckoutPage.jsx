import { useState, useEffect } from "react"
import { fmt } from "../data"
import { getSavedAddress, getNextOrderNumber, saveUserAddress, createOrder, saveUserOrders } from "../firebase"

function CheckoutPage({ cart, cartTotal, payMethod, setPayMethod, nav, showToast, setCart, user, orders, setOrders, shipping }) {
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
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Shipping Information</h2>
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
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Payment Method</h2>
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
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Summary</h2>
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

export default CheckoutPage
