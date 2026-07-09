"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

// Logout — mora nas Configurações (§4.4).
export function LogoutButton() {
  const router = useRouter();

  async function sair() {
    // Import dinâmico: o supabase-js inteiro saía no chunk do /config só por
    // causa deste botão — carrega apenas se o usuário realmente sair.
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-soft px-3.5 py-2 text-sm font-medium text-text-muted transition-colors active:text-danger"
    >
      <LogOut size={15} strokeWidth={2.2} />
      Sair
    </button>
  );
}
