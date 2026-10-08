import { Router } from "express";
import { HabitoController } from "./habito.controller.js";
import { HabitoService } from "./habito.service.js";
import { iniciarSessaoDemo, limitarHabitos, validarSessaoHabitos } from "./habito-session.js";

const controller = new HabitoController(new HabitoService());
export const habitoRoutes = Router();
habitoRoutes.use(limitarHabitos);
habitoRoutes.post("/sessao-demo", iniciarSessaoDemo);
habitoRoutes.use(validarSessaoHabitos);
habitoRoutes.get("/", controller.listar);
habitoRoutes.post("/", controller.criar);
habitoRoutes.post("/importacao", controller.importar);
habitoRoutes.get("/:id", controller.detalhe);
habitoRoutes.put("/:id", controller.editar);
habitoRoutes.delete("/:id", controller.excluir);
habitoRoutes.put("/:id/registro", controller.registrar);
