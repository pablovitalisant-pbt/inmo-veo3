import React, { useCallback, useState } from 'react';
import { UploadedImage } from '../types';
import { UploadIcon, TrashIcon } from './icons';

interface ImageUploaderProps {
  title: string;
  icon: React.ReactNode;
  onFilesChange: (files: UploadedImage[]) => void;
  multiple: boolean;
  images: UploadedImage[];
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ title, icon, onFilesChange, multiple, images }) => {
  const [isDragging, setIsDragging] = useState(false);

  // FIX: Refactored to remove base64 conversion, which is no longer needed.
  // The backend now accepts File objects directly, so client-side conversion is unnecessary.
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newImages = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (multiple) {
      onFilesChange([...images, ...newImages]);
    } else {
      // Revoke old URL if it exists
      if (images[0]) {
        URL.revokeObjectURL(images[0].previewUrl);
      }
      onFilesChange(newImages.slice(0, 1));
    }
  }, [multiple, onFilesChange, images]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };
  
  const removeImage = (idToRemove: string) => {
    const imageToRemove = images.find(img => img.id === idToRemove);
    if(imageToRemove) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }
    onFilesChange(images.filter(img => img.id !== idToRemove));
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-200">
        {icon}
        {title}
      </h3>
      <div className="flex-grow flex flex-col">
        <input
          type="file"
          id={title}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        <label
          htmlFor={title}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex-grow border-2 border-dashed rounded-md flex flex-col justify-center items-center text-gray-400 cursor-pointer transition-colors duration-200 ${isDragging ? 'border-brand-primary bg-gray-700/50' : 'border-gray-600 hover:border-gray-500'}`}
        >
          <UploadIcon className="h-8 w-8 mb-2" />
          <p className="text-sm">Drag & drop or <span className="font-semibold text-brand-secondary">click to upload</span></p>
        </label>
      </div>
      {images.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2 text-gray-300">Uploaded:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img src={image.previewUrl} alt={image.file.name} className="w-full h-20 object-cover rounded-md" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center rounded-md">
                   <button onClick={() => removeImage(image.id)} className="p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors">
                     <TrashIcon className="h-4 w-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
