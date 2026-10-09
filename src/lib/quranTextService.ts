import { QURAN_SURAHS, getSurahInfo } from '../data/quranData';

// In-memory cache for all 114 Surahs and their Uthmani verses
let cachedQuranMap: Record<number, string[]> | null = null;
let loadPromise: Promise<Record<number, string[]>> | null = null;

/**
 * Load all Quran verses from public/quran-verses.json or fallback API
 */
export async function loadAllQuranVerses(): Promise<Record<number, string[]>> {
  if (cachedQuranMap && Object.keys(cachedQuranMap).length >= 114) {
    return cachedQuranMap;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      // 1. Try local bundled public file
      const resp = await fetch('/quran-verses.json');
      if (resp.ok) {
        const data = await resp.json();
        if (data && typeof data === 'object' && Object.keys(data).length >= 114) {
          cachedQuranMap = data;
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to load /quran-verses.json, trying server endpoint:', err);
    }

    try {
      // 2. Try server endpoint
      const resp2 = await fetch('/api/quran/all');
      if (resp2.ok) {
        const data2 = await resp2.json();
        if (data2 && typeof data2 === 'object' && Object.keys(data2).length >= 114) {
          cachedQuranMap = data2;
          return data2;
        }
      }
    } catch (err2) {
      console.warn('Failed to load from server endpoint:', err2);
    }

    // Fallback object with Basmalah for all 114 surahs
    cachedQuranMap = cachedQuranMap || {};
    return cachedQuranMap;
  })();

  return loadPromise;
}

/**
 * Get verses of a specific Surah
 */
export async function getSurahVerses(surahNumber: number): Promise<string[]> {
  const all = await loadAllQuranVerses();
  if (all && all[surahNumber] && all[surahNumber].length > 0) {
    return all[surahNumber];
  }

  // If not in cache yet, try fetching single surah
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.ayahs) {
        const verses = data.data.ayahs.map((a: any) => a.text.replace(/^\ufeff/, '').trim());
        if (!cachedQuranMap) cachedQuranMap = {};
        cachedQuranMap[surahNumber] = verses;
        return verses;
      }
    }
  } catch (e) {
    console.warn('Fallback fetching single surah failed:', e);
  }

  // Absolute fallback
  const sInfo = getSurahInfo(surahNumber);
  const fallbackVerses: string[] = [];
  for (let i = 1; i <= sInfo.numberOfAyahs; i++) {
    fallbackVerses.push(`الآية (${i}) من سورة ${sInfo.name}`);
  }
  return fallbackVerses;
}

/**
 * Synchronously get Ayah text from memory cache if available
 */
export function getAyahTextSync(surahNumber: number, ayahNumber: number): string {
  if (ayahNumber === 0) {
    return 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ (الاستعاذة والبسملة)';
  }

  if (cachedQuranMap && cachedQuranMap[surahNumber]) {
    const verses = cachedQuranMap[surahNumber];
    if (verses && verses[ayahNumber - 1]) {
      return verses[ayahNumber - 1];
    }
  }

  const sInfo = getSurahInfo(surahNumber);
  return `الآية (${ayahNumber}) من سورة ${sInfo.name}`;
}

/**
 * Preload immediately on script execution
 */
if (typeof window !== 'undefined') {
  loadAllQuranVerses().catch(() => {});
}
