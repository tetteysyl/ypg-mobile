import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { can } from "../lib/roles";

type Transaction = {
  id: string; type: "income" | "expense"; amount: number;
  description: string; date: string; category: string; recordedBy: string;
};

type Statement = {
  id: string; title: string; period: string; summary: string;
  totalIncome: number; totalExpense: number; notes?: string;
  publishedBy: string; publishedRole: string; publishedAt: any;
};

export default function FinanceScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const role = user?.role ?? "member";

  const [tab, setTab] = useState<"transactions" | "statements">("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add transaction form
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ type: "income", amount: "", description: "", date: "", category: "" });
  const [savingTx, setSavingTx] = useState(false);

  // Publish statement form
  const [showStmtForm, setShowStmtForm] = useState(false);
  const [stmtForm, setStmtForm] = useState({ title: "", period: "", summary: "", totalIncome: "", totalExpense: "", notes: "" });
  const [savingStmt, setSavingStmt] = useState(false);

  const canEdit = can.editFinance(role);
  const canPublish = can.publishFinancialStatement(role);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [txSnap, stmtSnap] = await Promise.all([
        getDocs(query(collection(db, "transactions"), orderBy("date", "desc"))),
        getDocs(query(collection(db, "financial_statements"), orderBy("publishedAt", "desc"))),
      ]);
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setStatements(stmtSnap.docs.map(d => ({ id: d.id, ...d.data() } as Statement)));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const saveTx = async () => {
    if (!txForm.amount || !txForm.description || !txForm.date)
      return Alert.alert("Error", "Amount, description and date are required.");
    setSavingTx(true);
    try {
      await addDoc(collection(db, "transactions"), {
        ...txForm,
        amount: parseFloat(txForm.amount),
        recordedBy: user?.displayName,
        createdAt: serverTimestamp(),
      });
      setTxForm({ type: "income", amount: "", description: "", date: "", category: "" });
      setShowTxForm(false);
      load();
    } catch { Alert.alert("Error", "Failed to save transaction."); }
    setSavingTx(false);
  };

  const saveStmt = async () => {
    if (!stmtForm.title || !stmtForm.period || !stmtForm.summary || !stmtForm.totalIncome || !stmtForm.totalExpense)
      return Alert.alert("Error", "Please fill all required fields.");
    setSavingStmt(true);
    try {
      await addDoc(collection(db, "financial_statements"), {
        ...stmtForm,
        totalIncome: parseFloat(stmtForm.totalIncome),
        totalExpense: parseFloat(stmtForm.totalExpense),
        publishedBy: user?.displayName,
        publishedRole: role,
        publishedAt: serverTimestamp(),
      });
      setStmtForm({ title: "", period: "", summary: "", totalIncome: "", totalExpense: "", notes: "" });
      setShowStmtForm(false);
      load();
    } catch { Alert.alert("Error", "Failed to publish statement."); }
    setSavingStmt(false);
  };

  if (!can.viewFinance(role)) {
    return (
      <View style={s.page}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          <Text style={s.title}>Finance</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={s.center}><Text style={s.empty}>Access restricted.</Text></View>
      </View>
    );
  }

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={s.title}>Finance</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {canPublish && (
            <TouchableOpacity onPress={() => setShowStmtForm(true)} style={[s.addBtn, { backgroundColor: "#16a34a" }]}>
              <Ionicons name="document-text" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity onPress={() => setShowTxForm(true)} style={s.addBtn}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={["#3b1f6e"]} />}
      >
        {/* Summary cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: "#dcfce7" }]}>
            <Text style={[s.summaryLabel, { color: "#15803d" }]}>Income</Text>
            <Text style={[s.summaryValue, { color: "#15803d" }]}>GH₵{totalIncome.toLocaleString()}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: "#fef2f2" }]}>
            <Text style={[s.summaryLabel, { color: "#dc2626" }]}>Expenses</Text>
            <Text style={[s.summaryValue, { color: "#dc2626" }]}>GH₵{totalExpense.toLocaleString()}</Text>
          </View>
        </View>
        <View style={[s.balanceCard, { backgroundColor: balance >= 0 ? "#eff6ff" : "#fef2f2" }]}>
          <Text style={s.balanceLabel}>Balance</Text>
          <Text style={[s.balanceValue, { color: balance >= 0 ? "#1d4ed8" : "#dc2626" }]}>
            GH₵{balance.toLocaleString()}
          </Text>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {(["transactions", "statements"] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === "transactions" ? "Transactions" : "Statements"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#3b1f6e" style={{ marginTop: 20 }} />
        ) : tab === "transactions" ? (
          transactions.length === 0
            ? <Text style={s.empty}>No transactions yet.</Text>
            : transactions.map(t => (
              <View key={t.id} style={s.txRow}>
                <View style={[s.txIcon, { backgroundColor: t.type === "income" ? "#dcfce7" : "#fef2f2" }]}>
                  <Ionicons
                    name={t.type === "income" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={t.type === "income" ? "#15803d" : "#dc2626"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txDesc}>{t.description}</Text>
                  <Text style={s.txMeta}>{t.date}{t.category ? ` · ${t.category}` : ""}{t.recordedBy ? ` · ${t.recordedBy}` : ""}</Text>
                </View>
                <Text style={[s.txAmount, { color: t.type === "income" ? "#15803d" : "#dc2626" }]}>
                  {t.type === "income" ? "+" : "-"}GH₵{t.amount?.toLocaleString()}
                </Text>
              </View>
            ))
        ) : (
          statements.length === 0
            ? <Text style={s.empty}>No financial statements published yet.</Text>
            : statements.map(stmt => (
              <View key={stmt.id} style={s.stmtCard}>
                <View style={s.stmtHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stmtTitle}>{stmt.title}</Text>
                    <Text style={s.stmtPeriod}>Period: {stmt.period}</Text>
                  </View>
                  <View style={s.publishedBadge}><Text style={s.publishedText}>Published</Text></View>
                </View>
                <View style={s.stmtSummaryRow}>
                  <View style={[s.stmtSummaryItem, { backgroundColor: "#dcfce7" }]}>
                    <Text style={{ fontSize: 11, color: "#15803d" }}>Income</Text>
                    <Text style={{ fontWeight: "bold", color: "#15803d" }}>GH₵{stmt.totalIncome?.toLocaleString()}</Text>
                  </View>
                  <View style={[s.stmtSummaryItem, { backgroundColor: "#fef2f2" }]}>
                    <Text style={{ fontSize: 11, color: "#dc2626" }}>Expense</Text>
                    <Text style={{ fontWeight: "bold", color: "#dc2626" }}>GH₵{stmt.totalExpense?.toLocaleString()}</Text>
                  </View>
                  <View style={[s.stmtSummaryItem, { backgroundColor: "#eff6ff" }]}>
                    <Text style={{ fontSize: 11, color: "#1d4ed8" }}>Balance</Text>
                    <Text style={{ fontWeight: "bold", color: "#1d4ed8" }}>GH₵{(stmt.totalIncome - stmt.totalExpense)?.toLocaleString()}</Text>
                  </View>
                </View>
                <Text style={s.stmtSummaryText}>{stmt.summary}</Text>
                {stmt.notes ? <Text style={s.stmtNotes}>{stmt.notes}</Text> : null}
                <Text style={s.stmtPublishedBy}>Published by {stmt.publishedBy} ({stmt.publishedRole?.replace(/_/g, " ")})</Text>
              </View>
            ))
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={showTxForm} animationType="slide" transparent onRequestClose={() => setShowTxForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Record Transaction</Text>
                <TouchableOpacity onPress={() => setShowTxForm(false)}>
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={s.typeRow}>
                {(["income", "expense"] as const).map(t => (
                  <TouchableOpacity key={t} style={[s.typeBtn, txForm.type === t && s.typeBtnActive]} onPress={() => setTxForm(p => ({ ...p, type: t }))}>
                    <Text style={[s.typeBtnText, txForm.type === t && s.typeBtnTextActive]}>{t === "income" ? "Income" : "Expense"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {[
                { key: "amount", label: "Amount (GH₵) *", placeholder: "0.00", keyboard: "numeric" as const },
                { key: "description", label: "Description *", placeholder: "e.g. Dues collection" },
                { key: "category", label: "Category", placeholder: "e.g. Dues, Offering" },
                { key: "date", label: "Date * (YYYY-MM-DD)", placeholder: "2026-07-12" },
              ].map(f => (
                <View key={f.key}>
                  <Text style={s.label}>{f.label}</Text>
                  <TextInput
                    style={s.input}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9ca3af"
                    value={(txForm as any)[f.key]}
                    onChangeText={v => setTxForm(p => ({ ...p, [f.key]: v }))}
                    keyboardType={f.keyboard}
                  />
                </View>
              ))}
              <TouchableOpacity style={s.saveBtn} onPress={saveTx} disabled={savingTx}>
                {savingTx ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Publish Statement Modal */}
      <Modal visible={showStmtForm} animationType="slide" transparent onRequestClose={() => setShowStmtForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalOverlay}>
            <ScrollView contentContainerStyle={{ justifyContent: "flex-end", flexGrow: 1 }}>
              <View style={s.modalCard}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Publish Financial Statement</Text>
                  <TouchableOpacity onPress={() => setShowStmtForm(false)}>
                    <Ionicons name="close" size={22} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                {[
                  { key: "title", label: "Title *", placeholder: "e.g. Q1 2025 Report" },
                  { key: "period", label: "Period *", placeholder: "e.g. January - March 2025" },
                  { key: "totalIncome", label: "Total Income (GH₵) *", placeholder: "0.00", keyboard: "numeric" as const },
                  { key: "totalExpense", label: "Total Expense (GH₵) *", placeholder: "0.00", keyboard: "numeric" as const },
                  { key: "summary", label: "Summary *", placeholder: "Key highlights for this period...", multi: true },
                  { key: "notes", label: "Additional Notes", placeholder: "Optional", multi: true },
                ].map(f => (
                  <View key={f.key}>
                    <Text style={s.label}>{f.label}</Text>
                    <TextInput
                      style={[s.input, f.multi && { height: 80, textAlignVertical: "top" }]}
                      placeholder={f.placeholder}
                      placeholderTextColor="#9ca3af"
                      value={(stmtForm as any)[f.key]}
                      onChangeText={v => setStmtForm(p => ({ ...p, [f.key]: v }))}
                      keyboardType={f.keyboard}
                      multiline={f.multi}
                    />
                  </View>
                ))}
                <TouchableOpacity style={[s.saveBtn, { backgroundColor: "#16a34a" }]} onPress={saveStmt} disabled={savingStmt}>
                  {savingStmt ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Publish to All Members</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14 },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: "bold" },
  balanceCard: { borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  balanceValue: { fontSize: 22, fontWeight: "bold" },
  tabRow: { flexDirection: "row", backgroundColor: "#e5e7eb", borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#3b1f6e" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  tabTextActive: { color: "#fff" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 14, fontWeight: "500", color: "#111827" },
  txMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "bold" },
  stmtCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, gap: 10 },
  stmtHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stmtTitle: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  stmtPeriod: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  publishedBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  publishedText: { fontSize: 11, color: "#15803d", fontWeight: "600" },
  stmtSummaryRow: { flexDirection: "row", gap: 8 },
  stmtSummaryItem: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  stmtSummaryText: { fontSize: 13, color: "#374151" },
  stmtNotes: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
  stmtPublishedBy: { fontSize: 11, color: "#9ca3af" },
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
