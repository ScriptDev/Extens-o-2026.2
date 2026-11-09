"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  UserPlus,
  Shield,
  Crown,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserCheck,
  ArrowUpDown,
  Filter,
  Layers,
  Check,
  Sparkles,
} from "lucide-react";
import { UserItem, MinistryItem } from "@/types/sermon";
import { registerTeen, listMinistries, updateUserRoleAndMinistries } from "@/services/api";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

interface MembersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MembersManagementModal({ isOpen, onClose }: MembersManagementModalProps) {
  const { currentUser, isLeader, isPastor, isAdmin, token, startGhostMode } = useTeensAuth();

  const [activeTab, setActiveTab] = useState<"list" | "register">("list");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [availableMinistries, setAvailableMinistries] = useState<MinistryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filtros contextuais por perfil eclesiástico
  const [adminRoleFilter, setAdminRoleFilter] = useState<"ALL" | "PASTOR" | "LEADER" | "TEEN">("ALL");
  const [adminMinistryFilter, setAdminMinistryFilter] = useState<string>("ALL");
  const [pastorViewFilter, setPastorViewFilter] = useState<"LEADERS" | "PASTORS" | "ALL">("LEADERS");
  const [leaderViewFilter, setLeaderViewFilter] = useState<"MY_TEENS" | "UNASSIGNED" | "ALL_TEENS">("MY_TEENS");

