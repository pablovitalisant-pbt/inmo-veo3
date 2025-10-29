import { GoogleGenAI } from '@google/genai';
import { Scene, UploadedImage } from '../types';

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // result is "data:mime/type;base64,..."
        // we need to remove the prefix
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Helper for polling a Veo generation operation
const pollOperation = async (
    ai: GoogleGenAI, 
    operation: any, 
    onProgress: (message: string) => void,
    progressPrefix: string,
) => {
    let currentOperation = operation;
    onProgress(`${progressPrefix}: Polling status...`);
    while (!currentOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
        currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
        onProgress(`${progressPrefix}: Still generating... this can take a few minutes.`);
    }
    return currentOperation;
}


interface VideoGenerationParams {
  propertyImages: UploadedImage[];
  agentImage: UploadedImage | null;
  scenes: Scene[];
  onProgress: (message: string) => void;
}

export const generateRealEstateVideo = async ({
  scenes,
  propertyImages,
  agentImage,
  onProgress,
}: VideoGenerationParams): Promise<string> => {
  // Guideline: Create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  let finalVideoOperation: any = null;
  const allImages = [...propertyImages, ...(agentImage ? [agentImage] : [])];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const progressPrefix = `Scene ${i + 1}/${scenes.length}`;
    onProgress(`${progressPrefix}: Preparing assets...`);

    const generationConfig: any = {
      numberOfVideos: 1,
      resolution: '720p', // extension requires 720p
      aspectRatio: '16:9',
    };
    
    let imagePayload: { imageBytes: string, mimeType: string } | undefined = undefined;
    if (scene.imageId) {
        const image = allImages.find(img => img.id === scene.imageId);
        if (image) {
            const base64Data = await fileToBase64(image.file);
            imagePayload = {
                imageBytes: base64Data,
                mimeType: image.file.type,
            };
        }
    }

    try {
        if (i === 0) {
            // First scene: generate a new video
            onProgress(`${progressPrefix}: Starting video generation...`);
            const operation = await ai.models.generateVideos({
                model: 'veo-3.1-generate-preview', // Use extend-capable model
                prompt: scene.description,
                ...(imagePayload && { image: imagePayload }),
                config: generationConfig,
            });
            finalVideoOperation = await pollOperation(ai, operation, onProgress, progressPrefix);

        } else {
            // Subsequent scenes: extend the previous video
            if (!finalVideoOperation?.response?.generatedVideos?.[0]?.video) {
                throw new Error("Failed to get video from previous scene to extend.");
            }
            onProgress(`${progressPrefix}: Extending video...`);
            const operation = await ai.models.generateVideos({
                model: 'veo-3.1-generate-preview',
                prompt: scene.description,
                video: finalVideoOperation.response.generatedVideos[0].video,
                // The API for extension doesn't seem to support a new reference image, so it's omitted.
                config: generationConfig,
            });
            finalVideoOperation = await pollOperation(ai, operation, onProgress, progressPrefix);
        }

        if (finalVideoOperation.error) {
           throw new Error(`Veo API error on scene ${i+1}: ${finalVideoOperation.error.message}`);
        }

    } catch (e: any) {
        // Handle API key errors specifically as per guidelines
        if (e.message?.includes("Requested entity was not found.")) {
             throw new Error("API key may be invalid. Please select a valid API key and try again. For more details on billing, visit ai.google.dev/gemini-api/docs/billing");
        }
        throw e;
    }
  }

  const downloadLink = finalVideoOperation?.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation completed, but no download link was found.");
  }
  
  onProgress("Fetching final video...");
  // Append the API key to the download link as required
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      throw new Error(`Failed to download the generated video. Status: ${videoResponse.status}. Details: ${errorText}`);
  }

  const videoBlob = await videoResponse.blob();
  return URL.createObjectURL(videoBlob);
};
