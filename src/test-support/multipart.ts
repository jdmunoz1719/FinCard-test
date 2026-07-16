/** Construye un body multipart/form-data crudo para simular un upload de archivo en tests HTTP. */
export function buildMultipartCsv(filename: string, content: string) {
  const boundary = "----FinCardTestBoundary";
  const payload = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    "Content-Type: text/csv",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return {
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload,
  };
}
