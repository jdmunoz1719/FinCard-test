// Bloques de schema OpenAPI reutilizados por varios endpoints.

/** Error de una fila del CSV: fila + columna que fallo + mensaje. */
export const rowErrorSchema = {
  type: "object",
  description: "Error de validacion de una fila especifica del CSV (RF-01).",
  properties: {
    row: {
      type: "number",
      description:
        "Numero de fila de datos (1 = primera fila despues del header).",
    },
    column: {
      type: "string",
      description: "Columna que fallo la validacion ('*' = fila completa).",
    },
    message: { type: "string", description: "Explicacion legible del error." },
  },
} as const;

/** Respuesta de error generica {error}. */
export const simpleErrorSchema = {
  type: "object",
  description: "Respuesta de error generica.",
  properties: {
    error: {
      type: "string",
      description: "Mensaje legible describiendo el problema.",
    },
  },
} as const;
