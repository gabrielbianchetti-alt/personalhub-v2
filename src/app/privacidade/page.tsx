// Política de privacidade (LGPD mínimo — Fundação #4 / ciclo 3b). Pública.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade — PersonalHub",
  description: "Política de privacidade do PersonalHub.",
};

export default function PrivacidadePage() {
  return (
    <div className="relative mx-auto w-full max-w-sm flex-1 px-6 pb-16 pt-14">
      <p className="text-sm font-medium uppercase tracking-wider text-text-muted">
        PersonalHub
      </p>
      <h1 className="mt-2 font-display text-3xl leading-tight text-text">
        Política de privacidade
      </h1>
      <p className="mt-1 text-xs text-text-muted">
        Última atualização: 12 de julho de 2026
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-text">
        <section>
          <h2 className="font-display text-lg">1. Quem somos no tratamento</h2>
          <p className="mt-1 text-text-muted">
            Para os dados da SUA conta (e-mail, nome, chave Pix, modelos de
            mensagem), o PersonalHub é o <strong className="text-text">controlador</strong>.
            Para os dados dos SEUS alunos que você cadastra (nome, telefone,
            agenda, valores e presenças), <strong className="text-text">você é o
            controlador</strong> e o PersonalHub atua como{" "}
            <strong className="text-text">operador</strong> (art. 5º, LGPD) —
            tratamos esses dados só para prestar o serviço a você.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg">2. O que coletamos e por quê</h2>
          <p className="mt-1 text-text-muted">
            Coletamos apenas o necessário para o serviço funcionar: sua conta
            (autenticação), os cadastros que você cria (gestão de alunos e
            fechamento de cobrança) e métricas de uso agregadas e anônimas
            (melhoria do produto). Não vendemos dados, não usamos para
            publicidade e não enviamos mensagens aos seus alunos — as cobranças
            saem do SEU WhatsApp, pelo seu gesto.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg">3. Onde os dados ficam</h2>
          <p className="mt-1 text-text-muted">
            A infraestrutura usa suboperadores: Supabase (banco de dados e
            autenticação) e Vercel (hospedagem e métricas). O acesso ao banco é
            isolado por conta (Row Level Security): um professor nunca enxerga
            dados de outro.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg">4. Seus direitos (e os dos seus alunos)</h2>
          <p className="mt-1 text-text-muted">
            Você pode acessar e corrigir seus dados a qualquer momento no app, e
            excluir a conta com TODOS os dados em Configurações → Excluir conta
            (irreversível). Pedidos de titulares que são seus alunos (acesso,
            correção, eliminação) devem ser atendidos por você, controlador — o
            app permite editar e excluir os registros deles. Dúvidas ou
            solicitações: use o canal de suporte em Configurações.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg">5. Retenção e segurança</h2>
          <p className="mt-1 text-text-muted">
            Mantemos os dados enquanto a conta existir. Excluída a conta, os
            dados são removidos do banco imediatamente (cópias de segurança
            expiram no ciclo normal de backup). Senhas nunca são armazenadas em
            texto; o tráfego é criptografado (HTTPS).
          </p>
        </section>
      </div>

      <footer className="mt-10 flex items-center gap-4 text-xs text-text-muted">
        <Link href="/conhecer" className="underline underline-offset-4">
          ← PersonalHub
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/termos" className="underline underline-offset-4">
          Termos de uso
        </Link>
      </footer>
    </div>
  );
}
