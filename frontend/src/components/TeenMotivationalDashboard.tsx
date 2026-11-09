"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Heart,
  Megaphone,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  Square,
  RefreshCw,
  ArrowRight,
  Shield,
  Crown,
  ThumbsUp,
  Share2,
  UserCheck,
} from "lucide-react";
import { NotificationItem, EventItem } from "@/types/sermon";
import { listNotifications, markNotificationAsRead } from "@/services/api";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

interface TeenMotivationalDashboardProps {
  events: EventItem[];
  onOpenAttendance?: (event: EventItem) => void;
}

// Devocionais e Desafios Pastorais transmitidos pelo Pastor Sênior a todos os Teens
const PASTORAL_DEVOTIONALS = [
  {
    verse: "Ninguém despreze a tua mocidade; mas sê o exemplo dos fiéis, na palavra, no trato, no amor, no espírito, na fé, na pureza.",
    ref: "1 Timóteo 4:12",
    theme: "Sua Juventude tem um Propósito Eterno",
    reflection:
      "Como seu pastor, quero lhe lembrar: Deus não espera você chegar à fase adulta para usá-lo com poder. No colégio, na família e no seu ministério na igreja, sua alegria, fidelidade e postura santa são o maior testemunho do amor de Cristo para sua geração.",
    challenge: "Envie uma mensagem de ânimo ou ore por um colega do seu grupo ou da escola hoje!",
  },
  {
    verse: "Não to mandei eu? Esforça-te, e tem bom ânimo; não temas, nem te espantes; porque o Senhor teu Deus é contigo, por onde quer que andares.",
    ref: "Josué 1:9",
    theme: "Coragem Firme para Vencer a Insegurança",
    reflection:
      "Muitas vezes a timidez, o medo da opinião dos outros ou a pressão dos estudos tentam nos intimidar. Mas a sua força não depende de você; o Senhor dos Exércitos caminha ao seu lado em cada desafio diário.",
    challenge: "Separe 5 minutos antes de sair de casa para entregar suas dúvidas e inseguranças a Deus em oração.",
  },
  {
    verse: "Tudo posso naquele que me fortalece.",
    ref: "Filipenses 4:13",
    theme: "A Graça que Capacita seus Talentos",
    reflection:
      "Servir a Deus em um ministério exige dedicação e disciplina, mas a presença de Jesus transforma todo esforço em alegria transbordante e autoridade espiritual.",
    challenge: "Chegue hoje com antecedência e dê o seu melhor no próximo ensaio ou culto da igreja!",
  },
  {
    verse: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.",
    ref: "Salmos 119:105",
    theme: "A Bússola Segura no Meio do Barulho",
    reflection:
      "Em um mundo cheio de opiniões passageiras nas redes sociais, a Bíblia Sagrada é a rocha inabalável que guia suas decisões, preserva seu coração e ilumina seus sonhos.",
    challenge: "Leia um capítulo de Provérbios hoje para adquirir sabedoria prática para suas decisões.",
  },
];

const INITIAL_CHECKLIST = [
  { id: 1, text: "Bíblia ou app da Bíblia pronto no celular", done: false },
  { id: 2, text: "Uniforme / Figurino do Ministério alinhado", done: false },
  { id: 3, text: "Horário de ida e volta combinado com os pais", done: false },
  { id: 4, text: "Chegar 15 minutos antes para oração com a equipe", done: false },
];

