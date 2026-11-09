"use client";

import React, { useState } from "react";
import { X, Calendar, MapPin, MessageSquare, Send, AlertCircle, Clock } from "lucide-react";
import { proposeEventChanges } from "@/services/api";
import { EventItem } from "@/types/sermon";

interface ProposeChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  token?: string;
  onSuccess: () => void;
}

export function ProposeChangesModal({
  isOpen,
  onClose,
  event,
  token,
  onSuccess,
}: ProposeChangesModalProps) {
  const [proposedDate, setProposedDate] = useState("");
  const [proposedLocation, setProposedLocation] = useState("");
  const [pastorNotes, setPastorNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastorNotes.trim()) {
      setError("Por favor, informe a justificativa e orientações pastorais.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await proposeEventChanges(
        event.id,
        {
          proposed_date: proposedDate ? new Date(proposedDate).toISOString() : undefined,
          proposed_location: proposedLocation.trim() || undefined,
          pastor_notes: pastorNotes.trim(),
        },
        token
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao registrar proposta de alterações.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Propor Ajustes Pastorais</h2>
            <p className="text-xs text-slate-400">
              Culto: <strong className="text-purple-300">{event.title}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Nova Data e Horário Sugeridos (Opcional)
            </label>
            <input
              type="datetime-local"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              Novo Local Sugerido (Opcional)
            </label>
            <input
              type="text"
              value={proposedLocation}
              onChange={(e) => setProposedLocation(e.target.value)}
              placeholder="Ex: Auditório Principal, Sala 2..."
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              Orientações Pastorais para o Líder *
            </label>
            <textarea
              value={pastorNotes}
              onChange={(e) => setPastorNotes(e.target.value)}
              placeholder="Ex: Sugerimos adiantar o culto em 1 hora para evitar choque com a cantata, e utilizar o auditório central para melhor acústica..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-900/30 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Enviando..." : "Enviar Proposta ao Líder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

