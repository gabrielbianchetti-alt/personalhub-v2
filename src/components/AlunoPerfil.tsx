"use client";

// Perfil do aluno (§4.2): os 4 dados + telefone, opcionais colapsados em
// "Mais detalhes", suspender como ação — sem aba dedicada.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Pause, Play } from "lucide-react";
import {
  atualizarAluno,
  mudarStatusAluno,
  type CamposAluno,
} from "@/app/actions/alunos";
import { DiasSemanaChips } from "@/components/DiasSemanaChips";
import { horarioCurto } from "@/lib/datas";
import type { ModoCobranca, AlunoStatus } from "@/lib/tipos";

interface AlunoDados {
  id: string;
  nome: string;
  valor_mensal: number | null;
  modo_cobranca: ModoCobranca;
  dias_semana: number[];
  horario: string | null;
  telefone: string | null;
  status: AlunoStatus;
  detalhes: { observacoes?: string; data_inicio?: string };
}

export function AlunoPerfil({
  aluno,
  saldo,
}: {
  aluno: AlunoDados;
  saldo: number | null;
}) {
  const router = useRouter();
  const [campos, setCampos] = useState<CamposAluno>({
    nome: aluno.nome,
    valor: String(aluno.valor_mensal ?? "").replace(".", ","),
    modo: aluno.modo_cobranca,
    dias: aluno.dias_semana,
    horario: horarioCurto(aluno.horario),
    telefone: aluno.telefone ?? "",
    observacoes: aluno.detalhes?.observacoes ?? "",
    dataInicio: aluno.detalhes?.data_inicio ?? "",
  });
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  // "Salvo ✓" some sozinho — confirmação, não estado permanente.
  useEffect(() => {
    if (!salvo) return;
    const t = setTimeout(() => setSalvo(false), 2000);
    return () => clearTimeout(t);
  }, [salvo]);

  const muda = (patch: Partial<CamposAluno>) => {
    setSalvo(false);
    setCampos((c) => ({ ...c, ...patch }));
  };

  const salvar = () =>
    startTransition(async () => {
      setErro(null);
      try {
        await atualizarAluno(aluno.id, campos);
        setSalvo(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não salvou — tente de novo.");
      }
    });

  const alternarStatus = () =>
    startTransition(async () => {
      setErro(null);
      try {
        await mudarStatusAluno(
          aluno.id,
          aluno.status === "ativo" ? "suspenso" : "ativo",
        );
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não salvou — tente de novo.");
      }
    });

  const suspenso = aluno.status === "suspenso";

  return (
    <div className="flex flex-1 flex-col px-5 pt-12 pb-6">
      <div className="flex items-center gap-3">
        <Link
          href="/alunos"
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-full bg-surface text-text-muted shadow-soft"
        >
          <ArrowLeft size={19} />
        </Link>
        <h1 className="min-w-0 truncate font-display text-3xl text-text">
          {aluno.nome}
        </h1>
      </div>

      {suspenso && (
        <p className="mt-3 rounded-2xl bg-warning/15 px-4 py-2.5 text-sm text-text">
          Suspenso — fora de Hoje e da Cobrança. O histórico está guardado.
        </p>
      )}

      {saldo !== null && (
        <div className="mt-4 rounded-[20px] bg-surface p-4 shadow-soft">
          <p className="text-sm text-text-muted">Saldo do pacote</p>
          <p className="font-display text-4xl text-text tabular-nums">
            {saldo} {saldo === 1 || saldo === -1 ? "aula" : "aulas"}
          </p>
          {saldo <= 2 && (
            <p className="mt-1 text-sm text-warning">
              Acabando — venda o próximo na Cobrança.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-soft">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Nome
          </span>
          <input
            value={campos.nome}
            onChange={(e) => muda({ nome: e.target.value })}
            className="rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] text-text outline-none"
          />
        </label>

        <div className="flex items-center gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Valor{campos.modo === "por_aula" ? " da aula" : ""}
            </span>
            <div className="flex items-center gap-1 rounded-xl bg-surface-soft px-3 py-2.5">
              <span className="text-sm text-text-muted">R$</span>
              <input
                value={campos.valor}
                onChange={(e) => muda({ valor: e.target.value })}
                inputMode="decimal"
                className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none"
              />
            </div>
          </label>
          <label className="flex shrink-0 flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Horário
            </span>
            <input
              type="time"
              value={campos.horario}
              onChange={(e) => muda({ horario: e.target.value })}
              className="rounded-xl bg-surface-soft px-2.5 py-2.5 text-sm text-text outline-none"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Cobrança
          </span>
          <div className="grid grid-cols-3 rounded-xl bg-surface-soft p-1">
            {(
              [
                ["mensalidade", "Mensal"],
                ["por_aula", "Por aula"],
                ["creditos", "Pacote"],
              ] as const
            ).map(([modo, rotulo]) => (
              <button
                key={modo}
                type="button"
                onClick={() => muda({ modo })}
                className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                  campos.modo === modo
                    ? "bg-surface text-text shadow-soft"
                    : "text-text-muted"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Dias
          </span>
          <DiasSemanaChips value={campos.dias} onChange={(dias) => muda({ dias })} />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            WhatsApp
          </span>
          <input
            value={campos.telefone}
            onChange={(e) => muda({ telefone: e.target.value })}
            placeholder="(11) 98765-4321"
            inputMode="tel"
            className="rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] text-text outline-none placeholder:text-text-muted"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setDetalhesAbertos((v) => !v)}
        className="mt-3 flex items-center justify-between rounded-[20px] bg-surface px-4 py-3.5 text-sm font-medium text-text shadow-soft"
      >
        Mais detalhes
        <ChevronDown
          size={18}
          className={`text-text-muted transition-transform ${detalhesAbertos ? "rotate-180" : ""}`}
        />
      </button>
      {detalhesAbertos && (
        <div className="mt-2 flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-soft">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Observações
            </span>
            <textarea
              value={campos.observacoes}
              onChange={(e) => muda({ observacoes: e.target.value })}
              rows={3}
              className="resize-none rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] text-text outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Começou em
            </span>
            <input
              type="date"
              value={campos.dataInicio}
              onChange={(e) => muda({ dataInicio: e.target.value })}
              className="rounded-xl bg-surface-soft px-3 py-2.5 text-sm text-text outline-none"
            />
          </label>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      {salvo && <p className="mt-3 text-sm text-success">Salvo ✓</p>}

      <button
        type="button"
        disabled={pending}
        onClick={salvar}
        className="mt-4 rounded-2xl bg-accent py-3.5 font-medium text-white shadow-soft active:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={alternarStatus}
        className="mt-2 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-text-muted active:bg-surface-soft disabled:opacity-60"
      >
        {suspenso ? <Play size={16} /> : <Pause size={16} />}
        {suspenso ? "Reativar aluno" : "Suspender aluno"}
      </button>
    </div>
  );
}
