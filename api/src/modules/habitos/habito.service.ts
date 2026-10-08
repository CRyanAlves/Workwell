import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { adicionarDias, chaveData, dataLocal } from "../../utils/data.js";
import { agendado, diasDoPeriodo, resumirPeriodo, situacao } from "./habito.rules.js";
import type { HabitoInput, ImportacaoInput, RegistroInput } from "./habito.schema.js";

type HabitosDatabase = Pick<typeof prisma, "meta" | "habito" | "$transaction">;
const categorias = {
  water: "HIDRATACAO",
  sleep: "SONO",
  exercise: "ATIVIDADE_FISICA",
  coffee: "PAUSA",
  meditation: "MEDITACAO",
  custom: "PERSONALIZADO"
} as const;
const iconesLegados: Record<string, string> = {
  SONO: "sleep",
  ATIVIDADE_FISICA: "exercise",
  PAUSA: "coffee",
  ESTRESSE: "meditation",
  ALIMENTACAO: "custom",
  HIDRATACAO: "water",
  MEDITACAO: "meditation",
  PERSONALIZADO: "custom"
};
const incluir = {
  habito: true,
  lembretes: { orderBy: { horario: "asc" as const } },
  registros: { orderBy: { data: "asc" as const } }
};
type MetaCompleta = Prisma.MetaGetPayload<{ include: typeof incluir }>;

export class HabitoService {
  constructor(private readonly database: HabitosDatabase = prisma) {}

  private async metas(usuarioId: number) {
    return this.database.meta.findMany({
      where: { usuarioId, ativa: true },
      include: incluir,
      orderBy: { id: "asc" },
      take: 100
    });
  }

  private apresentar(meta: MetaCompleta, dia: Date) {
    const atual = situacao(meta, dia);
    return {
      id: meta.id,
      nome: meta.nome ?? meta.habito.nome,
      icone: meta.icone ?? iconesLegados[meta.habito.categoria] ?? "custom",
      ...atual,
      unidade: meta.unidade,
      frequencia: meta.periodo === "SEMANAL" ? "SEMANAL" : meta.diasSemana.length ? "DIAS_ESPECIFICOS" : "DIARIA",
      diasSemana: meta.diasSemana,
      quantidadeSemanal: meta.quantidadeSemanal,
      permitirPausa: meta.permitirPausa,
      lembretesAtivos: meta.lembretesAtivos,
      horarios: meta.lembretes.map((lembrete) => lembrete.horario.toISOString().slice(11, 16)),
      dataInicio: chaveData(meta.dataInicio),
      metaConfigurada: meta.frequenciaAlvo
    };
  }

  async listar(usuarioId: number, data?: string) {
    const hoje = dataLocal();
    const dia = data ? new Date(`${data}T00:00:00Z`) : hoje;
    const metas = await this.metas(usuarioId);
    const habitos = metas.filter((meta) => agendado(meta, dia)).map((meta) => this.apresentar(meta, dia));
    const resumo = resumirPeriodo(metas, dia, hoje);
    const horarioAtual = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
    const lembretes = habitos
      .filter((habito) => habito.lembretesAtivos && !habito.pausado && !habito.concluido && dia <= hoje)
      .flatMap((habito) =>
        habito.horarios.map((horario) => ({
          id: habito.id,
          nome: habito.nome,
          horario
        }))
      )
      .filter((lembrete) => chaveData(dia) !== chaveData(hoje) || lembrete.horario > horarioAtual)
      .sort((a, b) => a.horario.localeCompare(b.horario));
    return {
      hoje: chaveData(hoje),
      data: chaveData(dia),
      habitos,
      totalCadastrados: metas.length,
      resumo,
      proximoLembrete: chaveData(dia) === chaveData(hoje) ? (lembretes[0] ?? null) : null
    };
  }

  private async encontrar(usuarioId: number, id: number) {
    const meta = await this.database.meta.findFirst({
      where: { id, usuarioId, ativa: true },
      include: incluir
    });
    if (!meta) throw new AppError("Hábito não encontrado.", 404);
    return meta;
  }

