import { UploadForm } from "@/components/UploadForm";
import { SermonHistory } from "@/components/SermonHistory";
import { Sparkles, ShieldCheck, Zap, BookOpen, Code2, Globe, ExternalLink, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Seção Hero */}
      <div className="text-center space-y-4 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          Inteligência Artificial Multimodal com Google Gemini
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-100 tracking-tight max-w-3xl mx-auto leading-tight">
          Transforme o áudio ou vídeo do culto em um{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-indigo-500">
            esboço teológico estruturado
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Grave a mensagem ao vivo pelo microfone ou envie áudio e vídeo (MP3, WAV, MP4, WEBM).
          Nossa pipeline extrai o tema, introdução, pontos bíblicos, frases marcantes e perguntas para células.
        </p>

        {/* Badges de Destaque Tecnológico */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Gravação ao Vivo + Upload
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <BookOpen className="w-3.5 h-3.5 text-brand-400" /> Versículos Bíblicos Exatos
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Globe className="w-3.5 h-3.5 text-emerald-400" /> Widget Embeddável Universal
          </span>
        </div>
      </div>

      {/* Formulário de Upload e Gravação */}
      <UploadForm />

      {/* Histórico Recente de Pregações */}
      <SermonHistory />

      {/* Seção de Integração em Qualquer Site */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Code2 className="w-4 h-4" />
              Embed em 1 Linha de Código
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-100">
              Integre o Agente ao Portal ou Site da sua Igreja
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Copie o código abaixo e cole no seu WordPress, Wix, Webflow ou qualquer página HTML.
            </p>
          </div>

          <a
            href="/demo-embed.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl border border-slate-700 transition-colors flex-shrink-0 self-start sm:self-auto"
          >
            <ExternalLink className="w-4 h-4 text-brand-400" />
            Ver Demonstração ao Vivo
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Código do Widget */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Código HTML do Widget:</span>
              <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Zero Dependências</span>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`<!-- Widget Agente de IA para Pregações -->
<div id="sermon-ai-widget"></div>
<script 
  src="http://localhost:3000/widget.js" 
  data-api-url="http://localhost:8000">
</script>`}
            </pre>
          </div>

          {/* Benefícios da Integração */}
          <div className="space-y-3 text-xs sm:text-sm text-slate-300 flex flex-col justify-center">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Gravação Direta do Culto:</strong> Os membros ou a equipe de mídia podem gravar o áudio no próprio navegador.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Compatível com Vídeos:</strong> Aceita links e uploads de gravações completas em MP4, MOV e WEBM.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Totalmente Responsivo:</strong> Adapta-se ao layout de celulares, tablets e computadores sem quebrar seu tema.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>CORS Pronto para Produção:</strong> Conexão segura entre o seu domínio web e a API FastAPI.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
