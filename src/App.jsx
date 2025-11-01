import React, { useEffect, useMemo, useRef, useState } from "react";

// === Config ===
const API_BASE = (import.meta as any).env?.VITE_API_BASE || (window as any).VITE_API_BASE || "";

// === Tipos ===
type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
  label: string;
  kind: "property" | "agent";
};

type Scene = {
  id: string;
  description: string;
  imageIds: string[]; // máx 3
};

type RunResponse = { slug: string; bucket: string };

type ArtifactManifest = {
  slug: string;
  bucket: string;
  status?: string;
  outputs?: { video?: string };
};

// Helpers HTTP
async function postRun(notes: any): Promise<RunResponse> {
  const body = new URLSearchParams();
  body.set("notes", JSON.stringify(notes));
  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`POST /run ${res.status}`);
  return res.json();
}

async function getArtifact(slug: string): Promise<{ slug: string; manifest: ArtifactManifest }>{
  const r = await fetch(`${API_BASE}/artifacts/${slug}`);
  if (!r.ok) throw new Error(`GET /artifacts/${slug} ${r.status}`);
  return r.json();
}

async function getSignedVideoUrl(slug: string): Promise<string> {
  const r = await fetch(`${API_BASE}/artifacts/${slug}/result_url`);
  if (!r.ok) throw new Error("No result.mp4 todavía");
  const j = await r.json();
  return j.url as string;
}

// UI helpers
function clsx(...list: (string | false | undefined)[]) {
  return list.filter(Boolean).join(" ");
}

function PrettyButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }
) {
  const { variant = "primary", className, children, ...rest } = props;
  const base =
    "rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const styles =
    variant === "primary"
      ? "bg-brand-primary hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 focus-visible:ring-indigo-400"
      : "bg-transparent hover:bg-white/5 text-indigo-300 border border-indigo-500/30";
  return (
    <button className={clsx(base, styles, className)} {...rest}>
      {children}
    </button>
  );
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-gray-800/70 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/10">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white/90">{title}</h2>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ImageGrid({ items, onRemove }: { items: UploadedImage[]; onRemove?: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {items.map((img) => (
        <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/10">
          <img src={img.previewUrl} alt={img.label} className="w-full h-24 object-cover" />
          {onRemove && (
            <button
              onClick={() => onRemove(img.id)}
              className="absolute top-1 right-1 bg-gray-900/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function SceneRow({
  scene,
  allImages,
  onChange,
  onRemove,
}: {
  scene: Scene;
  allImages: UploadedImage[];
  onChange: (patch: Partial<Scene>) => void;
  onRemove: () => void;
}) {
  const toggle = (imgId: string) => {
    const exists = scene.imageIds.includes(imgId);
    const next = exists ? scene.imageIds.filter((x) => x !== imgId) : scene.imageIds.length < 3 ? [...scene.imageIds, imgId] : scene.imageIds;
    onChange({ imageIds: next });
  };
  return (
    <div className="space-y-3 bg-gray-800/40 rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white/90">Scene</p>
        <button onClick={onRemove} className="text-xs text-red-300/90 hover:text-red-200">Remove</button>
      </div>
      <textarea
        value={scene.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Describe this scene..."
        className="w-full bg-gray-900/50 border border-white/10 rounded-lg p-2 text-sm text-white/90"
        rows={3}
      />
      <div>
        <p className="text-xs text-white/60 mb-1">Reference images (up to 3)</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {allImages.map((img) => {
            const active = scene.imageIds.includes(img.id);
            const disabled = !active && scene.imageIds.length >= 3;
            return (
              <button
                key={img.id}
                onClick={() => toggle(img.id)}
                disabled={disabled}
                className={clsx(
                  "relative h-16 rounded-lg overflow-hidden border",
                  active ? "border-brand-primary ring-2 ring-brand-primary" : "border-white/10",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                title={img.label}
                type="button"
              >
                <img src={img.previewUrl} className="w-full h-full object-cover" />
                {active && <span className="absolute top-1 right-1 bg-brand-primary text-white text-[10px] px-1 rounded">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [propertyImages, setPropertyImages] = useState<UploadedImage[]>([]);
  const [agentImages, setAgentImages] = useState<UploadedImage[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSlug, setLastSlug] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pollingMsg, setPollingMsg] = useState<string | null>(null);

  const allImages = useMemo(() => [...propertyImages, ...agentImages], [propertyImages, agentImages]);

  const pick = (
    setter: React.Dispatch<React.SetStateAction<UploadedImage[]>>, 
    kind: "property" | "agent"
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imgs: UploadedImage[] = files.map((f) => ({
      id: `${kind}-${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      label: f.name,
      kind,
    }));
    setter((old) => [...old, ...imgs]);
    e.currentTarget.value = "";
  };

  const removeFrom = (setter: React.Dispatch<React.SetStateAction<UploadedImage[]>>) => (id: string) =>
    setter((xs) => xs.filter((i) => i.id !== id));

  const addScene = () => setScenes((xs) => [...xs, { id: `scene-${Date.now()}`, description: "", imageIds: [] }]);
  const updateScene = (id: string, patch: Partial<Scene>) => setScenes((xs) => xs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeScene = (id: string) => setScenes((xs) => xs.filter((s) => s.id !== id));

  // === Enviar job y hacer polling ===
  const submit = async () => {
    setBusy(true);
    setError(null);
    setVideoUrl(null);
    setPollingMsg("Esperando a result.mp4 …");
    try {
      const payload = {
        kind: "veo-job",
        requested_at: new Date().toISOString(),
        scenes: scenes.map((s) => ({ id: s.id, description: s.description, imageIds: s.imageIds })),
        propertyImages: propertyImages.map((p) => ({ id: p.id, name: p.label, kind: p.kind })),
        agentImages: agentImages.map((a) => ({ id: a.id, name: a.label, kind: a.kind })),
      };
      const { slug } = await postRun(payload);
      setLastSlug(slug);

      // Polling hasta ver outputs.video === "result.mp4"
      for (let i = 0; i < 90; i++) {
        const { manifest } = await getArtifact(slug);
        const step = manifest?.status ?? manifest?.outputs?.video ?? "…";
        setPollingMsg(`Estado: ${step}`);
        if (manifest?.outputs?.video === "result.mp4") break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      const url = await getSignedVideoUrl(slug);
      setVideoUrl(url);
      setPollingMsg("Listo");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Inmo<span className="text-brand-primary">Veo3</span></h1>
          <div className="flex items-center gap-3">
            {lastSlug && (
              <a
                className="rounded-xl px-3 py-2 text-sm bg-emerald-700 hover:bg-emerald-600"
                href={`https://console.cloud.google.com/storage/browser/_details/${"inmo-veo3-artifacts-859994227667"}/${lastSlug}/result.mp4?project=gen-lang-client-0047902430`}
                target="_blank"
              >
                Ver video en GCS
              </a>
            )}
            <PrettyButton onClick={submit} disabled={busy || scenes.length === 0}>
              {busy ? "Procesando…" : "Procesar"}
            </PrettyButton>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500/30 text-red-100 rounded-xl p-3 text-sm">ERROR: {error}</div>
        )}

        {/* Property Images */}
        <Card
          title="Property Images"
          right={
            <label className="cursor-pointer text-xs bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1">
              Subir
              <input type="file" accept="image/*" multiple className="hidden" onChange={pick(setPropertyImages, "property")} />
            </label>
          }
        >
          {propertyImages.length === 0 ? (
            <p className="text-sm text-white/60">Arrastra y suelta o haz clic en “Subir”.</p>) : (
            <ImageGrid items={propertyImages} onRemove={removeFrom(setPropertyImages)} />
          )}
        </Card>

        {/* Scenes */}
        <Card
          title="Scene-by-Scene Script"
          right={<PrettyButton variant="ghost" onClick={addScene}>Add Scene</PrettyButton>}
        >
          <div className="space-y-4">
            {scenes.length === 0 && (
              <p className="text-sm text-white/60">No scenes yet. Add one to get started!</p>
            )}
            {scenes.map((s) => (
              <SceneRow
                key={s.id}
                scene={s}
                allImages={allImages}
                onChange={(p) => updateScene(s.id, p)}
                onRemove={() => removeScene(s.id)}
              />
            ))}
          </div>
        </Card>

        {/* Agent Images */}
        <Card
          title="Agent Images"
          right={
            <label className="cursor-pointer text-xs bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1">
              Subir
              <input type="file" accept="image/*" multiple className="hidden" onChange={pick(setAgentImages, "agent")} />
            </label>
          }
        >
          {agentImages.length === 0 ? (
            <p className="text-sm text-white/60">Arrastra retratos PNG con fondo transparente o haz clic en “Subir”.</p>) : (
            <ImageGrid items={agentImages} onRemove={removeFrom(setAgentImages)} />
          )}
        </Card>

        {/* Estado / Player */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card title="Estado del job">
            <div className="text-sm text-white/80 space-y-1">
              <div>Backend: <span className="text-white/60">{API_BASE || "(auto)"}</span></div>
              <div>Slug: <span className="text-white/60">{lastSlug ?? "—"}</span></div>
              <div>{busy ? (pollingMsg || "Procesando…") : "Listo para procesar"}</div>
            </div>
          </Card>
          <div className="lg:col-span-2">
            <Card title="Preview del Video">
              {videoUrl ? (
                <video src={videoUrl} controls className="w-full rounded-xl border border-white/10 shadow-2xl" />
              ) : (
                <p className="text-sm text-white/60">Aún no hay resultado. Procesa un job para ver el preview aquí.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
