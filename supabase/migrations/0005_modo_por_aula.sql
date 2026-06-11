-- PersonalHub v2 — migração 0005: 3º modo de cobrança "por_aula".
-- Valor da aula × aulas realizadas no mês (total varia mês a mês).
-- A coluna alunos.valor_mensal guarda o VALOR DA AULA quando modo = por_aula.
--
-- IMPORTANTE: rode este comando SOZINHO no SQL Editor (ALTER TYPE ... ADD VALUE
-- não pode ser usado na mesma transação que consultas que usem o valor novo).

alter type cobranca_modo add value if not exists 'por_aula';
