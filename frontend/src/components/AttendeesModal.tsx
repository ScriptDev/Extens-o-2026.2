"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Download, CheckCircle2, Loader2, UserCheck } from "lucide-react";
import { getEventAttendanceStats } from "@/services/api";
import { EventAttendanceStats } from "@/types/sermon";

interface AttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

export function AttendeesModal({ isOpen, onClose, eventId, eventTitle }: AttendeesModalProps) {
  const [stats, setStats] = useState<EventAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !eventId) return;
    setLoading(true);
    getEventAttendanceStats(eventId)
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!stats || stats.attendees.length === 0) return;

    const headers = "Nome,Perfil,Status,Data de Confirmacao\n";
    const rows = stats.attendees
      .map(
        (a) =>
          `"${a.user_name}","${a.user_role}","${a.status}","${new Date(
            a.created_at
          ).toLocaleString("pt-BR")}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `participantes_${eventTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 sm:p-7 relative shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4" />
            Lista de Presença &bull; Agenda Teens
          </div>
          <h3 className="text-xl font-bold text-slate-100">{eventTitle}</h3>
          <p className="text-xs text-slate-400">
            Acompanhe os adolescentes e líderes que confirmaram presença.
          </p>
        </div>

        {/* Estatísticas de Presença */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Total Confirmados
            </span>
            <span className="text-xl font-bold text-emerald-400">
              {stats?.total_confirmed || 0}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Vagas Restantes
            </span>
            <span className="text-xl font-bold text-slate-200">
              {stats?.capacity
                ? `${stats.spots_remaining} de ${stats.capacity}`
                : "Sem limite"}
            </span>
          </div>
        </div>

        {/* Lista de Participantes */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              Carregando lista de participantes...
            </div>
          ) : !stats || stats.attendees.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhum participante confirmou presença ainda neste evento.
            </div>
          ) : (
            stats.attendees.map((attendee, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      {attendee.user_name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Confirmado em {new Date(attendee.created_at).toLocaleDateString("pt-BR")} às{" "}
                      {new Date(attendee.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    attendee.user_role === "LEADER"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                  }`}
                >
                  {attendee.user_role === "LEADER" ? "Líder" : "Adolescente"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Rodapé com Exportação */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!stats || stats.attendees.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV (RF19)
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

