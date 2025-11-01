import { useCallback, useEffect, useRef, useState } from "react";
import { getArtifacts } from "./services/backend"; // corregiremos la ruta luego si fuera necesario

export type StepStatus = "idle" | "queued" | "running" | "writing" | "completed" | "failed";
export type UiState = StepStatus;

type Manifest = {
  slug: string;
  status?: StepStatus;
  steps?: { name: string; status: StepStatus; message?: string; started_at?: string; ended_at?: string }[];
  outputs?: Record<string, string>;
  bucket?: string;
  error?: { message?: string; stage?: string } | string | null;
  updated_at?: string;
};

type ArtifactResponse =
  | { manifest?: Manifest; files?: string[]; [k: string]: any }
  | (Manifest & { files?: string[]; [k: string]: any });

type PollData = {
  manifest?: Manifest | null;
  files?: string[] | null;
  raw?: ArtifactResponse | null;
};

const STORAGE_KEY = "inmov3:slug";
const MAX_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_INTERVAL_MS = 15000;

function inferStatusFromFiles(files: string[] = []): UiState {
  const hasScript = files.some(f => /script\.(json|txt)$/i.test(f));
  const hasVoice  = files.some(f => /voice\.(wav|mp3|m4a)$/i.test(f));
  const hasVideo  = files.some(f => /(result|video)\.(mp4|webm|mov)$/i.test(f));
  const hasCsv    = files.some(f => /results\.csv$/i.test(f));
  if (hasVideo) return "completed";
  if (hasVoice || hasScript || hasCsv) return "writing";
  return "running";
}
function extractManifest(payload: any): { manifest?: Manifest; files?: string[] } {
  if (!payload) return {};
  if (payload.manifest) return { manifest: payload.manifest as Manifest, files: payload.files || [] };
  if (payload.slug || payload.status || payload.steps) return { manifest: payload as Manifest, files: payload.files || [] };
  if (payload.files) return { files: payload.files as string[] };
  return {};
}
function nextDelay(attempt: number) {
  const base = Math.min(MAX_INTERVAL_MS, 1000 * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * 400);
  return base + jitter;
}

export function useArtifactPolling() {
  const [state, setState] = useState<UiState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PollData>({ manifest: null, files: null, raw: null });
  const [slug, setSlug] = useState<string | null>(() => (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null));
  const [progress, setProgress] = useState<number | null>(null);

  const etagRef = useRef<string | null>(null);
  const runningRef = useRef(false);
  const attemptRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const visibilityPausedRef = useRef(false);

  const computeUiState = (m?: Manifest, files?: string[] | null): UiState => {
    if (m?.status) return m.status;
    if (files && files.length) return inferStatusFromFiles(files);
    return "running";
  };
  const computeProgress = (m?: Manifest, files?: string[] | null): number | null => {
    if (m?.steps?.length) {
      const done = m.steps.filter(s => s.status === "completed").length;
      const total = m.steps.length;
      return Math.round((done / total) * 100);
    }
    if (files && files.length) {
      const checkpoints = [/script\.(json|txt)$/i, /voice\.(wav|mp3|m4a)$/i, /(result|video)\.(mp4|webm|mov)$/i];
      const hit = checkpoints.reduce((acc, rx, i) => (files.some(f => rx.test(f)) ? i + 1 : acc), 0);
      return Math.min(100, Math.round((hit / checkpoints.length) * 100));
    }
    return null;
  };

  const stop = useCallback(() => { runningRef.current = false; attemptRef.current = 0; }, []);
  const tick = useCallback(async () => {
    if (!slug || !runningRef.current) return;
    try {
      const headers: Record<string, string> = { "Accept": "application/json" };
      if (etagRef.current) headers["If-None-Match"] = etagRef.current as string;

      const url = new URL((import.meta as any)?.env?.VITE_API_BASE || "https://inmo-veo3-y25yqmaa3a-uc.a.run.app");
      url.pathname = `/artifacts/${encodeURIComponent(slug)}`;

      const res = await fetch(url.toString(), { headers });
      let json: any = null;
      if (res.status === 304) {
        // no changes
      } else if (res.ok) {
        const etag = res.headers.get("ETag");
        if (etag) etagRef.current = etag;
        json = await res.json();
      } else if (res.status === 404) {
        // aún no aparece, seguimos
      } else if (res.status >= 400 && res.status < 500) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }

      if (json) {
        const { manifest, files } = extractManifest(json);
        const ui = computeUiState(manifest, files ?? undefined);
        const pct = computeProgress(manifest, files ?? undefined);
        setData({ manifest: manifest ?? null, files: files ?? null, raw: json });
        setState(ui);
        setProgress(pct);
        if (ui === "completed" || ui === "failed") { stop(); return; }
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      if (!runningRef.current) return;
      attemptRef.current += 1;
      const delay = nextDelay(attemptRef.current);
      setTimeout(() => { if (runningRef.current && !visibilityPausedRef.current) tick(); }, delay);
    }
  }, [slug, stop]);

  const start = useCallback((newSlug: string) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, newSlug);
    setSlug(newSlug); setError(null);
    setData({ manifest: null, files: null, raw: null });
    setState("queued"); setProgress(0);
    etagRef.current = null; attemptRef.current = 0; startedAtRef.current = Date.now();
    runningRef.current = true;

    const watchdog = setInterval(() => {
      if (!runningRef.current || !startedAtRef.current) return;
      if (Date.now() - startedAtRef.current > MAX_TIMEOUT_MS) {
        setState("failed"); setError("Timeout de procesamiento (15 min)."); stop(); clearInterval(watchdog);
      }
    }, 5000);

    tick();
    return () => clearInterval(watchdog);
  }, [stop, tick]);

  useEffect(() => {
    if (slug && state === "idle") { runningRef.current = true; setState("queued"); tick(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVis = () => {
      visibilityPausedRef.current = document.visibilityState !== "visible";
      if (!visibilityPausedRef.current && runningRef.current) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [tick]);

  return { state, progress, data, error, slug, start, stop };
}
