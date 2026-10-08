type ApiError = { erro?: string; detalhes?: { campo: string; mensagem: string }[] };

export class ApiRequestError extends Error {
  readonly status: number;
  readonly detalhes: { campo: string; mensagem: string }[];
  constructor(message: string, status: number, detalhes: { campo: string; mensagem: string }[] = []) {
    super(message);
    this.status = status;
    this.detalhes = detalhes;
  }
}

export async function api<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...opcoes?.headers
    }
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => ({}))) as ApiError;
    throw new ApiRequestError(corpo.erro ?? "Não foi possível concluir a operação.", resposta.status, corpo.detalhes);
  }

  return resposta.json() as Promise<T>;
}
