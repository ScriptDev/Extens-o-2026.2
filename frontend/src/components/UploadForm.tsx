"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Music,
  Video,
  User,
  Type,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileAudio,
  X,
  Sparkles,
  Mic,
} from "lucide-react";
import { uploadSermonAudio, ApiClientError } from "@/services/api";
import { AudioRecorder } from "@/components/AudioRecorder";
import { SermonOutline } from "@/types/sermon";

const ALLOWED_EXTENSIONS = [
  ".mp3",
  ".ogg",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
];
const MAX_FILE_SIZE_MB = 150;

interface UploadFormProps {
  initialEventId?: string;
  onUploadSuccess?: (sermon: SermonOutline) => void;
}

export function UploadForm({ initialEventId, onUploadSuccess }: UploadFormProps = {}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preacher, setPreacher] = useState("");
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadingSteps = [
    "Enviando mídia com segurança para o servidor...",
    "Carregando áudio/vídeo na inteligência multimodal do Gemini...",
    "Analisando mensagem, teologia bíblica e extraindo versículos...",
    "Sintetizando aplicações práticas, frases e perguntas para células...",
    "Persistindo todos os insights no Supabase...",
  ];

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      setError(
        `Formato não suportado (${selectedFile.name}). Envie áudio (MP3, WAV, OGG, M4A) ou vídeo (MP4, WEBM, MOV).`
      );
      return false;
    }

    const sizeMb = selectedFile.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      setError(
        `O arquivo excede o limite máximo permitido (${sizeMb.toFixed(1)}MB > ${MAX_FILE_SIZE_MB}MB).`
      );
      return false;
    }

    if (selectedFile.size === 0) {
      setError("O arquivo selecionado está vazio (0 bytes).");
      return false;
    }

    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (validateFile(selected)) {
        setFile(selected);
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleRecordingComplete = (recordedFile: File) => {
    setFile(recordedFile);
    setError(null);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isVideo = file?.name.toLowerCase().match(/\.(mp4|mov|webm|mkv)$/);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Selecione ou grave uma pregação antes de continuar.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 4500);

    try {
      const result = await uploadSermonAudio(file, preacher, title, initialEventId);
      clearInterval(interval);
      if (onUploadSuccess) {
        onUploadSuccess(result);
      } else {
        router.push(`/sermon/${result.id}`);
      }
    } catch (err: unknown) {
      clearInterval(interval);
      setIsLoading(false);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocorreu um erro inesperado ao processar a pregação.");
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
          <FileAudio className="w-6 h-6 text-brand-400" />
          Gerar Esboço e Insights da Pregação
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Envie áudio ou vídeo do culto, ou grave ao vivo pelo microfone. A IA multimodal do Google
          Gemini estrutura os pontos, versículos e aplicações.
        </p>

        {/* Abas de Modo: Upload vs Gravar */}
        <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${mode === "upload"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Enviar Áudio ou Vídeo
          </button>

          <button
            type="button"
            onClick={() => setMode("record")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${mode === "record"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Gravar ao Vivo
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Aviso de Validação / Processamento</p>
            <p className="text-red-200/90 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* MODO 1: UPLOAD DE ARQUIVO */}
        {mode === "upload" && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Arquivo da Mensagem (Áudio ou Vídeo com Áudio) <span className="text-brand-400">*</span>
            </label>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                    ? "border-brand-400 bg-brand-500/10"
                    : "border-slate-700 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-950/80"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.mp4,.mov,.webm,.mkv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Clique para selecionar ou arraste o áudio/vídeo aqui
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Suporta MP3, WAV, OGG, M4A, MP4, MOV, WEBM (até {MAX_FILE_SIZE_MB}MB)
                </p>
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 flex-shrink-0">
                    {isVideo ? <Video className="w-5 h-5" /> : <Music className="w-5 h-5" />}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-100 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {isVideo ? "Vídeo com Áudio" : "Arquivo de Áudio"}
                    </p>
                  </div>
                </div>
                {!isLoading && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remover arquivo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODO 2: GRAVAR AO VIVO */}
        {mode === "record" && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Gravador de Áudio ao Vivo no Navegador <span className="text-brand-400">*</span>
            </label>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={isLoading} />
          </div>
        )}

        {/* Campo do Pregador */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Pregador / Pastor (Opcional)
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={preacher}
              onChange={(e) => setPreacher(e.target.value)}
              placeholder="Ex: Pastor Luciano Subirá, Pr. Hernandes Dias Lopes..."
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Campo do Título */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Título Personalizado (Opcional)
          </label>
          <div className="relative">
            <Type className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deixe em branco para o Gemini sugerir o tema automaticamente"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Estado de Carregamento Ativo */}
        {isLoading && (
          <div className="p-4 rounded-xl bg-brand-950/30 border border-brand-800/40 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-3 text-brand-300">
              <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
              <span className="text-sm font-semibold">Processamento Multimodal em Curso</span>
            </div>
            <p className="text-xs text-slate-300 pl-8">{loadingSteps[loadingStep]}</p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Botão de Submissão */}
        <button
          type="submit"
          disabled={!file || isLoading}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-brand-600 disabled:hover:to-indigo-600 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analisando Pregação com Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-brand-200" />
              <span>Gerar Esboço e Insights Teológicos</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
