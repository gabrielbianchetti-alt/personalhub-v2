"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function irProApp() {
    router.replace("/");
    router.refresh();
  }

  async function entrar() {
    setErro(null);
    setAviso(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    setLoading(false);
    if (error) return setErro(error.message);
    irProApp();
  }

  async function esqueciSenha() {
    setErro(null);
    setAviso(null);
    if (!email) {
      setErro("Preencha o email primeiro.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });
    setLoading(false);
    if (error) return setErro(error.message);
    setAviso("Enviamos um link para redefinir a senha. Olha o email.");
  }

  async function criar() {
    setErro(null);
    setAviso(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
    });
    setLoading(false);
    if (error) return setErro(error.message);
    // Sem confirmação de email → já vem com sessão. Com confirmação → avisa.
    if (data.session) irProApp();
    else setAviso("Conta criada. Confirme pelo email para entrar.");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="font-display text-4xl text-text">PersonalHub</h1>
          <p className="mt-1 text-sm text-text-muted">Entre para gerir seus alunos.</p>
        </header>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            entrar();
          }}
        >
          <input
            type="email"
            autoComplete="email"
            required
            aria-label="Email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl bg-surface px-4 py-3 text-text shadow-soft outline-none placeholder:text-text-muted focus:ring-1 focus:ring-accent/50"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            aria-label="Senha"
            placeholder="senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-2xl bg-surface px-4 py-3 text-text shadow-soft outline-none placeholder:text-text-muted focus:ring-1 focus:ring-accent/50"
          />

          {erro && <p className="text-sm text-danger">{erro}</p>}
          {aviso && <p className="text-sm text-success">{aviso}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-2xl bg-accent py-3 font-medium text-white transition-opacity active:opacity-90 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={criar}
            className="rounded-2xl py-3 text-sm font-medium text-text-muted transition-colors active:bg-surface-soft disabled:opacity-60"
          >
            Criar conta
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={esqueciSenha}
            className="py-1 text-sm text-text-muted underline-offset-4 transition-colors active:text-text disabled:opacity-60"
          >
            Esqueci a senha
          </button>
        </form>
      </div>
    </div>
  );
}
