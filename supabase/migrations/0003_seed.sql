-- PersonalHub v2 — SEED (template). Os 5 alunos do mock da Sessão 1.
--
-- COMO USAR:
--   1. Crie sua conta pelo /login (o trigger cria a linha em professores).
--   2. Pegue seu uuid:  select id, email from auth.users;
--   3. Troque 'SEU_PROFESSOR_ID' abaixo pelo seu uuid e rode o bloco.
--
-- Mantido comentado de propósito — não roda no setup do schema.

/*
insert into alunos (professor_id, nome, valor_mensal, modo_cobranca, dias_semana, horario, status) values
  ('SEU_PROFESSOR_ID', 'Marina Lopes',   300, 'mensalidade', '{1,3,5}',     '06:30', 'ativo'),
  ('SEU_PROFESSOR_ID', 'Rafael Augusto', 280, 'mensalidade', '{2,4}',       '07:30', 'ativo'),
  ('SEU_PROFESSOR_ID', 'Juliana Reis',   350, 'mensalidade', '{1,3,5}',     '09:00', 'ativo'),
  ('SEU_PROFESSOR_ID', 'Pedro Henrique', 400, 'mensalidade', '{1,2,3,4,5}', '17:00', 'ativo'),
  ('SEU_PROFESSOR_ID', 'Camila Duarte',  320, 'mensalidade', '{2,4}',       '18:30', 'ativo');
*/
