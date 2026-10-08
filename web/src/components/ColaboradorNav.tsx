import { CalendarDays, Clock, House, UsersRound } from "lucide-react";

export type PaginaColaborador = "inicio" | "habitos" | "progresso";
type ColaboradorNavProps = { pagina: PaginaColaborador; onNavegar: (pagina: PaginaColaborador) => void };

export function ColaboradorNav({ pagina, onNavegar }: ColaboradorNavProps) {
  return (
    <nav className="colaborador-nav" aria-label="Navegação do colaborador">
      <button
        type="button"
        className={pagina === "inicio" ? "ativo" : ""}
        aria-current={pagina === "inicio" ? "page" : undefined}
        onClick={() => onNavegar("inicio")}
      >
        <House size={22} strokeWidth={1.5} aria-hidden="true" focusable="false" />
        <span>Início</span>
      </button>
      <button
        type="button"
        className={pagina === "habitos" ? "ativo" : ""}
        aria-current={pagina === "habitos" ? "page" : undefined}
        onClick={() => onNavegar("habitos")}
      >
        <CalendarDays size={22} strokeWidth={1.5} aria-hidden="true" focusable="false" />
        <span>Hábitos</span>
      </button>
      <button
        type="button"
        className={pagina === "progresso" ? "ativo" : ""}
        aria-current={pagina === "progresso" ? "page" : undefined}
        onClick={() => onNavegar("progresso")}
      >
        <Clock size={22} strokeWidth={1.5} aria-hidden="true" focusable="false" />
        <span>Progresso</span>
      </button>
      <button type="button" disabled title="Desafios estarão disponíveis em breve" aria-label="Desafios — em breve">
        <UsersRound size={22} strokeWidth={1.5} aria-hidden="true" focusable="false" />
        <span>Desafios</span>
      </button>
    </nav>
  );
}
