"use client";

import React, { useState } from "react";
import { X, Copy, Check, MessageCircle, ExternalLink, Sparkles } from "lucide-react";

interface WhatsAppInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  inviteText: string;
}

export function WhatsAppInviteModal({
  isOpen,
  onClose,
  eventTitle,
  inviteText,
}: WhatsAppInviteModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-8 relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Convite Gerado com IA (Gemini)
          </div>
          <h3 className="text-xl font-bold text-slate-100">{eventTitle}</h3>
          <p className="text-xs text-slate-400">
            Mensagem formatada com emojis para disparo aos líderes, membros ou grupos de WhatsApp.
          </p>
        </div>

        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-sans text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {inviteText}
          </pre>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Texto Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar Mensagem</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Abrir no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

