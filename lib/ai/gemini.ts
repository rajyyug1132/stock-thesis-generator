import { GoogleGenAI } from '@google/genai';

export class GeminiConfigError extends Error {
  constructor() {
    super('GEMINI_API_KEY environment variable is not set');
    this.name = 'GeminiConfigError';
  }
}

// Lazy init — don't throw at module load so DeepSeek fallback can still work
// when GEMINI_API_KEY is absent. Callers should check geminiAvailable() first.
let _ai: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new GeminiConfigError();
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

export function geminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** @deprecated use getAI() — kept for any direct imports that haven't been updated */
export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    return getAI()[prop as keyof GoogleGenAI];
  },
});

export const proModel = 'gemini-2.5-pro';
export const flashModel = 'gemini-2.5-flash';
/** Gemini 2.0 Flash — separate quota pool, used as tertiary fallback */
export const flash2Model = 'gemini-2.0-flash';
