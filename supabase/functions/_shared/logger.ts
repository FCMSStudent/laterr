type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LOG_LEVEL: LogLevel = "info";

const parseLogLevel = (value?: string | null): LogLevel | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized in LOG_LEVELS) {
    return normalized as LogLevel;
  }
  return null;
};

const isDebugEnabled = (value?: string | null): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
};

const getConfiguredLogLevel = (): LogLevel => {
  const configured = parseLogLevel(Deno.env.get("LOG_LEVEL"));
  if (configured) return configured;
  if (isDebugEnabled(Deno.env.get("DEBUG"))) return "debug";
  return DEFAULT_LOG_LEVEL;
};

const shouldLog = (level: LogLevel, configuredLevel: LogLevel): boolean =>
  LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];

type LogContext = Record<string, unknown>;

const logToConsole = (level: LogLevel, payload: Record<string, unknown>): void => {
  const message = JSON.stringify(payload);
  switch (level) {
    case "debug":
      console.debug(message);
      break;
    case "info":
      console.info(message);
      break;
    case "warn":
      console.warn(message);
      break;
    case "error":
      console.error(message);
      break;
    default:
      console.log(message);
  }
};

export const createLogger = ({
  requestId,
  userId,
  startTime,
}: {
  requestId: string;
  userId?: string;
  startTime: number;
}) => {
  const configuredLevel = getConfiguredLogLevel();
  const baseContext: LogContext = {
    requestId,
    startTime,
    ...(userId ? { userId } : {}),
  };

  const log = (level: LogLevel, message: string, context?: LogContext) => {
    if (!shouldLog(level, configuredLevel)) return;
    logToConsole(level, {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...baseContext,
      ...(context ?? {}),
    });
  };

  return {
    info: (message: string, context?: LogContext) => log("info", message, context),
    warn: (message: string, context?: LogContext) => log("warn", message, context),
    error: (message: string, context?: LogContext) => log("error", message, context),
    debug: (message: string, context?: LogContext) => log("debug", message, context),
  };
};
