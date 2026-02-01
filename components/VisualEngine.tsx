
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AvatarState, VisemeType } from '../types';
import { useStore } from '../store';
import { geminiClient } from '../lib/gemini-client';

const visemeOpenness: Record<VisemeType, number> = {
  'mouth_A': 0,
  'mouth_B': 0.15,
  'mouth_C': 0.3,
  'mouth_D': 0.45,
  'mouth_E': 0.6,
  'mouth_F': 0.75,
  'mouth_G': 0.9,
  'mouth_H': 1.0,
};

export const VisualEngine: React.FC = () => {
  const {
    avatarState, assets, borderRadius,
    brightness, contrast, saturation, softness, bloom, vignette, grain,
    currentViseme
  } = useStore();

  const [volume, setVolume] = useState(0);
  const [idleReady, setIdleReady] = useState(false);
  const [talkingReady, setTalkingReady] = useState(false);

  const idleRef = useRef<HTMLVideoElement>(null);
  const talkingRef = useRef<HTMLVideoElement>(null);

  // Sync des vidéos .webm
  useEffect(() => {
    if (idleRef.current) {
      idleRef.current.load();
      idleRef.current.play().catch(() => { });
    }
  }, [assets.idle]);

  useEffect(() => {
    if (talkingRef.current) {
      talkingRef.current.load();
      if (avatarState === AvatarState.TALKING) {
        talkingRef.current.play().catch(() => { });
      }
    }
  }, [assets.talking, avatarState]);

  // Volume réactif en temps réel
  useEffect(() => {
    let animationId: number;
    const updateVolume = () => {
      const processor = geminiClient.getProcessor();
      if (processor) {
        const newVol = processor.getCurrentVolume();
        setVolume(prev => prev * 0.7 + newVol * 0.3);
      }
      animationId = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const showTalking = avatarState === AvatarState.TALKING && talkingReady;
  const showIdle = avatarState === AvatarState.IDLE && idleReady;

  // Calcul du facteur d'ouverture de la bouche basé sur le visème actuel
  const openness = useMemo(() => visemeOpenness[currentViseme] || 0, [currentViseme]);

  // Style réactif enrichi par les visèmes
  const reactiveStyle = useMemo(() => {
    if (avatarState !== AvatarState.TALKING) {
      return {
        transform: 'scale(1) rotateX(0deg) translateY(0px)',
        transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      };
    }

    // Le visème contrôle une légère dilatation verticale pour simuler le mouvement de la mâchoire
    const jawDrop = openness * 10; // Jusqu'à 10px de descente
    const verticalStretch = 1 + (openness * 0.04); // Légère déformation verticale
    const scale = 1 + (volume / 500);
    const rotate = (volume / 12);

    return {
      transform: `scale(${scale}) scaleY(${verticalStretch}) rotateX(${rotate}deg) translateY(${jawDrop}px) translateZ(${volume}px)`,
      transition: 'transform 0.08s ease-out' // Très réactif pour la parole
    };
  }, [avatarState, volume, openness]);

  const filterStyle = useMemo(() => {
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${softness}px)`;
  }, [brightness, contrast, saturation, softness]);

  return (
    <div
      className="relative w-full h-full flex items-end justify-center overflow-hidden bg-transparent"
      style={{ borderRadius: `${borderRadius}%`, perspective: '1200px' }}
    >
      {/* 1. Grain Cinématique */}
      <div
        className="absolute inset-0 z-50 pointer-events-none mix-blend-overlay opacity-[0.15]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          filter: `contrast(150%) brightness(100%)`,
          opacity: grain
        }}
      />

      {/* 2. Vignette Dynamique */}
      <div
        className="absolute inset-0 z-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, transparent 20%, rgba(0,0,0,${vignette * 0.8}) 60%, rgba(0,0,0,${vignette}) 100%)`
        }}
      />

      {/* 3. Halo Bloom Réactif (modulé par le visème) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center"
        style={{
          filter: `blur(${30 + (volume * 0.5) + (openness * 20)}px)`,
          opacity: (showTalking ? bloom * (0.8 + openness * 0.4) : bloom * 0.2),
          transform: `scale(${1 + volume / 100 + openness * 0.1})`,
          transition: 'all 0.15s ease-out'
        }}
      >
        <div className="w-2/3 h-2/3 bg-blue-500/40 rounded-full shadow-[0_0_100px_rgba(59,130,246,0.5)]" />
      </div>

      {/* 4. Layer Avatar avec Animation Meta-Viseme */}
      <div
        className="relative w-full h-full flex items-end justify-center will-change-transform"
        style={reactiveStyle}
      >
        <img
          src={assets.image}
          className={`absolute inset-0 w-full h-full object-contain object-bottom transition-opacity duration-700 ${(!showIdle && !showTalking) ? 'opacity-100' : 'opacity-0'}`}
          style={{ filter: filterStyle }}
        />

        <video
          ref={idleRef}
          src={assets.idle}
          loop muted autoPlay playsInline
          onCanPlay={() => setIdleReady(true)}
          crossOrigin="anonymous"
          style={{ filter: filterStyle }}
          className={`absolute inset-0 w-full h-full object-contain object-bottom transition-opacity duration-500 ${showIdle ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        />

        <video
          ref={talkingRef}
          src={assets.talking}
          loop muted autoPlay playsInline
          onCanPlay={() => setTalkingReady(true)}
          crossOrigin="anonymous"
          style={{
            filter: `${filterStyle} drop-shadow(0 0 ${volume / 4}px rgba(59,130,246,${bloom}))`,
            // On peut aussi moduler l'opacité très légèrement pour un effet organique
            opacity: showTalking ? (0.95 + openness * 0.05) : 0
          }}
          className={`absolute inset-0 w-full h-full object-contain object-bottom transition-opacity duration-150 ${showTalking ? 'opacity-100 z-20' : 'opacity-0 z-0'}`}
        />
      </div>

      {/* Overlay de parole adaptatif */}
      {showTalking && (
        <div
          className="absolute inset-0 z-30 pointer-events-none bg-blue-500/5 mix-blend-screen transition-opacity duration-300"
          style={{ opacity: 0.2 + (openness * 0.3) }}
        />
      )}
    </div>
  );
};
