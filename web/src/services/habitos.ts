export type IconeHabito = "water" | "coffee" | "exercise" | "sleep" | "meditation";
export type Habito = {
  id: string;
  nome: string;
  icone: IconeHabito;
  valor: number;
  meta: number;
  unidade: string;
  concluido: boolean;
};
export type RegistroHabitos = { data: string; habitos: Habito[] };
export type HistoricoHabitos = { versao: 1; registros: RegistroHabitos[] };

const icones: IconeHabito[] = ["water", "coffee", "exercise", "sleep", "meditation"];

export function dataLocal(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function chave(usuarioId: number) {
  return `workwell-habitos-v1-${usuarioId}`;
}

function dataValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function habitoValido(valor: unknown): valor is Habito {
  if (!valor || typeof valor !== "object") return false;
  const habito = valor as Partial<Habito>;
  return (
    typeof habito.id === "string" &&
    habito.id.length > 0 &&
    habito.id.length <= 80 &&
    typeof habito.nome === "string" &&
    habito.nome.trim().length > 0 &&
    habito.nome.length <= 60 &&
    icones.includes(habito.icone as IconeHabito) &&
    typeof habito.valor === "number" &&
    Number.isInteger(habito.valor) &&
    typeof habito.meta === "number" &&
    Number.isInteger(habito.meta) &&
    habito.meta > 0 &&
    habito.meta <= 1000 &&
    habito.valor >= 0 &&
    habito.valor <= habito.meta &&
    typeof habito.unidade === "string" &&
    habito.unidade.length <= 20 &&
    typeof habito.concluido === "boolean"
  );
}

export function criarHabitosDemo(): Habito[] {
  return [
    { id: "hidratacao", nome: "Hidratação", icone: "water", valor: 6, meta: 8, unidade: "copos", concluido: true },
    { id: "pausas", nome: "Pausas ativas", icone: "coffee", valor: 2, meta: 3, unidade: "pausas", concluido: true },
    { id: "exercicio", nome: "Exercício", icone: "exercise", valor: 0, meta: 30, unidade: "min", concluido: false },
    { id: "sono", nome: "Qualidade do sono", icone: "sleep", valor: 0, meta: 1, unidade: "registro", concluido: true },
    { id: "meditacao", nome: "Meditação", icone: "meditation", valor: 0, meta: 10, unidade: "min", concluido: false }
  ];
}

export function carregarHabitos(usuarioId: number, hoje = dataLocal(), incluirDia = true): HistoricoHabitos {
  let historico: HistoricoHabitos = { versao: 1, registros: [] };
  try {
    const texto = localStorage.getItem(chave(usuarioId));
    if (texto && texto.length <= 1_000_000) {
      const dados = JSON.parse(texto) as Partial<HistoricoHabitos>;
      if (dados?.versao === 1 && Array.isArray(dados.registros) && dados.registros.length <= 90) {
        const registros = dados.registros.filter(
          (registro) =>
            registro &&
            dataValida(registro.data) &&
            Array.isArray(registro.habitos) &&
            registro.habitos.length > 0 &&
            registro.habitos.length <= 30 &&
            registro.habitos.every(habitoValido) &&
            new Set(registro.habitos.map((habito) => habito.id)).size === registro.habitos.length
        );
        historico = {
          versao: 1,
          registros: registros
            .filter((registro, indice) => registros.findIndex((item) => item.data === registro.data) === indice)
            .sort((a, b) => a.data.localeCompare(b.data))
        };
      }
    }
  } catch {
    // Cache indisponível ou inválido: a demonstração continua em memória.
  }
  if (incluirDia && !historico.registros.some((registro) => registro.data === hoje)) {
    const anterior = historico.registros.filter((registro) => registro.data < hoje).at(-1);
    const habitos = anterior
      ? anterior.habitos.map((habito) => ({ ...habito, valor: 0, concluido: false }))
      : criarHabitosDemo();
    historico.registros = [...historico.registros, { data: hoje, habitos }].slice(-90);
  }
  return historico;
}

export function salvarHabitos(usuarioId: number, historico: HistoricoHabitos) {
  try {
    localStorage.setItem(chave(usuarioId), JSON.stringify(historico));
    return true;
  } catch {
    return false;
  }
}

export function validarNovoHabito(nome: string, meta: number, icone: string) {
  return (
    nome.trim().length > 0 &&
    nome.trim().length <= 60 &&
    Number.isInteger(meta) &&
    meta > 0 &&
    meta <= 1000 &&
    icones.includes(icone as IconeHabito)
  );
}

export function resumirHabitos(historico: HistoricoHabitos, hoje = dataLocal()) {
  const habitos = historico.registros.find((registro) => registro.data === hoje)?.habitos ?? [];
  const feitos = habitos.filter((habito) => habito.concluido).length;
  const inicioSemana = new Date(`${hoje}T12:00:00`);
  inicioSemana.setDate(inicioSemana.getDate() - 6);
  const semana = historico.registros.filter(
    (registro) => registro.data >= dataLocal(inicioSemana) && registro.data <= hoje
  );
  const totalSemana = semana.reduce((total, registro) => total + registro.habitos.length, 0);
  const feitosSemana = semana.reduce(
    (total, registro) => total + registro.habitos.filter((habito) => habito.concluido).length,
    0
  );
  let sequencia = 0;
  const dia = new Date(`${hoje}T12:00:00`);
  if (feitos === 0) dia.setDate(dia.getDate() - 1);
  for (let indice = 0; indice < 90; indice++) {
    const registro = historico.registros.find((item) => item.data === dataLocal(dia));
    if (!registro?.habitos.some((habito) => habito.concluido)) break;
    sequencia++;
    dia.setDate(dia.getDate() - 1);
  }
  return {
    feitos,
    total: habitos.length,
    sequencia,
    semana: totalSemana ? Math.round((feitosSemana / totalSemana) * 100) : 0
  };
}
