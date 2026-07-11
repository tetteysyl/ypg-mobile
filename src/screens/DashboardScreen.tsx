import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can } from "../lib/roles";

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [dues, setDues] = useState<Record<string, any> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const role = user?.role ?? "member";

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, duesRes] = await Promise.all([
        apiFetch("/dashboard"),
        user ? apiFetch(`/dues?memberId=${user.uid}`) : Promise.resolve(null),
      ]);
      const dashJson = await dashRes.json();
      if (!dashJson.error) setData(dashJson);
      if (duesRes) {
        const duesJson = await duesRes.json();
        if (!duesJson.error) setDues(duesJson);
      }
    } catch {}
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const year = new Date().getFullYear();

  const cards = [
    { label: "Members", value: data?.stats?.members ?? "—", icon: "people", color: "#ede9fe", iconColor: "#3b1f6e" },
    { label: "Meetings", value: data?.stats?.meetings ?? "—", icon: "calendar", color: "#fef9c3", iconColor: "#b45309" },
    { label: "Events", value: data?.stats?.events ?? "—", icon: "bookmark", color: "#dbeafe", iconColor: "#1d4ed8" },
    ...(can.viewFinance(role) ? [{ label: "Finance", value: "→", icon: "cash", color: "#dcfce7", iconColor: "#15803d" }] : []),
  ];

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={["#3b1f6e"]} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.welcome}>Welcome, {user?.displayName?.split(" ")[0]} 👋</Text>
          <Text style={s.date}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} style={s.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* YAF banner */}
      {user?.isYaf && (
        <View style={s.yafBanner}>
          <Ionicons name="warning" size={18} color="#92400e" />
          <Text style={s.yafText}>You are a YAF member. Your account will be closed soon.</Text>
        </View>
      )}

      {/* Stat cards */}
      <View style={s.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.label}
            style={s.card}
            onPress={() => {
              if (card.label === "Finance") navigation.navigate("Finance");
              else if (card.label === "Members") navigation.navigate("Members");
            }}
          >
            <View style={[s.cardIcon, { backgroundColor: card.color }]}>
              <Ionicons name={card.icon as any} size={20} color={card.iconColor} />
            </View>
            <Text style={s.cardValue}>{data ? card.value : "—"}</Text>
            <Text style={s.cardLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dues grid */}
      {dues !== null && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Dues — {year}</Text>
          <View style={s.duesGrid}>
            {MONTH_SHORT.map((name, i) => {
              const key = `${year}-${String(i + 1).padStart(2, "0")}`;
              const paid = dues[key]?.paid ?? false;
              return (
                <View key={i} style={[s.duesMonth, paid ? s.duesPaid : s.duesUnpaid]}>
                  <Ionicons name={paid ? "checkmark-circle" : "close-circle"} size={12} color={paid ? "#059669" : "#d1d5db"} />
                  <Text style={[s.duesLabel, { color: paid ? "#065f46" : "#9ca3af" }]}>{name}</Text>
                </View>
              );
            })}
          </View>
          <Text style={s.duesSub}>
            {Object.values(dues).filter((d: any) => d.paid).length} of 12 months paid
          </Text>
        </View>
      )}

      {/* Upcoming events */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Meetings")}>
            <Text style={s.seeAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {!data ? (
          <ActivityIndicator color="#3b1f6e" style={{ marginTop: 12 }} />
        ) : data.upcoming?.length === 0 ? (
          <Text style={s.empty}>No upcoming events</Text>
        ) : (
          data.upcoming?.map((ev: any) => (
            <View key={ev.id} style={s.eventRow}>
              <View style={s.eventDate}>
                <Text style={s.eventMonth}>{ev.date ? new Date(ev.date).toLocaleString("default", { month: "short" }) : "—"}</Text>
                <Text style={s.eventDay}>{ev.date ? new Date(ev.date).getDate() : "—"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.eventTitle}>{ev.title}</Text>
                {ev.description ? <Text style={s.eventDesc} numberOfLines={1}>{ev.description}</Text> : null}
                {ev.time ? <Text style={s.eventTime}>🕐 {ev.time}</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingTop: 56 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  welcome: { fontSize: 22, fontWeight: "bold", color: "#1f2937" },
  date: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  refreshBtn: { padding: 8 },
  yafBanner: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#fef3c7", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#fde68a" },
  yafText: { flex: 1, fontSize: 13, color: "#92400e" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  card: { width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardValue: { fontSize: 24, fontWeight: "bold", color: "#1f2937" },
  cardLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#1f2937", marginBottom: 12 },
  seeAll: { fontSize: 12, color: "#3b1f6e" },
  duesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  duesMonth: { width: "23%", borderRadius: 8, paddingVertical: 8, alignItems: "center", gap: 2 },
  duesPaid: { backgroundColor: "#ecfdf5" },
  duesUnpaid: { backgroundColor: "#f9fafb" },
  duesLabel: { fontSize: 10, fontWeight: "500" },
  duesSub: { fontSize: 11, color: "#9ca3af", marginTop: 8 },
  empty: { fontSize: 13, color: "#9ca3af", textAlign: "center", paddingVertical: 16 },
  eventRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  eventDate: { width: 44, backgroundColor: "#3b1f6e", borderRadius: 10, padding: 8, alignItems: "center" },
  eventMonth: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  eventDay: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  eventTitle: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  eventDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  eventTime: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
});
