---
description: Roda um ciclo completo do loop de produto do PersonalHub v2 (pesquisa → estratégia → crítica → build → avaliação → registro)
---

# /ciclo — Orquestrador do loop de produto

Você é o orquestrador. Execute as fases em ordem. Argumento opcional do usuário: $ARGUMENTS (pode ser uma pergunta de pesquisa específica ou o nome de uma feature para pular direto à fase 2).

## Fase 0 — Estado
1. Leia `DECISIONS.md`, `PRIORIZACAO.md` e `docs/loop/ESTADO.md` (crie se não existir, com número do ciclo = 1).
2. Se o ciclo anterior está com build APROVADO mas sem resultado de uso registrado em `docs/loop/sinais.md`, PARE e pergunte ao usuário: "Ciclo NN foi lançado — o que aconteceu no uso real? (alunos ativos, treinos registrados, travamentos)". O loop não avança sem fechar o anterior. Registre a resposta em sinais.md antes de continuar.

## Fase 1 — Pesquisa
1. Determine a pergunta do ciclo: use $ARGUMENTS se fornecido; senão, a primeira pergunta pendente em DECISIONS.md (tabela de pendências) ou "Perguntas que surgiram" da última pesquisa.
2. Invoque o subagent **pesquisador** com essa pergunta única.
3. Se a confiança retornada for "baixa", pergunte ao usuário se quer aprofundar (mais uma rodada de pesquisa) ou seguir com o que tem. Não decida sozinho.

## Fase 2 — Estratégia
1. Invoque o subagent **estrategista**.
2. Se retornar "pesquisa insuficiente", volte à Fase 1 com a pergunta que ele indicou (máximo 1 volta; na segunda vez, escale ao usuário).

## Fase 3 — Crítica (loop interno, máx. 3 iterações)
1. Invoque o subagent **critico** com a spec.
2. APROVAR → Fase 4. APROVAR COM CORTES → aplique os cortes na spec você mesmo (Edit) e siga. REPROVAR → devolva ao **estrategista** com os furos; nova spec volta ao crítico.
3. Se após 3 iterações não houver APROVAR, PARE e apresente o impasse ao usuário com as posições dos dois agentes. Humano desempata.

## Fase 4 — Gate humano
Apresente ao usuário: spec final (resumo de 10 linhas), score, cortes feitos, riscos aceitos. Pergunte: "Buildar? (sim / ajustar / abortar)". NUNCA inicie build sem esse sim explícito.

## Fase 5 — Build
Você mesmo implementa, na sessão principal (não delegue implementação a subagent — contexto do codebase importa). Siga a spec à risca: Escopo FORA é proibido. Commits pequenos, mensagens referenciando o ciclo (ex: `ciclo-03: feedback pós-treino — model + RLS`).

## Fase 6 — Avaliação
1. Invoque o subagent **avaliador** com o caminho da spec.
2. REPROVADO → corrija na sessão principal e reinvoque (máx. 2 rodadas; depois escale ao usuário).
3. APROVADO/APROVADO COM PENDÊNCIAS → siga.

## Fase 7 — Registro e fechamento
1. Adicione entrada em `DECISIONS.md` (decisão do ciclo, evidência, descartes).
2. Atualize `PRIORIZACAO.md` (linha no histórico de ciclos).
3. Atualize `docs/loop/ESTADO.md`: número do ciclo +1, fase = "aguardando sinais de uso", pendências manuais do avaliador.
4. Diga ao usuário exatamente o que medir na semana seguinte (da seção "Métrica de sucesso" da spec) e encerre.

## Regras globais
- Uma feature por ciclo. Sem exceção.
- Cada subagent retorna resumo, não despejo — se um retorno vier gigante, resuma antes de prosseguir.
- Qualquer conflito entre agente e DECISIONS.md → DECISIONS.md vence; registre a objeção do agente como pendência.
- Tokens: este comando invoca 3-4 subagents. Se o usuário pedir "ciclo rápido", pule a Fase 1 (use pesquisa existente) e reduza a crítica a 1 iteração.
