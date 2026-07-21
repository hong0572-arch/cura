import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBWKmsDjCZcWOXHrmDCv8hrdPFhMCqBk2s",
  authDomain: "cura-1969a.firebaseapp.com",
  projectId: "cura-1969a",
  storageBucket: "cura-1969a.firebasestorage.app",
  messagingSenderId: "630189967071",
  appId: "1:630189967071:web:69a1eff6a28688b23ccb6a",
  measurementId: "G-ZL78CYYRD4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
