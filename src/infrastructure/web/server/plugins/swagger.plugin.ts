import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";

/**
 * Registra @fastify/swagger + swagger-ui: genera el spec OpenAPI desde los
 * schemas de las rutas y sirve la UI en /docs. Debe registrarse ANTES que
 * las rutas: swagger captura rutas via hook onRoute, y avvio difiere los
 * .register() pero ejecuta .get()/.post() sincronos de inmediato — por eso
 * las rutas van dentro de su propio plugin (ver FastifyServer).
 */
export function registerSwagger(app: FastifyInstance): void {
  app.register(swagger, {
    openapi: {
      info: {
        title: "FinCard - Liquidacion de Puntos y Aliados",
        description:
          "Carga de transacciones CSV con validacion en tiempo real, catalogacion y liquidacion por aliado.",
        version: "1.0.0",
      },
      tags: [
        {
          name: "transactions",
          description: "Carga y revision de archivos de transacciones",
        },
        {
          name: "settlements",
          description: "Consulta de liquidacion por aliado",
        },
      ],
    },
  });
  app.register(swaggerUi, { routePrefix: "/docs" });
}
