/**
 * Safe server-side logger.
 *
 * Error logs must never leak request payloads (e.g. `snapshot.html`),
 * credentials, or headers. `logError` records only the error message,
 * code, and explicitly provided metadata after redacting sensitive keys.
 */

const SENSITIVE_KEY_PATTERN =
  /html|authorization|cookie|set-cookie|token|secret|password|passwd|pwd|api[-_]?key|session|credential|private[-_]?key|client[-_]?secret/i;

const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 2000;
const MAX_DEPTH = 6;

type Sanitized = unknown;

const truncate = (value: string): string =>
  value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
    : value;

/**
 * Deep-clones `value` while redacting sensitive object keys and truncating
 * long strings. Circular references are replaced with `[Circular]`.
 */
export const sanitizeForLogging = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): Sanitized => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return truncate(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return REDACTED;
  }
  if (typeof value !== "object") {
    return REDACTED;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  if (depth >= MAX_DEPTH) {
    return Array.isArray(value) ? "[Array]" : "[Object]";
  }
  seen.add(value);

  if (value instanceof Error) {
    return {
      code: extractErrorCode(value),
      message: truncate(value.message),
      name: value.name,
    };
  }
  if (value instanceof URL) {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogging(item, depth + 1, seen));
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const sanitized: Record<string, Sanitized> = {};
  for (const [key, entry] of entries) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : sanitizeForLogging(entry, depth + 1, seen);
  }
  return sanitized;
};

const extractErrorCode = (error: Error): string | number | undefined => {
  const candidate = (error as Error & { code?: unknown }).code;
  return typeof candidate === "string" || typeof candidate === "number"
    ? candidate
    : undefined;
};

const extractMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
};

/**
 * Logs an error without exposing sensitive payload data. Emits a single
 * JSON-friendly object via `console.error` containing only the context,
 * message, code, and redacted metadata.
 */
export const logError = (
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void => {
  const code = error instanceof Error ? extractErrorCode(error) : undefined;
  console.error(
    JSON.stringify({
      code,
      context,
      message: truncate(extractMessage(error)),
      ...(metadata ? { metadata: sanitizeForLogging(metadata) } : {}),
    })
  );
};
