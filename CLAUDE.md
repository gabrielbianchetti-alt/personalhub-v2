# PersonalHub v2

**Documento-norte: [`SPEC-PERSONALHUB-V2.md`](./SPEC-PERSONALHUB-V2.md).** Leia antes de propor qualquer feature, tela ou tabela. O que não se justificar perante os Princípios (§2) e o Core Loop (§3) **não entra**.

Veja também [`AGENTS.md`](./AGENTS.md) — esta versão do Next.js tem breaking changes; consulte `node_modules/next/dist/docs/` antes de escrever código.

## Regras-chave (não violar sem aprovação)

- **Três telas, só.** Hoje · Alunos · Cobrança (§4). Se algo não cabe numa delas, provavelmente não pertence à v2. Configurações ficam atrás de avatar/engrenagem, fora da navegação.
- **A exceção é registrada; a regra é presumida** (§2.2). Aula acontecer é o normal e não se registra. `registros_aula` guarda **só exceções** (falta/extra/desmarcada); presença é derivada. Quem não registra nada não é punido — o fechamento sai correto pela config semanal.
- **Cobrança é o core; gestão é subproduto** (§2.3). Nenhum fluxo pode atrapalhar cadastro → fechamento → WhatsApp.
- **Tokens do §6.2 são a fonte da verdade visual** (identidade CARIMBO: papel frio + tinta grafite + teal `#0B7A66`/`#35D0AE`). Claro e escuro nascem dos mesmos tokens; não introduzir cores fora da paleta. Botões de accent usam `text-accent-contrast` (no dark o teal claro exige texto escuro). TODO valor R$ usa `.font-money` (Geist Mono — mono tabular de zero limpo; centavos sempre). Proibido: creme, coral, Fraunces/serifa (era a cara do Claude — redesign de 11/jun/2026).
- **Anti-padrões do §6.5 são proibidos:**
  - Verde pintando dados ou saudações (verde só para sucesso/confirmação).
  - Tabelas densas estilo planilha / tudo-caixa-com-borda.
  - Glass empilhado / texto sobre blur sobre gradiente (glass só em 3 lugares — §6.4).
  - Branco puro sobre branco; preto puro no dark.
  - Mais de uma cor de destaque competindo na mesma tela.

Regra de negócio em aberto (default §5): em `mensalidade`, falta **não** desconta valor; desmarcação com reposição é neutra. Configurável por professor só em v2.x.

## Invariantes do código (não quebrar)

- **Fonte única da contagem é `src/lib/aulas.ts`** (Hoje, Cobrança e actions consomem dela; ninguém conta por fora). Testes em `tests/` rodam com `npm test` (Node 24, type stripping nativo — por isso os imports internos da lib usam extensão `.ts`).
- **Fechamento `aberto` é sempre derivado ao vivo; o snapshot só congela ao virar `enviado`/`pago`** (recomputado no servidor em `actions/cobranca.ts`). Nunca preencher snapshot na criação.
- **Todo conceito de "hoje" passa por `agoraSP()`** (`src/lib/datas.ts`, fuso América/São_Paulo). `new Date()` cru no servidor é bug (Vercel roda em UTC).
- **Saldo de créditos é derivado** (`saldoCreditos`): total do pacote mais recente − aulas realizadas desde a compra. Não há job de débito.
- Migrações em `supabase/migrations/`, rodadas manualmente no SQL Editor (ordem numérica). `scripts/verify-schema.cjs` valida schema+RLS com uma conta de teste.
