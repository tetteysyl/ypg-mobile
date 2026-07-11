import { create } from "zustand";
import { Role } from "../lib/roles";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
  isYaf?: boolean;
  isDistantMember?: boolean;
  yafStartedAt?: string;
  cellChoice?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
}

interface AuthState {
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
}));
