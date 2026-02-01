
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

export const AvatarEngine: React.FC = () => {
  const {
    avatarState, assets, borderRadius, currentViseme,
    brightness, contrast, saturation, softness, bloom, vignette, grain
  } = useStore();

  const [idleReady, setIdleReady] = useState(false);
  const [talkingReady, setTalkingReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const idleRef = useRef<HTMLVideoElement>(null);
  const talkingRef = useRef<HTMLVideoElement>(null);

  // Pre-chargement et synchronisation des flux vidéo
  useEffect(() => {
    const initVideos = async () => {
      setVideoError(false);

      if (assets.idle && idleRef.current) {
        idleRef.current.load();
        try {
          await idleRef.current.play();
        } catch (e) {
          setVideoError(true);
        }
      }

      if (assets.talking && talkingRef.current) {
        talkingRef.current.load();
        try {
          await talkingRef.current.play();
          if (avatarState !== AvatarState.TALKING) {
            talkingRef.current.pause();
            talkingRef.current.currentTime = 0;
          }
        } catch { }
      }
    };
    initVideos();
  }, [assets.idle, assets.talking]);

  // Gestion de l'état de lecture vidéo
  useEffect(() => {
    if (avatarState === AvatarState.TALKING) {
      if (talkingRef.current && assets.talking) {
        talkingRef.current.play().catch(() => { });
      }
    } else {
      if (talkingRef.current) {
        talkingRef.current.pause();
        talkingRef.current.currentTime = 0;
      }
    }
  }, [avatarState, assets.talking]);

  const showTalking = avatarState === AvatarState.TALKING && talkingReady && assets.talking;
  const showIdle = avatarState === AvatarState.IDLE && idleReady && assets.idle;

  // Récupération de l'ouverture labiale via le visème
  const openness = useMemo(() => visemeOpenness[currentViseme] || 0, [currentViseme]);

  const filterStyle = useMemo(() => {
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${softness}px)`;
  }, [brightness, contrast, saturation, softness]);

  return (
    <div className="relative w-full h-full bg-transparent flex items-center justify-center overflow-hidden">
      {/* Texture de grain pellicule (Statique) */}
      <div
        className="absolute inset-0 z-50 pointer-events-none mix-blend-overlay opacity-[0.2]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          filter: 'contrast(150%)',
          opacity: grain
        }}
      />

      {/* Vignette de focus (Statique) */}
      <div
        className="absolute inset-0 z-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, transparent 30%, rgba(0,0,0,${vignette}) 100%)`
        }}
      />

      {/* Halo Bloom (Désormais statique, pas de volume dependency) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center"
        style={{
          filter: `blur(50px)`,
          opacity: showTalking ? bloom : bloom * 0.2,
          transition: 'opacity 0.5s ease-in-out'
        }}
      >
        <div className="w-1/2 h-1/2 bg-blue-600/10 rounded-full" />
      </div>

      {/* Conteneur principal de l'Avatar - Fixe */}
      <div
        className="relative w-full h-full flex items-end justify-center"
        style={{ borderRadius: `${borderRadius}%`, overflow: 'hidden' }}
      >
        {/* Layer 1: Image de base */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-zinc-900/40" />
        <img
          src={assets.image}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${(!showIdle && !showTalking) ? 'opacity-100' : 'opacity-0'}`}
          style={{ filter: filterStyle }}
          alt="Avatar Sarra"
          onError={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        />

        {/* Layer 2: Vidéo de respiration (Idle) */}
        {assets.idle && (
          <video
            ref={idleRef}
            src={assets.idle}
            loop muted playsInline crossOrigin="anonymous"
            onCanPlay={() => setIdleReady(true)}
            onError={() => setIdleReady(false)}
            style={{ filter: filterStyle }}
            className={`absolute inset-0 w-full h-full object-contain object-bottom transition-opacity duration-700 ${showIdle ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          />
        )}

        {/* Layer 3: Vidéo de parole (Talking) - SEULE ANIMATION MAINTENUE : Lip-Sync */}
        {assets.talking && (
          <video
            ref={talkingRef}
            src={assets.talking}
            loop muted playsInline crossOrigin="anonymous"
            onCanPlay={() => setTalkingReady(true)}
            onError={() => setTalkingReady(false)}
            style={{
              filter: filterStyle,
              // Le Lip-Sync est la seule animation autorisée ici
              transform: `scaleY(${1 + openness * 0.05}) translateY(${openness * 5}px)`,
              transition: 'transform 0.1s ease-out'
            }}
            className={`absolute inset-0 w-full h-full object-contain object-bottom transition-opacity duration-200 ${showTalking ? 'opacity-100 z-20' : 'opacity-0 z-0'}`}
          />
        )}
      </div>

      {/* Interface Overlay (Statique) */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4 z-50 pointer-events-none">
        <div className={`px-6 py-3 rounded-full backdrop-blur-2xl border border-white/10 flex items-center gap-4 transition-all duration-500 ${avatarState === AvatarState.TALKING ? 'bg-blue-600/30 shadow-[0_0_30px_rgba(37,99,235,0.2)]' : 'bg-black/60 opacity-40'}`}>
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${avatarState === AvatarState.TALKING ? 'bg-blue-400' : 'bg-zinc-600'}`} />
          </div>
          <span className="text-[11px] font-black text-white uppercase tracking-[0.25em] italic">
            {avatarState === AvatarState.TALKING ? 'Sarra s\'exprime' : 'Sarra vous écoute'}
          </span>
        </div>
      </div>

      {/* Glow de parole adaptatif (Optionnel, réduit au minimum) */}
      {showTalking && (
        <div
          className="absolute inset-0 z-30 pointer-events-none bg-blue-600/5 mix-blend-screen transition-opacity duration-300"
          style={{ opacity: 0.1 + (openness * 0.1) }}
        />
      )}
    </div>
  );
};
