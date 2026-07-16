// Unico punto del sistema que lee process.env: dominio y aplicacion reciben
// configuracion por inyeccion, nunca leen variables de entorno directamente.

import { join } from "node:path";

export interface AppConfig {
  port: number;
  host: string;
  /** Raiz del storage local que emula S3 y aloja los JSONL de persistencia. */
  storageRoot: string;
  /** Carpeta con los datos de referencia (partners.json, members.json). */
  referenceDataRoot: string;
  /** Desactiva el logger de Fastify en tests. */
  enableLogger: boolean;
}

/** Carga la configuracion desde variables de entorno con defaults. */
export function loadConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? "0.0.0.0",
    storageRoot: env.STORAGE_ROOT ?? join(process.cwd(), "storage"),
    referenceDataRoot:
      env.REFERENCE_DATA_ROOT ?? join(process.cwd(), "data", "reference"),
    enableLogger: env.NODE_ENV !== "test",
  };
}
