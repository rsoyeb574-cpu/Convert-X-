import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageView, TtsVoiceOption, TtsLanguageOption, TtsResultData, TtsSegmentTiming } from '../types.js';
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Clipboard,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Lock,
  ArrowRight,
  Zap,
  Globe,
  Radio,
  FileAudio,
  Check,
  ChevronDown,
  Info,
  Layers,
  Repeat,
  Eye,
  Edit3,
  MousePointerClick,
  SlidersHorizontal,
  Clock,
  Timer,
  Plus,
  Hourglass,
  HelpCircle,
} from 'lucide-react';

interface TextToVoicePageProps {
  onNavigate: (view: PageView, seoSlug?: string) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRecordHistory?: (item: any) => void;
  darkMode?: boolean;
  onFileDownloaded?: () => void;
}

const SAMPLE_PRESETS: { label: string; text: string; language: string; voice: string }[] = [
  {
    label: 'English – Professional Narration with Intentional Pauses',
    language: 'en',
    voice: 'Charon',
    text: 'Welcome to Convert-X. [pause 1s] Our online suite allows you to transform, compress, and generate high-fidelity media across all major formats with zero retention and maximum security. [pause 0.8s] Turn any written idea into clear speech with instant audio playback and export.',
  },
  {
    label: 'English – Expressive Dialogue & Dramatic Breaks',
    language: 'en',
    voice: 'Puck',
    text: 'Listen closely. [pause 1.5s] The future of digital media processing is fast, secure, and completely private. [pause 0.5s] Every sentence flows naturally, with pauses precisely timed to your creative direction.',
  },
  {
    label: 'हिन्दी – स्वागत और ऑडियो विवरण (Hindi with Pauses)',
    language: 'hi',
    voice: 'Kore',
    text: 'कन्वर्ट-एक्स में आपका स्वागत है। [pause 1s] अपने लिखे हुए पाठ को तुरंत सहज, स्पष्ट और स्वाभाविक आवाज़ में बदलें। [pause 0.5s] हर वाक्य और शब्द को लाइव हाईलाइट के साथ सुनें।',
  },
  {
    label: 'اردو – قدرتی اور واضح آواز (Urdu with Pauses)',
    language: 'ur',
    voice: 'Fenrir',
    text: 'کنورٹ ایکس میں خوش آمدید۔ [pause 1s] اپنی تحریر کو جدید ترین آوازوں کے ذریعے قدرتی اور پرکشش آڈیو میں تبدیل کریں۔ [pause 0.5s] ریئل ٹائم ہائی لائٹنگ کے ساتھ اپنے الفاظ کو سنیں۔',
  },
  {
    label: 'Español – Locución con Pausas (Spanish)',
    language: 'es',
    voice: 'Zephyr',
    text: 'Bienvenido a Convert-X. [pause 1s] Transforma cualquier texto en una locución natural. [pause 0.8s] Escucha y sincroniza cada frase en tiempo real con pausas personalizadas.',
  },
];

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const PAUSE_TAG_REGEX = /\[(?:pause|break)(?::?\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds|ms|msec|milliseconds)?)?\s*\]/gi;

