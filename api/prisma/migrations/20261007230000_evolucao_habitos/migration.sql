ALTER TYPE "CategoriaHabito" ADD VALUE IF NOT EXISTS 'HIDRATACAO';
ALTER TYPE "CategoriaHabito" ADD VALUE IF NOT EXISTS 'MEDITACAO';
ALTER TYPE "CategoriaHabito" ADD VALUE IF NOT EXISTS 'PERSONALIZADO';

ALTER TABLE "Meta" ADD COLUMN "nome" TEXT,
  ADD COLUMN "icone" TEXT,
  ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'vezes',
  ADD COLUMN "diasSemana" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "quantidadeSemanal" INTEGER,
  ADD COLUMN "permitirPausa" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lembretesAtivos" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "origemLocalId" TEXT;

ALTER TABLE "RegistroHabito" ADD COLUMN "valor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metaAlvo" INTEGER,
  ADD COLUMN "pausado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "avaliacaoSono" INTEGER,
  ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserva a conclusão dos registros anteriores ao controle quantitativo.
UPDATE "RegistroHabito" AS r SET "valor" = m."frequenciaAlvo"
FROM "Meta" AS m WHERE r."metaId" = m."id" AND r."concluido" = true;
UPDATE "RegistroHabito" AS r SET "metaAlvo" = m."frequenciaAlvo" FROM "Meta" AS m WHERE r."metaId" = m."id";

ALTER TABLE "Lembrete" ADD COLUMN "metaId" INTEGER;
ALTER TABLE "Lembrete" ADD CONSTRAINT "Lembrete_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "Meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Meta_usuarioId_origemLocalId_key" ON "Meta"("usuarioId", "origemLocalId");
CREATE UNIQUE INDEX "Lembrete_metaId_horario_key" ON "Lembrete"("metaId", "horario");
ALTER TABLE "RegistroHabito" ADD CONSTRAINT "RegistroHabito_valor_check" CHECK ("valor" BETWEEN 0 AND 1000),
  ADD CONSTRAINT "RegistroHabito_sono_check" CHECK ("avaliacaoSono" IS NULL OR "avaliacaoSono" BETWEEN 1 AND 5);
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_quantidadeSemanal_check" CHECK ("quantidadeSemanal" IS NULL OR "quantidadeSemanal" BETWEEN 1 AND 7),
  ADD CONSTRAINT "Meta_diasSemana_check" CHECK ("diasSemana" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]);
