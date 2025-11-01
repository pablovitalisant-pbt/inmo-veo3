import React from 'react';
import { Scene, UploadedImage } from '../types';

type Props = {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  availableImages: UploadedImage[];
};

const ScriptEditor: React.FC<Props> = ({ scenes, onScenesChange, availableImages }) => {
  const addScene = () => {
    onScenesChange([...scenes, { id: `scene-${Date.now()}`, description: '', imageIds: [] }]);
  };

  const removeScene = (idToRemove: string) => {
    onScenesChange(scenes.filter(s => s.id !== idToRemove));
  };

  const updateScene = (id: string, patch: Partial<Scene>) => {
    onScenesChange(scenes.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const toggleImage = (scene: Scene, imgId: string) => {
    const has = scene.imageIds.includes(imgId);
    let next = scene.imageIds.slice();
    if (has) {
      next = next.filter(id => id !== imgId);
    } else {
      if (scene.imageIds.length >= 3) return; // máximo 3
      next.push(imgId);
    }
    updateScene(scene.id, { imageIds: next });
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <h2 className="text-lg font-semibold mb-2">Scene-by-Scene Script</h2>

      {scenes.length === 0 && (
        <div className="text-gray-400 text-sm mb-4">No scenes yet. Add one to get started!</div>
      )}

      <div className="space-y-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="bg-gray-700/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-gray-300">Scene {index + 1}</p>
              <button onClick={() => removeScene(scene.id)} className="p-1 text-gray-400 hover:text-red-400">
                Remove
              </button>
            </div>

            <textarea
              placeholder="Describe this scene..."
              value={scene.description}
              onChange={(e) => updateScene(scene.id, { description: e.target.value })}
              className="w-full bg-gray-800 rounded-lg p-2 text-sm"
              rows={3}
            />

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">
                Reference images (up to 3):
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {availableImages.map(img => {
                  const selected = scene.imageIds.includes(img.id);
                  const disabled = !selected && scene.imageIds.length >= 3;
                  return (
                    <button
                      key={img.id}
                      onClick={() => toggleImage(scene, img.id)}
                      disabled={disabled}
                      className={`relative rounded-lg overflow-hidden h-16 border ${
                        selected ? 'border-brand-primary ring-2 ring-brand-primary' : 'border-gray-600'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                      title={img.label}
                      type="button"
                    >
                      <img src={img.previewUrl} alt={img.label} className="object-cover w-full h-full" />
                      {selected && (
                        <span className="absolute top-1 right-1 bg-brand-primary text-white text-[10px] px-1 rounded">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          onClick={addScene}
          className="bg-brand-primary hover:bg-indigo-600 text-white rounded-lg px-4 py-2 w-full"
        >
          Add Scene
        </button>
      </div>
    </div>
  );
};

export default ScriptEditor;
