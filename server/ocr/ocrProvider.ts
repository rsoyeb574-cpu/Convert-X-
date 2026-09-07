import { GoogleGenAI } from '@google/genai';

export interface OcrProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  recognizeText(imageBuffer: Buffer, mimeType?: string): Promise<string>;
}

export class GeminiVisionOcrProvider implements OcrProvider {
  id = 'gemini-vision-ocr';
  name = 'Gemini Multilingual Vision OCR';

  private aiClient: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.warn('[GeminiVisionOcr] Failed to initialize GoogleGenAI client:', err);
      }
    }
  }

  isConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return Boolean(apiKey && apiKey.trim().length > 0);
  }

  async recognizeText(imageBuffer: Buffer, mimeType: string = 'image/png'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini Vision OCR provider is not configured. GEMINI_API_KEY is missing.');
    }

    if (!this.aiClient) {
      this.initClient();
    }

    if (!this.aiClient) {
      throw new Error('Gemini AI client could not be initialized.');
    }

    const base64Data = imageBuffer.toString('base64');

    const prompt = `You are an expert optical character recognition (OCR) and document digitization engine.
Transcribe all text visible in this scanned document page with strict fidelity.
Rules:
1. Preserve paragraphs, line breaks, headings, tables, bullet points, and numbered lists.
2. Support all languages present (especially English, Hindi / Devanagari script, Urdu / Arabic script).
3. Do not omit any text, numbers, dates, punctuation, or symbols.
4. Do not invent, hallucinate, or translate text.
5. Return ONLY the transcribed text. Do not include markdown meta-commentary like "Here is the transcription:".`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      });

      const text = response.text || '';
      return text.trim();
    } catch (err: any) {
      console.error('[GeminiVisionOcr] OCR transcription error:', err);
      throw new Error(`OCR processing error: ${err.message || 'Failed to process page image'}`);
    }
  }
}

export class NullOcrProvider implements OcrProvider {
  id = 'unconfigured-ocr';
  name = 'No OCR Engine Configured';

  isConfigured(): boolean {
    return false;
  }

  async recognizeText(_imageBuffer: Buffer, _mimeType?: string): Promise<string> {
    throw new Error('No OCR provider is configured. Please configure an OCR provider or API key.');
  }
}

class OcrManager {
  private activeProvider: OcrProvider;

  constructor() {
    const geminiProvider = new GeminiVisionOcrProvider();
    if (geminiProvider.isConfigured()) {
      this.activeProvider = geminiProvider;
    } else {
      this.activeProvider = new NullOcrProvider();
    }
  }

  public getActiveProvider(): OcrProvider {
    // Re-check in case GEMINI_API_KEY was dynamically injected
    if (!this.activeProvider.isConfigured()) {
      const gemini = new GeminiVisionOcrProvider();
      if (gemini.isConfigured()) {
        this.activeProvider = gemini;
      }
    }
    return this.activeProvider;
  }

  public isOcrAvailable(): boolean {
    return this.getActiveProvider().isConfigured();
  }

  public getProviderStatus(): {
    configured: boolean;
    providerId: string;
    providerName: string;
    description: string;
  } {
    const provider = this.getActiveProvider();
    const configured = provider.isConfigured();
    return {
      configured,
      providerId: provider.id,
      providerName: provider.name,
      description: configured
        ? 'High-accuracy neural OCR engine active for scanned pages (English, Hindi, Urdu, etc.).'
        : 'No OCR engine is configured. Text will be extracted directly from text-based PDF pages.',
    };
  }
}

export const ocrManager = new OcrManager();
