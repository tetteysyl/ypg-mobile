import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

export default function AttendanceScreen({ route, navigation }: any) {
  const { meetingId, title, readOnly = false } = route?.params ?? {};
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [meetingStatus, setMeetingStatus] = useState<string>("scheduled");
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
        setMeetingStatus(att.status ?? "scheduled");
        const map: Record<string, boolean> = {};
        (att.attendees ?? att.present ?? []).forEach((id: string) => { map[id] = true; });
        // Also show self-checked-in members
        (att.selfCheckIns ?? []).forEach((id: string) => { if (!map[id]) map[id] = false; });
        setAttendance(map);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [meetingId]);

  const isReadOnly = readOnly || meetingStatus === "ended";
  const toggle = (id: string) => {
    if (isReadOnly) return;
    setAttendance(p => ({ ...p, [id]: !p[id] }));
  };

  const save = async () => {
    if (isReadOnly) return;
    setSaving(true);
    try {
      const presentIds = Object.entries(attendance).filter(([, v]) => v).map(([k]) => k);
      const res = await apiFetch("/attendance", {
        method: "POST",
        body: JSON.stringify({ meetingId, presentIds, action: "save" }),
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
          <Text style={s.pageTitle}>Attendance</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={s.empty}>Select a meeting to view attendance.</Text>
      </View>
    );
  }

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const presentMembers = members.filter(m => attendance[m.id] === true);
  const absentMembers = members.filter(m => !attendance[m.id]);

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.pageTitle} numberOfLines={1}>{title ?? "Attendance"}</Text>
          <Text style={s.sub}>
            {isReadOnly ? `${presentCount} of ${members.length} attended` : `${presentCount} marked present`}
          </Text>
        </View>
        {!isReadOnly && (
          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        )}
        {isReadOnly && (
          <View style={s.lockedBadge}>
            <Ionicons name="lock-closed" size={12} color="#6b7280" />
            <Text style={s.lockedText}>Locked</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} />
      ) : isReadOnly ? (
        // Read-only: grouped view — Present / Absent
        <ScrollView contentContainerStyle={s.list}>
          {presentMembers.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Present ({presentMembers.length})</Text>
              {presentMembers.map(m => (
                <View key={m.id} style={s.row}>
                  <View style={[s.avatar, s.avatarPresent]}>
                    <Text style={s.avatarText}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <Text style={s.name}>{m.displayName}</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                </View>
              ))}
            </>
          )}
          {absentMembers.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 16 }]}>Absent ({absentMembers.length})</Text>
              {absentMembers.map(m => (
                <View key={m.id} style={[s.row, s.rowAbsent]}>
                  <View style={[s.avatar, s.avatarAbsent]}>
                    <Text style={s.avatarText}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <Text style={[s.name, { color: "#9ca3af" }]}>{m.displayName}</Text>
                  <Ionicons name="close-circle-outline" size={20} color="#d1d5db" />
                </View>
              ))}
            </>
          )}
          {members.length === 0 && <Text style={s.empty}>No member data available.</Text>}
        </ScrollView>
      ) : (
        // Edit mode: toggle checkboxes
        <ScrollView contentContainerStyle={s.list}>
          {members.map(m => (
            <TouchableOpacity key={m.id} style={s.row} onPress={() => toggle(m.id)}>
              <View style={[s.avatar, attendance[m.id] ? s.avatarPresent : s.avatarAbsent]}>
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
  pageTitle: { fontSize: 17, fontWeight: "bold", color: "#1f2937" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  saveBtn: { backgroundColor: "#3b1f6e", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  lockedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  lockedText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  list: { padding: 12, gap: 8, paddingBottom: 32 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  rowAbsent: { opacity: 0.6 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarPresent: { backgroundColor: "#3b1f6e" },
  avatarAbsent: { backgroundColor: "#9ca3af" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  name: { flex: 1, fontSize: 15, color: "#111827" },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#3b1f6e" },
});
