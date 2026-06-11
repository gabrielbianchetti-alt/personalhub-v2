"use client";

// Configurações (§4.4): atrás da engrenagem, fora da navegação principal.
// Template de mensagem, tema e conta.

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { salvarConta } from "@/app/actions/conta";
import { renderMensagem, TEMPLATE_PADRAO } from "@/lib/whatsapp";
import { LogoutButton } from "./LogoutButton";

type Tema = "auto" | "claro" | "escuro";

function aplicarTema(tema: Tema) {
  const dark =
    tema === "escuro" ||
    (tema === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  // Status bar do PWA acompanha o tema forçado, não só o do sistema.
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", dark ? "#0E1116" : "#F6F7F9"));
}

export function ConfigClient({
  email,
  nome: nomeInicial,
  template: templateInicial,
  chavePix: chavePixInicial,
}: {
  email: string;
  nome: string;
  template: string;
  chavePix: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [template, setTemplate] = useState(templateInicial);
  const [chavePix, setChavePix] = useState(chavePixInicial);
  const [tema, setTema] = useState<Tema>("auto");
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Sincroniza com o localStorage só depois de hidratar (SSR não tem acesso).
  useEffect(() => {
    const t = (localStorage.getItem("tema") as Tema) || "auto";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(t);
  }, []);

  // "Salvo ✓" some sozinho.
  useEffect(() => {
    if (!salvo) return;
    const t = setTimeout(() => setSalvo(false), 2000);
    return () => clearTimeout(t);
  }, [salvo]);

  const mudaTema = (t: Tema) => {
    setTema(t);
    localStorage.setItem("tema", t);
    aplicarTema(t);
  };

  const preview = renderMensagem(template || null, {
    nome: "Marina",
    valor: "R$ 300,00",
    mes: "junho",
    aulas: "12 aulas · 1 falta · 2 extras",
  });

  return (
    <div className="relative flex flex-1 flex-col px-5 pt-12 pb-6">
      <div className="camada-ambiente" aria-hidden="true">
        <div className="aura" />
      </div>
      <div className="relative flex items-center gap-3">
        <Link
          href="/"
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-full bg-surface text-text-muted shadow-soft"
        >
          <ArrowLeft size={19} />
        </Link>
        <h1 className="font-display text-3xl text-text">Configurações</h1>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[14px] bg-surface p-4 shadow-soft">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Seu nome
          </span>
          <input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setSalvo(false);
            }}
            className="rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] text-text outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Mensagem de cobrança
          </span>
          <textarea
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setSalvo(false);
            }}
            placeholder={TEMPLATE_PADRAO}
            rows={4}
            className="resize-none rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] leading-relaxed text-text outline-none placeholder:text-text-muted"
          />
          <span className="text-xs text-text-muted">
            Use {"{nome}"}, {"{valor}"}, {"{mes}"}, {"{aulas}"} e {"{pix}"} —
            preenchem sozinhos.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Chave Pix
          </span>
          <input
            value={chavePix}
            onChange={(e) => {
              setChavePix(e.target.value);
              setSalvo(false);
            }}
            placeholder="CPF, email, telefone ou chave aleatória"
            className="rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] text-text outline-none placeholder:text-text-muted"
          />
          <span className="text-xs text-text-muted">
            Com a chave salva, a cobrança já vai com o Pix copia e cola no valor
            exato do fechamento.
          </span>
        </label>

        <div className="rounded-xl bg-surface-soft p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Como vai chegar
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">
            {preview}
          </p>
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
        {salvo && <p className="text-sm text-success">Salvo ✓</p>}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setErro(null);
            startTransition(async () => {
              try {
                await salvarConta(nome, template, chavePix);
                setSalvo(true);
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não salvou.");
              }
            });
          }}
          className="rounded-2xl bg-accent py-3 font-medium text-accent-contrast active:opacity-90 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>

      <div className="mt-3 rounded-[14px] bg-surface p-4 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Tema
        </p>
        <div className="mt-2 flex rounded-xl bg-surface-soft p-1">
          {(
            [
              ["auto", "Auto"],
              ["claro", "Claro"],
              ["escuro", "Escuro"],
            ] as const
          ).map(([t, rotulo]) => (
            <button
              key={t}
              type="button"
              onClick={() => mudaTema(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tema === t ? "bg-surface text-text shadow-soft" : "text-text-muted"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[14px] bg-surface p-4 shadow-soft">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Conta
          </p>
          <p className="mt-0.5 truncate text-sm text-text">{email}</p>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
