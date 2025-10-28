import React from 'react';
import { GenerationStatus } from '../types';
import { VideoIcon } from './icons';

interface VideoGeneratorProps {
  status: GenerationStatus;
  videoUrl: string | null;
  error: string | null;
  onGenerate: () => void;
  isReady: boolean;
  progressMessage: string;
}

const LoadingSpinner: React.FC = () => (
  <div className="border-4 border-gray-600 border-t-brand-primary rounded-full w-12 h-12 animate-spin"></div>
);

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ status, videoUrl, error, onGenerate, isReady, progressMessage }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-6 h-full flex flex-col justify-center items-center">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-200 self-start">
        <VideoIcon className="w-6 h-6" />
        Generator
      </h3>
      <div className="w-full flex-grow flex flex-col justify-center items-center p-4 bg-gray-900/50 rounded-lg">
        {status === GenerationStatus.IDLE && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Ready to Create</h3>
            <p className="text-gray-400 mb-6 text-sm">Once your assets and script are ready, click the button below to start.</p>
            <button
              onClick={onGenerate}
              disabled={!isReady}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-transform duration-200 transform active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
            >
              Generate Video
            </button>
          </div>
        )}
        {(status === GenerationStatus.CHECKING_KEY || status === GenerationStatus.GENERATING) && (
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-300 font-medium animate-pulse">{progressMessage || 'Processing...'}</p>
          </div>
        )}
        {status === GenerationStatus.SUCCESS && videoUrl && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-green-400 mb-2 text-center">Video Ready!</h3>
            <video src={videoUrl} controls className="w-full rounded-md aspect-video" />
            <button
              onClick={() => window.location.reload()} // Simple way to reset state for another generation
              className="mt-4 w-full bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Generate Another
            </button>
          </div>
        )}
        {status === GenerationStatus.ERROR && (
          <div className="text-center">
            <p className="text-red-400 font-semibold mb-2">Generation Failed</p>
            <p className="text-red-300/80 text-sm bg-red-900/50 p-3 rounded-md">{error}</p>
             <button
              onClick={onGenerate}
              className="mt-4 w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;
