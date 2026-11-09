"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  LayoutGrid,
  Plus,
  Sparkles,
  Filter,
  Loader2,
  ArrowLeft,
  UserPlus,
  Users,
  Shield,
  Crown,
  CheckCircle2,
  Layers,
  ShieldAlert,
  Settings,
  Tag,
  Edit3,
  Megaphone,
} from "lucide-react";
import { EventItem } from "@/types/sermon";
import { listEvents } from "@/services/api";
import { EventCard } from "@/components/EventCard";
import { CreateEventModal } from "@/components/CreateEventModal";
import { RegisterTeenModal } from "@/components/RegisterTeenModal";
import { MembersManagementModal } from "@/components/MembersManagementModal";
import { MinistriesManagementModal } from "@/components/MinistriesManagementModal";
import { ChurchTerminologyModal } from "@/components/ChurchTerminologyModal";
import { StrategicInsightsPanel } from "@/components/StrategicInsightsPanel";
import { EditorialCalendar } from "@/components/EditorialCalendar";
import { TeenMotivationalDashboard } from "@/components/TeenMotivationalDashboard";
import { SendAnnouncementModal } from "@/components/SendAnnouncementModal";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

export default function EventsPage() {
  const { currentUser, token, isLeader, isPastor, isAdmin, canManageMembers } = useTeensAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "grid">("calendar");
  const [filter, setFilter] = useState<"all" | "upcoming" | "documented" | "pending" | "proposed">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [registerTeenOpen, setRegisterTeenOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [ministriesModalOpen, setMinistriesModalOpen] = useState(false);
  const [terminologyModalOpen, setTerminologyModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

  const fetchEvents = () => {
    setLoading(true);
    listEvents(token)
      .then((data) => setEvents(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, [token, currentUser?.id]);

  const handleEventCreated = (newEvent: EventItem) => {
    setEvents((prev) => [newEvent, ...prev]);
  };

  const filteredEvents = events.filter((e) => {
    if (filter === "pending") return e.status === "pending_pastor_approval";
    if (filter === "proposed") return e.status === "changes_proposed_by_pastor";
    if (filter === "upcoming") return !e.is_past;
    if (filter === "documented") return e.has_sermon;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Cabeçalho da Agenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Agenda Teens &bull; Ministério de Adolescentes
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100">
            Calendário Editorial &amp; Presenças
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Organize a programação editorial de cultos, confirme presenças (RSVP) e acesse documentação teológica assistida por IA.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Botão de Terminologia & Tags da Igreja */}
          <button
            type="button"
            onClick={() => setTerminologyModalOpen(true)}
            className="py-2.5 px-3 rounded-xl text-xs font-semibold text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            title="Personalizar terminologia da igreja (Ministérios, Tribos, Grupos) e gerenciar tags"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span>{(isPastor || isAdmin) ? "Terminologia & Tags" : "Sugerir Tag"}</span>
          </button>

          {(isPastor || isAdmin) && (
            <button
              type="button"
              onClick={() => setMinistriesModalOpen(true)}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Gerenciar ministérios oficiais e brasões em ideogramas japoneses (Kanji)"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Ministérios &amp; Brasões</span>
            </button>
          )}

          {canManageMembers && (
            <button
              type="button"
              onClick={() => setMembersModalOpen(true)}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/30 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Gerenciar cadastro e perfil de líderes e adolescentes"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Membros &amp; Líderes</span>
            </button>
          )}

          {/* Botão de Disparo de Comunicado / Recado aos Teens (Líderes, Pastores e Admins) */}
          {(isLeader || isPastor || isAdmin) && (
            <button
              type="button"
              onClick={() => setAnnouncementModalOpen(true)}
              className="py-2.5 px-3.5 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Disparar recados oficiais e avisos aos adolescentes do ministério"
            >
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Recado aos Teens</span>
            </button>
          )}

          {isLeader && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 flex items-center gap-2 transition-colors shadow-lg shadow-brand-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agendar Novo Culto
            </button>
          )}
        </div>
      </div>

      {/* PAINEL MOTIVACIONAL, DEVOÇÃO DIÁRIA & CENTRAL DE ORGANIZAÇÃO DOS TEENS */}
      {currentUser?.role === "TEEN" && (
        <TeenMotivationalDashboard events={events} />
      )}

      {/* PAINEL DE INTELIGÊNCIA ARTIFICIAL: AUDITORIA ESTRATÉGICA E ANÁLISE TEMPORAL */}
      <StrategicInsightsPanel />

      {/* BANNER DINÂMICO DE PERFIL ATIVO E GOVERNANÇA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
              isPastor
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : isLeader
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-brand-500/20 text-brand-300 border border-brand-500/30"
            }`}
          >
            {isPastor ? (
              <Crown className="w-5 h-5 text-purple-400" />
            ) : isLeader ? (
              <Shield className="w-5 h-5 text-amber-400" />
            ) : (
              <Users className="w-5 h-5 text-brand-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-200 block">
                Logado como: {currentUser.name} ({currentUser.role})
              </span>
              {currentUser.tags && currentUser.tags.length > 0 && (
                <div className="flex gap-1">
                  {currentUser.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {isPastor
                ? "Autoridade Pastoral: homologação bilateral, auditoria estratégica de inatividade e supervisão doutrinária."
                : isLeader
                ? "Líder de Grupo: cadastro de eventos com validação pastoral, acompanhamento de presença e acolhimento discipular."
                : "Perfil de Adolescente: você visualiza os cultos da sua tag ministerial e eventos gerais da igreja."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Supabase PostgreSQL Ativo (Zero Mock)</span>
        </div>
      </div>

      {/* BARRA DE CONTROLE: TOGGLE CALENDÁRIO EDITORIAL VS GRADE + FILTROS */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
        {/* Toggle Modo de Visualização */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === "calendar"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendário Editorial</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards em Grade</span>
          </button>
        </div>

        {/* Filtros de Categoria */}
        {viewMode === "grid" && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === "all" ? "bg-brand-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos ({events.length})
            </button>
            <button
              onClick={() => setFilter("upcoming")}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === "upcoming"
                  ? "bg-brand-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Próximos ({events.filter((e) => !e.is_past).length})
            </button>
            <button
              onClick={() => setFilter("documented")}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === "documented"
                  ? "bg-brand-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Documentados ({events.filter((e) => e.has_sermon).length})
            </button>

            {events.some((e) => e.status === "changes_proposed_by_pastor") && (
              <button
                onClick={() => setFilter("proposed")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  filter === "proposed"
                    ? "bg-purple-600 text-white shadow"
                    : "text-purple-300 hover:text-purple-200"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Ajustes Propostos ({events.filter((e) => e.status === "changes_proposed_by_pastor").length})</span>
              </button>
            )}

            {(isPastor || isAdmin) && (
              <button
                onClick={() => setFilter("pending")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filter === "pending"
                    ? "bg-amber-600 text-white shadow"
                    : "text-amber-400/90 hover:text-amber-300"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Pendentes ({events.filter((e) => e.status === "pending_pastor_approval").length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL: CALENDÁRIO EDITORIAL OU GRADE DE CARDS */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-xs text-slate-400">Carregando eventos do Supabase...</p>
        </div>
      ) : viewMode === "calendar" ? (
        <EditorialCalendar
          events={events}
          onOpenCreate={() => setCreateModalOpen(true)}
        />
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 space-y-4">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">Nenhum evento encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não há encontros cadastrados nesta categoria ou compatíveis com as tags do seu perfil.
          </p>
          {isLeader && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agendar Novo Culto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onStatusChanged={fetchEvents} />
          ))}
        </div>
      )}

      {/* Modal de Agendamento */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onEventCreated={handleEventCreated}
      />

      {/* Modal de Gestão de Ministérios Oficiais e Brasões em Kanji */}
      <MinistriesManagementModal
        isOpen={ministriesModalOpen}
        onClose={() => setMinistriesModalOpen(false)}
        onMinistryUpdated={fetchEvents}
      />

      {/* Modal de Gestão de Terminologia e Tags da Igreja */}
      <ChurchTerminologyModal
        isOpen={terminologyModalOpen}
        onClose={() => setTerminologyModalOpen(false)}
        onTerminologyUpdated={fetchEvents}
      />

      {/* Modal de Gestão Hierárquica de Membros */}
      <MembersManagementModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
      />

      {/* Modal de Cadastro Rápido de Adolescente */}
      <RegisterTeenModal
        isOpen={registerTeenOpen}
        onClose={() => setRegisterTeenOpen(false)}
      />

      {/* Modal de Disparo de Recados e Comunicados aos Teens */}
      <SendAnnouncementModal
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        onSuccess={fetchEvents}
      />
    </div>
  );
}
