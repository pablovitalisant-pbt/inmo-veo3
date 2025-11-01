import React, { useMemo, useState, useCallback } from "react";
import Header from "./components/Header";
import ScriptEditor from "./components/ScriptEditor";
import type { Scene, UploadedImage } from "./types";
import { submitJob } from "./services/backend";
import { useArtifactPolling } from "./hooks/useArtifactPolling";

function extractSlug(resp: any): string | null {
  return resp?.slug || resp?.ran?.slug || resp?.result?.slug || null;
}
function extractBucket(resp: any): string | null {
  return resp?.bucket || resp?.ran?.bucket || resp?.result?.bucket || null;
}

export default function App() {
  const [propertyImages, setPropertyImages] = useState<UploadedImage[]>([]);
  const [agentImages, setAgentImages] = useState<UploadedImage[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitResp, setSubmitResp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBucket, setLastBucket] = useState<string | null>(null);

  const { state, progress, data, error: pollError, slug, start, stop } = useArtifactPolling();

  const availableImages = useMemo<UploadedImage[]>(
    () => [...propertyImages, ...agentImages],
    [propertyImages, agentImages]
  );

  const onPickPropertyImages: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    const newImgs: UploadedImage[] = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      label: f.name,
      kind: "property",
    }));
    setPropertyImages((prev) => [...prev, ...newImgs]);
    e.currentTarget.value = "";
  };
  const onPickAgentImages: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    const newImgs: UploadedImage[] = files.map((f) => ({
      id: `agent-${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      label: f.name,
      kind: "agent",
    }));
    setAgentImages((prev) => [...prev, ...newImgs]);
    e.currentTarget.value = "";
  };
  const removeProperty = (id: string) => setPropertyImages((prev) => prev.filter((x) => x.id !== id));
  const removeAgent = (id: string) => setAgentImages((prev) => prev.filter((x) => x.id !== id));

  const process = useCallback(async () => {
    setBusy(true); setError(null); setSubmitResp(null);
    try {
      const payload = {
        kind: "veo-job",
        requested_at: new Date().toISOString(),
        scenes: scenes.map((s) => ({ id: s.id, description: s.description, imageIds: s.imageIds })),
        propertyImages: propertyImages.map((p) => ({ id: p.id, name: p.label, kind: p.kind })),
        agentImages: agentImages.map((a) => ({ id: a.id, name: a.label, kind: a.kind })),
      };
      const resp = await submitJob(payload);
      setSubmitResp(resp);
      const s = extractSlug(resp);
      const b = extractBucket(resp);
      if (b) setLastBucket(b);
      if (!s) throw new Error("La respuesta de /run no incluye 'slug'. Revisa el backend.");
      start(s);
    } catch (e: any) {
      setError(e?.message || String(e)); stop();
    } finally { setBusy(false); }
  }, [scenes, propertyImages, agentImages, start, stop]);

  const statusText = (() => {
    const map: Record<string, string> = {
      idle: "Listo para procesar",
      queued: "En cola…",
      running: "Procesando…",
      writing: "Guardando artefactos…",
      completed: "Completado ✅",
      failed: "Error ❌",
    };
    return map[state] || String(state);
  })();

  const files = data?.files || [];
  const manifest: any = data?.manifest || null;
  const videoName =
    manifest?.outputs?.video || files?.find((f) => /(result|video)\.(mp4|webm|mov)$/i.test(f)) || null;

  const videoConsoleUrl =
    slug && videoName && (lastBucket || manifest?.bucket)
      ? `https://console.cloud.google.com/storage/browser/_details/${encodeURIComponent(
          lastBucket || manifest?.bucket
        )}/${encodeURIComponent(slug)}/${encodeURIComponent(
          videoName
        )}?project=${encodeURIComponent(
          (import.meta as any)?.env?.VITE_GCP_PROJECT || ""
        )}`
      : null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Header />

        <div className="bg-gray-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-300">
            {busy ? "Procesando..." : statusText}
            {slug ? <span className="ml-2 text-gray-400">slug: <code>{slug}</code></span> : null}
          </div>
          <button
            onClick={process}
            disabled={busy || state === "queued" || state === "running" || state === "writing"}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2"
          >
            {busy ? "Enviando..." : "Procesar"}
          </button>
        </div>

        {typeof progress === "number" && (
          <div className="bg-gray-800 rounded-2xl p-4 mb-4">
            <div className="text-sm mb-2">Progreso</div>
            <div className="w-full bg-gray-700 h-2 rounded">
              <div
                className={`h-2 rounded ${state === "failed" ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${Math.max(5, Math.min(100, progress))}%`, transition: "width 300ms" }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="col-span-1 bg-gray-800 rounded-2xl p-4 shadow">
            <h2 className="text-lg font-semibold mb-2">Property Images</h2>
            <label className="block">
              <input type="file" accept="image/*" multiple onChange={onPickPropertyImages} className="hidden" />
              <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition">
                <p className="text-sm text-gray-300">Drag & drop or click to upload</p>
              </div>
            </label>
            {propertyImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {propertyImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.previewUrl} alt={img.label} className="rounded-lg object-cover w-full h-24" />
                    <button
                      onClick={() => removeProperty(img.id)}
                      className="absolute top-1 right-1 bg-gray-900/70 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                      title="Remove"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="col-span-1 lg:col-span-2">
            <ScriptEditor scenes={scenes} onScenesChange={setScenes} availableImages={availableImages} />
          </section>

          <section className="col-span-1 lg:col-span-3 bg-gray-800 rounded-2xl p-4 shadow">
            <h2 className="text-lg font-semibold mb-2">Agent Images</h2>
            <label className="block">
              <input type="file" accept="image/*" multiple onChange={onPickAgentImages} className="hidden" />
              <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition w-60">
                <p className="text-sm text-gray-300">Drag & drop or click to upload</p>
              </div>
            </label>
            {agentImages.length > 0 && (
              <div className="grid grid-cols-6 gap-3 mt-4">
                {agentImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.previewUrl} alt={img.label} className="rounded-lg object-cover w-24 h-24" />
                    <button
                      onClick={() => removeAgent(img.id)}
                      className="absolute top-1 right-1 bg-gray-900/70 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                      title="Remove"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 space-y-3">
          {error && <div className="text-red-400 text-sm">ERROR SUBMIT: {error}</div>}
          {pollError && <div className="text-red-400 text-sm">ERROR POLLING: {pollError}</div>}
          {submitResp && (
            <details className="bg-gray-800 rounded-xl p-3 text-xs">
              <summary className="cursor-pointer text-gray-300">Respuesta de /run</summary>
              <pre className="overflow-auto">{JSON.stringify(submitResp, null, 2)}</pre>
            </details>
          )}
        </div>

        {state === "completed" && slug && videoName && (lastBucket || manifest?.bucket) && (
          <a
            className="inline-block mt-4 bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2"
            href={`https://console.cloud.google.com/storage/browser/_details/${encodeURIComponent(lastBucket || manifest?.bucket)}/${encodeURIComponent(slug)}/${encodeURIComponent(videoName)}?project=${encodeURIComponent((import.meta as any)?.VITE_GCP_PROJECT || "")}`}
            target="_blank" rel="noreferrer"
          >Abrir video en GCS</a>
        )}
      </div>
    </div>
  );
}
