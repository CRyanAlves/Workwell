import { formatarDia } from "../services/habitos-api";

type GraficoHabitosProps = {
  dias: { data: string; valor: number; meta: number; pausado?: boolean }[];
  descricao: string;
};

export function GraficoHabitos({ dias, descricao }: GraficoHabitosProps) {
  return (
    <ul className="habitos-grafico" aria-label={descricao}>
      {dias.map((dia) => (
        <li key={dia.data}>
          <span>{dia.pausado ? "Pausa" : dia.meta ? `${dia.valor}/${dia.meta}` : "—"}</span>
          <div className="habitos-grafico-trilho">
            <div style={{ height: `${dia.meta ? Math.min(100, (dia.valor / dia.meta) * 100) : 0}%` }} />
          </div>
          <small>{formatarDia(dia.data, { weekday: "short" }).replace(".", "")}</small>
        </li>
      ))}
    </ul>
  );
}
