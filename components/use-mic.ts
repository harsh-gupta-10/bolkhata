"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordingToWav } from "@/lib/wav";

export function useMic(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const finish = useCallback(async (blob: Blob) => {
    if ((Date.now() - startedRef.current) / 1000 < 0.45 || blob.size < 400) {
      setBusy(false);
      setError("Thoda aur boliye.");
      return;
    }
    try {
      const wav = await recordingToWav(blob);
      const body = new FormData();
      body.append("audio_file", new File([wav], "recording.wav", { type: "audio/wav" }), "recording.wav");
      const response = await fetch("/api/stt", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as { transcript?: string; error?: string; code?: string };
      if (!response.ok) {
        setError(data.code === "missing_api_key" ? "Voice band hai. GNANI_API_KEY server par lagao, ya neeche likho." : data.error || "Network nahi chala.");
        return;
      }
      const transcript = data.transcript?.trim() ?? "";
      if (!transcript) {
        setError("Kuch sunai nahi diya. Dobara boliye.");
        return;
      }
      onTranscript(transcript);
    } catch {
      setError("Yeh recording padh nahi paayi. Chrome se bolo, ya likh kar chalao.");
    } finally {
      setBusy(false);
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    const recorder = recorderRef.current;
    setRecording(false);
    if (recorder && recorder.state !== "inactive") {
      setBusy(true);
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (recording || busy) return;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Mic is browser mein nahi chala. Neeche likh kar chalao.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void finish(blob);
      };
      recorderRef.current = recorder;
      recorder.start(200);
      startedRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        const seconds = (Date.now() - startedRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= 30) stop();
      }, 200);
    } catch {
      setError("Mic ki ijazat chahiye. Browser settings mein allow karein.");
    }
  }, [busy, finish, recording, stop]);

  return { recording, elapsed, busy, error, setError, start, stop };
}
