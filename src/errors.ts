export class UnauthorizedError extends Error {
  cause?: unknown;
  context?: Record<string, unknown>;

  constructor(
    message = "Not signed in",
    options?: {
      cause?: unknown;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = "UnauthorizedError";
    this.cause = options?.cause;
    this.context = options?.context;
  }
}
