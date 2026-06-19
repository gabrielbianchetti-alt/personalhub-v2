"use client";

// Arrastar pro lado troca de aba (Hoje ↔ Alunos ↔ Cobrança) — fluidez.
// Swipe-to-navigate: o gesto dispara a navegação e a página entra deslizando
// (a animação .pagina-entra-dir roda na nova tela). Guards: ignora scroll
// vertical, sheets abertos, inputs e gestos curtos.

import { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const ABAS = ["/", "/alunos", "/cobranca"];

function indiceAba(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/alunos")) return 1;
  if (pathname.startsWith("/cobranca")) return 2;
  return -1;
}

const LIMIAR = 60; // px horizontais mínimos pra contar como swipe de aba

export function SwipeAbas({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const ativo = useRef(false);

  const idx = indiceAba(pathname);

  const onStart = (e: React.PointerEvent) => {
    // só toque/caneta (mouse não), e não em cima de campos/sliders/sheets
    if (e.pointerType === "mouse") return;
    const alvo = e.target as HTMLElement;
    if (alvo.closest("input, textarea, select, [role=dialog], [data-no-swipe]")) {
      ativo.current = false;
      return;
    }
    inicio.current = { x: e.clientX, y: e.clientY };
    ativo.current = true;
  };

  const onEnd = (e: React.PointerEvent) => {
    if (!ativo.current || !inicio.current || idx === -1) return;
    ativo.current = false;
    const dx = e.clientX - inicio.current.x;
    const dy = e.clientY - inicio.current.y;
    inicio.current = null;
    // horizontal dominante e acima do limiar (evita disparar no scroll vertical)
    if (Math.abs(dx) < LIMIAR || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const destino = dx < 0 ? idx + 1 : idx - 1; // arrastar p/ esquerda = próxima
    if (destino < 0 || destino >= ABAS.length) return;
    router.push(ABAS[destino], { scroll: false });
  };

  return (
    <div
      onPointerDown={onStart}
      onPointerUp={onEnd}
      onPointerCancel={() => (ativo.current = false)}
      className="flex flex-1 flex-col"
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </div>
  );
}
