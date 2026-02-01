
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  stock: boolean | number;
  description: string;
  category: string;
}

export enum AvatarState {
  IDLE = 'IDLE',
  TALKING = 'TALKING'
}

export type VisemeType = 'mouth_A' | 'mouth_B' | 'mouth_C' | 'mouth_D' | 'mouth_E' | 'mouth_F' | 'mouth_G' | 'mouth_H';

export interface AvatarAssets {
  image: string;
  idle: string;
  talking: string;
}

export interface PerformanceStats {
  latency: number;
  fps: number;
  uptime: number;
  tokensPerSecond: number;
}

export interface AuditLog {
  timestamp: number;
  query: string;
  response: string;
  isHonest: boolean;
  discrepancy?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface BackgroundMedia {
  url: string;
  type: 'image' | 'video';
}

export interface StoreState {
  isListening: boolean;
  isSpeaking: boolean;
  hasDiscrepancy: boolean;
  avatarState: AvatarState;
  currentViseme: VisemeType;
  systemInstruction: string;
  userMemory: string;
  assets: AvatarAssets;
  performance: PerformanceStats;
  auditLogs: AuditLog[];
  circleSize: number;
  borderRadius: number;
  position: Position;
  micThreshold: number;
  backgroundMedia: BackgroundMedia[];
  backgroundOpacity: number;
  backgroundSpeed: number;
  backgroundFit: 'cover' | 'contain' | 'fill';
  backgroundScale: number;
  // Réglages visuels v3.0
  brightness: number;
  contrast: number;
  saturation: number;
  softness: number;
  bloom: number;
  vignette: number;
  grain: number;

  setAvatarState: (state: AvatarState) => void;
  setCurrentViseme: (viseme: VisemeType) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setHasDiscrepancy: (val: boolean) => void;
  updatePerformance: (stats: Partial<PerformanceStats>) => void;
  addAuditLog: (log: AuditLog) => void;
  clearAuditLogs: () => void;
  updateSystemInstruction: (instruction: string) => void;
  updateUserMemory: (memory: string) => void;
  updateAssets: (newAssets: Partial<AvatarAssets>) => void;
  updateCircleSize: (size: number) => void;
  updateBorderRadius: (radius: number) => void;
  updatePosition: (pos: Position) => void;
  updateMicThreshold: (threshold: number) => void;
  updateBackgroundMedia: (media: BackgroundMedia[]) => void;
  updateBackgroundOpacity: (opacity: number) => void;
  updateBackgroundSpeed: (speed: number) => void;
  updateBackgroundFit: (fit: 'cover' | 'contain' | 'fill') => void;
  updateBackgroundScale: (scale: number) => void;
  updateVisualEffect: (key: 'brightness' | 'contrast' | 'saturation' | 'softness' | 'bloom' | 'vignette' | 'grain', value: number) => void;
}
