"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  X,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { EventItem } from "@/types/sermon";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

interface EditorialCalendarProps {
  events: EventItem[];
  onSelectEvent?: (event: EventItem) => void;
  onOpenCreate?: () => void;
}

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

// Helper para categorização de cores por tema/título do culto
function getEventMarkerStyle(event: EventItem) {
  if (event.status === "pending_pastor_approval") {
    return {
      bg: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      dot: "bg-amber-400",
      label: "⏳ Validação Pendente",
    };
  }

  const text = `${event.title} ${event.theme || ""} ${event.location} ${event.ministry_name || ""}`.toLowerCase();
  if (text.includes("ceia") || text.includes("celebração") || text.includes("família")) {
    return {
      bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      dot: "bg-emerald-400",
      label: "Ceia / Celebração",
    };
  }
  if (text.includes("jovem") || text.includes("radical") || text.includes("teen") || text.includes("metanoia")) {
    return {
      bg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      dot: "bg-purple-400",
      label: "Culto Teens",
    };
  }
  if (text.includes("retiro") || text.includes("acampamento") || text.includes("conferência")) {
    return {
      bg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      dot: "bg-blue-400",
      label: "Retiro / Conferência",
    };
  }
  if (text.includes("célula") || text.includes("discipulado") || text.includes("oração")) {
    return {
      bg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      dot: "bg-amber-400",
      label: "Célula / Oração",
    };
  }
  return {
    bg: "bg-brand-500/20 text-brand-300 border-brand-500/40",
    dot: "bg-brand-400",
    label: "Programação Geral",
  };
}

export function EditorialCalendar({ events, onSelectEvent, onOpenCreate }: EditorialCalendarProps) {
  const { isLeader } = useTeensAuth();

  // Data atual de referência: Novembro de 2026
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 1)); // Mês 10 = Novembro
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: number; events: EventItem[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Nomes dos meses em português
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Cálculo dos dias do mês
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date(2026, 10, 7)); // 07/11/2026
    setSelectedDayEvents(null);
  };

  // Mapeamento de eventos por dia do mês atual
  const eventsByDay: Record<number, EventItem[]> = {};
  events.forEach((ev) => {
    const d = new Date(ev.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      if (!eventsByDay[dayNum]) eventsByDay[dayNum] = [];
      eventsByDay[dayNum].push(ev);
    }
  });

  // Identificador de "Hoje"
  const isToday = (dayNum: number) => {
    return year === 2026 && month === 10 && dayNum === 7;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* CABEÇALHO DO CALENDÁRIO EDITORIAL */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
            <CalendarIcon className="w-4 h-4" />
            Calendário Editorial de Cultos &bull; Planejamento Mensal
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <span>{monthNames[month]} {year}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-normal">
              {Object.values(eventsByDay).reduce((acc, curr) => acc + curr.length, 0)} programações este mês
            </span>
          </h2>
        </div>

        {/* NAVEGAÇÃO E CONTROLES */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            Hoje (07/Nov)
          </button>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isLeader && onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20"
            >
              + Novo Culto
            </button>
          )}
        </div>
      </div>

      {/* LEGENDA DOS MARCADORES CONCISOS */}
      <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-3 sm:gap-4 overflow-x-auto text-[11px] text-slate-300">
        <span className="font-semibold text-slate-400 uppercase text-[10px] flex-shrink-0">
          Marcadores:
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          <span>Culto Teens</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Ceia / Celebração</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span>Retiro / Conferência</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Célula / Oração</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Sparkles className="w-3 h-3 text-brand-400" />
          <span>Documentado com IA</span>
        </div>
      </div>

      {/* GRADE DOS DIAS DA SEMANA */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 text-center text-[11px] font-bold text-slate-400 py-2.5 tracking-wider">
        {WEEKDAYS.map((w, idx) => (
          <div key={idx} className={idx === 0 || idx === 6 ? "text-brand-400" : ""}>
            {w}
          </div>
        ))}
      </div>

      {/* GRADE DOS DIAS DO MÊS */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950/20">
        {/* Dias do mês anterior (padding visual) */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => {
          const prevDayNum = totalDaysInPrevMonth - firstDayOfWeek + i + 1;
          return (
            <div
              key={`prev-${i}`}
              className="min-h-[90px] sm:min-h-[110px] p-2 bg-slate-950/40 text-slate-600 opacity-40 select-none"
            >
              <span className="text-xs font-semibold">{prevDayNum}</span>
            </div>
          );
        })}

        {/* Dias do mês atual */}
        {Array.from({ length: totalDaysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayEvents = eventsByDay[dayNum] || [];
          const today = isToday(dayNum);
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={`day-${dayNum}`}
              onClick={() => {
                if (hasEvents) {
                  setSelectedDayEvents({ day: dayNum, events: dayEvents });
                }
              }}
              className={`min-h-[90px] sm:min-h-[110px] p-2 transition-all group relative flex flex-col justify-between ${
                today
                  ? "bg-brand-950/20 ring-1 ring-inset ring-brand-500/50"
                  : "hover:bg-slate-850/50"
              } ${hasEvents ? "cursor-pointer" : ""}`}
            >
              {/* Cabeçalho do dia */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 ${
                    today
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/40"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  {dayNum}
                </span>

                {today && (
                  <span className="text-[10px] font-bold uppercase text-brand-400 hidden sm:inline">
                    Hoje
                  </span>
                )}
              </div>

              {/* Marcadores de Eventos do Dia */}
              <div className="space-y-1 my-1 flex-1">
                {dayEvents.slice(0, 2).map((ev) => {
                  const marker = getEventMarkerStyle(ev);
                  const timeStr = new Date(ev.date).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={ev.id}
                      className={`text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded-md border flex items-center justify-between gap-1 shadow-sm transition-transform hover:scale-[1.02] truncate ${marker.bg}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${marker.dot}`} />
                        <span className="text-slate-400 font-mono text-[10px]">{timeStr}</span>
                        <span className="truncate">{ev.title}</span>
                      </div>
                      {ev.has_sermon && (
                        <Sparkles className="w-2.5 h-2.5 text-brand-300 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}

                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-slate-400 font-medium block pl-1">
                    +{dayEvents.length - 2} programação(ões)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PAINEL LATERAL/POPUP DE DETALHES DO DIA SELECIONADO */}
      {selectedDayEvents && (
        <div className="p-5 bg-slate-950 border-t border-slate-800 animate-fadeIn space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                Programações de {selectedDayEvents.day} de {monthNames[month]} de {year}
              </h3>
              <span className="text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-semibold">
                {selectedDayEvents.events.length} evento(s)
              </span>
            </div>

            <button
              onClick={() => setSelectedDayEvents(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedDayEvents.events.map((ev) => {
              const marker = getEventMarkerStyle(ev);
              const timeStr = new Date(ev.date).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={ev.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${marker.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${marker.dot}`} />
                        {marker.label}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100">{ev.title}</h4>
                      {ev.theme && (
                        <p className="text-xs text-brand-300 font-medium">Tema: {ev.theme}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-200 block bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <Link
                      href={`/events/${ev.id}`}
                      className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1"
                    >
                      Ver Detalhes do Culto <ExternalLink className="w-3 h-3" />
                    </Link>

                    {ev.has_sermon && ev.sermon?.id && (
                      <Link
                        href={`/sermon/${ev.sermon.id}`}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold inline-flex items-center gap-1 border border-indigo-500/30"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        Ver Esboço IA
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

