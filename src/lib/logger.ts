type Level = "info" | "warn" | "error";
type Context = Record<string, unknown>;

function serialize(value: unknown) {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  return value;
}

function emit(level: Level, event: string, context: Context = {}) {
  const entry: Context = { level, event, at: new Date().toISOString() };
  for (const [key, value] of Object.entries(context)) entry[key] = serialize(value);
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Structured one-line JSON logs so Vercel (or any log drain) can filter on `event`. */
export const logger = {
  info: (event: string, context?: Context) => emit("info", event, context),
  warn: (event: string, context?: Context) => emit("warn", event, context),
  error: (event: string, context?: Context) => emit("error", event, context),
};
