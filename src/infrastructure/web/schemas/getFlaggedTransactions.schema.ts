// Contrato OpenAPI de GET /api/v1/transactions/flagged (RF-05): listado de
// transacciones "sujetas a revision" con sus motivos.

import { simpleErrorSchema } from "./common.schemas";

const flagReasonSchema = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description:
        "Codigo estable del motivo: DAILY_POINTS_EXCEEDED | REDEMPTION_RATIO_EXCEEDED | " +
        "MEMBER_DAILY_LIMIT_EXCEEDED | DATE_OUT_OF_RANGE.",
    },
    rule: {
      type: "string",
      description: "Regla de negocio de origen (RN-01..RN-04).",
    },
    message: {
      type: "string",
      description: "Explicacion legible para el revisor.",
    },
  },
} as const;

export const getFlaggedTransactionsSchema = {
  tags: ["transactions"],
  summary: "Lista las transacciones 'sujetas a revision' (RN-01..RN-04)",
  description: [
    "Devuelve el contenido de la tabla transactions_flagged (RF-05): transacciones que",
    "pasaron la validacion de schema pero violaron una regla de negocio cruzada.",
    "Estas transacciones NUNCA participan en los calculos de liquidacion.",
    "",
    "**Que recibe:** query param opcional `partner_id` para filtrar por aliado.",
    "",
    "**Que retorna:** `200` con el listado (posiblemente vacio); `400` si el",
    "`partner_id` enviado tiene formato invalido.",
  ].join("\n"),
  querystring: {
    type: "object",
    properties: {
      partner_id: {
        type: "string",
        description: "Filtro opcional por aliado. Formato PART + 2 digitos.",
      },
    },
  },
  response: {
    200: {
      description: "Listado de transacciones flaggeadas (vacio si no hay).",
      type: "object",
      properties: {
        total: {
          type: "number",
          description: "Cantidad de transacciones en el listado.",
        },
        flagged: {
          type: "array",
          items: {
            type: "object",
            properties: {
              transaction_id: { type: "string" },
              member_id: { type: "string" },
              partner_id: { type: "string" },
              partner_name: { type: "string" },
              points_earned: { type: "number" },
              points_redeemed: { type: "number" },
              transaction_date: { type: "string" },
              flag_reasons: { type: "array", items: flagReasonSchema },
              batch_id: {
                type: "string",
                description: "Batch que origino la bandera.",
              },
              processed_at: { type: "string" },
            },
          },
        },
      },
    },
    400: {
      ...simpleErrorSchema,
      description: "partner_id con formato invalido.",
    },
  },
} as const;
