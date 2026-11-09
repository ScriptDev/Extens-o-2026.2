"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Sparkles,
  MessageCircle,
  FileText,
  Mic,
  Clock,
  ArrowRight,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  Crown,
  ShieldAlert,
  Tag,
  Globe,
  Edit3,
} from "lucide-react";
import { EventItem } from "@/types/sermon";
import {
  generateEventInvite,
  confirmEventAttendance,
  cancelEventAttendance,
  checkMyAttendance,
  getEventAttendanceStats,
  approveEvent,
  rejectEvent,
  acceptEventChanges,
} from "@/services/api";
import { WhatsAppInviteModal } from "@/components/WhatsAppInviteModal";
import { AttendeesModal } from "@/components/AttendeesModal";
import { ProposeChangesModal } from "@/components/ProposeChangesModal";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

interface EventCardProps {
  event: EventItem;
  onStatusChanged?: () => void;
}

export function EventCard({ event, onStatusChanged }: EventCardProps) {
  const { currentUser, token, isLeader, isPastor, isAdmin } = useTeensAuth();

  const [currentStatus, setCurrentStatus] = useState<string>(event.status || "published");
  const [approving, setApproving] = useState(false);
  const [acceptingChanges, setAcceptingChanges] = useState(false);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);

  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteText, setInviteText] = useState("");

  // Presenças
  const [attendeesModalOpen, setAttendeesModalOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [confirmedCount, setConfirmedCount] = useState<number>(0);

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPast = event.is_past;
  const isPendingApproval = currentStatus === "pending_pastor_approval";
  const isChangesProposed = currentStatus === "changes_proposed_by_pastor";

  useEffect(() => {
    checkMyAttendance(event.id, token).then((conf) => setIsConfirmed(conf));
    getEventAttendanceStats(event.id).then((st) => setConfirmedCount(st.total_confirmed));
  }, [event.id, token]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveEvent(event.id, token);
      setCurrentStatus("published");
      onStatusChanged?.();
    } catch (err: any) {
      alert(err.message || "Erro ao aprovar evento.");
    } finally {
      setApproving(false);
    }
  };

  const handleAcceptChanges = async () => {
    setAcceptingChanges(true);
    try {
      await acceptEventChanges(event.id, token);
      setCurrentStatus("published");
      onStatusChanged?.();
    } catch (err: any) {
      alert(err.message || "Erro ao aceitar proposta.");
    } finally {
      setAcceptingChanges(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Informe o motivo ou orientações de ajuste para o líder:") || undefined;
    setApproving(true);
    try {
      await rejectEvent(event.id, reason, token);
      setCurrentStatus("draft");
      onStatusChanged?.();
    } catch (err: any) {
      alert(err.message || "Erro ao rejeitar evento.");
    } finally {
      setApproving(false);
    }
  };

  const handleGenerateInvite = async () => {
    setLoadingInvite(true);
    try {
      const result = await generateEventInvite(event.id);
      setInviteText(result.invite_text);
      setInviteModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Erro ao gerar convite");
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleToggleAttendance = async () => {
    setAttendanceLoading(true);
    try {
      if (isConfirmed) {
        await cancelEventAttendance(event.id, token);
        setIsConfirmed(false);
        setConfirmedCount((prev) => Math.max(0, prev - 1));
      } else {
        await confirmEventAttendance(event.id, token);
        setIsConfirmed(true);
        setConfirmedCount((prev) => prev + 1);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar presença.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  return (
    <>
      <div className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all shadow-lg hover:shadow-black/50">
        <div>
          {/* Banner de Capa */}
          <div className="h-36 sm:h-44 w-full relative overflow-hidden bg-gradient-to-br from-brand-900/40 via-indigo-950 to-slate-950 flex items-center justify-center">
            {event.cover_image ? (
              <img
                src={event.cover_image}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="text-center p-4">
                <Calendar className="w-10 h-10 text-brand-400/40 mx-auto mb-2" />
                <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                  {event.theme || "Culto da Igreja"}
                </span>
              </div>
            )}

            {/* Badges Flutuantes */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
              {isPendingApproval ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/30 text-amber-300 border border-amber-500/50 backdrop-blur-md flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  Validação Pastoral Pendente
                </span>
              ) : isChangesProposed ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/30 text-purple-300 border border-purple-500/50 backdrop-blur-md flex items-center gap-1 animate-pulse">
                  <Edit3 className="w-3 h-3 text-purple-400" />
                  Ajustes Sugeridos pelo Pastor
                </span>
              ) : isPast ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
                  Evento Realizado
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                  Próximo Culto
                </span>
              )}

              {event.is_global && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 backdrop-blur-md flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Geral da Igreja
                </span>
              )}

              {/* Confirmados (se publicado) */}
              {!isPendingApproval && !isChangesProposed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-brand-300 border border-brand-500/30 backdrop-blur-md flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {confirmedCount} {confirmedCount === 1 ? "confirmado" : "confirmados"}
                </span>
              )}
            </div>

            {event.has_sermon && (
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/40 backdrop-blur-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  Documentado (IA)
                </span>
              </div>
            )}
          </div>

          {/* Conteúdo do Card */}
          <div className="p-5 space-y-2.5">
            {/* Ministério Promotor e Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {event.ministry_name && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                  🏛️ {event.ministry_name}
                </span>
              )}
              {event.tags &&
                event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/30"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
            </div>

            <h4 className="font-bold text-slate-100 text-lg group-hover:text-brand-300 transition-colors line-clamp-1">
              {event.title}
            </h4>

            {event.theme && (
              <p className="text-xs text-brand-300/90 font-medium line-clamp-1">
                🎯 Tema: {event.theme}
              </p>
            )}

            {event.description && (
              <p className="text-xs text-slate-300/80 line-clamp-2">{event.description}</p>
            )}

            <div className="space-y-1.5 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
                <a
                  href={
                    event.address_details?.maps_url ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      event.location
                    )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-300 text-[11px] underline flex-shrink-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Maps
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé e Ações do Evento */}
        <div className="p-5 pt-0 border-t border-slate-800/60 mt-2 space-y-2">
          {/* FLUXO BILATERAL 1: AJUSTES PROPOSTOS PELO PASTOR (LÍDER REVISA E ACEITA) */}
          {isChangesProposed && (
            <div className="pt-3">
              <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span>Proposta Pastoral de Consenso:</span>
                </div>

                {event.proposed_date && (
                  <div className="text-[11px] text-slate-300">
                    <strong className="text-purple-300">Nova data sugerida:</strong>{" "}
                    {new Date(event.proposed_date).toLocaleString("pt-BR")}
                  </div>
                )}

                {event.proposed_location && (
                  <div className="text-[11px] text-slate-300">
                    <strong className="text-purple-300">Novo local sugerido:</strong>{" "}
                    {event.proposed_location}
                  </div>
                )}

                {event.pastor_notes && (
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/80 p-2 rounded-lg border border-purple-500/20">
                    "{event.pastor_notes}"
                  </p>
                )}

                {/* Se for o líder responsável ou Pastor: botão de aceite bilateral */}
                {(isLeader || isPastor || isAdmin) && (
                  <button
                    type="button"
                    onClick={handleAcceptChanges}
                    disabled={acceptingChanges}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {acceptingChanges ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Aceitar Proposta Pastoral &amp; Homologar Culto</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* FLUXO BILATERAL 2: PENDENTE DE VALIDAÇÃO PASTORAL INICIAL */}
          {isPendingApproval && (
            <div className="pt-3">
              {isPastor || isAdmin ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Validação Pastoral Requerida</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Criado por {event.responsible_name || "Líder"}. Homologue ou proponha ajustes de consenso.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      {approving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Aprovar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposeModalOpen(true)}
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Propor Ajustes</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={approving}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 font-bold text-xs rounded-lg border border-slate-700 transition-all cursor-pointer"
                    >
                      Devolver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-950/80 border border-amber-500/30 rounded-xl text-[11px] text-amber-300/90 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Aguardando homologação pastoral para ser publicado ao público.</span>
                </div>
              )}
            </div>
          )}

          {/* AÇÕES DE EVENTO PUBLICADO */}
          {!isPendingApproval && !isChangesProposed && !isPast && (
            <div className="pt-3 flex gap-2">
              {!isLeader ? (
                /* VISÃO ADOLESCENTE: Confirmar / Cancelar Presença */
                <button
                  type="button"
                  onClick={handleToggleAttendance}
                  disabled={attendanceLoading}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isConfirmed
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40"
                      : "bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30"
                  }`}
                >
                  {attendanceLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isConfirmed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Presença Confirmada
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5" />
                      Confirmar Presença (RSVP)
                    </>
                  )}
                </button>
              ) : (
                /* VISÃO LÍDER: Ver Participantes */
                <button
                  type="button"
                  onClick={() => setAttendeesModalOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-brand-400" />
                  Ver Presenças ({confirmedCount})
                </button>
              )}

              {/* Botão Convite WhatsApp */}
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={loadingInvite}
                className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                title="Gerar Convite WhatsApp com IA"
              >
                {loadingInvite ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            </div>
          )}

          {/* AÇÕES DE EVENTOS PASSADOS */}
          {isPast && (
            <div className="pt-3">
              {event.has_sermon ? (
                <Link
                  href={`/events/${event.id}`}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-brand-600/20"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ver Resumo da IA
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              ) : (
                <Link
                  href={`/events/${event.id}`}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Mic className="w-3.5 h-3.5 text-brand-400" />
                  Documentar Culto com IA
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Convite de WhatsApp */}
      <WhatsAppInviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        eventTitle={event.title}
        inviteText={inviteText}
      />

      {/* Modal de Lista de Presença */}
      <AttendeesModal
        isOpen={attendeesModalOpen}
        onClose={() => setAttendeesModalOpen(false)}
        eventId={event.id}
        eventTitle={event.title}
      />

      {/* Modal de Proposta de Ajustes Pastorais */}
      <ProposeChangesModal
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        event={event}
        token={token}
        onSuccess={() => {
          setCurrentStatus("changes_proposed_by_pastor");
          onStatusChanged?.();
        }}
      />
    </>
  );
}
