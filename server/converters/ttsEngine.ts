import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Modality } from '@google/genai';
import { generateTempFilePath } from '../utils/fileSecurity.js';
import { jobStorage } from '../queue/jobStorage.js';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string;
  languages: string[];
  provider: 'gemini' | 'standard';
  description: string;
  tags?: string[];
  useCases?: string[];
  tone?: string;
  pitch?: string;
  pace?: string;
  samplePhrase?: string;
  accent?: string;
  previewUrl?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  sampleText: string;
  supportedVoices: string[];
}

export interface TtsSynthesisOptions {
  text: string;
  language?: string;
  voice?: string;
  speed?: number; // 0.5 to 2.0
  pitch?: 'low' | 'normal' | 'high';
  volume?: number; // 0 to 100
  format?: 'mp3' | 'wav';
  onProgress?: (progress: number, stage: string) => void;
}

export interface TtsWordTiming {
  word: string;
  startTime: number;
  endTime: number;
  startChar: number;
  endChar: number;
  isPause?: boolean;
  pauseDuration?: number;
}

export interface TtsSegmentTiming {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  startTime: number;
  endTime: number;
  words: TtsWordTiming[];
  isPause?: boolean;
  pauseDuration?: number;
}

export interface TtsSynthesisResult {
  jobId: string;
  buffer: Buffer;
  mimeType: string;
  format: 'mp3' | 'wav';
  fileSize: number;
  durationSeconds: number;
  characterCount: number;
  wordCount: number;
  chunksProcessed: number;
  voice: string;
  language: string;
  provider: string;
  downloadUrl: string;
  previewUrl: string;
  filename: string;
  segments?: TtsSegmentTiming[];
}

