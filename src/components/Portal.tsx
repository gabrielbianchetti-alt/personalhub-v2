"use client";

// Renderiza filhos direto no <body>, fora da árvore do carrossel. Necessário
// porque o trilho do carrossel usa transform — e transform num ancestral
// quebra position:fixed E backdrop-filter dos descendentes (sheets/overlays).

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Portal({ children }: { children: React.ReactNode }) {
  // Só monta no cliente (createPortal precisa do document; evita mismatch no SSR).
  const [montado, setMontado] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- flag de "montou no cliente", roda 1x
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return createPortal(children, document.body);
}
