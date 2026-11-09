import { isShop, requireShop } from "@/lib/api";
import { gnaniFetch, missingKeyResponse, scrub, withGnaniLock } from "@/lib/gnani";

const MAX_BYTES = 2_500_000;

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const apiKey = process.env.GNANI_API_KEY;
  if (!apiKey) return missingKeyResponse();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ success: false, error: "Audio form was unreadable.", code: "bad_request" }, { status: 400 });
  }

  const audio = form.get("audio_file") ?? form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json(
      { success: false, error: "audio_file (recording.wav) is required.", code: "bad_request" },
      { status: 400 },
    );
  }
  if (audio.size === 0 || audio.size > MAX_BYTES) {
    return Response.json(
      { success: false, error: "Recording is empty or longer than 30 seconds.", code: "bad_audio" },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const header = new TextDecoder().decode(bytes.subarray(0, 4));
  if (header !== "RIFF") {
    return Response.json(
      {
        success: false,
        error: "Audio must be WAV. The browser should upload recording.wav, not webm.",
        code: "bad_audio",
      },
      { status: 400 },
    );
  }

  const outbound = new FormData();
  outbound.append("audio_file", new File([bytes], "recording.wav", { type: "audio/wav" }), "recording.wav");
  outbound.append("model", "prisma-v2.5");
  outbound.append("language_code", "hi-IN");
  outbound.append("format", "transcribe");

  try {
    const upstream = await withGnaniLock(() =>
      gnaniFetch("https://api.vachana.ai/stt/v3", {
        method: "POST",
        headers: { "X-API-Key-ID": apiKey },
        body: outbound,
      }),
    );
    const bodyText = await upstream.text();
    let payload: unknown = null;
    try {
      payload = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      payload = null;
    }
    if (!upstream.ok || !payload || typeof payload !== "object") {
      return Response.json(
        {
          success: false,
          error: "Gnani STT failed.",
          code: "upstream",
          detail: scrub(bodyText || upstream.statusText),
        },
        { status: upstream.status === 429 ? 429 : 502 },
      );
    }
    const record = payload as { success?: boolean; request_id?: string; transcript?: string; model?: string; error?: string };
    if (record.success === false) {
      return Response.json(
        { success: false, error: scrub(record.error || "Gnani STT rejected the audio."), code: "upstream", request_id: record.request_id },
        { status: 502 },
      );
    }
    return Response.json({
      success: record.success ?? true,
      request_id: record.request_id,
      transcript: typeof record.transcript === "string" ? record.transcript : "",
      model: record.model ?? "prisma-v2.5",
    });
  } catch {
    return Response.json(
      { success: false, error: "Gnani STT tak network nahi pahuncha.", code: "network" },
      { status: 502 },
    );
  }
}
