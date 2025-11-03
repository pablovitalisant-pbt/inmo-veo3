import React, { useMemo, useRef, useState } from "react";

const API_BASE =
  (window as any).__VITE_API_BASE__ ||
  (import.meta as any).env?.VITE_API_BASE ||
  "";

type FileThumb = { file: File; url: string; label?: string };
type Stage = "idle" | "uploading" | "processing" | "done" | "error";

type Scene = {
  id: string;
  text: string;
  refIds: string[]; // IDs de thumbs seleccionadas (max 3)
};

function uid(prefix = "s") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  // --- Uploads / previews ---
  const [propImgs, setPropImgs] = useState<FileThumb[]>([]);
  const [realtorImgs, setRealtorImgs] = useState<FileThumb[]>([]);
  const inputPropRef = useRef<HTMLInputElement>(null);
  const inputRealtorRef = useRef<HTMLInputElement>(null);

  // --- Guion escena-por-escena ---
  const [scenes, setScenes] = useState<Scene[]>([
    { id: uid(), text: "", refIds: [] },
  ]);

  // --- Flujo de procesamiento ---
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");
  const videoUrl = useMemo(
    () => (slug ? `${API_BASE}/artifacts/${slug}/result_stream` : ""),
    [slug]
  );

  // ==== Helpers de thumbnails ====
  const allThumbs = useMemo(() => {
    // Damos IDs estables por URL (suficiente para UI)
    const tag = (t: FileThumb) => t.url;
    return [
      ...realtorImgs.map((t) => ({ ...t, id: tag(t), kind: "realtor" as const })),
      ...propImgs.map((t) => ({ ...t, id: tag(t), kind: "prop" as const })),
    ];
  }, [realtorImgs, propImgs]);

  const addThumbs = (
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<FileThumb[]>>
  ) => {
    if (!files?.length) return;
    const arr = Array.from(files).map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      label: f.name,
    }));
    setter((prev) => [...prev, ...arr]);
  };

  const clearKind = (kind: "prop" | "realtor") => {
    (kind === "prop" ? propImgs : realtorImgs).forEach((t) =>
      URL.revokeObjectURL(t.url)
    );
    if (kind === "prop") setPropImgs([]);
    else setRealtorImgs([]);
  };

  // ==== Escenas ====
  const addScene = () =>
    setScenes((s) => [...s, { id: uid(), text: "", refIds: [] }]);
  const removeScene = (id: string) =>
    setScenes((s) => (s.length > 1 ? s.filter((x) => x.id !== id) : s));
  const moveScene = (idx: number, dir: -1 | 1) =>
    setScenes((s) => {
      const j = [...s];
      const k = idx + dir;
      if (k < 0 || k >= j.length) return s;
      [j[idx], j[k]] = [j[k], j[idx]];
      return j;
    });
  const updateSceneText = (id: string, text: string) =>
    setScenes((s) => s.map((sc) => (sc.id === id ? { ...sc, text } : sc)));
  const toggleRef = (sceneId: string, thumbId: string) =>
    setScenes((s) =>
      s.map((sc) => {
        if (sc.id !== sceneId) return sc;
        const has = sc.refIds.includes(thumbId);
        if (has) {
          return { ...sc, refIds: sc.refIds.filter((r) => r !== thumbId) };
        } else {
          if (sc.refIds.length >= 3) return sc; // máximo 3
          return { ...sc, refIds: [...sc.refIds, thumbId] };
        }
      })
    );

  // ==== “Subir” (simulado; solo previews) ====
  const doUpload = (kind: "prop" | "realtor") => {
    setStage("uploading");
    setMessage(
      `Previews del ${kind === "prop" ? "Propiedad" : "Realtor"} listos (simulado).`
    );
    setTimeout(() => {
      setStage("idle");
      setMessage("Previews cargados ✅");
    }, 500);
  };

  // ==== Ejecutar /run con guion y refs ====
  async function handleRun() {
    setBusy(true);
    setStage("processing");
    setMessage("Procesando…");

    // Construimos payload con escenas y referencias (usamos URLs como IDs)
    const payload = {
      scenes: scenes.map((sc, idx) => ({
        id: sc.id,
        index: idx + 1,
        text: sc.text || "",
        // Mandamos “refs” como arreglo simple; el backend puede resolverlas
        // En este mock enviamos el id (url local) como string.
        refs: sc.refIds,
      })),
      // También mandamos conteo (por si el backend lo usa)
      totals: { realtor: realtorImgs.length, property: propImgs.length },
      src: "ui",
    };

    try {
      const resp = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ notes: JSON.stringify(payload) }),
      });
      const data = await resp.json();
      const s = data?.slug || "";
      if (!s) throw new Error("No se recibió slug");
      setSlug(s);
      setMessage(`SLUG: ${s} — esperando video…`);

      // Poll simple hasta que aparezca result.mp4
      for (let i = 0; i < 60; i++) {
        const r = await fetch(`${API_BASE}/artifacts/${s}`);
        const j = await r.json();
        if (j?.manifest?.outputs?.video === "result.mp4") break;
        await new Promise((r) => setTimeout(r, 2000));
      }

      setStage("done");
      setMessage("¡Video listo!");
    } catch (e: any) {
      setStage("error");
      setMessage(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/90 grid place-items-center text-white font-bold">
            IV3
          </div>
          <div>
            <div className="text-lg font-semibold">InmoVeo3</div>
            <div className="text-xs text-gray-500">Real Estate Video Generator</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={busy}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2"
          >
            {busy ? "Procesando..." : "Procesar"}
          </button>
          {slug && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2"
            >
              Ver video
            </a>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: uploads */}
        <section className="lg:col-span-1 space-y-6">
          {[
            {
              label: "Imágenes del Realtor",
              imgs: realtorImgs,
              set: setRealtorImgs,
              ref: inputRealtorRef,
              kind: "realtor" as const,
            },
            {
              label: "Imágenes de la Propiedad",
              imgs: propImgs,
              set: setPropImgs,
              ref: inputPropRef,
              kind: "prop" as const,
            },
          ].map(({ label, imgs, set, ref, kind }, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{label}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => ref.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Subir
                  </button>
                  {!!imgs.length && (
                    <button
                      onClick={() => clearKind(kind)}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={ref}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addThumbs(e.target.files, set)}
              />
              {imgs.length ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {imgs.map((t, i) => (
                      <img
                        key={i}
                        src={t.url}
                        title={t.label}
                        className="w-full h-24 object-cover rounded-xl border"
                      />
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      disabled={busy}
                      onClick={() => doUpload(kind)}
                      className="w-full py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {busy ? "Subiendo..." : "Enviar (simulado)"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No hay imágenes aún.</p>
              )}
            </div>
          ))}

          {!!message && (
            <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl p-3">
              {message}
            </div>
          )}
        </section>

        {/* Columna derecha: escenas + player */}
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Scene-by-Scene Script</h3>
              <button
                onClick={addScene}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Agregar escena
              </button>
            </div>

            <div className="space-y-4">
              {scenes.map((sc, idx) => {
                const selected = new Set(sc.refIds);
                return (
                  <div
                    key={sc.id}
                    className="border rounded-xl p-3 border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Scene {idx + 1}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => moveScene(idx, -1)}
                          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveScene(idx, 1)}
                          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeScene(sc.id)}
                          className="px-2 py-1 rounded bg-rose-100 text-rose-800 hover:bg-rose-200"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={sc.text}
                      onChange={(e) => updateSceneText(sc.id, e.target.value)}
                      placeholder="Escribe el guion de esta escena…"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                    />

                    <div className="mt-3 text-sm text-gray-600">
                      Referencias (hasta 3):
                    </div>
                    <div className="mt-2 grid grid-cols-6 gap-2">
                      {allThumbs.map((t) => {
                        const isSel = selected.has(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleRef(sc.id, t.id)}
                            className={`relative rounded-lg border overflow-hidden ${
                              isSel
                                ? "ring-2 ring-indigo-500 border-indigo-500"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            title={t.label || ""}
                          >
                            <img
                              src={t.url}
                              className="w-full h-16 object-cover"
                            />
                            {isSel && (
                              <span className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold mb-3">Player</h3>
            {videoUrl ? (
              <video key={videoUrl} src={videoUrl} controls className="w-full rounded-xl border" />
            ) : (
              <div className="h-56 grid place-items-center text-gray-500">
                Aún no hay video
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
