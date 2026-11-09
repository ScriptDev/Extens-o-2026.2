"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Crown,
  BookOpen,
  Palette,
  Layers,
} from "lucide-react";
import { MinistryItem, MinistryAISuggestion } from "@/types/sermon";
import {
  listMinistries,
  createMinistry,
  deleteMinistry,
  aiSuggestMinistries,
} from "@/services/api";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

interface MinistriesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinistryUpdated?: () => void;
}

const POPULAR_KANJIS = [
  { symbol: "光", meaning: "Hikari (Luz do Mundo)", verse: "Mt 5:14", color: "#8B5CF6" },
  { symbol: "絆", meaning: "Kizuna (Comunhão / Vínculo)", verse: "Cl 3:14", color: "#EC4899" },
  { symbol: "勇", meaning: "Yū (Coragem / Bravura)", verse: "Js 1:9", color: "#3B82F6" },
  { symbol: "聖", meaning: "Sei (Santidade / Consagração)", verse: "1Pe 1:16", color: "#10B981" },
  { symbol: "命", meaning: "Inochi (Vida Abundante)", verse: "Jo 10:10", color: "#06B6D4" },
  { symbol: "道", meaning: "Michi (O Caminho)", verse: "Jo 14:6", color: "#F59E0B" },
  { symbol: "力", meaning: "Chikara (Poder / Força)", verse: "Fp 4:13", color: "#EF4444" },
  { symbol: "栄", meaning: "Ei (Glória a Deus)", verse: "1Co 10:31", color: "#EAB308" },
];

function generateDefaultSvg(kanji: string, color: string) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]">
  <defs>
    <linearGradient id="grad-dyn" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient>
  </defs>
  <polygon points="50,4 92,26 92,74 50,96 8,74 8,26" fill="#08031a" stroke="url(#grad-dyn)" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="50" r="30" fill="#13092b" stroke="${color}" stroke-width="1.5" stroke-dasharray="3,2"/>
  <text x="50" y="62" font-size="34" font-weight="900" font-family="'Noto Sans JP', sans-serif" fill="#FFFFFF" text-anchor="middle" filter="drop-shadow(0 0 6px ${color})">${kanji}</text>
