"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mic,
  MessageCircle,
  Crown,
  ShieldAlert,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { EventItem, SermonOutline } from "@/types/sermon";
import { getEventById, generateEventInvite, approveEvent, rejectEvent } from "@/services/api";
import { SermonCard } from "@/components/SermonCard";
import { UploadForm } from "@/components/UploadForm";
import { WhatsAppInviteModal } from "@/components/WhatsAppInviteModal";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

export default function EventDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { isPastor, isAdmin, token } = useTeensAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteText, setInviteText] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [approving, setApproving] = useState(false);

  const fetchEvent = () => {
    if (!id) return;
    setLoading(true);
    getEventById(id)
      .then((data) => setEvent(data))
      .catch((err) => setError(err.message || "Erro ao carregar evento."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handleApprove = async () => {
    if (!event) return;
    setApproving(true);
    try {
      await approveEvent(event.id, token);
      fetchEvent();
    } catch (err: any) {
      alert(err.message || "Erro ao aprovar evento.");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!event) return;
    const reason = prompt("Informe o ajuste necessário:") || undefined;
    setApproving(true);
    try {
      await rejectEvent(event.id, reason, token);
      fetchEvent();
    } catch (err: any) {
      alert(err.message || "Erro ao rejeitar evento.");
    } finally {
      setApproving(false);
    }
  };

  const handleUploadSuccess = (sermon: SermonOutline) => {
    if (event) {
      setEvent({
        ...event,
        has_sermon: true,
        sermon: sermon,
      });
    }
  };

  const handleGenerateInvite = async () => {
    if (!event) return;
    setLoadingInvite(true);
    try {
      const res = await generateEventInvite(event.id);
      setInviteText(res.invite_text);
      setInviteModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Erro ao gerar convite.");
    } finally {
      setLoadingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-xs text-slate-400">Carregando detalhes do culto...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Culto não localizado</h2>
        <p className="text-xs text-slate-400">{error || "O evento solicitado não foi encontrado."}</p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para a Agenda
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Botão Voltar */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand-400" />
          Voltar para a Agenda de Cultos
        </Link>
      </div>

      {/* Banner Principal do Culto */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {event.cover_image && (
          <div className="h-48 sm:h-64 w-full overflow-hidden relative">
            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-4 relative">
          <div className="flex flex-wrap items-center gap-2.5">
            {event.is_past ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                Evento Realizado
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Próximo Culto
              </span>
            )}

            {event.has_sermon ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-400" />
                Documentado com IA
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Aguardando Gravação
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100">{event.title}</h1>

          {event.theme && (
            <p className="text-sm font-semibold text-brand-300">🎯 Tema: {event.theme}</p>
          )}

          {event.description && (
            <p className="text-sm text-slate-300/90 leading-relaxed max-w-3xl">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-400" />
              <span>{event.location}</span>
              <a
                href={
                  event.address_details?.maps_url ||
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    event.location
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 text-xs underline font-semibold ml-1"
              >
                Abrir no Google Maps ↗
              </a>
            </div>
          </div>

          {event.planning && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mt-3 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Planejamento e Ordem Litúrgica do Culto
              </h3>
              {event.planning.versiculo_base && (
                <p className="text-xs text-slate-300">
                  <strong className="text-slate-200">Versículo-Base:</strong>{" "}
                  {event.planning.versiculo_base}
                </p>
              )}
              {event.planning.publico_alvo && (
                <p className="text-xs text-slate-300">
                  <strong className="text-slate-200">Público-Alvo:</strong>{" "}
                  {event.planning.publico_alvo}
                </p>
              )}
              {event.planning.ordem_culto && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {event.planning.ordem_culto.map((etapa: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs"
                    >
                      <span className="text-slate-200">{etapa.etapa}</span>
                      <span className="text-brand-400 font-bold">{etapa.tempo_minutos} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!event.is_past && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={loadingInvite}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
              >
                {loadingInvite ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Gerando Convite WhatsApp...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-3.5 h-3.5" />
                    Gerar Convite de WhatsApp com IA
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Seção de Documentação com IA */}
      {event.has_sermon && event.sermon ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-sm uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Resumo e Esboço Teológico Gerado pelo Google Gemini
          </div>
          <SermonCard sermon={event.sermon} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-brand-500/30 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
              <Mic className="w-4 h-4" />
              Documentar este Culto com IA
            </div>
            <h3 className="text-xl font-bold text-slate-100">
              Grave ou anexe o áudio/vídeo ministrado neste encontro
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              O Google Gemini transcreverá a mensagem, extrairá o tema exato, as referências bíblicas e gerará as perguntas para células vinculadas diretamente a este culto da agenda.
            </p>
          </div>

          <UploadForm initialEventId={event.id} onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Modal de Convite WhatsApp */}
      <WhatsAppInviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        eventTitle={event.title}
        inviteText={inviteText}
      />
    </div>
  );
}

