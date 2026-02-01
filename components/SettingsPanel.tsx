import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { geminiClient } from '../lib/gemini-client';
import { User, Shield, Video, Brain, Mic, Settings, Upload, X, Film, Image as ImageIcon, Trash2, RotateCcw, Sun, SlidersHorizontal, Wand2, Maximize, ZoomIn, Sparkles, Layers, Activity } from 'lucide-react';
import { BackgroundMedia } from '../types';

export const SettingsPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const store = useStore();
  const {
    systemInstruction, updateSystemInstruction,
    userMemory, updateUserMemory,
    assets, updateAssets,
    backgroundMedia, updateBackgroundMedia,
    backgroundOpacity, updateBackgroundOpacity,
    backgroundSpeed, updateBackgroundSpeed,
    backgroundFit, updateBackgroundFit,
    backgroundScale, updateBackgroundScale,
    brightness, contrast, saturation, softness, bloom, vignette, grain,
    updateVisualEffect,
    circleSize, updateCircleSize,
    borderRadius, updateBorderRadius,
    micThreshold, updateMicThreshold,
    auditLogs, clearAuditLogs
  } = store;

  const [instruction, setInstruction] = useState(systemInstruction);
  const [memory, setMemory] = useState(userMemory);
  const [bgUrlsText, setBgUrlsText] = useState(backgroundMedia.map(m => m.url).join('\n'));
  const [activeTab, setActiveTab] = useState<'studio' | 'brain' | 'audio' | 'logs'>('studio');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [currentVolume, setCurrentVolume] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'idle' | 'talking' | null>(null);

  // Animation loop pour le VU-mètre de calibration
  useEffect(() => {
    let animationId: number;
    const updateLevel = () => {
      if (activeTab === 'audio') {
        const processor = geminiClient.getProcessor();
        if (processor) {
          setCurrentVolume(processor.getCurrentVolume());
        }
      }
      animationId = requestAnimationFrame(updateLevel);
    };
    updateLevel();
    return () => cancelAnimationFrame(animationId);
  }, [activeTab]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadType) {
      const url = URL.createObjectURL(file);
      updateAssets({ [uploadType]: url });
    }
    setUploadType(null);
  };

  const handleBackgroundFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Fix: Explicitly type 'file' as File to resolve 'unknown' type inference issues with Array.from(FileList)
      const newMedia: BackgroundMedia[] = Array.from(files).map((file: File) => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      }));
      const updatedList = [...backgroundMedia, ...newMedia];
      updateBackgroundMedia(updatedList);
      setBgUrlsText(updatedList.map(m => m.url).join('\n'));
    }
  };

  const handleClearBackground = () => {
    updateBackgroundMedia([]);
    setBgUrlsText('');
  };

  const resetAvatarAssets = () => {
    updateAssets({
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200',
      idle: '',
      talking: ''
    });
  };

  const handleGlobalSave = () => {
    setSaveStatus('saving');
    const urls = bgUrlsText.split('\n').filter(u => u.trim().length > 0);
    const media: BackgroundMedia[] = urls.map(u => {
      const existing = backgroundMedia.find(m => m.url === u.trim());
      if (existing) return existing;
      const isVideo = u.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || u.includes('video');
      return { url: u.trim(), type: isVideo ? 'video' : 'image' };
    });
    updateBackgroundMedia(media);
    updateSystemInstruction(instruction);
    updateUserMemory(memory);
    setTimeout(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 overflow-hidden">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] w-full max-w-6xl h-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">SARRA <span className="text-blue-500">v3.1</span></h2>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-1">Ultra-Sync Cinema Studio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-full transition-all group border border-white/5">
            <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="w-full md:w-80 border-r border-white/5 p-8 flex md:flex-col gap-4 bg-black/40 overflow-x-auto md:overflow-y-auto no-scrollbar">
            {[
              { id: 'studio', label: 'Cinématique', icon: <Video className="w-5 h-5" /> },
              { id: 'brain', label: 'Cerveau RAG', icon: <Brain className="w-5 h-5" /> },
              { id: 'audio', label: 'Interface Audio', icon: <Mic className="w-5 h-5" /> },
              { id: 'logs', label: 'Audit System', icon: <Shield className="w-5 h-5" /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-none md:w-full text-left px-6 py-5 rounded-[1.8rem] text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-4 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                {tab.icon} <span>{tab.label}</span>
              </button>
            ))}
            <button onClick={handleGlobalSave} className="hidden md:block mt-auto w-full py-5 rounded-[2rem] font-black text-[10px] tracking-widest uppercase bg-white text-black hover:scale-[1.05] transition-all">
              {saveStatus === 'saved' ? 'Config Appliquée ✓' : 'Sauvegarder'}
            </button>
          </div>

          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-[#0d0d0d] custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-20 pb-12">

              {activeTab === 'studio' && (
                <div className="space-y-20">
                  <div className="space-y-10">
                    <header className="flex justify-between items-center">
                      <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic flex items-center gap-3">
                        <Sparkles className="w-7 h-7 text-blue-500" /> Post-Traitement
                      </h3>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/[0.02] border border-white/5 p-10 rounded-[3rem]">
                      {[
                        { id: 'brightness', label: 'Luminosité', min: 0.5, max: 1.5, step: 0.05, icon: <Sun className="w-4 h-4" /> },
                        { id: 'contrast', label: 'Contraste', min: 0.5, max: 1.5, step: 0.05, icon: <SlidersHorizontal className="w-4 h-4" /> },
                        { id: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.1, icon: <Layers className="w-4 h-4" /> },
                        { id: 'bloom', label: 'Glow Bloom', min: 0, max: 1, step: 0.05, icon: <Wand2 className="w-4 h-4" /> },
                        { id: 'vignette', label: 'Vignettage', min: 0, max: 1, step: 0.05, icon: <Maximize className="w-4 h-4" /> },
                        { id: 'grain', label: 'Grain Pellicule', min: 0, max: 0.5, step: 0.05, icon: <ImageIcon className="w-4 h-4" /> },
                        { id: 'softness', label: 'Douceur / Flou', min: 0, max: 10, step: 0.5, icon: <Sparkles className="w-4 h-4" /> }
                      ].map(eff => (
                        <div key={eff.id} className="space-y-4 bg-black/40 p-6 rounded-3xl border border-white/5">
                          <div className="flex justify-between items-center">
                            <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                              {eff.icon} {eff.label}
                            </label>
                            <span className="text-blue-500 font-mono text-xs">{(store as any)[eff.id]}</span>
                          </div>
                          <input
                            type="range" min={eff.min} max={eff.max} step={eff.step}
                            value={(store as any)[eff.id]}
                            onChange={(e) => updateVisualEffect(eff.id as any, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-10">
                    <header className="flex justify-between items-end">
                      <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic">Décor Arrière-Plan</h3>
                      <button onClick={handleClearBackground} className="flex items-center gap-2 px-6 py-3 bg-red-600/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-red-500/20">
                        <Trash2 className="w-4 h-4" /> Vider
                      </button>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/[0.02] border border-white/5 p-10 rounded-[3rem]">
                      <div className="space-y-5 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Maximize className="w-4 h-4" /> Fit Mode
                        </label>
                        <div className="flex gap-2">
                          {['cover', 'contain', 'fill'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => updateBackgroundFit(mode as any)}
                              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${backgroundFit === mode ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-5 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            <ZoomIn className="w-4 h-4" /> Zoom Global
                          </label>
                          <span className="text-blue-500 font-mono font-bold text-xs">{backgroundScale.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range" min="0.5" max="3" step="0.05"
                          value={backgroundScale}
                          onChange={(e) => updateBackgroundScale(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="space-y-5 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Opacité Fond
                          </label>
                          <span className="text-blue-500 font-mono font-bold text-xs">{(backgroundOpacity * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range" min="0" max="1" step="0.05"
                          value={backgroundOpacity}
                          onChange={(e) => updateBackgroundOpacity(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="space-y-5 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Vitesse Cycle
                          </label>
                          <span className="text-blue-500 font-mono font-bold text-xs">{backgroundSpeed}s</span>
                        </div>
                        <input
                          type="range" min="5" max="60" step="5"
                          value={backgroundSpeed}
                          onChange={(e) => updateBackgroundSpeed(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="col-span-full space-y-5 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">URLs Médias (.webm supporté)</label>
                          <button onClick={() => bgFileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl shadow-blue-900/40">
                            <Upload className="w-3 h-3" /> Importer
                          </button>
                          <input type="file" ref={bgFileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleBackgroundFileUpload} />
                        </div>
                        <textarea
                          value={bgUrlsText}
                          onChange={(e) => setBgUrlsText(e.target.value)}
                          placeholder="https://...webm"
                          className="w-full h-32 bg-zinc-950 border border-white/5 rounded-2xl p-4 text-[10px] font-mono text-blue-200/50 outline-none resize-none focus:border-blue-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <header className="flex justify-between items-end">
                      <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic">Géométrie Avatar</h3>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/[0.02] border border-white/5 p-10 rounded-[3rem]">
                      <div className="space-y-5 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Maximize className="w-4 h-4" /> Taille Avatar
                          </label>
                          <span className="text-blue-500 font-mono font-bold text-xs">{circleSize}px</span>
                        </div>
                        <input
                          type="range" min="100" max="800" step="10"
                          value={circleSize}
                          onChange={(e) => updateCircleSize(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="space-y-5 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Bords Arrondis
                          </label>
                          <span className="text-blue-500 font-mono font-bold text-xs">{borderRadius}%</span>
                        </div>
                        <input
                          type="range" min="0" max="50" step="1"
                          value={borderRadius}
                          onChange={(e) => updateBorderRadius(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <header className="flex justify-between items-end">
                      <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic">Sources Avatar</h3>
                      <button onClick={resetAvatarAssets} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-zinc-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/5">
                        <RotateCcw className="w-4 h-4" /> Reset
                      </button>
                    </header>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                      {[
                        { id: 'image', label: 'Portrait', asset: assets.image, type: 'img' },
                        { id: 'idle', label: 'Idle .webm', asset: assets.idle, type: 'video' },
                        { id: 'talking', label: 'Talking .webm', asset: assets.talking, type: 'video' }
                      ].map((item) => (
                        <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 flex flex-col items-center gap-4 group hover:border-white/10 transition-all">
                          <div className="w-full aspect-square bg-zinc-950 overflow-hidden border border-white/5 relative" style={{ borderRadius: `${borderRadius}%` }}>
                            {item.type === 'img' ? <img src={item.asset} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} /> : (item.asset ? <video src={item.asset} className="w-full h-full object-cover" muted autoPlay loop playsInline crossOrigin="anonymous" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><Film className="w-10 h-10" /></div>)}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                              <div className="flex flex-col gap-2">
                                <button onClick={() => { setUploadType(item.id as any); fileInputRef.current?.click(); }} className="px-6 py-3 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest">Modifier</button>
                                {item.asset && item.id !== 'image' && (
                                  <button onClick={() => updateAssets({ [item.id]: '' })} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-red-500/20">
                                    <Trash2 className="w-3 h-3" /> Supprimer
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'brain' && (
                <div className="space-y-16">
                  <div className="space-y-6">
                    <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic">IA Directive</h3>
                    <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} className="w-full h-64 bg-black/60 border border-white/10 rounded-[2.5rem] p-10 text-blue-100/60 font-mono text-sm leading-relaxed focus:ring-1 ring-blue-500 outline-none resize-none" />
                  </div>
                  <div className="space-y-6">
                    <header className="flex justify-between items-end">
                      <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic">Mémoire Long-terme</h3>
                      <button onClick={() => setMemory('')} className="flex items-center gap-2 px-6 py-3 bg-red-600/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-red-500/20">
                        <Trash2 className="w-4 h-4" /> Reset
                      </button>
                    </header>
                    <textarea value={memory} onChange={(e) => setMemory(e.target.value)} className="w-full h-48 bg-black/60 border border-white/10 rounded-[2.5rem] p-10 text-blue-100/40 font-mono text-sm leading-relaxed focus:ring-1 ring-blue-500 outline-none resize-none" />
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-4 italic">Note : Cette mémoire est automatiquement enrichie par Sarra lors de vos sessions.</p>
                  </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-12">
                  <header className="flex justify-between items-center">
                    <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic flex items-center gap-3">
                      <Mic className="w-7 h-7 text-blue-500" /> Calibration Micro
                    </h3>
                  </header>

                  <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-12">
                    {/* Visual Level Meter */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" /> Niveau d'entrée Temps Réel
                        </label>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${currentVolume > micThreshold ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          {currentVolume > micThreshold ? 'DÉTECTÉ' : 'SILENCE'}
                        </span>
                      </div>

                      <div className="relative h-12 bg-black/40 rounded-2xl overflow-hidden border border-white/5">
                        {/* VU Meter Segments */}
                        <div className="absolute inset-0 flex gap-1 p-2">
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-sm transition-all duration-75 ${i * 2 < currentVolume
                                ? (i * 2 > 80 ? 'bg-red-500' : i * 2 > 60 ? 'bg-yellow-500' : 'bg-blue-500')
                                : 'bg-zinc-900'
                                }`}
                            />
                          ))}
                        </div>

                        {/* Threshold Indicator Overlay */}
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-white z-20 shadow-[0_0_10px_white] transition-all duration-300"
                          style={{ left: `${micThreshold}%` }}
                        >
                          <div className="absolute top-0 -translate-x-1/2 -translate-y-full px-2 py-1 bg-white text-black text-[8px] font-black rounded-t-lg">
                            GATE
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <label className="text-white text-[10px] font-black uppercase tracking-widest">Seuil de Déclenchement (Gate)</label>
                          <p className="text-zinc-500 text-[9px] uppercase tracking-tighter">Ajustez pour que Sarra ne s'active pas avec le bruit ambiant.</p>
                        </div>
                        <span className="text-blue-500 font-mono font-bold text-xl">{micThreshold}%</span>
                      </div>

                      <div className="relative pt-6">
                        <input
                          type="range" min="1" max="100" value={micThreshold}
                          onChange={(e) => updateMicThreshold(parseInt(e.target.value))}
                          className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[8px] font-black text-zinc-600">SENSIBLE</span>
                          <span className="text-[8px] font-black text-zinc-600">STRICT</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
                      <Shield className="w-5 h-5 text-blue-500 shrink-0" />
                      <p className="text-[9px] text-blue-200/60 leading-relaxed uppercase tracking-wider">
                        Conseil : Parlez normalement et placez le curseur <span className="text-white font-black">Gate</span> juste à droite du niveau moyen de votre bruit de fond (quand vous ne parlez pas).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-12">
                  <header className="flex justify-between items-center">
                    <h3 className="text-white font-black text-3xl uppercase tracking-tighter italic flex items-center gap-3">
                      <Shield className="w-7 h-7 text-blue-500" /> Audit System Logs
                    </h3>
                    {auditLogs.length > 0 && (
                      <button onClick={clearAuditLogs} className="flex items-center gap-2 px-6 py-3 bg-white/5 text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/10 hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" /> Vider les logs
                      </button>
                    )}
                  </header>

                  <div className="space-y-4">
                    {auditLogs.length === 0 ? (
                      <div className="p-10 border border-white/5 rounded-[2.5rem] bg-white/[0.02] text-center">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black">Aucun log d'audit disponible.</p>
                      </div>
                    ) : (
                      auditLogs.map((log, i) => (
                        <div key={i} className={`p-8 border rounded-[2rem] transition-all ${log.isHonest ? 'bg-white/[0.02] border-white/5' : 'bg-red-500/5 border-red-500/20'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${log.isHonest ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>
                              {log.isHonest ? 'HONNÊTE ✓' : 'DISCRÉPANCE ⚠'}
                            </span>
                          </div>
                          <p className="text-blue-100/60 font-mono text-xs mb-2">Q: {log.query}</p>
                          <p className="text-white text-sm leading-relaxed">{log.response}</p>
                          {log.discrepancy && (
                            <div className="mt-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-1">Détails de l'anomalie :</p>
                              <p className="text-red-200/60 text-xs italic">{log.discrepancy}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="md:hidden pt-8 pb-12">
                <button onClick={handleGlobalSave} className="w-full py-5 rounded-[2rem] font-black text-[10px] tracking-widest uppercase bg-white text-black hover:scale-[1.05] transition-all">
                  {saveStatus === 'saved' ? 'Config Appliquée ✓' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};