import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { can } from "../lib/roles";

export default function AttendanceListScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const role = user?.role ?? "member";
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/meetings");
      const json = await res.json();
      if (Array.isArray(json)) {
        setMeetings(
          json.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const canTake = can.markAttendance(role);

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <Text style={s.title}>Attendance</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={["#3b1f6e"]} />}
        >
          {meetings.length === 0 ? (
            <Text style={s.empty}>No meetings found.</Text>
          ) : (
            meetings.map(m => {
              const isEnded = m.status === "ended";
              const attendeeCount = (m.attendees ?? []).length;
              const selfCheckIns = (m.selfCheckIns ?? []).length;

              return (
                <TouchableOpacity
                  key={m.id}
                  style={s.card}
                  onPress={() =>
                    navigation.navigate("Home", {
                      screen: "Attendance",
                      params: {
                        meetingId: m.id,
                        title: m.title,
                        readOnly: isEnded || !canTake,
                      },
                    })
                  }
                >
                  <View style={[s.dateBox, isEnded && s.dateBoxEnded]}>
                    <Text style={s.dateMonth}>
                      {m.date ? new Date(m.date).toLocaleString("default", { month: "short" }) : "—"}
                    </Text>
                    <Text style={s.dateDay}>
                      {m.date ? new Date(m.date).getDate() : "—"}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={s.meetingTitle} numberOfLines={1}>{m.title}</Text>
                    <View style={s.metaRow}>
                      <View style={[s.statusBadge, isEnded ? s.badgeEnded : s.badgeActive]}>
                        <Text style={[s.statusText, isEnded ? s.statusTextEnded : s.statusTextActive]}>
                          {isEnded ? "Ended" : m.status === "ongoing" ? "Ongoing" : "Scheduled"}
                        </Text>
                      </View>
                      {isEnded && (
                        <Text style={s.countText}>
                          <Ionicons name="people" size={11} color="#6b7280" /> {attendeeCount} present
                        </Text>
                      )}
                      {!isEnded && selfCheckIns > 0 && (
                        <Text style={s.countText}>{selfCheckIns} pending check-ins</Text>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f9fafb" },
  topBar: { padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  list: { padding: 12, gap: 8 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  dateBox: { width: 48, backgroundColor: "#3b1f6e", borderRadius: 10, padding: 8, alignItems: "center" },
  dateBoxEnded: { backgroundColor: "#6b7280" },
  dateMonth: { fontSize: 10, color: "rgba(255,255,255,0.75)" },
  dateDay: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  meetingTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  badgeEnded: { backgroundColor: "#f3f4f6" },
  badgeActive: { backgroundColor: "#dcfce7" },
  statusText: { fontSize: 11, fontWeight: "600" },
  statusTextEnded: { color: "#6b7280" },
  statusTextActive: { color: "#16a34a" },
  countText: { fontSize: 12, color: "#6b7280" },
});
