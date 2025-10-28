
// FIX: Removed the `base64` property as it's no longer needed for backend communication.
export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
}

export interface Scene {
  id: string;
  description: string;
  imageId: string | null;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  CHECKING_KEY = 'CHECKING_KEY',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
