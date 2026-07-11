import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";

export default function PendingScreen() {
  const { setUser } = useAuthStore();

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <View style={s.container}>
      <View style={s.icon}>
        <Ionicons name="time-outline" size={48} color="#f0c940" />
      </View>
      <Text style={s.title}>Awaiting Approval</Text>
      <Text style={s.body}>
        Your registration has been submitted. The President will review your account and approve it shortly.
      </Text>
      <Text style={[s.body, { marginTop: 8, color: "rgba(255,255,255,0.6)", fontSize: 13 }]}>
        You'll be able to access the app once approved.
      </Text>
      <TouchableOpacity style={s.btn} onPress={handleSignOut}>
        <Text style={s.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3b1f6e", alignItems: "center", justifyContent: "center", padding: 32 },
  icon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 16, textAlign: "center" },
  body: { fontSize: 15, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 22 },
  btn: { marginTop: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  btnText: { color: "#fff", fontWeight: "600" },
});
