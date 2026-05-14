import { initializeApp } from "firebase/app"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth"
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBqRqi-MrWBHGSzJV_2mMaLuG1HwlQzzgg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dropshipping-9e718.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dropshipping-9e718",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dropshipping-9e718.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "35387797827",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:35387797827:web:49485f7ebb29874b957ff6",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db, onAuthStateChanged }

const withTimeout = (promise, ms = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out. Check your connection or Firebase configuration.")), ms)),
  ])
}

export const signUp = async (email, password, name) => {
  const cred = await withTimeout(createUserWithEmailAndPassword(auth, email, password))
  try {
    await updateProfile(cred.user, { displayName: name })
  } catch (_) {}
  setDoc(doc(db, "users", cred.user.uid), {
    name,
    email,
    createdAt: serverTimestamp(),
  }).catch(() => {})
  return cred.user
}

export const signIn = async (email, password) => {
  const cred = await withTimeout(signInWithEmailAndPassword(auth, email, password))
  return cred.user
}

export const logOut = () => signOut(auth)

export const resetPassword = (email) => withTimeout(sendPasswordResetEmail(auth, email))

export const signInAsGuest = async () => {
  const cred = await withTimeout(signInAnonymously(auth))
  const user = cred.user
  try {
    const userDoc = doc(db, "users", user.uid)
    const snap = await getDoc(userDoc)
    if (!snap.exists()) {
      await setDoc(userDoc, {
        name: "Guest",
        email: `guest_${user.uid.slice(0, 6)}@luxedrop.com`,
        createdAt: serverTimestamp(),
      })
    }
  } catch (_) {}
  return user
}

const googleProvider = new GoogleAuthProvider()
export const signInWithGoogle = async () => {
  const result = await withTimeout(signInWithPopup(auth, googleProvider), 30000)
  const user = result.user
  const userDoc = doc(db, "users", user.uid)
  const snap = await getDoc(userDoc)
  if (!snap.exists()) {
    try {
      await setDoc(userDoc, {
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        createdAt: serverTimestamp(),
      })
    } catch (_) {}
  }
  return user
}

const productConverter = {
  toFirestore: (product) => product,
  fromFirestore: (snap, options) => ({ id: snap.id, ...snap.data(options) }),
}

export const getProducts = async () => {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getProductById = async (id) => {
  const snap = await getDoc(doc(db, "products", id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export const addProduct = async (product) => {
  const ref = await addDoc(collection(db, "products"), {
    ...product,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const updateProduct = async (id, data) => {
  await updateDoc(doc(db, "products", id), data)
}

export const deleteProduct = async (id) => {
  await deleteDoc(doc(db, "products", id))
}

export const getOrders = async (userId = null) => {
  let q
  if (userId) {
    q = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
  } else {
    q = query(collection(db, "orders"), orderBy("createdAt", "desc"))
  }
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const createOrder = async (order) => {
  const ref = await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const updateOrderStatus = async (id, status) => {
  await updateDoc(doc(db, "orders", id), { status })
}

export const getReviews = async () => {
  const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const addReview = async (review) => {
  const ref = await addDoc(collection(db, "reviews"), {
    ...review,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const subscribeNewsletter = async (email) => {
  const q = query(collection(db, "newsletter"), where("email", "==", email))
  const snap = await getDocs(q)
  if (!snap.empty) throw new Error("Already subscribed")
  await addDoc(collection(db, "newsletter"), {
    email,
    subscribedAt: serverTimestamp(),
  })
}

export const getCategories = async () => {
  const snap = await getDocs(collection(db, "categories"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const addCategory = async (category) => {
  const ref = await addDoc(collection(db, "categories"), {
    ...category,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const getUsers = async () => {
  const snap = await getDocs(collection(db, "users"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getNewsletterSubscribers = async () => {
  const snap = await getDocs(collection(db, "newsletter"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
