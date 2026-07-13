// Landing pública (Fundação #8 / ciclo 3b): o visitante sem sessão cai aqui
// (proxy manda "/" deslogado pra cá). Identidade CARIMBO (§6): papel frio,
// tinta, teal — uma cor de destaque, zero cor nova.

import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { VitrineCobranca } from "@/components/VitrineCobranca";

export const metadata: Metadata = {
  title: "PersonalHub — cobrança sem planilha para personal trainers",
  description:
    "Cadastre seus alunos, marque só as exceções e feche o mês em minutos: mensagem pronta no WhatsApp, chave Pix junto e recibo carimbado. A cobrança do personal, sem planilha e sem constrangimento.",
};

const PILARES = [
  {
    titulo: "O dia em 2 toques",
    texto:
      "A regra é presumida: aula que aconteceu não se registra. Você só marca a exceção — falta, extra, reposição — e o mês se fecha sozinho.",
  },
  {
    titulo: "Cobrança que se explica",
    texto:
      "Mensagem pronta pro WhatsApp com o extrato de aulas do mês e sua chave Pix. O valor se justifica sozinho — ninguém precisa ter a conversa difícil.",
  },
  {
    titulo: "“Quem me deve?” na cara",
    texto:
      "Mês que virou sem pagar não some: aparece em vermelho no topo da Cobrança até ser resolvido. A coluna vermelha da planilha, sem a planilha.",
  },
];

export default function ConhecerPage() {
  return (
    <div className="relative flex flex-1 flex-col px-6 pb-16 pt-16">
      <div className="camada-ambiente" aria-hidden="true">
        <div className="aura" />
      </div>

      <header className="relative text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-text-muted">
          PersonalHub
        </p>
        <h1 className="mx-auto mt-3 max-w-sm font-display text-[2.4rem] leading-[1.08] text-text">
          A cobrança do personal, sem planilha e sem constrangimento.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-text-muted">
          Cadastre seus alunos, marque só as exceções da semana e feche o mês em
          minutos — mensagem pronta no WhatsApp, chave Pix junto e recibo
          carimbado.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="w-full max-w-xs rounded-full bg-accent py-3.5 text-center font-medium text-accent-contrast shadow-soft active:opacity-90"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-text-muted underline-offset-4 active:text-text"
          >
            Já tenho conta — entrar
          </Link>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Em acesso antecipado · seus dados são seus, saia quando quiser.
        </p>
      </header>

      {/* Vitrine (pauta 2): a cena do produto — legenda do marketing visível
          (é o que o leitor de tela recebe; o mockup em si é aria-hidden). */}
      <section className="relative mx-auto mt-12 w-full max-w-sm">
        <p className="mx-auto max-w-[330px] text-center text-sm leading-relaxed text-text-muted">
          A mensagem que você adia todo mês —{" "}
          <strong className="font-medium text-text">pronta</strong>. O extrato
          explica o valor por você.
        </p>
        <VitrineCobranca />
      </section>

      <section className="relative mx-auto mt-12 flex w-full max-w-sm flex-col gap-3">
        {PILARES.map((p) => (
          <article
            key={p.titulo}
            className="rounded-[14px] bg-surface p-5 shadow-soft"
          >
            <h2 className="flex items-center gap-2 font-display text-lg text-text">
              <Check size={18} strokeWidth={2.6} className="shrink-0 text-accent" />
              {p.titulo}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{p.texto}</p>
          </article>
        ))}
      </section>

      <footer className="relative mx-auto mt-12 flex max-w-sm items-center gap-4 text-xs text-text-muted">
        <Link href="/termos" className="underline underline-offset-4 active:text-text">
          Termos de uso
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          href="/privacidade"
          className="underline underline-offset-4 active:text-text"
        >
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
