import { createHash, randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import { sessaoSchema } from "./habito.schema.js";

const sessoes = new Map<string, { usuarioId: number; expira: number }>();
const acessos = new Map<string, { quantidade: number; expira: number }>();
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const local = (ip: string) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip);

export const limitarHabitos: RequestHandler = (req, res, next) => {
  const agora = Date.now();
  for (const [chave, acesso] of acessos) if (acesso.expira < agora) acessos.delete(chave);
  const chave = req.socket.remoteAddress ?? "desconhecido";
  const acesso = acessos.get(chave) ?? { quantidade: 0, expira: agora + 60_000 };
  acesso.quantidade++;
  acessos.set(chave, acesso);
  if (acesso.quantidade > 240) {
    res.setHeader("Retry-After", "60");
    next(new AppError("Aguarde um minuto antes de tentar novamente.", 429));
    return;
  }
  next();
};

// Mantém o seletor acadêmico existente. Não é um login de produção.
export const iniciarSessaoDemo: RequestHandler = async (req, res) => {
  if (!local(req.socket.remoteAddress ?? "") || process.env["NODE_ENV"] === "production")
    throw new AppError("A sessão de demonstração está disponível somente no ambiente local.", 403);
  const origem = req.get("origin");
  if (origem && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origem))
    throw new AppError("Origem não permitida.", 403);
  const { usuarioId } = sessaoSchema.parse(req.body);
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { ativo: true, perfil: true, email: true }
  });
  if (!usuario?.ativo || usuario.perfil !== "COLABORADOR" || !usuario.email.endsWith("@workwell.local"))
    throw new AppError("Este perfil não pode acessar os hábitos.", 403);
  const agora = Date.now();
  for (const [chave, sessao] of sessoes) if (sessao.expira < agora) sessoes.delete(chave);
  if (sessoes.size >= 1000) throw new AppError("Não foi possível iniciar a sessão. Tente novamente mais tarde.", 503);
  const token = randomBytes(32).toString("hex");
  sessoes.set(hash(token), { usuarioId, expira: agora + 8 * 60 * 60_000 });
  res.setHeader("Cache-Control", "no-store");
  res.json({ token });
};

export const validarSessaoHabitos: RequestHandler = async (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) throw new AppError("Reabra a tela para iniciar sua sessão.", 401);
  const sessao = sessoes.get(hash(token));
  if (!sessao || sessao.expira < Date.now()) throw new AppError("Sua sessão expirou. Reabra a tela.", 401);
  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.usuarioId },
    select: { ativo: true, perfil: true }
  });
  if (!usuario?.ativo || usuario.perfil !== "COLABORADOR")
    throw new AppError("Este perfil não pode acessar os hábitos.", 403);
  res.locals["usuarioId"] = sessao.usuarioId;
  res.setHeader("Cache-Control", "no-store");
  next();
};
