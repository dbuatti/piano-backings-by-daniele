import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Best-effort human-readable message from anything thrown or returned as an error
// (Error instances, Supabase/PostgREST error objects, strings).
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

// Same, but for Edge Function errors: supabase.functions.invoke wraps a non-2xx
// response in an error whose message is generic ("Edge Function returned a
// non-2xx status code"). The function's own JSON { error } body carries the real
// reason, so reach into the response context and use it when present.
export async function getFunctionErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred."
): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string" && body.error) return body.error;
    } catch {
      /* body wasn't JSON — fall through */
    }
  }
  return getErrorMessage(error, fallback);
}
