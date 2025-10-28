import { Scene, UploadedImage } from '../types';

// The backend is expected to run on port 8080
const API_BASE_URL = 'http://localhost:8080';

// No longer need fileToBase64 on the client, the browser's FormData handles File objects.

interface VideoGenerationParams {
  propertyImages: UploadedImage[];
  agentImage: UploadedImage | null;
  scenes: Scene[];
}

interface RunResponse {
  slug: string;
  num_escenas: number;
}

interface JobStatusResponse {
  status: 'PENDING' | 'GENERATING' | 'SUCCESS' | 'ERROR';
  message: string;
  video_url?: string;
  error?: string;
}


// Calls the new FastAPI backend to start a video generation job
export const generateVideo = async ({
  propertyImages,
  agentImage,
  scenes,
}: VideoGenerationParams): Promise<RunResponse> => {
  const formData = new FormData();

  // Create a script from scenes
  const scriptText = scenes
    .map((scene, index) => `Scene ${index + 1}: ${scene.description} (Image Ref: ${scene.imageId || 'None'})`)
    .join('\n');
  const scriptBlob = new Blob([scriptText], { type: 'text/plain' });
  formData.append('guion', scriptBlob, 'guion.txt');

  // Append property images
  propertyImages.forEach(img => {
    formData.append('propiedad_images', img.file, img.file.name);
  });
  
  // Append agent image if it exists
  if (agentImage) {
    formData.append('agente_images', agentImage.file, agentImage.file.name);
  }
  
  // Append other form fields required by the backend
  // Using a generic slug for this example
  const slug = `property-${Date.now()}`;
  formData.append('slug', slug);
  formData.append('plataforma', '16:9'); // Default value
  formData.append('estilo', 'RECORRIDO_INMOBILIARIO'); // Default value
  formData.append('objetivo', 'captar_leads'); // Default value

  const response = await fetch(`${API_BASE_URL}/run`, {
    method: 'POST',
    body: formData,
    // Note: Don't set 'Content-Type' header when using FormData with files,
    // the browser will set it correctly with the boundary.
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
    throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
  }

  return response.json();
};

// Polls the backend for the status of a generation job
export const getJobStatus = async (slug: string): Promise<JobStatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/jobs/${slug}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Failed to fetch job status for ${slug}` }));
        throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
    }

    return response.json();
}
