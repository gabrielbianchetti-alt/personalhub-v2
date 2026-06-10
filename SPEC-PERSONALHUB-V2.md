# PersonalHub v2 — Documento-Norte

> **Status:** Spec fundadora. Este documento é o filtro contra recriar os vícios da v1.
> Qualquer feature, tela ou tabela que não se justifique perante os Princípios e o Core Loop **não entra**.
> **Origem:** destilação feita em junho/2026 a partir do uso real da v1 (repo PersonalApp), que fica congelada como referência.

---

## 1. Tese do produto

Personal trainers são, em geral, desorganizados na gestão do próprio negócio — por cultura da profissão, não por falta de ferramenta. O PersonalHub **não exige organização como pré-requisito: ele entrega organização como subproduto de gestos preguiçosos.**

A dor de entrada é a mais aguda e universal: **cobrança mensal**. O app resolve isso com fricção quase zero. A gestão (presenças, extras, histórico) acontece como efeito colateral de um check-in de 5 segundos. O ecossistema (relatórios, financeiro completo, área do aluno) vem depois, como módulos vendáveis em cima da base de dados acumulada.

O app também é **vitrine da postura profissional** do personal: ele mostra a tela pro aluno, manda print, abre na frente de cliente. A estética não é acabamento — é o produto entregando a promessa ("esse profissional está um nível acima") no primeiro segundo.

---

## 2. Princípios de design (decisórios, não decorativos)

1. **Fricção mínima vence feature a mais.** Cada passo a menos no onboarding vale mais que qualquer funcionalidade nova.
2. **A exceção é registrada; a regra é presumida.** Aula acontecer é o normal — não se registra o normal. Registra-se falta, extra, desmarcação. Quem não registra nada não é punido: o fechamento sai correto pela configuração semanal.
3. **Cobrança é o core; gestão é subproduto.** Nenhum fluxo de gestão pode atrapalhar o caminho cadastro → fechamento → WhatsApp.
4. **O app dá organização sem exigir disciplina.** Esquecer é o comportamento esperado, não o erro do usuário.
5. **Números são o hero.** Valor do fechamento, contagem de aulas, alunos do dia — tipografia grande, hierarquia clara. Nunca tabela de planilha.
6. **Três telas.** Se algo não cabe em Hoje, Alunos ou Cobrança, provavelmente não pertence à v2.

---

## 3. Core loops

**Diário (5 segundos):**
Abrir **Hoje** → ver alunos esperados do dia (presumidos "fez") → tocar apenas exceções (✗ faltou · + extra) → fim.

**Mensal (1-2 cliques):**
Abrir **Cobrança** → fechamentos já prontos (config semanal + exceções do diário) → tocar → mensagem pronta na conversa do WhatsApp do aluno.

**Onboarding (2 minutos para 10 alunos):**
Criar conta → tela única de cadastro em lote → digitar linha a linha: nome + valor + dias da semana → pronto para o primeiro fechamento.

---

## 4. Telas

### 4.1 Hoje (tela inicial)
- Header com data e o **orbe-gradiente** (assinatura visual; cor varia com o período do dia).
- Lista dos alunos esperados hoje (derivada de `dias_semana` de cada aluno ativo).
- Cada card: nome + horário aproximado (se cadastrado) + estado padrão "✓ presumido".
- Ações por toque: **✗ Faltou** · **+ Extra** (extra também disponível para aluno que não era esperado hoje, via botão único "+ aula extra").
- Microinterações: transição suave ao resolver card, feedback háptico no mobile.
- **Pendências retroativas:** seção discreta "dias anteriores" quando houver dias úteis recentes sem nenhuma interação — pergunta única do tipo "ontem: todos fizeram?" com confirmação em um toque ou correção pontual. Janela de correção: 7 dias.
- Estado vazio com voz humana: "Sem alunos hoje. Bom descanso 👊" (não "Nenhum registro encontrado").

### 4.2 Alunos
- Lista enxuta: nome, valor, modo de cobrança, dias da semana. Busca simples.
- Filtro de status: **Ativos** (padrão) · **Suspensos**. Suspender = ação no perfil; remove o aluno de Hoje e Cobrança, preserva histórico. Sem aba dedicada.
- **Cadastro em lote (o onboarding):** tela única estilo checklist conversacional. Cada linha = 1 aluno com os 4 dados mínimos:
  1. Nome
  2. Valor
  3. Modo de cobrança: `mensalidade` ou `creditos` (pacote)
  4. Dias da semana (chips S T Q Q S S D)
- Telefone/WhatsApp: **opcional no cadastro**; se ausente, é pedido inline na primeira cobrança daquele aluno.
- Perfil do aluno: os 4 dados + telefone + campos opcionais colapsados ("Mais detalhes": observações, anamnese, data de início). Campos opcionais **nunca aparecem no fluxo de entrada**.