  async detalhe(usuarioId: number, id: number, data?: string) {
    const meta = await this.encontrar(usuarioId, id);
    const dia = data ? new Date(`${data}T00:00:00Z`) : dataLocal();
    const historico = diasDoPeriodo(dia).map((data) => ({
      data: chaveData(data),
      ...situacao(meta, data),
      agendado: agendado(meta, data)
    }));
    const registrados = historico.filter(
      (item) => meta.registros.some((registro) => chaveData(registro.data) === item.data) && !item.pausado
    );
    const media = registrados.length
      ? Math.round((registrados.reduce((soma, item) => soma + item.valor, 0) / registrados.length) * 10) / 10
      : null;
    return {
      ...this.apresentar(meta, dia),
      historico,
      media,
      historicoCompleto: meta.registros.slice(-365).map((registro) => ({
        data: chaveData(registro.data),
        valor: registro.valor,
        meta: registro.metaAlvo ?? meta.frequenciaAlvo,
        pausado: registro.pausado,
        concluido: registro.concluido,
        avaliacaoSono: registro.avaliacaoSono
      }))
    };
  }

  private configuracao(dados: HabitoInput) {
    return {
      nome: dados.nome,
      icone: dados.icone,
      frequenciaAlvo: dados.meta,
      unidade: dados.unidade,
      periodo: dados.frequencia === "SEMANAL" ? ("SEMANAL" as const) : ("DIARIA" as const),
      diasSemana: dados.frequencia === "DIAS_ESPECIFICOS" ? dados.diasSemana : [],
      quantidadeSemanal: dados.frequencia === "SEMANAL" ? dados.quantidadeSemanal : null,
      permitirPausa: dados.permitirPausa,
      lembretesAtivos: dados.lembretesAtivos
    };
  }

  private async catalogo(tx: Prisma.TransactionClient, icone: HabitoInput["icone"]) {
    return tx.habito.upsert({
      where: {
        nome_categoria: {
          nome: `Categoria ${icone}`,
          categoria: categorias[icone]
        }
      },
      update: {},
      create: { nome: `Categoria ${icone}`, categoria: categorias[icone] }
    });
  }

  private async lembretes(tx: Prisma.TransactionClient, usuarioId: number, metaId: number, dados: HabitoInput) {
    await tx.lembrete.deleteMany({ where: { metaId, usuarioId } });
    if (dados.horarios.length)
      await tx.lembrete.createMany({
        data: dados.horarios.map((horario) => ({
          usuarioId,
          metaId,
          tipo: "META",
          horario: new Date(`1970-01-01T${horario}:00Z`),
          diasSemana: dados.frequencia === "DIAS_ESPECIFICOS" ? dados.diasSemana : [],
          ativo: dados.lembretesAtivos
        }))
      });
  }

  async criar(usuarioId: number, dados: HabitoInput) {
    const meta = await this.database.$transaction(
      async (tx) => {
        if ((await tx.meta.count({ where: { usuarioId, ativa: true } })) >= 30)
          throw new AppError("Você já tem 30 hábitos. Edite um hábito existente.");
        const habito = await this.catalogo(tx, dados.icone);
        const meta = await tx.meta.create({
          data: {
            usuarioId,
            habitoId: habito.id,
            dataInicio: dataLocal(),
            ...this.configuracao(dados)
          }
        });
        await this.lembretes(tx, usuarioId, meta.id, dados);
        return meta;
      },
      { isolationLevel: "Serializable" }
    );
    return this.detalhe(usuarioId, meta.id);
  }

  async editar(usuarioId: number, id: number, dados: HabitoInput) {
    await this.encontrar(usuarioId, id);
    await this.database.$transaction(async (tx) => {
      const habito = await this.catalogo(tx, dados.icone);
      await tx.meta.update({
        where: { id, usuarioId },
        data: { habitoId: habito.id, ...this.configuracao(dados) }
      });
      await this.lembretes(tx, usuarioId, id, dados);
      // Os dias anteriores preservam a meta usada ao registrar o progresso.
      await tx.registroHabito.updateMany({
        where: { metaId: id, data: dataLocal() },
        data: { metaAlvo: dados.meta, concluido: false }
      });
      await tx.registroHabito.updateMany({
        where: {
          metaId: id,
          data: dataLocal(),
          pausado: false,
          valor: { gte: dados.meta }
        },
        data: { concluido: true }
      });
    });
    return this.detalhe(usuarioId, id);
  }

  async excluir(usuarioId: number, id: number) {
    await this.encontrar(usuarioId, id);
    await this.database.$transaction(async (tx) => {
      await tx.meta.update({
        where: { id, usuarioId },
        data: { ativa: false, lembretesAtivos: false }
      });
      await tx.lembrete.updateMany({
        where: { metaId: id, usuarioId },
        data: { ativo: false }
      });
    });
    return { mensagem: "Hábito excluído." };
  }

