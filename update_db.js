import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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
const db = getFirestore(app);

async function update() {
  const docRef = doc(db, 'siteData', 'main');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    if (data.content) {
      if (data.content.ko && data.content.ko.contact) {
        data.content.ko.contact.phone_lbl = "고객센터 전화 (월요일부터 금요일 09:00~18:00)";
      }
      if (data.content.en && data.content.en.contact) {
        data.content.en.contact.phone_lbl = "Center Hotline (Mon-Fri 09:00~18:00)";
      }
      await setDoc(docRef, data, { merge: true });
      console.log("Updated Firestore successfully!");
    } else {
      console.log("No content field found in Firestore.");
    }
  } else {
    console.log("Document does not exist in Firestore.");
  }
  process.exit(0);
}

update().catch(console.error);
