import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { auth } from "../lib/firebase";
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

const CELLS = ["Charis", "Eleos", "Kleos", "Dunamis"];

function calcAge(dob: string) {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [cell, setCell] = useState("none");
  const [isDistant, setIsDistant] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !dob || !gender) {
      return Alert.alert("Error", "Please fill in all required fields.");
    }
    const age = calcAge(dob);
    if (age === null) return Alert.alert("Error", "Invalid date of birth.");
    if (age < 18) return Alert.alert("Age Restriction", "Sorry, your age does not permit you to be a YPG member. Kindly join Children Service.");
    if (age > 30) return Alert.alert("Age Restriction", "Sorry, you can't be part of YPG. Your age makes you a YAF member.");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "members", cred.user.uid), {
        email, displayName: name, phone, dateOfBirth: dob,
        cellChoice: cell, gender, isDistantMember: isDistant,
        role: "pending", createdAt: serverTimestamp(),
      });
      Alert.alert("Registration Submitted", "Your account is awaiting approval by the President.");
      navigation.navigate("Login");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#3b1f6e" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Join the Guild</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={s.label}>Full Name *</Text>
        <TextInput style={s.input} placeholder="Enter your full name" placeholderTextColor="#9ca3af" value={name} onChangeText={setName} />

        <Text style={s.label}>Email Address *</Text>
        <TextInput style={s.input} placeholder="Enter your email" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={s.label}>Password *</Text>
        <View style={s.pwRow}>
          <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="Create a password" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
          <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
            <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <View style={{ height: 14 }} />

        <Text style={s.label}>Phone Number</Text>
        <TextInput style={s.input} placeholder="e.g. 0244000000" placeholderTextColor="#9ca3af" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={s.label}>Gender *</Text>
        <View style={s.row}>
          {(["male", "female"] as const).map(g => (
            <TouchableOpacity key={g} style={[s.gBtn, gender === g && s.gBtnActive]} onPress={() => setGender(g)}>
              <Text style={[s.gBtnText, gender === g && s.gBtnTextActive]}>{g === "male" ? "Male" : "Female"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Date of Birth *</Text>
        <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af" value={dob} onChangeText={setDob} />
        <Text style={s.hint}>Only visible to the President</Text>

        <Text style={s.label}>Cell</Text>
        <View style={s.cellGrid}>
          {["none", ...CELLS].map(c => (
            <TouchableOpacity key={c} style={[s.cellBtn, cell === c && s.cellBtnActive]} onPress={() => setCell(c)}>
              <Text style={[s.cellBtnText, cell === c && s.cellBtnTextActive]}>{c === "none" ? "No cell" : c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.checkRow} onPress={() => setIsDistant(v => !v)}>
          <View style={[s.checkbox, isDistant && s.checkboxActive]}>
            {isDistant && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={s.checkLabel}>I am a distant member</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <Text style={s.notice}>Your account will be reviewed and approved by the President before you can access the app.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#f9fafb", padding: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 40 },
  topTitle: { fontSize: 18, fontWeight: "bold", color: "#3b1f6e" },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", marginBottom: 14, backgroundColor: "#fff" },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: { padding: 10 },
  row: { flexDirection: "row", gap: 10, marginBottom: 14 },
  gBtn: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: "#fff" },
  gBtnActive: { backgroundColor: "#3b1f6e", borderColor: "#3b1f6e" },
  gBtnText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  gBtnTextActive: { color: "#fff" },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: -10, marginBottom: 14 },
  cellGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  cellBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  cellBtnActive: { backgroundColor: "#3b1f6e", borderColor: "#3b1f6e" },
  cellBtnText: { fontSize: 13, color: "#374151" },
  cellBtnTextActive: { color: "#fff" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, padding: 14, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#3b1f6e" },
  checkLabel: { fontSize: 14, color: "#374151" },
  btn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 16 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  notice: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginBottom: 30 },
});
