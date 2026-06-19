"use client";

// Nudge pós-signup (§ onboarding do professor): a spec detalhou o onboarding
// dos ALUNOS, mas o professor caía num app sem nome/Pix — e a 1ª cobrança (a
// vitrine) saía incompleta. Banner dispensável no topo do Hoje, sem virar 4ª
// tela: aponta pro Config, onde nome e Pix já moram.

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function OnboardingBanner({
  precisaNome,
  precisaPix,
}: {
  precisaNome: boolean;
  precisaPix: boolean;
}) {
  const [mostra, setMostra] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("onboarding-dispensado") === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nudge 1x no cliente
    setMostra(true);
  }, []);

  if (!mostra || (!precisaNome && !precisaPix)) return null;

  const falta = [precisaNome && "seu nome", precisaPix && "sua chave Pix"]
    .filter(Boolean)
    .join(" e ");

  return (
    <div className="mx-5 mb-4 flex items-start gap-3 rounded-[14px] border border-accent-soft bg-accent-soft/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">Falta {falta}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Pra primeira cobrança sair completa.
        </p>
        <Link
          href="/config"
          className="mt-2 inline-block text-sm font-semibold text-accent active:opacity-70"
        >
          Configurar →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dispensar"
        onClick={() => {
          localStorage.setItem("onboarding-dispensado", "1");
          setMostra(false);
        }}
        className="-m-2 shrink-0 p-2 text-text-muted active:text-text"
      >
        <X size={16} />
      </button>
    </div>
  );
}
