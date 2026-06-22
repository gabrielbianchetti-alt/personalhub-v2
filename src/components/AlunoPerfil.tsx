"use client";

// Perfil do aluno (§4.2): os 4 dados + telefone, opcionais colapsados em
// "Mais detalhes", suspender como ação — sem aba dedicada.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Pause, Play, Plus, X } from "lucide-react";
import {
  atualizarAluno,
  mudarStatusAluno,
  type CamposAluno,
} from "@/app/actions/alunos";
import { agendarAulaPacote, cancelarAulaPacote } from "@/app/actions/pacote";
import { DiasHorarios } from "@/components/DiasHorarios";
import { ProgressRing } from "@/components/ProgressRing";
import { Sheet } from "@/components/Sheet";
import { dataCurta, horarioCurto } from "@/lib/datas";
import type { ProgressoPacote } from "@/lib/aulas";
import type { ModoCobranca, AlunoStatus } from "@/lib/tipos";

export interface AulaPacoteVM {
  id: string;
  data: string; // "YYYY-MM-DD"
  horario: string; // "HH:MM" ou ""
}

export interface HistoricoVM {
  nomeMes: string;
  realizadas: number;
  faltas: number;
  extras: number;
  ultimasFaltas: string[]; // ["03/06", "19/05"]
  desde: string | null; // "junho de 2026"
}

interface AlunoDados {
  id: string;
  nome: string;
  valor_mensal: number | null;
  modo_cobranca: ModoCobranca;
  dias_semana: number[];
  horarios: Record<string, string> | null;
  horario: string | null;
  telefone: string | null;
  status: AlunoStatus;
  detalhes: { observacoes?: string; data_inicio?: string };
}

// Monta o mapa dia->hora do estado inicial: usa horarios; se vazio (aluno
// pré-0007), cai no horário único legado pra cada dia marcado.
function horariosIniciais(a: AlunoDados): Record<string, string> {
  if (a.horarios && Object.keys(a.horarios).length > 0) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(a.horarios)) out[k] = (v ?? "").slice(0, 5);
    return out;
  }
  const hora = horarioCurto(a.horario);
  return Object.fromEntries(a.dias_semana.map((d) => [String(d), hora]));
}

