import { isShop, requireShop } from "@/lib/api";
import { ensureSpokenNumbers } from "@/lib/hindi";
import { gnaniFetch, missingKeyResponse, scrub, withGnaniLock } from "@/lib/gnani";

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const apiKey = process.env.GNANI_API_KEY;
  if (!apiKey) return missingKeyResponse();

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text === "string") text = body.text.trim();
  } catch {
    return Response.json({ success: false, error: "JSON body required.", code: "bad_request" }, { status: 400 });
  }
  if (!text || text.length > 500) {
    return Response.json(
      { success: false, error: "TTS text is missing or too long.", code: "bad_request" },
      { status: 400 },
    );
  }

  const spoken = ensureSpokenNumbers(text);
  const payload = {
    text: spoken,
    voice: "Poorvi",
    model: "timbre-v2.5",
    language: "hi-en",
    speed: 1.0,
    audio_config: {
      sample_rate: 24000,
      num_channels: 1,
      sample_width: 2,
      encoding: "linear_pcm",
      container: "wav",
    },
  };

  try {
    const upstream = await withGnaniLock(() =>
      gnaniFetch("https://api.vachana.ai/api/v1/tts/inference", {
        method: "POST",
        headers: {
          "X-API-Key-ID": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || contentType.includes("application/json") || contentType.includes("text/")) {
      const detail = scrub(await upstream.text());
      return Response.json(
        { success: false, error: "Gnani TTS failed.", code: "upstream", detail },
        { status: upstream.status === 429 ? 429 : 502 },
      );
    }
    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { success: false, error: "Gnani TTS tak network nahi pahuncha.", code: "network" },
      { status: 502 },
    );
  }
}
