import assert from "node:assert/strict";
import { prisma } from "../src/database/prisma.js";
import { adicionarDias, chaveData, dataLocal } from "../src/utils/data.js";
import { agendado, resumirPeriodo } from "../src/modules/habitos/habito.rules.js";
import { habitoSchema, dataSchema, registroSchema } from "../src/modules/habitos/habito.schema.js";

const configuracao = {
  nome: "Teste de hidratação",
  icone: "water" as const,
  meta: 8,
  unidade: "copos",
  frequencia: "DIARIA" as const,
  diasSemana: [],
  quantidadeSemanal: null,
  permitirPausa: true,
  lembretesAtivos: true,
  horarios: ["10:00", "14:00"]
};
assert.equal(habitoSchema.safeParse(configuracao).success, true);
for (const meta of [0, -1, 1.5, 1001]) assert.equal(habitoSchema.safeParse({ ...configuracao, meta }).success, false);
for (const alteracao of [
  { nome: " " },
  { unidade: "horas" },
  { horarios: ["25:00"] },
  { horarios: ["10:00", "10:00"] },
  { frequencia: "DIAS_ESPECIFICOS" },
  { frequencia: "SEMANAL", quantidadeSemanal: 0 },
  { usuarioId: 3 }
])
  assert.equal(habitoSchema.safeParse({ ...configuracao, ...alteracao }).success, false);
assert.equal(dataSchema.safeParse("2026-02-31").success, false);
assert.equal(registroSchema.safeParse({ data: "2026-10-07", valor: -1, pausado: false }).success, false);
const base = {
  id: 1,
  frequenciaAlvo: 8,
  periodo: "DIARIA",
  diasSemana: [],
  quantidadeSemanal: null,
  dataInicio: new Date("2026-10-05T00:00:00Z"),
  dataFim: null,
  registros: [
    {
      data: new Date("2026-10-05T00:00:00Z"),
      valor: 8,
      pausado: false,
      concluido: true,
      metaAlvo: 8,
      avaliacaoSono: null
    },
    {
      data: new Date("2026-10-06T00:00:00Z"),
      valor: 3,
      pausado: true,
      concluido: false,
      metaAlvo: 8,
      avaliacaoSono: null
    },
    {
      data: new Date("2026-10-07T00:00:00Z"),
      valor: 8,
      pausado: false,
      concluido: true,
      metaAlvo: 8,
      avaliacaoSono: null
    }
  ]
};
const referencia = new Date("2026-10-07T00:00:00Z");
assert.equal(resumirPeriodo([base], referencia, referencia).sequencia, 2);
assert.equal(resumirPeriodo([base], referencia, referencia).semana, 100);
assert.equal(agendado({ ...base, diasSemana: [1], registros: [] }, referencia), false);
assert.equal(agendado({ ...base, diasSemana: [1] }, referencia), true);
assert.equal(
  agendado({ ...base, periodo: "SEMANAL", quantidadeSemanal: 1, registros: base.registros.slice(0, 2) }, referencia),
  false
);