  // Estado de Eleição / Atribuição de Líder (Pastor / Admin)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<"PASTOR" | "LEADER" | "TEEN">("LEADER");
  const [selectedMinistryIds, setSelectedMinistryIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleUpdateMsg, setRoleUpdateMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form de Novo Cadastro Hierárquico
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"PASTOR" | "LEADER" | "TEEN">("TEEN");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Ministério e Tags do Líder Atual
  const leaderTags = currentUser?.tags || [];
  const leaderMinistryName = currentUser?.ministries?.[0]?.name || leaderTags[0] || "Seu Ministério";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
      const mins = await listMinistries();
      setAvailableMinistries(mins);
    } catch {
      // Falha silenciosa
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Inicializa papel de cadastro de acordo com o perfil
      if (!isPastor && !isAdmin) {
        setRole("TEEN");
      } else if (isPastor && !isAdmin) {
        setRole("LEADER");
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError("Nome e e-mail são obrigatórios.");
      return;
    }

    if (role === "TEEN" && (!parentName.trim() || !parentPhone.trim())) {
      setFormError("Para adolescentes menores de idade, o nome e telefone do responsável são obrigatórios (LGPD).");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    // Se o líder cadastrar um adolescente, vincula automaticamente ao ministério do líder
    const newMinistries = (!isPastor && !isAdmin && currentUser?.ministries) ? currentUser.ministries : undefined;
    const newTags = (!isPastor && !isAdmin && leaderTags.length > 0) ? leaderTags : undefined;

    try {
      await registerTeen(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          phone: phone.trim() || undefined,
          parent_name: role === "TEEN" ? parentName.trim() : undefined,
          parent_phone: role === "TEEN" ? parentPhone.trim() : undefined,
          ministries: newMinistries,
          tags: newTags,
        },
        token
      );

      setFormSuccess(`Membro ${name} cadastrado com sucesso com perfil de ${role}!`);
      setName("");
      setEmail("");
      setPhone("");
      setParentName("");
      setParentPhone("");
      setRole(!isPastor && !isAdmin ? "TEEN" : "LEADER");
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Erro ao cadastrar membro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir Modal de Eleição / Atribuição de Ministérios
  const openRoleModal = (user: UserItem) => {
    setEditingUser(user);
    setSelectedRole((user.role === "ADMIN" ? "PASTOR" : user.role) as any);
    setSelectedMinistryIds(user.ministries ? user.ministries.map((m) => m.id) : []);
    setSelectedTags(user.tags || []);
    setRoleUpdateMsg(null);
  };

  // Toggle Ministério (Máximo 3)
  const toggleMinistry = (minId: string) => {
    if (selectedMinistryIds.includes(minId)) {
      setSelectedMinistryIds(selectedMinistryIds.filter((id) => id !== minId));
    } else {
      if (selectedMinistryIds.length >= 3) {
        setRoleUpdateMsg({
          text: "Limite máximo de 3 ministérios atingido para este líder.",
          type: "error",
        });
        return;
      }
      setSelectedMinistryIds([...selectedMinistryIds, minId]);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags([...selectedTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const handleSaveRoleAndMinistries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (selectedMinistryIds.length > 3) {
      setRoleUpdateMsg({
        text: "Um líder pode ter vínculo com no máximo 3 ministérios simultâneos.",
        type: "error",
      });
      return;
    }

    setIsUpdatingRole(true);
    setRoleUpdateMsg(null);

    const mappedMinistries = selectedMinistryIds.map((id) => {
      const found = availableMinistries.find((m) => m.id === id);
      return { id, name: found ? found.name : "Ministério" };
    });

    try {
      await updateUserRoleAndMinistries(
        editingUser.id,
        {
          role: selectedRole,
          ministries: mappedMinistries,
          tags: selectedTags,
        },
        token
      );

      setRoleUpdateMsg({
        text: `Atribuição ministerial de "${editingUser.name}" atualizada com sucesso!`,
        type: "success",
      });
      fetchUsers();
      setTimeout(() => {
        setEditingUser(null);
      }, 1200);
    } catch (err: any) {
      setRoleUpdateMsg({
        text: err.message || "Erro ao atualizar perfil ministerial.",
        type: "error",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // ============================================================================
  // LÓGICA HIERÁRQUICA DE FILTRAGEM E ORDENAÇÃO ALFABÉTICA (A-Z)
  // ============================================================================
  const filteredUsers = users.filter((u) => {
    // 1. Busca por nome ou e-mail
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Escopo do SUPER ADMIN (Visão Global em Ordem Alfabética)
    if (isAdmin) {
      const matchesRole = adminRoleFilter === "ALL" || u.role === adminRoleFilter;
      const matchesMinistry =
        adminMinistryFilter === "ALL" ||
        (u.ministries && u.ministries.some((m) => m.id === adminMinistryFilter));
      return matchesRole && matchesMinistry;
    }

    // 3. Escopo do PASTOR (Responsável pelos Líderes de Ministérios)
    if (isPastor) {
      if (pastorViewFilter === "LEADERS") {
        return u.role === "LEADER";
      }
      if (pastorViewFilter === "PASTORS") {
        return u.role === "PASTOR";
      }
      return true; // "ALL"
    }

    // 4. Escopo do LÍDER (Responsável estritamente pelos Teens de seu Ministério)
    if (isLeader) {
      // Líderes NUNCA vêem Pastores nem outros Líderes
      if (u.role !== "TEEN") return false;

      const userTagClean = (u.tags || []).map((t) => t.replace("#", "").toLowerCase());
      const leaderTagClean = leaderTags.map((t) => t.replace("#", "").toLowerCase());
      const hasMinistryTag = userTagClean.some((t) => leaderTagClean.includes(t));
      const hasMinistryObj =
        u.ministries &&
        currentUser?.ministries &&
        u.ministries.some((m) => currentUser.ministries?.some((lm) => lm.id === m.id));

      const belongsToMyMinistry = hasMinistryTag || hasMinistryObj;

      if (leaderViewFilter === "MY_TEENS") {
        return belongsToMyMinistry;
      }
      if (leaderViewFilter === "UNASSIGNED") {
        return !u.ministries || u.ministries.length === 0;
      }
      return true; // "ALL_TEENS"
    }

    return false;
  });

  // Ordenação Alfabética Rigorosa (A-Z / Z-A)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho Diferenciado por Papel Hierárquico */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${
                isAdmin
                  ? "bg-red-500/20 border border-red-500/30 text-red-300"
                  : isPastor
                  ? "bg-purple-500/20 border border-purple-500/30 text-purple-300"
                  : "bg-amber-500/20 border border-amber-500/30 text-amber-300"
              }`}
            >
              {isAdmin ? (
                <Sparkles className="w-5 h-5 text-red-400" />
              ) : isPastor ? (
                <Crown className="w-5 h-5 text-purple-400" />
              ) : (
                <Shield className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100">
                  {isAdmin
                    ? "Gestão Geral de Membros & Liderança"
                    : isPastor
                    ? "Governança Pastoral: Gestão de Líderes"
                    : `Gestão de Teens: ${leaderMinistryName}`}
                </h2>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isAdmin
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : isPastor
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {isAdmin ? "Super Admin &bull; Geral A-Z" : isPastor ? "Pastor Sênior" : "Líder de Ministério"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? "Visão global de todos os usuários em ordem alfabética com auditoria e controle total."
                  : isPastor
                  ? "Você é responsável pela supervisão, eleição e atribuição dos Líderes de Ministérios."
                  : `Você é responsável pelo acompanhamento, chamada e contato dos Teens do seu ministério (${leaderMinistryName}).`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab("list")}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "list"
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {isAdmin
                ? `Lista Geral (${sortedUsers.length})`
                : isPastor
                ? `Líderes de Ministérios (${sortedUsers.length})`
                : `Teens do Ministério (${sortedUsers.length})`}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("register")}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "register"
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>
              {isLeader && !isPastor && !isAdmin
                ? "Cadastrar Novo Adolescente"
                : isPastor && !isAdmin
                ? "Eleger Novo Líder / Membro"
                : "Cadastrar Novo Membro"}
            </span>
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "list" && (
            <div className="space-y-4">
              {/* Barra de Filtros Hierárquicos e Busca */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Botão de Ordenação Alfabética A-Z / Z-A */}
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Alternar ordenação alfabética"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
                  <span>{sortOrder === "asc" ? "A → Z" : "Z → A"}</span>
                </button>

                {/* FILTROS EXCLUSIVOS DO ADMIN */}
                {isAdmin && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(["ALL", "PASTOR", "LEADER", "TEEN"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAdminRoleFilter(r)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          adminRoleFilter === r
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {r === "ALL" ? "Todos" : r === "PASTOR" ? "Pastores" : r === "LEADER" ? "Líderes" : "Teens"}
                      </button>
                    ))}
                  </div>
                )}

                {/* FILTROS EXCLUSIVOS DO PASTOR (Foco: Líderes) */}
                {isPastor && !isAdmin && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setPastorViewFilter("LEADERS")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        pastorViewFilter === "LEADERS"
                          ? "bg-amber-600 text-white shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🛡️ Líderes de Ministérios
                    </button>
                    <button
                      type="button"
                      onClick={() => setPastorViewFilter("PASTORS")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        pastorViewFilter === "PASTORS"
                          ? "bg-purple-600 text-white shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      👑 Pastores
                    </button>
                    <button
                      type="button"
                      onClick={() => setPastorViewFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        pastorViewFilter === "ALL"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Todos os Membros
                    </button>
                  </div>
                )}

                {/* FILTROS EXCLUSIVOS DO LÍDER (Foco: Teens de seu ministério) */}
                {isLeader && !isPastor && !isAdmin && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setLeaderViewFilter("MY_TEENS")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        leaderViewFilter === "MY_TEENS"
                          ? "bg-brand-600 text-white shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🎭 Meus Teens ({leaderTags[0] || "Ministério"})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderViewFilter("UNASSIGNED")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        leaderViewFilter === "UNASSIGNED"
                          ? "bg-indigo-600 text-white shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Novos / Sem Ministério
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderViewFilter("ALL_TEENS")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        leaderViewFilter === "ALL_TEENS"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Todos os Adolescentes
                    </button>
                  </div>
                )}
              </div>

              {/* Lista Ordenada dos Membros */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  <span>Carregando membros em ordem alfabética do Supabase...</span>
                </div>
              ) : sortedUsers.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
                  Nenhum membro encontrado para o filtro hierárquico selecionado.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {sortedUsers.map((u) => {
                    const isUserPastor = u.role === "PASTOR";
                    const isUserLeader = u.role === "LEADER";
                    const isUserAdmin = u.role === "ADMIN";

                    return (
                      <div
                        key={u.id}
                        className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                              isUserAdmin
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : isUserPastor
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : isUserLeader
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                            }`}
                          >
                            {isUserAdmin ? (
                              <Sparkles className="w-5 h-5 text-red-400" />
                            ) : isUserPastor ? (
                              <Crown className="w-5 h-5 text-purple-300" />
                            ) : isUserLeader ? (
                              <Shield className="w-5 h-5 text-amber-400" />
                            ) : (
                              <Users className="w-5 h-5 text-brand-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                                {u.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isUserAdmin
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : isUserPastor
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : isUserLeader
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                                }`}
                              >
                                {u.role}
                              </span>

                              {/* Ministérios Vinculados */}
                              {u.ministries && u.ministries.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {u.ministries.map((m) => (
                                    <span
                                      key={m.id}
                                      className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"
                                    >
                                      <span>🏛️</span>
                                      <span>{m.name}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 truncate">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" /> {u.email}
                              </span>
                              {u.phone && (
                                <span className="flex items-center gap-1 hidden sm:inline-flex">
                                  <Phone className="w-3 h-3 text-slate-500" /> {u.phone}
                                </span>
                              )}
                            </div>

                            {/* Tags Ministeriais */}
                            {u.tags && u.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {u.tags.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] bg-slate-900 text-slate-300 font-semibold px-1.5 py-0.2 rounded border border-slate-800"
                                  >
                                    #{t.replace("#", "")}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Informações dos Pais sob LGPD */}
                            {u.parent_name && (
                              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-purple-400" />
                                <span>Responsável Legal (LGPD):</span>
                                <strong className="text-slate-300">{u.parent_name}</strong>
                                {u.parent_phone && (
                                  <span className="text-purple-300 font-semibold">({u.parent_phone})</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Ações Especiais de Governança */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Super Admin: Ativar Modo Ghost */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                startGhostMode(u);
                                onClose();
                              }}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                              title={`Simular em Modo Ghost a visão de ${u.name}`}
                            >
                              <span>👻 Ghost</span>
                            </button>
                          )}

                          {/* Pastor / Admin: Eleger Líder e Designar Ministérios */}
                          {(isPastor || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => openRoleModal(u)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                              title="Eleger para Líder e vincular ministérios"
                            >
                              <ShieldCheck className="w-3 h-3 text-amber-400" />
                              <span className="hidden sm:inline">Eleger / Ministérios</span>
                            </button>
                          )}

                          {/* Líder: Ação para vincular/ajustar tag do Teen ao seu grupo */}
                          {isLeader && !isPastor && !isAdmin && (
                            <button
                              type="button"
                              onClick={() => openRoleModal(u)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-950/50 hover:bg-brand-900/50 text-brand-300 border border-brand-500/30 flex items-center gap-1 transition-all cursor-pointer"
                              title="Gerenciar tags e participação deste Teen no seu ministério"
                            >
                              <span>🎭 Gerir Tags</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: CADASTRO NOVO HIERÁRQUICO */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 max-w-lg mx-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Perfil Hierárquico no Ministério *
                </label>
                {/* Se for Líder, papel é travado em TEEN */}
                {isLeader && !isPastor && !isAdmin ? (
                  <div className="p-2.5 bg-brand-950/30 border border-brand-500/30 rounded-xl text-xs text-brand-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>
                      Como <strong>Líder de {leaderMinistryName}</strong>, você cadastra novos adolescentes (TEEN)
                      vinculados ao seu ministério.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("TEEN")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        role === "TEEN"
                          ? "bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Adolescente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("LEADER")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        role === "LEADER"
                          ? "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-500/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Líder</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("PASTOR")}
                      disabled={!isAdmin}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        !isAdmin ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        role === "PASTOR"
                          ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                      title={!isAdmin ? "Apenas o Super Admin pode cadastrar novos pastores" : ""}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Pastor</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Lucas Ferreira"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">E-mail *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="lucas@exemplo.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(85) 98888-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Campos LGPD para Adolescentes */}
              {role === "TEEN" && (
                <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Autorização de Responsável Legal (Conformidade LGPD)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Nome do Responsável *
                      </label>
                      <input
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Ex: Patrícia Ferreira (Mãe)"
                        required={role === "TEEN"}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Telefone do Responsável *
                      </label>
                      <input
                        type="tel"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="(85) 99999-1111"
                        required={role === "TEEN"}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando membro...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Homologar e Cadastrar Membro</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* SUB-MODAL DE ELEIÇÃO PASTORAL E ATRIBUIÇÃO DE MINISTÉRIOS (MÁX 3) */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  Atribuição Ministerial: {editingUser.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {roleUpdateMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  roleUpdateMsg.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/30 text-red-300"
                }`}
              >
                {roleUpdateMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span>{roleUpdateMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveRoleAndMinistries} className="space-y-4">
              {/* O Líder só pode gerenciar tags do Teen, não pode alterar cargo para Pastor ou Líder */}
              {isLeader && !isPastor && !isAdmin ? (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                  <span className="font-bold block text-slate-200">Cargo: Adolescente (TEEN)</span>
                  <span className="text-[11px] text-slate-400">
                    Defina abaixo as tags de participação deste adolescente no seu ministério.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Cargo / Função Ministerial:
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="TEEN">Adolescente (Membro Comum)</option>
                    <option value="LEADER">Líder do Ministério (Eleito)</option>
                    {isAdmin && <option value="PASTOR">Pastor do Colegiado Pastoral</option>}
                  </select>
                </div>
              )}

              {/* Seleção de Ministérios Oficiais (Máximo 3) - Para Pastores e Admins */}
              {(isPastor || isAdmin) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>Ministérios Vinculados (Máx 3):</span>
                    </label>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        selectedMinistryIds.length === 3
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "text-slate-400"
                      }`}
                    >
                      {selectedMinistryIds.length} de 3 selecionados
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {availableMinistries.map((min) => {
                      const isChecked = selectedMinistryIds.includes(min.id);
                      const isDisabled = !isChecked && selectedMinistryIds.length >= 3;

                      return (
                        <button
                          key={min.id}
                          type="button"
                          onClick={() => toggleMinistry(min.id)}
                          disabled={isDisabled}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isChecked
                              ? "bg-purple-950/60 border-purple-500 text-purple-200 font-bold"
                              : isDisabled
                              ? "bg-slate-950/40 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="font-extrabold px-1.5 py-0.2 rounded text-[10px]"
                              style={{
                                backgroundColor: `${min.primary_color}25`,
                                color: min.primary_color,
                              }}
                            >
                              {min.kanji_symbol}
                            </span>
                            <span>{min.name}</span>
                          </div>
                          {isChecked && <Check className="w-4 h-4 text-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags Ministeriais */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tags &amp; Atribuições no Grupo:
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ex: AtorPrincipal, Som, Figurino..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-xl font-bold cursor-pointer"
                  >
                    + Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1"
                    >
                      #{tag.replace("#", "")}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingRole ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar Atribuições</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
