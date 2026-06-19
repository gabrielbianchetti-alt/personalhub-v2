"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Users, Receipt, type LucideIcon } from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { href: "/", label: "Hoje", icon: Sun },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/cobranca", label: "Cobrança", icon: Receipt },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Badge no ícone Cobrança nos últimos 3 dias do mês — o lembrete de fechar.
// Relógio do aparelho: o professor está no fuso dele.
function fimDeMes(): boolean {
  const agora = new Date();
  const ultimo = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  return agora.getDate() >= ultimo - 2;
}

export function BottomTabBar() {
  const pathname = usePathname();

  // Login e redefinição de senha não fazem parte da navegação do app.
  if (pathname === "/login" || pathname === "/atualizar-senha") return null;

  // Índice do destino ativo → posição da pílula. -1 (ex.: /config) esconde.
  const activeIdx = TABS.findIndex((t) => isActive(pathname, t.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="glass rounded-full border border-glass-border px-2 py-2 shadow-soft">
          <div className="relative flex items-stretch">
            {/* Pílula que escorrega entre os 3 itens (decorativa). */}
            <span
              aria-hidden="true"
              className="tab-indicador pointer-events-none absolute inset-y-0 left-0 w-[calc(100%/3)] rounded-full bg-accent-soft"
              style={{
                // segue o arrasto do carrossel (--aba-progresso) em tempo real
                transform: `translateX(calc((${activeIdx} + var(--aba-progresso, 0)) * 100%))`,
                opacity: activeIdx === -1 ? 0 : 1,
              }}
            />
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-1 flex-col items-center gap-1 rounded-full py-1.5 text-xs transition-colors ${
                    active ? "text-accent" : "text-text-muted"
                  }`}
                >
                  <span
                    className={`relative transition-transform duration-[420ms] ease-[cubic-bezier(0.34,1.3,0.5,1)] ${
                      active ? "-translate-y-0.5 scale-110" : ""
                    }`}
                  >
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                    {href === "/cobranca" && fimDeMes() && (
                      <span
                        aria-label="Fechamentos do mês prontos"
                        className="absolute -right-1 -top-0.5 size-2 rounded-full bg-accent"
                      />
                    )}
                  </span>
                  <span className={active ? "font-medium" : ""}>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
