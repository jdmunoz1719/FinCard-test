// Contrato OpenAPI de GET /api/v1/settlements/{partner_id} (RF-04).

import { simpleErrorSchema } from "./common.schemas";

const dailyBreakdownEntrySchema = {
  type: "object",
  description: "Totales de un dia especifico dentro del rango [from, to].",
  properties: {
    date: { type: "string", description: "Fecha YYYY-MM-DD." },
    transactions: {
      type: "number",
      description: "Transacciones validas del dia (0 si no hubo).",
    },
    points_earned: { type: "number" },
    points_redeemed: { type: "number" },
  },
} as const;

export const getSettlementSchema = {
  tags: ["settlements"],
  summary:
    "Resumen de liquidacion de puntos de un aliado en un rango de fechas",
  description: [
    "Calcula la liquidacion de un aliado agregando UNICAMENTE transacciones validas",
    "(las flaggeadas por RN-01..04 se excluyen).",
    "",
    "**Que recibe:** `partner_id` en la URL (PART + 2 digitos) y `from`/`to` query params",
    "(`YYYY-MM-DD`, ambos requeridos, `from <= to`).",
    "",
    "**Que hace:** agrega totales del periodo (puntos ganados/redimidos, neto adeudado,",
    "miembros unicos) y arma un desglose diario que cubre TODOS los dias del rango,",
    "con ceros en los dias sin transacciones.",
    "",
    "**Que retorna:** `200` con el resumen; `404` si el aliado no existe;",
    "`400` si partner_id/fechas son invalidos o from > to.",
    "",
    "**Nota net_points_owed:** si redimido > ganado, el valor real es negativo",
    "(el aliado debe puntos); el contrato lo reporta como 0, el crudo se conserva internamente.",
  ].join("\n"),
  params: {
    type: "object",
    properties: {
      partner_id: {
        type: "string",
        description: "Id del aliado. Formato PART + 2 digitos, ej. PART01.",
      },
    },
  },
  querystring: {
    type: "object",
    properties: {
      from: {
        type: "string",
        description: "Inicio del rango, inclusive. YYYY-MM-DD.",
      },
      to: {
        type: "string",
        description: "Fin del rango, inclusive. YYYY-MM-DD.",
      },
    },
  },
  response: {
    200: {
      description: "Resumen de liquidacion calculado.",
      type: "object",
      properties: {
        partner_id: { type: "string" },
        partner_name: { type: "string" },
        period: {
          type: "object",
          properties: { from: { type: "string" }, to: { type: "string" } },
        },
        summary: {
          type: "object",
          properties: {
            total_transactions: { type: "number" },
            total_points_earned: { type: "number" },
            total_points_redeemed: { type: "number" },
            net_points_owed: {
              type: "number",
              description:
                "max(0, earned - redeemed). Nunca negativo en el contrato.",
            },
            unique_members: { type: "number" },
          },
        },
        daily_breakdown: {
          type: "array",
          description: "Un entry por CADA dia del rango, sin huecos.",
          items: dailyBreakdownEntrySchema,
        },
      },
    },
    400: {
      ...simpleErrorSchema,
      description:
        "partner_id o fechas con formato invalido, o from posterior a to.",
    },
    404: {
      ...simpleErrorSchema,
      description: "No existe un aliado registrado con ese partner_id.",
    },
  },
} as const;
