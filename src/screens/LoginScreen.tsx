import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";

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

export default function LoginScreen({ navigation }: any) {
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Please enter email and password.");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "members", cred.user.uid));
      if (!snap.exists()) throw new Error("Account not found.");
      const data = snap.data() as any;
      setUser({
        uid: cred.user.uid,
        email: cred.user.email ?? "",
        displayName: data.displayName ?? "",
        role: data.role ?? "member",
        photoURL: data.photoURL ?? undefined,
        isYaf: data.isYaf ?? false,
        isDistantMember: data.isDistantMember ?? false,
        yafStartedAt: data.yafStartedAt ?? undefined,
        cellChoice: data.cellChoice,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        phone: data.phone,
      });
    } catch (err: any) {
      const msg =
        err.code === "auth/invalid-credential" ? "Incorrect email or password." :
        err.code === "auth/network-request-failed" ? "Network error. Check your connection." :
        err.message ?? "Sign in failed.";
      Alert.alert("Sign In Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail) return Alert.alert("Error", "Enter your email address.");
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      Alert.alert("Email Sent", `A reset link was sent to ${resetEmail}.`);
      setShowReset(false);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to send reset email.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Young People's Guild</Text>
          <Text style={s.sub}>Presbyterian Church of Ghana</Text>
          <Text style={s.subsub}>Saviour Congregation, Madina-West</Text>
          <View style={s.mottoBox}>
            <Text style={s.motto}>"To Know His Will and To Do It"</Text>
          </View>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Welcome Back</Text>
          <Text style={s.cardSub}>Sign in to access the YPG management system</Text>

          <Text style={s.label}>Email Address</Text>
          <TextInput
            style={s.input}
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.label}>Password</Text>
          <View style={s.pwRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => { setShowReset(true); setResetEmail(email); }} style={s.forgotBtn}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={s.switchBtn}>
            <Text style={s.switchText}>Don't have an account? <Text style={s.switchLink}>Register</Text></Text>
          </TouchableOpacity>
        </View>

        {/* Reset modal */}
        {showReset && (
          <View style={s.modal}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Reset Password</Text>
              <Text style={s.modalSub}>Enter your email and we'll send a reset link.</Text>
              <TextInput
                style={s.input}
                placeholder="Your email"
                placeholderTextColor="#9ca3af"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: "#e5e7eb" }]} onPress={() => setShowReset(false)}>
                  <Text style={[s.btnText, { color: "#374151" }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={handleReset}>
                  <Text style={s.btnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#3b1f6e", padding: 24 },
  header: { alignItems: "center", paddingVertical: 40 },
  title: { fontSize: 26, fontWeight: "bold", color: "#f0c940", textAlign: "center" },
  sub: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  subsub: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  mottoBox: { marginTop: 16, borderWidth: 1, borderColor: "rgba(201,165,42,0.4)", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  motto: { color: "#f0c940", fontStyle: "italic", fontSize: 13, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: "bold", color: "#3b1f6e" },
  cardSub: { fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", marginBottom: 14, backgroundColor: "#fff" },
  pwRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  eyeBtn: { padding: 10 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 16 },
  forgotText: { fontSize: 12, color: "#3b1f6e" },
  btn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  switchBtn: { alignItems: "center", marginTop: 16 },
  switchText: { fontSize: 13, color: "#6b7280" },
  switchLink: { color: "#3b1f6e", fontWeight: "600" },
  modal: { position: "absolute", inset: 0, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
});
