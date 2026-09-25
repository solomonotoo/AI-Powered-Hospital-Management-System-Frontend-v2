// Environment: validated once, imported everywhere (never
// process.env scattered through features).

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  API_URL: required("NEXT_PUBLIC_API_URL", "http://localhost:8080"),
  // Shared-workstation lock delay (blueprint default 10 min, per facility later).
  IDLE_TIMEOUT_MS: Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS ?? 10 * 60 * 1000),
} as const;
