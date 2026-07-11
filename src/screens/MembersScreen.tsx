import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can, ROLE_LABELS, ROLE_BADGE_COLORS, Role } from "../lib/roles";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function MembersScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [allDues, setAllDues] = useState<Record<string, any>>({});
  const [duesAmount, setDuesAmount] = useState(5);
  const [duesModal, setDuesModal] = useState<{ member: any } | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [savingDues, setSavingDues] = useState(false);

  const role = user?.role ?? "member";

  useEffect(() => {
    if (!can.viewAllMembers(role)) return;
    apiFetch("/admin/members").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setMembers(d);
      setLoading(false);
    }).catch(() => setLoading(false));

    const year = new Date().getFullYear();
    apiFetch(`/dues/settings?year=${year}`).then(r => r.json()).then(d => {
      if (d.amount) setDuesAmount(d.amount);
    }).catch(() => {});
  }, [role]);

  useEffect(() => {
    if (!can.viewDuesStatus(role) || members.length === 0) return;
    members.forEach(m => {
      apiFetch(`/dues?memberId=${m.id}`).then(r => r.json()).then(d => {
        if (!d.error) setAllDues(prev => ({ ...prev, [m.id]: d }));
      }).catch(() => {});
    });
  }, [members, role]);

  const filtered = members.filter(m =>
    m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getCurrentMonthPaid = (memberId: string): boolean | null => {
    if (!(memberId in allDues)) return null;
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    return allDues[memberId]?.[key]?.paid ?? false;
  };

  const openDues = (member: any) => {
    setDuesModal({ member });
    setSelectedMonths([]);
  };

  const toggleMonth = (m: number) => {
    const year = new Date().getFullYear();
    const key = `${year}-${String(m).padStart(2, "0")}`;
    const memberDues = allDues[duesModal!.member.id] ?? {};
    if (memberDues[key]?.paid) return; // locked
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const saveDues = async () => {
    if (!duesModal || selectedMonths.length === 0) return;
    setSavingDues(true);
    try {
      const res = await apiFetch("/dues", {
        method: "POST",
        body: JSON.stringify({ memberId: duesModal.member.id, months: selectedMonths, year: new Date().getFullYear() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      Alert.alert("Success", `Recorded ${json.recorded} month(s) — GH₵${json.amount}`);
      // refresh dues for this member
      const duesRes = await apiFetch(`/dues?memberId=${duesModal.member.id}`);
      const duesJson = await duesRes.json();
      if (!duesJson.error) setAllDues(prev => ({ ...prev, [duesModal.member.id]: duesJson }));
      setDuesModal(null);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to record dues.");
    } finally {
      setSavingDues(false);
    }
  };

  const sendReminder = async () => {
    Alert.alert("Send Reminder", "Send dues reminder to all unpaid members?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send", onPress: async () => {
          try {
            const res = await apiFetch("/dues/remind", { method: "POST" });
            const json = await res.json();
            Alert.alert("Sent", `Reminder sent to ${json.notified ?? 0} members.`);
          } catch { Alert.alert("Error", "Failed to send reminder."); }
        }
      }
    ]);
  };

  if (!can.viewAllMembers(role)) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Access restricted.</Text>
      </View>
    );
  }

  const year = new Date().getFullYear();

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <Text style={s.title}>Members</Text>
        <View style={s.topActions}>
          {can.sendDuesReminder(role) && (
            <TouchableOpacity onPress={sendReminder} style={s.reminderBtn}>
              <Ionicons name="mail" size={16} color="#3b1f6e" />
              <Text style={s.reminderText}>Remind</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {filtered.length === 0 ? (
            <Text style={s.empty}>No members found.</Text>
          ) : (
            filtered.map(m => {
              const badge = ROLE_BADGE_COLORS[m.role as Role] ?? ROLE_BADGE_COLORS.member;
              const paid = getCurrentMonthPaid(m.id);
              return (
                <View key={m.id} style={s.card}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{m.displayName}</Text>
                    <Text style={s.email} numberOfLines={1}>{m.email}</Text>
                    <View style={s.tagRow}>
                      <View style={[s.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.badgeText, { color: badge.text }]}>{ROLE_LABELS[m.role as Role] ?? m.role}</Text>
                      </View>
                      {can.viewDuesStatus(role) && paid !== null && (
                        <View style={[s.duesBadge, paid ? s.duesPaid : s.duesUnpaid]}>
                          <Ionicons name={paid ? "checkmark-circle" : "close-circle"} size={11} color={paid ? "#059669" : "#dc2626"} />
                          <Text style={[s.duesBadgeText, { color: paid ? "#059669" : "#dc2626" }]}>
                            {paid ? "Dues Paid" : "Dues Due"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {can.manageDues(role) && (
                    <TouchableOpacity onPress={() => openDues(m)} style={s.duesBtn}>
                      <Ionicons name="cash" size={18} color="#3b1f6e" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Dues Modal */}
      <Modal visible={!!duesModal} animationType="slide" transparent onRequestClose={() => setDuesModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Record Dues</Text>
              <TouchableOpacity onPress={() => setDuesModal(null)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {duesModal && (
              <>
                <Text style={s.modalSub}>{duesModal.member.displayName} — GH₵{duesAmount}/month</Text>
                <View style={s.monthGrid}>
                  {MONTH_SHORT.map((name, i) => {
                    const m = i + 1;
                    const key = `${year}-${String(m).padStart(2, "0")}`;
                    const memberDues = allDues[duesModal.member.id] ?? {};
                    const isPaid = memberDues[key]?.paid ?? false;
                    const isSelected = selectedMonths.includes(m);
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[s.monthBtn, isPaid ? s.monthPaid : isSelected ? s.monthSelected : s.monthDefault]}
                        onPress={() => toggleMonth(m)}
                        disabled={isPaid}
                      >
                        {isPaid && <Ionicons name="checkmark" size={12} color="#059669" />}
                        <Text style={[s.monthLabel, isPaid ? { color: "#059669" } : isSelected ? { color: "#fff" } : { color: "#374151" }]}>{name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedMonths.length > 0 && (
                  <Text style={s.totalText}>Total: GH₵{duesAmount * selectedMonths.length}</Text>
                )}
                <TouchableOpacity
                  style={[s.saveBtn, selectedMonths.length === 0 && { opacity: 0.4 }]}
                  onPress={saveDues}
                  disabled={selectedMonths.length === 0 || savingDues}
                >
                  {savingDues ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Payment</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  topActions: { flexDirection: "row", gap: 8 },
  reminderBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ede9fe", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  reminderText: { fontSize: 12, color: "#3b1f6e", fontWeight: "600" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  list: { padding: 12, gap: 8 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  name: { fontSize: 15, fontWeight: "600", color: "#111827" },
  email: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  duesBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  duesPaid: { backgroundColor: "#ecfdf5" },
  duesUnpaid: { backgroundColor: "#fef2f2" },
  duesBadgeText: { fontSize: 10, fontWeight: "600" },
  duesBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  modalSub: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  monthBtn: { width: "23%", paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  monthDefault: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  monthSelected: { backgroundColor: "#3b1f6e", borderColor: "#3b1f6e" },
  monthPaid: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  monthLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  totalText: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 12 },
  saveBtn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
