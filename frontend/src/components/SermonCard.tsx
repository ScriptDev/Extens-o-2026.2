"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  User,
  Music,
  Video,
  Copy,
  Check,
  ArrowLeft,
  Printer,
  Download,
  Scroll,
  Quote,
  Flame,
  Lightbulb,
  MessageSquareQuote,
  Users2,
  Maximize2,
  Minimize2,
  Presentation,
  Sun,
  Moon,
} from "lucide-react";
import { SermonOutline } from "@/types/sermon";

interface SermonCardProps {
  sermon: SermonOutline;
}

export function SermonCard({ sermon }: SermonCardProps) {
  const [copied, setCopied] = useState(false);
  const [copiedQuoteIdx, setCopiedQuoteIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"outline" | "insights" | "discipleship">("outline");

  // Modo Púlpito (Apresentação sem distrações para pastores)
  const [pulpitMode, setPulpitMode] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");

  const formattedDate = new Date(sermon.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isVideo = sermon.media_type === "video" || sermon.audio_filename.match(/\.(mp4|mov|webm|mkv)$/i);

  // Evita que a tela do tablet/celular apague durante a ministração no púlpito (Screen Wake Lock API)
  useEffect(() => {
    let wakeLock: any = null;
    if (pulpitMode && "wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          wakeLock = lock;
        })
        .catch(() => {});
    }
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [pulpitMode]);

  const generateMarkdown = () => {
    let md = `# ${sermon.title}\n`;
    if (sermon.preacher) md += `**Pregador:** ${sermon.preacher}\n`;
    md += `**Data:** ${formattedDate}\n\n`;
    md += `## 🎯 Tema Central\n${sermon.structured_content.tema}\n\n`;
    md += `## 📖 Introdução\n${sermon.structured_content.introducao}\n\n`;
    md += `## ✝️ Pontos Principais\n\n`;

    sermon.structured_content.pontos_principais.forEach((ponto, idx) => {
      md += `### ${idx + 1}. ${ponto.titulo}\n`;
      md += `${ponto.explicacao}\n\n`;
      md += `> 📜 **Referência Bíblica:** ${ponto.referencia_biblica}\n\n`;
      if (ponto.aplicacao_pratica) {
        md += `💡 **Aplicação Prática:** ${ponto.aplicacao_pratica}\n\n`;
      }
    });

    md += `## 🕊️ Conclusão\n${sermon.structured_content.conclusao}\n\n`;

    if (sermon.structured_content.frases_de_impacto?.length) {
      md += `## 💬 Frases de Impacto\n`;
      sermon.structured_content.frases_de_impacto.forEach((f) => {
        md += `- "${f}"\n`;
      });
      md += `\n`;
    }

    if (sermon.structured_content.perguntas_discipulado?.length) {
      md += `## 👥 Perguntas para Pequenos Grupos e Células\n`;
      sermon.structured_content.perguntas_discipulado.forEach((p, idx) => {
        md += `${idx + 1}. ${p}\n`;
      });
    }

    return md;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyQuote = async (quote: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(`"${quote}" - ${sermon.preacher || sermon.title}`);
      setCopiedQuoteIdx(idx);
      setTimeout(() => setCopiedQuoteIdx(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const mdContent = generateMarkdown();
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanTitle = (sermon.title || "esboco_pregacao").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.href = url;
    link.download = `${cleanTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação compatível com Holyrics / ProPresenter (Slides de Projeção)
  const handleExportSlides = () => {
    let slidesText = `[TEMA]\n${sermon.title}\n${sermon.preacher ? "Pr. " + sermon.preacher : ""}\n\n---\n\n`;

    sermon.structured_content.pontos_principais.forEach((p, idx) => {
      slidesText += `[PONTO ${idx + 1}]\n${p.titulo}\n\n---\n\n`;
      slidesText += `[VERSÍCULO ${idx + 1}]\n${p.referencia_biblica}\n\n---\n\n`;
    });

    if (sermon.structured_content.frases_de_impacto?.length) {
      sermon.structured_content.frases_de_impacto.forEach((f) => {
        slidesText += `[DESTAQUE]\n"${f}"\n\n---\n\n`;
      });
    }

    const blob = new Blob([slidesText], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `slides_${(sermon.title || "culto").toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fontSizeClass =
    fontSize === "xlarge" ? "text-xl leading-relaxed" : fontSize === "large" ? "text-lg leading-relaxed" : "text-base leading-normal";

  return (
    <article
      className={`w-full max-w-4xl mx-auto space-y-6 animate-fadeIn ${
        pulpitMode ? "fixed inset-0 z-50 overflow-y-auto bg-slate-950 p-6 sm:p-12 max-w-none" : ""
      }`}
    >
      {/* Barra de Navegação e Ações Rápidas */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        {!pulpitMode ? (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-brand-400" />
            Voltar para Início
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              📖 Modo Púlpito Ativo (Tela Sempre Ligada)
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Tamanho de Fonte no Modo Púlpito */}
          {pulpitMode && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setFontSize("normal")}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold ${fontSize === "normal" ? "bg-brand-600 text-white" : "text-slate-400"}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize("large")}
                className={`px-2.5 py-1 text-sm rounded-lg font-semibold ${fontSize === "large" ? "bg-brand-600 text-white" : "text-slate-400"}`}
              >
                A+
              </button>
              <button
                onClick={() => setFontSize("xlarge")}
                className={`px-2.5 py-1 text-base rounded-lg font-semibold ${fontSize === "xlarge" ? "bg-brand-600 text-white" : "text-slate-400"}`}
              >
                A++
              </button>
            </div>
          )}

          {/* Botão Modo Púlpito */}
          <button
            onClick={() => setPulpitMode(!pulpitMode)}
            className={`inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl transition-colors border ${
              pulpitMode
                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
            }`}
            title="Ativar modo de leitura de tela cheia para ministração no púlpito"
          >
            {pulpitMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
            <span>{pulpitMode ? "Sair do Púlpito" : "Modo Púlpito"}</span>
          </button>

          {/* Botão Exportar Slides */}
          {!pulpitMode && (
            <button
              onClick={handleExportSlides}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-colors border border-slate-800"
              title="Baixar arquivo formatado para Holyrics / ProPresenter"
            >
              <Presentation className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Slides (Holyrics)</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-colors border border-slate-800"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Copiar</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-colors border border-slate-800"
            title="Baixar arquivo .md"
          >
            <Download className="w-4 h-4 text-brand-400" />
            <span className="hidden sm:inline">Baixar (.md)</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-colors border border-slate-800"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Cartão Principal do Esboço */}
      <div
        className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/50 space-y-8 print:bg-white print:border-none print:shadow-none print:p-0 ${
          pulpitMode ? "border-amber-500/20 max-w-4xl mx-auto" : ""
        }`}
      >
        {/* Cabeçalho do Esboço */}
        <header className="border-b border-slate-800/80 pb-6 space-y-4 print:border-b-2 print:border-slate-300">
          <div className="flex flex-wrap items-center gap-2.5">
            {sermon.preacher && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                {sermon.preacher}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedDate}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-800 truncate max-w-xs">
              {isVideo ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <Music className="w-3.5 h-3.5 text-slate-500" />}
              {sermon.audio_filename}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight print:text-black">
            {sermon.title}
          </h1>

          {/* Abas de Navegação de Conteúdo */}
          {!pulpitMode && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 print:hidden flex-wrap">
              <button
                onClick={() => setActiveTab("outline")}
                className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "outline"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                    : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Scroll className="w-3.5 h-3.5" />
                Esboço Homilético
              </button>

              {sermon.structured_content.frases_de_impacto?.length ? (
                <button
                  onClick={() => setActiveTab("insights")}
                  className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "insights"
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                      : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  Frases de Impacto ({sermon.structured_content.frases_de_impacto.length})
                </button>
              ) : null}

              {sermon.structured_content.perguntas_discipulado?.length ? (
                <button
                  onClick={() => setActiveTab("discipleship")}
                  className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "discipleship"
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                      : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Users2 className="w-3.5 h-3.5" />
                  Discipulado / Células ({sermon.structured_content.perguntas_discipulado.length})
                </button>
              ) : null}
            </div>
          )}
        </header>

        {/* ================================================================= */}
        {/* ABA 1: ESBOÇO HOMILÉTICO (TEMA, INTRO, PONTOS, CONCLUSÃO) */}
        {/* ================================================================= */}
        {(activeTab === "outline" || pulpitMode) && (
          <div className="space-y-8 animate-fadeIn">
            {/* 1. SEÇÃO DO TEMA */}
            <section className="bg-gradient-to-r from-brand-950/40 via-indigo-950/20 to-slate-900 border border-brand-500/30 rounded-2xl p-5 sm:p-6 print:border-brand-600 print:bg-slate-50">
              <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Flame className="w-4 h-4 text-brand-400" />
                Tema Central da Mensagem
              </div>
              <p className={`font-semibold text-brand-100 leading-snug print:text-slate-900 ${pulpitMode ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"}`}>
                {sermon.structured_content.tema}
              </p>
            </section>

            {/* 2. SEÇÃO DA INTRODUÇÃO */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-slate-400" />
                Introdução e Contextualização
              </div>
              <div
                className={`text-slate-200 bg-slate-950/50 border border-slate-800/60 rounded-2xl p-5 sm:p-6 print:bg-transparent print:border-none print:p-0 print:text-slate-800 ${fontSizeClass}`}
              >
                {sermon.structured_content.introducao}
              </div>
            </section>

            {/* 3. PONTOS PRINCIPAIS & REFERÊNCIAS BÍBLICAS */}
            <section className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-sm uppercase tracking-wider">
                  <Scroll className="w-4 h-4 text-brand-400" />
                  Pontos Centrais da Pregação
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {sermon.structured_content.pontos_principais.length} Pontos
                </span>
              </div>

              <div className="space-y-6">
                {sermon.structured_content.pontos_principais.map((ponto, index) => (
                  <div
                    key={index}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-7 space-y-4 hover:border-slate-700 transition-colors print:border-slate-300 print:bg-slate-50"
                  >
                    {/* Título do Ponto */}
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center font-bold text-brand-300 text-sm">
                        {index + 1}
                      </span>
                      <h3 className={`font-bold text-slate-100 pt-0.5 print:text-black ${pulpitMode ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"}`}>
                        {ponto.titulo}
                      </h3>
                    </div>

                    {/* Explicação Teológica */}
                    <p className={`text-slate-300 pl-11 print:text-slate-800 ${fontSizeClass}`}>
                      {ponto.explicacao}
                    </p>

                    {/* Referência Bíblica Destacada */}
                    <div className="ml-11 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl p-4 sm:p-5 space-y-1.5 print:bg-amber-50 print:border-amber-600">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider print:text-amber-800">
                        <Quote className="w-3.5 h-3.5 text-amber-400" />
                        Texto Bíblico Citado no Culto
                      </div>
                      <blockquote className="text-sm sm:text-base font-medium text-amber-100 italic leading-relaxed print:text-slate-900">
                        "{ponto.referencia_biblica}"
                      </blockquote>
                    </div>

                    {/* Aplicação Prática (quando presente) */}
                    {ponto.aplicacao_pratica && (
                      <div className="ml-11 bg-brand-500/10 border-l-4 border-brand-500 rounded-r-xl p-4 space-y-1">
                        <div className="flex items-center gap-2 text-brand-300 font-bold text-xs uppercase tracking-wider">
                          <Lightbulb className="w-3.5 h-3.5 text-brand-400" />
                          Aplicação Prática no Dia a Dia
                        </div>
                        <p className={`text-slate-200 ${fontSizeClass}`}>
                          {ponto.aplicacao_pratica}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 4. SEÇÃO DA CONCLUSÃO */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <Scroll className="w-4 h-4 text-emerald-400" />
                Conclusão e Apelo Pastoral
              </div>
              <div
                className={`text-slate-200 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-5 sm:p-6 print:bg-transparent print:border-none print:p-0 print:text-slate-800 ${fontSizeClass}`}
              >
                {sermon.structured_content.conclusao}
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* ABA 2: FRASES DE IMPACTO (CITAÇÕES PARA REDES SOCIAIS / SLIDES) */}
        {/* ================================================================= */}
        {activeTab === "insights" && !pulpitMode && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-brand-400" />
                Frases de Destaque da Mensagem
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Citações impactantes identificadas na pregação, formatadas para slides de culto ou postagens em redes sociais.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {sermon.structured_content.frases_de_impacto?.map((quote, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                >
                  <p className="text-slate-200 text-sm italic font-medium leading-relaxed">
                    "{quote}"
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                    <span className="text-xs text-slate-500">
                      {sermon.preacher ? `Pr. ${sermon.preacher}` : "Mensagem"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyQuote(quote, idx)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1 p-1"
                    >
                      {copiedQuoteIdx === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ABA 3: PERGUNTAS PARA CÉLULAS E DISCIPULADO */}
        {/* ================================================================= */}
        {activeTab === "discipleship" && !pulpitMode && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-400" />
                Roteiro de Compartilhamento para Células e Pequenos Grupos
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Perguntas reflexivas baseadas na mensagem para líderes de células conduzirem discussões enriquecedoras.
              </p>
            </div>

            <div className="space-y-3">
              {sermon.structured_content.perguntas_discipulado?.map((question, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {question}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