### 4.3 Cobrança
- Visão do mês corrente: lista de fechamentos por aluno, cada card com **valor em destaque** (tipografia display) + resumo legível ("12 aulas · 1 falta · 2 extras").
- Ajuste manual disponível e **persistente** (lição da v1 — tabela própria, ver §5).
- Ação principal por aluno: **Cobrar no WhatsApp** → abre `wa.me` com mensagem do template preenchida. Estado do fechamento: `aberto → enviado → pago` (marcação manual de pago).
- Alunos por **créditos**: card mostra saldo; cobrança = venda de novo pacote (mesmo fluxo de mensagem). Crédito é debitado automaticamente por aula realizada (presumida ou extra).
- Momento "cobrança enviada" tem celebração visual discreta.

### 4.4 Navegação
- **Mobile (primário):** bottom tab bar com 3 destinos — Hoje · Alunos · Cobrança. Glass com blur.
- **Desktop:** mesma estrutura, sidebar mínima.
- Configurações (template de mensagem, tema, conta) atrás de avatar/engrenagem — fora da navegação principal.

---

## 5. Modelo de dados (Supabase, projeto novo)

RLS por `professor_id` em todas as tabelas, como na v1.

```
professores
  id (uuid, = auth.uid)
  nome
  template_mensagem (text, com placeholders {nome}, {valor}, {mes}, {aulas})
  preferencias (jsonb: tema, etc.)

alunos
  id, professor_id
  nome (obrigatório)
  valor_mensal (numeric)            -- usado se modo = mensalidade
  modo_cobranca (enum: mensalidade | creditos)
  dias_semana (int[] ou bitmask)    -- ex.: [1,3,5] = seg/qua/sex
  horario (time, opcional)
  telefone (text, opcional)
  status (enum: ativo | suspenso)
  detalhes (jsonb, opcional)        -- observações, anamnese etc. Sem coluna por campo.
  created_at

registros_aula                       -- SÓ EXCEÇÕES. Presença é derivada.
  id, professor_id, aluno_id
  data (date)
  tipo (enum: falta | extra | desmarcada)
  origem (enum: checkin | retroativo | ajuste)
  created_at
  UNIQUE (aluno_id, data, tipo)

pacotes_creditos                     -- só para alunos modo = creditos
  id, professor_id, aluno_id
  qtd_aulas (int)
  valor (numeric)
  saldo (int)                        -- debitado por aula realizada
  created_at

fechamentos
  id, professor_id, aluno_id
  mes_referencia (date, dia 1)
  aulas_esperadas (int)              -- snapshot do cálculo
  faltas (int), extras (int)
  ajuste_manual (int, default 0)     -- lição da v1: persistente, com motivo opcional
  ajuste_motivo (text)
  valor_final (numeric)
  status (enum: aberto | enviado | pago)
  enviado_em, pago_em (timestamptz)
```

**Lógica de cálculo (herda e adapta `aulas.ts` da v1, já validada com 2880 casos):**

```
aulas_do_mes = ocorrencias(dias_semana, mes)        # função validada da v1
realizadas   = aulas_do_mes − faltas − desmarcadas + extras + ajuste_manual
valor_final  = mensalidade: valor_mensal (faltas afetam contagem, não valor, salvo regra do professor)
               creditos:    debita saldo; cobrança = novo pacote quando saldo baixa
```

> Regra de negócio em aberto (decidir no co-dev, default sugerido): em `mensalidade`, falta **não** desconta valor por padrão; desmarcação com reposição é neutra. Configurável por professor numa v2.x, não na v2.0.

**O ativo estratégico é `registros_aula`:** todo módulo futuro (relatórios, financeiro, área do aluno) lê dela. Mantê-la simples e íntegra é prioridade arquitetural.

---

## 6. Identidade visual

### 6.1 Conceito
**"Soft warm + editorial."** Superfícies suaves e quentes, tipografia display gigante para números, uma cor de ação quente, muito respiro. Glass usado de forma **cirúrgica** como camada de elevação — nunca como tema total (legibilidade sob sol de academia e performance em celular médio são restrições reais).

### 6.2 Tokens (CSS variables, Tailwind v4)

**Modo claro (padrão de lançamento):**
```
--bg:            #FAF6F1   /* off-white quente, não branco hospitalar */
--surface:       #FFFFFF
--surface-soft:  #F3EDE6
--text:          #1F1B16
--text-muted:    #8A8178
--accent:        #F26B3A   /* coral/laranja — ação, destaque, orbe */
--accent-soft:   #FBD9CB
--success:       #2E9E6B   /* verde só para sucesso/confirmação */
--warning:       #E2A33C
--danger:        #D9534F
--glass:         rgba(255,255,255,.65) + backdrop-blur(20px)
```

**Modo escuro (nasce junto, dos mesmos tokens):**
```
--bg:            #14202A   /* azul-petróleo profundo, não preto puro */
--surface:       #1C2B37
--surface-soft:  #243542
--text:          #F2EDE7
--text-muted:    #93A1AC
--accent:        #F58A5C
--glass:         rgba(20,32,42,.6) + backdrop-blur(20px)
```

