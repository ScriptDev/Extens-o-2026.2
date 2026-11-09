import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { TeensAuthProvider } from "@/contexts/TeensAuthContext";

export const metadata: Metadata = {
  title: "Agenda Teens & Pregações AI | Ministério de Adolescentes",
  description:
    "Plataforma digital para gerenciamento de eventos, agenda, confirmação de presença (RSVP), notificações e inteligência teológica do ministério de adolescentes.",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white">
        <TeensAuthProvider>
          <Navbar />
          <main className="flex-1 py-8 px-4 sm:px-6">{children}</main>
        </TeensAuthProvider>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <p>
            Agenda Teens &bull; Ministério de Adolescentes &bull; Arquitetura Limpa &bull; Supabase PostgreSQL &bull; Google Gemini
          </p>
          <p className="mt-1 text-slate-600">
            Desenvolvido por Software Factory Labs &bull; Samuel Mendes Cardoso
          </p>
        </footer>

        {/* Registro do Service Worker PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('PWA ServiceWorker registrado com sucesso:', reg.scope); },
                    function(err) { console.log('Falha no ServiceWorker:', err); }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

