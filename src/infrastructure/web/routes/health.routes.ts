import { FastifyInstance } from "fastify";

/** Health check para el HEALTHCHECK del Dockerfile y orquestadores; oculto de Swagger. */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/health", { schema: { hide: true } }, async () => ({
    status: "ok",
  }));
}
