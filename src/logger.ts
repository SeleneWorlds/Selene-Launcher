import {
  debug as tauriDebug,
  error as tauriError,
  info as tauriInfo,
  warn as tauriWarn,
} from "@tauri-apps/plugin-log";

function stringifyValue(value: unknown): string {
  if (value instanceof Error) {
    const errorDetails: Record<string, unknown> = {
      name: value.name,
      message: value.message,
    };
    if ("stack" in value && value.stack) {
      errorDetails.stack = value.stack;
    }
    if ("cause" in value && value.cause) {
      errorDetails.cause = value.cause;
    }
    return JSON.stringify(errorDetails);
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "undefined";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatLogMessage(args: unknown[]): string {
  return args.map((arg) => stringifyValue(arg)).join(" ");
}

function forwardToTauri(
  logger: (message: string) => Promise<void>,
  args: unknown[],
): void {
  const message = formatLogMessage(args);
  void logger(message).catch(() => {
    // Ignore plugin logging failures and preserve the original console output.
  });
}

export function initTauriLogging(): void {
  const originalConsole = {
    log: console.log.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args: unknown[]) => {
    originalConsole.log(...args);
    forwardToTauri(tauriInfo, args);
  };
  console.debug = (...args: unknown[]) => {
    originalConsole.debug(...args);
    forwardToTauri(tauriDebug, args);
  };
  console.info = (...args: unknown[]) => {
    originalConsole.info(...args);
    forwardToTauri(tauriInfo, args);
  };
  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    forwardToTauri(tauriWarn, args);
  };
  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    forwardToTauri(tauriError, args);
  };
}

export function logInfo(message: string, details?: Record<string, unknown>): void {
  if (details) {
    console.info(message, details);
  } else {
    console.info(message);
  }
}

export function logWarn(message: string, details?: Record<string, unknown>): void {
  if (details) {
    console.warn(message, details);
  } else {
    console.warn(message);
  }
}

export function logError(message: string, details?: Record<string, unknown>): void {
  if (details) {
    console.error(message, details);
  } else {
    console.error(message);
  }
}
