"use client";

// Registra o service worker (/sw.js) só em produção — em dev o SW atrapalha o
// HMR do Turbopack. Falha silenciosa: offline é progressivo, não pode quebrar
// o app se o registro não vingar. Também captura o beforeinstallprompt
// (Android) para a seção "Instalar" do Config.
import { useEffect } from "react";
import { capturaInstallPrompt } from "@/lib/instalar";

export function RegistraSW() {
  useEffect(() => {
    capturaInstallPrompt();
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Deploy com o app aberto: o SW novo assume (skipWaiting+claim) e a página
    // antiga recarrega UMA vez para casar documento e chunks da versão nova.
    // Só quando JÁ havia controller — senão a 1ª visita recarregaria à toa.
    const tinhaController = !!navigator.serviceWorker.controller;
    let recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!tinhaController || recarregou) return;
      recarregou = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
