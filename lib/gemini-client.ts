
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AvatarState } from "../types";
import { useStore, getFullSystemInstruction } from "../store";
import { decode, encode, decodeAudioData, AudioProcessor } from "./audioProcessor";
import { ragEngine } from "./ragEngine";

export class GeminiLiveClient {
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private processor: AudioProcessor | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private lastMessageTime = 0;
  private currentTranscription = "";
  private fullSessionTranscript: string[] = [];

  public getProcessor() {
    return this.processor;
  }

  async connect(onConnect: (connected: boolean) => void) {
    try {
      this.fullSessionTranscript = [];
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!this.inputAudioContext) {
        this.inputAudioContext = new AudioCtx({ sampleRate: 16000 });
      }
      if (!this.outputAudioContext) {
        this.outputAudioContext = new AudioCtx({ sampleRate: 24000 });
      }

      // Resume contextes immédiatement
      await Promise.all([
        this.inputAudioContext!.resume(),
        this.outputAudioContext!.resume()
      ]);

      if (!this.processor) {
        this.processor = new AudioProcessor(this.outputAudioContext!);
      }

      const { micThreshold } = useStore.getState();
      this.processor.setThreshold(micThreshold);

      // Fix: removed 'latency' property from constraints as it is not part of standard MediaTrackConstraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            onConnect(true);
            this.streamMic(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onclose: () => {
            onConnect(false);
            this.consolidateMemory();
            this.cleanup();
          },
          onerror: (e) => {
            console.error("Gemini Error:", e);
            onConnect(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          thinkingConfig: { thinkingBudget: 0 }, // Désactive le thinking pour une réponse ultra-rapide
          systemInstruction: getFullSystemInstruction(),
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });

      this.session = await sessionPromise;
    } catch (err) {
      console.error("Connection failed", err);
      throw err;
    }
  }

  private async streamMic(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    const source = this.inputAudioContext.createMediaStreamSource(stream);
    // Buffer réduit de 4096 à 2048 pour gagner ~120ms de latence
    const scriptProcessor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;

      sessionPromise.then(s => {
        try {
          s.sendRealtimeInput({
            media: {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            }
          });
        } catch (err) {
          console.error("Error sending mic data", err);
        }
      });
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const { setSpeaking, setAvatarState, setCurrentViseme, updatePerformance } = useStore.getState();

    if (this.lastMessageTime > 0) {
      updatePerformance({ latency: Date.now() - this.lastMessageTime });
    }
    this.lastMessageTime = Date.now();

    // Traitement asynchrone des transcriptions pour ne pas bloquer l'audio
    if (message.serverContent?.outputTranscription) {
      this.currentTranscription += message.serverContent.outputTranscription.text;
    } else if (message.serverContent?.inputTranscription) {
      this.fullSessionTranscript.push(`Afef: ${message.serverContent.inputTranscription.text}`);
    }

    if (message.serverContent?.turnComplete) {
      if (this.currentTranscription) {
        const text = this.currentTranscription;
        this.fullSessionTranscript.push(`Sarra: ${text}`);
        // Audit lancé en arrière-plan
        setTimeout(() => this.runShadowAudit(text), 0);
        this.currentTranscription = "";
      }
    }

    const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (audioBase64 && this.outputAudioContext && this.processor) {
      setSpeaking(true);
      const ctx = this.outputAudioContext;

      this.nextStartTime = Math.max(this.nextStartTime, ctx.currentTime);
      const buffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      source.connect(this.processor.getAnalyser());
      this.processor.getAnalyser().connect(ctx.destination);

      this.processor.startMonitoring(
        (state) => setAvatarState(state),
        (viseme) => setCurrentViseme(viseme)
      );

      source.onended = () => {
        this.sources.delete(source);
        if (this.sources.size === 0) {
          setSpeaking(false);
          setAvatarState(AvatarState.IDLE);
          setCurrentViseme('mouth_A');
        }
      };

      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
      this.sources.add(source);
    }

    if (message.serverContent?.interrupted) {
      this.stopAllSources();
      setSpeaking(false);
      setAvatarState(AvatarState.IDLE);
      setCurrentViseme('mouth_A');
    }
  }

  private async consolidateMemory() {
    if (this.fullSessionTranscript.length < 4) return;

    try {
      const { userMemory, updateUserMemory } = useStore.getState();
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const transcript = this.fullSessionTranscript.join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Consolide la mémoire :
        MÉMOIRE : ${userMemory}
        TRANSCRIPT : ${transcript}
        Retourne uniquement la nouvelle mémoire concise.`,
      });

      if (response.text) {
        updateUserMemory(response.text.trim());
      }
    } catch (err) {
      console.error("Memory consolidation failed", err);
    }
  }

  private runShadowAudit(text: string) {
    if (!text) return;
    const { addAuditLog, setHasDiscrepancy } = useStore.getState();
    const matches = ragEngine.search(text);
    const hasHallucination = text.includes("TND") && matches.length === 0;

    if (hasHallucination) {
      setHasDiscrepancy(true);
      setTimeout(() => setHasDiscrepancy(false), 5000);
    }

    addAuditLog({
      timestamp: Date.now(),
      query: "Live Stream",
      response: text,
      isHonest: !hasHallucination,
      discrepancy: hasHallucination ? "Mention d'un prix sans données RAG." : undefined
    });
  }

  private stopAllSources() {
    this.sources.forEach(s => {
      try { s.stop(); } catch (e) { }
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  private cleanup() {
    this.stopAllSources();
    this.processor?.stopMonitoring();
    this.session = null;
  }

  disconnect() {
    this.session?.close();
    this.cleanup();
  }
}

export const geminiClient = new GeminiLiveClient();
