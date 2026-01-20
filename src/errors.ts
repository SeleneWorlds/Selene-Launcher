export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = 'UnauthorizedError';
  }
}
