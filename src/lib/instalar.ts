"use client";

// Captura do beforeinstallprompt (Android/Chrome): o evento dispara cedo, em
// qualquer página — quem captura é o RegistraSW (montado no layout); o Config
// consome depois. iOS não tem o evento (instrução manual via Compartilhar).

export interface PromptInstall extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferido: PromptInstall | null = null;
const ouvintes = new Set<() => void>();

export function capturaInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferido = e as PromptInstall;
    ouvintes.forEach((fn) => fn());
  });
}

export function pegaInstallPrompt(): PromptInstall | null {
  return deferido;
}

export function aoMudarInstallPrompt(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function estaInstalado(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legado
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function ehIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
