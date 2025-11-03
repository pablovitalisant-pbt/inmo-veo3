import React from "react";
import type { Scene, UploadedImage } from "../types";

type Props = { scenes: Scene[], images: UploadedImage[] };

export default function ScenePreview({ scenes, images }: Props) {
  if (scenes.length === 0) {
    return <div className="text-sm text-gray-400">No scenes yet. Add one to get started!</div>;
  }
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {scenes.map((sc, i) => {
        const thumbId = sc.imageIds[0];
        const thumb = images.find(im => im.id === thumbId);
        return (
          <div key={sc.id} className="rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
            <div className="h-32 bg-gray-700">
              {thumb ? <img src={thumb.previewUrl} alt={thumb.label} className="w-full h-full object-cover"/> : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
              )}
            </div>
            <div className="p-3 space-y-1">
              <div className="text-xs text-gray-400">Scene {i+1}</div>
              <div className="text-sm line-clamp-2">{sc.description || "…"}</div>
              <div className="text-[10px] text-gray-500">{sc.imageIds.length} ref. images</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
