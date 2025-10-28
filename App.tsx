import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import ScriptEditor from './components/ScriptEditor';
import VideoGenerator from './components/VideoGenerator';
import { UploadedImage, Scene, GenerationStatus } from './types';
import { AgentIcon, PropertyIcon } from './components/icons';
import { generateVideo, getJobStatus } from './services/veoService';

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
  const [jobSlug, setJobSlug] = useState<string | null>(null);

  const isReadyToGenerate = useMemo(() => {
    return propertyImages.length > 0 && scenes.length > 0 && scenes.every(s => s.description.trim() !== '');
  }, [propertyImages, scenes]);

  // Polling effect for job status
  useEffect(() => {
    if (jobSlug && generationStatus === GenerationStatus.GENERATING) {
      const intervalId = setInterval(async () => {
        try {
          const statusData = await getJobStatus(jobSlug);
          setProgressMessage(statusData.message);

          if (statusData.status === 'SUCCESS') {
            setGeneratedVideoUrl(statusData.video_url);
            setGenerationStatus(GenerationStatus.SUCCESS);
            setJobSlug(null); // Stop polling
            clearInterval(intervalId);
          } else if (statusData.status === 'ERROR') {
            setError(statusData.error || 'An unknown error occurred on the backend.');
            setGenerationStatus(GenerationStatus.ERROR);
            setJobSlug(null); // Stop polling
            clearInterval(intervalId);
          }
        } catch (e: any) {
          setError(`Failed to get job status: ${e.message}`);
          setGenerationStatus(GenerationStatus.ERROR);
          setJobSlug(null); // Stop polling
          clearInterval(intervalId);
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(intervalId);
    }
  }, [jobSlug, generationStatus]);


  const handleGenerate = useCallback(async () => {
    setError(null);
    setGeneratedVideoUrl(null);

    if (!isReadyToGenerate) {
      setError("Please upload at least one property image and complete the script for all scenes.");
      setGenerationStatus(GenerationStatus.ERROR);
      return;
    }
    
    setGenerationStatus(GenerationStatus.GENERATING);
    setProgressMessage("Uploading assets to the server...");

    try {
      const response = await generateVideo({
        propertyImages,
        agentImage: agentImage[0] || null,
        scenes,
      });
      setJobSlug(response.slug);
      setProgressMessage("Video generation started. This may take a few minutes...");
    } catch (e: any) {
      console.error("Video generation failed:", e);
      let errorMessage = e.message || "An unknown error occurred.";
      setError(errorMessage);
      setGenerationStatus(GenerationStatus.ERROR);
    }
  }, [isReadyToGenerate, propertyImages, agentImage, scenes]);

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
            <VideoGenerator 
              status={generationStatus}
              videoUrl={generatedVideoUrl}
              error={error}
              onGenerate={handleGenerate}
              isReady={isReadyToGenerate} // Simplified readiness check
              progressMessage={progressMessage}
            />
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
