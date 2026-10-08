import { Router } from "express";
import { checkinRoutes } from "../modules/checkins/checkin.routes.js";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes.js";
import { healthRoutes } from "../modules/health/health.routes.js";
import { usuarioRoutes } from "../modules/usuarios/usuario.routes.js";
import { habitoRoutes } from "../modules/habitos/habito.routes.js";

export const routes = Router();

routes.get("/", (_req, res) => {
  res.json({
    projeto: "WorkWell",
    etapa: "Estruturação + MVP funcional",
    documentacao: "/api/health"
  });
});

routes.use("/health", healthRoutes);
routes.use("/usuarios", usuarioRoutes);
routes.use("/checkins", checkinRoutes);
routes.use("/dashboard", dashboardRoutes);
routes.use("/habitos", habitoRoutes);
