"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserItem } from "@/types/sermon";
import { getUsers, loginUser } from "@/services/api";

interface TeensAuthContextType {
  currentUser: UserItem;
  token: string;
  allUsers: UserItem[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPastor: boolean;
  isLeader: boolean;
  canManageEvents: boolean;
  canManageMembers: boolean;
  isGhostMode: boolean;
  originalAdmin: UserItem | null;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  startGhostMode: (user: UserItem) => void;
  exitGhostMode: () => void;
  switchProfile: (roleOrEmail: "ADMIN" | "PASTOR" | "LEADER" | "TEEN" | "JORGE" | "CARLOS") => void;
  refreshUsers: () => Promise<void>;
}

export const DEFAULT_ADMIN: UserItem = {
  id: "99999999-8888-7777-6666-555555555555",
  name: "Admin Master (Super Admin)",
  email: "admin@agendateens.com",
  role: "ADMIN",
  phone: "(85) 99999-0000",
  active: true,
  created_at: new Date().toISOString(),
};

export const DEFAULT_PASTOR: UserItem = {
  id: "00000000-1111-2222-3333-444444444444",
  name: "Pr. Paulo Roberto (Pastor Sênior)",
  email: "pastor@agendateens.com",
  role: "PASTOR",
  phone: "(85) 97777-1111",
  active: true,
  created_at: new Date().toISOString(),
};

export const DEFAULT_LEADER: UserItem = {
  id: "b97e10af-d8f2-4bd6-84d4-3d7f193965db",
  name: "Jorge Oliveira (Líder Teatro)",
  email: "jorge@agendateens.com",
  role: "LEADER",
  phone: "(11) 98888-1001",
  ministries: [{ id: "d5156143-2b09-4b84-92ae-55f310977956", name: "Ministério de Teatro & Artes" }],
  tags: ["#Teatro"],
  active: true,
  created_at: new Date().toISOString(),
};

export const DEFAULT_TEEN: UserItem = {
  id: "270f8a1a-214e-4fbd-9cf8-00527869f0eb",
  name: "Carlos Silva (Membro Teatro)",
  email: "carlos@agendateens.com",
  role: "TEEN",
  phone: "(11) 97777-2002",
  parent_name: "Marcos Silva (Pai)",
  parent_phone: "(11) 97777-2000",
  ministries: [{ id: "d5156143-2b09-4b84-92ae-55f310977956", name: "Ministério de Teatro & Artes" }],
  tags: ["#Teatro"],
  active: true,
  created_at: new Date().toISOString(),
};

export const DEFAULT_GUEST: UserItem = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "Visitante",
  email: "visitante@agendateens.com",
  role: "TEEN",
  active: false,
  created_at: new Date().toISOString(),
};

const TeensAuthContext = createContext<TeensAuthContextType>({
  currentUser: DEFAULT_ADMIN,
  token: DEFAULT_ADMIN.id,
  allUsers: [],
  isAuthenticated: true,
  isAdmin: true,
  isPastor: true,
  isLeader: true,
  canManageEvents: true,
  canManageMembers: true,
  isGhostMode: false,
  originalAdmin: null,
  isLoginModalOpen: false,
  openLoginModal: () => { },
  closeLoginModal: () => { },
  login: async () => { },
  logout: () => { },
  startGhostMode: () => { },
  exitGhostMode: () => { },
  switchProfile: () => { },
  refreshUsers: async () => { },
});

