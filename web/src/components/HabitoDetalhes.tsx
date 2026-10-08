import { useEffect, useRef, useState } from "react";
import { detalharHabito } from "../services/habitos-api";
import { categoriasHabito } from "../services/habitos-form";
import type { DetalheHabito, Habito, RegistroHabitoInput } from "../types/habitos";
import { Escala } from "./Escala";
import { GraficoHabitos } from "./GraficoHabitos";
import { HabitoIcone } from "./HabitoIcone";
import { ProgressBar } from "./ProgressBar";

type HabitoDetalhesProps = {
  usuarioId: number;
  habito: Habito;
  data: string;
  futuro: boolean;
  iniciar: boolean;
  salvando: boolean;
  onFechar: () => void;
  onEditar: (habito: Habito) => void;
  onSalvar: (id: number, dados: RegistroHabitoInput) => Promise<unknown>;
  onExcluir: (id: number) => Promise<unknown>;
};

export function HabitoDetalhes({
  usuarioId,
  habito,
  data,
  futuro,
  iniciar,
  salvando,
  onFechar,
  onEditar,
  onSalvar,
  onExcluir
}: HabitoDetalhesProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [detalhe, setDetalhe] = useState<DetalheHabito | null>(null);
  const [valor, setValor] = useState(habito.valor);
  const [pausado, setPausado] = useState(habito.pausado);
  const [lembretes, setLembretes] = useState(habito.lembretesAtivos);
  const [sono, setSono] = useState(habito.avaliacaoSono ?? 3);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const excluirRef = useRef<HTMLButtonElement>(null);
  const confirmacaoRef = useRef<HTMLElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const duracao = habito.icone === "coffee" ? 5 : Math.min(10, Math.max(1, habito.meta - habito.valor));
  const [termino, setTermino] = useState<number | null>(() =>
    iniciar && !futuro && !habito.pausado ? Date.now() + duracao * 60_000 : null
  );
  const [restante, setRestante] = useState(duracao * 60);
  const timerDisponivel = ["coffee", "meditation"].includes(habito.icone);
  const categoria = categoriasHabito.find((item) => item.icone === habito.icone)?.titulo;
  const faltam = Math.max(0, habito.meta - valor);
  const unidadeRestante =
    faltam === 1
      ? (({ copos: "copo", pausas: "pausa", horas: "hora", vezes: "vez" } as Record<string, string>)[habito.unidade] ??
        habito.unidade)
      : habito.unidade;
  const percentual = Math.min(100, Math.floor((valor / habito.meta) * 100));

  useEffect(() => {
    if (confirmarExclusao) {
      confirmacaoRef.current?.scrollIntoView({ block: "nearest" });
      cancelarRef.current?.focus();
    }
  }, [confirmarExclusao]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (origem?.isConnected) origem.focus();
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    detalharHabito(usuarioId, habito.id, data)
      .then((dados) => {
        if (ativo) {
          setDetalhe(dados);
          setErro("");
        }
      })
      .catch((falha: Error) => {
        if (ativo) setErro(falha.message);
      });
    return () => {
      ativo = false;
    };
  }, [usuarioId, habito.id, data, tentativa]);

  useEffect(() => {
    if (!termino) return;
    const verificar = () => setRestante(Math.max(0, Math.ceil((termino - Date.now()) / 1000)));
    const intervalo = window.setInterval(verificar, 500);
    window.addEventListener("focus", verificar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", verificar);
    };
  }, [termino]);

  function ajustar(novo: number) {
    setValor(Math.max(0, Math.min(Math.max(habito.meta, habito.valor), novo)));
  }

  async function salvar() {
    setErro("");
    if (!Number.isInteger(valor) || valor < 0 || valor > Math.max(habito.meta, habito.valor)) {
      setErro("Informe um progresso válido, sem ultrapassar a meta.");
      return;
    }
    try {
      await onSalvar(habito.id, {
        data,
        valor,
        pausado,
        avaliacaoSono: habito.icone === "sleep" ? sono : null,
        lembretesAtivos: lembretes
      });
      onFechar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar seu progresso.");
    }
  }

  async function excluir() {
    setErro("");
    try {
      await onExcluir(habito.id);
      onFechar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível excluir o hábito. Tente novamente.");
    }
  }

  function cancelarExclusao() {
    setConfirmarExclusao(false);
    window.requestAnimationFrame(() => excluirRef.current?.focus());
  }

  return (
    <dialog
      className="habito-drawer"
      ref={dialogRef}
      aria-labelledby="habito-detalhe-titulo"
      onCancel={(evento) => {
        evento.preventDefault();
        if (!salvando) onFechar();
      }}
      onClick={(evento) => {
        const rect = evento.currentTarget.getBoundingClientRect();
        if (
          !salvando &&
          evento.target === evento.currentTarget &&
          (evento.clientX < rect.left ||
            evento.clientX > rect.right ||
            evento.clientY < rect.top ||
            evento.clientY > rect.bottom)
        )
          onFechar();
      }}
    >
      <div className="habito-drawer-alca" aria-hidden="true" />
      <header className="habito-drawer-cabecalho">
        <HabitoIcone icone={habito.icone} />
        <div>
          <h2 id="habito-detalhe-titulo">{habito.nome}</h2>
          <p>
            {categoria}
            {" · "}
            {habito.frequencia === "SEMANAL" ? `${habito.quantidadeSemanal} dias por semana` : "Meta diária"}
          </p>
        </div>
        <button
          className="dialog-fechar"
          type="button"
          aria-label="Fechar detalhes"
          onClick={onFechar}
          disabled={salvando}
        >
          ×
        </button>
      </header>
      <div className="habito-drawer-conteudo">
        <section className="painel habito-detalhe-progresso">
          <div className="habito-detalhe-resumo">
            <div>
              <h3>
                {valor} de {habito.meta} {habito.unidade}
              </h3>
              <p>
                {valor >= habito.meta
                  ? "Você chegou à sua meta. Respeite seu ritmo."
                  : `Restante para sua meta: ${faltam} ${unidadeRestante}.`}
              </p>
              <ProgressBar valor={valor} maximo={habito.meta} descricao={`Progresso de ${habito.nome}`} />
            </div>
            <div
              className="habito-anel"
              style={{ background: `conic-gradient(var(--cor-menta) ${percentual}%, var(--cor-verde-claro) 0)` }}
              aria-label={`${percentual}% da meta`}
            >
              <strong>{percentual}%</strong>
            </div>
          </div>
          {futuro && <p className="habito-nota">Esse dia ainda não chegou. Você pode consultar sua programação.</p>}
          <div className="habito-detalhe-controles">
            <div className="habito-contador">
              <button
                type="button"
                aria-label="Diminuir progresso"
                disabled={futuro || pausado || salvando || valor <= 0}
                onClick={() => ajustar(valor - 1)}
              >
                −
              </button>
              <strong>
                {valor} {habito.unidade}
              </strong>
              <button
                type="button"
                aria-label="Aumentar progresso"
                disabled={futuro || pausado || salvando || valor >= habito.meta}
                onClick={() => ajustar(valor + 1)}
              >
                ＋
              </button>
            </div>
            <button
              type="button"
              className="botao-primario"
              disabled={futuro || pausado || salvando || valor >= habito.meta}
              onClick={() => ajustar(valor + 1)}
            >
              Adicionar 1 {habito.unidade === "copos" ? "copo" : habito.unidade === "pausas" ? "pausa" : habito.unidade}
            </button>
          </div>
          {["exercise", "custom"].includes(habito.icone) && (
            <label className="habito-registro-campo">
              Progresso em {habito.unidade}
              <input
                type="number"
                min={0}
                max={Math.max(habito.meta, habito.valor)}
                step={1}
                value={Number.isNaN(valor) ? "" : valor}
                onChange={(evento) => setValor(evento.target.value === "" ? NaN : Number(evento.target.value))}
                disabled={futuro || pausado || salvando}
              />
            </label>
          )}
          {habito.icone === "sleep" && (
            <div className="habito-sono">
              <Escala
                titulo="Qualidade do sono"
                descricao="Como você percebeu seu descanso?"
                valor={sono}
                inicio="Ruim"
                fim="Excelente"
                disabled={futuro || pausado || salvando}
                onChange={(nota) => {
                  setSono(nota);
                  if (habito.unidade === "registro") setValor(habito.meta);
                }}
              />
              {habito.unidade === "horas" && (
                <label className="habito-registro-campo">
                  Horas de sono
                  <input
                    type="number"
                    min={0}
                    max={habito.meta}
                    step={1}
                    value={valor}
                    onChange={(evento) => ajustar(Number(evento.target.value))}
                    disabled={futuro || pausado || salvando}
                  />
                </label>
              )}
            </div>
          )}
          {timerDisponivel && (
            <div className="habito-timer">
              {termino ? (
                <>
                  <strong aria-live="off">
                    {String(Math.floor(restante / 60)).padStart(2, "0")}:{String(restante % 60).padStart(2, "0")}
                  </strong>
                  <p>
                    {restante
                      ? "Faça uma pausa no seu ritmo. Ao concluir, registre a sessão."
                      : "Seu momento de cuidado terminou. Você pode registrar a sessão."}
                  </p>
                  <button
                    className="botao-secundario"
                    type="button"
                    disabled={restante > 0 || futuro || pausado || salvando || valor >= habito.meta}
                    onClick={() => {
                      ajustar(valor + (habito.unidade === "pausas" ? 1 : duracao));
                      setTermino(null);
                    }}
                  >
                    Registrar sessão
                  </button>
                  <button type="button" className="habitos-link" onClick={() => setTermino(null)} disabled={salvando}>
                    Encerrar sem registrar
                  </button>
                </>
              ) : (
                <button
                  className="botao-secundario"
                  type="button"
                  disabled={futuro || pausado || salvando || valor >= habito.meta}
                  onClick={() => {
                    setRestante(duracao * 60);
                    setTermino(Date.now() + duracao * 60_000);
                  }}
                >
                  Iniciar {duracao} min
                </button>
              )}
            </div>
          )}
        </section>
        <section className="painel">
          <div className="painel-titulo">
            <h3>Últimos 7 dias</h3>
            <small>
              {detalhe?.media == null ? "Sem registros no período" : `Média: ${detalhe.media} ${habito.unidade}`}
            </small>
          </div>
          {detalhe ? (
            <GraficoHabitos
              dias={detalhe.historico.map((dia) => ({ ...dia, meta: dia.agendado ? dia.meta : 0 }))}
              descricao={`Histórico de ${habito.nome}`}
            />
          ) : (
            <p role="status">Carregando histórico…</p>
          )}
        </section>
        <section className="painel habito-lembrete-config">
          <div>
            <h3>Lembrete</h3>
            <p>{habito.horarios.length ? habito.horarios.join(" · ") : "Nenhum horário configurado"}</p>
          </div>
          <button
            className="habito-switch"
            type="button"
            role="switch"
            aria-checked={lembretes}
            aria-label="Ativar lembrete do hábito"
            disabled={salvando || !habito.horarios.length}
            onClick={() => setLembretes(!lembretes)}
          >
            <span />
          </button>
        </section>
        <section className="painel habito-detalhe-acoes">
          <button type="button" disabled={salvando} onClick={() => onEditar(habito)}>
            Editar meta e frequência <span aria-hidden="true">›</span>
          </button>
          <button
            type="button"
            disabled={salvando || futuro || !habito.permitirPausa}
            onClick={() => setPausado(!pausado)}
          >
            {pausado ? "Retomar neste dia" : "Pausar por hoje"}
            <span aria-hidden="true">›</span>
          </button>
          {!habito.permitirPausa && <small>Você pode permitir pausas na edição do hábito.</small>}
          <details>
            <summary>Ver histórico completo</summary>
            {detalhe?.historicoCompleto.length ? (
              <ul className="habito-historico-completo">
                {[...detalhe.historicoCompleto].reverse().map((registro) => (
                  <li key={registro.data}>
                    <time dateTime={registro.data}>{registro.data.split("-").reverse().join("/")}</time>
                    <span>
                      {registro.pausado
                        ? "Pausado neste dia"
                        : `${registro.valor} de ${registro.meta} ${habito.unidade}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Seu histórico aparecerá após os primeiros registros.</p>
            )}
          </details>
          <button
            type="button"
            className="habito-excluir"
            ref={excluirRef}
            disabled={salvando}
            onClick={() => setConfirmarExclusao(true)}
          >
            Excluir hábito <span aria-hidden="true">›</span>
          </button>
        </section>
        {confirmarExclusao && (
          <section
            className="painel habito-exclusao-confirmacao"
            ref={confirmacaoRef}
            aria-labelledby="habito-exclusao-titulo"
          >
            <h3 id="habito-exclusao-titulo">Excluir {habito.nome}?</h3>
            <p>
              O hábito será removido da sua lista e os lembretes serão desativados. Os registros anteriores serão
              mantidos.
            </p>
          </section>
        )}
        {pausado && (
          <p className="habito-nota" role="status">
            Tudo bem diminuir o ritmo hoje. Seu hábito estará disponível novamente no próximo dia programado.
          </p>
        )}
        {erro && (
          <div className="feedback erro" role="alert">
            <p>{erro}</p>
            {!detalhe && (
              <button className="botao-secundario" type="button" onClick={() => setTentativa(tentativa + 1)}>
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
      <footer className="habito-drawer-rodape">
        {confirmarExclusao ? (
          <>
            <button
              type="button"
              className="botao-secundario"
              onClick={cancelarExclusao}
              disabled={salvando}
              ref={cancelarRef}
            >
              Cancelar exclusão
            </button>
            <button
              type="button"
              className="botao-primario habito-excluir-confirmar"
              onClick={() => void excluir()}
              disabled={salvando}
            >
              {salvando ? "Excluindo…" : "Confirmar exclusão"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="botao-secundario" onClick={onFechar} disabled={salvando}>
              Fechar
            </button>
            <button
              className="botao-primario"
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || futuro || !detalhe}
            >
              {salvando ? "Salvando…" : "Salvar progresso"}
            </button>
          </>
        )}
      </footer>
    </dialog>
  );
}
