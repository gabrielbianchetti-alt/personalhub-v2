-- PersonalHub v2 — migração 0006: chave Pix do professor.
-- Quando preenchida, a cobrança anexa o "Pix copia e cola" com o valor
-- do fechamento embutido (BR Code estático — sem integração).

alter table professores
  add column if not exists chave_pix text;
