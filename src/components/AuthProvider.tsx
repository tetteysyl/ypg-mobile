import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "../lib/firebase";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { useAuthStore } from "../store/authStore";

const firebaseConfig = {
  apiKey: "AIzaSyBL0SLKyTDV3dmP6nTw2C_CFjQZ9eCoKkw",
  authDomain: "ypg-pcg.firebaseapp.com",
  projectId: "ypg-pcg",
  storageBucket: "ypg-pcg.firebasestorage.app",
  messagingSenderId: "955299919721",
  appId: "1:955299919721:web:d3b83ec31dfcd15033eff8",
};
const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getFirestore(app);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "members", firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            displayName: data.displayName ?? firebaseUser.displayName ?? "",
            role: data.role ?? "member",
            photoURL: data.photoURL ?? firebaseUser.photoURL ?? undefined,
            isYaf: data.isYaf ?? false,
            isDistantMember: data.isDistantMember ?? false,
            yafStartedAt: data.yafStartedAt ?? undefined,
            cellChoice: data.cellChoice ?? undefined,
            gender: data.gender ?? undefined,
            dateOfBirth: data.dateOfBirth ?? undefined,
            phone: data.phone ?? undefined,
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#3b1f6e" />
      </View>
    );
  }

  return <>{children}</>;
}
