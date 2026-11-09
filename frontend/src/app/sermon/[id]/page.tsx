"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SermonCard } from "@/components/SermonCard";
import { getSermonById, ApiClientError } from "@/services/api";
import { SermonOutline } from "@/types/sermon";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

export default function SermonResultPage() {
  const params = useParams();
  const id = params?.id as string;

  const [sermon, setSermon] = useState<SermonOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getSermonById(id)
      .then((data) => {
        if (isMounted) setSermon(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Não foi possível carregar o esboço solicitado.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-slate-300 font-medium text-sm">Carregando esboço bíblico estruturado...</p>
      </div>
    );
  }

  if (error || !sermon) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Esboço não localizado</h2>
        <p className="text-sm text-slate-400">
          {error || "O esboço procurado não foi encontrado ou foi removido do banco de dados."}
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-brand-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return <SermonCard sermon={sermon} />;
}

