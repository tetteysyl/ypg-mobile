import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/messages");
      const json = await res.json();
      if (Array.isArray(json)) setMessages(json);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    apiFetch("/get-members").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setMembers(d.filter((m: any) => m.id !== user?.uid));
    }).catch(() => {});
  }, [user]);

  const send = async () => {
    if (!selected || !msgText.trim()) return Alert.alert("Error", "Select a recipient and enter a message.");
    setSending(true);
    try {
      const res = await apiFetch("/messages", {
        method: "POST",
        body: JSON.stringify({ toId: selected, content: msgText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setShowCompose(false);
      setSelected("");
      setMsgText("");
      load();
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSending(false);
  };

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity onPress={() => setShowCompose(true)} style={s.addBtn}>
          <Ionicons name="create" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} /> : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={["#3b1f6e"]} />}
        >
          {messages.length === 0 ? <Text style={s.empty}>No messages yet.</Text> :
            messages.map(m => (
              <View key={m.id} style={[s.msgCard, !m.read && s.unread]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(m.fromName ?? "?")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fromName}>{m.fromName}</Text>
                  <Text style={s.msgContent} numberOfLines={2}>{m.content}</Text>
                </View>
                {!m.read && <View style={s.dot} />}
              </View>
            ))
          }
        </ScrollView>
      )}

      <Modal visible={showCompose} animationType="slide" transparent onRequestClose={() => setShowCompose(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setShowCompose(false)}><Ionicons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            <Text style={s.label}>To</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={s.recipientList}>
                {members.map(m => (
                  <TouchableOpacity key={m.id} style={[s.recipientChip, selected === m.id && s.recipientChipActive]} onPress={() => setSelected(m.id)}>
                    <Text style={[s.recipientText, selected === m.id && { color: "#fff" }]}>{m.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={s.label}>Message</Text>
            <TextInput
              style={[s.input, { height: 100, textAlignVertical: "top" }]}
              placeholder="Type your message..."
              placeholderTextColor="#9ca3af"
              value={msgText}
              onChangeText={setMsgText}
              multiline
            />
            <TouchableOpacity style={s.saveBtn} onPress={send} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Send</Text>}
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
  msgCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  unread: { borderLeftWidth: 3, borderLeftColor: "#3b1f6e" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  fromName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  msgContent: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b1f6e" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", marginBottom: 14, backgroundColor: "#fff" },
  recipientList: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  recipientChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  recipientChipActive: { backgroundColor: "#3b1f6e", borderColor: "#3b1f6e" },
  recipientText: { fontSize: 13, color: "#374151" },
  saveBtn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