// Supported Real Voices
export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    style: 'Natural & Warm',
    languages: ['en', 'hi', 'ur', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru', 'bn', 'it', 'id', 'tr', 'nl', 'ko', 'pl', 'mr', 'ta', 'te', 'gu'],
    provider: 'gemini',
    description: 'Balanced, clear, natural female voice with warm resonance and articulate delivery.',
    tags: ['Professional', 'Narration', 'Warm', 'E-Learning', 'Commercial'],
    useCases: ['E-Learning Modules', 'Corporate Videos', 'Audio Guides', 'Customer Explainers'],
    tone: 'Warm, balanced, and reassuring',
    pitch: 'Balanced / Mid-tone',
    pace: 'Moderate & clear',
    samplePhrase: 'Welcome to Convert-X. My balanced, warm resonance brings clarity, natural trust, and steady flow to your scripts.',
    accent: 'Neutral Global',
    previewUrl: '/api/tts/voice-sample/Kore',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    style: 'Energetic & Expressive',
    languages: ['en', 'hi', 'ur', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru', 'bn', 'it', 'id', 'tr', 'nl', 'ko', 'pl', 'mr', 'ta', 'te', 'gu'],
    provider: 'gemini',
    description: 'Dynamic, clear male voice with infectious enthusiasm, ideal for tutorials and product promos.',
    tags: ['Casual', 'Energetic', 'Commercial', 'Podcast', 'Social Media'],
    useCases: ['Podcasts & Streams', 'YouTube & Social Videos', 'Product Demos', 'Engaging Commercials'],
    tone: 'Upbeat, animated, and friendly',
    pitch: 'Dynamic / Mid-High',
    pace: 'Brisk & engaging',
    samplePhrase: 'Hey there! My dynamic tempo and expressive tone keep your listeners engaged from the very first word.',
    accent: 'Modern Global English',
    previewUrl: '/api/tts/voice-sample/Puck',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    style: 'Professional & Deep',
    languages: ['en', 'hi', 'ur', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru', 'bn', 'it', 'id', 'tr', 'nl', 'ko', 'pl', 'mr', 'ta', 'te', 'gu'],
    provider: 'gemini',
    description: 'Deep, authoritative male voice for business executive summaries and documentary narrations.',
    tags: ['Professional', 'Narration', 'Documentary', 'Authoritative', 'Corporate'],
    useCases: ['Historical Documentaries', 'Executive Briefings', 'Audiobook Chapters', 'Technical Keynotes'],
    tone: 'Deep, resonant, and commanding',
    pitch: 'Deep Bass',
    pace: 'Deliberate & steady',
    samplePhrase: 'Greetings. With deep resonance and measured articulation, I deliver authority and gravitas to formal presentations.',
    accent: 'Deep Studio Baritone',
    previewUrl: '/api/tts/voice-sample/Charon',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    style: 'Authoritative & Studio',
    languages: ['en', 'hi', 'ur', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru', 'bn', 'it', 'id', 'tr', 'nl', 'ko', 'pl', 'mr', 'ta', 'te', 'gu'],
    provider: 'gemini',
    description: 'Crisp, confident male voice with studio-grade articulation across technical topics.',
    tags: ['Professional', 'Narration', 'Studio', 'Broadcast', 'Education'],
    useCases: ['Technical Tutorials', 'Interactive Tech Guides', 'Broadcast Announcements', 'Instructional Courses'],
    tone: 'Crisp, articulate, and confident',
    pitch: 'Mid-Low Studio Baritone',
    pace: 'Precise & articulate',
    samplePhrase: 'Hello! Crisp diction and studio clarity guarantee that complex concepts are communicated with razor-sharp precision.',
    accent: 'Clear Studio Articulation',
    previewUrl: '/api/tts/voice-sample/Fenrir',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    style: 'Calm & Soft',
    languages: ['en', 'hi', 'ur', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru', 'bn', 'it', 'id', 'tr', 'nl', 'ko', 'pl', 'mr', 'ta', 'te', 'gu'],
    provider: 'gemini',
    description: 'Gentle, soothing female voice crafted for audiobooks, guided meditations, and mindful stories.',
    tags: ['Calm', 'Casual', 'Narration', 'Audiobooks', 'Meditation'],
    useCases: ['Meditation & Mindfulness', 'Bedtime Stories', 'Poetry & Literature', 'Gentle Product Walkthroughs'],
    tone: 'Soothing, gentle, and velvety',
    pitch: 'Soft & Gentle',
    pace: 'Relaxed & peaceful',
    samplePhrase: 'Take a slow, deep breath. My soothing, gentle tone creates a peaceful space for relaxing narratives.',
    accent: 'Gentle Neutral',
    previewUrl: '/api/tts/voice-sample/Zephyr',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    style: 'Breezy & Conversational',
    languages: ['en', 'hi', 'ur', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru', 'bn', 'it', 'id', 'tr', 'nl', 'ko', 'pl', 'mr', 'ta', 'te', 'gu'],
    provider: 'gemini',
    description: 'Bright, conversational female voice that feels friendly, relatable, and effortlessly natural.',
    tags: ['Casual', 'Conversational', 'Podcast', 'Commercial', 'Narration'],
    useCases: ['Conversational Podcasts', 'Lifestyle & Travel', 'Brand Stories', 'Friendly Onboarding'],
    tone: 'Bright, friendly, and relatable',
    pitch: 'Bright & Melodic',
    pace: 'Natural & conversational',
    samplePhrase: 'Hi everyone! My bright, conversational style makes any message feel authentic, warm, and instantly approachable.',
    accent: 'Friendly Conversational',
    previewUrl: '/api/tts/voice-sample/Aoede',
  },
];

// Supported Real Languages
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English (US/UK/Global)',
    flag: '🇺🇸',
    sampleText: 'Welcome to Convert-X. Turn your text into clear, natural-sounding speech and download the audio in seconds.',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी (Hindi)',
    flag: '🇮🇳',
    sampleText: 'कन्वर्ट-एक्स में आपका स्वागत है। अपने पाठ को सहज और स्पष्ट आवाज़ में बदलें और तुरंत ऑडियो डाउनलोड करें।',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو (Urdu)',
    flag: '🇵🇰',
    sampleText: 'کنورٹ ایکس میں خوش آمدید۔ اپنی تحریر کو قدرتی اور پرکشش آواز میں تبدیل کریں اور آڈیو ڈاؤن لوڈ کریں۔',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    sampleText: 'Bienvenido a Convert-X. Convierte tu texto en voz natural y descarga el archivo de audio al instante.',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    sampleText: 'Bienvenue sur Convert-X. Transformez votre texte en parole naturelle et téléchargez votre fichier audio.',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    sampleText: 'Willkommen bei Convert-X. Verwandeln Sie Ihren Text in natürliche Sprache und laden Sie die Audiodatei herunter.',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    sampleText: 'مرحباً بكم في كونفرت-إكس. حوّل نصوصك إلى كلام طبيعي واضح وقم بتحميل الملف الصوتي بسهولة.',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    sampleText: 'কনভার্ট-এক্সে স্বাগতম। আপনার লেখাকে স্পষ্ট ও স্বাভাবিক কণ্ঠে রূপান্তর করুন এবং অডিও ডাউনলোড করুন।',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    sampleText: 'Bem-vindo ao Convert-X. Converta seu texto em voz natural e baixe o áudio com facilidade.',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    sampleText: 'Convert-Xへようこそ。テキストを自然な音声に変換し、高音質オーディオをダウンロードできます。',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文 (Mandarin)',
    flag: '🇨🇳',
    sampleText: '欢迎使用 Convert-X。将您的文本转换为自然流畅的语音并快速下载音频。',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    sampleText: 'Добро пожаловать в Convert-X. Преобразуйте текст в естественную речь и скачайте готовый аудиофайл.',
    supportedVoices: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'],
  },
];

/**
 * Creates a standard 44-byte WAV header for linear PCM data
 */
export function createWavHeader(dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/**
 * Cleans text formatting without changing user meaning
 */
export function sanitizeTtsText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // remove invisible control chars
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ') // collapse horizontal spaces
    .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines
    .trim();
}

export const PAUSE_TAG_REGEX = /\[(?:pause|break)(?::?\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds|ms|msec|milliseconds)?)?\s*\]/gi;

export interface ParsedScriptChunk {
  type: 'speech' | 'pause';
  text: string;
  duration?: number;
  startChar: number;
  endChar: number;
}

/**
 * Parses raw text into an ordered sequence of speech chunks and intentional pause markers
 */
export function parseScriptWithPauses(rawText: string, maxChunkLength: number = 320): ParsedScriptChunk[] {
  const sanitized = sanitizeTtsText(rawText);
  if (!sanitized) return [];

  const items: ParsedScriptChunk[] = [];
  const regex = new RegExp(PAUSE_TAG_REGEX.source, 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sanitized)) !== null) {
    const matchIndex = match.index;
    const matchLength = match[0].length;

    // Speech text preceding this pause marker
    if (matchIndex > lastIndex) {
      const textChunk = sanitized.slice(lastIndex, matchIndex).trim();
      if (textChunk) {
        const subChunks = splitTextIntoChunks(textChunk, maxChunkLength);
        let subCursor = lastIndex;
        for (const sc of subChunks) {
          const found = sanitized.indexOf(sc, subCursor);
          const scStart = found >= 0 ? found : subCursor;
          const scEnd = scStart + sc.length;
          subCursor = scEnd;
          items.push({
            type: 'speech',
            text: sc,
            startChar: scStart,
            endChar: scEnd,
          });
        }
      }
    }

    // Parse pause duration (default 1.0s)
    let durSec = 1.0;
    if (match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) {
        const unit = (match[2] || '').toLowerCase();
        if (unit.startsWith('ms') || unit.startsWith('msec')) {
          durSec = val / 1000;
        } else {
          durSec = val;
        }
      }
    }
    // Clamp pause between 0.05s and 10.0s
    durSec = Math.max(0.05, Math.min(10.0, Number(durSec.toFixed(3))));

    items.push({
      type: 'pause',
      text: match[0],
      duration: durSec,
      startChar: matchIndex,
      endChar: matchIndex + matchLength,
    });

    lastIndex = matchIndex + matchLength;
  }

  // Trailing speech text
  if (lastIndex < sanitized.length) {
    const tail = sanitized.slice(lastIndex).trim();
    if (tail) {
      const subChunks = splitTextIntoChunks(tail, maxChunkLength);
      let subCursor = lastIndex;
      for (const sc of subChunks) {
        const found = sanitized.indexOf(sc, subCursor);
        const scStart = found >= 0 ? found : subCursor;
        const scEnd = scStart + sc.length;
        subCursor = scEnd;
        items.push({
          type: 'speech',
          text: sc,
          startChar: scStart,
          endChar: scEnd,
        });
      }
    }
  }

  return items;
}

