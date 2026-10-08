import { dataSaoPaulo } from "./habitos-api";
import type { PaginaHabitos } from "../types/habitos";

export function lembretesDoMomento(pagina: PaginaHabitos | null, agora = new Date()) {
  if (!pagina || pagina.data !== dataSaoPaulo(agora)) return [];
  const horario = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(agora);
  return pagina.habitos
    .filter(
      (habito) => habito.lembretesAtivos && !habito.pausado && !habito.concluido && habito.horarios.includes(horario)
    )
    .map((habito) => ({ chave: `${pagina.data}-${habito.id}-${horario}`, nome: habito.nome }));
}
