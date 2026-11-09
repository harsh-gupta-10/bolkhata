/**
 * In-process queue so Prisma STT and Timbre TTS never run at the same time.
 * Gnani accounts may allow only one active request. The browser also awaits
 * STT before TTS. Across isolates this is best-effort; 429s are retried.
 */
let tail: Promise<void> = Promise.resolve();

export function withGnaniLock<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function gnaniFetch(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
      if (response.status === 429 && attempt < attempts - 1) {
        last = response;
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return response;
    } catch (error) {
      if (attempt === attempts - 1) throw error;
      await sleep(500 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return last ?? new Response("Gnani request failed", { status: 502 });
}

export function missingKeyResponse(): Response {
  return Response.json(
    {
      success: false,
      error:
        "GNANI_API_KEY is not set on the server. Voice is off until you add it. Typed khata still works.",
      code: "missing_api_key",
    },
    { status: 503 },
  );
}

export function scrub(text: string): string {
  return text.replace(/api[_-]?key[\w-]*/gi, "[redacted]").slice(0, 280);
}
