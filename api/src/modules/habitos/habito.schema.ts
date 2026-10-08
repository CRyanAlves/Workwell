import { z } from "zod";

export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((valor) => {
    const data = new Date(`${valor}T00:00:00Z`);
    return (
      !Number.isNaN(data.getTime()) &&
      data.toISOString().slice(0, 10) === valor &&
      valor >= "2000-01-01" &&
      valor <= "2100-12-31"
    );
  }, "Informe uma data válida.");
export const iconeSchema = z.enum(["water", "sleep", "exercise", "coffee", "meditation", "custom"]);
const horarioSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use um horário válido (HH:mm).");
export const habitoSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome do hábito.").max(60, "Use no máximo 60 caracteres."),
    icone: iconeSchema,
    meta: z.number().int().min(1, "A meta deve ser maior que zero.").max(1000, "A meta máxima é 1.000."),
    unidade: z.enum(["copos", "min", "horas", "pausas", "registro", "vezes"]),
    frequencia: z.enum(["DIARIA", "DIAS_ESPECIFICOS", "SEMANAL"]),
    diasSemana: z.array(z.number().int().min(0).max(6)).max(7),
    quantidadeSemanal: z.number().int().min(1).max(7).nullable(),
    permitirPausa: z.boolean(),
    lembretesAtivos: z.boolean(),
    horarios: z.array(horarioSchema).max(8)
  })
  .strict()
  .superRefine((dados, contexto) => {
    const unidades = {
      water: ["copos"],
      sleep: ["registro", "horas"],
      exercise: ["min", "vezes"],
      coffee: ["pausas", "min"],
      meditation: ["min"],
      custom: ["copos", "min", "horas", "pausas", "registro", "vezes"]
    };
    if (!unidades[dados.icone].includes(dados.unidade))
      contexto.addIssue({
        code: "custom",
        path: ["unidade"],
        message: "Escolha uma unidade compatível com a categoria."
      });
    if (dados.frequencia === "DIAS_ESPECIFICOS" && dados.diasSemana.length === 0)
      contexto.addIssue({
        code: "custom",
        path: ["diasSemana"],
        message: "Escolha pelo menos um dia."
      });
    if (new Set(dados.diasSemana).size !== dados.diasSemana.length)
      contexto.addIssue({
        code: "custom",
        path: ["diasSemana"],
        message: "Os dias não podem se repetir."
      });
    if (dados.frequencia === "SEMANAL" && !dados.quantidadeSemanal)
      contexto.addIssue({
        code: "custom",
        path: ["quantidadeSemanal"],
        message: "Informe de 1 a 7 dias por semana."
      });
    if (new Set(dados.horarios).size !== dados.horarios.length)
      contexto.addIssue({
        code: "custom",
        path: ["horarios"],
        message: "Os horários não podem se repetir."
      });
    if (dados.lembretesAtivos && dados.horarios.length === 0)
      contexto.addIssue({
        code: "custom",
        path: ["horarios"],
        message: "Adicione pelo menos um horário ou desative os lembretes."
      });
  });
export const parametrosSchema = z.object({
  id: z.coerce.number().int().positive()
});
export const consultaSchema = z.object({ data: dataSchema.optional() });
export const registroSchema = z
  .object({
    data: dataSchema,
    valor: z.number().int().min(0).max(1000),
    pausado: z.boolean(),
    avaliacaoSono: z.number().int().min(1).max(5).nullable().optional(),
    lembretesAtivos: z.boolean().optional()
  })
  .strict();
export const sessaoSchema = z.object({ usuarioId: z.number().int().positive() }).strict();
const habitoLegado = z
  .object({
    id: z.string().min(1).max(80),
    nome: z.string().trim().min(1).max(60),
    icone: iconeSchema,
    valor: z.number().int().min(0).max(1000),
    meta: z.number().int().min(1).max(1000),
    unidade: z.string().max(20),
    concluido: z.boolean()
  })
  .strict()
  .refine((habito) => habito.valor <= habito.meta, "Progresso inválido.");
export const importacaoSchema = z
  .object({
    registros: z
      .array(
        z
          .object({
            data: dataSchema,
            habitos: z.array(habitoLegado).min(1).max(30)
          })
          .strict()
      )
      .min(1)
      .max(10)
  })
  .strict();
export type HabitoInput = z.infer<typeof habitoSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
export type ImportacaoInput = z.infer<typeof importacaoSchema>;
