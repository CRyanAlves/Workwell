import { api, ApiRequestError } from "./api";
import { carregarHabitos } from "./habitos";
import type { ConfiguracaoHabito, DetalheHabito, PaginaHabitos, RegistroHabitoInput } from "../types/habitos";

const sessoes = new Map<number, Promise<string>>();
const inicializacoes = new Map<number, Promise<void>>();

async function tokenUsuario(usuarioId: number) {
  if (!sessoes.has(usuarioId))
    sessoes.set(
      usuarioId,
      api<{ token: string }>("/habitos/sessao-demo", {
        method: "POST",
        body: JSON.stringify({ usuarioId })
      })
        .then((sessao) => sessao.token)
        .catch((erro) => {
          sessoes.delete(usuarioId);
          throw erro;
        })
    );
  return sessoes.get(usuarioId)!;
}

async function requisicao<T>(usuarioId: number, caminho: string, opcoes: RequestInit = {}, repetir = true): Promise<T> {
  const token = await tokenUsuario(usuarioId);
  try {
    return await api<T>(`/habitos${caminho}`, {
      ...opcoes,
      headers: { ...opcoes.headers, Authorization: `Bearer ${token}` }
    });
  } catch (erro) {
    if (erro instanceof ApiRequestError && erro.status === 401 && repetir) {
      sessoes.delete(usuarioId);
      return requisicao<T>(usuarioId, caminho, opcoes, false);
    }
    throw erro;
  }
}

async function importarCache(usuarioId: number) {
  const marcador = `workwell-habitos-migrados-v1-${usuarioId}`;
  let existe: boolean;
  try {
    existe = !localStorage.getItem(marcador) && !!localStorage.getItem(`workwell-habitos-v1-${usuarioId}`);
  } catch {
    return;
  }
  if (!existe) return;
  const { registros } = carregarHabitos(usuarioId, dataSaoPaulo(), false);
  const validos = registros.filter((registro) => registro.data <= dataSaoPaulo());
  for (let indice = 0; indice < validos.length; indice += 10)
    await requisicao(usuarioId, "/importacao", {
      method: "POST",
      body: JSON.stringify({ registros: validos.slice(indice, indice + 10) })
    });
  try {
    localStorage.setItem(marcador, "1");
  } catch {
    /* A importação é idempotente, mesmo sem marcador local. */
  }
}

export async function iniciarHabitos(usuarioId: number) {
  if (!inicializacoes.has(usuarioId))
    inicializacoes.set(
      usuarioId,
      importarCache(usuarioId).catch((erro) => {
        inicializacoes.delete(usuarioId);
        throw erro;
      })
    );
  await inicializacoes.get(usuarioId);
}

export function dataSaoPaulo(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(data);
  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

export function diasDaSemana(data: string) {
  const inicio = new Date(`${data}T12:00:00Z`);
  inicio.setUTCDate(inicio.getUTCDate() - inicio.getUTCDay());
  return Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date(inicio);
    dia.setUTCDate(dia.getUTCDate() + indice);
    return dia.toISOString().slice(0, 10);
  });
}

export const formatarDia = (data: string, opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`));
export const listarHabitos = (usuarioId: number, data: string) => requisicao<PaginaHabitos>(usuarioId, `?data=${data}`);
export const detalharHabito = (usuarioId: number, id: number, data: string) =>
  requisicao<DetalheHabito>(usuarioId, `/${id}?data=${data}`);
export const salvarConfiguracaoHabito = (usuarioId: number, dados: ConfiguracaoHabito, id?: number) =>
  requisicao<DetalheHabito>(usuarioId, id ? `/${id}` : "", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(dados)
  });
export const registrarHabito = (usuarioId: number, id: number, dados: RegistroHabitoInput) =>
  requisicao<DetalheHabito>(usuarioId, `/${id}/registro`, {
    method: "PUT",
    body: JSON.stringify(dados)
  });
export const excluirHabito = (usuarioId: number, id: number) =>
  requisicao<{ mensagem: string }>(usuarioId, `/${id}`, { method: "DELETE" });
