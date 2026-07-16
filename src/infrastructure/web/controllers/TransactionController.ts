import { MultipartFile } from "@fastify/multipart";
import { FastifyReply, FastifyRequest } from "fastify";
import { UploadResultMapper } from "../../../application/mappers/UploadResultMapper";
import { IUploadTransactionsUseCase } from "../../../domain/use-cases/IUploadTransactionsUseCase";

export interface UploadRequestBody {
  file: MultipartFile;
}

/**
 * Controller HTTP del upload de transacciones: extrae el archivo del
 * multipart, valida lo que es puramente de transporte (archivo presente,
 * extension .csv), delega al use case y mapea el resultado a HTTP:
 * processed -> 200 (procesamiento parcial), invalid_file -> 400. No
 * contiene logica de negocio.
 */
export class TransactionController {
  constructor(
    private readonly uploadUseCase: IUploadTransactionsUseCase,
    private readonly mapper: UploadResultMapper = new UploadResultMapper(),
  ) {}

  /**
   * El archivo llega en request.body.file porque el plugin de multipart se
   * registra con attachFieldsToBody: true (ver multipart.plugin.ts); eso
   * permite que Swagger UI dibuje el file-picker en "Try it out" (AJV valida
   * request.body.file con la keyword `isFile` del schema).
   */
  public async upload(
    request: FastifyRequest<{ Body: UploadRequestBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    // Validaciones de TRANSPORTE (no de negocio): archivo presente y .csv.
    const file = request.body?.file;
    if (!file) {
      reply.status(400).send({
        error:
          "Debe enviar un archivo en el campo 'file' (multipart/form-data)",
      });
      return;
    }
    if (!file.filename.toLowerCase().endsWith(".csv")) {
      reply.status(400).send({
        error: `El archivo debe ser un CSV (extension .csv). Recibido: "${file.filename}"`,
      });
      return;
    }

    const buffer = await file.toBuffer();
    const result = await this.uploadUseCase.execute({
      fileContent: buffer.toString("utf-8"),
      fileName: file.filename,
    });

    if (result.outcome === "invalid_file") {
      reply.status(400).send({ error: result.message });
      return;
    }

    reply.status(200).send(this.mapper.toResponse(result));
  }
}
