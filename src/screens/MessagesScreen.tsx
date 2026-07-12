import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can } from "../lib/roles";

type Conversation = {
  peerId: string;
  peerName: string;
  peerRole: string;
  unread: number;
  lastAt: number;
};

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: number;
  type: string;
};

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const role = user?.role ?? "member";
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active chat state
  const [activeChat, setActiveChat] = useState<{ type: "direct" | "group"; peerId?: string; peerName?: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // New chat picker
  const [showPicker, setShowPicker] = useState(false);

  const canSendGroup = can.sendBroadcast(role);

  const loadInbox = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [inboxRes, memRes] = await Promise.all([
        apiFetch(`/messages?inbox=${user?.uid}`),
        apiFetch("/get-members"),
      ]);
      const inboxMap: Record<string, { unread: number; lastAt: number }> = await inboxRes.json();
      const mems: any[] = await memRes.json();
      if (Array.isArray(mems)) setMembers(mems.filter((m: any) => m.id !== user?.uid));

      if (inboxMap && typeof inboxMap === "object" && Array.isArray(mems)) {
        const memberMap: Record<string, any> = {};
        mems.forEach((m: any) => { memberMap[m.id] = m; });
        const list: Conversation[] = Object.entries(inboxMap).map(([peerId, info]) => ({
          peerId,
          peerName: memberMap[peerId]?.displayName ?? "Unknown",
          peerRole: memberMap[peerId]?.role ?? "",
          unread: info.unread,
          lastAt: info.lastAt,
        })).sort((a, b) => b.lastAt - a.lastAt);
        setConvs(list);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadInbox(); }, [user]);

  const openChat = async (chat: { type: "direct" | "group"; peerId?: string; peerName?: string }) => {
    setActiveChat(chat);
    setMessages([]);
    setChatLoading(true);
    setShowPicker(false);
    try {
      let url = "";
      if (chat.type === "group") {
        url = `/messages?type=group&viewerId=${user?.uid}`;
      } else {
        const ids = [user?.uid, chat.peerId].sort();
        url = `/messages?conversationId=${ids[0]}__${ids[1]}`;
      }
      const res = await apiFetch(url);
      const json = await res.json();
      if (Array.isArray(json)) setMessages(json);
    } catch {}
    setChatLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const send = async () => {
    if (!newMsg.trim() || !activeChat) return;
    setSending(true);
    try {
      let body: any;
      if (activeChat.type === "group") {
        body = { type: "group", content: newMsg };
      } else {
        const ids = [user?.uid, activeChat.peerId].sort();
        body = {
          type: "direct",
          conversationId: `${ids[0]}__${ids[1]}`,
          recipientId: activeChat.peerId,
          content: newMsg,
        };
      }
      const res = await apiFetch("/messages", { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setNewMsg("");
      // Reload messages
      await openChat(activeChat);
    } catch (e: any) { Alert.alert("Error", e.message ?? "Failed to send."); }
    setSending(false);
  };

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={s.addBtn}>
          <Ionicons name="create" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} /> : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInbox(true)} colors={["#3b1f6e"]} />}
        >
          {/* Group chat entry */}
          <TouchableOpacity style={s.convCard} onPress={() => openChat({ type: "group", peerName: "Everyone" })}>
            <View style={[s.avatar, { backgroundColor: "#3b1f6e" }]}>
              <Ionicons name="people" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.peerName}>Group Chat</Text>
              <Text style={s.peerRole}>All members</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          {convs.length === 0
            ? <Text style={s.empty}>No direct messages yet. Tap the pencil icon to start one.</Text>
            : convs.map(c => (
              <TouchableOpacity key={c.peerId} style={s.convCard} onPress={() => openChat({ type: "direct", peerId: c.peerId, peerName: c.peerName })}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(c.peerName ?? "?")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.peerName}>{c.peerName}</Text>
                  <Text style={s.peerRole}>{c.peerRole}</Text>
                </View>
                {c.unread > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{c.unread > 9 ? "9+" : c.unread}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      )}

      {/* Chat Modal */}
      <Modal visible={!!activeChat} animationType="slide" onRequestClose={() => setActiveChat(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.chatPage}>
            <View style={s.chatTopBar}>
              <TouchableOpacity onPress={() => { setActiveChat(null); loadInbox(); }}>
                <Ionicons name="arrow-back" size={22} color="#1f2937" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.chatTitle}>{activeChat?.peerName ?? "Chat"}</Text>
                {activeChat?.type === "group" && <Text style={s.chatSub}>Group message</Text>}
              </View>
            </View>

            {chatLoading ? (
              <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} />
            ) : (
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={s.chatList}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              >
                {messages.length === 0 && <Text style={s.empty}>No messages yet. Say hi!</Text>}
                {messages.map(m => {
                  const isMine = m.senderId === user?.uid;
                  return (
                    <View key={m.id} style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                      {!isMine && activeChat?.type === "group" && (
                        <Text style={s.senderName}>{m.senderName}</Text>
                      )}
                      <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{m.content}</Text>
                      <Text style={[s.bubbleTime, isMine && { color: "rgba(255,255,255,0.6)" }]}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {(activeChat?.type === "direct" || canSendGroup) && (
              <View style={s.inputBar}>
                <TextInput
                  style={s.msgInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#9ca3af"
                  value={newMsg}
                  onChangeText={setNewMsg}
                  multiline
                />
                <TouchableOpacity style={s.sendBtn} onPress={send} disabled={sending || !newMsg.trim()}>
                  {sending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Ionicons name="send" size={18} color="#fff" />
                  }
                </TouchableOpacity>
              </View>
            )}
            {activeChat?.type === "group" && !canSendGroup && (
              <View style={s.readOnlyBar}>
                <Text style={s.readOnlyText}>Only executives can send group messages</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contact picker */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {canSendGroup && (
              <TouchableOpacity style={s.pickerRow} onPress={() => openChat({ type: "group", peerName: "Everyone" })}>
                <View style={[s.avatar, { backgroundColor: "#3b1f6e" }]}>
                  <Ionicons name="people" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={s.peerName}>Group Chat</Text>
                  <Text style={s.peerRole}>Message all members</Text>
                </View>
              </TouchableOpacity>
            )}
            <ScrollView>
              {members.map(m => (
                <TouchableOpacity key={m.id} style={s.pickerRow} onPress={() => openChat({ type: "direct", peerId: m.id, peerName: m.displayName })}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={s.peerName}>{m.displayName}</Text>
                    <Text style={s.peerRole}>{m.role}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  list: { padding: 12, gap: 8, paddingBottom: 32 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14, paddingHorizontal: 24 },
  convCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f0c940", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#3b1f6e", fontWeight: "bold", fontSize: 16 },
  peerName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  peerRole: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  badge: { backgroundColor: "#3b1f6e", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  // Chat
  chatPage: { flex: 1, backgroundColor: "#f9fafb" },
  chatTopBar: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  chatTitle: { fontSize: 17, fontWeight: "bold", color: "#1f2937" },
  chatSub: { fontSize: 12, color: "#6b7280" },
  chatList: { padding: 16, gap: 8, paddingBottom: 16 },
  bubble: { maxWidth: "75%", borderRadius: 16, padding: 12 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#3b1f6e" },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  senderName: { fontSize: 11, fontWeight: "700", color: "#3b1f6e", marginBottom: 3 },
  bubbleText: { fontSize: 14, color: "#111827" },
  bubbleTextMine: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: "#9ca3af", marginTop: 4, textAlign: "right" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6", gap: 8 },
  msgInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: "#111827", maxHeight: 100, backgroundColor: "#f9fafb" },
  sendBtn: { backgroundColor: "#3b1f6e", width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  readOnlyBar: { padding: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  readOnlyText: { fontSize: 12, color: "#6b7280" },
  // Picker modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
});
