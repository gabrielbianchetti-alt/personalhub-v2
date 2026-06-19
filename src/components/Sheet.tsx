"use client";

// Bottom sheet glass genérico (§6.4 — sheets/modais são lugar sancionado de glass).
// Fecha com Esc e trava o scroll da página enquanto aberto.

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Portal } from "./Portal";

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [open, onClose]);

  return (
    <Portal>
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop escurece E desfoca o que ficou atrás — nada de
          informação da página se misturando com o conteúdo do sheet. */}
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Aberto fica SEM transform: ancestral com transform desliga o
          backdrop-filter do glass no Chromium (o blur parava de agir). */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] transition-transform duration-300 ease-out ${
          open ? "" : "translate-y-full"
        }`}
      >
        <div className="glass rounded-t-2xl border-t border-glass-border px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-soft">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-text-muted/30" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text">{title}</h2>
            <button
              type="button"
              aria-label="Fechar"
              tabIndex={open ? 0 : -1}
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-surface-soft text-text-muted"
            >
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
    </Portal>
  );
}
