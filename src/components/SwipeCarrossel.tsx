"use client";

// Carrossel pixel-a-pixel das 3 abas (Hoje · Alunos · Cobrança): o conteúdo
// segue o dedo e a aba vizinha "espia" na borda (skeleton). Ao soltar, commita
// (navega) ou volta. O pill da tab bar acompanha via --aba-progresso.
//
// DECISÃO-CHAVE: o trilho só ganha `transform` DURANTE o gesto. Em repouso as
// células-peek ficam display:none e o trilho sem transform — porque transform
// num ancestral quebra backdrop-filter E position:sticky dos descendentes
// (o card glass de resumo da Cobrança é sticky+glass e vive aqui dentro).
// A árvore React é estável (children sempre na MESMA posição) pra nunca
// remontar a página ao arrastar (perderia scroll/estado).
//
// overflow-x-clip (não hidden!): clip + overflow-y:visible NÃO vira scroll-
// container vertical, então o scroll continua no body e o sticky/mesh seguem.
//
// Robustez (revisão adversarial): rastreia pointerId (multi-touch não corrompe
// o gesto), reseta o repouso em qualquer pointerdown e em toda navegação
// (popstate/tab/clique não deixam o trilho preso), e respeita reduced-motion.

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const ABAS = ["/", "/alunos", "/cobranca"];
const FRACAO_COMMIT = 0.22; // arrastar >22% da largura troca de aba
const ANIM_MS = 260;
const EASE = "cubic-bezier(0.4,0,0.2,1)";

// useLayoutEffect no cliente (recentra antes do paint, sem flash); useEffect no SSR.
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Só as 3 telas-raiz EXATAS entram no carrossel. Subpáginas (/alunos/novo,
// /alunos/[id], /config) ficam de fora — arrastar nelas descartaria o trabalho.
function indiceAba(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname === "/alunos") return 1;
  if (pathname === "/cobranca") return 2;
  return -1;
}

