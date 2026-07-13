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

  // Linha do card "Conta" do Config (pauta 2) — não é mais card próprio, e o
  // botão rebaixou de bg-accent sólido p/ accent-soft: "Salvar" é o único fill
  // de accent da tela (§6.5).
  return (
    <div className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      {estado === "prompt" ? (
        <>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Instalar o app
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              Na tela inicial, abre em tela cheia.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const p = pegaInstallPrompt();
              if (!p) return;
              await p.prompt();
              const { outcome } = await p.userChoice;
              if (outcome === "accepted") setEstado("oculto");
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent active:opacity-90"
          >
            <SquarePlus size={16} />
            Instalar
          </button>
        </>
      ) : (
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Instalar o app
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm leading-relaxed text-text-muted">
            <span>
              No iPhone: toque em{" "}
              <Share size={14} className="inline align-[-2px] text-text" /> Compartilhar
              e depois em <strong className="text-text">Adicionar à Tela de Início</strong>.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
