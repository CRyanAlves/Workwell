import type { Request, Response } from "express";
import { consultaSchema, habitoSchema, importacaoSchema, parametrosSchema, registroSchema } from "./habito.schema.js";
import { HabitoService } from "./habito.service.js";

export class HabitoController {
  constructor(private readonly service: HabitoService) {}
  listar = async (req: Request, res: Response) => {
    const { data } = consultaSchema.parse(req.query);
    res.json(await this.service.listar(res.locals["usuarioId"], data));
  };
  detalhe = async (req: Request, res: Response) => {
    const { id } = parametrosSchema.parse(req.params);
    const { data } = consultaSchema.parse(req.query);
    res.json(await this.service.detalhe(res.locals["usuarioId"], id, data));
  };
  criar = async (req: Request, res: Response) => {
    res.status(201).json(await this.service.criar(res.locals["usuarioId"], habitoSchema.parse(req.body)));
  };
  editar = async (req: Request, res: Response) => {
    const { id } = parametrosSchema.parse(req.params);
    res.json(await this.service.editar(res.locals["usuarioId"], id, habitoSchema.parse(req.body)));
  };
  registrar = async (req: Request, res: Response) => {
    const { id } = parametrosSchema.parse(req.params);
    res.json(await this.service.registrar(res.locals["usuarioId"], id, registroSchema.parse(req.body)));
  };
  excluir = async (req: Request, res: Response) => {
    const { id } = parametrosSchema.parse(req.params);
    res.json(await this.service.excluir(res.locals["usuarioId"], id));
  };
  importar = async (req: Request, res: Response) => {
    res.json(await this.service.importar(res.locals["usuarioId"], importacaoSchema.parse(req.body)));
  };
}
