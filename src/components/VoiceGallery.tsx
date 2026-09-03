import React, { useState, useRef, useMemo, useEffect } from 'react';
import { TtsVoiceOption } from '../types.js';
import { getFavoriteVoiceIds, toggleFavoriteVoice } from '../utils/userStore.js';
import {
  Search,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Check,
  CheckCircle2,
  Mic,
  Sliders,
  Sparkles,
  ArrowRight,
  Radio,
  Layers,
  HelpCircle,
  RotateCcw,
  Tag,
  Filter,
  Columns,
  SplitSquareVertical,
  Activity,
  Heart,
  Globe,
  Share2,
} from 'lucide-react';

interface VoiceGalleryProps {
  voices: TtsVoiceOption[];
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  onClose?: () => void;
  onSwitchToStudio?: () => void;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isModal?: boolean;
  favoriteVoices?: string[];
  onToggleFavoriteVoice?: (voiceId: string) => void;
}

// Preset Filter Categories matching user request & specific use cases
const FILTER_TAGS = [
  'All',
  'Favorites',
  'Professional',
  'Casual',
  'Narration',
  'Commercial',
  'Audiobooks',
  'Calm',
  'Energetic',
  'Conversational',
];

// Visual Theme Palette for Voice Avatars
interface VoiceVisualTheme {
  avatarBg: string;
  avatarText: string;
  borderAccent: string;
  badgeBg: string;
  badgeText: string;
  waveformColor: string;
}

const VOICE_THEMES: Record<string, VoiceVisualTheme> = {
  Kore: {
    avatarBg: 'bg-rose-100 dark:bg-rose-950/80',
    avatarText: 'text-rose-600 dark:text-rose-400',
    borderAccent: 'border-rose-300 dark:border-rose-800/80',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    waveformColor: 'bg-rose-500',
  },
  Puck: {
    avatarBg: 'bg-cyan-100 dark:bg-cyan-950/80',
    avatarText: 'text-cyan-600 dark:text-cyan-400',
    borderAccent: 'border-cyan-300 dark:border-cyan-800/80',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    waveformColor: 'bg-cyan-500',
  },
  Charon: {
    avatarBg: 'bg-slate-200 dark:bg-slate-800',
    avatarText: 'text-slate-800 dark:text-slate-200',
    borderAccent: 'border-slate-400 dark:border-slate-700',
    badgeBg: 'bg-slate-100 dark:bg-slate-900/60',
    badgeText: 'text-slate-700 dark:text-slate-300',
    waveformColor: 'bg-slate-700 dark:bg-slate-300',
  },
  Fenrir: {
    avatarBg: 'bg-blue-100 dark:bg-blue-950/80',
    avatarText: 'text-blue-600 dark:text-blue-400',
    borderAccent: 'border-blue-300 dark:border-blue-800/80',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
    waveformColor: 'bg-blue-600',
  },
  Zephyr: {
    avatarBg: 'bg-violet-100 dark:bg-violet-950/80',
    avatarText: 'text-violet-600 dark:text-violet-400',
    borderAccent: 'border-violet-300 dark:border-violet-800/80',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/50',
    badgeText: 'text-violet-700 dark:text-violet-300',
    waveformColor: 'bg-violet-500',
  },
  Aoede: {
    avatarBg: 'bg-amber-100 dark:bg-amber-950/80',
    avatarText: 'text-amber-700 dark:text-amber-400',
    borderAccent: 'border-amber-300 dark:border-amber-800/80',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    waveformColor: 'bg-amber-500',
  },
};

const DEFAULT_THEME: VoiceVisualTheme = {
  avatarBg: 'bg-indigo-100 dark:bg-indigo-950/80',
  avatarText: 'text-indigo-600 dark:text-indigo-400',
  borderAccent: 'border-indigo-300 dark:border-indigo-800/80',
  badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
  badgeText: 'text-indigo-700 dark:text-indigo-300',
  waveformColor: 'bg-indigo-600',
};