export function AlunoPerfil({
  aluno,
  progresso,
  aulasPacote,
  temPacote,
  historico,
}: {
  aluno: AlunoDados;
  progresso: ProgressoPacote | null;
  aulasPacote: AulaPacoteVM[];
  temPacote: boolean;
  historico: HistoricoVM | null;
}) {
  const router = useRouter();
  const ehPacote = aluno.modo_cobranca === "creditos";
  const [campos, setCampos] = useState<CamposAluno>({
    nome: aluno.nome,
    valor: String(aluno.valor_mensal ?? "").replace(".", ","),
    modo: aluno.modo_cobranca,
    horarios: horariosIniciais(aluno),
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

      {ehPacote && (
        <PacotePainel
          alunoId={aluno.id}
          progresso={progresso}
          aulas={aulasPacote}
          temPacote={temPacote}
        />
      )}

      {historico && <HistoricoPainel h={historico} />}

      <div className="mt-4 flex flex-col gap-3 rounded-[14px] bg-surface p-4 shadow-soft">
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

        <label className="flex flex-col gap-1">
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

        {/* Pacote não tem agenda fixa — as aulas são marcadas (painel acima). */}
        {!ehPacote && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Dias e horários
            </span>
            <DiasHorarios
              value={campos.horarios}
              onChange={(horarios) => muda({ horarios })}
            />
          </div>
        )}

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
        className="mt-3 flex items-center justify-between rounded-[14px] bg-surface px-4 py-3.5 text-sm font-medium text-text shadow-soft"
      >
        Mais detalhes
        <ChevronDown
          size={18}
          className={`text-text-muted transition-transform ${detalhesAbertos ? "rotate-180" : ""}`}
        />
      </button>
      {detalhesAbertos && (
        <div className="mt-2 flex flex-col gap-3 rounded-[14px] bg-surface p-4 shadow-soft">
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
        className="mt-4 rounded-2xl bg-accent py-3.5 font-medium text-accent-contrast shadow-soft active:opacity-90 disabled:opacity-60"
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

// ── Mini-histórico (registros_aula como ativo, §5): frequência do mês e
//    últimas faltas, lendo dados que já são buscados. Só mensalidade/por_aula. ──
function HistoricoPainel({ h }: { h: HistoricoVM }) {
  return (
    <div className="mt-4 rounded-[14px] bg-surface p-4 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        Em {h.nomeMes}
      </p>
      <p className="mt-1 text-text">
        <span className="font-money text-2xl font-semibold">{h.realizadas}</span>{" "}
        {h.realizadas === 1 ? "aula" : "aulas"}
        {h.faltas > 0 && ` · ${h.faltas} ${h.faltas === 1 ? "falta" : "faltas"}`}
        {h.extras > 0 && ` · ${h.extras} ${h.extras === 1 ? "extra" : "extras"}`}
      </p>
      {h.ultimasFaltas.length > 0 && (
        <p className="mt-1 text-sm text-text-muted">
          Últimas faltas: {h.ultimasFaltas.join(", ")}
        </p>
      )}
      {h.desde && (
        <p className="mt-0.5 text-sm text-text-muted">Treina desde {h.desde}</p>
      )}
    </div>
  );
}

// ── Painel do pacote: SÓ status (anel) + botão que abre o sheet de marcar.
//    A marcação fica separada da configuração do aluno (sheet dedicado). ──
function PacotePainel({
  alunoId,
  progresso,
  aulas,
  temPacote,
}: {
  alunoId: string;
  progresso: ProgressoPacote | null;
  aulas: AulaPacoteVM[];
  temPacote: boolean;
}) {
  const [sheetAberto, setSheetAberto] = useState(false);

  if (!temPacote) {
    return (
      <div className="mt-4 rounded-[14px] bg-surface p-4 text-sm text-text-muted shadow-soft">
        Sem pacote ativo. Venda o primeiro pacote na aba{" "}
        <strong className="text-text">Cobrança</strong>.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[14px] bg-surface p-4 shadow-soft">
      {progresso && (
        <div className="flex items-center gap-3">
          <ProgressRing usadas={progresso.usadas} qtd={progresso.qtd} size={52} />
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-text">
              {progresso.restantes}{" "}
              {progresso.restantes === 1 ? "aula livre" : "aulas livres"}
            </p>
            <p className="text-sm text-text-muted">
              {progresso.usadas} feita{progresso.usadas === 1 ? "" : "s"}
              {progresso.agendadas > 0 &&
                ` · ${progresso.agendadas} agendada${progresso.agendadas === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setSheetAberto(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-medium text-accent-contrast active:opacity-90"
      >
        <Plus size={18} strokeWidth={2.4} />
        Marcar aula
      </button>

      {sheetAberto && (
        <MarcarAulaPacoteSheet
          alunoId={alunoId}
          aulas={aulas}
          onClose={() => setSheetAberto(false)}
        />
      )}
    </div>
  );
}

// Sheet dedicado de marcação — fora da configuração do aluno.
function MarcarAulaPacoteSheet({
  alunoId,
  aulas,
  onClose,
}: {
  alunoId: string;
  aulas: AulaPacoteVM[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const agendar = () => {
    setErro(null);
    if (!data) {
      setErro("Escolha o dia da aula.");
      return;
    }
    startTransition(async () => {
      try {
        await agendarAulaPacote(alunoId, data, hora);
        setData("");
        setHora("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não consegui marcar.");
      }
    });
  };

  const cancelar = (id: string) =>
    startTransition(async () => {
      setErro(null);
      try {
        await cancelarAulaPacote(id, alunoId);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não consegui cancelar.");
      }
    });

  return (
    <Sheet open title="Marcar aula" onClose={onClose}>
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Dia
          </span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full min-w-0 rounded-xl bg-surface px-3 py-2.5 text-sm text-text shadow-soft outline-none"
          />
        </label>
        <label className="flex shrink-0 flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Hora
          </span>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="rounded-xl bg-surface px-2.5 py-2.5 text-sm text-text shadow-soft outline-none"
          />
        </label>
      </div>
      <p className="mt-1.5 text-xs text-text-muted">
        Pode marcar aula de hoje, agendar pra frente ou lançar uma passada (se
        esqueceu no dia). Aparece no Hoje no dia certo.
      </p>

      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={agendar}
        className="mt-3 w-full rounded-2xl bg-accent py-3 font-medium text-accent-contrast active:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Marcar aula"}
      </button>

      {aulas.length > 0 && (
        <>
          <p className="mt-4 mb-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
            Aulas marcadas
          </p>
          <ul className="flex max-h-[32vh] flex-col gap-1 overflow-y-auto">
            {aulas.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 shadow-soft"
              >
                <span className="text-sm text-text">
                  {dataCurta(a.data)}
                  {a.horario && ` · ${a.horario}`}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => cancelar(a.id)}
                  aria-label="Cancelar aula"
                  className="-m-2 p-2 text-text-muted active:text-danger disabled:opacity-60"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
