import { adicionarDias, chaveData } from "../../utils/data.js";

export type RegistroRegra = {
  data: Date;
  valor: number;
  pausado: boolean;
  concluido: boolean;
  metaAlvo: number | null;
  avaliacaoSono: number | null;
};
export type MetaRegra = {
  id: number;
  frequenciaAlvo: number;
  periodo: string;
  diasSemana: number[];
  quantidadeSemanal: number | null;
  dataInicio: Date;
  dataFim: Date | null;
  registros: RegistroRegra[];
};

export function inicioSemana(data: Date) {
  return adicionarDias(data, -data.getUTCDay());
}

export function diasDoPeriodo(data: Date, quantidade = 7) {
  return Array.from({ length: quantidade }, (_, indice) => adicionarDias(data, indice - quantidade + 1));
}

export function registroDoDia(meta: MetaRegra, dia: Date) {
  return meta.registros.find((registro) => chaveData(registro.data) === chaveData(dia));
}

export function agendado(meta: MetaRegra, dia: Date) {
  if (dia < meta.dataInicio || (meta.dataFim && dia > meta.dataFim)) return false;
  if (registroDoDia(meta, dia)) return true;
  if (meta.diasSemana.length && !meta.diasSemana.includes(dia.getUTCDay())) return false;
  if (meta.periodo === "SEMANAL" && meta.quantidadeSemanal) {
    const inicio = inicioSemana(dia);
    const feitos = meta.registros.filter(
      (registro) => registro.data >= inicio && registro.data < dia && registro.concluido && !registro.pausado
    ).length;
    if (feitos >= meta.quantidadeSemanal && !registroDoDia(meta, dia)) return false;
  }
  return true;
}

export function situacao(meta: MetaRegra, dia: Date) {
  const registro = registroDoDia(meta, dia);
  const alvo = registro?.metaAlvo ?? meta.frequenciaAlvo;
  const valor = registro?.valor ?? 0;
  return {
    valor,
    meta: alvo,
    pausado: registro?.pausado ?? false,
    concluido: !registro?.pausado && valor >= alvo,
    estado: registro?.pausado ? "PAUSADO" : valor >= alvo ? "CONCLUIDO" : valor > 0 ? "EM_ANDAMENTO" : "NAO_INICIADO",
    avaliacaoSono: registro?.avaliacaoSono ?? null
  };
}

export function resumoDoDia(metas: MetaRegra[], dia: Date) {
  const presentes = metas.filter((meta) => agendado(meta, dia));
  const pausados = presentes.filter((meta) => situacao(meta, dia).pausado).length;
  const feitos = presentes.filter((meta) => situacao(meta, dia).concluido).length;
  return { data: chaveData(dia), feitos, total: presentes.length - pausados, pausados };
}

export function resumirPeriodo(metas: MetaRegra[], selecionada: Date, hoje: Date) {
  const referencia = selecionada > hoje ? hoje : selecionada;
  const dias = diasDoPeriodo(referencia);
  const historico = dias.map((dia) => resumoDoDia(metas, dia));
  const total = historico.reduce((soma, dia) => soma + dia.total, 0);
  const feitos = historico.reduce((soma, dia) => soma + dia.feitos, 0);
  let sequencia = 0;
  let encontrouRegistro = false;
  for (let indice = 0; indice < 365; indice++) {
    const dia = adicionarDias(referencia, -indice);
    const resumo = resumoDoDia(metas, dia);
    if (!resumo.total) continue;
    if (!resumo.feitos) {
      if (indice === 0 && !encontrouRegistro) continue;
      break;
    }
    encontrouRegistro = true;
    sequencia++;
  }
  const registrados = metas
    .flatMap((meta) => meta.registros)
    .filter((registro) => registro.data >= dias[0]! && registro.data <= referencia && !registro.pausado).length;
  return {
    ...resumoDoDia(metas, selecionada),
    sequencia,
    semana: total ? Math.round((feitos / total) * 100) : 0,
    historico,
    insight:
      registrados < 3
        ? "Continue registrando seus hábitos para acompanhar seu ritmo ao longo do tempo."
        : feitos > 0
          ? "Você tem reservado momentos para cuidar da sua rotina. Cada pequeno passo conta."
          : "Tudo bem diminuir o ritmo. Escolha uma pequena ação que faça sentido para hoje."
  };
}
