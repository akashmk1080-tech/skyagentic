import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { StorageService } from './storage';

export interface TTSState {
  isSpeaking: boolean;
  currentText: string | null;
}

class TTSServiceManager {
  private isSpeaking = false;
  private currentText: string | null = null;
  private listeners: ((state: TTSState) => void)[] = [];

  constructor() {}

  public subscribe(listener: (state: TTSState) => void): () => void {
    this.listeners.push(listener);
    listener({ isSpeaking: this.isSpeaking, currentText: this.currentText });
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const state: TTSState = { isSpeaking: this.isSpeaking, currentText: this.currentText };
    this.listeners.forEach(l => l(state));
  }

  public async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // If already speaking, stop first
    await this.stop();

    const settings = await StorageService.getSettings();
    this.isSpeaking = true;
    this.currentText = text;
    this.notify();

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = settings.ttsVoiceRate || 0.95;
        utterance.pitch = settings.ttsVoicePitch || 1.0;
        utterance.onend = () => {
          this.isSpeaking = false;
          this.currentText = null;
          this.notify();
        };
        utterance.onerror = () => {
          this.isSpeaking = false;
          this.currentText = null;
          this.notify();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        Speech.speak(text, {
          language: 'en-US',
          pitch: settings.ttsVoicePitch || 1.0,
          rate: settings.ttsVoiceRate || 0.95,
          onDone: () => {
            this.isSpeaking = false;
            this.currentText = null;
            this.notify();
          },
          onStopped: () => {
            this.isSpeaking = false;
            this.currentText = null;
            this.notify();
          },
          onError: (e) => {
            console.warn('TTS error:', e);
            this.isSpeaking = false;
            this.currentText = null;
            this.notify();
          },
        });
      }
    } catch (e) {
      console.warn('Speech invocation error:', e);
      this.isSpeaking = false;
      this.currentText = null;
      this.notify();
    }
  }

  public async stop(): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else {
        await Speech.stop();
      }
    } catch {
      // Ignore
    } finally {
      this.isSpeaking = false;
      this.currentText = null;
      this.notify();
    }
  }

  public getSpeakingState(): TTSState {
    return { isSpeaking: this.isSpeaking, currentText: this.currentText };
  }
}

export const TTSService = new TTSServiceManager();