export const VoiceGallery: React.FC<VoiceGalleryProps> = ({
  voices,
  selectedVoiceId,
  onSelectVoice,
  onClose,
  onSwitchToStudio,
  showToast,
  isModal = false,
  favoriteVoices,
  onToggleFavoriteVoice,
}) => {
  // Search & Tag Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTag, setActiveTag] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');

  // Favorites state persisted from user store
  const [favoriteVoiceIds, setFavoriteVoiceIds] = useState<string[]>(() => {
    if (Array.isArray(favoriteVoices)) return favoriteVoices;
    return getFavoriteVoiceIds();
  });

  // Sync with prop updates
  useEffect(() => {
    if (Array.isArray(favoriteVoices)) {
      setFavoriteVoiceIds(favoriteVoices);
    }
  }, [favoriteVoices]);

  // Sync across tabs/components when preferences change
  useEffect(() => {
    const handleStorageUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail && Array.isArray(customEv.detail.favoriteVoices)) {
        setFavoriteVoiceIds(customEv.detail.favoriteVoices);
      }
    };
    window.addEventListener('convertx_preferences_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('convertx_preferences_updated', handleStorageUpdate);
    };
  }, []);

  const handleToggleFavorite = (voiceId: string, voiceName: string) => {
    const updated = toggleFavoriteVoice(voiceId);
    setFavoriteVoiceIds(updated);
    if (onToggleFavoriteVoice) {
      onToggleFavoriteVoice(voiceId);
    }
    const isNowFavorite = updated.includes(voiceId);
    if (isNowFavorite) {
      showToast?.(
        'Added to Favorites',
        `"${voiceName}" saved to your favorite voices.`,
        'success'
      );
    } else {
      showToast?.(
        'Removed from Favorites',
        `"${voiceName}" removed from your favorites.`,
        'info'
      );
    }
  };

  // Audio Auditioning Player State
  const [currentlyPlayingVoiceId, setCurrentlyPlayingVoiceId] = useState<string | null>(null);
  const [audioLoadingVoiceId, setAudioLoadingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Comparison State (Select up to 3 voices for side-by-side comparison)
  const [comparedVoiceIds, setComparedVoiceIds] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Filtered Voices logic
  const filteredVoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return voices.filter((v) => {
      const isFav = favoriteVoiceIds.includes(v.id);

      // 1. Gender Filter
      if (genderFilter !== 'all' && v.gender.toLowerCase() !== genderFilter.toLowerCase()) {
        return false;
      }

      // 2. Tag / Favorites Filter
      if (activeTag === 'Favorites') {
        if (!isFav) {
          return false;
        }
      } else if (activeTag !== 'All') {
        const matchesTag =
          v.tags?.some((t) => t.toLowerCase() === activeTag.toLowerCase()) ||
          v.style.toLowerCase().includes(activeTag.toLowerCase()) ||
          v.description.toLowerCase().includes(activeTag.toLowerCase());

        if (!matchesTag) {
          return false;
        }
      }

      // 3. Search Query Filter
      if (!q) return true;

      // Direct search keyword match for "favorite", "favorites", "fav"
      if (q === 'favorite' || q === 'favorites' || q === 'fav') {
        return isFav;
      }

      const nameMatch = v.name.toLowerCase().includes(q);
      const styleMatch = v.style.toLowerCase().includes(q);
      const descMatch = v.description.toLowerCase().includes(q);
      const tagMatch = v.tags?.some((t) => t.toLowerCase().includes(q));
      const useCaseMatch = v.useCases?.some((u) => u.toLowerCase().includes(q));
      const toneMatch = v.tone?.toLowerCase().includes(q);
      const genderMatch = v.gender.toLowerCase() === q;
      const accentMatch = v.accent?.toLowerCase().includes(q);

      return (
        nameMatch ||
        styleMatch ||
        descMatch ||
        tagMatch ||
        useCaseMatch ||
        toneMatch ||
        genderMatch ||
        accentMatch
      );
    });
  }, [voices, searchQuery, activeTag, genderFilter, favoriteVoiceIds]);

  // Audio Preview Handler
  const handlePlayVoiceSample = (voice: TtsVoiceOption) => {
    // If clicking on already playing voice, pause it
    if (currentlyPlayingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentlyPlayingVoiceId(null);
      return;
    }

    // Stop any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setAudioLoadingVoiceId(voice.id);
    const audioUrl = voice.previewUrl || `/api/tts/voice-sample/${voice.id}`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.oncanplay = () => {
      setAudioLoadingVoiceId(null);
      audio
        .play()
        .then(() => {
          setCurrentlyPlayingVoiceId(voice.id);
        })
        .catch(() => {
          // If network audio fails, try Web Speech API fallback
          playSpeechSynthesisFallback(voice);
        });
    };

    audio.onended = () => {
      setCurrentlyPlayingVoiceId(null);
    };

    audio.onerror = () => {
      setAudioLoadingVoiceId(null);
      playSpeechSynthesisFallback(voice);
    };
  };

  // Web Speech API Fallback for 100% offline or network recovery
  const playSpeechSynthesisFallback = (voice: TtsVoiceOption) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text =
        voice.samplePhrase ||
        `Hello! I am ${voice.name}. Experience high-fidelity natural speech with Convert-X.`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = voice.gender === 'female' ? 1.15 : 0.85;
      utter.rate = 1.0;
      utter.onstart = () => {
        setAudioLoadingVoiceId(null);
        setCurrentlyPlayingVoiceId(voice.id);
      };
      utter.onend = () => {
        setCurrentlyPlayingVoiceId(null);
      };
      utter.onerror = () => {
        setCurrentlyPlayingVoiceId(null);
        if (showToast) {
          showToast('Sample audio unavailable', 'Unable to play voice preview.', 'info');
        }
      };
      window.speechSynthesis.speak(utter);
    } else {
      setAudioLoadingVoiceId(null);
      setCurrentlyPlayingVoiceId(null);
      if (showToast) {
        showToast('Sample audio preview', 'Audio preview is not supported in this browser.', 'info');
      }
    }
  };

  // Toggle Voice into Comparison Basket
  const toggleCompareVoice = (voiceId: string) => {
    setComparedVoiceIds((prev) => {
      if (prev.includes(voiceId)) {
        return prev.filter((id) => id !== voiceId);
      }
      if (prev.length >= 3) {
        if (showToast) {
          showToast('Comparison limit reached', 'You can compare up to 3 voices at a time.', 'info');
        }
        return prev;
      }
      return [...prev, voiceId];
    });
  };

  // Select Voice & return/toast
  const handleSelect = (voiceId: string, voiceName: string) => {
    onSelectVoice(voiceId);
    if (showToast) {
      showToast('Voice selected', `Switched active voice profile to "${voiceName}".`, 'success');
    }
    if (onSwitchToStudio) {
      onSwitchToStudio();
    } else if (onClose) {
      onClose();
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveTag('All');
    setGenderFilter('all');
  };

  const comparedVoices = useMemo(() => {
    return voices.filter((v) => comparedVoiceIds.includes(v.id));
  }, [voices, comparedVoiceIds]);

  return (
    <div
      id="voice-gallery-container"
      className={`space-y-6 ${isModal ? 'p-1 sm:p-2' : 'max-w-6xl mx-auto'}`}
    >
      {/* 1. Header & Quick Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI Voice Gallery</span>
            <span>•</span>
            <span>{voices.length} Prebuilt Profiles</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            Explore & Compare Voice Profiles
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-2xl">
            Audition high-fidelity voices across diverse tones and styles. Filter by use case or search to find the perfect voice for your project.
          </p>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2.5 shrink-0">
          {comparedVoiceIds.length > 0 && (
            <button
              type="button"
              id="voice-gallery-compare-btn"
              onClick={() => setShowComparisonModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Compare ({comparedVoiceIds.length})</span>
            </button>
          )}

          {onSwitchToStudio && (
            <button
              type="button"
              id="voice-gallery-back-studio-btn"
              onClick={onSwitchToStudio}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Back to Studio</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              id="voice-gallery-close-btn"
              onClick={onClose}
              aria-label="Close Voice Gallery"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Search Bar & Filter Controls Bar */}
      <div className="space-y-3 bg-slate-50/80 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl p-4 sm:p-5 shadow-xs">
        {/* Search Input Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="voice-gallery-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, style, use case, or type 'favorites'..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                id="voice-gallery-clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Favorites Filter Toggle Button */}
          <button
            type="button"
            id="voice-gallery-search-favorites-btn"
            onClick={() => setActiveTag((prev) => (prev === 'Favorites' ? 'All' : 'Favorites'))}
            title={activeTag === 'Favorites' ? 'Show all voices' : 'Filter by favorites'}
            aria-label={activeTag === 'Favorites' ? 'Show all voices' : 'Filter by favorites'}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border ${
              activeTag === 'Favorites'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 shadow-xs ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                activeTag === 'Favorites' ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'
              }`}
            />
            <span className="font-extrabold">Favorites</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTag === 'Favorites'
                  ? 'bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {favoriteVoiceIds.length}
            </span>
          </button>

          {/* Gender Filter Segment */}
          <div className="flex items-center p-1 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              id="filter-gender-all"
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                genderFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Genders
            </button>
            <button
              type="button"
              id="filter-gender-female"
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                genderFilter === 'female'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Female
            </button>
            <button
              type="button"
              id="filter-gender-male"
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                genderFilter === 'male'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Male
            </button>
          </div>
        </div>

        {/* Tag Pills Row (User specifically requested e.g., 'Favorites', 'Professional', 'Casual', 'Narration') */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1 uppercase tracking-wider">
            <Tag className="w-3 h-3" />
            <span>Use Cases:</span>
          </span>

          {FILTER_TAGS.map((tag) => {
            const isSelected = activeTag === tag;
            const isFavTag = tag === 'Favorites';
            const count = isFavTag
              ? favoriteVoiceIds.length
              : tag === 'All'
              ? voices.length
              : voices.filter(
                  (v) =>
                    v.tags?.some((t) => t.toLowerCase() === tag.toLowerCase()) ||
                    v.style.toLowerCase().includes(tag.toLowerCase())
                ).length;

            return (
              <button
                key={tag}
                type="button"
                id={`voice-filter-tag-${tag.toLowerCase()}`}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? isFavTag
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-indigo-600 text-white shadow-xs'
                    : isFavTag
                    ? 'bg-white dark:bg-[#111827] text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {isFavTag && (
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      isSelected ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'
                    }`}
                  />
                )}
                <span>{tag}</span>
                {tag !== 'All' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? isFavTag
                          ? 'bg-rose-700 text-rose-100'
                          : 'bg-indigo-700 text-indigo-100'
                        : isFavTag
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Active Filter Clear button if filtered */}
          {(searchQuery || activeTag !== 'All' || genderFilter !== 'all') && (
            <button
              type="button"
              id="voice-gallery-reset-filters-btn"
              onClick={handleResetFilters}
              className="ml-auto text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer py-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredVoices.length}</strong> of {voices.length} voice profiles
            {activeTag !== 'All' && ` for "${activeTag}"`}
            {genderFilter !== 'all' && ` (${genderFilter})`}
          </span>

          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active selection: <strong>{voices.find((v) => v.id === selectedVoiceId)?.name || selectedVoiceId}</strong></span>
          </span>
        </div>
      </div>

      {/* 3. Voice Cards Grid */}
      {filteredVoices.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-50 dark:bg-[#0B1120] border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              activeTag === 'Favorites'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {activeTag === 'Favorites' ? (
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            ) : (
              <Search className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {activeTag === 'Favorites'
                ? 'No favorited voice profiles yet'
                : 'No voice profiles match your criteria'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              {activeTag === 'Favorites'
                ? 'Click the heart icon on any voice card in the gallery to save your favorite voices for instant 1-click access.'
                : 'Try searching for a different keyword or resetting your use case tag filters.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
          >
            {activeTag === 'Favorites' ? 'Browse All Voices' : 'Clear All Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoiceId === voice.id;
            const isPlaying = currentlyPlayingVoiceId === voice.id;
            const isLoadingAudio = audioLoadingVoiceId === voice.id;
            const isCompared = comparedVoiceIds.includes(voice.id);
            const isFavorite = favoriteVoiceIds.includes(voice.id);
            const theme = VOICE_THEMES[voice.name] || DEFAULT_THEME;

            return (
              <div
                key={voice.id}
                id={`voice-card-${voice.id.toLowerCase()}`}
                className={`group relative rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 shadow-xs hover:shadow-md'
                }`}
              >
                {/* Top Banner & Voice Identity */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Header: Avatar, Name, Gender, Status, Favorite */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar Circle */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-xs shrink-0 ${theme.avatarBg} ${theme.avatarText}`}
                      >
                        {isPlaying ? (
                          <div className="flex items-end gap-0.5 h-5">
                            <span className={`w-1 h-3.5 rounded-full ${theme.waveformColor} animate-pulse`} />
                            <span className={`w-1 h-5 rounded-full ${theme.waveformColor} animate-pulse delay-75`} />
                            <span className={`w-1 h-2.5 rounded-full ${theme.waveformColor} animate-pulse delay-150`} />
                            <span className={`w-1 h-4 rounded-full ${theme.waveformColor} animate-pulse delay-100`} />
                          </div>
                        ) : (
                          <span>{voice.name.substring(0, 2)}</span>
                        )}
                      </div>

                      {/* Name & Style Header */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-[#0F172A] dark:text-[#F8FAFC]">
                            {voice.name}
                          </h3>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {voice.style}
                        </p>
                      </div>
                    </div>

                    {/* Top Right: Gender Pill & Favorite Heart Icon Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize flex items-center gap-1 ${
                          voice.gender === 'female'
                            ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900/40'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
                        }`}
                      >
                        <span>{voice.gender === 'female' ? '♀' : '♂'}</span>
                        <span>{voice.gender}</span>
                      </span>

                      {/* Favorite (Heart) Icon Button */}
                      <button
                        type="button"
                        id={`voice-favorite-btn-${voice.id.toLowerCase()}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(voice.id, voice.name);
                        }}
                        aria-label={isFavorite ? `Remove ${voice.name} from favorites` : `Add ${voice.name} to favorites`}
                        title={isFavorite ? `Remove ${voice.name} from favorites` : `Add ${voice.name} to favorites`}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center border group/fav ${
                          isFavorite
                            ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/60 ring-2 ring-rose-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900/40'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform group-hover/fav:scale-115 active:scale-125 ${
                            isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/fav:text-rose-500'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed line-clamp-2">
                    {voice.description}
                  </p>

                  {/* Tag Pills (Clicking sets filter) */}
                  {voice.tags && voice.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {voice.tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setActiveTag(t)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Audio Sample Audition Quote Block */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-indigo-500" />
                        <span>Audition Sample</span>
                      </span>

                      {voice.pitch && (
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {voice.pitch}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-2">
                      "{voice.samplePhrase || `Welcome to Convert-X. Turn your text into clear, natural speech.`}"
                    </p>

                    {/* Interactive Play/Pause Sample Button */}
                    <button
                      type="button"
                      id={`voice-sample-btn-${voice.id.toLowerCase()}`}
                      onClick={() => handlePlayVoiceSample(voice)}
                      disabled={isLoadingAudio}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isPlaying
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                          : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                      }`}
                    >
                      {isLoadingAudio ? (
                        <>
                          <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          <span>Buffering preview...</span>
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause Sample Audio</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Listen Voice Sample</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ideal Use Cases Mini List */}
                  {voice.useCases && voice.useCases.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Best For:
                      </span>
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                        {voice.useCases.join(' • ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  {/* Compare Checkbox Toggle */}
                  <label
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isCompared}
                      onChange={() => toggleCompareVoice(voice.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Compare</span>
                  </label>

                  {/* Primary Selection Button */}
                  <button
                    type="button"
                    id={`select-voice-btn-${voice.id.toLowerCase()}`}
                    onClick={() => handleSelect(voice.id, voice.name)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected Voice</span>
                      </>
                    ) : (
                      <>
                        <span>Select Voice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Floating Comparison Tray (When 1 or more voices checked) */}
      {comparedVoiceIds.length > 0 && (
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-[#0F172A] text-white shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Columns className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                Comparing {comparedVoiceIds.length} of 3 Voice Profiles
              </div>
              <div className="text-[11px] text-slate-400">
                {comparedVoices.map((v) => v.name).join(', ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="voice-comparison-open-tray-btn"
              onClick={() => setShowComparisonModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>View Side-by-Side Comparison</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              id="voice-comparison-clear-tray-btn"
              onClick={() => setComparedVoiceIds([])}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 5. Side-by-Side Comparison Modal */}
      {showComparisonModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowComparisonModal(false)}
        >
          <div
            className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 max-w-4xl w-full shadow-2xl space-y-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                  <Columns className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Voice Comparison Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare acoustic delivery, tone characteristics, and optimal use cases side-by-side.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Grid Columns */}
            <div
              className={`grid gap-4 ${
                comparedVoices.length === 1
                  ? 'grid-cols-1'
                  : comparedVoices.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-3'
              }`}
            >
              {comparedVoices.map((voice) => {
                const isSelected = selectedVoiceId === voice.id;
                const isPlaying = currentlyPlayingVoiceId === voice.id;
                const isFavorite = favoriteVoiceIds.includes(voice.id);
                const theme = VOICE_THEMES[voice.name] || DEFAULT_THEME;

                return (
                  <div
                    key={voice.id}
                    className={`p-5 rounded-2xl border space-y-4 flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Voice Name & Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${theme.avatarBg} ${theme.avatarText}`}
                          >
                            {voice.name.substring(0, 2)}
                          </div>
                          <div>
                            <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                              {voice.name}
                            </h4>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {voice.style}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {voice.gender}
                          </span>
                          <button
                            type="button"
                            id={`compare-voice-favorite-btn-${voice.id.toLowerCase()}`}
                            onClick={() => handleToggleFavorite(voice.id, voice.name)}
                            aria-label={isFavorite ? `Remove ${voice.name} from favorites` : `Add ${voice.name} to favorites`}
                            title={isFavorite ? `Remove ${voice.name} from favorites` : `Add ${voice.name} to favorites`}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              isFavorite
                                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50 ring-1 ring-rose-500/20'
                                : 'text-slate-400 hover:text-rose-500'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Audition Player */}
                      <button
                        type="button"
                        onClick={() => handlePlayVoiceSample(voice)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isPlaying
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Pause Audition</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Audition {voice.name}</span>
                          </>
                        )}
                      </button>

                      {/* Detailed Specs List */}
                      <div className="space-y-2 text-xs pt-1">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tone & Delivery:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {voice.tone || voice.style}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Pitch & Pace:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {voice.pitch || 'Balanced'} • {voice.pace || 'Moderate'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Accent:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {voice.accent || 'Neutral Global'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Primary Use Cases:
                          </span>
                          <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5">
                            {(voice.useCases || ['Corporate', 'Narration', 'Explainers']).map((u) => (
                              <li key={u}>{u}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Choose Voice Action */}
                    <button
                      type="button"
                      onClick={() => {
                        handleSelect(voice.id, voice.name);
                        setShowComparisonModal(false);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Currently Active</span>
                        </>
                      ) : (
                        <>
                          <span>Select {voice.name}</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
