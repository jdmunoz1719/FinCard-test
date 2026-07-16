import multipart from "@fastify/multipart";
import { FastifyInstance } from "fastify";

/**
 * Registra @fastify/multipart para el upload de CSV (RF-01: un archivo por
 * request, maximo 10 MB). attachFieldsToBody: true puebla request.body con
 * los campos del form (incluido el archivo) para que el controller lo lea
 * desde request.body.file y el schema.body (keyword AJV `isFile`, ver
 * FastifyServer.ts) pueda validarlo y Swagger UI dibuje el file-picker.
 */
export function registerMultipart(app: FastifyInstance): void {
  app.register(multipart, {
    attachFieldsToBody: true,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });
}
