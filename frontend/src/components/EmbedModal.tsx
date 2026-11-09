"use client";

import React, { useState } from "react";
import { Code2, X, Copy, Check, ExternalLink, Globe, LayoutTemplate } from "lucide-react";

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmbedModal({ isOpen, onClose }: EmbedModalProps) {
  const [platform, setPlatform] = useState<"script" | "iframe" | "wordpress">("script");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = `<!-- Widget Agente de IA para Pregações -->\n<div id="sermon-ai-widget"></div>\n<script src="http://localhost:3000/widget.js" data-api-url="http://localhost:8000"></script>`;

  const iframeCode = `<!-- iFrame Responsivo para Pregações -->\n<iframe \n  src="http://localhost:3000" \n  width="100%" \n  height="750px" \n  frameborder="0" \n  allow="microphone" \n  style="border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">\n</iframe>`;

  const wordpressCode = `<!-- No WordPress: Adicione um bloco "HTML Personalizado" e cole: -->\n<div id="sermon-ai-widget"></div>\n<script src="http://localhost:3000/widget.js" data-api-url="http://localhost:8000"></script>`;

  const getActiveCode = () => {
    if (platform === "script") return scriptCode;
    if (platform === "iframe") return iframeCode;
    return wordpressCode;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getActiveCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-6 p-6 sm:p-8 relative">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            Integração Universal
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-100">
            Adicione o Agente de IA ao Site da sua Igreja
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Cole este componente em qualquer página do WordPress, Wix, Webflow ou portal existente.
          </p>
        </div>

        {/* Abas de Plataforma */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPlatform("script")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              platform === "script"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Script Widget
          </button>

          <button
            type="button"
            onClick={() => setPlatform("wordpress")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              platform === "wordpress"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            WordPress / Wix
          </button>

          <button
            type="button"
            onClick={() => setPlatform("iframe")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              platform === "iframe"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            iFrame Direto
          </button>
        </div>

        {/* Caixa de Código */}
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
            {getActiveCode()}
          </pre>

          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors shadow-lg"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>

        {/* Rodapé com Link para Demo */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 flex-wrap gap-3">
          <a
            href="/demo-embed.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir página de teste em tela cheia (/demo-embed.html)
          </a>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

