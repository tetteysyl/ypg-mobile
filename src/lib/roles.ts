export type Role =
  | "president"
  | "vice_president"
  | "general_secretary"
  | "assistant_general_secretary"
  | "financial_secretary"
  | "treasurer"
  | "evangelism_coordinator"
  | "male_organizer"
  | "female_organizer"
  | "member"
  | "pending";

export const ROLE_LABELS: Record<Role, string> = {
  president: "President",
  vice_president: "Vice President",
  general_secretary: "General Secretary",
  assistant_general_secretary: "Asst. General Secretary",
  financial_secretary: "Financial Secretary",
  treasurer: "Treasurer",
  evangelism_coordinator: "Evangelism Coordinator",
  male_organizer: "Male Organizer",
  female_organizer: "Female Organizer",
  member: "Member",
  pending: "Pending Approval",
};

export const ROLE_BADGE_COLORS: Record<Role, { bg: string; text: string }> = {
  president: { bg: "#f3e8ff", text: "#6b21a8" },
  vice_president: { bg: "#ede9fe", text: "#5b21b6" },
  general_secretary: { bg: "#e0e7ff", text: "#3730a3" },
  assistant_general_secretary: { bg: "#e0f2fe", text: "#0369a1" },
  financial_secretary: { bg: "#dcfce7", text: "#15803d" },
  treasurer: { bg: "#d1fae5", text: "#065f46" },
  evangelism_coordinator: { bg: "#dbeafe", text: "#1d4ed8" },
  male_organizer: { bg: "#ffedd5", text: "#c2410c" },
  female_organizer: { bg: "#fce7f3", text: "#9d174d" },
  member: { bg: "#f3f4f6", text: "#374151" },
  pending: { bg: "#fef9c3", text: "#854d0e" },
};

export const SINGLETON_ROLES: Role[] = [
  "president","vice_president","general_secretary","assistant_general_secretary",
  "financial_secretary","treasurer","evangelism_coordinator","male_organizer","female_organizer",
];

export const can = {
  viewAllMembers: (role: Role) => !["member", "pending"].includes(role),
  manageMembers: (role: Role) => ["president", "vice_president"].includes(role),
  manageDues: (role: Role) => ["financial_secretary", "treasurer"].includes(role),
  viewDuesStatus: (role: Role) => ["president", "financial_secretary", "treasurer"].includes(role),
  sendDuesReminder: (role: Role) => role === "financial_secretary",
  sendBroadcast: (role: Role) =>
    ["president", "vice_president", "general_secretary", "assistant_general_secretary"].includes(role),
  viewFinance: (role: Role) =>
    ["president", "vice_president", "financial_secretary", "treasurer"].includes(role),
  editFinance: (role: Role) => ["financial_secretary", "treasurer"].includes(role),
  publishReport: (role: Role) => ["president", "general_secretary"].includes(role),
  draftReport: (role: Role) =>
    ["president", "general_secretary", "vice_president", "assistant_general_secretary"].includes(role),
  scheduleMeeting: (role: Role) =>
    ["president", "vice_president", "male_organizer", "female_organizer"].includes(role),
  markAttendance: (role: Role) =>
    ["president", "vice_president", "male_organizer", "female_organizer"].includes(role),
  accessAdmin: (role: Role) => ["president", "vice_president"].includes(role),
  viewDateOfBirth: (role: Role) => role === "president",
};