function semMovimento(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SwipeCarrossel({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const idx = indiceAba(pathname);

  const wrapRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const ativo = useRef<number | null>(null); // pointerId do gesto em curso
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);
  const decidido = useRef(false);
  const W = useRef(0);
  // Timer pendente (navegar/voltar ao repouso). Cancelável.
  const timer = useRef<number | null>(null);
  const limpaTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // Trilho ao repouso: sem transform, peeks escondidos, pill/flags zerados.
  const aoRepouso = (rail: HTMLDivElement | null) => {
    if (rail) {
      rail.style.transition = "none";
      rail.style.transform = "none";
    }
    if (prevRef.current) prevRef.current.style.display = "none";
    if (nextRef.current) nextRef.current.style.display = "none";
    const root = document.documentElement;
    root.style.setProperty("--aba-progresso", "0");
    delete root.dataset.swipe;
    delete root.dataset.swipeCommit;
  };

  // Toda navegação (gesto, tab, popstate) passa por uma troca de pathname:
  // ponto único pra cancelar timer pendente e recentrar antes do paint.
  useIso(() => {
    limpaTimer();
    ativo.current = null;
    aoRepouso(railRef.current);
  }, [pathname]);
  useEffect(
    () => () => {
      limpaTimer();
      const root = document.documentElement;
      root.style.removeProperty("--aba-progresso");
      delete root.dataset.swipe;
      delete root.dataset.swipeCommit;
    },
    [],
  );

  // Fora das 3 abas (perfil/config/novo): sem carrossel.
  if (idx === -1) return <>{children}</>;

  // Liga o modo-arrasto: mostra peeks, centra com transform e prefetch dos
  // vizinhos (carrega em paralelo com a animação, não depois dela).
  const ligarArrasto = () => {
    if (prevRef.current) prevRef.current.style.display = "flex";
    if (nextRef.current) nextRef.current.style.display = "flex";
    document.documentElement.dataset.swipe = "1"; // desliga easing do pill
    if (idx > 0) router.prefetch(ABAS[idx - 1]);
    if (idx < ABAS.length - 1) router.prefetch(ABAS[idx + 1]);
  };

  const onDown = (e: React.PointerEvent) => {
    const alvo = e.target as HTMLElement;
    if (alvo.closest("input, textarea, select, [role=dialog], [data-no-swipe]")) return;
    if (ativo.current !== null) return; // já há um gesto ativo: ignora 2º dedo
    limpaTimer();
    aoRepouso(railRef.current); // assenta qualquer animação/commit em curso
    ativo.current = e.pointerId;
    inicio.current = { x: e.clientX, y: e.clientY };
    horizontal.current = false;
    decidido.current = false;
    W.current = wrapRef.current?.offsetWidth ?? window.innerWidth;
  };

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerId !== ativo.current || !inicio.current) return;
    const dx = e.clientX - inicio.current.x;
    const dy = e.clientY - inicio.current.y;

    // Decide direção no primeiro movimento relevante: vertical solta (deixa
    // rolar, mas mantém o gesto até soltar); horizontal assume.
    if (!decidido.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decidido.current = true;
      horizontal.current = Math.abs(dx) > Math.abs(dy);
      if (horizontal.current) {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
        ligarArrasto();
      } else {
        return;
      }
    }
    if (!horizontal.current) return;

    let d = dx;
    if ((idx === 0 && d > 0) || (idx === ABAS.length - 1 && d < 0)) d *= 0.3; // rubber-band

    const rail = railRef.current;
    if (rail) {
      rail.style.transition = "none";
      rail.style.transform = `translateX(calc(-100% + ${d}px))`;
    }
    let prog = -d / (W.current || 1);
    prog = Math.max(-idx, Math.min(ABAS.length - 1 - idx, prog));
    document.documentElement.style.setProperty("--aba-progresso", String(prog));
  };

  const finalizar = (e: React.PointerEvent) => {
    if (e.pointerId !== ativo.current) return;
    ativo.current = null;
    if (!horizontal.current || !inicio.current) {
      inicio.current = null;
      horizontal.current = false;
      return; // tap/scroll vertical: trilho nunca saiu do repouso
    }
    const dx = e.clientX - inicio.current.x;
    inicio.current = null;
    horizontal.current = false;

    const w = W.current || 1;
    const limiar = w * FRACAO_COMMIT;
    let destino = idx;
    if (dx <= -limiar && idx < ABAS.length - 1) destino = idx + 1;
    else if (dx >= limiar && idx > 0) destino = idx - 1;

    const rail = railRef.current;
    const root = document.documentElement;
    delete root.dataset.swipe; // o pill volta a animar (commit/snap)
    limpaTimer();
    const sm = semMovimento();

    if (destino !== idx) {
      // Desliza até a borda e navega no fim. (O recentra do pathname zera o
      // transform; não precisa de timer de repouso aqui.)
      root.style.setProperty("--aba-progresso", String(destino - idx));
      const alvo = destino > idx ? "translateX(-200%)" : "translateX(0%)";
      if (rail) {
        if (sm) {
          rail.style.transition = "none";
        } else {
          rail.style.transition = `transform ${ANIM_MS}ms ${EASE}`;
          root.dataset.swipeCommit = "1"; // pill acompanha o trilho (260ms)
        }
        rail.style.transform = alvo;
      }
      timer.current = window.setTimeout(
        () => router.push(ABAS[destino], { scroll: false }),
        sm ? 0 : ANIM_MS,
      );
    } else {
      // Volta ao centro; ao fim, repouso (tira o transform p/ glass/sticky).
      root.style.setProperty("--aba-progresso", "0");
      if (sm) {
        aoRepouso(rail);
      } else if (rail) {
        rail.style.transition = `transform ${ANIM_MS}ms ${EASE}`;
        root.dataset.swipeCommit = "1";
        rail.style.transform = "translateX(-100%)";
        timer.current = window.setTimeout(() => aoRepouso(railRef.current), ANIM_MS);
      }
    }
  };

  const aoCancelar = (e: React.PointerEvent) => {
    if (e.pointerId !== ativo.current) return;
    ativo.current = null;
    inicio.current = null;
    horizontal.current = false;
    limpaTimer();
    aoRepouso(railRef.current);
  };

  return (
    <div
      ref={wrapRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={finalizar}
      onPointerCancel={aoCancelar}
      className="flex flex-1 flex-col overflow-x-clip"
      style={{ touchAction: "pan-y" }}
    >
      <div ref={railRef} className="flex flex-1" style={{ transform: "none" }}>
        <div
          ref={prevRef}
          className="w-full shrink-0 flex-col"
          style={{ display: "none" }}
          aria-hidden="true"
        >
          {idx > 0 ? <SkeletonAba tab={idx - 1} /> : null}
        </div>
        <div className="flex w-full shrink-0 flex-col">{children}</div>
        <div
          ref={nextRef}
          className="w-full shrink-0 flex-col"
          style={{ display: "none" }}
          aria-hidden="true"
        >
          {idx < ABAS.length - 1 ? <SkeletonAba tab={idx + 1} /> : null}
        </div>
      </div>
    </div>
  );
}

// Peeks: skeleton leve de cada aba (espelha os loading.tsx) só pro vislumbre
// da borda. Ao commitar, a rota real entra com o próprio loading.tsx.
function SkeletonAba({ tab }: { tab: number }) {
  if (tab === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="px-5 pb-7 pr-16 pt-12">
          <div className="skeleton h-4 w-12 rounded-md" />
          <div className="skeleton mt-2 h-11 w-3/4 rounded-lg" />
        </header>
        <section className="flex flex-col gap-3 px-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[68px] rounded-[14px]" />
          ))}
        </section>
      </div>
    );
  }
  if (tab === 1) {
    return (
      <div className="flex flex-1 flex-col px-5 pt-12">
        <div className="skeleton h-10 w-40 rounded-lg" />
        <div className="mt-4 flex items-center gap-2">
          <div className="skeleton h-11 flex-1 rounded-2xl" />
          <div className="skeleton size-11 rounded-2xl" />
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[72px] rounded-[14px]" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col px-5 pt-12">
      <div className="skeleton h-10 w-44 rounded-lg" />
      <div className="skeleton mt-4 h-[104px] rounded-[14px]" />
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-[120px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