  async registrar(usuarioId: number, id: number, dados: RegistroInput) {
    const meta = await this.encontrar(usuarioId, id);
    const dia = new Date(`${dados.data}T00:00:00Z`);
    if (dia > dataLocal()) throw new AppError("O progresso poderá ser registrado quando esse dia chegar.");
    if (!agendado(meta, dia)) throw new AppError("Este hábito não está programado para a data selecionada.");
    if (dados.pausado && !meta.permitirPausa) throw new AppError("Ative a opção de pausa nas configurações do hábito.");
    const atual = situacao(meta, dia);
    if (dados.valor > Math.max(atual.meta, atual.valor)) throw new AppError("O progresso não pode ultrapassar a meta.");
    if (dados.avaliacaoSono != null && meta.icone !== "sleep" && meta.habito.categoria !== "SONO")
      throw new AppError("A avaliação de sono não se aplica a este hábito.");
    const registro = {
      valor: dados.valor,
      metaAlvo: atual.meta,
      pausado: dados.pausado,
      concluido: !dados.pausado && dados.valor >= atual.meta,
      avaliacaoSono: dados.avaliacaoSono ?? atual.avaliacaoSono
    };
    await this.database.$transaction(
      async (tx) => {
        await tx.registroHabito.upsert({
          where: { metaId_data: { metaId: id, data: dia } },
          create: { metaId: id, data: dia, ...registro },
          update: registro
        });
        if (dados.lembretesAtivos !== undefined) {
          if (dados.lembretesAtivos && !meta.lembretes.length)
            throw new AppError("Configure pelo menos um horário antes de ativar o lembrete.");
          await tx.meta.update({
            where: { id, usuarioId },
            data: { lembretesAtivos: dados.lembretesAtivos }
          });
          await tx.lembrete.updateMany({
            where: { metaId: id, usuarioId },
            data: { ativo: dados.lembretesAtivos }
          });
        }
        if (meta.periodo === "SEMANAL") {
          const inicio = adicionarDias(dia, -dia.getUTCDay());
          const quantidade = await tx.registroHabito.count({
            where: {
              metaId: id,
              data: { gte: inicio, lte: adicionarDias(inicio, 6) },
              concluido: true,
              pausado: false
            }
          });
          if (quantidade > (meta.quantidadeSemanal ?? 7))
            throw new AppError("A meta semanal já foi realizada. Ajuste a frequência para adicionar outro dia.");
        }
      },
      { isolationLevel: "Serializable" }
    );
    return this.detalhe(usuarioId, id, dados.data);
  }

  async importar(usuarioId: number, dados: ImportacaoInput) {
    const hoje = chaveData(dataLocal());
    if (dados.registros.some((registro) => registro.data > hoje))
      throw new AppError("A importação não aceita registros futuros.");
    const ids = new Set(dados.registros.flatMap((registro) => registro.habitos.map((habito) => habito.id)));
    if (ids.size > 30) throw new AppError("A importação permite até 30 hábitos.");
    await this.database.$transaction(async (tx) => {
      const existentes = await tx.meta.findMany({
        where: { usuarioId },
        select: { origemLocalId: true }
      });
      const novos = [...ids].filter((id) => !existentes.some((meta) => meta.origemLocalId === id));
      if (existentes.length + novos.length > 30)
        throw new AppError("A importação ultrapassaria o limite de 30 hábitos.");
      for (const registro of [...dados.registros].sort((a, b) => a.data.localeCompare(b.data))) {
        for (const legado of registro.habitos) {
          const habito = await this.catalogo(tx, legado.icone);
          const unidade =
            legado.icone === "water"
              ? "copos"
              : legado.icone === "coffee"
                ? "pausas"
                : legado.icone === "sleep"
                  ? "registro"
                  : "min";
          const meta = await tx.meta.upsert({
            where: {
              usuarioId_origemLocalId: { usuarioId, origemLocalId: legado.id }
            },
            update: {},
            create: {
              usuarioId,
              habitoId: habito.id,
              origemLocalId: legado.id,
              nome: legado.nome,
              icone: legado.icone,
              unidade,
              frequenciaAlvo: legado.meta,
              periodo: "DIARIA",
              dataInicio: new Date(`${registro.data}T00:00:00Z`)
            }
          });
          await tx.registroHabito.upsert({
            where: {
              metaId_data: {
                metaId: meta.id,
                data: new Date(`${registro.data}T00:00:00Z`)
              }
            },
            update: {},
            create: {
              metaId: meta.id,
              data: new Date(`${registro.data}T00:00:00Z`),
              valor: legado.valor,
              metaAlvo: legado.meta,
              concluido: legado.valor >= legado.meta
            }
          });
        }
      }
    });
    return { mensagem: "Registros anteriores preservados no banco." };
  }
}
