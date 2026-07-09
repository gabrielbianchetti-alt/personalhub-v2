"use client";

// Seção "Instalar o app" do Config (§4.4 — atrás da engrenagem): o PWA era
// instalável mas nada orientava o professor. Android usa o prompt capturado;
// iOS não tem prompt — instrução do Compartilhar. Instalado, não mostra nada.

import { useEffect, useState } from "react";
import { Share, SquarePlus } from "lucide-react";
import {
  aoMudarInstallPrompt,
  ehIOS,
  estaInstalado,
  pegaInstallPrompt,
} from "@/lib/instalar";

export function InstalarApp() {
  const [estado, setEstado] = useState<"oculto" | "ios" | "prompt">("oculto");

  useEffect(() => {
    if (estaInstalado()) return;
    const decide = () =>
      setEstado(pegaInstallPrompt() ? "prompt" : ehIOS() ? "ios" : "oculto");
    decide();
    return aoMudarInstallPrompt(decide);
  }, []);

  if (estado === "oculto") return null;

  return (
    <div className="mt-3 rounded-[14px] bg-surface p-4 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        Instalar o app
      </p>
      {estado === "prompt" ? (
        <>
          <p className="mt-1.5 text-sm text-text-muted">
            Na tela inicial, abre em tela cheia e funciona melhor no dia a dia.
          </p>
          <button
            type="button"
            onClick={async () => {
              const p = pegaInstallPrompt();
              if (!p) return;
              await p.prompt();
              const { outcome } = await p.userChoice;
              if (outcome === "accepted") setEstado("oculto");
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-medium text-accent-contrast active:opacity-90"
          >
            <SquarePlus size={18} />
            Adicionar à tela inicial
          </button>
        </>
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm leading-relaxed text-text-muted">
          <span>
            No iPhone: toque em{" "}
            <Share size={14} className="inline align-[-2px] text-text" /> Compartilhar
            e depois em <strong className="text-text">Adicionar à Tela de Início</strong>.
          </span>
        </p>
      )}
    </div>
  );
}