export const TextToVoicePage: React.FC<TextToVoicePageProps> = ({
  onNavigate,
  showToast,
  onRecordHistory,
  darkMode,
  onFileDownloaded,
}) => {
  // Config & Metadata State
  const [languages, setLanguages] = useState<TtsLanguageOption[]>([]);
  const [allVoices, setAllVoices] = useState<TtsVoiceOption[]>([]);
  const [maxCharacters, setMaxCharacters] = useState<number>(10000);
  const [isConfigLoaded, setIsConfigLoaded] = useState<boolean>(false);

  // Editor Form State
  const [text, setText] = useState<string>(
    'Welcome to Convert-X. [pause 1s] Turn your text into natural-sounding speech and download the audio. [pause 0.8s] Experience intentional pause breaks and real-time interactive word highlighting as your voice plays!'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<'low' | 'normal' | 'high'>('normal');
  const [volume, setVolume] = useState<number>(100);
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3');

  // Pause Marker Customization State
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showCustomPauseModal, setShowCustomPauseModal] = useState<boolean>(false);
  const [customPauseDuration, setCustomPauseDuration] = useState<number>(1.0);

  // Real-time Highlighting & Editor View Modes
  const [editorMode, setEditorMode] = useState<'edit' | 'highlight'>('edit');
  const [convertingChunkIndex, setConvertingChunkIndex] = useState<number>(0);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const highlightContainerRef = useRef<HTMLDivElement | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  // Generation & Status State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [result, setResult] = useState<TtsResultData | null>(null);

  // Audio Playback Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [playerVolume, setPlayerVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Derive Client-side Sentence Segments and Pause Markers for live highlight if not yet generated by server
  const clientSegments = useMemo<TtsSegmentTiming[]>(() => {
    if (result?.segments && result.segments.length > 0) {
      return result.segments;
    }

    const trimmed = text.trim();
    if (!trimmed) return [];

    const segs: TtsSegmentTiming[] = [];
    const regex = new RegExp(PAUSE_TAG_REGEX.source, 'gi');
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let timeAccum = 0;
    let segIndex = 0;

    // Estimate total speech length excluding pause tags
    const cleanSpeechOnly = trimmed.replace(new RegExp(PAUSE_TAG_REGEX.source, 'gi'), ' ').trim();
    const speechCharLen = Math.max(1, cleanSpeechOnly.length);
    const estimatedSpeechSec = Math.max(1, (speechCharLen / 14) / speed);

    const addSpeechSegment = (subText: string, startPos: number) => {
      const sentenceRegex = /[^.!?\n।॥۔؟]+[.!?\n।॥۔؟]+|\S[^\n.!?।॥۔؟]*$/g;
      const rawMatches = subText.match(sentenceRegex) || [subText];
      let localCursor = startPos;

      for (const m of rawMatches) {
        const sentenceText = m.trim();
        if (!sentenceText) continue;

        const foundIndex = text.indexOf(sentenceText, localCursor);
        const startChar = foundIndex >= 0 ? foundIndex : localCursor;
        const endChar = startChar + sentenceText.length;
        localCursor = endChar;

        const segDuration = (sentenceText.length / speechCharLen) * estimatedSpeechSec;
        const segStartTime = timeAccum;
        const segEndTime = timeAccum + segDuration;
        timeAccum = segEndTime;

        const words = sentenceText.split(/\s+/).filter(Boolean);
        const wordTimings = words.map((w, wIdx) => {
          const wStart = segStartTime + (wIdx / Math.max(1, words.length)) * segDuration;
          const wEnd = segStartTime + ((wIdx + 1) / Math.max(1, words.length)) * segDuration;
          return {
            word: w,
            startTime: Number(wStart.toFixed(3)),
            endTime: Number(wEnd.toFixed(3)),
            startChar,
            endChar,
            isPause: false,
          };
        });

        segs.push({
          index: segIndex++,
          text: sentenceText,
          startChar,
          endChar,
          startTime: Number(segStartTime.toFixed(3)),
          endTime: Number(segEndTime.toFixed(3)),
          words: wordTimings,
          isPause: false,
        });
      }
    };

    while ((match = regex.exec(trimmed)) !== null) {
      const matchIndex = match.index;
      const matchLength = match[0].length;

      // Text before pause
      if (matchIndex > lastIndex) {
        const beforeText = trimmed.slice(lastIndex, matchIndex);
        if (beforeText.trim()) {
          addSpeechSegment(beforeText, lastIndex);
        }
      }

      // Parse pause duration
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
      durSec = Math.max(0.05, Math.min(10.0, Number(durSec.toFixed(3))));

      const pauseStartTime = timeAccum;
      const pauseEndTime = timeAccum + durSec;
      timeAccum = pauseEndTime;

      segs.push({
        index: segIndex++,
        text: match[0],
        startChar: matchIndex,
        endChar: matchIndex + matchLength,
        startTime: Number(pauseStartTime.toFixed(3)),
        endTime: Number(pauseEndTime.toFixed(3)),
        words: [],
        isPause: true,
        pauseDuration: durSec,
      });

      lastIndex = matchIndex + matchLength;
    }

    // Trailing text
    if (lastIndex < trimmed.length) {
      const afterText = trimmed.slice(lastIndex);
      if (afterText.trim()) {
        addSpeechSegment(afterText, lastIndex);
      }
    }

    return segs;
  }, [text, result?.segments, speed]);

  // Insert Pause Marker helper
  const insertPauseMarker = (durationSec: number) => {
    const marker = ` [pause ${durationSec}s] `;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = (before + marker + after).slice(0, maxCharacters);
      setText(newText);
      if (errorMessage) setErrorMessage(null);

      // Restore focus and cursor position after insertion
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = start + marker.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
      showToast(`Inserted pause marker: [pause ${durationSec}s]`, undefined, 'info');
    } else {
      setText((prev) => (prev ? `${prev}${marker}` : marker).slice(0, maxCharacters));
      showToast(`Inserted pause marker: [pause ${durationSec}s]`, undefined, 'info');
    }
  };

  // Determine Active Segment & Word Index based on currentTime
  const activeSegmentIndex = useMemo(() => {
    if (clientSegments.length === 0) return -1;
    if (isGenerating) return convertingChunkIndex;

    const match = clientSegments.findIndex(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );

    if (match >= 0) return match;
    if (currentTime >= (duration || clientSegments[clientSegments.length - 1].endTime)) {
      return clientSegments.length - 1;
    }
    if (currentTime > 0 && match === -1) {
      // Find closest segment
      const lastPast = clientSegments.filter((s) => s.startTime <= currentTime);
      if (lastPast.length > 0) return clientSegments.indexOf(lastPast[lastPast.length - 1]);
    }
    return isPlaying ? 0 : -1;
  }, [clientSegments, currentTime, isGenerating, convertingChunkIndex, duration, isPlaying]);

  // Determine Active Word Index within the active segment
  const activeWordIndex = useMemo(() => {
    if (activeSegmentIndex < 0 || activeSegmentIndex >= clientSegments.length) return -1;
    const seg = clientSegments[activeSegmentIndex];
    if (!seg || !seg.words || seg.words.length === 0) return -1;

    const wMatch = seg.words.findIndex(
      (w) => currentTime >= w.startTime && currentTime <= w.endTime
    );
    if (wMatch >= 0) return wMatch;
    
    // Proportional fallback
    if (seg.endTime > seg.startTime && currentTime >= seg.startTime) {
      const progressInSeg = Math.max(0, Math.min(1, (currentTime - seg.startTime) / (seg.endTime - seg.startTime)));
      return Math.min(seg.words.length - 1, Math.floor(progressInSeg * seg.words.length));
    }
    return 0;
  }, [clientSegments, activeSegmentIndex, currentTime]);

  // Auto-scroll follow effect for the active segment
  useEffect(() => {
    if (!autoScroll) return;
    if (activeSegmentRef.current && highlightContainerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  // Load TTS config from server
  useEffect(() => {
    let isMounted = true;
    fetch('/api/tts/config')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setLanguages(data.languages || []);
          setAllVoices(data.voices || []);
          setMaxCharacters(data.maxCharacters?.free || 10000);
          setIsConfigLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch TTS config, using default profiles:', err);
        setIsConfigLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter voices by selected language
  const availableVoicesForLanguage = allVoices.filter((v) =>
    v.languages.includes(selectedLanguage)
  );

  // Ensure selected voice is valid for chosen language
  useEffect(() => {
    if (availableVoicesForLanguage.length > 0) {
      const exists = availableVoicesForLanguage.some((v) => v.id === selectedVoice);
      if (!exists) {
        setSelectedVoice(availableVoicesForLanguage[0].id);
      }
    }
  }, [selectedLanguage, availableVoicesForLanguage, selectedVoice]);

  // Audio element listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [result, isLooping]);

  // Character, word, and pause stats
  const characterCount = text.length;
  const speechTextOnly = text.replace(new RegExp(PAUSE_TAG_REGEX.source, 'gi'), ' ').trim();
  const wordCount = speechTextOnly ? speechTextOnly.split(/\s+/).filter(Boolean).length : 0;
  
  // Calculate total pause duration for accurate estimate
  const pauseMatches = useMemo(() => {
    const regex = new RegExp(PAUSE_TAG_REGEX.source, 'gi');
    let m: RegExpExecArray | null;
    let count = 0;
    let totalSec = 0;
    while ((m = regex.exec(text)) !== null) {
      count++;
      let durSec = 1.0;
      if (m[1]) {
        const val = parseFloat(m[1]);
        if (!isNaN(val) && val > 0) {
          const unit = (m[2] || '').toLowerCase();
          if (unit.startsWith('ms') || unit.startsWith('msec')) {
            durSec = val / 1000;
          } else {
            durSec = val;
          }
        }
      }
      totalSec += Math.max(0.05, Math.min(10.0, durSec));
    }
    return { count, totalSec };
  }, [text]);

  const estimatedSeconds = Math.max(1, Math.round(((speechTextOnly.length / 14) / speed) + pauseMatches.totalSec));

  const isRtl = selectedLanguage === 'ar' || selectedLanguage === 'ur';

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Clipboard Paste Helper
  const handlePasteText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setText((prev) => (prev ? `${prev}\n${clipText}` : clipText).slice(0, maxCharacters));
          setEditorMode('edit');
          showToast('Text pasted from clipboard', undefined, 'info');
        }
      } else {
        showToast('Clipboard access not supported in this browser', 'Please use Ctrl+V or Cmd+V to paste.', 'warning');
      }
    } catch (e) {
      showToast('Could not read clipboard', 'Please paste directly into the box.', 'warning');
    }
  };

  // Clear Text
  const handleClearText = () => {
    setText('');
    setResult(null);
    setErrorMessage(null);
    setEditorMode('edit');
  };

  // Seek audio directly by clicking a segment/sentence
  const handleSeekToSegment = (seg: TtsSegmentTiming) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seg.startTime;
      setCurrentTime(seg.startTime);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      showToast(`Jumped to sentence #${seg.index + 1}`, `Timestamp ${formatTime(seg.startTime)}`, 'info');
    } else {
      showToast('Generate speech first to jump audio', undefined, 'info');
    }
  };

  // Seek audio directly by clicking a specific word
  const handleSeekToWord = (wStartTime: number, wordText: string) => {
    if (audioRef.current) {
      audioRef.current.currentTime = wStartTime;
      setCurrentTime(wStartTime);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      showToast(`Jumped to word "${wordText}"`, `Timestamp ${formatTime(wStartTime)}`, 'info');
    }
  };

  // Generate Audio Speech
  const handleGenerateVoice = async () => {
    if (!text.trim()) {
      setErrorMessage('Please type or paste some text before generating voice.');
      return;
    }

    if (text.length > maxCharacters) {
      setErrorMessage(`Text exceeds the maximum limit of ${maxCharacters.toLocaleString()} characters.`);
      return;
    }

    setIsGenerating(true);
    setEditorMode('highlight');
    setErrorMessage(null);
    setQuotaExceeded(false);
    setProgressPercent(15);
    setProgressStage('Preparing text and formatting...');
    setConvertingChunkIndex(0);

    // Pause any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);

    try {
      // Chunk-highlight simulation during synthesis
      const totalSegs = Math.max(1, clientSegments.length);
      const stageInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev < 88) {
            const next = prev + 12;
            const chunkStep = Math.min(totalSegs - 1, Math.floor((next / 100) * totalSegs));
            setConvertingChunkIndex(chunkStep);
            setProgressStage(`Synthesizing sentence chunk ${chunkStep + 1} of ${totalSegs}...`);
            return next;
          }
          return prev;
        });
      }, 350);

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language: selectedLanguage,
          voice: selectedVoice,
          speed,
          pitch,
          volume,
          format,
        }),
      });

      clearInterval(stageInterval);

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.code === 'FREE_LIMIT_REACHED') {
          setQuotaExceeded(true);
          setErrorMessage(data.error || 'Your free Text to Voice limit has been reached. Please try again later or upgrade your plan.');
        } else {
          setErrorMessage(data.error || 'Failed to synthesize voice audio. Please try again.');
        }
        setIsGenerating(false);
        setEditorMode('edit');
        return;
      }

      setProgressPercent(100);
      setProgressStage('Complete');

      const ttsData: TtsResultData = {
        jobId: data.jobId,
        downloadUrl: data.downloadUrl,
        previewUrl: data.previewUrl,
        filename: data.filename,
        format: data.format,
        fileSize: data.fileSize,
        durationSeconds: data.durationSeconds,
        characterCount: data.characterCount,
        wordCount: data.wordCount,
        chunksProcessed: data.chunksProcessed,
        voice: data.voice,
        language: data.language,
        provider: data.provider,
        segments: data.segments,
      };

      setResult(ttsData);
      setIsGenerating(false);
      setEditorMode('highlight');
      showToast('Voice generated successfully!', `Synthesized ${ttsData.wordCount} words. Real-time highlighting active.`, 'success');

      // Record to conversion history
      if (onRecordHistory) {
        onRecordHistory({
          id: `tts-${Date.now()}`,
          fileName: ttsData.filename,
          inputFormat: 'text',
          outputFormat: ttsData.format,
          originalSize: ttsData.characterCount,
          outputSize: ttsData.fileSize,
          date: new Date().toISOString(),
          status: 'completed',
          jobId: ttsData.jobId,
          downloadUrl: ttsData.downloadUrl,
        });
      }
    } catch (err: any) {
      console.error('TTS generate client error:', err);
      setIsGenerating(false);
      setEditorMode('edit');
      setErrorMessage(err?.message || 'Network error while generating speech. Please check your connection.');
    }
  };

  // Play / Pause toggle
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      setEditorMode('highlight');
      audio.play().catch((e) => {
        console.warn('Playback prevented:', e);
      });
    }
  };

  // Seek Scrubber
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // Audio Volume Change
  const handlePlayerVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPlayerVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Audio Playback Speed Change
  const handlePlaybackSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    if (audioRef.current) {
      audioRef.current.playbackRate = spd;
    }
  };

  // Download Trigger
  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Audio download started', result.filename, 'success');
    if (onFileDownloaded) {
      onFileDownloaded();
    }
  };

  // Format Bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10" id="text-to-voice-container">
      {/* 1. Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs">
          <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Multilingual Natural Voice Synthesizer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          Text to Voice – Convert Text to Natural Speech
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          Turn your text into natural-sounding speech and download the audio. Choose your preferred language, voice style, speed, and pitch.
        </p>
      </div>

      {/* Main Workspace Layout (Two Columns on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Large Text Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              {/* View Mode Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditorMode('edit')}
                  id="mode-edit-btn"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    editorMode === 'edit'
                      ? 'bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Script</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorMode('highlight')}
                  id="mode-highlight-btn"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    editorMode === 'highlight'
                      ? 'bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Live Highlighting</span>
                  {isPlaying && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </button>
              </div>

              {/* Utility actions */}
              <div className="flex items-center gap-2">
                {editorMode === 'highlight' && (
                  <button
                    type="button"
                    onClick={() => setAutoScroll((prev) => !prev)}
                    id="auto-scroll-toggle-btn"
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      autoScroll
                        ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500'
                    }`}
                    title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
                  >
                    <span>Auto-Scroll {autoScroll ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {editorMode === 'edit' && (
                  <>
                    <button
                      type="button"
                      onClick={handlePasteText}
                      id="paste-text-btn"
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Paste Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearText}
                      id="clear-text-btn"
                      disabled={!text}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Editor Workspace: Switch between Raw Input and Real-Time Highlight View */}
            {editorMode === 'edit' ? (
              /* Editable Text Area with Pause Insertion Toolbar */
              <div className="space-y-3">
                {/* Pause Marker Quick Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 px-1 mr-1">
                      <Timer className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Insert Pause:</span>
                    </span>

                    <button
                      type="button"
                      id="insert-pause-05s-btn"
                      onClick={() => insertPauseMarker(0.5)}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Insert 0.5 second pause at cursor"
                    >
                      <Plus className="w-3 h-3 text-indigo-500" />
                      <span>0.5s Pause</span>
                    </button>

                    <button
                      type="button"
                      id="insert-pause-1s-btn"
                      onClick={() => insertPauseMarker(1.0)}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Insert 1.0 second pause at cursor"
                    >
                      <Plus className="w-3 h-3 text-indigo-500" />
                      <span>1.0s Pause</span>
                    </button>

                    <button
                      type="button"
                      id="insert-pause-2s-btn"
                      onClick={() => insertPauseMarker(2.0)}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Insert 2.0 second pause at cursor"
                    >
                      <Plus className="w-3 h-3 text-indigo-500" />
                      <span>2.0s Pause</span>
                    </button>

                    <button
                      type="button"
                      id="toggle-custom-pause-btn"
                      onClick={() => setShowCustomPauseModal((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                        showCustomPauseModal
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Custom Pause...</span>
                    </button>
                  </div>

                  <div className="flex items-center text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="hidden sm:inline">Tag: <code className="text-indigo-600 dark:text-indigo-400 font-mono">[pause 1s]</code></span>
                  </div>
                </div>

                {/* Collapsible Custom Pause Duration Builder */}
                {showCustomPauseModal && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Select Pause Duration: {customPauseDuration.toFixed(1)}s ({Math.round(customPauseDuration * 1000)}ms)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {[0.25, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setCustomPauseDuration(dur)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              customPauseDuration === dur
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            {dur}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">0.1s</span>
                      <input
                        type="range"
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        value={customPauseDuration}
                        onChange={(e) => setCustomPauseDuration(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">5.0s</span>

                      <button
                        type="button"
                        id="insert-custom-pause-confirm-btn"
                        onClick={() => {
                          insertPauseMarker(customPauseDuration);
                          setShowCustomPauseModal(false);
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert [pause {customPauseDuration.toFixed(1)}s]</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    id="tts-text-input"
                    rows={9}
                    value={text}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    onChange={(e) => {
                      if (e.target.value.length <= maxCharacters) {
                        setText(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }
                    }}
                    placeholder="Type or paste your text here… Use [pause 1s] or [pause 500ms] to insert intentional speech breaks."
                    className="w-full p-4 rounded-2xl bg-slate-50/70 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y transition-all leading-relaxed font-normal"
                  />
                </div>
              </div>
            ) : (
              /* Synchronized Real-Time Highlight & Voice Reader View */
              <div className="space-y-2">
                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold">
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        <span>Synthesizing voice: Chunk {convertingChunkIndex + 1} of {Math.max(1, clientSegments.length)}</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-3 bg-indigo-600 dark:bg-indigo-400 animate-pulse rounded-full" />
                          <span className="w-1 h-4 bg-indigo-600 dark:bg-indigo-400 animate-pulse delay-75 rounded-full" />
                          <span className="w-1 h-2 bg-indigo-600 dark:bg-indigo-400 animate-pulse delay-150 rounded-full" />
                        </div>
                        <span>
                          Playing Item {activeSegmentIndex >= 0 ? activeSegmentIndex + 1 : 1} of {Math.max(1, clientSegments.length)} ({formatTime(currentTime)})
                        </span>
                      </>
                    ) : result ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Voice ready • Click any sentence, word, or pause break below to play</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Real-time sentence highlighting and pause preview</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorMode('edit')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Text</span>
                    </button>
                  </div>
                </div>

                {/* Highlight Container with Interactive Sentence and Pause Blocks */}
                <div
                  ref={highlightContainerRef}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  id="tts-highlight-viewer"
                  className="min-h-[220px] max-h-[340px] overflow-y-auto p-4 rounded-2xl bg-slate-50/80 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2.5 transition-all text-sm leading-relaxed"
                >
                  {clientSegments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                      No text entered yet. Switch to "Edit Script" to type or paste text.
                    </div>
                  ) : (
                    clientSegments.map((seg, sIdx) => {
                      const isActive = sIdx === activeSegmentIndex;
                      const isPast = activeSegmentIndex >= 0 && sIdx < activeSegmentIndex;
                      const isConverting = isGenerating && sIdx === convertingChunkIndex;

                      // Distinct rendering for Intentional Pause Marker segments
                      if (seg.isPause) {
                        const pauseDur = seg.pauseDuration || 1.0;
                        return (
                          <div
                            key={seg.index}
                            ref={isActive ? activeSegmentRef : null}
                            onClick={() => handleSeekToSegment(seg)}
                            className={`group relative p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-indigo-100/90 dark:bg-indigo-950/90 border-indigo-400 dark:border-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-sm ring-2 ring-indigo-500/30'
                                : isConverting
                                ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-sm animate-pulse'
                                : isPast
                                ? 'bg-slate-100/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                                : 'bg-slate-100/60 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded-lg ${isActive && isPlaying ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                  <Timer className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  Intentional Pause Break ({pauseDur}s)
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {seg.text}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isActive && isPlaying && (
                                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 animate-pulse flex items-center gap-1">
                                    <Hourglass className="w-3 h-3 animate-spin" />
                                    <span>Holding pause...</span>
                                  </span>
                                )}
                                {isPast && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Pause completed</span>
                                  </span>
                                )}
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold text-[10px]">
                                  <MousePointerClick className="w-3 h-3" />
                                  <span>Seek here</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Standard speech segment
                      return (
                        <div
                          key={seg.index}
                          ref={isActive ? activeSegmentRef : null}
                          onClick={() => handleSeekToSegment(seg)}
                          className={`group relative p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50/95 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 text-[#0F172A] dark:text-[#F8FAFC] shadow-sm ring-2 ring-indigo-500/20'
                              : isConverting
                              ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-sm animate-pulse'
                              : isPast
                              ? 'bg-white/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                              : 'bg-white dark:bg-slate-900/30 border-slate-200/70 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          {/* Segment Index & Play Hint Badge */}
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                            <span className="flex items-center gap-1">
                              {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                              {isActive && isPlaying && <Volume2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-bounce" />}
                              <span>Sentence {sIdx + 1}</span>
                              <span>•</span>
                              <span>{formatTime(seg.startTime)}</span>
                            </span>

                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                              <MousePointerClick className="w-3 h-3" />
                              <span>Click to play</span>
                            </span>
                          </div>

                          {/* Words Container with Word-by-Word Highlighting */}
                          <p className="leading-relaxed">
                            {seg.words && seg.words.length > 0 ? (
                              seg.words.map((w, wIdx) => {
                                const isCurrentWord = isActive && isPlaying && wIdx === activeWordIndex;
                                const isPastWord = isActive && isPlaying && wIdx < activeWordIndex;

                                return (
                                  <span
                                    key={wIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSeekToWord(w.startTime, w.word);
                                    }}
                                    className={`inline-block transition-all duration-100 rounded px-1 py-0.5 my-0.5 mx-0.5 ${
                                      isCurrentWord
                                        ? 'bg-indigo-600 text-white font-black scale-105 shadow-xs'
                                        : isPastWord
                                        ? 'text-indigo-700 dark:text-indigo-300 font-semibold'
                                        : 'hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50'
                                    }`}
                                  >
                                    {w.word}
                                  </span>
                                );
                              })
                            ) : (
                              <span>{seg.text}</span>
                            )}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Live Counter & Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Characters: <span className={characterCount > maxCharacters * 0.9 ? 'text-amber-600 font-bold' : ''}>{characterCount.toLocaleString()}</span> / {maxCharacters.toLocaleString()}
                </span>
                <span>•</span>
                <span>{wordCount.toLocaleString()} words</span>
                {pauseMatches.count > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      <span>{pauseMatches.count} {pauseMatches.count === 1 ? 'pause' : 'pauses'} ({pauseMatches.totalSec.toFixed(1)}s)</span>
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Est. ~{estimatedSeconds}s audio</span>
              </div>

              {characterCount > maxCharacters && (
                <span className="text-rose-600 dark:text-rose-400 font-bold text-xs">
                  Character limit reached
                </span>
              )}
            </div>

            {/* Preset Samples Selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">
                Try Sample Script:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setText(preset.text);
                      setSelectedLanguage(preset.language);
                      setSelectedVoice(preset.voice);
                      showToast(`Loaded "${preset.label}"`, undefined, 'info');
                    }}
                    className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-xs text-slate-700 dark:text-slate-300 transition-all truncate cursor-pointer"
                  >
                    <span className="font-semibold block truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Voice & Language Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Voice & Audio Settings</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                Ready
              </span>
            </div>

            {/* 1. Language Selection */}
            <div className="space-y-1.5">
              <label htmlFor="tts-language-select" className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Language:</span>
              </label>
              <div className="relative">
                <select
                  id="tts-language-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer pr-10"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. Voice Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-500" />
                <span>Select Voice:</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {availableVoicesForLanguage.map((v) => {
                  const isSelected = selectedVoice === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVoice(v.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-400 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black">{v.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              v.gender === 'female'
                                ? 'bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300'
                                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {v.gender}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-1">{v.style}</p>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Speed Pill Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Speed ({speed}x)
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  {speed === 1.0 ? 'Default' : speed < 1.0 ? 'Slower' : 'Faster'}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {SPEED_OPTIONS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeed(spd)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      speed === spd
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Pitch Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Pitch
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold capitalize">
                  {pitch}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['low', 'normal', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPitch(p)}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      pitch === p
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Volume Slider & Output Format */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  <span>Volume</span>
                  <span>{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setFormat('mp3')}
                    className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      format === 'mp3'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    MP3
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('wav')}
                    className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      format === 'wav'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    WAV
                  </button>
                </div>
              </div>
            </div>

            {/* Action Trigger Button */}
            <button
              type="button"
              id="generate-voice-btn"
              onClick={handleGenerateVoice}
              disabled={isGenerating || !text.trim() || characterCount > maxCharacters}
              className={`w-full py-4 rounded-2xl text-sm font-extrabold text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-indigo-600/80 cursor-wait animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                  <span>{progressStage || 'Generating voice...'} ({progressPercent}%)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Voice</span>
                </>
              )}
            </button>

            {/* Error or Limit Banner */}
            {errorMessage && (
              <div
                className={`p-4 rounded-2xl text-xs space-y-2 border ${
                  quotaExceeded
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-relaxed">{errorMessage}</p>
                </div>
                {quotaExceeded && (
                  <button
                    type="button"
                    onClick={() => onNavigate('pricing')}
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1 cursor-pointer"
                  >
                    <span>Upgrade to Pro for higher limits</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Audio Preview & Download Panel */}
      {result && (
        <div
          id="tts-preview-player"
          className="bg-white dark:bg-[#111827] border-2 border-indigo-200 dark:border-indigo-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Hidden HTML5 Audio Element */}
          <audio ref={audioRef} src={result.previewUrl} preload="auto" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                  {result.format.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500 font-semibold">•</span>
                <span className="text-xs text-slate-500 font-semibold">{result.language}</span>
                <span className="text-xs text-slate-500 font-semibold">•</span>
                <span className="text-xs text-slate-500 font-semibold">Voice: {result.voice}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                Audio Generated Successfully
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownload}
                id="download-audio-btn"
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Audio ({formatBytes(result.fileSize)})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleGenerateVoice();
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Generate Again</span>
              </button>
            </div>
          </div>

          {/* Audio Player Controls */}
          <div className="bg-slate-50 dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            {/* Scrubber and Time */}
            <div className="space-y-1.5">
              <input
                type="range"
                min="0"
                max={duration || result.durationSeconds || 100}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || result.durationSeconds)}</span>
              </div>
            </div>

            {/* Playback Buttons Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              {/* Play / Pause & Loop */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  id="play-pause-audio-btn"
                  className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  aria-label={isPlaying ? 'Pause speech audio' : 'Play speech audio'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsLooping((prev) => !prev)}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isLooping
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title={isLooping ? 'Loop is ON' : 'Loop is OFF'}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:block">
                  <span>{isPlaying ? 'Playing speech preview...' : 'Ready to listen'}</span>
                </div>
              </div>

              {/* Volume & Speed Controls */}
              <div className="flex items-center gap-4">
                {/* Playback speed selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
                  {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handlePlaybackSpeedChange(spd)}
                      className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {isMuted || playerVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : playerVolume}
                    onChange={handlePlayerVolumeChange}
                    className="w-16 sm:w-20 accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Features & Privacy Trust Guarantee */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Natural Human Resonance
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Engineered with clear articulation, multi-clause breathing pauses, and natural inflection for presentations, tutorials, and audiobooks.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Unicode & Multilingual Support
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Full support for Devanagari Hindi, Urdu Nastaliq/Arabic script, Spanish, French, German, and global Unicode phonetic systems.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Zero-Retention Privacy
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Your text is processed strictly for real-time synthesis and ephemeral audio generation. No logs, scripts, or recordings are retained.
          </p>
        </div>
      </div>

      {/* 4. FAQ Accordion for Text to Speech */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
          Frequently Asked Questions (FAQ)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Can I download the generated audio for offline use?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Yes! You can download your synthesized voice as either an MP3 or WAV file directly to your device without registration or watermarks.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              How does long text chunking work?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Convert-X automatically breaks large paragraphs into natural sentence chunks, synthesizes each portion, and seamlessly stitches the audio with smooth pauses.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Which languages are supported?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              We support English, Hindi (हिन्दी), Urdu (اردو), Spanish (Español), French (Français), German (Deutsch), Arabic (العربية), Portuguese, Japanese, Chinese, and Russian.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Is my text kept private?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Yes. Convert-X operates under strict zero-retention principles over 256-bit encrypted channels. Generated audio files are automatically purged from memory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
