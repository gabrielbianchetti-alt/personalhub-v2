"use client";

// Cobrança (§4.3): valor como hero, resumo legível, cobrar em ≤3 toques.
// Extras: Pix copia e cola, follow-up de enviadas sem resposta e o
// "Fechar o mês" guiado (encadeia os sheets aluno a aluno).

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  ImageIcon,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import { resumoMes, type CobrancaItemVM } from "@/lib/cobranca";
import { formatBRL, listaDatas } from "@/lib/datas";
import { vibra } from "@/lib/haptico";
import { ProgressRing } from "./ProgressRing";
import { Portal } from "./Portal";
import { pixCopiaECola } from "@/lib/pix";
import {
  buscaReciboFile,
  compartilharImagem,
  podeCompartilharArquivo,
} from "@/lib/compartilhar";
import {
  renderMensagem,
  TEMPLATE_LEMBRETE,
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
  | { tipo: "cobrar" | "ajuste" | "pacote" | "recibo"; alunoId: string }
  | null;

/** Dias desde o envio — alimenta o "enviada · 3d" e o tom do follow-up. */
function diasDesde(enviadoEm: string | null): number {
  if (!enviadoEm) return 0;
  const ms = Date.now() - new Date(enviadoEm).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function CobrancaLista({
  itens,
  mesRef,
  nomeMesAtual,
  somenteLeitura = false,
  template,
  chavePix,
  nomeProfessor,
}: {
  itens: CobrancaItemVM[];
  mesRef: string;
  nomeMesAtual: string;
  somenteLeitura?: boolean;
  template: string | null;
  chavePix: string | null;
  nomeProfessor: string | null;
}) {
  const router = useRouter();
  const [lista, setLista] = useState(itens);
  const [sheet, setSheet] = useState<SheetState>(null);
  // Fechamento guiado: fila de alunoIds ainda por cobrar + total da rodada.
  const [guia, setGuia] = useState<{ fila: string[]; total: number } | null>(null);
  const [celebrando, setCelebrando] = useState<string | null>(null);
  const [festa, setFesta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Snackbar reutilizável: undo do "Pago" e confirmação leve do "Reabrir".
  const [toast, setToast] = useState<
    { msg: string; acao?: { rotulo: string; fn: () => void } } | null
  >(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Resumo ao vivo: acompanha os status otimistas desta sessão.
  const resumo = resumoMes(lista);
  const pctRecebido =
    resumo.totalPrevisto > 0 ? resumo.totalRecebido / resumo.totalPrevisto : 0;
  // Item do sheet resolvido na renderização — sempre fresco (telefone, status).
  const sheetItem = sheet ? (lista.find((i) => i.alunoId === sheet.alunoId) ?? null) : null;

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

  const fecharSheet = () => {
    setSheet(null);
    setGuia(null); // sair no meio cancela a rodada guiada
  };

  /** Avança a rodada guiada (ou só fecha o sheet fora dela). */
  const avancar = (doneId: string) => {
    if (!guia) {
      setSheet(null);
      return;
    }
    const fila = guia.fila.filter((id) => id !== doneId);
    if (fila.length > 0) {
      setGuia({ ...guia, fila });
      setSheet({ tipo: "cobrar", alunoId: fila[0] });
    } else {
      setGuia(null);
      setSheet(null);
      setFesta(true);
      vibra(20);
      setTimeout(() => setFesta(false), 2200);
    }
  };

  const iniciarFechamentoGuiado = () => {
    const fila = lista
      .filter((i) => i.modo !== "creditos" && i.status === "aberto")
      .map((i) => i.alunoId);
    if (fila.length === 0) return;
    setGuia({ fila, total: fila.length });
    setSheet({ tipo: "cobrar", alunoId: fila[0] });
  };

  // Enviada no WhatsApp → status + celebração discreta (§4.3).
  const aoEnviar = (item: CobrancaItemVM, link: string) => {
    window.open(link, "_blank", "noopener");
    vibra(15);
    const statusAnterior = item.status;
    setStatus(item.alunoId, "enviado");
    setCelebrando(item.alunoId);
    setTimeout(() => setCelebrando(null), 1800);
    persistir(
      () => marcarEnviado(item.alunoId, mesRef),
      () => setStatus(item.alunoId, statusAnterior),
    );
    avancar(item.alunoId);
  };

  const aoPagar = (item: CobrancaItemVM) => {
    vibra();
    const statusAnterior = item.status;
    setStatus(item.alunoId, "pago");
    persistir(
      () => marcarPago(item.alunoId, mesRef),
      () => setStatus(item.alunoId, statusAnterior),
    );
    // Fecha o loop de feedback do "Pago" (que não tinha celebração) + undo.
    setToast({
      msg: `${primeiroNome(item.nome)} · marcado pago`,
      acao: {
        rotulo: "Desfazer",
        fn: () => {
          setStatus(item.alunoId, statusAnterior);
          persistir(
            () => reabrirFechamento(item.alunoId, mesRef),
            () => setStatus(item.alunoId, "pago"),
          );
        },
      },
    });
  };

  // Reabrir derrete o snapshot e pode recalcular um valor já quitado — então
  // pede confirmação leve (no próprio snackbar) em vez de agir no 1º toque.
  const aoReabrir = (item: CobrancaItemVM) => {
    setToast({
      msg: `Reabrir ${primeiroNome(item.nome)}? O valor pode recalcular.`,
      acao: {
        rotulo: "Reabrir",
        fn: () => {
          setStatus(item.alunoId, "aberto");
          persistir(
            () => reabrirFechamento(item.alunoId, mesRef),
            () => setStatus(item.alunoId, "pago"),
          );
        },
      },
    });
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
          className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-accent-contrast shadow-soft active:opacity-90"
        >
          Cadastrar alunos
        </Link>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Portal>
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-x-0 bottom-24 z-[65] mx-auto flex max-w-[430px] px-4"
          >
            <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-text px-4 py-3 text-bg shadow-soft">
              <span className="text-sm leading-snug">{toast.msg}</span>
              {toast.acao && (
                <button
                  type="button"
                  onClick={() => {
                    const fn = toast.acao!.fn;
                    setToast(null);
                    fn();
                  }}
                  className="shrink-0 text-sm font-semibold underline underline-offset-2 active:opacity-70"
                >
                  {toast.acao.rotulo}
                </button>
              )}
            </div>
          </div>
        </Portal>
      )}

      {festa && (
        <Portal>
          <div
            role="status"
            aria-live="polite"
            className="celebra pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
          >
            <div className="glass rounded-2xl border border-glass-border px-9 py-7 shadow-soft">
              <span className="selo selo-grande text-accent">Mês fechado</span>
            </div>
          </div>
        </Portal>
      )}

      {/* Card flutuante de resumo — 3º lugar sancionado de glass (§6.4).
          position via style: `.glass` é unlayered e sobrepõe a utility
          `.sticky` (layer utilities) do Tailwind v4 — sem isto o card não gruda. */}
      <div
        className="glass sticky top-3 z-40 mt-4 rounded-[14px] border border-glass-border px-4 py-3 shadow-soft"
        style={{ position: "sticky", top: "0.75rem" }}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Previsto no mês
            </p>
            <p className="font-money text-[26px] font-semibold leading-tight text-text">
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
        {/* Recebido x previsto — "quanto já entrou", a pergunta do fim do mês.
            Verde = confirmação (mesma semântica do selo Pago), não dado solto. */}
        {resumo.totalRecebido > 0 && (
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Recebido
              </span>
              <span className="font-money text-sm font-semibold text-success">
                {formatBRL(resumo.totalRecebido)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-success transition-[width] duration-500"
                style={{ width: `${Math.round(pctRecebido * 100)}%` }}
              />
            </div>
          </div>
        )}
        {!somenteLeitura && resumo.abertos > 0 && (
          <button
            type="button"
            onClick={iniciarFechamentoGuiado}
            className="mt-2.5 flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-full bg-accent py-2.5 text-sm font-medium text-accent-contrast active:opacity-90"
          >
            Fechar o mês · {resumo.abertos} {resumo.abertos === 1 ? "aberta" : "abertas"}
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {erro && (
        <p
          role="alert"
          className="mt-3 rounded-2xl bg-danger/10 px-4 py-2.5 text-sm text-danger"
        >
          {erro}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3 pb-4">
        {lista.map((item) => {
          const dias = item.status === "enviado" ? diasDesde(item.enviadoEm) : 0;
          const esquecida = item.status === "enviado" && dias >= 3;
          return (
            <li
              key={item.alunoId}
              className="relative rounded-[14px] bg-surface p-4 shadow-soft"
            >
              {celebrando === item.alunoId && (
                <div
                  role="status"
                  aria-live="polite"
                  className="celebra pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[14px] bg-surface/80"
                >
                  <span className="selo selo-grande text-success">Enviado</span>
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {item.progresso && (
                    <ProgressRing
                      usadas={item.progresso.usadas}
                      qtd={item.progresso.qtd}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-base font-medium text-text">
                      {item.nome}
                      {item.suspenso && (
                        <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-xs font-normal text-text-muted">
                          suspenso
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-text-muted" title={item.resumo}>
                      {item.resumo}
                    </p>
                    {item.ajusteMotivo && (
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        “{item.ajusteMotivo}”
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <p className="font-money text-xl font-semibold leading-tight text-text min-[390px]:text-[22px]">
                    {item.modo === "creditos" && item.ultimoPacote === null
                      ? "—"
                      : formatBRL(item.valor)}
                  </p>
                  {item.valorAula !== null && (
                    <p className="font-money text-[11px] text-text-muted">
                      {formatBRL(item.valorAula)}/aula
                    </p>
                  )}
                  {item.modo !== "creditos" && item.status === "pago" && (
                    <span className="selo mt-1 text-success">Pago</span>
                  )}
                  {item.modo !== "creditos" && item.status === "enviado" && (
                    <span
                      className={`text-xs font-medium ${
                        esquecida ? "text-warning" : "text-accent"
                      }`}
                    >
                      enviada{dias >= 1 && ` · ${dias}d`}
                    </span>
                  )}
                </div>
              </div>

              {/* Em prévia (mês ≠ corrente) não há ações — só os valores. */}
              {!somenteLeitura && (
              <div className="divisor-recibo mt-3 flex items-center gap-2 pt-3">
                {item.modo !== "creditos" ? (
                  <>
                    {item.status !== "pago" && (
                      <button
                        type="button"
                        aria-label={
                          item.status === "enviado"
                            ? "Lembrar no WhatsApp"
                            : "Cobrar no WhatsApp"
                        }
                        onClick={() => setSheet({ tipo: "cobrar", alunoId: item.alunoId })}
                        className={`min-w-0 flex-1 whitespace-nowrap rounded-full py-2.5 text-sm font-medium active:opacity-90 ${
                          item.status === "enviado" && !esquecida
                            ? "bg-accent-soft text-accent"
                            : "bg-accent text-accent-contrast"
                        }`}
                      >
                        {item.status === "enviado" ? (
                          "Lembrar"
                        ) : (
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
                        className="whitespace-nowrap rounded-full bg-surface-soft px-4 py-2.5 text-sm font-medium text-text-muted active:bg-success/15 active:text-success"
                      >
                        <Check size={16} className="inline" /> Pago
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aoReabrir(item)}
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-soft px-4 py-2.5 text-sm font-medium text-text-muted active:opacity-80"
                      >
                        <RotateCcw size={14} /> Reabrir
                      </button>
                    )}
                    {item.status === "aberto" && (
                      <button
                        type="button"
                        aria-label={`Ajustar contagem de ${item.nome}`}
                        onClick={() => setSheet({ tipo: "ajuste", alunoId: item.alunoId })}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-muted active:bg-accent-soft"
                      >
                        <SlidersHorizontal size={16} />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSheet({ tipo: "pacote", alunoId: item.alunoId })}
                    className={`flex-1 whitespace-nowrap rounded-full py-2.5 text-sm font-medium active:opacity-90 ${
                      item.saldo !== null && item.saldo <= 2
                        ? "bg-accent text-accent-contrast"
                        : "bg-surface-soft text-text"
                    }`}
                  >
                    {item.ultimoPacote ? "Vender novo pacote" : "Vender primeiro pacote"}
                  </button>
                )}
              </div>
              )}
            </li>
          );
        })}
      </ul>

      {sheet?.tipo === "cobrar" && sheetItem && (
        <CobrarSheet
          item={sheetItem}
          nomeMesAtual={nomeMesAtual}
          template={template}
          chavePix={chavePix}
          nomeProfessor={nomeProfessor}
          progresso={guia ? { atual: guia.total - guia.fila.length + 1, total: guia.total } : null}
          onEnviar={aoEnviar}
          onPular={guia ? () => avancar(sheetItem.alunoId) : null}
          onTelefone={(tel) =>
            setLista((prev) =>
              prev.map((i) =>
                i.alunoId === sheetItem.alunoId ? { ...i, telefone: tel } : i,
              ),
            )
          }
          onRecibo={() => setSheet({ tipo: "recibo", alunoId: sheetItem.alunoId })}
          onClose={fecharSheet}
        />
      )}
      {sheet?.tipo === "recibo" && sheetItem && (
        <ReciboSheet item={sheetItem} mesRef={mesRef} onClose={() => setSheet(null)} />
      )}
      {sheet?.tipo === "ajuste" && sheetItem && (
        <AjusteSheet
          item={sheetItem}
          mesRef={mesRef}
          onSalvo={() => {
            setSheet(null);
            router.refresh();
          }}
          onClose={fecharSheet}
        />
      )}
      {sheet?.tipo === "pacote" && sheetItem && (
        <PacoteSheet
          item={sheetItem}
          onVendido={(link) => {
            if (link) window.open(link, "_blank", "noopener");
            setSheet(null);
            router.refresh();
          }}
          onClose={fecharSheet}
        />
      )}
    </>
  );
}

// ── Cobrar: preview da mensagem + telefone inline na 1ª vez (§4.2).
//    Quando já enviada vira lembrete; com chave Pix anexa o copia e cola. ──
function CobrarSheet({
  item,
  nomeMesAtual,
  template,
  chavePix,
  nomeProfessor,
  progresso,
  onEnviar,
  onPular,
  onTelefone,
  onRecibo,
  onClose,
}: {
  item: CobrancaItemVM;
  nomeMesAtual: string;
  template: string | null;
  chavePix: string | null;
  nomeProfessor: string | null;
  progresso: { atual: number; total: number } | null;
  onEnviar: (item: CobrancaItemVM, link: string) => void;
  onPular: (() => void) | null;
  onTelefone: (tel: string) => void;
  onRecibo: () => void;
  onClose: () => void;
}) {
  const [tel, setTel] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const telefoneOk = telefoneWa(item.telefone);
  const lembrete = item.status === "enviado";

  const corpo = renderMensagem(lembrete ? TEMPLATE_LEMBRETE : template, {
    nome: item.nome,
    valor: formatBRL(item.valor),
    mes: nomeMesAtual,
    aulas: item.resumo,
    pix: chavePix ?? "",
    dias: listaDatas(item.diasAula),
  });
  const pix =
    chavePix && item.valor > 0
      ? pixCopiaECola({ chave: chavePix, nome: nomeProfessor ?? "", valor: item.valor })
      : null;
  const mensagem = pix ? `${corpo}\n\nPix copia e cola:\n${pix}` : corpo;

  const titulo = `${lembrete ? "Lembrar" : "Cobrar"} ${primeiroNome(item.nome)}${
    progresso ? ` · ${progresso.atual}/${progresso.total}` : ""
  }`;

  return (
    <Sheet open title={titulo} onClose={onClose}>
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
                  onTelefone(tel);
                } catch (e) {
                  setErro(e instanceof Error ? e.message : "Não salvou.");
                }
              });
            }}
            className="mt-3 w-full rounded-2xl bg-accent py-3 font-medium text-accent-contrast active:opacity-90 disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar e continuar"}
          </button>
          {onPular && (
            <button
              type="button"
              onClick={onPular}
              className="mt-2 w-full rounded-2xl py-2.5 text-sm font-medium text-text-muted active:bg-surface-soft"
            >
              Pular este aluno
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="max-h-[40vh] overflow-y-auto rounded-2xl bg-surface p-4 shadow-soft">
            <p className="whitespace-pre-wrap break-all text-[15px] leading-relaxed text-text">
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
            className="mt-3 w-full rounded-2xl bg-accent py-3.5 font-medium text-accent-contrast active:opacity-90"
          >
            Abrir WhatsApp
          </button>
          <div className="mt-2 flex gap-2">
            {pix && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(pix);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 1600);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-surface py-2.5 text-sm font-medium text-text-muted shadow-soft active:opacity-80"
              >
                <Copy size={14} />
                {copiado ? "Copiado ✓" : "Copiar Pix"}
              </button>
            )}
            <button
              type="button"
              onClick={onRecibo}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-surface py-2.5 text-sm font-medium text-text-muted shadow-soft active:opacity-80"
            >
              <ImageIcon size={14} />
              Recibo em imagem
            </button>
          </div>
          {onPular && (
            <button
              type="button"
              onClick={onPular}
              className="mt-2 w-full rounded-2xl py-2.5 text-sm font-medium text-text-muted active:bg-surface-soft"
            >
              Pular este aluno
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ── Recibo no app: preview + compartilhar nativo (sem beco sem saída) ──
function ReciboSheet({
  item,
  mesRef,
  onClose,
}: {
  item: CobrancaItemVM;
  mesRef: string;
  onClose: () => void;
}) {
  const url = `/recibo/${item.alunoId}?mes=${mesRef}`;
  const nomeArquivo = `recibo-${primeiroNome(item.nome).toLowerCase()}-${mesRef}.png`;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Busca o PNG ao abrir — File pronto ANTES do clique preserva o gesto (iOS).
  useEffect(() => {
    let vivo = true;
    let obj: string | null = null;
    (async () => {
      try {
        const f = await buscaReciboFile(url, nomeArquivo);
        if (!vivo) return;
        obj = URL.createObjectURL(f);
        setFile(f);
        setPreviewUrl(obj);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : "Não consegui gerar o recibo.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [url, nomeArquivo]);

  const temShare = file ? podeCompartilharArquivo(file) : false;

  const aoCompartilhar = async () => {
    if (!file) return;
    const r = await compartilharImagem(file);
    if (r === "compartilhado") {
      vibra(15);
      onClose();
    } else if (r === "erro") {
      setErro("Não consegui abrir o compartilhamento.");
    }
    // 'cancelado' = o usuário fechou a folha: silêncio.
  };

  return (
    <Sheet open title="Recibo" onClose={onClose}>
      <div className="flex min-h-[12rem] items-center justify-center rounded-2xl bg-surface p-3 shadow-soft">
        {carregando && <p className="text-sm text-text-muted">Gerando recibo…</p>}
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Recibo de ${item.nome}`}
            className="mx-auto max-h-[48vh] w-auto rounded-xl"
          />
        )}
      </div>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}

      {temShare ? (
        <button
          type="button"
          disabled={!file}
          onClick={aoCompartilhar}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-medium text-accent-contrast active:opacity-90 disabled:opacity-60"
        >
          <Share2 size={18} /> Compartilhar
        </button>
      ) : (
        // Fallback (desktop / navegador sem Web Share nível 2): baixar.
        <a
          href={previewUrl ?? url}
          download={nomeArquivo}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-medium text-accent-contrast active:opacity-90"
        >
          <Download size={18} /> Baixar imagem
        </a>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-2xl py-2.5 text-sm font-medium text-text-muted active:bg-surface-soft"
      >
        Fechar
      </button>
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
        <p className="font-money w-20 text-center text-3xl font-semibold text-text">
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
        className="mt-3 w-full rounded-2xl bg-accent py-3 font-medium text-accent-contrast active:opacity-90 disabled:opacity-60"
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
          <p className="font-money text-xl font-semibold text-text">{qtd}</p>
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
        className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-medium text-accent-contrast active:opacity-90 disabled:opacity-60"
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
