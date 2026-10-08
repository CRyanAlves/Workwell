import type { Habito } from "../types/habitos";
import { HabitoIcone } from "./HabitoIcone";
import { ProgressBar } from "./ProgressBar";

type HabitoCardProps = {
  habito: Habito;
  futuro: boolean;
  salvando: boolean;
  onDetalhe: (habito: Habito, iniciar?: boolean) => void;
  onProgresso: (habito: Habito, valor: number) => void;
};

export function HabitoCard({ habito, futuro, salvando, onDetalhe, onProgresso }: HabitoCardProps) {
  const percentual = Math.min(100, Math.floor((habito.valor / habito.meta) * 100));
  const estados = {
    NAO_INICIADO: "Não iniciado",
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDO: "Concluído",
    PAUSADO: "Pausado neste dia"
  };
  const bloqueado = futuro || salvando || habito.pausado;
  const acao =
    habito.icone === "coffee"
      ? "Iniciar 5 min"
      : habito.icone === "sleep"
        ? "Como dormi?"
        : habito.icone === "meditation"
          ? "Iniciar"
          : "Registrar";
  return (
    <article className={`habito-card estado-${habito.estado.toLowerCase()}`}>
      <button
        className="habito-abrir"
        type="button"
        onClick={() => onDetalhe(habito)}
        aria-label={`Ver detalhes de ${habito.nome}`}
        disabled={salvando}
      >
        <HabitoIcone icone={habito.icone} />
        <span className="habito-descricao">
          <strong>{habito.nome}</strong>
          <span>
            {habito.icone === "sleep" && !habito.valor
              ? "Ainda não registrado"
              : `${habito.valor} de ${habito.meta} ${habito.unidade}`}
          </span>
          <small>{estados[habito.estado]}</small>
        </span>
      </button>
      <div className="habito-progresso">
        <strong>{percentual}%</strong>
        {habito.icone !== "sleep" && (
          <ProgressBar valor={habito.valor} maximo={habito.meta} descricao={`Progresso de ${habito.nome}`} compacto />
        )}
      </div>
      <div className="habito-card-acao">
        {habito.pausado ? (
          <button className="botao-secundario" type="button" onClick={() => onDetalhe(habito)} disabled={salvando}>
            Retomar
          </button>
        ) : habito.icone === "water" ? (
          <div className="habito-contador">
            <button
              type="button"
              aria-label={`Diminuir copos de ${habito.nome}`}
              onClick={() => onProgresso(habito, Math.max(0, habito.valor - 1))}
              disabled={bloqueado || habito.valor <= 0}
            >
              −
            </button>
            <strong>{habito.valor}</strong>
            <button
              type="button"
              aria-label={`Adicionar copo de ${habito.nome}`}
              onClick={() => onProgresso(habito, Math.min(habito.meta, habito.valor + 1))}
              disabled={bloqueado || habito.valor >= habito.meta}
            >
              ＋
            </button>
          </div>
        ) : (
          <button
            className="botao-secundario"
            type="button"
            onClick={() => onDetalhe(habito, ["coffee", "meditation"].includes(habito.icone))}
            disabled={bloqueado || habito.concluido}
          >
            {habito.concluido ? "✓ Concluído" : acao}
          </button>
        )}
      </div>
    </article>
  );
}
