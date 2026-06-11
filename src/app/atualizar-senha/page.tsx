"use client";

// Destino do link "esqueci a senha". O client do Supabase troca o código da
// URL por sessão sozinho (detectSessionInUrl); aqui só definimos a senha nova.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AtualizarSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setErro(null);
    if (senha.length < 6) return setErro("A senha precisa de 6+ caracteres.");
    if (senha !== confirma) return setErro("As senhas não batem.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error)
      return setErro(
        "Link expirado ou inválido — peça um novo em “Esqueci a senha”.",
      );
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="font-display text-4xl text-text">Nova senha</h1>
          <p className="mt-1 text-sm text-text-muted">
            Escolha a nova senha da sua conta.
          </p>
        </header>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <input
            type="password"
            autoComplete="new-password"
            required
            aria-label="Nova senha"
            placeholder="nova senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-2xl bg-surface px-4 py-3 text-text shadow-soft outline-none placeholder:text-text-muted focus:ring-1 focus:ring-accent/50"
          />
          <input
            type="password"
            autoComplete="new-password"
            required
            aria-label="Repita a nova senha"
            placeholder="repete a senha"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            className="rounded-2xl bg-surface px-4 py-3 text-text shadow-soft outline-none placeholder:text-text-muted focus:ring-1 focus:ring-accent/50"
          />

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-2xl bg-accent py-3 font-medium text-accent-contrast transition-opacity active:opacity-90 disabled:opacity-60"
          >
            {loading ? "..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
