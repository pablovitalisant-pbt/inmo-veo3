
import React from 'react';
import { VideoIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 p-4 sticky top-0 z-10">
      <div className="container mx-auto flex items-center gap-3">
        <VideoIcon className="h-8 w-8 text-brand-primary" />
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Inmo<span className="text-brand-primary">Veo3</span>
        </h1>
        <p className="text-sm text-gray-400 ml-2 hidden md:block">Real Estate Video Generator</p>
      </div>
    </header>
  );
};

export default Header;
