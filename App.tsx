import React, { useMemo, useState } from "react";
import Header from "./components/Header";
import ScriptEditor from "./components/ScriptEditor";
import type { Scene, UploadedImage } from "./types";

export default function App() {
  const [propertyImages, setPropertyImages] = useState<UploadedImage[]>([]);
  const [agentImage, setAgentImage] = useState<UploadedImage | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);

  // Construye la lista combinada de imágenes disponibles para el editor
  const availableImages = useMemo<UploadedImage[]>(
    () => [...propertyImages, ...(agentImage ? [agentImage] : [])],
    [propertyImages, agentImage]
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

  const onPickAgentImage: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    const img: UploadedImage = {
      id: `agent-${Date.now()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      label: file.name,
      kind: "agent",
    };
    setAgentImage(img);
    e.currentTarget.value = "";
  };

  const removeProperty = (id: string) =>
    setPropertyImages((prev) => prev.filter((x) => x.id !== id));
  const clearAgent = () => setAgentImage(null);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Header />

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Columna 1: Property Images */}
          <section className="col-span-1 bg-gray-800 rounded-2xl p-4 shadow">
            <h2 className="text-lg font-semibold mb-2">Property Images</h2>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickPropertyImages}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition">
                <p className="text-sm text-gray-300">Drag & drop or click to upload</p>
              </div>
            </label>

            {propertyImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {propertyImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.previewUrl}
                      alt={img.label}
                      className="rounded-lg object-cover w-full h-24"
                    />
                    <button
                      onClick={() => removeProperty(img.id)}
                      className="absolute top-1 right-1 bg-gray-900/70 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Columna 2: Script editor */}
          <section className="col-span-1 lg:col-span-2 bg-gray-800 rounded-2xl p-4 shadow">
            <ScriptEditor
              scenes={scenes}
              onScenesChange={setScenes}
              availableImages={availableImages}
            />
          </section>

          {/* Columna 3 completa: Agent image */}
          <section className="col-span-1 lg:col-span-3 bg-gray-800 rounded-2xl p-4 shadow">
            <h2 className="text-lg font-semibold mb-2">Agent Image</h2>
            <div className="flex items-start gap-4">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPickAgentImage}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition w-60">
                  <p className="text-sm text-gray-300">Drag & drop or click to upload</p>
                </div>
              </label>

              {agentImage && (
                <div className="flex items-center gap-4">
                  <img
                    src={agentImage.previewUrl}
                    alt={agentImage.label}
                    className="rounded-lg object-cover w-24 h-24"
                  />
                  <button
                    onClick={clearAgent}
                    className="bg-gray-700 hover:bg-red-600 px-3 py-2 rounded-lg text-sm"
                  >
                    Remove agent image
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
