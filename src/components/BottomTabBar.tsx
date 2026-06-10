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

export function BottomTabBar() {
  const pathname = usePathname();

  // Login não faz parte da navegação do app.
  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="glass flex items-stretch justify-around rounded-3xl border border-white/40 px-2 py-2 shadow-soft">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-xs transition-colors ${
                  active ? "text-accent" : "text-text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className={active ? "font-medium" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
