// Fallback offline do PWA (servido pelo service worker quando não há rede).
// Estática de propósito: não depende de sessão nem de dados do servidor.
import Link from "next/link";

export const dynamic = "force-static";
export const metadata = { title: "Sem conexão · PersonalHub" };

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
      <p className="font-display text-2xl leading-snug text-text">
        Sem conexão
      </p>
      <p className="mt-2 max-w-xs text-sm text-text-muted">
        Tente de novo quando a internet voltar. Seus alunos e fechamentos estão
        seguros no servidor 👊
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-accent-contrast shadow-soft active:opacity-90"
      >
        Tentar de novo
      </Link>
    </div>
  );
}
