import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can } from "../lib/roles";

export default function ReportsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const role = user?.role ?? "member";

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/reports");
      const json = await res.json();
      if (Array.isArray(json)) setReports(json);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.content) return Alert.alert("Error", "Title and content are required.");
    setSaving(true);
    try {
      const res = await apiFetch("/reports", {
        method: "POST",
        body: JSON.stringify({ ...form, status: can.publishReport(role) ? "published" : "draft" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setShowAdd(false);
      setForm({ title: "", content: "" });
      load();
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={s.title}>Reports</Text>
        {can.draftReport(role) && (
          <TouchableOpacity onPress={() => setShowAdd(true)} style={s.addBtn}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} /> : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={["#3b1f6e"]} />}
        >
          {reports.length === 0 ? <Text style={s.empty}>No reports yet.</Text> :
            reports.map(r => (
              <View key={r.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.reportTitle}>{r.title}</Text>
                  <View style={[s.statusBadge, r.status === "published" ? s.published : s.draft]}>
                    <Text style={[s.statusText, r.status === "published" ? { color: "#15803d" } : { color: "#92400e" }]}>
                      {r.status === "published" ? "Published" : "Draft"}
                    </Text>
                  </View>
                </View>
                <Text style={s.reportMeta}>By {r.authorName ?? "Unknown"} · {r.date ?? ""}</Text>
                <Text style={s.reportContent} numberOfLines={3}>{r.content}</Text>
              </View>
            ))
          }
        </ScrollView>
      )}

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{can.publishReport(role) ? "New Report" : "Draft Report"}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            <Text style={s.label}>Title *</Text>
            <TextInput style={s.input} placeholder="Report title" placeholderTextColor="#9ca3af" value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} />
            <Text style={s.label}>Content *</Text>
            <TextInput style={[s.input, { height: 140, textAlignVertical: "top" }]} placeholder="Report content..." placeholderTextColor="#9ca3af" value={form.content} onChangeText={v => setForm(p => ({ ...p, content: v }))} multiline />
            <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{can.publishReport(role) ? "Publish" : "Submit Draft"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f9fafb" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  addBtn: { backgroundColor: "#3b1f6e", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, gap: 8 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  reportTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827", marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  published: { backgroundColor: "#dcfce7" },
  draft: { backgroundColor: "#fef9c3" },
  statusText: { fontSize: 11, fontWeight: "600" },
  reportMeta: { fontSize: 11, color: "#9ca3af", marginBottom: 6 },
  reportContent: { fontSize: 13, color: "#374151", lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", marginBottom: 14, backgroundColor: "#fff" },
  saveBtn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
