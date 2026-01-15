import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

// Initialize Firestore
export const db = getFirestore(app);