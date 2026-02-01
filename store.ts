
import { create } from 'zustand';
import { StoreState, AvatarState, Position, VisemeType, BackgroundMedia, AuditLog, AvatarAssets } from './types';
import { ragEngine } from './lib/ragEngine';

export const DEFAULT_INSTRUCTION = `Core Directive : Sarra pour Afef
Mission fondamentale :
Je suis Sarra, l'assistante personnelle et professeure de français d'Afef. Mon rôle est de transformer l'apprentissage du français en une expérience fluide, vivante et parfaitement adaptée à sa vie, ses passions et ses objectifs. Je ne suis pas un cours — je suis un compagnon de conversation qui grandit avec elle.

🎯 Principes directeurs :
1. Ancrer chaque échange dans les passions d'Afef (voyages, culture, loisirs).
2. Adapter le contenu aux objectifs concrets (expression orale, vocabulaire professionnel, voyages).
3. Respecter son rythme de vie (micro-séances de 5 à 10 minutes).
4. Transformer les erreurs en progrès avec bienveillance.
5. Favoriser l'expression naturelle et la fluidité plutôt que la correction grammaticale systématique.

💬 Ma voix :
Chaleureuse, patiente, encourageante. Je parle comme une amie cultivée qui croit en elle. Je corrige subtilement en reformulant, sans jamais interrompre son élan. Je rends le français désirable, pas intimidant.

Contrainte de réponse : Sois concise, naturelle et utilise le tutoiement chaleureux avec Afef.`;

const DEFAULT_ASSETS = {
  image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200',
  idle: '',
  talking: ''
};

