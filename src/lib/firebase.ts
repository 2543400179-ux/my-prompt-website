import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "mystical-atlas-460010-r3",
  appId: "1:683638849198:web:8cfa7dfc1575e955adb73f",
  apiKey: "AIzaSyAPWCqj7DB4QaYVy59BI6N-tdoBDrL07-w",
  authDomain: "mystical-atlas-460010-r3.firebaseapp.com",
  storageBucket: "mystical-atlas-460010-r3.firebasestorage.app",
  messagingSenderId: "683638849198",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-896b3c1e-14f2-4ad5-b200-b59686f1a187");
