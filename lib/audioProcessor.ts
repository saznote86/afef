
import { AvatarState, VisemeType } from '../types';

export class AudioProcessor {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private isProcessing = false;
  private threshold = 12;
  private currentVolume = 0;
  private smoothingFactor = 0.2; // Plus petit pour plus de réactivité mais avec moins de gigue

  constructor(context: AudioContext) {
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.4;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  public getAnalyser() {
    return this.analyser;
  }

  public setThreshold(val: number) {
    this.threshold = val;
  }

  public getCurrentVolume(): number {
    this.analyser.getByteFrequencyData(this.dataArray as unknown as Uint8Array<ArrayBuffer>);
    let sum = 0;
    // On se concentre sur les fréquences de la voix humaine (médiums)
    const startBin = 2;
    const endBin = Math.floor(this.dataArray.length * 0.6);
    for (let i = startBin; i < endBin; i++) {
      sum += this.dataArray[i];
    }
    const average = (sum / (endBin - startBin)) / 255 * 100;

    // Lissage temporel exponentiel
    this.currentVolume = (this.currentVolume * this.smoothingFactor) + (average * (1 - this.smoothingFactor));
    return this.currentVolume;
  }

  public calculateViseme(vol: number): VisemeType {
    // Mapping logarithmique pour une sensation de parole plus naturelle
    const normalizedVol = Math.max(0, vol - this.threshold);
    if (normalizedVol <= 0) return 'mouth_A';
    if (normalizedVol < 5) return 'mouth_B';
    if (normalizedVol < 12) return 'mouth_C';
    if (normalizedVol < 22) return 'mouth_D';
    if (normalizedVol < 35) return 'mouth_E';
    if (normalizedVol < 50) return 'mouth_F';
    if (normalizedVol < 70) return 'mouth_G';
    return 'mouth_H';
  }

  public startMonitoring(
    onStateChange: (state: AvatarState) => void,
    onVisemeChange?: (viseme: VisemeType) => void
  ) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    let silenceTimer: any = null;

    const check = () => {
      if (!this.isProcessing) return;
      const vol = this.getCurrentVolume();
      const viseme = this.calculateViseme(vol);

      if (onVisemeChange) onVisemeChange(viseme);

      if (vol > this.threshold) {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
        onStateChange(AvatarState.TALKING);
      } else {
        if (!silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (this.getCurrentVolume() <= this.threshold) {
              onStateChange(AvatarState.IDLE);
            }
            silenceTimer = null;
          }, 150); // Délai gracieux pour les pauses entre les mots
        }
      }
      requestAnimationFrame(check);
    };
    check();
  }

  public stopMonitoring() {
    this.isProcessing = false;
  }
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer as ArrayBuffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
