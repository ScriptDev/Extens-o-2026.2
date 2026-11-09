"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Pause, Play, Trash2, CheckCircle2, Volume2, AlertCircle } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, disabled = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Formata os segundos em MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setPermissionError(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Cria o objeto File a partir do Blob gravado
        const recordedFile = new File([audioBlob], `pregacao_ao_vivo_${Date.now()}.webm`, {
          type: "audio/webm",
        });

        onRecordingComplete(recordedFile);

        // Encerra as tracks do microfone para liberar o hardware
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Captura em fatias de 250ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      setPermissionError(
        "Permissão de microfone negada ou microfone indisponível. Por favor, autorize o microfone no navegador."
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 text-center space-y-5">
      {permissionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Visualizador de Gravação Ativa */}
      {isRecording ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-1.5 h-12">
            {[40, 70, 95, 60, 85, 50, 100, 75, 45, 90, 65, 30].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  isPaused ? "bg-slate-600 h-2" : "bg-red-500 animate-pulse"
                }`}
                style={{ height: isPaused ? "8px" : `${h}%` }}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-red-400 font-mono text-2xl font-bold tracking-wider">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping inline-block" />
            {formatTime(recordingTime)}
          </div>
          <p className="text-xs text-slate-400">
            {isPaused ? "Gravação pausada" : "Capturando pregação ao vivo pelo microfone..."}
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={pauseRecording}
              className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title={isPaused ? "Retomar" : "Pausar"}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-red-500/30 transition-transform active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
              Finalizar e Estruturar
            </button>
          </div>
        </div>
      ) : audioUrl ? (
        /* Preview de Áudio Gravado */
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Gravação Concluída ({formatTime(recordingTime)})
          </div>

          <div className="pt-2">
            <audio controls src={audioUrl} className="w-full h-10 rounded-lg" />
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={discardRecording}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Descartar e Gravar Novamente
            </button>
          </div>
        </div>
      ) : (
        /* Botão Inicial de Iniciar Gravação */
        <div className="py-4 space-y-3">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 transition-all group"
          >
            <Mic className="w-7 h-7 group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-200">Clique para Gravar ao Vivo</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Ideal para cultos presenciais, ministrações ou leitura de passagens
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

