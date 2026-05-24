import { GoogleGenAI } from '@google/genai';

export class GeminiConfigError extends Error {
  constructor() {
    super('GEMINI_API_KEY environment variable is not set');
    this.name = 'GeminiConfigError';
  }
}

if (!process.env.GEMINI_API_KEY) {
  throw new GeminiConfigError();
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const proModel = 'gemini-2.5-pro';
export const flashModel = 'gemini-2.5-flash';
