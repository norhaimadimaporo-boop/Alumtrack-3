type ClientErrorContext = Record<string, unknown>;

export function reportClientError(error: unknown, context: ClientErrorContext = {}) {
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[AlumTrack]", message, context, error);
}
