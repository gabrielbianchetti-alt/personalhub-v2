"use client";

// Cobrança (§4.3): valor como hero, resumo legível, cobrar em ≤3 toques.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Minus, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { vibra } from "@/lib/haptico";
import type { CobrancaItemVM, ResumoMesVM } from "@/lib/cobranca";
import { formatBRL } from "@/lib/datas";
import {
  renderMensagem,
  TEMPLATE_PACOTE,
  primeiroNome,
  telefoneWa,
  waLink,
} from "@/lib/whatsapp";
import {
  marcarEnviado,
  marcarPago,
  reabrirFechamento,
  salvarAjuste,
  venderPacote,
} from "@/app/actions/cobranca";
import { salvarTelefone } from "@/app/actions/alunos";
import { Sheet } from "./Sheet";

type SheetState =
  | { tipo: "cobrar"; item: CobrancaItemVM }
  | { tipo: "ajuste"; item: CobrancaItemVM }
  | { tipo: "pacote"; item: CobrancaItemVM }
  | null;

const STATUS_ROTULO = { aberto: "aberto", enviado: "enviada", pago: "paga" } as const;

export function CobrancaLista({
  itens,
  resumo,
  mesRef,
  nomeMesAtual,
  template,
}: {
  itens: CobrancaItemVM[];
  resumo: ResumoMesVM;
  mesRef: string;
  nomeMesAtual: string;
  template: string | null;
}) {
  const router = useRouter();
  const [lista, setLista] = useState(itens);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [celebrando, setCelebrando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const setStatus = (alunoId: string, status: CobrancaItemVM["status"]) =>
    setLista((prev) =>
      prev.map((i) => (i.alunoId === alunoId ? { ...i, status } : i)),
    );

  function persistir(acao: () => Promise<void>, desfazer?: () => void) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
      } catch (e) {
        desfazer?.();
        setErro(e instanceof Error ? e.message : "Não salvou — tente de novo.");
      }
    });
  }

  // Enviada no WhatsApp → status + celebração discreta (§4.3).
  const aoEnviar = (item: CobrancaItemVM, link: string) => {
    window.open(link, "_blank", "noopener");
    setSheet(null);
    vibra(15);
    const statusAnterior = item.status;
    setStatus(item.alunoId, "enviado");
    setCelebrando(item.alunoId);
    setTimeout(() => setCelebrando(null), 1800);
    persistir(
      () => marcarEnviado(item.alunoId, mesRef),
      () => setStatus(item.alunoId, statusAnterior),
    );
  };

  const aoPagar = (item: CobrancaItemVM) => {
    vibra();
    const statusAnterior = item.status;
    setStatus(item.alunoId, "pago");
    persistir(
      () => marcarPago(item.alunoId, mesRef),
      () => setStatus(item.alunoId, statusAnterior),
    );
  };

  const aoReabrir = (item: CobrancaItemVM) => {
    const statusAnterior = item.status;
    setStatus(item.alunoId, "aberto");
    persistir(
      () => reabrirFechamento(item.alunoId, mesRef),
      () => setStatus(item.alunoId, statusAnterior),
    );
  };

  if (lista.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
        <p className="font-display text-2xl leading-snug text-text">
          Cadastre seus alunos e os
          <br />
          fechamentos nascem sozinhos 👊
        </p>
        <Link
          href="/alunos/novo"
          className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-white shadow-soft active:opacity-90"
        >
          Cadastrar alunos
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Card flutuante de resumo — 3º lugar sancionado de glass (§6.4). */}
      <div className="glass sticky top-3 z-40 mt-4 rounded-[20px] border border-glass-border px-4 py-3 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Previsto no mês
            </p>
            <p className="font-display text-3xl leading-tight text-text tabular-nums">
              {formatBRL(resumo.totalPrevisto)}
            </p>
          </div>
          <p className="pb-1 text-right text-xs leading-relaxed text-text-muted">
            {resumo.pagos > 0 && (
              <span className="whitespace-nowrap font-medium text-success">
                {resumo.pagos} pagas
              </span>
            )}
            {resumo.pagos > 0 && (resumo.enviados > 0 || resumo.abertos > 0) && " · "}
            {resumo.enviados > 0 && (
              <span className="whitespace-nowrap">{resumo.enviados} enviadas</span>
            )}
            {resumo.enviados > 0 && resumo.abertos > 0 && " · "}
            {resumo.abertos > 0 && (
              <span className="whitespace-nowrap">{resumo.abertos} abertas</span>
            )}
          </p>
        </div>
      </div>

      {erro && (
        <p className="mt-3 rounded-2xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {erro}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3 pb-4">
        {lista.map((item) => (
          <li
            key={item.alunoId}
            className="relative rounded-[20px] bg-surface p-4 shadow-soft"
          >
            {celebrando === item.alunoId && (
              <div className="celebra pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-surface/80">
                <p className="font-display text-xl text-success">Cobrança enviada ✓</p>
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-text">{item.nome}</p>
                <p className="mt-0.5 truncate text-sm text-text-muted" title={item.resumo}>
                  {item.resumo}
                </p>
                {item.ajusteMotivo && (
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    “{item.ajusteMotivo}”
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl leading-tight text-text tabular-nums min-[390px]:text-[1.75rem]">
                  {item.modo === "creditos" && item.ultimoPacote === null
                    ? "—"
                    : formatBRL(item.valor)}
                </p>
                {item.valorAula !== null && (
                  <p className="text-xs text-text-muted">
                    {formatBRL(item.valorAula)}/aula
                  </p>
                )}
                {item.modo !== "creditos" && item.status !== "aberto" && (
                  <span
                    className={`text-xs font-medium ${
                      item.status === "pago" ? "text-success" : "text-accent"
                    }`}
                  >
                    {STATUS_ROTULO[item.status]}
                    {item.status === "pago" && " ✓"}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {item.modo !== "creditos" ? (
                <>
                  {item.status !== "pago" && (
                    <button
                      type="button"
                      aria-label={
                        item.status === "enviado" ? "Cobrar de novo" : "Cobrar no WhatsApp"
                      }
                      onClick={() => setSheet({ tipo: "cobrar", item })}
                      className="min-w-0 flex-1 whitespace-nowrap rounded-full bg-accent py-2.5 text-sm font-medium text-white active:opacity-90"
                    >
                      {item.status === "enviado" ? "Cobrar de novo" : (
                        <>
                          Cobrar
                          <span className="hidden min-[390px]:inline"> no WhatsApp</span>
                        </>
                      )}
                    </button>
                  )}
                  {item.status !== "pago" ? (
                    <button
                      type="button"
                      onClick={() => aoPagar(item)}
                      className="rounded-full bg-surface-soft px-4 py-2.5 text-sm font-medium text-text-muted active:bg-success/15 active:text-success"
                    >
                      <Check size={16} className="inline" /> Pago
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => aoReabrir(item)}
                      className="flex items-center gap-1.5 rounded-full bg-surface-soft px-4 py-2.5 text-sm font-medium text-text-muted active:opacity-80"
                    >
                      <RotateCcw size={14} /> Reabrir
                    </button>
                  )}
                  {item.status === "aberto" && (
                    <button
                      type="button"
                      aria-label={`Ajustar contagem de ${item.nome}`}
                      onClick={() => setSheet({ tipo: "ajuste", item })}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-muted active:bg-accent-soft"
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSheet({ tipo: "pacote", item })}
                  className={`flex-1 rounded-full py-2.5 text-sm font-medium active:opacity-90 ${
                    item.saldo !== null && item.saldo <= 2
                      ? "bg-accent text-white"
                      : "bg-surface-soft text-text"
                  }`}
                >
                  {item.ultimoPacote ? "Vender novo pacote" : "Vender primeiro pacote"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {sheet?.tipo === "cobrar" && (
        <CobrarSheet
          item={sheet.item}
          nomeMesAtual={nomeMesAtual}
          template={template}
          onEnviar={aoEnviar}
          onTelefoneSalvo={(tel) => {
            setLista((prev) =>
              prev.map((i) =>
                i.alunoId === sheet.item.alunoId ? { ...i, telefone: tel } : i,
              ),
            );
            setSheet({ tipo: "cobrar", item: { ...sheet.item, telefone: tel } });
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.tipo === "ajuste" && (
        <AjusteSheet
          item={sheet.item}
          mesRef={mesRef}
          onSalvo={() => {
            setSheet(null);
            router.refresh();
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.tipo === "pacote" && (
        <PacoteSheet
          item={sheet.item}
          onVendido={(link) => {
            if (link) window.open(link, "_blank", "noopener");
            setSheet(null);
            router.refresh();
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

// ── Cobrar: preview da mensagem + telefone inline na 1ª vez (§4.2) ──
function CobrarSheet({
  item,
  nomeMesAtual,
  template,
  onEnviar,
  onTelefoneSalvo,
  onClose,
}: {
  item: CobrancaItemVM;
  nomeMesAtual: string;
  template: string | null;
  onEnviar: (item: CobrancaItemVM, link: string) => void;
  onTelefoneSalvo: (tel: string) => void;
  onClose: () => void;
}) {
  const [tel, setTel] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const telefoneOk = telefoneWa(item.telefone);
  const mensagem = renderMensagem(template, {
    nome: item.nome,
    valor: formatBRL(item.valor),
    mes: nomeMesAtual,
    aulas: item.resumo,
  });

  return (
    <Sheet open title={`Cobrar ${primeiroNome(item.nome)}`} onClose={onClose}>
      {!telefoneOk ? (
        <div>
          <p className="text-sm text-text-muted">
            Primeira cobrança — qual o WhatsApp de {primeiroNome(item.nome)}?
          </p>
          <input
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="(11) 98765-4321"
            inputMode="tel"
            autoFocus
            className="mt-3 w-full rounded-2xl bg-surface px-4 py-3 text-text shadow-soft outline-none placeholder:text-text-muted"
          />
          {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setErro(null);
              if (!telefoneWa(tel)) {
                setErro("Número incompleto — confere o DDD?");
                return;
              }
              startTransition(async () => {
                try {
                  await salvarTelefone(item.alunoId, tel);
                  onTelefoneSalvo(tel);
                } catch (e) {
                  setErro(e instanceof Error ? e.message : "Não salvou.");
                }
              });
            }}
            className="mt-3 w-full rounded-2xl bg-accent py-3 font-medium text-white active:opacity-90 disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar e continuar"}
          </button>
        </div>
      ) : (
        <div>
          <div className="rounded-2xl bg-surface p-4 shadow-soft">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">
              {mensagem}
            </p>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Abre a conversa no WhatsApp com a mensagem pronta. Edite o modelo nas{" "}
            <Link href="/config" className="underline underline-offset-2">
              Configurações
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={() => onEnviar(item, waLink(telefoneOk, mensagem))}
            className="mt-3 w-full rounded-2xl bg-accent py-3.5 font-medium text-white active:opacity-90"
          >
            Abrir WhatsApp
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ── Ajuste manual persistente (lição da v1) ─────────────────────────
function AjusteSheet({
  item,
  mesRef,
  onSalvo,
  onClose,
}: {
  item: CobrancaItemVM;
  mesRef: string;
  onSalvo: () => void;
  onClose: () => void;
}) {
  const [ajuste, setAjuste] = useState(item.ajuste);
  const [motivo, setMotivo] = useState(item.ajusteMotivo ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Sheet open title="Ajustar contagem" onClose={onClose}>
      <p className="text-sm text-text-muted">
        Soma ou tira aulas do fechamento de {primeiroNome(item.nome)}. Fica salvo
        e aparece no resumo.
        {item.modo === "por_aula" &&
          " Como a cobrança é por aula, o ajuste muda o valor final."}
      </p>
      <div className="mt-4 flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label="Menos uma aula"
          onClick={() => setAjuste((a) => a - 1)}
          className="flex size-12 items-center justify-center rounded-full bg-surface text-text shadow-soft active:opacity-80"
        >
          <Minus size={20} />
        </button>
        <p className="w-20 text-center font-display text-4xl text-text tabular-nums">
          {ajuste > 0 ? `+${ajuste}` : ajuste}
        </p>
        <button
          type="button"
          aria-label="Mais uma aula"
          onClick={() => setAjuste((a) => a + 1)}
          className="flex size-12 items-center justify-center rounded-full bg-surface text-text shadow-soft active:opacity-80"
        >
          <Plus size={20} />
        </button>
      </div>
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (opcional)"
        className="mt-4 w-full rounded-2xl bg-surface px-4 py-3 text-[15px] text-text shadow-soft outline-none placeholder:text-text-muted"
      />
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            try {
              await salvarAjuste(item.alunoId, mesRef, ajuste, motivo);
              onSalvo();
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não salvou.");
            }
          });
        }}
        className="mt-3 w-full rounded-2xl bg-accent py-3 font-medium text-white active:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar ajuste"}
      </button>
    </Sheet>
  );
}

// ── Créditos: vender pacote = a cobrança (§4.3) ─────────────────────
function PacoteSheet({
  item,
  onVendido,
  onClose,
}: {
  item: CobrancaItemVM;
  onVendido: (waUrl: string | null) => void;
  onClose: () => void;
}) {
  const [qtd, setQtd] = useState(item.ultimoPacote?.qtd ?? 10);
  const [valor, setValor] = useState(
    item.ultimoPacote ? String(item.ultimoPacote.valor).replace(".", ",") : "",
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const vender = (abrirWhats: boolean) => {
    setErro(null);
    const v = Number(valor.replace(/[R$\s.]/g, "").replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      setErro("Valor do pacote inválido.");
      return;
    }
    startTransition(async () => {
      try {
        await venderPacote(item.alunoId, qtd, v);
        const tel = telefoneWa(item.telefone);
        if (abrirWhats && tel) {
          const msg = renderMensagem(TEMPLATE_PACOTE, {
            nome: item.nome,
            valor: formatBRL(v),
            mes: "",
            aulas: "",
          }).replaceAll("{qtd}", String(qtd));
          onVendido(waLink(tel, msg));
        } else {
          onVendido(null);
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não salvou.");
      }
    });
  };

  return (
    <Sheet open title={`Pacote de ${primeiroNome(item.nome)}`} onClose={onClose}>
      {item.saldo !== null && (
        <p className="text-sm text-text-muted">
          Saldo atual: <span className="font-medium text-text">{item.saldo} aulas</span>
        </p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex flex-1 items-center justify-between rounded-2xl bg-surface px-3 py-2 shadow-soft">
          <button
            type="button"
            aria-label="Menos aulas"
            onClick={() => setQtd((q) => Math.max(1, q - 1))}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text"
          >
            <Minus size={16} />
          </button>
          <p className="font-display text-2xl text-text tabular-nums">{qtd}</p>
          <button
            type="button"
            aria-label="Mais aulas"
            onClick={() => setQtd((q) => q + 1)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-2xl bg-surface px-4 py-3.5 shadow-soft">
          <span className="text-sm text-text-muted">R$</span>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="600"
            inputMode="decimal"
            className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
          />
        </div>
      </div>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => vender(true)}
        className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-medium text-white active:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Vender e cobrar no WhatsApp"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => vender(false)}
        className="mt-2 w-full rounded-2xl py-3 text-sm font-medium text-text-muted active:bg-surface-soft disabled:opacity-60"
      >
        Só registrar a venda
      </button>
    </Sheet>
  );
}
