
import React, { useState, useEffect, useRef } from 'react';
import { AvatarEngine } from './components/AvatarEngine';
import { BackgroundEngine } from './components/BackgroundEngine';
import { SettingsPanel } from './components/SettingsPanel';
import { useStore } from './store';
import { geminiClient } from './lib/gemini-client';
import { AvatarState } from './types';

const App: React.FC = () => {
  const {
    isListening,
    isSpeaking,
    hasDiscrepancy,
    avatarState,
    setListening,
    performance,
    updatePerformance,
    circleSize,
    position,
    updatePosition
  } = useStore();

  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Position persistante : on ne l'initialise que si aucune position n'est enregistrée
  useEffect(() => {
    const saved = localStorage.getItem('UI_POSITION');
    if (!saved || position.x === -9999) {
      const startX = 20;
      const startY = window.innerHeight - (circleSize * 1.3) - 20;
      updatePosition({ x: startX, y: startY });
    }
  }, []); // Exécuté une seule fois au montage

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') setShowSettings(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      updatePerformance({ uptime: performance.uptime + 1 });
    }, 1000);
    return () => clearInterval(timer);
  }, [performance.uptime]);

  const toggleConnection = async (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging) return;
    e.stopPropagation();

    if (isConnected) {
      geminiClient.disconnect();
      setIsConnected(false);
      setListening(false);
    } else {
      try {
        await geminiClient.connect((status) => {
          setIsConnected(status);
          setListening(status);
        });
      } catch (err: any) {
        console.error("Microphone Error:", err);
      }
    }
  };

  const handleStart = (clientX: number, clientY: number, target: HTMLElement) => {
    if (target.closest('button')) return;
    setIsDragging(false);
    dragOffset.current = { x: clientX - position.x, y: clientY - position.y };

    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
      setIsDragging(true);
      const currX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      updatePosition({ x: currX - dragOffset.current.x, y: currY - dragOffset.current.y });
    };

    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler as any);
      document.removeEventListener('mouseup', upHandler);
      document.removeEventListener('touchmove', moveHandler as any);
      document.removeEventListener('touchend', upHandler);
      setTimeout(() => setIsDragging(false), 50);
    };

    document.addEventListener('mousemove', moveHandler as any);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('touchmove', moveHandler as any, { passive: false });
    document.addEventListener('touchend', upHandler);
  };

  if (position.x === -9999) return <div className="bg-black w-screen h-screen flex items-center justify-center font-black uppercase tracking-widest text-zinc-800">Sarra is waking up...</div>;

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans select-none text-white touch-none">
      <style>{`
        @keyframes status-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-status { animation: status-blink 2s ease-in-out infinite; }
      `}</style>

      <BackgroundEngine />

      <div
        ref={containerRef}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.target as HTMLElement)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement)}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: circleSize,
          height: circleSize * 1.3,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 40
        }}
        className="flex flex-col items-center group"
      >
        <div className="relative w-full h-full bg-transparent overflow-hidden">
          {/* Transition vers AvatarEngine refactorisé */}
          <AvatarEngine />

          {hasDiscrepancy && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest z-50">
              SOUCI DE PRÉCISION
            </div>
          )}
        </div>

        <div className="relative -mt-[255px] group z-50">
          <button
            onClick={toggleConnection}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border border-white/20 shadow-2xl pointer-events-auto transform group-hover:scale-110 active:scale-95 ${isConnected ? 'bg-red-600' : 'bg-blue-600 hover:bg-blue-500'
              }`}
          >
            <svg className={`w-7 h-7 text-white transition-transform duration-700 ${isConnected ? 'rotate-[135deg]' : ''}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </button>

          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
            <p className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-500 group-hover:text-white transition-colors animate-status">
              {isConnected ? 'LIVE SESSION' : 'STANDBY'}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-4 z-30 opacity-20 hover:opacity-100 transition-opacity">
        <div className="flex flex-col">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Core_Sys</p>
          <p className="text-[10px] font-mono font-bold text-blue-500">SARRA v3.2</p>
        </div>
      </div>

      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default App;