const api = "http://127.0.0.1:3333/api";
async function request(caminho: string, method = "GET", body?: unknown, token?: string) {
  const resposta = await fetch(`${api}/habitos${caminho}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: resposta.status, body: await resposta.json() };
}

const empresa = await prisma.empresa.findFirst({ where: { ativa: true }, select: { id: true } });
assert.ok(empresa, "Execute a carga acadêmica antes dos testes de integração.");
const usuarios: number[] = [];
try {
  for (const indice of [1, 2]) {
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: `Validação de hábitos ${indice}`,
        email: `teste.habitos.${Date.now()}.${indice}@workwell.local`
      }
    });
    usuarios.push(usuario.id);
  }
  const primeiro = usuarios[0]!;
  const segundo = usuarios[1]!;
  const hoje = chaveData(dataLocal());
  const sessao = await request("/sessao-demo", "POST", { usuarioId: primeiro });
  assert.equal(sessao.status, 200);
  const token = sessao.body.token as string;
  const outra = await request("/sessao-demo", "POST", { usuarioId: segundo });
  assert.equal((await request("")).status, 401);
  assert.equal((await request("", "GET", undefined, "invalido")).status, 401);
  const rh = await prisma.usuario.findFirst({ where: { perfil: "GESTOR_RH" }, select: { id: true } });
  if (rh) assert.equal((await request("/sessao-demo", "POST", { usuarioId: rh.id })).status, 403);
  assert.equal((await request("", "GET", undefined, token)).body.totalCadastrados, 0);
  const criado = await request("", "POST", configuracao, token);
  assert.equal(criado.status, 201);
  const id = criado.body.id as number;
  const ontem = adicionarDias(dataLocal(), -1);
  await prisma.meta.update({ where: { id }, data: { dataInicio: ontem } });
  await prisma.registroHabito.create({ data: { metaId: id, data: ontem, valor: 8, metaAlvo: 8, concluido: true } });
  assert.equal((await request(`/${id}`, "GET", undefined, outra.body.token)).status, 404);
  assert.equal((await request(`/${id}/registro`, "PUT", { data: hoje, valor: 9, pausado: false }, token)).status, 400);
  assert.equal(
    (
      await request(
        `/${id}/registro`,
        "PUT",
        { data: chaveData(adicionarDias(dataLocal(), 1)), valor: 1, pausado: false },
        token
      )
    ).status,
    400
  );
  assert.equal((await request(`/${id}/registro`, "PUT", { data: hoje, valor: 6, pausado: false }, token)).status, 200);
  assert.equal((await request(`/${id}`, "GET", undefined, token)).body.valor, 6);
  assert.equal(
    (await request(`/${id}/registro`, "PUT", { data: hoje, valor: 6, pausado: true, lembretesAtivos: false }, token))
      .status,
    200
  );
  const pausado = (await request(`/${id}`, "GET", undefined, token)).body;
  assert.equal(pausado.pausado, true);
  assert.equal(pausado.valor, 6);
  assert.deepEqual(pausado.horarios, ["10:00", "14:00"]);
  assert.equal(pausado.lembretesAtivos, false);
  const lista = (await request(`?data=${hoje}`, "GET", undefined, token)).body;
  assert.equal(lista.resumo.total, 0);
  assert.equal(lista.resumo.pausados, 1);
  await request(`/${id}/registro`, "PUT", { data: hoje, valor: 8, pausado: false }, token);
  assert.equal((await request(`/${id}`, "GET", undefined, token)).body.concluido, true);
  assert.equal(
    (await request(`/${id}`, "PUT", { ...configuracao, horarios: ["09:00", "17:00"], meta: 10 }, token)).status,
    200
  );
  assert.equal((await request(`/${id}`, "GET", undefined, token)).body.meta, 10);
  assert.equal(
    (await prisma.registroHabito.findUniqueOrThrow({ where: { metaId_data: { metaId: id, data: dataLocal() } } }))
      .concluido,
    false
  );
  assert.equal((await request(`/${id}?data=${chaveData(ontem)}`, "GET", undefined, token)).body.meta, 8);
  const semanal = await request(
    "",
    "POST",
    { ...configuracao, nome: "Hábito semanal", meta: 1, frequencia: "SEMANAL", quantidadeSemanal: 1 },
    token
  );
  assert.equal(semanal.status, 201);
  await request(`/${semanal.body.id}/registro`, "PUT", { data: hoje, valor: 1, pausado: false }, token);
  const proximoDia = adicionarDias(dataLocal(), 1);
  if (proximoDia.getUTCDay() !== 0)
    assert.equal(
      (await request(`?data=${chaveData(proximoDia)}`, "GET", undefined, token)).body.habitos.some(
        (habito: { id: number }) => habito.id === semanal.body.id
      ),
      false
    );
  assert.equal(
    (await request(`?data=${hoje}`, "GET", undefined, token)).body.habitos.some(
      (habito: { id: number }) => habito.id === semanal.body.id
    ),
    true
  );
  assert.equal(
    (await request(`/${id}`, "PUT", { ...configuracao, frequencia: "DIAS_ESPECIFICOS", diasSemana: [] }, token)).status,
    400
  );
  assert.equal(
    (await request(`/${id}/registro`, "PUT", { data: hoje, valor: 5, pausado: false, avaliacaoSono: 3 }, token)).status,
    400
  );
  const legado = {
    registros: [
      {
        data: hoje,
        habitos: [
          {
            id: "teste-legado",
            nome: "Hábito anterior",
            icone: "coffee",
            valor: 2,
            meta: 3,
            unidade: "pausas",
            concluido: true
          }
        ]
      }
    ]
  };
  assert.equal((await request("/importacao", "POST", legado, token)).status, 200);
  assert.equal((await request("/importacao", "POST", legado, token)).status, 200);
  assert.equal((await request("", "GET", undefined, token)).body.totalCadastrados, 3);
  const importado = await prisma.meta.findUniqueOrThrow({
    where: { usuarioId_origemLocalId: { usuarioId: primeiro, origemLocalId: "teste-legado" } },
    include: { registros: true }
  });
  assert.equal(importado.registros.length, 1);
  assert.equal(importado.registros[0]!.valor, 2);
  assert.equal((await request(`/${id}`, "DELETE", undefined, outra.body.token)).status, 404);
  assert.equal((await request(`/${id}`, "DELETE")).status, 401);
  assert.equal((await request(`/${id}`, "DELETE", undefined, token)).status, 200);
  assert.equal((await request(`/${id}`, "GET", undefined, token)).status, 404);
  assert.equal((await request(`/${id}`, "DELETE", undefined, token)).status, 404);
  assert.equal((await request("", "GET", undefined, token)).body.totalCadastrados, 2);
  const excluido = await prisma.meta.findUniqueOrThrow({ where: { id }, include: { registros: true, lembretes: true } });
  assert.equal(excluido.ativa, false);
  assert.equal(excluido.lembretesAtivos, false);
  assert.ok(excluido.lembretes.every((lembrete) => !lembrete.ativo));
  assert.ok(excluido.registros.some((registro) => chaveData(registro.data) === hoje && registro.valor === 8));
  assert.equal((await request(`/${id}/registro`, "PUT", { data: hoje, valor: 1, pausado: false }, token)).status, 404);
  assert.equal((await request(`/${importado.id}`, "DELETE", undefined, token)).status, 200);
  assert.equal((await request("/importacao", "POST", legado, token)).status, 200);
  assert.equal((await request("", "GET", undefined, token)).body.totalCadastrados, 1);
  console.log(
    "Hábitos: regras, validação, sessão, isolamento, persistência, pausa, lembretes, edição, importação e exclusão aprovados."
  );
} finally {
  await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
  await prisma.$disconnect();
}
