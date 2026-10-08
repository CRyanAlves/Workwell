export type IconeHabito = "water" | "coffee" | "exercise" | "sleep" | "meditation" | "custom";
export type FrequenciaHabito = "DIARIA" | "DIAS_ESPECIFICOS" | "SEMANAL";
export type ConfiguracaoHabito = {
  nome: string;
  icone: IconeHabito;
  meta: number;
  unidade: string;
  frequencia: FrequenciaHabito;
  diasSemana: number[];
  quantidadeSemanal: number | null;
  permitirPausa: boolean;
  lembretesAtivos: boolean;
  horarios: string[];
};
export type Habito = ConfiguracaoHabito & {
  id: number;
  metaConfigurada: number;
  valor: number;
  concluido: boolean;
  pausado: boolean;
  estado: "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
  avaliacaoSono: number | null;
  dataInicio: string;
};
export type DiaHabito = {
  data: string;
  valor: number;
  meta: number;
  pausado: boolean;
  concluido: boolean;
  avaliacaoSono: number | null;
  agendado?: boolean;
};
export type DetalheHabito = Habito & { historico: DiaHabito[]; historicoCompleto: DiaHabito[]; media: number | null };
export type ResumoDia = { data: string; feitos: number; total: number; pausados: number };
export type PaginaHabitos = {
  hoje: string;
  data: string;
  habitos: Habito[];
  totalCadastrados: number;
  resumo: ResumoDia & { sequencia: number; semana: number; insight: string; historico: ResumoDia[] };
  proximoLembrete: { id: number; nome: string; horario: string } | null;
};
export type RegistroHabitoInput = {
  data: string;
  valor: number;
  pausado: boolean;
  avaliacaoSono?: number | null;
  lembretesAtivos?: boolean;
};
