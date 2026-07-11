import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can } from "../lib/roles";

export default function FinanceScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "income", amount: "", description: "", date: "", category: "" });
  const [saving, setSaving] = useState(false);
  const role = user?.role ?? "member";

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    if (!can.viewFinance(role)) { setLoading(false); setRefreshing(false); return; }
    try {
      const res = await apiFetch("/finance");
      const json = await res.json();
      if (Array.isArray(json.transactions)) {
        setTransactions(json.transactions);
        const inc = json.transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
        const exp = json.transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
        setSummary({ income: inc, expense: exp });
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [role]);

  const save = async () => {
    if (!form.amount || !form.description || !form.date) return Alert.alert("Error", "Amount, description and date are required.");
    setSaving(true);
    try {
      const res = await apiFetch("/finance", {
        method: "POST",
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setShowAdd(false);
      setForm({ type: "income", amount: "", description: "", date: "", category: "" });
      load();
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  if (!can.viewFinance(role)) {
    return <View style={s.center}><Text style={s.empty}>Access restricted.</Text></View>;
  }

  const balance = summary.income - summary.expense;

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={s.title}>Finance</Text>
        {can.editFinance(role) && (
          <TouchableOpacity onPress={() => setShowAdd(true)} style={s.addBtn}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={["#3b1f6e"]} />}
      >
        {/* Summary cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: "#dcfce7" }]}>
            <Text style={[s.summaryLabel, { color: "#15803d" }]}>Income</Text>
            <Text style={[s.summaryValue, { color: "#15803d" }]}>GH₵{summary.income.toFixed(2)}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: "#fef2f2" }]}>
            <Text style={[s.summaryLabel, { color: "#dc2626" }]}>Expense</Text>
            <Text style={[s.summaryValue, { color: "#dc2626" }]}>GH₵{summary.expense.toFixed(2)}</Text>
          </View>
        </View>
        <View style={[s.balanceCard, { backgroundColor: balance >= 0 ? "#eff6ff" : "#fef2f2" }]}>
          <Text style={s.balanceLabel}>Balance</Text>
          <Text style={[s.balanceValue, { color: balance >= 0 ? "#1d4ed8" : "#dc2626" }]}>GH₵{balance.toFixed(2)}</Text>
        </View>

        {loading ? <ActivityIndicator color="#3b1f6e" style={{ marginTop: 20 }} /> : (
          transactions.length === 0 ? <Text style={s.empty}>No transactions yet.</Text> :
          transactions.map(t => (
            <View key={t.id} style={s.txRow}>
              <View style={[s.txIcon, { backgroundColor: t.type === "income" ? "#dcfce7" : "#fef2f2" }]}>
                <Ionicons name={t.type === "income" ? "arrow-down" : "arrow-up"} size={16} color={t.type === "income" ? "#15803d" : "#dc2626"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.txDesc}>{t.description}</Text>
                <Text style={s.txMeta}>{t.date} {t.category ? `· ${t.category}` : ""}</Text>
              </View>
              <Text style={[s.txAmount, { color: t.type === "income" ? "#15803d" : "#dc2626" }]}>
                {t.type === "income" ? "+" : "-"}GH₵{t.amount}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            <View style={s.typeRow}>
              {["income", "expense"].map(t => (
                <TouchableOpacity key={t} style={[s.typeBtn, form.type === t && s.typeBtnActive]} onPress={() => setForm(p => ({ ...p, type: t }))}>
                  <Text style={[s.typeBtnText, form.type === t && s.typeBtnTextActive]}>{t === "income" ? "Income" : "Expense"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {[
              { key: "amount", label: "Amount (GH₵) *", placeholder: "0.00", keyboardType: "numeric" as const },
              { key: "description", label: "Description *", placeholder: "e.g. Dues collection" },
              { key: "date", label: "Date * (YYYY-MM-DD)", placeholder: "2026-07-11" },
              { key: "category", label: "Category", placeholder: "e.g. Dues, Events" },
            ].map(f => (
              <View key={f.key}>
                <Text style={s.label}>{f.label}</Text>
                <TextInput
                  style={s.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="#9ca3af"
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboardType}
                />
              </View>
            ))}
            <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
            </TouchableOpacity>
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
  addBtn: { backgroundColor: "#3b1f6e", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 8 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14 },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: "bold" },
  balanceCard: { borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  balanceValue: { fontSize: 22, fontWeight: "bold" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 14, fontWeight: "500", color: "#111827" },
  txMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  typeBtnActive: { backgroundColor: "#3b1f6e", borderColor: "#3b1f6e" },
  typeBtnText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  typeBtnTextActive: { color: "#fff" },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", marginBottom: 14, backgroundColor: "#fff" },
  saveBtn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
