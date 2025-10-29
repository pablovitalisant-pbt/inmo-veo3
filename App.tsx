import React, { useState, useMemo, useCallback } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import ScriptEditor from './components/ScriptEditor';
import VideoGenerator from './components/VideoGenerator';
import { UploadedImage, Scene, GenerationStatus } from './types';
import { AgentIcon, PropertyIcon, VideoIcon } from './components/icons';
import { generateRealEstateVideo } from './services/veoService';
import { useApiKey } from './hooks/useApiKey';


const App: React.FC = () => {
  const [propertyImages, setPropertyImages] = useState<UploadedImage[]>([]);
  const [agentImage, setAgentImage] = useState<UploadedImage[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([
    { id: 'initial-1', description: 'Opening shot of the beautiful exterior of the house.', imageId: null }
  ]);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  
  const { hasApiKey, isChecking: isCheckingApiKey, selectApiKey, resetApiKeyStatus } = useApiKey();

  const isReadyToGenerate = useMemo(() => {
    return propertyImages.length > 0 && scenes.length > 0 && scenes.every(s => s.description.trim() !== '');
  }, [propertyImages, scenes]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGeneratedVideoUrl(null);

    if (!isReadyToGenerate) {
      setError("Please upload at least one property image and complete the script for all scenes.");
      setGenerationStatus(GenerationStatus.ERROR);
      return;
    }

    if (!hasApiKey) {
        setError("Please select an API key before generating a video.");
        setGenerationStatus(GenerationStatus.ERROR);
        return;
    }
    
    setGenerationStatus(GenerationStatus.GENERATING);
    setProgressMessage("Initializing video generation...");

    try {
      const videoUrl = await generateRealEstateVideo({
        propertyImages,
        agentImage: agentImage[0] || null,
        scenes,
        onProgress: setProgressMessage,
      });

      setGeneratedVideoUrl(videoUrl);
      setGenerationStatus(GenerationStatus.SUCCESS);
      setProgressMessage("Video successfully generated!");

    } catch (e: any) {
      console.error("Video generation failed:", e);
      let errorMessage = e.message || "An unknown error occurred.";
       if (errorMessage.includes("API key may be invalid")) {
        resetApiKeyStatus();
      }
      setError(errorMessage);
      setGenerationStatus(GenerationStatus.ERROR);
    }
  }, [isReadyToGenerate, hasApiKey, propertyImages, agentImage, scenes, resetApiKeyStatus]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <Header />
      <main className="flex-grow container mx-auto p-4 lg:p-6">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6 flex flex-col">
              <ImageUploader 
                title="Property Images"
                icon={<PropertyIcon className="w-6 h-6"/>}
                onFilesChange={setPropertyImages}
                multiple={true}
                images={propertyImages}
              />
              <ImageUploader 
                title="Agent Image"
                icon={<AgentIcon className="w-6 h-6"/>}
                onFilesChange={setAgentImage}
                multiple={false}
                images={agentImage}
              />
            </div>
            <div className="min-h-[400px] md:min-h-0">
              <ScriptEditor scenes={scenes} onScenesChange={setScenes} availableImages={propertyImages} />
            </div>
          </div>
          <div className="lg:col-span-1 min-h-[400px]">
            {isCheckingApiKey ? (
              <div className="bg-gray-800/50 rounded-lg p-6 h-full flex flex-col justify-center items-center">
                  <p className="text-gray-300 animate-pulse">Checking API key...</p>
              </div>
            ) : !hasApiKey ? (
              <div className="bg-gray-800/50 rounded-lg p-6 h-full flex flex-col justify-center items-center text-center">
                  <VideoIcon className="w-12 h-12 text-brand-primary mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">API Key Required</h3>
                  <p className="text-gray-400 mb-6 text-sm max-w-sm">
                      To generate videos with Veo, please select a Google AI Studio API key.
                      Ensure your project is configured for billing to use this feature.
                  </p>
                  <button
                      onClick={selectApiKey}
                      className="w-full max-w-xs bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-transform duration-200 transform active:scale-95"
                  >
                      Select API Key
                  </button>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-brand-secondary mt-4 block">
                      Learn more about billing
                  </a>
              </div>
            ) : (
              <VideoGenerator 
                status={generationStatus}
                videoUrl={generatedVideoUrl}
                error={error}
                onGenerate={handleGenerate}
                isReady={isReadyToGenerate}
                progressMessage={progressMessage}
              />
            )}
          </div>
        </div>
      </main>
      <footer className="text-center py-4 text-gray-500 text-xs border-t border-gray-800">
        <p>Powered by Google Gemini. Created for demo purposes.</p>
      </footer>
    </div>
  );
};

export default App;