### 6.3 Tipografia
- **Display (números-hero, datas grandes):** serifada/geométrica com personalidade — candidatas: *Fraunces*, *Instrument Serif*, *Gambetta*. Uso: valor do fechamento, contagem de aulas, data no header de Hoje. Números tabulares onde houver alinhamento.
- **Texto/UI:** sans limpa e neutra — candidatas: *Inter*, *Geist*, *General Sans*.
- Contraste de registros (display vs sans) é o que mata a cara de planilha. Definir as duas fontes na primeira sessão visual e congelar.

### 6.4 Elementos de assinatura
- **Orbe-gradiente:** radial-gradient difuso (accent → transparente, blur alto) no header de Hoje. Varia com o período: manhã (laranja quente) · tarde (coral) · noite (tons frios sobre dark). Implementação barata, identidade forte.
- **Glass em exatamente 3 lugares:** bottom tab bar · sheets/modais de confirmação · card flutuante de resumo na Cobrança. Todo o resto: superfícies sólidas com elevação suave (shadow difusa, raio generoso ~20px).
- **Microinterações:** resolver card no check-in (transição + háptico), celebração discreta no "cobrança enviada".
- **Voz dos textos:** humana e direta, em PT-BR. "Tudo certo por hoje 👊" > "Nenhum registro pendente".

### 6.5 Anti-padrões (proibidos)
- Verde pintando dados ou saudações (lição do PR #2 da v1).
- Tabelas densas estilo planilha; tudo-caixa-com-borda.
- Glass empilhado / texto sobre blur sobre gradiente.
- Branco puro sobre branco; preto puro no dark.
- Mais de uma cor de destaque competindo na mesma tela.

---

## 7. Stack e infraestrutura

- **Repo novo** (sugestão: `personalhub-v2` ou nome novo de marca). **Projeto Supabase novo.** A v1 (PersonalApp) congela como referência; os ~alunos atuais migram manualmente (2 usuários, <10 min).
- Next.js (App Router) + React + TypeScript + Tailwind v4 (tokens via CSS variables) + Supabase (Auth + Postgres + RLS) + Vercel.
- Lucide para ícones. PWA-ready (uso primário é mobile).
- Migrações SQL versionadas no repo desde o dia 1 (`/supabase/migrations`), mesmo rodando manualmente no SQL Editor — fim das migrações soltas da v1.
- Stripe e Resend: **fora da v2.0.** Pontos de integração ficam documentados, não implementados.
- WhatsApp via `wa.me/{telefone}?text={mensagem}` (sem API oficial na v2.0).

---

## 8. Explicitamente fora da v2.0

| Item | Destino |
|---|---|
| Agenda/calendário | Não volta como módulo. "Hoje" substitui o caso de uso real. |
| Relatórios PDF | Módulo futuro (pago) quando `registros_aula` tiver massa de dados. |
| Financeiro além do bruto (custos/lucro/margem) | Módulo futuro pago. |
| Metas financeiras, Termos de serviço | Não voltam. |
| Aprovações como aba | Vira fluxo simples dentro de Alunos, se necessário. |
| E-mail (Resend), Stripe | Pós-v2.0. |
| Configuração de regra de falta por professor | v2.x. |
| Área do aluno | Visão de ecossistema, sem data. |

---

## 9. Roteiro de construção (sessões co-dev)

1. **Sessão 0 — Fundação:** repo, Next.js, tokens de tema (claro+escuro), fontes, layout base com bottom tabs glass.
2. **Sessão 1 — Tela "Hoje" como protótipo de identidade:** orbe, cards de check-in, microinterações, dados mockados. *Critério de aceite: a tela passa sensação de produto premium na mão, antes de qualquer backend.*
3. **Sessão 2 — Supabase:** schema do §5, RLS, auth, seed dos alunos reais.
4. **Sessão 3 — Alunos + cadastro em lote.**
5. **Sessão 4 — Motor de fechamento:** porte e adaptação de `aulas.ts` (esperado − exceções + ajuste), testes com a suíte de casos da v1.
6. **Sessão 5 — Cobrança:** fechamentos, ajuste persistente, template e disparo WhatsApp, estados aberto/enviado/pago.
7. **Sessão 6 — Pendências retroativas + créditos/pacotes.**
8. **Sessão 7 — Polimento:** dark mode, estados vazios, PWA, deploy Vercel, migração dos 2 usuários.

---

## 10. Critérios de sucesso da v2

- Onboarding: professor novo cadastra 10 alunos em ≤ 2 minutos.
- Check-in diário: ≤ 5 segundos, ≤ 2 toques por exceção.
- Fechamento mensal: da abertura do app à mensagem no WhatsApp em ≤ 3 toques por aluno.
- Zero divergência de contagem entre telas (fonte única, herança da v1).
- Reação espontânea de quem vê a tela: "que app é esse?" — a estética como prova da tese.
