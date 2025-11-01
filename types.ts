export type ImageKind = "property" | "agent";

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  label: string;
  kind: ImageKind;
}

export interface Scene {
  id: string;
  description: string;
  /** Hasta 3 imágenes de referencia */
  imageIds: string[]; 
}
