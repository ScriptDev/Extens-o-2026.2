"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SermonListItem } from "@/types/sermon";
import { listSermons } from "@/services/api";
import { Clock, User, ArrowRight, BookOpen, Music } from "lucide-react";

export function SermonHistory() {
  const [sermons, setSermons] = useState<SermonListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    listSermons()
      .then((data) => {
        if (isMounted) setSermons(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8 text-center text-slate-500 text-sm">
        Carregando histórico de pregações...
      </div>
    );
  }

  if (sermons.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-400" />
          Pregações Processadas Recentemente
        </h3>
        <span className="text-xs text-slate-400">{sermons.length} registro(s)</span>
      </div>

      <div className="space-y-3">
        {sermons.map((item) => {
          const dateStr = new Date(item.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          });

          return (
            <Link
              key={item.id}
              href={`/sermon/${item.id}`}
              className="group block bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-brand-500/40 rounded-xl p-4 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h4 className="font-semibold text-slate-200 group-hover:text-brand-300 text-sm sm:text-base truncate">
                    {item.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {item.preacher && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        {item.preacher}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Music className="w-3.5 h-3.5 text-slate-500" />
                      {item.audio_filename}
                    </span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-brand-500/20 text-slate-400 group-hover:text-brand-300 flex items-center justify-center flex-shrink-0 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

