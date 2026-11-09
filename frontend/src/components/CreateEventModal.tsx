"use client";

import React, { useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Mic,
  Check,
  CheckCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Search,
  Building2,
  History,
  Layers,
  Crown,
  ShieldAlert,
} from "lucide-react";
import { createEvent, assistEventWithAI, assistEventWithAIAudio, lookupCep, listMinistries } from "@/services/api";
import { AudioRecorder } from "@/components/AudioRecorder";
import { EventItem, EventAIAssistResponse, InconsistencyItem, MinistryItem } from "@/types/sermon";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

export function CreateEventModal({ isOpen, onClose, onEventCreated }: CreateEventModalProps) {
  const { isPastor, isAdmin, token } = useTeensAuth();

  // Modo de Agendamento: Manual vs Copiloto IA
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("ai");

  // Dados do Formulário Principal
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("Templo Principal");
  const [theme, setTheme] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [addressDetails, setAddressDetails] = useState<any>(null);
  const [planning, setPlanning] = useState<any>(null);
  const [ministries, setMinistries] = useState<MinistryItem[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [availableChurchTags, setAvailableChurchTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isGlobalEvent, setIsGlobalEvent] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      listMinistries().then((mins) => {
        setMinistries(mins);
        if (mins.length > 0 && !selectedMinistryId) {
          setSelectedMinistryId(mins[0].id);
        }
      });
      // Carrega tags oficiais configuradas na igreja
      import("@/services/api").then((mod) => {
        mod.getChurchTerminology().then((term) => {
          if (term?.available_tags) {
            setAvailableChurchTags(term.available_tags);
          }
        });
      });
    }
  }, [isOpen]);

  // Estados do Copiloto IA
  const [aiInputMode, setAiInputMode] = useState<"text" | "voice">("text");
  const [rawBriefing, setRawBriefing] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<EventAIAssistResponse | null>(null);
  const [appliedFields, setAppliedFields] = useState<Record<string, boolean>>({});
  const [showPlanningDetails, setShowPlanningDetails] = useState(false);

  // Estados de Localização Assistida & Busca por CEP
  const [locationMode, setLocationMode] = useState<"manual" | "cep">("manual");
  const [cepInput, setCepInput] = useState("");
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepData, setCepData] = useState<any | null>(null);
  const [cepNumber, setCepNumber] = useState("");
  const [cepComplement, setCepComplement] = useState("");

  const handleSearchCep = async () => {
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length !== 8) {
      setCepError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setIsCepLoading(true);
    setCepError(null);

    try {
      const res = await lookupCep(clean);
      setCepData(res);
      const fullLoc = `${res.logradouro}, ${cepNumber || "S/N"}${cepComplement ? ` (${cepComplement})` : ""} - ${res.bairro}, ${res.localidade} - ${res.uf}`;
      setLocation(fullLoc);
      setAddressDetails({
        place_name: cepComplement || res.logradouro,
        formatted_address: fullLoc,
        maps_url: res.maps_url,
        city: res.localidade,
        neighborhood: res.bairro,
        cep: res.cep,
        number: cepNumber || undefined,
        complement: cepComplement || undefined,
      });
      setAppliedFields((prev) => ({ ...prev, location: true }));
    } catch (err: any) {
      setCepError(err.message || "CEP não encontrado.");
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleUpdateCepNumber = (num: string, comp: string) => {
    setCepNumber(num);
    setCepComplement(comp);
    if (cepData) {
      const fullLoc = `${cepData.logradouro}, ${num || "S/N"}${comp ? ` (${comp})` : ""} - ${cepData.bairro}, ${cepData.localidade} - ${cepData.uf}`;
      setLocation(fullLoc);
      const encoded = encodeURIComponent(fullLoc);
      setAddressDetails({
        place_name: comp || cepData.logradouro,
        formatted_address: fullLoc,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        city: cepData.localidade,
        neighborhood: cepData.bairro,
        cep: cepData.cep,
        number: num || undefined,
        complement: comp || undefined,
      });
    }
  };

  // Estados de Operação Geral
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // ============================================================================
  // Disparo do Copiloto IA (Texto)
  // ============================================================================
  const handleAnalyzeWithAI = async () => {
    if (!rawBriefing.trim() && !title.trim() && !location.trim()) {
      setError("Escreva ou dite algumas informações sobre o culto antes de analisar.");
      return;
    }

    setIsAiLoading(true);
    setError(null);

    try {
      const result = await assistEventWithAI({
        input_text: rawBriefing.trim() || undefined,
        current_title: title.trim() || undefined,
        current_date: date || undefined,
        current_location: location.trim() || undefined,
        current_theme: theme.trim() || undefined,
        current_description: description.trim() || undefined,
      });

      setAiResponse(result);
      setAppliedFields({});
    } catch (err: any) {
      setError(err.message || "Falha ao processar com o Copiloto IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // ============================================================================
  // Disparo do Copiloto IA (Áudio / Voz)
  // ============================================================================
  const handleVoiceRecordingComplete = async (audioFile: File) => {
    setIsAiLoading(true);
    setError(null);

    try {
      const result = await assistEventWithAIAudio(audioFile);
      setAiResponse(result);
      setAppliedFields({});
      if (result.suggested_title) {
        setRawBriefing(`Áudio gravado analisado: ${result.suggested_title} - ${result.suggested_theme}`);
      }
    } catch (err: any) {
      setError(err.message || "Falha ao analisar o áudio com a IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // ============================================================================
  // Aplicação de Sugestões (Individual vs Todas)
  // ============================================================================
  const applyAllSuggestions = () => {
    if (!aiResponse) return;

    if (aiResponse.suggested_title) setTitle(aiResponse.suggested_title);
    if (aiResponse.suggested_theme) setTheme(aiResponse.suggested_theme);
    if (aiResponse.suggested_description) setDescription(aiResponse.suggested_description);
    if (aiResponse.suggested_date) {
      // Converte ISO para formato aceito pelo input datetime-local
      const d = new Date(aiResponse.suggested_date);
      if (!isNaN(d.getTime())) {
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDate(localIso);
      }
    }
    if (aiResponse.location_data?.formatted_address) {
      setLocation(aiResponse.location_data.formatted_address);
      setAddressDetails(aiResponse.location_data);
    } else if (aiResponse.location_data?.place_name) {
      setLocation(aiResponse.location_data.place_name);
    }
    if (aiResponse.suggested_banner_url) {
      setCoverImage(aiResponse.suggested_banner_url);
    }
    if (aiResponse.planning) {
      setPlanning(aiResponse.planning);
    }

    setAppliedFields({
      title: true,
      theme: true,
      description: true,
      date: true,
      location: true,
      banner: true,
      planning: true,
    });
  };

  const applySingleSuggestion = (field: string) => {
    if (!aiResponse) return;

    switch (field) {
      case "title":
        setTitle(aiResponse.suggested_title);
        break;
      case "theme":
        setTheme(aiResponse.suggested_theme);
        break;
      case "description":
        setDescription(aiResponse.suggested_description);
        break;
      case "date":
        if (aiResponse.suggested_date) {
          const d = new Date(aiResponse.suggested_date);
          if (!isNaN(d.getTime())) {
            const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setDate(localIso);
          }
        }
        break;
      case "location":
        if (aiResponse.location_data?.formatted_address) {
          setLocation(aiResponse.location_data.formatted_address);
          setAddressDetails(aiResponse.location_data);
        } else if (aiResponse.location_data?.place_name) {
          setLocation(aiResponse.location_data.place_name);
        }
        break;
      case "banner":
        setCoverImage(aiResponse.suggested_banner_url);
        break;
      case "planning":
        setPlanning(aiResponse.planning);
        break;
    }

    setAppliedFields((prev) => ({ ...prev, [field]: true }));
  };

  // ============================================================================
  // Submissão Final para o Supabase
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Informe o título do culto ou evento.");
      return;
    }
    if (!date) {
      setError("Selecione a data e horário do evento.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await createEvent(
        {
          title: title.trim(),
          date: new Date(date).toISOString(),
          location: location.trim() || "Templo Principal",
          theme: theme.trim() || undefined,
          description: description.trim() || undefined,
          cover_image: coverImage.trim() || undefined,
          address_details: addressDetails || undefined,
          planning: planning || undefined,
          ministry_id: selectedMinistryId || undefined,
          tags: selectedTags,
          is_global: isGlobalEvent,
        },
        token
      );

      onEventCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar o evento no Supabase.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 relative space-y-5 my-auto">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            Agenda Inteligente de Cultos
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-100">
            Agendar Novo Culto ou Evento
          </h3>
          <p className="text-xs text-slate-400">
            Agende manualmente ou use o Copiloto IA (áudio/texto) para estruturar títulos, temas, liturgia e banners.
          </p>
        </div>

        {/* Seletor de Modo: Manual vs Copiloto IA */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "ai"
                ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Copiloto IA (Áudio ou Texto)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "manual"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Agendamento Manual
          </button>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ABA DO COPILOTO IA: BRIEFING DE TEXTO OU VOZ */}
        {/* ==================================================================== */}
        {activeTab === "ai" && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-400" />
                Como deseja alimentar o Copiloto?
              </span>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAiInputMode("text")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    aiInputMode === "text"
                      ? "bg-brand-600 text-white font-medium"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Texto / Roteiro
                </button>
                <button
                  type="button"
                  onClick={() => setAiInputMode("voice")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    aiInputMode === "voice"
                      ? "bg-red-600 text-white font-medium"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Mic className="w-3 h-3 inline mr-1" />
                  Gravar Áudio
                </button>
              </div>
            </div>

            {aiInputMode === "text" ? (
              <div className="space-y-2">
                <textarea
                  value={rawBriefing}
                  onChange={(e) => setRawBriefing(e.target.value)}
                  rows={3}
                  placeholder="Ex: Vai ter culto de jovens sábado às 19h no salão anexo da igreja em Fortaleza. O tema é Santidade e o pregador convidado é o Pr. Marcos..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                />
                <button
                  type="button"
                  onClick={handleAnalyzeWithAI}
                  disabled={isAiLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisando e Estruturando com Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analisar e Estruturar Culto com IA
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Grave um áudio dizendo a data, local, pregador e tema. O Gemini multimodal processará as diretrizes:
                </p>
                <AudioRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  disabled={isAiLoading}
                />
                {isAiLoading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-brand-300 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando sua gravação com Gemini 3.5 Flash...
                  </div>
                )}
              </div>
            )}

            {/* PAINEL DE RESULTADOS E SUGESTÕES DA IA */}
            {aiResponse && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2 bg-brand-500/10 border border-brand-500/20 p-3 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Sugestões Geradas pela IA
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Você pode aplicar todas com um clique ou escolher individualmente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={applyAllSuggestions}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-600/30 transition-all"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Aplicar Todas as Sugestões
                  </button>
                </div>

                {/* INCONSISTÊNCIAS GRIFADAS PELA IA */}
                {aiResponse.inconsistencies && aiResponse.inconsistencies.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Atenção: Inconsistências Detectadas
                    </span>
                    <div className="space-y-1.5">
                      {aiResponse.inconsistencies.map((inc, i) => (
                        <div
                          key={i}
                          className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-200 flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold uppercase text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded mr-1.5 text-amber-300">
                              {inc.field}
                            </span>
                            <span>{inc.issue}</span>
                            <p className="text-[11px] text-slate-300 mt-0.5 italic">
                              💡 Sugestão: {inc.suggestion}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applySingleSuggestion(inc.field)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                              appliedFields[inc.field]
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                                : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {appliedFields[inc.field] ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Confirmado
                              </>
                            ) : (
                              "Corrigir / Aceitar"
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MEMÓRIA DA IGREJA: LOCAL HABITUAL IDENTIFICADO */}
                {aiResponse.location_memory?.has_previous_location && (
                  <div className="bg-slate-900 border border-brand-500/40 p-3.5 rounded-xl space-y-2.5 shadow-lg shadow-brand-500/5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400 flex-shrink-0 mt-0.5">
                        <History className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">
                            Memória da Igreja &bull; Local Habitual
                          </span>
                          <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-semibold uppercase">
                            Detectado
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {aiResponse.location_memory.confirmation_prompt}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-300 font-semibold truncate">
                          <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          <span>{aiResponse.location_memory.previous_location_name}</span>
                          {aiResponse.location_memory.previous_formatted_address && (
                            <span className="text-slate-400 font-normal">
                              ({aiResponse.location_memory.previous_formatted_address})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setLocation(aiResponse.location_memory!.previous_location_name || "");
                          setAddressDetails({
                            place_name: aiResponse.location_memory!.previous_location_name,
                            formatted_address: aiResponse.location_memory!.previous_formatted_address,
                            maps_url: aiResponse.location_memory!.previous_maps_url,
                          });
                          setAppliedFields((prev) => ({ ...prev, location: true }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          appliedFields.location
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {appliedFields.location ? "Local Habitual Confirmado" : "Confirmar Local Habitual"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLocationMode("cep");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        Trocar Local / Buscar por CEP
                      </button>
                    </div>
                  </div>
                )}

                {/* SUGESTÕES INDIVIDUAIS */}
                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  {/* Título Sugerido */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Título Conciso Sugerido
                      </span>
                      <span className="text-slate-200 font-medium truncate block">
                        {aiResponse.suggested_title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySingleSuggestion("title")}
                      className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 transition-colors ${
                        appliedFields.title
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {appliedFields.title ? <Check className="w-3 h-3" /> : null}
                      {appliedFields.title ? "Aplicado" : "Usar Título"}
                    </button>
                  </div>

                  {/* Tema Bíblico */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Tema Teológico
                      </span>
                      <span className="text-slate-200 font-medium truncate block">
                        {aiResponse.suggested_theme}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySingleSuggestion("theme")}
                      className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 transition-colors ${
                        appliedFields.theme
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {appliedFields.theme ? <Check className="w-3 h-3" /> : null}
                      {appliedFields.theme ? "Aplicado" : "Usar Tema"}
                    </button>
                  </div>

                  {/* Localização & Maps */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400" />
                        Localização / Google Maps
                      </span>
                      <span className="text-slate-200 font-medium truncate block">
                        {aiResponse.location_data?.formatted_address ||
                          aiResponse.location_data?.place_name ||
                          location}
                      </span>
                      {aiResponse.location_data?.maps_url && (
                        <a
                          href={aiResponse.location_data.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-400 hover:text-brand-300 text-[11px] inline-flex items-center gap-0.5 mt-0.5 underline"
                        >
                          Ver no Google Maps <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => applySingleSuggestion("location")}
                      className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 transition-colors ${
                        appliedFields.location
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {appliedFields.location ? <Check className="w-3 h-3" /> : null}
                      {appliedFields.location ? "Aplicado" : "Usar Endereço"}
                    </button>
                  </div>

                  {/* Descrição Concisa */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Descrição Concisa do Culto
                      </span>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        {aiResponse.suggested_description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySingleSuggestion("description")}
                      className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 transition-colors ${
                        appliedFields.description
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {appliedFields.description ? <Check className="w-3 h-3" /> : null}
                      {appliedFields.description ? "Aplicado" : "Usar"}
                    </button>
                  </div>
                </div>

                {/* BANNERS TEMÁTICOS SUGERIDOS PELA IA */}
                {aiResponse.banner_alternatives && aiResponse.banner_alternatives.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-brand-400" />
                      Escolha um Banner Temático com IA
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {aiResponse.banner_alternatives.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setCoverImage(imgUrl);
                            setAppliedFields((prev) => ({ ...prev, banner: true }));
                          }}
                          className={`relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                            coverImage === imgUrl
                              ? "border-brand-500 shadow-lg shadow-brand-500/30 ring-2 ring-brand-400"
                              : "border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Banner temático ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {coverImage === imgUrl && (
                            <div className="absolute inset-0 bg-brand-600/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PLANEJAMENTO LITÚRGICO & ORDEM DO CULTO */}
                {aiResponse.planning && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <button
                      type="button"
                      onClick={() => setShowPlanningDetails(!showPlanningDetails)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-slate-200"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-400" />
                        Planejamento Litúrgico Sugerido (
                        {aiResponse.planning.ordem_culto?.length || 4} etapas)
                      </span>
                      {showPlanningDetails ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showPlanningDetails && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                        {aiResponse.planning.versiculo_base && (
                          <p>
                            <strong className="text-brand-300">Versículo-Base:</strong>{" "}
                            {aiResponse.planning.versiculo_base}
                          </p>
                        )}
                        {aiResponse.planning.publico_alvo && (
                          <p>
                            <strong className="text-brand-300">Público-Alvo:</strong>{" "}
                            {aiResponse.planning.publico_alvo}
                          </p>
                        )}
                        <div className="space-y-1 mt-2">
                          <strong className="text-slate-400 block text-[11px] uppercase">
                            Ordem Estimada do Culto:
                          </strong>
                          {aiResponse.planning.ordem_culto?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800/80 text-[11px]"
                            >
                              <span>{item.etapa}</span>
                              <span className="text-brand-400 font-semibold">
                                {item.tempo_minutos} min
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PERGUNTAS COMPLEMENTARES DA IA */}
                {aiResponse.questions && aiResponse.questions.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
                      Pontos Complementares para Refinar o Culto:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                      {aiResponse.questions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* FORMULÁRIO FINAL DE AGENDAMENTO (REVISÃO & CONFIRMAÇÃO) */}
        {/* ==================================================================== */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* AVISO DE GOVERNANÇA PASTORAL */}
          {!isPastor && !isAdmin ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Nota de Governança Pastoral:</strong> Como Líder, seu culto será enviado com status <em>Pendente de Validação</em> e somente após a homologação de um Pastor ficará visível aos adolescentes.
              </span>
            </div>
          ) : (
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-300 flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>
                <strong>Homologação Pastoral Direta:</strong> Como autoridade pastoral, este culto será publicado imediatamente no calendário oficial da igreja.
              </span>
            </div>
          )}

          {/* Vínculo de Ministério Promotor */}
          {ministries.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Ministério Promotor (Oficial)</span>
              </label>
              <select
                value={selectedMinistryId}
                onChange={(e) => setSelectedMinistryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.kanji_symbol} &bull; {m.name} ({m.kanji_meaning})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Título do Culto / Evento <span className="text-brand-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Culto da Família, Culto de Jovens..."
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Data e Horário <span className="text-brand-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Localização / Endereço Completo
                </label>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLocationMode("manual")}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      locationMode === "manual"
                        ? "bg-brand-600 text-white font-medium shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode("cep")}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      locationMode === "cep"
                        ? "bg-brand-600 text-white font-medium shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Por CEP
                  </button>
                </div>
              </div>

              {locationMode === "manual" ? (
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Templo Principal, Rua das Flores, 123 - Fortaleza"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                />
              ) : (
                <div className="space-y-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 animate-fadeIn">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cepInput}
                      onChange={(e) => setCepInput(e.target.value)}
                      placeholder="Digite o CEP (ex: 60150-161)"
                      maxLength={9}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={handleSearchCep}
                      disabled={isCepLoading}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors shadow-md shadow-brand-600/20"
                    >
                      {isCepLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      Buscar
                    </button>
                  </div>

                  {cepError && (
                    <span className="text-[11px] text-red-400 block">{cepError}</span>
                  )}

                  {cepData && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between">
                        <div>
                          <strong className="text-brand-300">{cepData.logradouro}</strong> &bull; {cepData.bairro}
                          <span className="text-slate-400 block text-[10px]">{cepData.localidade} - {cepData.uf}</span>
                        </div>
                        <Check className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cepNumber}
                          onChange={(e) => handleUpdateCepNumber(e.target.value, cepComplement)}
                          placeholder="Número (ex: 1234)"
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                        />
                        <input
                          type="text"
                          value={cepComplement}
                          onChange={(e) => handleUpdateCepNumber(cepNumber, e.target.value)}
                          placeholder="Complemento / Salão"
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Local estruturado: <strong className="text-slate-200">{location}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Tema da Mensagem (Opcional)
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: A Graça que Restaura, Identidade em Cristo..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Descrição Concisa do Culto (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve descrição do propósito, liturgia e público do culto..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              URL da Imagem / Banner de Capa
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://exemplo.com/banner-culto.jpg"
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
              />
              {coverImage && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                  <img
                    src={coverImage}
                    alt="Prévia do Banner"
                    className="w-full h-full object-cover"
                    onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tags Ministeriais do Culto */}
          {availableChurchTags.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Tags Temáticas do Evento</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Membros com estas tags verão o culto no calendário
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableChurchTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(selectedTags.filter((t) => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle de Culto Geral da Igreja */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                Culto Geral da Igreja (Global)
              </span>
              <span className="text-[11px] text-slate-400">
                Torna este evento visível para todos os membros e visitantes, independente de tags.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isGlobalEvent}
                onChange={(e) => setIsGlobalEvent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-600/30 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando no Supabase...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Salvar na Agenda
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