export function TeenMotivationalDashboard({ events, onOpenAttendance }: TeenMotivationalDashboardProps) {
  const { currentUser, token, allUsers } = useTeensAuth();

  const [devotionalIndex, setDevotionalIndex] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [copiedDevotional, setCopiedDevotional] = useState(false);

  // Mapeamento dinâmico: descobre quem é o Líder do Ministério DESTE Teen
  const teenTags = (currentUser?.tags || []).map((t) => t.replace("#", "").toLowerCase());
  const teenMinistries = currentUser?.ministries || [];

  const myLeader = allUsers.find((u) => {
    if (u.role !== "LEADER") return false;
    const leaderTags = (u.tags || []).map((t) => t.replace("#", "").toLowerCase());
    const sharesTag = leaderTags.some((lt) => teenTags.includes(lt));
    const sharesMin =
      u.ministries &&
      u.ministries.some((lm) => teenMinistries.some((tm) => tm.id === lm.id));
    return sharesTag || sharesMin;
  });

  const hasAssignedLeader = Boolean(myLeader);
  const leaderMinistryName =
    myLeader?.ministries?.[0]?.name ||
    currentUser?.ministries?.[0]?.name ||
    currentUser?.tags?.[0] ||
    "Ministério de Adolescentes";

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const data = await listNotifications(token);
      setNotifications(data || []);
    } catch {
      // Silencioso
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [token]);

  const currentDevo = PASTORAL_DEVOTIONALS[devotionalIndex];

  const handleNextDevotional = () => {
    setDevotionalIndex((prev) => (prev + 1) % PASTORAL_DEVOTIONALS.length);
  };

  const handleToggleChecklist = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleCopyDevotional = () => {
    const text = `📖 Devocional Pastoral Teen (Pr. Paulo Roberto):\n"${currentDevo.verse}" (${currentDevo.ref})\n\nTema: ${currentDevo.theme}\n\n💡 Reflexão: ${currentDevo.reflection}\n\n🎯 Desafio: ${currentDevo.challenge}`;
    navigator.clipboard.writeText(text);
    setCopiedDevotional(true);
    setTimeout(() => setCopiedDevotional(false), 2000);
  };

  const nextEvent = events && events.length > 0 ? events[0] : null;
  const completedCount = checklist.filter((i) => i.done).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  // Recados não lidos relevantes para este Teen
  const unreadAnnouncements = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. SEÇÃO DE RECADOS OFICIAIS (DO LÍDER ESPECÍFICO DO TEEN OU PASTORAL) */}
      {unreadAnnouncements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm mt-0.5">
                <Megaphone className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    📢 Recado Oficial &bull; {hasAssignedLeader ? `Líder ${myLeader?.name}` : "Gabinete Pastoral"}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {hasAssignedLeader
                      ? `Ministério: ${leaderMinistryName}`
                      : "Transmissão Pastoral a Todos os Adolescentes"}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {unreadAnnouncements[0].title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  {unreadAnnouncements[0].message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleMarkAsRead(unreadAnnouncements[0].id)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-auto"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Ciente / Recebido</span>
            </button>
          </div>
        </div>
      )}

      {/* CARD HIERÁRQUICO DE COBERTURA: LÍDER DO MINISTÉRIO VS CUIDADO PASTORAL DIRETO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm ${
              hasAssignedLeader
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
            }`}
          >
            {hasAssignedLeader ? (
              <Shield className="w-5 h-5 text-amber-400" />
            ) : (
              <Crown className="w-5 h-5 text-purple-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-200">
                {hasAssignedLeader
                  ? `Seu Líder de Ministério: ${myLeader?.name}`
                  : "Cuidado Pastoral Direto: Pr. Paulo Roberto (Pastor Sênior)"}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                  hasAssignedLeader
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                }`}
              >
                {hasAssignedLeader ? leaderMinistryName : "Cobertura Pastoral Geral"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {hasAssignedLeader
                ? `Você está vinculado ao ${leaderMinistryName}. Seus recados e ensaios são acompanhados pelo líder ${myLeader?.name}.`
                : "Você ainda não possui um líder de ministério específico. Você recebe diretamente as palavras de ânimo, devocionais e orientações do Pastor."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-950/40 border border-purple-500/30 px-3 py-1.5 rounded-xl font-semibold">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Todo Teen recebe a Mensagem do Pastor</span>
        </div>
      </div>

      {/* 2. GRID PRINCIPAL DO TEEN: DEVOCIONAL PASTORAL + CENTRAL DE ORGANIZAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUNA ESQUERDA (7 COLS): DEVOCIONAL DO PASTOR SÊNIOR (TRANSMISSÃO PARA TODOS OS TEENS) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-900/95 to-purple-950/30 border border-purple-500/30 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Crown className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                      Palavra Pastoral &bull; Pr. Paulo Roberto
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Para Todos os Teens
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {currentDevo.theme}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyDevotional}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Copiar mensagem pastoral para compartilhar"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDevotional}
                  className="px-2.5 py-1 text-xs font-bold bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="Pedir outra palavra pastoral de ânimo"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Outra Palavra</span>
                </button>
              </div>
            </div>

            {/* Versículo em Destaque */}
            <div className="p-3.5 bg-slate-950/80 border-l-4 border-purple-500 rounded-r-xl space-y-1">
              <p className="text-xs sm:text-sm italic text-slate-200 font-medium leading-relaxed">
                &ldquo;{currentDevo.verse}&rdquo;
              </p>
              <span className="text-[11px] font-bold text-purple-400 block text-right">
                &mdash; {currentDevo.ref}
              </span>
            </div>

            {/* Reflexão Pastoral */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentDevo.reflection}
            </p>
          </div>

          {/* Desafio Pastoral do Dia */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-purple-950/20 -mx-5 -mb-5 p-4 rounded-b-2xl border-t border-purple-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-amber-300">Desafio Pastoral de Hoje: </span>
                <span className="text-slate-300">{currentDevo.challenge}</span>
              </div>
            </div>
            {copiedDevotional && (
              <span className="text-[10px] text-emerald-400 font-bold shrink-0 animate-pulse">
                Copiado!
              </span>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (5 COLS): CENTRAL DE ORGANIZAÇÃO & CHECKLIST DO TEEN */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 block">
                    Minha Organização
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    Preparação para o Próximo Culto
                  </h4>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-500/30">
                {progressPercent}% Pronto
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Próximo Evento / Alerta de Presença */}
            {nextEvent && (
              <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{nextEvent.title}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {new Date(nextEvent.date).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(nextEvent.date).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {nextEvent.location}
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Sua presença é essencial!
                  </span>
                  {onOpenAttendance && (
                    <button
                      type="button"
                      onClick={() => onOpenAttendance(nextEvent)}
                      className="text-[11px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Vagas</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Checklist Interativo */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Checklist do Adolescente:
              </span>
              {checklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`w-full p-2 rounded-xl text-left text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    item.done
                      ? "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30 font-medium"
                      : "bg-slate-950/60 text-slate-300 hover:bg-slate-950 border border-slate-800"
                  }`}
                >
                  {item.done ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className={item.done ? "line-through opacity-80" : ""}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-500 text-center">
            Organização ministerial &bull; Acompanhamento discipular Teens
          </div>
        </div>
      </div>
    </div>
  );
}
