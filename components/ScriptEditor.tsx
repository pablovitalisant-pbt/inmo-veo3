
import React from 'react';
import { Scene, UploadedImage } from '../types';
import { ScriptIcon, TrashIcon } from './icons';

interface ScriptEditorProps {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  availableImages: UploadedImage[];
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ scenes, onScenesChange, availableImages }) => {
  
  const addScene = () => {
    onScenesChange([...scenes, { id: `scene-${Date.now()}`, description: '', imageId: null }]);
  };

  const removeScene = (idToRemove: string) => {
    onScenesChange(scenes.filter(scene => scene.id !== idToRemove));
  };
  
  const updateScene = (idToUpdate: string, newValues: Partial<Scene>) => {
    onScenesChange(scenes.map(scene => scene.id === idToUpdate ? { ...scene, ...newValues } : scene));
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-200">
        <ScriptIcon className="w-6 h-6" />
        Scene-by-Scene Script
      </h3>
      <div className="space-y-4 flex-grow overflow-y-auto pr-2">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="bg-gray-800 p-3 rounded-md border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-sm text-gray-300">Scene {index + 1}</p>
              <button onClick={() => removeScene(scene.id)} className="p-1 text-gray-400 hover:text-red-400">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={scene.description}
              onChange={(e) => updateScene(scene.id, { description: e.target.value })}
              placeholder="e.g., A bright shot of the living room, sunlight streaming in."
              className="w-full bg-gray-700/50 p-2 rounded-md text-sm text-gray-200 placeholder-gray-500 border border-gray-600 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
              rows={3}
            />
            <select
              value={scene.imageId || ''}
              onChange={(e) => updateScene(scene.id, { imageId: e.target.value || null })}
              className="mt-2 w-full bg-gray-700/50 p-2 rounded-md text-sm text-gray-200 border border-gray-600 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
            >
              <option value="">No reference image</option>
              {availableImages.map(image => (
                <option key={image.id} value={image.id}>{image.file.name}</option>
              ))}
            </select>
          </div>
        ))}
        {scenes.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            <p>No scenes yet. Add one to get started!</p>
          </div>
        )}
      </div>
       <button 
          onClick={addScene} 
          className="mt-4 w-full bg-brand-secondary/80 hover:bg-brand-secondary text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
        >
          Add Scene
        </button>
    </div>
  );
};

export default ScriptEditor;