</svg>`;
}

export function MinistriesManagementModal({
  isOpen,
  onClose,
  onMinistryUpdated,
}: MinistriesManagementModalProps) {
  const { token, isPastor, isAdmin } = useTeensAuth();

  const [ministries, setMinistries] = useState<MinistryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "ai" | "manual">("list");

  // Formulário Manual
  const [manualName, setManualName] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualKanji, setManualKanji] = useState("光");
  const [manualMeaning, setManualMeaning] = useState("Hikari (Luz)");
  const [manualColor, setManualColor] = useState("#8B5CF6");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Formulário de Sugestão de IA
  const [aiThemeHint, setAiThemeHint] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<MinistryAISuggestion[]>([]);

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchMinistries = async () => {
    setLoading(true);
    try {
      const data = await listMinistries();
      setMinistries(data);
    } catch {
      setMessage({ text: "Erro ao carregar ministérios.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMinistries();
      setMessage(null);
    }
  }, [isOpen]);

  const handleSelectKanjiPreset = (preset: (typeof POPULAR_KANJIS)[0]) => {
    setManualKanji(preset.symbol);
    setManualMeaning(preset.meaning);
    setManualColor(preset.color);
    if (!manualName) {
      setManualName(`Ministério ${preset.symbol} ${preset.meaning.split(" ")[0]}`);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualKanji.trim()) {
      setMessage({ text: "Nome e Símbolo em Kanji são obrigatórios.", type: "error" });
      return;
    }

    setIsSubmittingManual(true);
    setMessage(null);

    try {
      const svgCode = generateDefaultSvg(manualKanji.trim(), manualColor);
      await createMinistry(
        {
          name: manualName.trim(),
          description: manualDescription.trim() || undefined,
          kanji_symbol: manualKanji.trim(),
          kanji_meaning: manualMeaning.trim() || manualKanji,
          badge_svg: svgCode,
          primary_color: manualColor,
        },
        token
      );

      setMessage({ text: `Ministério "${manualName}" criado com sucesso!`, type: "success" });
      setManualName("");
      setManualDescription("");
      setActiveTab("list");
      fetchMinistries();
      onMinistryUpdated?.();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro ao cadastrar ministério.", type: "error" });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setMessage(null);
    try {
      const suggestions = await aiSuggestMinistries(aiThemeHint.trim() || undefined, token);
      setAiSuggestions(suggestions);
    } catch (err: any) {
      setMessage({ text: err.message || "Falha ao gerar sugestões com IA.", type: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAdoptAISuggestion = async (suggestion: MinistryAISuggestion) => {
    setLoading(true);
    setMessage(null);
    try {
      await createMinistry(
        {
          name: suggestion.name,
          description: `${suggestion.description} (${suggestion.biblical_reference})`,
          kanji_symbol: suggestion.kanji_symbol,
          kanji_meaning: suggestion.kanji_meaning,
          badge_svg: suggestion.badge_svg,
          primary_color: suggestion.primary_color,
        },
        token
      );

      setMessage({ text: `Ministério "${suggestion.name}" homologado com sucesso!`, type: "success" });
      setActiveTab("list");
      fetchMinistries();
      onMinistryUpdated?.();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro ao salvar ministério.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o ministério "${name}" da lista oficial?`)) return;

    try {
      await deleteMinistry(id, token);
      setMessage({ text: `Ministério "${name}" removido.`, type: "success" });
      fetchMinistries();
      onMinistryUpdated?.();
    } catch (err: any) {
      setMessage({ text: err.message || "Erro ao excluir ministério.", type: "error" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Ministérios Oficiais &amp; Brasões em Kanji
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Exclusivo Pastoral
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gerencie os ministérios da igreja, sugira nomes e brasões com IA e eleja líderes (máx 3 vínculos).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab("list")}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "list"
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ministérios Ativos ({ministries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "ai"
                ? "border-brand-500 text-brand-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Sugerir com IA (Gemini &amp; Kanji)</span>
          </button>

          <button
            onClick={() => setActiveTab("manual")}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "manual"
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Manualmente</span>
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ABA 1: LISTA DE MINISTÉRIOS */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <span>Carregando ministérios oficiais...</span>
                </div>
              ) : ministries.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  Nenhum ministério cadastrado ainda. Use a IA para sugerir ou crie manualmente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ministries.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-4 hover:border-slate-700 transition-all group"
                    >
                      {/* Brasão em SVG Renderizado */}
                      <div
                        className="w-16 h-16 flex-shrink-0 rounded-xl p-1 bg-slate-900 border border-slate-800 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: m.badge_svg }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-100 text-sm truncate">
                            {m.name}
                          </h4>
                          {(isPastor || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id, m.name)}
                              className="text-slate-500 hover:text-red-400 transition-colors p-1"
                              title="Remover ministério"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-xs">
                          <span
                            className="font-extrabold px-2 py-0.5 rounded text-[11px]"
                            style={{
                              backgroundColor: `${m.primary_color}25`,
                              color: m.primary_color,
                              border: `1px solid ${m.primary_color}50`,
                            }}
                          >
                            {m.kanji_symbol} &bull; {m.kanji_meaning}
                          </span>
                        </div>

                        {m.description && (
                          <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: SUGESTÕES COM IA (GEMINI + KANJI) */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-300">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span>Assistente Pastoral de Criação de Ministérios (IA Gemini)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Descreva o foco ou público-alvo desejado (ex: Jovens, Teens, Casais, Comunicação, Louvor, Evangelismo nas Ruas)
                  e a IA sugerirá nomes bíblicos, ideogramas em Kanji com alto valor estético e brasões vetoriais em SVG.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiThemeHint}
                    onChange={(e) => setAiThemeHint(e.target.value)}
                    placeholder="Ex: Jovens radicais, louvor contemporâneo, discipulado de novos líderes..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                    className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md disabled:opacity-60"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Propostas com IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sugestões Retornadas */}
              {aiSuggestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Propostas Geradas pela IA (Clique em &quot;Adotar Ministério&quot; para Homologar):
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiSuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 hover:border-brand-500/50 transition-all shadow-lg"
                      >
                        <div className="space-y-2">
                          <div
                            className="w-20 h-20 mx-auto p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: sug.badge_svg }}
                          />

                          <div className="text-center">
                            <span
                              className="text-[11px] font-extrabold px-2 py-0.5 rounded inline-block"
                              style={{
                                backgroundColor: `${sug.primary_color}25`,
                                color: sug.primary_color,
                                border: `1px solid ${sug.primary_color}50`,
                              }}
                            >
                              {sug.kanji_symbol} &bull; {sug.kanji_meaning}
                            </span>
                            <h4 className="font-extrabold text-slate-100 text-sm mt-1">
                              {sug.name}
                            </h4>
                          </div>

                          <p className="text-[11px] text-slate-400 text-center">
                            {sug.description}
                          </p>

                          <div className="text-center text-[10px] text-brand-300 font-semibold bg-brand-950/40 py-1 px-2 rounded-lg border border-brand-500/20">
                            📖 {sug.biblical_reference}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAdoptAISuggestion(sug)}
                          className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Adotar Este Ministério</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: CRIAÇÃO MANUAL */}
          {activeTab === "manual" && (
            <form onSubmit={handleCreateManual} className="space-y-4 max-w-xl mx-auto">
              {/* Presets Rápidos de Ideogramas Japoneses */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Ideogramas Japoneses Populares (Clique para selecionar):
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {POPULAR_KANJIS.map((preset) => (
                    <button
                      key={preset.symbol}
                      type="button"
                      onClick={() => handleSelectKanjiPreset(preset)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        manualKanji === preset.symbol
                          ? "bg-purple-500/30 border-purple-500 text-purple-200 scale-105"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-xl font-bold">{preset.symbol}</div>
                      <div className="text-[9px] truncate">{preset.meaning.split(" ")[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nome do Ministério *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: Metanoia Teens Hikari"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Ideograma Japonês (Kanji) *
                  </label>
                  <input
                    type="text"
                    value={manualKanji}
                    onChange={(e) => setManualKanji(e.target.value)}
                    maxLength={3}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-base text-center font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Significado Teológico *
                  </label>
                  <input
                    type="text"
                    value={manualMeaning}
                    onChange={(e) => setManualMeaning(e.target.value)}
                    placeholder="Ex: Luz do Mundo"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Cor Primária de Destaque
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={manualColor}
                    onChange={(e) => setManualColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={manualColor}
                    onChange={(e) => setManualColor(e.target.value)}
                    className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Descrição e Versículo
                </label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  rows={2}
                  placeholder="Propósito e missão pastoral deste ministério..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Preview do Brasão Gerado */}
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl p-1 bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0"
                  dangerouslySetInnerHTML={{
                    __html: generateDefaultSvg(manualKanji || "光", manualColor),
                  }}
                />
                <div className="text-xs text-slate-400">
                  <span className="font-bold text-slate-200 block">Preview do Brasão em SVG:</span>
                  Renderizado em vetor com ideograma &quot;{manualKanji}&quot; e gradiente com glow neon.
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingManual}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmittingManual ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Ministério...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cadastrar Ministério Oficial</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

