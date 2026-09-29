/** Only allow redirects to same-site paths, never to another origin ("//evil.com", "/\\evil.com"). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
