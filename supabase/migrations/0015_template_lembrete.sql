-- 0015 — Modelo próprio para o LEMBRETE de cobrança (rodar no SQL Editor).
-- O follow-up "enviada · 3d" reenviava o mesmo texto do fechamento; agora o
-- lembrete tem tom leve configurável (fallback no TEMPLATE_LEMBRETE do app).

alter table professores add column template_lembrete text;
