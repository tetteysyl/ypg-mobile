import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can } from "../lib/roles";

export default function MeetingsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", time: "", location: "" });
  const [saving, setSaving] = useState(false);
  const role = user?.role ?? "member";

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/meetings");
      const json = await res.json();
      if (Array.isArray(json)) setMeetings(json.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const saveMeeting = async () => {
    if (!form.title || !form.date) return Alert.alert("Error", "Title and date are required.");
    setSaving(true);
    try {
      const res = await apiFetch("/meetings", { method: "POST", body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setShowAdd(false);
      setForm({ title: "", description: "", date: "", time: "", location: "" });
      load();
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <Text style={s.title}>Meetings</Text>
        {can.scheduleMeeting(role) && (
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
          {meetings.length === 0 ? <Text style={s.empty}>No meetings yet.</Text> : meetings.map(m => (
            <TouchableOpacity
              key={m.id}
              style={s.card}
              onPress={() => can.markAttendance(role) && navigation.navigate("Attendance", { meetingId: m.id, title: m.title })}
            >
              <View style={s.dateBox}>
                <Text style={s.dateMonth}>{m.date ? new Date(m.date).toLocaleString("default", { month: "short" }) : "—"}</Text>
                <Text style={s.dateDay}>{m.date ? new Date(m.date).getDate() : "—"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.meetingTitle}>{m.title}</Text>
                {m.location ? <Text style={s.meetingMeta}>📍 {m.location}</Text> : null}
                {m.time ? <Text style={s.meetingMeta}>🕐 {m.time}</Text> : null}
              </View>
              {can.markAttendance(role) && <Ionicons name="chevron-forward" size={16} color="#9ca3af" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Schedule Meeting</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            {[
              { key: "title", label: "Title *", placeholder: "e.g. Monthly Meeting" },
              { key: "date", label: "Date * (YYYY-MM-DD)", placeholder: "2026-07-20" },
              { key: "time", label: "Time", placeholder: "e.g. 10:00 AM" },
              { key: "location", label: "Location", placeholder: "Church hall" },
              { key: "description", label: "Description", placeholder: "Agenda or details" },
            ].map(f => (
              <View key={f.key}>
                <Text style={s.label}>{f.label}</Text>
                <TextInput
                  style={s.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="#9ca3af"
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  multiline={f.key === "description"}
                />
              </View>
            ))}
            <TouchableOpacity style={s.saveBtn} onPress={saveMeeting} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Schedule</Text>}
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
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  dateBox: { width: 48, backgroundColor: "#3b1f6e", borderRadius: 10, padding: 8, alignItems: "center" },
  dateMonth: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  dateDay: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  meetingTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meetingMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", marginBottom: 14, backgroundColor: "#fff" },
  saveBtn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
