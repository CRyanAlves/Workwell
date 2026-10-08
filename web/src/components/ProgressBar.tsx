type ProgressBarProps = { valor: number; maximo: number; descricao: string; compacto?: boolean };

export function ProgressBar({ valor, maximo, descricao, compacto = false }: ProgressBarProps) {
  const percentual = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0;
  return (
    <div
      className={`progresso-barra${compacto ? " compacto" : ""}`}
      role="progressbar"
      aria-label={descricao}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(percentual)}
    >
      <span style={{ width: `${percentual}%` }} />
    </div>
  );
}
