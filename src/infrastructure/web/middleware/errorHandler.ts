import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { DomainException } from "../../../domain/exceptions/DomainException";

/**
 * Manejador global de errores (fastify.setErrorHandler). Traduce excepciones
 * a HTTP: DomainException -> 400, FastifyError 4xx -> su status real (ej.
 * 415 por content-type invalido), todo lo demas -> 500 con mensaje generico
 * (el detalle queda solo en logs, nunca se filtra al cliente).
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error(error);

  if (error instanceof DomainException) {
    reply.status(400).send({ error: error.message });
    return;
  }

  const statusCode = (error as FastifyError).statusCode ?? 500;
  if (statusCode >= 400 && statusCode < 500) {
    reply.status(statusCode).send({ error: error.message });
    return;
  }

  reply.status(500).send({ error: "Error interno del servidor" });
}
