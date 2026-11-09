"use client";

import { useRef, useState } from "react";

export function useTimbre() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const lastText = useRef("");
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    if (state !== "error") setState("idle");
  }

  async function play(text: string) {
    lastText.current = text;
    stop();
    setError(null);
    setState("loading");
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
        setState("error");
        setError(body.code === "missing_api_key" ? "Timbre band hai. GNANI_API_KEY server par lagao." : body.error || "Timbre nahi chala.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.onerror = () => {
        setState("error");
        setError("Awaz nahi chali.");
      };
      await audio.play();
      setState("playing");
    } catch {
      setState("error");
      setError("Timbre tak network nahi pahuncha.");
    }
  }

  return {
    state,
    error,
    stop,
    play,
    retry: () => (lastText.current ? play(lastText.current) : Promise.resolve()),
  };
}
