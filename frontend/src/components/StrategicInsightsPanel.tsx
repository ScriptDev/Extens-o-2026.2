"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  AlertTriangle,
  Calendar,
  Clock,
  UserCheck,
  MessageSquare,
  HelpCircle,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  HeartHandshake,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { useTeensAuth } from "@/contexts/TeensAuthContext";
import { getStrategicInsights } from "@/services/api";
import { StrategicInsightsResponse, StrategicInsightItem } from "@/types/sermon";

export function StrategicInsightsPanel() {
  const { currentUser, token, isPastor, isLeader } = useTeensAuth();
  const [data, setData] = useState<StrategicInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const resp = await getStrategicInsights(token);
      setData(resp);
    } catch (e) {
      console.warn("Erro ao buscar insights estratégicos da IA:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [currentUser?.id, currentUser?.role]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!data || !data.insights || data.insights.length === 0) {
    return null;
  }

  const isPastorRole = isPastor;
  const highConcernCount = data.insights.filter((i) => i.severity === "high_concern").length;

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-purple-500/30 shadow-2xl p-5 overflow-hidden transition-all relative">
      {/* Glow decorativo de fundo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabeçalho do Painel */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {isPastorRole
                  ? "Copiloto Pastoral: Auditoria Ministerial & Linha Temporal"
                  : isLeader
                  ? "Copiloto do Líder: Acompanhamento Discipular de Membros"
                  : "Insights de Crescimento Espiritual"}
              </h2>
              {highConcernCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {highConcernCount} {highConcernCount === 1 ? "Atenção Crítica" : "Atenções Críticas"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{data.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInsights}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-all cursor-pointer"
            title="Atualizar Análise Temporal da IA"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Conteúdo Expandível */}
      {expanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.insights.map((item, idx) => {
            const isHigh = item.severity === "high_concern";
            const isWarning = item.severity === "warning";

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  isHigh
                    ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60"
                    : isWarning
                    ? "bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50"
                    : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        isHigh
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : isWarning
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {isHigh ? "Grande Preocupação" : isWarning ? "Atenção" : "Em Dia"}
                    </span>
                    <h3 className="text-sm font-bold text-white">{item.target_name}</h3>
                  </div>

                  {item.days_inactive !== undefined && item.days_inactive !== null && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>{item.days_inactive} dias sem evento</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 mb-2 font-medium">{item.observation}</p>

                {/* Linha Temporal e Análise */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-3 text-xs text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Linha Temporal de Atividade:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {item.temporal_analysis}
                  </p>

                  {/* Hipóteses e Causas Prováveis mapeadas pela IA */}
                  {item.probable_causes && item.probable_causes.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide block mb-1">
                        Probabilidades Lógicas Observadas pela IA:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.probable_causes.map((cause, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2 py-0.5 bg-slate-900 border border-slate-700/60 rounded text-[10px] text-slate-300 font-medium"
                          >
                            &bull; {cause}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Plano de Ação Acionável */}
                <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 flex items-start gap-2 text-xs">
                  <HeartHandshake className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-purple-200 block text-[11px] mb-0.5">
                      {isPastorRole ? "Intervenção Pastoral Recomendada:" : "Abordagem de Cuidado Pastoral:"}
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {item.action_plan}
                    </p>
                  </div>

                  {!isPastorRole && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.action_plan, `plan-${idx}`)}
                      className="px-2 py-1 bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                      title="Copiar mensagem sugerida"
                    >
                      {copiedId === `plan-${idx}` ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

