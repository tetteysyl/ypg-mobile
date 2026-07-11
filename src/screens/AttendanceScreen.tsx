import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";

export default function AttendanceScreen({ route, navigation }: any) {
  const { meetingId, title } = route?.params ?? {};
  const { user } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!meetingId) return;
    Promise.all([
      apiFetch("/admin/members").then(r => r.json()),
      apiFetch(`/attendance?meetingId=${meetingId}`).then(r => r.json()),
    ]).then(([mems, att]) => {
      if (Array.isArray(mems)) setMembers(mems);
      if (att && !att.error) {
        const map: Record<string, boolean> = {};
        (att.present ?? []).forEach((id: string) => { map[id] = true; });
        setAttendance(map);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [meetingId]);

  const toggle = (id: string) => setAttendance(p => ({ ...p, [id]: !p[id] }));

  const save = async () => {
    setSaving(true);
    try {
      const present = Object.entries(attendance).filter(([, v]) => v).map(([k]) => k);
      const res = await apiFetch("/attendance", {
        method: "POST",
        body: JSON.stringify({ meetingId, present }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      Alert.alert("Saved", "Attendance recorded.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save.");
    }
    setSaving(false);
  };

  if (!meetingId) {
    return (
      <View style={s.page}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          <Text style={s.title}>Attendance</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={s.empty}>Select a meeting from the Meetings tab.</Text>
      </View>
    );
  }

  const presentCount = Object.values(attendance).filter(Boolean).length;

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title} numberOfLines={1}>{title ?? "Attendance"}</Text>
          <Text style={s.sub}>{presentCount} present</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.list}>
          {members.map(m => (
            <TouchableOpacity key={m.id} style={s.row} onPress={() => toggle(m.id)}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
              </View>
              <Text style={s.name}>{m.displayName}</Text>
              <View style={[s.checkbox, attendance[m.id] && s.checkboxActive]}>
                {attendance[m.id] && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f9fafb" },
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  sub: { fontSize: 12, color: "#6b7280" },
  saveBtn: { backgroundColor: "#3b1f6e", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  list: { padding: 12, gap: 8 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  name: { flex: 1, fontSize: 15, color: "#111827" },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#3b1f6e" },
});