const DEFAULT_BG_MEDIA: BackgroundMedia[] = [
  { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000", type: 'image' },
  { url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2000", type: 'image' }
];

const getInitialPosition = (): Position => ({ x: -9999, y: -9999 });

export const useStore = create<StoreState>((set) => ({
  isListening: false,
  isSpeaking: false,
  hasDiscrepancy: false,
  avatarState: AvatarState.IDLE,
  currentViseme: 'mouth_A',
  systemInstruction: localStorage.getItem('SYSTEM_INSTRUCTION') || DEFAULT_INSTRUCTION,
  userMemory: localStorage.getItem('USER_MEMORY') || "Afef est une cliente fidèle...",
  assets: {
    image: (() => {
      const saved = localStorage.getItem('ASSET_IMAGE');
      return (saved && !saved.startsWith('blob:')) ? saved : DEFAULT_ASSETS.image;
    })(),
    idle: (() => {
      const saved = localStorage.getItem('ASSET_IDLE');
      return (saved && !saved.startsWith('blob:')) ? saved : DEFAULT_ASSETS.idle;
    })(),
    talking: (() => {
      const saved = localStorage.getItem('ASSET_TALKING');
      return (saved && !saved.startsWith('blob:')) ? saved : DEFAULT_ASSETS.talking;
    })(),
  },
  performance: { latency: 0, fps: 60, uptime: 0, tokensPerSecond: 0 },
  auditLogs: [],
  circleSize: parseInt(localStorage.getItem('UI_CIRCLE_SIZE') || '400'),
  borderRadius: parseInt(localStorage.getItem('UI_BORDER_RADIUS') || '0'),
  position: JSON.parse(localStorage.getItem('UI_POSITION') || '{"x": -9999, "y": -9999}'),
  micThreshold: parseInt(localStorage.getItem('MIC_THRESHOLD') || '12'),
  backgroundMedia: JSON.parse(localStorage.getItem('BG_MEDIA') || JSON.stringify(DEFAULT_BG_MEDIA)),
  backgroundOpacity: parseFloat(localStorage.getItem('BG_OPACITY') || '0.4'),
  backgroundSpeed: parseInt(localStorage.getItem('BG_SPEED') || '15'),
  backgroundFit: (localStorage.getItem('BG_FIT') as any) || 'cover',
  backgroundScale: parseFloat(localStorage.getItem('BG_SCALE') || '1.0'),

  // Réglages Visuels v3.0
  brightness: parseFloat(localStorage.getItem('VIS_BRIGHTNESS') || '1.0'),
  contrast: parseFloat(localStorage.getItem('VIS_CONTRAST') || '1.0'),
  saturation: parseFloat(localStorage.getItem('VIS_SATURATION') || '1.1'),
  softness: parseFloat(localStorage.getItem('VIS_SOFTNESS') || '0'),
  bloom: parseFloat(localStorage.getItem('VIS_BLOOM') || '0.2'),
  vignette: parseFloat(localStorage.getItem('VIS_VIGNETTE') || '0.3'),
  grain: parseFloat(localStorage.getItem('VIS_GRAIN') || '0.1'),

  setAvatarState: (avatarState: AvatarState) => set({ avatarState }),
  setCurrentViseme: (currentViseme: VisemeType) => set({ currentViseme }),
  setListening: (isListening: boolean) => set({ isListening }),
  setSpeaking: (isSpeaking: boolean) => set({ isSpeaking }),
  setHasDiscrepancy: (hasDiscrepancy: boolean) => set({ hasDiscrepancy }),
  updatePerformance: (stats: Partial<StoreState['performance']>) => set((state) => ({
    performance: { ...state.performance, ...stats }
  })),
  addAuditLog: (log: AuditLog) => set((state) => ({
    auditLogs: [log, ...state.auditLogs].slice(0, 50)
  })),
  clearAuditLogs: () => set({ auditLogs: [] }),
  updateSystemInstruction: (instruction: string) => {
    localStorage.setItem('SYSTEM_INSTRUCTION', instruction);
    set({ systemInstruction: instruction });
  },
  updateUserMemory: (memory: string) => {
    localStorage.setItem('USER_MEMORY', memory);
    set({ userMemory: memory });
  },
  updateAssets: (newAssets: Partial<AvatarAssets>) => set((state) => {
    const updated = { ...state.assets, ...newAssets };
    Object.entries(updated).forEach(([k, v]) => {
      if (v && !v.startsWith('blob:')) {
        localStorage.setItem(`ASSET_${k.toUpperCase()}`, String(v));
      }
    });
    return { assets: updated };
  }),
  updateCircleSize: (size: number) => {
    localStorage.setItem('UI_CIRCLE_SIZE', size.toString());
    set({ circleSize: size });
  },
  updateBorderRadius: (radius: number) => {
    localStorage.setItem('UI_BORDER_RADIUS', radius.toString());
    set({ borderRadius: radius });
  },
  updatePosition: (pos: Position) => {
    localStorage.setItem('UI_POSITION', JSON.stringify(pos));
    set({ position: pos });
  },
  updateMicThreshold: (threshold: number) => {
    localStorage.setItem('MIC_THRESHOLD', threshold.toString());
    set({ micThreshold: threshold });
  },
  updateBackgroundMedia: (media: BackgroundMedia[]) => {
    localStorage.setItem('BG_MEDIA', JSON.stringify(media.filter(m => !m.url.startsWith('blob:'))));
    set({ backgroundMedia: media });
  },
  updateBackgroundOpacity: (opacity: number) => {
    localStorage.setItem('BG_OPACITY', opacity.toString());
    set({ backgroundOpacity: opacity });
  },
  updateBackgroundSpeed: (speed: number) => {
    localStorage.setItem('BG_SPEED', speed.toString());
    set({ backgroundSpeed: speed });
  },
  updateBackgroundFit: (fit: 'cover' | 'contain' | 'fill') => {
    localStorage.setItem('BG_FIT', fit);
    set({ backgroundFit: fit });
  },
  updateBackgroundScale: (scale: number) => {
    localStorage.setItem('BG_SCALE', scale.toString());
    set({ backgroundScale: scale });
  },
  updateVisualEffect: (key, value) => {
    localStorage.setItem(`VIS_${key.toUpperCase()}`, value.toString());
    set({ [key]: value } as any);
  }
}));

export function getFullSystemInstruction() {
  const state = useStore.getState();
  return `${state.systemInstruction}\nRAG: ${ragEngine.getContext("all")}`;
}
