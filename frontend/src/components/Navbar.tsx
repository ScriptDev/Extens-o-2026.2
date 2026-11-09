"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Mic2,
  Calendar,
  Users,
  Shield,
  Crown,
  Layers,
  Zap,
  LogIn,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";
import { EmbedModal } from "@/components/EmbedModal";
import { RegisterTeenModal } from "@/components/RegisterTeenModal";
import { MembersManagementModal } from "@/components/MembersManagementModal";
import { MinistriesManagementModal } from "@/components/MinistriesManagementModal";
import { LoginModal } from "@/components/LoginModal";
import { useTeensAuth, DEFAULT_PASTOR, DEFAULT_LEADER, DEFAULT_TEEN } from "@/contexts/TeensAuthContext";

export function Navbar() {
  const [embedOpen, setEmbedOpen] = useState(false);
  const [registerTeenOpen, setRegisterTeenOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [ministriesModalOpen, setMinistriesModalOpen] = useState(false);
  const [ghostMenuOpen, setGhostMenuOpen] = useState(false);

  const {
    currentUser,
    isAuthenticated,
    isPastor,
    isLeader,
    isAdmin,
    isGhostMode,
    originalAdmin,
    allUsers,
    startGhostMode,
    exitGhostMode,
    logout,
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
  } = useTeensAuth();

  // Helper para obter iniciais
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Se o usuário atual for ADMIN (ou se for o Admin original em Ghost Mode)
  const isActualAdmin = (currentUser.role === "ADMIN" && !isGhostMode) || Boolean(originalAdmin);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-100 text-base sm:text-lg leading-tight">
                Agenda <span className="text-brand-400">Teens</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  <Sparkles className="w-3 h-3 text-brand-400" /> PWA &bull; IA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Ministério de Adolescentes &bull; Governança Eclesiástica
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* ESTADO DE AUTENTICAÇÃO E ISOLAMENTO DE USUÁRIOS */}
            {!isAuthenticated ? (
              // 1. Visitante deslogado -> Botão de Login
              <button
                type="button"
                onClick={openLoginModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-brand-600/25 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar na Conta</span>
              </button>
            ) : (
              // 2. Usuário Autenticado
              <div className="flex items-center gap-2">
                {/* SUPER ADMIN: Menu Facilitado de Modo Ghost (Exclusivo) */}
                {isActualAdmin && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setGhostMenuOpen(!ghostMenuOpen)}
                      className="px-2.5 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Super Admin: Simular outros usuários no sistema (Modo Ghost)"
                    >
                      <span className="text-sm">👻</span>
                      <span className="hidden sm:inline">Modo Ghost</span>
                      <ChevronDown className="w-3 h-3 text-purple-400" />
                    </button>

                    {ghostMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Simular Papel (Admin Only)</span>
                          <span className="text-purple-400 font-bold">1 Clique</span>
                        </div>

                        <div className="mt-1 space-y-1">
                          {/* Pastor Sênior */}
                          <button
                            type="button"
                            onClick={() => {
                              const pastor = allUsers.find((u) => u.role === "PASTOR") || DEFAULT_PASTOR;
                              startGhostMode(pastor);
                              setGhostMenuOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-purple-950/50 text-slate-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold block text-purple-300">Pr. Paulo Roberto</span>
                              <span className="text-[10px] text-slate-400">Pastor Sênior</span>
                            </div>
                          </button>

                          {/* Líder Jorge (Teatro) */}
                          <button
                            type="button"
                            onClick={() => {
                              const jorge =
                                allUsers.find((u) => u.email === "jorge@agendateens.com" || u.role === "LEADER") ||
                                DEFAULT_LEADER;
                              startGhostMode(jorge);
                              setGhostMenuOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-amber-950/50 text-slate-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold block text-amber-300">Jorge Oliveira</span>
                              <span className="text-[10px] text-slate-400">Líder &bull; #Teatro</span>
                            </div>
                          </button>

                          {/* Teen Carlos (Teatro) */}
                          <button
                            type="button"
                            onClick={() => {
                              const carlos =
                                allUsers.find((u) => u.email === "carlos@agendateens.com" || u.role === "TEEN") ||
                                DEFAULT_TEEN;
                              startGhostMode(carlos);
                              setGhostMenuOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-pink-950/50 text-slate-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Users className="w-4 h-4 text-pink-400 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold block text-pink-300">Carlos Silva</span>
                              <span className="text-[10px] text-slate-400">Adolescente &bull; #Teatro</span>
                            </div>
                          </button>
                        </div>

                        {isGhostMode && (
                          <div className="pt-2 mt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                exitGhostMode();
                                setGhostMenuOpen(false);
                              }}
                              className="w-full py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                            >
                              Encerrar Modo Ghost
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CARD DE PERFIL ISOLADO DO USUÁRIO */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 pl-2.5 pr-1.5 py-1 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-black text-[10px] text-white shadow-sm shrink-0">
                      {getInitials(currentUser.name)}
                    </div>
                    <div className="leading-tight hidden sm:block">
                      <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5 truncate max-w-[120px]">
                        <span>{currentUser.name.split(" ")[0]}</span>
                        {currentUser.role === "ADMIN" && (
                          <span className="px-1.5 py-0.2 bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-extrabold rounded">
                            ADMIN
                          </span>
                        )}
                        {currentUser.role === "PASTOR" && (
                          <span className="px-1.5 py-0.2 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-extrabold rounded">
                            PASTOR
                          </span>
                        )}
                        {currentUser.role === "LEADER" && (
                          <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-extrabold rounded">
                            LÍDER
                          </span>
                        )}
                        {currentUser.role === "TEEN" && (
                          <span className="px-1.5 py-0.2 bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[9px] font-extrabold rounded">
                            TEEN
                          </span>
                        )}
                      </div>
                      {currentUser.tags && currentUser.tags.length > 0 && (
                        <span className="text-[10px] text-pink-400 font-semibold block truncate">
                          {currentUser.tags.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão de Logout / Sair da Conta */}
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors ml-1 cursor-pointer"
                    title="Sair da conta (Logout)"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Ação Pastoral: Gestão de Ministérios & Brasões Kanji */}
            {(isPastor || isAdmin) && (
              <button
                type="button"
                onClick={() => setMinistriesModalOpen(true)}
                className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                title="Gerenciar ministérios oficiais e brasões em ideogramas japoneses (Kanji)"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ministérios</span>
              </button>
            )}

            {/* Ação de Governança: Gestão de Membros (Pastor e Líder) */}
            {isLeader && (
              <button
                type="button"
                onClick={() => setMembersModalOpen(true)}
                className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                title="Gerenciar e cadastrar membros hierarquicamente"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Membros</span>
              </button>
            )}

            {/* Link para Agenda */}
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Agenda</span>
            </Link>

            {/* Botão Gravação / Pregações */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-xl transition-colors shadow-md shadow-brand-600/20"
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">IA do Culto</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Modal de Login Autêntico */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />

      {/* Modal de Gestão de Ministérios Oficiais e Brasões em Kanji */}
      <MinistriesManagementModal
        isOpen={ministriesModalOpen}
        onClose={() => setMinistriesModalOpen(false)}
      />

      {/* Modal de Gestão Hierárquica de Membros */}
      <MembersManagementModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
      />

      {/* Modal de Cadastro Rápido de Adolescente */}
      <RegisterTeenModal
        isOpen={registerTeenOpen}
        onClose={() => setRegisterTeenOpen(false)}
      />

      {/* Modal de Integração */}
      <EmbedModal isOpen={embedOpen} onClose={() => setEmbedOpen(false)} />
    </>
  );
}
