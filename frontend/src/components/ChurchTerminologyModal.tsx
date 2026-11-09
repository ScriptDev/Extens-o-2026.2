"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  X,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  Send,
  Layers,
  Crown,
} from "lucide-react";
import { useTeensAuth } from "@/contexts/TeensAuthContext";
import {
  getChurchTerminology,
  updateChurchTerminology,
  suggestTag,
  approveTagSuggestion,
} from "@/services/api";
import { ChurchSettings } from "@/types/sermon";

interface ChurchTerminologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTerminologyUpdated?: () => void;
}

export function ChurchTerminologyModal({
  isOpen,
  onClose,
  onTerminologyUpdated,
}: ChurchTerminologyModalProps) {
  const { isPastor, isAdmin, token, currentUser } = useTeensAuth();

  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states (Pastor/Admin)
  const [churchName, setChurchName] = useState("Comunidade Teens");
  const [groupSingular, setGroupSingular] = useState("Ministério");
  const [groupPlural, setGroupPlural] = useState("Ministérios");
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Leader Suggestion Form
  const [suggestTagInput, setSuggestTagInput] = useState("");
  const [suggestJustification, setSuggestJustification] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getChurchTerminology();
      setSettings(data);
      setChurchName(data.church_name || "Comunidade Teens");
      setGroupSingular(data.group_singular || "Ministério");
      setGroupPlural(data.group_plural || "Ministérios");
      setTags(data.available_tags || []);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar configurações de terminologia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setSuccess(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSaveTerminology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPastor && !isAdmin) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateChurchTerminology(
        {
          church_name: churchName,
          group_singular: groupSingular,
          group_plural: groupPlural,
          available_tags: tags,
        },
        token
      );
      setSettings(updated);
      setSuccess("Terminologia e tags atualizadas com sucesso no banco Supabase!");
      onTerminologyUpdated?.();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar terminologia.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    let clean = newTagInput.trim();
    if (!clean) return;
    if (!clean.startsWith("#")) clean = `#${clean}`;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSuggestTag = async (e: React.FormEvent) => {
    e.preventDefault();
    let clean = suggestTagInput.trim();
    if (!clean) return;
    if (!clean.startsWith("#")) clean = `#${clean}`;

    setSuggesting(true);
    setError(null);
    setSuccess(null);
    try {
      await suggestTag(clean, suggestJustification, token);
      setSuccess(`Sugestão da tag ${clean} enviada ao colegiado pastoral!`);
      setSuggestTagInput("");
      setSuggestJustification("");
      fetchSettings();
    } catch (e: any) {
      setError(e.message || "Erro ao sugerir tag.");
    } finally {
      setSuggesting(false);
    }
  };

  const handleApproveTag = async (suggestionId: string) => {
    try {
      await approveTagSuggestion(suggestionId, token);
      setSuccess("Tag aprovada e adicionada às tags oficiais!");
      fetchSettings();
      onTerminologyUpdated?.();
    } catch (e: any) {
      setError(e.message || "Erro ao aprovar sugestão de tag.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Terminologia e Tags da Igreja
              {(isPastor || isAdmin) && (
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Gestão Pastoral
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Personalize como os grupos e ministérios são chamados no contexto eclesiástico da sua congregação.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Carregando configurações da igreja no Supabase...
          </div>
        ) : (
          <div className="space-y-6">
            {/* PASTOR/ADMIN FORM: CUSTOMIZAR NOMES */}
            {isPastor || isAdmin ? (
              <form onSubmit={handleSaveTerminology} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Termo no Singular (Ex: Ministério, Tribo, Rede, Célula)
                    </label>
                    <input
                      type="text"
                      value={groupSingular}
                      onChange={(e) => setGroupSingular(e.target.value)}
                      placeholder="Ex: Ministério"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Termo no Plural (Ex: Ministérios, Tribos, Redes, Grupos)
                    </label>
                    <input
                      type="text"
                      value={groupPlural}
                      onChange={(e) => setGroupPlural(e.target.value)}
                      placeholder="Ex: Ministérios"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Comunidade / Igreja Local
                  </label>
                  <input
                    type="text"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="Ex: Comunidade Teens Sede"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* GERENCIAMENTO DE TAGS */}
                <div className="border-t border-slate-800 pt-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Tags Oficiais da Igreja ({tags.length})</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Membros com essas tags visualizam os eventos correspondentes
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-red-400 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Adicionar tag (ex: #Teatro, #Dança)..."
                      className="flex-1 px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                </div>

                {/* TAGS SUGERIDAS POR LÍDERES PENDENTES DE APROVAÇÃO */}
                {settings?.tag_suggestions && settings.tag_suggestions.length > 0 && (
                  <div className="border-t border-slate-800 pt-4 bg-slate-950/40 p-3 rounded-xl border border-dashed border-amber-500/30">
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Sugestões de Tags Enviadas por Líderes ({settings.tag_suggestions.length})
                    </h3>
                    <div className="space-y-2">
                      {settings.tag_suggestions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-bold text-purple-300">{s.tag}</span>
                            <span className="text-slate-400 ml-2">
                              Sugerida por: {s.suggested_by_name} ({s.justification})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApproveTag(s.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Aprovar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-900/30 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Salvando..." : "Salvar Configurações no Banco"}
                  </button>
                </div>
              </form>
            ) : (
              /* LÍDER / MEMBRO VIEW: VISUALIZAR E SUGERIR TAGS */
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-1">
                    Terminologia Oficial: {settings?.group_singular} / {settings?.group_plural}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    A congregação utiliza os termos definidos pelo colegiado pastoral. Veja as tags ativas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings?.available_tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg font-semibold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSuggestTag} className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                  <h4 className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-purple-400" />
                    Sugerir Nova Tag para o seu {settings?.group_singular || "Ministério"}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Como líder, você pode propor ao pastor uma nova tag temática para organizar encontros e ensaios.
                  </p>

                  <div>
                    <input
                      type="text"
                      value={suggestTagInput}
                      onChange={(e) => setSuggestTagInput(e.target.value)}
                      placeholder="Ex: #TeatroKids, #MídiaCriativa..."
                      className="w-full px-3 py-2 bg-slate-950/60 border border-purple-500/30 rounded-xl text-white text-sm focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={suggestJustification}
                      onChange={(e) => setSuggestJustification(e.target.value)}
                      placeholder="Justificativa para o pastor (ex: Grupo de ensaio semanal)..."
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={suggesting}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {suggesting ? "Enviando..." : "Encaminhar Sugestão ao Pastor"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

