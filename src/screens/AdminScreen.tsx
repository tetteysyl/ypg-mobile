import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../lib/api";
import { can, ROLE_LABELS, Role, SINGLETON_ROLES } from "../lib/roles";

const ALL_ROLES: Role[] = [
  "president","vice_president","general_secretary","assistant_general_secretary",
  "financial_secretary","treasurer","evangelism_coordinator","male_organizer","female_organizer","member",
];

export default function AdminScreen({ navigation }: any) {
  const { user, setUser } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleModal, setRoleModal] = useState<{ member: any } | null>(null);
  const [newRole, setNewRole] = useState<Role>("member");
  const [saving, setSaving] = useState(false);
  const role = user?.role ?? "member";

  const load = async () => {
    try {
      const [memRes, pendRes] = await Promise.all([
        apiFetch("/admin/members"),
        apiFetch("/admin/members?status=pending"),
      ]);
      const mems = await memRes.json();
      const pends = await pendRes.json();
      if (Array.isArray(mems)) setMembers(mems);
      if (Array.isArray(pends)) setPending(pends);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (can.accessAdmin(role)) load(); }, [role]);

  const roleTakenBy = (r: Role, excludeId: string) => {
    if (!SINGLETON_ROLES.includes(r)) return null;
    return members.find(m => m.role === r && m.id !== excludeId) ?? null;
  };

  const approve = async (memberId: string) => {
    try {
      await apiFetch("/approve-member", { method: "POST", body: JSON.stringify({ memberId, action: "approve" }) });
      load();
    } catch { Alert.alert("Error", "Failed to approve."); }
  };

  const reject = async (memberId: string) => {
    Alert.alert("Reject", "Reject this member?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject", style: "destructive", onPress: async () => {
          try {
            await apiFetch("/approve-member", { method: "POST", body: JSON.stringify({ memberId, action: "reject" }) });
            load();
          } catch { Alert.alert("Error", "Failed to reject."); }
        }
      }
    ]);
  };

  const openRoleModal = (m: any) => {
    setRoleModal({ member: m });
    setNewRole(m.role);
  };

  const saveRole = async () => {
    if (!roleModal) return;
    const m = roleModal.member;
    if (newRole === m.role) { setRoleModal(null); return; }

    // Check if transferring own singleton role
    const isSelf = m.id === user?.uid;
    const holder = roleTakenBy(newRole, m.id);

    if (holder && holder.id === user?.uid && isSelf) {
      // transferring to this person, current user holds it
    } else if (holder) {
      return Alert.alert("Role Taken", `${ROLE_LABELS[newRole]} is already held by ${holder.displayName}.`);
    }

    if (isSelf && SINGLETON_ROLES.includes(m.role as Role)) {
      Alert.alert(
        "Transfer Role",
        `You will hand off "${ROLE_LABELS[m.role as Role]}" to ${m.displayName} and become a member. Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Transfer", style: "destructive", onPress: () => doSaveRole(m, isSelf) }
        ]
      );
    } else {
      doSaveRole(m, isSelf);
    }
  };

  const doSaveRole = async (m: any, isSelf: boolean) => {
    setSaving(true);
    try {
      const res = await apiFetch("/admin/members", {
        method: "PATCH",
        body: JSON.stringify({ memberId: m.id, role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      if (isSelf && user) {
        setUser({ ...user, role: "member" });
      }
      setRoleModal(null);
      load();
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const removeMember = (m: any) => {
    Alert.alert("Remove Member", `Remove ${m.displayName} from the guild?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try {
            await apiFetch("/admin/members", { method: "DELETE", body: JSON.stringify({ memberId: m.id }) });
            load();
          } catch { Alert.alert("Error", "Failed to remove."); }
        }
      }
    ]);
  };

  if (!can.accessAdmin(role)) {
    return <View style={s.center}><Text style={s.empty}>Access restricted.</Text></View>;
  }

  return (
    <View style={s.page}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={s.title}>Admin Panel</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? <ActivityIndicator color="#3b1f6e" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.content}>
          {/* Pending approvals */}
          {pending.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Pending Approvals ({pending.length})</Text>
              {pending.map(m => (
                <View key={m.id} style={s.pendingCard}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{m.displayName}</Text>
                    <Text style={s.email}>{m.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => approve(m.id)} style={s.approveBtn}>
                    <Ionicons name="checkmark" size={16} color="#15803d" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => reject(m.id)} style={s.rejectBtn}>
                    <Ionicons name="close" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Member management */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Manage Members ({members.length})</Text>
            {members.map(m => (
              <View key={m.id} style={s.memberCard}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{m.displayName}</Text>
                  <Text style={s.roleText}>{ROLE_LABELS[m.role as Role] ?? m.role}</Text>
                </View>
                <TouchableOpacity onPress={() => openRoleModal(m)} style={s.actionBtn}>
                  <Ionicons name="shield" size={16} color="#3b1f6e" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeMember(m)} style={s.actionBtn}>
                  <Ionicons name="trash" size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Role modal */}
      <Modal visible={!!roleModal} animationType="slide" transparent onRequestClose={() => setRoleModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={() => setRoleModal(null)}><Ionicons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            {roleModal && <Text style={s.modalSub}>{roleModal.member.displayName}</Text>}
            <ScrollView style={{ maxHeight: 300 }}>
              {ALL_ROLES.map(r => {
                const takenBy = roleModal ? roleTakenBy(r, roleModal.member.id) : null;
                const takenBySelf = takenBy?.id === user?.uid;
                const disabled = !!takenBy && !takenBySelf;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.roleOption, newRole === r && s.roleOptionActive, disabled && s.roleOptionDisabled]}
                    onPress={() => !disabled && setNewRole(r)}
                    disabled={disabled}
                  >
                    <Text style={[s.roleOptionText, newRole === r && { color: "#fff" }, disabled && { color: "#9ca3af" }]}>
                      {takenBy && !takenBySelf ? "🔒 " : takenBySelf ? "⇄ " : ""}{ROLE_LABELS[r]}
                    </Text>
                    {takenBy && !takenBySelf && <Text style={s.takenByText}>({takenBy.displayName})</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.saveBtn} onPress={saveRole} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Role</Text>}
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
  content: { padding: 16 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#1f2937", marginBottom: 12 },
  pendingCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3b1f6e", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  name: { fontSize: 14, fontWeight: "600", color: "#111827" },
  email: { fontSize: 12, color: "#6b7280" },
  roleText: { fontSize: 12, color: "#6b7280" },
  approveBtn: { padding: 8, backgroundColor: "#dcfce7", borderRadius: 8 },
  rejectBtn: { padding: 8, backgroundColor: "#fef2f2", borderRadius: 8 },
  actionBtn: { padding: 8 },
  empty: { color: "#9ca3af" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  modalSub: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  roleOption: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: "#f9fafb", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roleOptionActive: { backgroundColor: "#3b1f6e" },
  roleOptionDisabled: { opacity: 0.5 },
  roleOptionText: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  takenByText: { fontSize: 11, color: "#9ca3af" },
  saveBtn: { backgroundColor: "#3b1f6e", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
