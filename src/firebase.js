import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCI2EX7aR0ZphG36_IlUQqt0nFozedj5pI",
  authDomain: "rems-app-44205.firebaseapp.com",
  projectId: "rems-app-44205",
  storageBucket: "rems-app-44205.firebasestorage.app",
  messagingSenderId: "177600513477",
  appId: "1:177600513477:web:aed2a0572ed9a688f7b7ac",
  measurementId: "G-C1X97KV5Q4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

const ADMIN_EMAIL = 'dealcenterx@gmail.com';

/**
 * Ensures a Firestore user document exists for the signed-in Firebase user.
 * Doc is keyed by auth UID so security rules can do get(/users/$(request.auth.uid)).
 * The userId field is kept for backward compatibility with existing queries.
 * Returns the user document data (existing or newly created).
 */
export const ensureUserExists = async (firebaseUser) => {
  if (!firebaseUser) return null;

  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    return { id: snapshot.id, ...snapshot.data() };
  }

  const newUser = {
    userId: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'agent',
    assignedProperties: [],
    companyId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  await setDoc(userRef, newUser);
  return { id: firebaseUser.uid, ...newUser };
};