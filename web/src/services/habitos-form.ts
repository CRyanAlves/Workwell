import type { ConfiguracaoHabito, Habito, IconeHabito } from "../types/habitos";

export const categoriasHabito: {
  icone: IconeHabito;
  titulo: string;
  nome: string;
  meta: number;
  unidades: string[];
}[] = [
  { icone: "water", titulo: "Hidratação", nome: "Beber água", meta: 8, unidades: ["copos"] },
  { icone: "sleep", titulo: "Sono", nome: "Qualidade do sono", meta: 1, unidades: ["registro", "horas"] },
  { icone: "exercise", titulo: "Movimento", nome: "Exercício", meta: 30, unidades: ["min", "vezes"] },
  { icone: "coffee", titulo: "Pausas", nome: "Pausa consciente", meta: 3, unidades: ["pausas", "min"] },
  { icone: "meditation", titulo: "Meditação", nome: "Meditação", meta: 10, unidades: ["min"] },
  {
    icone: "custom",
    titulo: "Personalizado",
    nome: "",
    meta: 1,
    unidades: ["vezes", "min", "horas", "copos", "pausas", "registro"]
  }
];

export function configuracaoInicial(habito?: Habito): ConfiguracaoHabito {
  return habito
    ? {
        nome: habito.nome,
        icone: habito.icone,
        meta: habito.metaConfigurada,
        unidade: habito.unidade,
        frequencia: habito.frequencia,
        diasSemana: [...habito.diasSemana],
        quantidadeSemanal: habito.quantidadeSemanal,
        permitirPausa: habito.permitirPausa,
        lembretesAtivos: habito.lembretesAtivos,
        horarios: [...habito.horarios]
      }
    : {
        nome: "Beber água",
        icone: "water",
        meta: 8,
        unidade: "copos",
        frequencia: "DIARIA",
        diasSemana: [],
        quantidadeSemanal: null,
        permitirPausa: true,
        lembretesAtivos: false,
        horarios: []
      };
}

export function validarFormularioHabito(dados: ConfiguracaoHabito) {
  const erros: Record<string, string> = {};
  if (!dados.nome.trim()) erros.nome = "Informe o nome do hábito.";
  else if (dados.nome.trim().length > 60) erros.nome = "Use no máximo 60 caracteres.";
  if (!Number.isInteger(dados.meta) || dados.meta <= 0 || dados.meta > 1000)
    erros.meta = "Informe uma meta inteira entre 1 e 1.000.";
  if (!categoriasHabito.find((categoria) => categoria.icone === dados.icone)?.unidades.includes(dados.unidade))
    erros.unidade = "Escolha uma unidade compatível.";
  if (!["DIARIA", "DIAS_ESPECIFICOS", "SEMANAL"].includes(dados.frequencia))
    erros.frequencia = "Escolha uma frequência.";
  if (
    dados.frequencia === "DIAS_ESPECIFICOS" &&
    (!dados.diasSemana.length ||
      dados.diasSemana.some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6) ||
      new Set(dados.diasSemana).size !== dados.diasSemana.length)
  )
    erros.diasSemana = "Escolha pelo menos um dia válido, sem repetições.";
  if (
    dados.frequencia === "SEMANAL" &&
    (!dados.quantidadeSemanal ||
      !Number.isInteger(dados.quantidadeSemanal) ||
      dados.quantidadeSemanal < 1 ||
      dados.quantidadeSemanal > 7)
  )
    erros.quantidadeSemanal = "Escolha entre 1 e 7 dias por semana.";
  if (
    dados.horarios.length > 8 ||
    dados.horarios.some((horario) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) ||
    new Set(dados.horarios).size !== dados.horarios.length
  )
    erros.horarios = "Use até oito horários válidos, sem repetições.";
  if (dados.lembretesAtivos && !dados.horarios.length) erros.horarios = "Adicione um horário ou desative os lembretes.";
  return erros;
}
