import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can } from "../lib/roles";

export default function BroadcastScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const role = user?.role ?? "member";

  if (!can.sendBroadcast(role)) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Access restricted.</Text>
      </View>
    );
  }

  const send = async () => {
    if (!title || !message) return Alert.alert("Error", "Title and message are required.");
    Alert.alert("Send Broadcast", `Send "${title}" to all members?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send", onPress: async () => {
          setSending(true);
          try {
            const res = await apiFetch("/broadcast", {
              method: "POST",
              body: JSON.stringify({ title, message }),
            });
            if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
            Alert.alert("Sent", "Broadcast delivered to all members.");
            setTitle("");
            setMessage("");
          } catch (e: any) { Alert.alert("Error", e.message); }
          setSending(false);
        }
      }
    ]);
  };

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={s.title}>Broadcast</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.infoBox}>
          <Ionicons name="megaphone" size={16} color="#1d4ed8" />
          <Text style={s.infoText}>This message will be sent to all active members via in-app notification and email.</Text>
        </View>

        <Text style={s.label}>Subject / Title *</Text>
        <TextInput style={s.input} placeholder="e.g. Important Announcement" placeholderTextColor="#9ca3af" value={title} onChangeText={setTitle} />

        <Text style={s.label}>Message *</Text>
        <TextInput
          style={[s.input, { height: 160, textAlignVertical: "top" }]}
          placeholder="Type your message here..."
          placeholderTextColor="#9ca3af"
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <TouchableOpacity style={s.btn} onPress={send} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="send" size={16} color="#fff" />
              <Text style={s.btnText}>Send to All Members</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  content: { padding: 16 },
  infoBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#dbeafe", borderRadius: 12, padding: 12, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, color: "#1e40af" },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", marginBottom: 14, backgroundColor: "#fff" },
  btn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  empty: { color: "#9ca3af" },
});
