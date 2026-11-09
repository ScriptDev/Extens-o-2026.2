"use client";

import React, { useState } from "react";
import {
  Lock,
  Mail,
  Sparkles,
  Loader2,
  AlertCircle,
  Zap,
  Crown,
  Shield,
  Users,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useTeensAuth } from "@/contexts/TeensAuthContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, isAuthenticated } = useTeensAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Informe seu e-mail e senha de acesso.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password.trim());
      onClose?.();
    } catch (err: any) {
      setError(err.message || "E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string = "senha123") => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setLoading(true);
    setError(null);
    try {
      await login(quickEmail, quickPass);
      onClose?.();
    } catch (err: any) {
      setError(err.message || "Erro no login automático.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow decorativo de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-brand-500/25">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Agenda <span className="text-brand-400">Teens</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acesso autenticado ao ministério de adolescentes e IA teológica.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-400" />
              E-mail de Acesso
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@agendateens.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-400" />
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando no Supabase...</span>
              </>
            ) : (
              <>
                <span>Entrar na Plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Seção de Demonstração / Acesso Rápido para Avaliação */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Acesso Rápido de Teste (1 Clique)
            </span>
            <span className="text-[10px] text-slate-500">Zero Mock</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Super Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@agendateens.com")}
              disabled={loading}
              className="p-2 bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>Super Admin</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Com Modo Ghost
              </span>
            </button>

            {/* Pastor Sênior */}
            <button
              type="button"
              onClick={() => handleQuickLogin("pastor@agendateens.com")}
              disabled={loading}
              className="p-2 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                <Crown className="w-3.5 h-3.5 text-purple-400" />
                <span>Pastor Sênior</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Pr. Paulo Roberto
              </span>
            </button>

            {/* Líder Jorge (Teatro) */}
            <button
              type="button"
              onClick={() => handleQuickLogin("jorge@agendateens.com")}
              disabled={loading}
              className="p-2 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/30 hover:border-amber-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Líder Jorge</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Ministério #Teatro
              </span>
            </button>

            {/* Teen Carlos (Teatro) */}
            <button
              type="button"
              onClick={() => handleQuickLogin("carlos@agendateens.com")}
              disabled={loading}
              className="p-2 bg-pink-950/30 hover:bg-pink-900/40 border border-pink-500/30 hover:border-pink-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span>Carlos Silva</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Teen com #Teatro
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

