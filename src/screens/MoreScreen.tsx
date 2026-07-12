import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { can, ROLE_LABELS, ROLE_BADGE_COLORS, Role } from "../lib/roles";

export default function MoreScreen({ navigation }: any) {
  const { user, setUser } = useAuthStore();
  const role = (user?.role ?? "member") as Role;
  const badge = ROLE_BADGE_COLORS[role];

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive", onPress: async () => {
          await signOut(auth);
          setUser(null);
        }
      }
    ]);
  };

  const items = [
    { icon: "people", label: "Members", screen: "Members", show: can.viewAllMembers(role) },
    { icon: "document-text", label: "Reports", screen: "Reports", show: true },
    { icon: "cash", label: "Finance", screen: "Finance", show: can.viewFinance(role) },
    { icon: "megaphone", label: "Broadcast", screen: "Broadcast", show: can.sendBroadcast(role) },
    { icon: "chatbubbles", label: "Messages", screen: "Messages", show: true },
    { icon: "shield-checkmark", label: "Admin Panel", screen: "Admin", show: can.accessAdmin(role) },
  ].filter(i => i.show);

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      {/* Profile card */}
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(user?.displayName ?? "?")[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user?.displayName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={[s.badge, { backgroundColor: badge?.bg }]}>
            <Text style={[s.badgeText, { color: badge?.text }]}>{ROLE_LABELS[role]}</Text>
          </View>
        </View>
      </View>

      {/* Nav items */}
      <View style={s.section}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.screen}
            style={[s.row, i > 0 && s.rowBorder]}
            onPress={() => navigation.navigate("Home", { screen: item.screen })}
          >
            <View style={s.iconBox}>
              <Ionicons name={item.icon as any} size={18} color="#3b1f6e" />
            </View>
            <Text style={s.rowLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out" size={18} color="#dc2626" />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingTop: 56 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 22 },
  name: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  email: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  section: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, color: "#111827" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#dc2626" },
});
