-- PersonalHub v2 — migração 0010: tipo 'aula' (aula marcada de pacote).
-- Aluno de pacote não tem agenda fixa; cada aula vira um evento tipo 'aula'.
-- IMPORTANTE: rode SOZINHA no SQL Editor (ALTER TYPE ADD VALUE não pode
-- compartilhar transação com consultas que usem o valor novo).

alter type registro_tipo add value if not exists 'aula';