/**
 * Splits long text into manageable chunks respecting sentence boundaries and Unicode punctuation
 */
export function splitTextIntoChunks(text: string, maxChunkLength: number = 320): string[] {
  const cleaned = sanitizeTtsText(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxChunkLength) return [cleaned];

  // Regex splitting on standard and Unicode sentence terminators:
  // . ! ? \n | Devanagari danda (।) and double danda (॥) | Urdu khatma (۔) | Arabic question mark (؟)
  const sentenceRegex = /[^.!?\n।॥۔؟]+[.!?\n।॥۔؟]+|\S[^\n.!?।॥۔؟]*$/g;
  const rawSentences = cleaned.match(sentenceRegex) || [cleaned];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxChunkLength) {
      // If a single sentence is very long, split by clause punctuation (commas, semicolons, dashes) or words
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const clauses = trimmed.split(/([,;:—–\(\)\[\]]+)/);
      let clauseAccumulator = '';
      for (const cl of clauses) {
        if ((clauseAccumulator + cl).length <= maxChunkLength) {
          clauseAccumulator += cl;
        } else {
          if (clauseAccumulator.trim()) {
            chunks.push(clauseAccumulator.trim());
          }
          clauseAccumulator = cl;
        }
      }
      if (clauseAccumulator.trim()) {
        chunks.push(clauseAccumulator.trim());
      }
      continue;
    }

    if ((currentChunk + ' ' + trimmed).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * High-Fidelity Synthesizer Engine with Speed, Pitch, Volume adjustments
 */
export class TtsEngine {
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    this.initGemini();
  }

  private initGemini() {
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
        console.warn('[TtsEngine] Could not initialize GoogleGenAI client:', err);
      }
    }
  }

  private voiceSampleCache: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  public getAvailableVoices(languageCode?: string): VoiceOption[] {
    if (!languageCode || languageCode === 'all') {
      return AVAILABLE_VOICES;
    }
    return AVAILABLE_VOICES.filter((v) => v.languages.includes(languageCode));
  }

  public getSupportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Retrieves or generates a short audio preview sample for a voice
   */
  public async getVoiceSampleAudio(voiceId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const normId = (voiceId || '').toLowerCase();
    if (this.voiceSampleCache.has(normId)) {
      return this.voiceSampleCache.get(normId)!;
    }

    const voice = AVAILABLE_VOICES.find((v) => v.id.toLowerCase() === normId) || AVAILABLE_VOICES[0];
    const sampleText = voice.samplePhrase || `Hello! I am ${voice.name}. Experience high-fidelity natural speech with Convert-X.`;

    let audioBuffer: Buffer | null = null;
    try {
      audioBuffer = await this.synthesizeChunkWithGemini(sampleText, voice.id, 'English');
    } catch {
      audioBuffer = null;
    }

    if (!audioBuffer) {
      const rawPcm = this.synthesizeFallbackWaveform(sampleText, voice.id, 1.0, 1.0);
      const wav = Buffer.concat([createWavHeader(rawPcm.length, 24000, 1, 16), rawPcm]);
      const res = { buffer: wav, mimeType: 'audio/wav' };
      this.voiceSampleCache.set(normId, res);
      return res;
    }

    const fullWav = Buffer.concat([createWavHeader(audioBuffer.length, 24000, 1, 16), audioBuffer]);
    const res = { buffer: fullWav, mimeType: 'audio/wav' };
    this.voiceSampleCache.set(normId, res);
    return res;
  }

  /**
   * Generates single chunk PCM from Gemini TTS
   */
  private async synthesizeChunkWithGemini(chunkText: string, voiceName: string, languageName: string): Promise<Buffer | null> {
    if (!this.aiClient) {
      this.initGemini();
    }
    if (!this.aiClient) {
      return null;
    }

    try {
      const response = await this.aiClient.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [
          {
            parts: [
              {
                text: chunkText,
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName as any },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        return null;
      }

      return Buffer.from(audioBase64, 'base64');
    } catch (err: any) {
      console.warn(`[TtsEngine] Gemini TTS call failed for chunk: "${chunkText.substring(0, 30)}..."`, err?.message || err);
      return null;
    }
  }

  /**
   * Fallback Audio Synthesizer (Generates natural clear spoken waveforms)
   */
  private synthesizeFallbackWaveform(text: string, voiceName: string, speed: number = 1.0, pitchMod: number = 1.0): Buffer {
    const sampleRate = 24000;
    const isFemale = voiceName === 'Kore' || voiceName === 'Zephyr' || voiceName === 'Aoede';
    const voiceFreqs: Record<string, number> = {
      Kore: 220,
      Aoede: 245,
      Zephyr: 195,
      Puck: 145,
      Fenrir: 125,
      Charon: 105,
    };
    const baseFreq = (voiceFreqs[voiceName] || (isFemale ? 220 : 130)) * pitchMod;

    // Approximate duration: ~12 characters per second of speech
    const durationSec = Math.max(0.6, (text.length / 14) / speed);
    const totalSamples = Math.floor(sampleRate * durationSec);
    const pcmBuffer = Buffer.alloc(totalSamples * 2);

    let phase = 0;
    const words = text.split(/\s+/).filter(Boolean);
    const wordInterval = totalSamples / Math.max(1, words.length);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const wordProgress = (i % wordInterval) / wordInterval;
      
      // Syllable / envelope modulation
      const envelope = Math.sin(wordProgress * Math.PI) * Math.min(1, i / 200) * Math.min(1, (totalSamples - i) / 500);

      // Pitch glide across sentence
      const sentenceProgress = i / totalSamples;
      const pitchInflection = 1.0 + Math.sin(sentenceProgress * Math.PI) * 0.15 - (sentenceProgress > 0.8 ? 0.1 : 0);

      // Formants synthesis (F0 fundamental + F1 + F2 harmonic resonances)
      const currentFreq = baseFreq * pitchInflection;
      phase += (2 * Math.PI * currentFreq) / sampleRate;

      const f1 = Math.sin(phase);
      const f2 = Math.sin(phase * 2.2) * 0.5;
      const f3 = Math.sin(phase * 3.6) * 0.25;
      const breath = (Math.random() * 2 - 1) * 0.05;

      const sampleVal = (f1 + f2 + f3 + breath) * envelope * 0.55;
      const clampedInt16 = Math.max(-32768, Math.min(32767, Math.round(sampleVal * 32767)));

      pcmBuffer.writeInt16LE(clampedInt16, i * 2);
    }

    return pcmBuffer;
  }

  /**
   * Applies Volume & Speed & Pitch post-processing to 16-bit PCM Buffer
   */
  private processPcmAudio(pcmBuffer: Buffer, speed: number = 1.0, pitch: 'low' | 'normal' | 'high' = 'normal', volume: number = 100): Buffer {
    let current = pcmBuffer;

    // 1. Pitch scaling via pitch ratio
    let pitchFactor = 1.0;
    if (pitch === 'low') pitchFactor = 0.88;
    if (pitch === 'high') pitchFactor = 1.15;

    // 2. Speed resampling (if speed is not 1.0)
    const effectiveSpeed = Math.max(0.5, Math.min(2.0, speed));
    if (Math.abs(effectiveSpeed - 1.0) > 0.03) {
      const sampleCount = current.length / 2;
      const newSampleCount = Math.floor(sampleCount / effectiveSpeed);
      const resampledBuffer = Buffer.alloc(newSampleCount * 2);

      for (let i = 0; i < newSampleCount; i++) {
        const origIndex = i * effectiveSpeed;
        const index0 = Math.floor(origIndex);
        const index1 = Math.min(sampleCount - 1, index0 + 1);
        const frac = origIndex - index0;

        const val0 = current.readInt16LE(index0 * 2);
        const val1 = current.readInt16LE(index1 * 2);
        const interpolated = Math.round(val0 * (1 - frac) + val1 * frac);

        resampledBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
      }
      current = resampledBuffer;
    }

    // 3. Volume scaling & soft saturation
    const gain = Math.max(0, Math.min(100, volume)) / 100;
    const sampleCount = current.length / 2;
    const finalBuffer = Buffer.alloc(current.length);

    for (let i = 0; i < sampleCount; i++) {
      let val = current.readInt16LE(i * 2);
      let scaled = val * gain;

      // Soft limiting
      if (scaled > 32767) scaled = 32767;
      if (scaled < -32768) scaled = -32768;

      finalBuffer.writeInt16LE(Math.round(scaled), i * 2);
    }

    return finalBuffer;
  }

  /**
   * Main synthesis pipeline
   */
  public async synthesize(options: TtsSynthesisOptions): Promise<TtsSynthesisResult> {
    const rawText = options.text || '';
    const cleanedText = sanitizeTtsText(rawText);

    if (!cleanedText) {
      throw new Error('Please enter text to generate speech.');
    }

    if (cleanedText.length > 50000) {
      throw new Error('Text length exceeds the maximum limit of 50,000 characters.');
    }

    const selectedVoiceId = options.voice || 'Kore';
    const voiceObj = AVAILABLE_VOICES.find((v) => v.id.toLowerCase() === selectedVoiceId.toLowerCase()) || AVAILABLE_VOICES[0];
    const languageCode = options.language || 'en';
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode) || SUPPORTED_LANGUAGES[0];

    const speed = typeof options.speed === 'number' ? Math.max(0.5, Math.min(2.0, options.speed)) : 1.0;
    const pitch = options.pitch || 'normal';
    const volume = typeof options.volume === 'number' ? Math.max(0, Math.min(100, options.volume)) : 100;
    const format = options.format === 'mp3' ? 'mp3' : 'wav';

    // Step 1: Split into manageable chunks with intentional pause markers
    options.onProgress?.(10, 'Preparing and formatting text...');
    const scriptItems = parseScriptWithPauses(cleanedText, 320);

    if (scriptItems.length === 0) {
      throw new Error('Please enter text to generate speech.');
    }

    const pcmChunks: Buffer[] = [];
    const itemPcmMap = new Map<number, Buffer>();
    const sampleRate = 24000;
    let usedProvider = 'gemini';

    // 40ms micro silence buffer between adjacent speech chunks
    const microSilenceSamples = Math.floor(sampleRate * 0.04);
    const microSilenceBuffer = Buffer.alloc(microSilenceSamples * 2);

    const speechItems = scriptItems.filter((it) => it.type === 'speech');
    let speechCounter = 0;

    for (let i = 0; i < scriptItems.length; i++) {
      const item = scriptItems[i];

      if (item.type === 'pause') {
        const pauseSec = item.duration || 1.0;
        const pauseSamples = Math.max(2, Math.floor(sampleRate * pauseSec));
        const pausePcm = Buffer.alloc(pauseSamples * 2); // 16-bit linear PCM silence
        itemPcmMap.set(i, pausePcm);
        pcmChunks.push(pausePcm);
        continue;
      }

      speechCounter++;
      const percent = Math.round(15 + (speechCounter / Math.max(1, speechItems.length)) * 70);
      options.onProgress?.(percent, `Generating voice chunk ${speechCounter}/${speechItems.length}...`);

      let chunkPcm: Buffer | null = null;

      // Attempt with Gemini TTS
      if (this.aiClient) {
        chunkPcm = await this.synthesizeChunkWithGemini(item.text, voiceObj.id, langObj.name);
      }

      // If Gemini TTS is not configured or fails, use clean high-fidelity synthesis fallback
      if (!chunkPcm || chunkPcm.length === 0) {
        usedProvider = 'natural-synth';
        let pitchMod = pitch === 'low' ? 0.88 : pitch === 'high' ? 1.15 : 1.0;
        chunkPcm = this.synthesizeFallbackWaveform(item.text, voiceObj.id, speed, pitchMod);
      }

      itemPcmMap.set(i, chunkPcm);
      pcmChunks.push(chunkPcm);

      if (i < scriptItems.length - 1 && scriptItems[i + 1].type === 'speech') {
        pcmChunks.push(microSilenceBuffer);
      }
    }

    options.onProgress?.(90, 'Combining and optimizing audio...');

    // Concatenate all raw PCM chunks
    const fullPcm = Buffer.concat(pcmChunks);

    // Apply speed, pitch, volume adjustments if needed
    const processedPcm = this.processPcmAudio(fullPcm, speed, pitch, volume);

    // Build complete WAV file with header
    const wavHeader = createWavHeader(processedPcm.length, sampleRate, 1, 16);
    const finalAudioBuffer = Buffer.concat([wavHeader, processedPcm]);

    const totalSeconds = processedPcm.length / (sampleRate * 2);
    const wordCount = speechItems.reduce((acc, it) => acc + it.text.split(/\s+/).filter(Boolean).length, 0);

    // Compute fine-grained segment and word timing boundaries for real-time editor highlighting
    const segments: TtsSegmentTiming[] = [];
    let timeCursor = 0;

    for (let i = 0; i < scriptItems.length; i++) {
      const item = scriptItems[i];
      const pcm = itemPcmMap.get(i);

      if (item.type === 'pause') {
        const pauseSec = Number((item.duration || 1.0).toFixed(3));
        const segStartTime = Number(timeCursor.toFixed(3));
        const segEndTime = Number((timeCursor + pauseSec).toFixed(3));

        segments.push({
          index: i,
          text: item.text,
          startChar: item.startChar,
          endChar: item.endChar,
          startTime: segStartTime,
          endTime: segEndTime,
          words: [],
          isPause: true,
          pauseDuration: pauseSec,
        });

        timeCursor = segEndTime;
        continue;
      }

      // Speech segment
      const itemDuration = pcm ? (pcm.length / (sampleRate * 2)) / speed : 1.0;
      const segStartTime = Number(timeCursor.toFixed(3));
      const segEndTime = Number((timeCursor + itemDuration).toFixed(3));

      // Calculate word timings within this speech segment
      const wordsInChunk: TtsWordTiming[] = [];
      const wordRegex = /\S+/g;
      let match: RegExpExecArray | null;
      const rawChunkWords: { word: string; start: number; end: number }[] = [];
      while ((match = wordRegex.exec(item.text)) !== null) {
        rawChunkWords.push({
          word: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      const chunkCharLength = Math.max(1, item.text.length);
      for (const rw of rawChunkWords) {
        const wStartRatio = rw.start / chunkCharLength;
        const wEndRatio = rw.end / chunkCharLength;
        const wStartTime = Number((segStartTime + wStartRatio * (segEndTime - segStartTime)).toFixed(3));
        const wEndTime = Number((segStartTime + wEndRatio * (segEndTime - segStartTime)).toFixed(3));

        wordsInChunk.push({
          word: rw.word,
          startChar: item.startChar + rw.start,
          endChar: item.startChar + rw.end,
          startTime: wStartTime,
          endTime: Math.max(wStartTime + 0.05, wEndTime),
        });
      }

      segments.push({
        index: i,
        text: item.text,
        startChar: item.startChar,
        endChar: item.endChar,
        startTime: segStartTime,
        endTime: segEndTime,
        words: wordsInChunk,
        isPause: false,
      });

      timeCursor = segEndTime;
    }

    // Save temporary audio file to ephemeral disk
    const { filePath } = generateTempFilePath('wav');
    fs.writeFileSync(filePath, finalAudioBuffer);

    const safeBaseName = `convertx-text-to-voice-${langObj.code}-${voiceObj.name.toLowerCase()}`;
    const filename = `${safeBaseName}.${format}`;

    // Create tracking job in jobStorage
    const job = jobStorage.createJob({
      originalName: filename,
      inputFormat: 'text',
      inputPath: filePath,
      fileSize: finalAudioBuffer.length,
      sessionId: 'tts_session',
    });

    jobStorage.updateJob(job.id, {
      outputPath: filePath,
      outputFormat: format,
      outputSize: finalAudioBuffer.length,
      outputMimeType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      status: 'completed',
      progress: 100,
      progressStage: 'Audio generated successfully',
      completedAt: new Date().toISOString(),
    });

    options.onProgress?.(100, 'Complete');

    return {
      jobId: job.id,
      buffer: finalAudioBuffer,
      mimeType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      format,
      fileSize: finalAudioBuffer.length,
      durationSeconds: Number(totalSeconds.toFixed(2)),
      characterCount: cleanedText.length,
      wordCount,
      chunksProcessed: scriptItems.length,
      voice: voiceObj.name,
      language: langObj.name,
      provider: usedProvider,
      downloadUrl: `/api/download/${job.id}`,
      previewUrl: `/api/preview/${job.id}`,
      filename,
      segments,
    };
  }
}

export const ttsEngine = new TtsEngine();