export function TeensAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserItem>(DEFAULT_ADMIN);
  const [token, setToken] = useState<string>(DEFAULT_ADMIN.id);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [isGhostMode, setIsGhostMode] = useState<boolean>(false);
  const [originalAdmin, setOriginalAdmin] = useState<UserItem | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const fetchUsersFromDb = async () => {
    try {
      const users = await getUsers();
      if (users && users.length > 0) {
        setAllUsers(users);
        const currentSavedId = localStorage.getItem("agenda_teens_user_id");
        if (currentSavedId) {
          const match = users.find((u) => u.id === currentSavedId);
          if (match && !isGhostMode) {
            setCurrentUser(match);
            setToken(match.id);
          }
        }
      }
    } catch (e) {
      console.warn("Não foi possível sincronizar usuários do banco em background:", e);
    }
  };

  useEffect(() => {
    fetchUsersFromDb();

    // Carrega a sessão salva no navegador
    const savedUserJson = localStorage.getItem("agenda_teens_auth_user");
    const savedToken = localStorage.getItem("agenda_teens_auth_token");

    if (savedUserJson && savedToken) {
      try {
        const parsed = JSON.parse(savedUserJson) as UserItem;
        setCurrentUser(parsed);
        setToken(savedToken);
        setIsAuthenticated(true);
        return;
      } catch (err) {
        console.error("Erro ao carregar sessão anterior:", err);
      }
    }

    // Fallback legado se existir role anterior
    const savedRole = localStorage.getItem("agenda_teens_role");
    if (savedRole === "TEEN") {
      setCurrentUser(DEFAULT_TEEN);
      setToken(DEFAULT_TEEN.id);
    } else if (savedRole === "LEADER") {
      setCurrentUser(DEFAULT_LEADER);
      setToken(DEFAULT_LEADER.id);
    } else if (savedRole === "PASTOR") {
      setCurrentUser(DEFAULT_PASTOR);
      setToken(DEFAULT_PASTOR.id);
    } else {
      setCurrentUser(DEFAULT_ADMIN);
      setToken(DEFAULT_ADMIN.id);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginUser(email, pass);
    if (res && res.user && res.token) {
      setCurrentUser(res.user);
      setToken(res.token);
      setIsAuthenticated(true);
      setIsGhostMode(false);
      setOriginalAdmin(null);
      localStorage.setItem("agenda_teens_auth_token", res.token);
      localStorage.setItem("agenda_teens_auth_user", JSON.stringify(res.user));
      localStorage.setItem("agenda_teens_role", res.user.role);
      localStorage.setItem("agenda_teens_user_id", res.user.id);
      setIsLoginModalOpen(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsGhostMode(false);
    setOriginalAdmin(null);
    setCurrentUser(DEFAULT_GUEST);
    setToken("");
    localStorage.removeItem("agenda_teens_auth_token");
    localStorage.removeItem("agenda_teens_auth_user");
    localStorage.removeItem("agenda_teens_role");
    localStorage.removeItem("agenda_teens_user_id");
    setIsLoginModalOpen(true);
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  // Modo Ghost: Exclusivo para o Super Admin simular qualquer usuário
  const startGhostMode = (targetUser: UserItem) => {
    if (!originalAdmin) {
      setOriginalAdmin(currentUser);
    }
    setCurrentUser(targetUser);
    setToken(targetUser.id);
    setIsGhostMode(true);
  };

  const exitGhostMode = () => {
    if (originalAdmin) {
      setCurrentUser(originalAdmin);
      setToken(originalAdmin.id);
    } else {
      const adminMatch = allUsers.find((u) => u.role === "ADMIN") || DEFAULT_ADMIN;
      setCurrentUser(adminMatch);
      setToken(adminMatch.id);
    }
    setIsGhostMode(false);
    setOriginalAdmin(null);
  };

  const switchProfile = (target: "ADMIN" | "PASTOR" | "LEADER" | "TEEN" | "JORGE" | "CARLOS") => {
    let selected: UserItem = DEFAULT_PASTOR;
    if (target === "ADMIN") {
      selected = allUsers.find((u) => u.role === "ADMIN") || DEFAULT_ADMIN;
    } else if (target === "LEADER" || target === "JORGE") {
      selected = allUsers.find((u) => u.email === "jorge@agendateens.com" || u.role === "LEADER") || DEFAULT_LEADER;
    } else if (target === "TEEN" || target === "CARLOS") {
      selected = allUsers.find((u) => u.email === "carlos@agendateens.com" || u.role === "TEEN") || DEFAULT_TEEN;
    } else {
      selected = allUsers.find((u) => u.role === "PASTOR") || DEFAULT_PASTOR;
    }

    // Se já estiver como ADMIN ou em modo Ghost, ativa simulação Ghost
    if (currentUser.role === "ADMIN" || isGhostMode) {
      if (selected.role === "ADMIN") {
        exitGhostMode();
      } else {
        startGhostMode(selected);
      }
    } else {
      setCurrentUser(selected);
      setToken(selected.id);
      localStorage.setItem("agenda_teens_role", selected.role);
      localStorage.setItem("agenda_teens_user_id", selected.id);
    }
  };

  const isAdmin = currentUser.role === "ADMIN" || Boolean(originalAdmin);
  const isPastor = currentUser.role === "PASTOR" || currentUser.role === "ADMIN" || (Boolean(originalAdmin) && originalAdmin?.role === "ADMIN");
  const isLeader = currentUser.role === "LEADER" || currentUser.role === "PASTOR" || currentUser.role === "ADMIN";

  return (
    <TeensAuthContext.Provider
      value={{
        currentUser,
        token,
        allUsers,
        isAuthenticated,
        isAdmin,
        isPastor,
        isLeader,
        canManageEvents: isLeader,
        canManageMembers: isLeader,
        isGhostMode,
        originalAdmin,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        startGhostMode,
        exitGhostMode,
        switchProfile,
        refreshUsers: fetchUsersFromDb,
      }}
    >
      {/* Banner Flutuante de Modo Ghost quando ativo */}
      {isGhostMode && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 border-b-2 border-purple-500/80 px-4 py-2 text-xs text-white flex items-center justify-between sticky top-0 z-50 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base animate-bounce">👻</span>
            <span className="font-extrabold tracking-wide uppercase text-purple-300">
              Modo Ghost Ativo (Simulação Real):
            </span>
            <span className="bg-purple-500/30 px-2.5 py-0.5 rounded-lg border border-purple-500/50 font-bold text-white shadow-sm">
              {currentUser.name} &bull; {currentUser.role}
            </span>
            {currentUser.tags && currentUser.tags.length > 0 && (
              <span className="bg-pink-500/20 border border-pink-500/40 px-2 py-0.5 rounded-md text-pink-300 font-bold">
                Tags: {currentUser.tags.join(", ")}
              </span>
            )}
            <span className="text-slate-400 hidden md:inline text-[11px]">
              &bull; Você está testando a interface e regras com a identidade real deste usuário.
            </span>
          </div>

          <button
            type="button"
            onClick={exitGhostMode}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 text-xs"
          >
            <span>Encerrar Modo Ghost</span>
            <span className="text-[10px] bg-red-800/90 px-1.5 py-0.2 rounded font-semibold hidden sm:inline">
              Voltar ao Admin
            </span>
          </button>
        </div>
      )}

      {children}
    </TeensAuthContext.Provider>
  );
}

export const useTeensAuth = () => useContext(TeensAuthContext);
