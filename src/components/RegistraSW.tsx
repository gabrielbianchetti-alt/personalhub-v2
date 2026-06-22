"use client";

// Registra o service worker (/sw.js) só em produção — em dev o SW atrapalha o
// HMR do Turbopack. Falha silenciosa: offline é progressivo, não pode quebrar
// o app se o registro não vingar.
import { useEffect } from "react";

export function RegistraSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
