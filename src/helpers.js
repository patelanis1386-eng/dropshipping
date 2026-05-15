export const LOCAL_PRODUCTS_KEY = "luxedrop_local_products"
export const CART_KEY = "luxedrop_cart"
export const WISHLIST_KEY = "luxedrop_wishlist"

export const INDIAN_STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"]

export const readLocalProducts = () => {
  if (typeof localStorage === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY) || "[]")
  } catch (_) {
    return []
  }
}

export const writeLocalProducts = (products) => {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products))
}

export const mergeProducts = (...groups) => {
  const seen = new Set()
  return groups.flat().filter((p) => {
    if (!p?.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}
