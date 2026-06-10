-- PersonalHub v2 — schema do §5 da SPEC.
-- Projeto Supabase novo. Rodar no SQL Editor (ordem: 0001 → 0002 → 0003).

create extension if not exists pgcrypto;

-- ── Enums ──────────────────────────────────────────────────────────
create type cobranca_modo     as enum ('mensalidade', 'creditos');
create type aluno_status      as enum ('ativo', 'suspenso');
create type registro_tipo     as enum ('falta', 'extra', 'desmarcada');
create type registro_origem   as enum ('checkin', 'retroativo', 'ajuste');
create type fechamento_status as enum ('aberto', 'enviado', 'pago');

-- ── professores (id = auth.uid()) ──────────────────────────────────
create table professores (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome              text,
  template_mensagem text,                                   -- placeholders {nome},{valor},{mes},{aulas}
  preferencias      jsonb not null default '{}'::jsonb,     -- tema, etc.
  created_at        timestamptz not null default now()
);

-- ── alunos ─────────────────────────────────────────────────────────
create table alunos (
  id            uuid primary key default gen_random_uuid(),
  professor_id  uuid not null references professores (id) on delete cascade,
  nome          text not null,
  valor_mensal  numeric,                                    -- usado se modo = mensalidade
  modo_cobranca cobranca_modo not null default 'mensalidade',
  dias_semana   int[] not null default '{}',                -- ex.: {1,3,5} = seg/qua/sex
  horario       time,                                       -- opcional
  telefone      text,                                       -- opcional (pedido na 1a cobrança)
  status        aluno_status not null default 'ativo',
  detalhes      jsonb not null default '{}'::jsonb,         -- observações/anamnese; sem coluna por campo
  created_at    timestamptz not null default now()
);
create index alunos_professor_idx on alunos (professor_id);

-- ── registros_aula — SÓ EXCEÇÕES. Presença é derivada (ativo estratégico). ──
create table registros_aula (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references professores (id) on delete cascade,
  aluno_id     uuid not null references alunos (id) on delete cascade,
  data         date not null,
  tipo         registro_tipo not null,
  origem       registro_origem not null default 'checkin',
  created_at   timestamptz not null default now(),
  unique (aluno_id, data, tipo)                             -- §5: uma exceção de cada tipo por dia
);
create index registros_aula_professor_idx  on registros_aula (professor_id);
create index registros_aula_aluno_data_idx on registros_aula (aluno_id, data);

-- ── pacotes_creditos — só para alunos modo = creditos ──────────────
create table pacotes_creditos (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references professores (id) on delete cascade,
  aluno_id     uuid not null references alunos (id) on delete cascade,
  qtd_aulas    int not null,
  valor        numeric not null,
  saldo        int not null,                                -- debitado por aula realizada
  created_at   timestamptz not null default now()
);
create index pacotes_creditos_aluno_idx on pacotes_creditos (aluno_id);

-- ── fechamentos ────────────────────────────────────────────────────
create table fechamentos (
  id              uuid primary key default gen_random_uuid(),
  professor_id    uuid not null references professores (id) on delete cascade,
  aluno_id        uuid not null references alunos (id) on delete cascade,
  mes_referencia  date not null,                            -- sempre dia 1
  aulas_esperadas int not null default 0,                  -- snapshot do cálculo
  faltas          int not null default 0,
  extras          int not null default 0,
  ajuste_manual   int not null default 0,                  -- lição da v1: persistente
  ajuste_motivo   text,
  valor_final     numeric not null default 0,
  status          fechamento_status not null default 'aberto',
  enviado_em      timestamptz,
  pago_em         timestamptz,
  created_at      timestamptz not null default now(),
  unique (aluno_id, mes_referencia)                         -- um fechamento por aluno/mês
);
create index fechamentos_professor_idx on fechamentos (professor_id);
