"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Logout simples. Por ora fica como ícone discreto no header de Hoje;
// na v2 mora atrás do avatar/engrenagem (§4.4).
export function LogoutButton() {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      aria-label="Sair"
      className="flex size-9 items-center justify-center rounded-full bg-surface/70 text-text-muted shadow-soft backdrop-blur-sm transition-colors active:text-text"
    >
      <LogOut size={16} strokeWidth={2.2} />
    </button>
  );
}
