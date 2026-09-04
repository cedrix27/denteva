import { logger } from "@/lib/logger";

/**
 * Maps a thrown error to an HTTP response.
 * `getCurrentCabinet` throws known codes; anything else is a real failure and
 * must be logged as a 500 instead of being reported to the user as a 401.
 */
export function respondToError(route: string, error: unknown, context?: Record<string, unknown>) {
  const code = error instanceof Error ? error.message : "";
  if (code === "UNAUTHENTICATED") return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (code === "CABINET_NOT_CONFIGURED") return Response.json({ error: "Aucun cabinet n’est rattaché à ce compte." }, { status: 409 });
  logger.error("api.unhandled_error", { route, ...context, error });
  return Response.json({ error: "Une erreur interne est survenue." }, { status: 500 });
}
