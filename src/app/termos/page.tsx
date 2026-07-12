// Termos de uso (Fundação #4 / ciclo 3b). Público.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de uso — PersonalHub",
  description: "Termos de uso do PersonalHub.",
};

export default function TermosPage() {
  return (
    <div className="relative mx-auto w-full max-w-sm flex-1 px-6 pb-16 pt-14">
      <p className="text-sm font-medium uppercase tracking-wider text-text-muted">
        PersonalHub
      </p>
      <h1 className="mt-2 font-display text-3xl leading-tight text-text">
        Termos de uso
      </h1>
      <p className="mt-1 text-xs text-text-muted">
        Última atualização: 12 de julho de 2026
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-text">
        <section>
          <h2 className="font-display text-lg">1. O serviço</h2>
          <p className="mt-1 text-text-muted">
            O PersonalHub é uma ferramenta de gestão de alunos e cobrança para
            personal trainers: agenda presumida, registro de exceções,
            fechamento mensal e mensagem de cobrança para envio pelo seu
            WhatsApp. O app não intermedeia pagamentos: o Pix é entre você e o
            seu aluno, sem taxas nossas.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg">2. Sua conta e seus dados</h2>
          <p className="mt-1 text-text-muted">
            A conta é pessoal e você responde pelo que cadastra — inclusive por
            ter base legal para tratar os dados dos seus alunos (ver a{" "}
            <Link href="/privacidade" className="underline underline-offset-4 text-text">
              Política de privacidade
            </Link>
            ). Você pode exportar informações e excluir a conta com todos os
            dados a qualquer momento, em Configurações.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg">3. Responsabilidades</h2>
          <p className="mt-1 text-text-muted">
            O app calcula os fechamentos a partir do que você registra; confira
            os valores antes de cobrar — a relação financeira com o aluno é sua.
            O serviço está em acesso antecipado e é fornecido “como está”;
            trabalhamos para mantê-lo disponível e correto, sem garantia de
            disponibilidade ininterrupta.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg">4. Encerramento</h2>
          <p className="mt-1 text-text-muted">
            Você pode sair quando quiser (Configurações → Excluir conta).
            Podemos encerrar contas que violem estes termos ou a lei. Mudanças
            relevantes nestes termos serão avisadas no app.
          </p>
        </section>
      </div>

      <footer className="mt-10 flex items-center gap-4 text-xs text-text-muted">
        <Link href="/conhecer" className="underline underline-offset-4">
          ← PersonalHub
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacidade" className="underline underline-offset-4">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
