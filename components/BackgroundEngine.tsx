
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { BackgroundMedia } from '../types';

const formatDriveUrl = (url: string) => {
  const trimmed = url.trim();
  const driveIdMatch = trimmed.match(/(?:id=|\/d\/|preview\/|folders\/|file\/d\/)([a-zA-Z0-9_-]{25,})/);

  if (driveIdMatch && driveIdMatch[1]) {
    if (trimmed.includes('folders/')) return '';
    return `https://drive.google.com/uc?export=view&id=${driveIdMatch[1]}`;
  }

  if (trimmed.length > 20 && !trimmed.includes('http')) {
    return `https://drive.google.com/uc?export=view&id=${trimmed}`;
  }
  return trimmed;
};

export const BackgroundEngine: React.FC = () => {
  const { backgroundMedia, backgroundOpacity, backgroundSpeed, backgroundFit, backgroundScale } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const processedMediaList = useMemo(() =>
    backgroundMedia.map(m => ({
      ...m,
      url: m.url.startsWith('blob:') ? m.url : formatDriveUrl(m.url)
    })).filter(m => m.url.length > 0),
    [backgroundMedia]);

  useEffect(() => {
    if (processedMediaList.length <= 1) return;
    const interval = setInterval(() => {
      setPrevIndex(currentIndex);
      setCurrentIndex((prev) => (prev + 1) % processedMediaList.length);
    }, backgroundSpeed * 1000);
    return () => clearInterval(interval);
  }, [processedMediaList, backgroundSpeed, currentIndex]);

  // Force le chargement des vidéos .webm quand l'index change
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.currentTime = 0;
      currentVideo.play().catch(() => { });
    }
  }, [currentIndex]);

  if (processedMediaList.length === 0) return null; // Retourne null au lieu d'un div noir

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden w-full h-full">
      <style>{`
        @keyframes kenburns-cinema {
          0% { transform: scale(${backgroundScale}) translate(0, 0); }
          100% { transform: scale(${backgroundScale * 1.15}) translate(-1%, -1%); }
        }
        .animate-kenburns {
          animation: kenburns-cinema 60s ease-in-out infinite alternate;
        }
        .media-transition {
          transition: opacity 3s cubic-bezier(0.4, 0, 0.2, 1), 
                      transform 3s cubic-bezier(0.4, 0, 0.2, 1),
                      filter 3s ease-in-out;
        }
      `}</style>

      <div className="w-full h-full relative" style={{ opacity: backgroundOpacity }}>
        {processedMediaList.map((media, idx) => {
          const isActive = idx === currentIndex;
          const isPrev = idx === prevIndex;

          return (
            <div
              key={`${media.url}-${idx}`}
              className={`absolute inset-0 media-transition ${isActive ? 'opacity-100 z-10 scale-100 blur-0' :
                isPrev ? 'opacity-0 z-5 scale-110 blur-md' : 'opacity-0 z-0 scale-105'
                }`}
            >
              {media.type === 'video' ? (
                <video
                  ref={el => { videoRefs.current[idx] = el; }}
                  src={media.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  crossOrigin="anonymous"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: backgroundFit,
                    objectPosition: 'center',
                    transform: `scale(${backgroundScale})`,
                  }}
                  className="object-center"
                />
              ) : (
                <img
                  src={media.url}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: backgroundFit,
                    objectPosition: 'center',
                  }}
                  className={`object-center ${backgroundFit === 'cover' ? 'animate-kenburns' : ''}`}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay de profondeur cinématique réduit pour plus de transparence */}
      <div
        className="absolute inset-0 z-20"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.4) 100%)'
        }}
      />
      <div className="absolute inset-0 z-10 bg-black/5 backdrop-blur-[1px]" />
    </div>
  );
};
