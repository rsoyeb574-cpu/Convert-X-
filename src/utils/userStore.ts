import { UserPreferences, UserProfile } from '../types.js';

const PREFERENCES_KEY = 'convertx_user_preferences_v1';
const PROFILE_KEY = 'convertx_user_profile_v1';
const RETURNING_USER_KEY = 'convertx_user_visits_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultTargetFormat: 'png',
  autoDownload: false,
  autoConvert: false,
  autoConvertOnUpload: false,
  autoDeleteAfterDownload: false,
  imageQuality: 92,
  preserveMetadata: true,
  theme: 'system',
  favoriteTools: ['png-to-jpg', 'pdf-to-png', 'image-to-pdf'],
  recentTools: [
    { slug: 'png-to-pdf', name: 'PNG to PDF', timestamp: new Date().toISOString() },
    { slug: 'jpg-to-png', name: 'JPG to PNG', timestamp: new Date().toISOString() },
  ],
};

/**
 * Loads stored user preferences
 */
export function getStoredUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    const autoConvertVal =
      typeof parsed.autoConvert === 'boolean'
        ? parsed.autoConvert
        : typeof parsed.autoConvertOnUpload === 'boolean'
        ? parsed.autoConvertOnUpload
        : DEFAULT_PREFERENCES.autoConvertOnUpload;

    const autoDeleteVal =
      typeof parsed.autoDeleteAfterDownload === 'boolean'
        ? parsed.autoDeleteAfterDownload
        : DEFAULT_PREFERENCES.autoDeleteAfterDownload;

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      autoConvert: autoConvertVal,
      autoConvertOnUpload: autoConvertVal,
      autoDeleteAfterDownload: autoDeleteVal,
      favoriteTools: Array.isArray(parsed.favoriteTools) ? parsed.favoriteTools : DEFAULT_PREFERENCES.favoriteTools,
      recentTools: Array.isArray(parsed.recentTools) ? parsed.recentTools : DEFAULT_PREFERENCES.recentTools,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Persists user preferences
 */
export function saveUserPreferences(prefs: Partial<UserPreferences>): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const current = getStoredUserPreferences();
    const autoVal =
      prefs.autoConvert !== undefined
        ? prefs.autoConvert
        : prefs.autoConvertOnUpload;

    const normalizedPrefs = { ...prefs };
    if (autoVal !== undefined) {
      normalizedPrefs.autoConvert = autoVal;
      normalizedPrefs.autoConvertOnUpload = autoVal;
    }

    const updated: UserPreferences = { ...current, ...normalizedPrefs };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Toggles a tool in favorite list
 */
export function toggleFavoriteTool(slug: string): string[] {
  const current = getStoredUserPreferences();
  const exists = current.favoriteTools.includes(slug);
  const updatedFavorites = exists
    ? current.favoriteTools.filter((s) => s !== slug)
    : [...current.favoriteTools, slug];

  saveUserPreferences({ favoriteTools: updatedFavorites });
  return updatedFavorites;
}

/**
 * Records a recently used tool
 */
export function recordRecentTool(slug: string, name: string): UserPreferences['recentTools'] {
  const current = getStoredUserPreferences();
  const filtered = current.recentTools.filter((t) => t.slug !== slug);
  const updatedRecents = [
    { slug, name, timestamp: new Date().toISOString() },
    ...filtered,
  ].slice(0, 6);

  saveUserPreferences({ recentTools: updatedRecents });
  return updatedRecents;
}

/**
 * Gets or initializes user profile
 */
export function getStoredUserProfile(): UserProfile {
  const defaultProfile: UserProfile = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Math.random().toString(36).substring(2, 9)}`,
    plan: 'free',
    isRegistered: false,
    referralCode: 'CONVERTX-FREE',
    createdAt: new Date().toISOString(),
    preferences: getStoredUserPreferences(),
  };

  if (typeof window === 'undefined') return defaultProfile;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile));
      return defaultProfile;
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultProfile,
      ...parsed,
      preferences: getStoredUserPreferences(),
    };
  } catch {
    return defaultProfile;
  }
}

/**
 * Updates user profile (e.g. registration, email)
 */
export function saveUserProfile(profileUpdates: Partial<UserProfile>): UserProfile {
  if (typeof window === 'undefined') return getStoredUserProfile();
  try {
    const current = getStoredUserProfile();
    const updated: UserProfile = { ...current, ...profileUpdates };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getStoredUserProfile();
  }
}

/**
 * Checks returning visitor stats for the "Welcome Back" experience
 */
export function checkReturningUser(): { isReturning: boolean; visitCount: number; lastVisit: string | null } {
  if (typeof window === 'undefined') return { isReturning: false, visitCount: 1, lastVisit: null };
  try {
    const raw = localStorage.getItem(RETURNING_USER_KEY);
    const now = new Date().toISOString();
    if (!raw) {
      localStorage.setItem(RETURNING_USER_KEY, JSON.stringify({ count: 1, lastVisit: now }));
      return { isReturning: false, visitCount: 1, lastVisit: null };
    }
    const parsed = JSON.parse(raw);
    const count = (parsed.count || 1) + 1;
    const lastVisit = parsed.lastVisit || null;
    localStorage.setItem(RETURNING_USER_KEY, JSON.stringify({ count, lastVisit: now }));
    return { isReturning: count > 1, visitCount: count, lastVisit };
  } catch {
    return { isReturning: false, visitCount: 1, lastVisit: null };
  }
}
