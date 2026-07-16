// Contrato OpenAPI de POST /api/v1/transactions/upload: procesamiento
// parcial (200 con filas rechazadas reportadas) o rechazo estructural (400).

import { rowErrorSchema, simpleErrorSchema } from "./common.schemas";

const manifestSchema = {
  type: "object",
  description:
    "Manifest del procesamiento (RF-02): totales, errores por fila, timestamp y " +
    "hash SHA-256 del archivo original. Se archiva junto al batch en el storage.",
  properties: {
    total_valid_rows: {
      type: "number",
      description:
        "Filas que pasaron la validacion de schema (incluye las flaggeadas por RN).",
    },
    total_rejected_rows: {
      type: "number",
      description: "Filas rechazadas por errores de schema (no se procesaron).",
    },
    errors: { type: "array", items: rowErrorSchema },
    processed_at: {
      type: "string",
      description: "Timestamp ISO 8601 del procesamiento.",
    },
    original_file_sha256: {
      type: "string",
      description: "SHA-256 (hex) del archivo original.",
    },
  },
} as const;

/**
 * Factory, no const compartida: ajvFilePlugin.compile() muta en sitio la
 * propiedad `file` (isFile:true -> {type:'string', format:'binary'}) la
 * primera vez que un Ajv lo compila. Un objeto modulo-level reusado entre
 * instancias de Fastify (como en tests, una por caso) haria que la segunda
 * instancia recibiera el schema ya mutado y perdiera `isFile`. Cada
 * buildServer() necesita su propia copia fresca.
 */
export function buildUploadTransactionsSchema() {
  return {
    tags: ["transactions"],
    summary: "Carga y valida un archivo CSV de transacciones de puntos",
    description: [
      "Recibe un archivo CSV de transacciones de puntos de aliados comerciales y lo procesa con modelo PARCIAL.",
      "",
      "**Que recibe:** `multipart/form-data` con el archivo en el campo `file` (extension `.csv` obligatoria).",
      "Columnas requeridas (cualquier orden, extras se ignoran): ",
      "`transaction_id,member_id,partner_id,points_earned,points_redeemed,transaction_date,partner_name`.",
      "",
      "**Que hace:**",
      "1. Valida la estructura: si faltan columnas o el archivo esta vacio -> 400 (nada se procesa).",
      "2. Valida cada fila (RF-01): formato de ids, enteros no negativos, fecha valida, sin transaction_id duplicados.",
      "   Las filas con error se RECHAZAN y reportan en `errors`; las validas continuan (procesamiento parcial).",
      "3. Aplica las reglas cruzadas RN-01..RN-04 (RF-05) sobre las validas: las que violan una regla quedan",
      "   'sujetas a revision' (tabla transactions_flagged) y NO participan en la liquidacion.",
      "4. Archiva el CSV original, particiona las validas por aliado y genera el manifest (RF-02).",
      "5. Registra el batch en el Data Catalog (RF-03).",
      "",
      "**Que retorna:** `200` con contadores, errores por fila, manifest y ruta de storage;",
      "`400` si el archivo es estructuralmente invalido (sin archivo, extension distinta de .csv,",
      "vacio o sin las columnas requeridas); `415` si el request no es multipart/form-data.",
    ].join("\n"),
    consumes: ["multipart/form-data"],
    // `isFile` es una keyword AJV agregada por ajvFilePlugin (ver FastifyServer.ts).
    // Con attachFieldsToBody: true en el plugin de multipart, request.body.file
    // ya existe (no undefined) y esta keyword valida que sea un archivo real
    // esto es lo que hace que Swagger UI dibuje el file-picker en "Try it out".
    body: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          isFile: true,
          description:
            "Archivo CSV de transacciones (extension .csv obligatoria).",
        },
      },
    },
    response: {
      200: {
        description:
          "Archivo procesado (total o parcialmente). Las filas validas quedan disponibles para " +
          "liquidacion; las rechazadas se reportan en errors; las flaggeadas van a revision.",
        type: "object",
        properties: {
          batch_id: {
            type: "string",
            description: "Id unico del batch (UUID).",
          },
          total_rows: {
            type: "number",
            description: "Filas de datos del archivo (sin header).",
          },
          valid_rows: {
            type: "number",
            description: "Filas que pasaron la validacion de schema.",
          },
          rejected_rows: {
            type: "number",
            description: "Filas rechazadas por errores de schema.",
          },
          errors: {
            type: "array",
            description: "Detalle por fila/columna de las filas rechazadas.",
            items: rowErrorSchema,
          },
          manifest: manifestSchema,
          storage_path: {
            type: "string",
            description:
              "Ruta donde quedo archivado el CSV original del batch.",
          },
          flagged_count: {
            type: "number",
            description:
              "Filas validas marcadas 'sujetas a revision' por RN-01..04 (no liquidan).",
          },
        },
      },
      400: {
        ...simpleErrorSchema,
        description:
          "Archivo estructuralmente invalido: no se envio archivo en el campo 'file', la extension " +
          "no es .csv, el archivo esta vacio, o faltan columnas requeridas en el header.",
      },
    },
  } as const;
}
