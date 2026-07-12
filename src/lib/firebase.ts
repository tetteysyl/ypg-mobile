import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBL0SLKyTDV3dmP6nTw2C_CFjQZ9eCoKkw",
  authDomain: "ypg-pcg.firebaseapp.com",
  projectId: "ypg-pcg",
  storageBucket: "ypg-pcg.firebasestorage.app",
  messagingSenderId: "955299919721",
  appId: "1:955299919721:web:d3b83ec31dfcd15033eff8",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

export const API_BASE = "https://ypg-app.vercel.app/api";
