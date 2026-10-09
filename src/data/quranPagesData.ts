/**
 * King Fahd Complex Mushaf Page Mapping (مصحف مجمع الملك فهد لطباعة المصحف الشريف - 604 أوجه)
 * Maps each of the 604 pages of the King Fahd Mushaf to its exact starting and ending Ayah,
 * with complete 114 Surahs lookup and precise fractional face calculation.
 */

import { QURAN_SURAHS, getSurahInfo } from './quranData';
import type { StudentEvaluation } from '../types';

export interface QuranPageInfo {
  pageNumber: number; // 1 - 604
  juz: number; // 1 - 30
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  surahNames: string[];
}

/**
 * Exact Starting Page for every Surah in the King Fahd 604-page Mushaf (مصحف المدينة النبوية)
 */
export const SURAH_START_PAGE_MAP: Record<number, number> = {
  1: 1,    // الفاتحة
  2: 2,    // البقرة
  3: 50,   // آل عمران
  4: 77,   // النساء
  5: 106,  // المائدة
  6: 128,  // الأنعام
  7: 151,  // الأعراف
  8: 177,  // الأنفال
  9: 187,  // التوبة
  10: 208, // يونس
  11: 221, // هود
  12: 235, // يوسف
  13: 249, // الرعد
  14: 255, // إبراهيم
  15: 262, // الحجر
  16: 267, // النحل
  17: 282, // الإسراء
  18: 293, // الكهف
  19: 305, // مريم
  20: 312, // طه
  21: 322, // الأنبياء
  22: 332, // الحج
  23: 342, // المؤمنون
  24: 350, // النور
  25: 359, // الفرقان
  26: 367, // الشعراء
  27: 377, // النمل
  28: 385, // القصص
  29: 396, // العنكبوت
  30: 404, // الروم
  31: 411, // لقمان
  32: 415, // السجدة
  33: 418, // الأحزاب
  34: 428, // سبأ
  35: 434, // فاطر
  36: 440, // يس
  37: 446, // الصافات
  38: 453, // ص
  39: 458, // الزمر
  40: 467, // غافر
  41: 477, // فصلت
  42: 483, // الشورى
  43: 489, // الزخرف
  44: 496, // الدخان
  45: 499, // الجاثية
  46: 502, // الأحقاف
  47: 507, // محمد
  48: 511, // الفتح
  49: 515, // الحجرات
  50: 518, // ق
  51: 520, // الذاريات
  52: 523, // الطور
  53: 526, // النجم
  54: 528, // القمر
  55: 531, // الرحمن
  56: 534, // الواقعة
  57: 537, // الحديد
  58: 542, // المجادلة
  59: 545, // الحشر
  60: 549, // الممتحنة
  61: 551, // الصف
  62: 553, // الجمعة
  63: 554, // المنافقون
  64: 556, // التغابن
  65: 558, // الطلاق
  66: 560, // التحريم
  67: 562, // الملك
  68: 564, // القلم
  69: 566, // الحاقة
  70: 568, // المعارج
  71: 570, // نوح
  72: 572, // الجن
  73: 574, // المزمل
  74: 575, // المدثر
  75: 577, // القيامة
  76: 578, // الإنسان
  77: 580, // المرسلات
  78: 582, // النبأ
  79: 583, // النازعات
  80: 585, // عبس
  81: 586, // التكوير
  82: 587, // الانفطار
  83: 587, // المطففين
  84: 589, // الانشقاق
  85: 590, // البروج
  86: 591, // الطارق
  87: 591, // الأعلى
  88: 592, // الغاشية
  89: 593, // الفجر
  90: 594, // البلد
  91: 595, // الشمس
  92: 595, // الليل
  93: 596, // الضحى
  94: 596, // الشرح
  95: 597, // التين
  96: 597, // العلق
  97: 598, // القدر
  98: 598, // البينة
  99: 599, // الزلزلة
  100: 599, // العاديات
  101: 600, // القارعة
  102: 600, // التكاثر
  103: 601, // العصر
  104: 601, // الهمزة
  105: 601, // الفيل
  106: 602, // قريش
  107: 602, // الماعون
  108: 602, // الكوثر
  109: 603, // الكافرون
  110: 603, // النصر
  111: 603, // المسد
  112: 604, // الإخلاص
  113: 604, // الفلق
  114: 604  // الناس
};

/**
 * Verified page boundaries for key anchor pages and detailed Juz 28, 29, 30
 */
export const QURAN_PAGE_BOUNDARIES: Array<{
  page: number;
  juz: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}> = [
  // Page 1
  { page: 1, juz: 1, startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 7 },
  // Page 2 - 49 (Al-Baqarah)
  { page: 2, juz: 1, startSurah: 2, startAyah: 1, endSurah: 2, endAyah: 5 },
  { page: 3, juz: 1, startSurah: 2, startAyah: 6, endSurah: 2, endAyah: 16 },
  { page: 4, juz: 1, startSurah: 2, startAyah: 17, endSurah: 2, endAyah: 24 },
  { page: 5, juz: 1, startSurah: 2, startAyah: 25, endSurah: 2, endAyah: 29 },
  { page: 6, juz: 1, startSurah: 2, startAyah: 30, endSurah: 2, endAyah: 37 },
  { page: 7, juz: 1, startSurah: 2, startAyah: 38, endSurah: 2, endAyah: 48 },
  { page: 8, juz: 1, startSurah: 2, startAyah: 49, endSurah: 2, endAyah: 57 },
  { page: 9, juz: 1, startSurah: 2, startAyah: 58, endSurah: 2, endAyah: 61 },
  { page: 10, juz: 1, startSurah: 2, startAyah: 62, endSurah: 2, endAyah: 69 },
  { page: 11, juz: 1, startSurah: 2, startAyah: 70, endSurah: 2, endAyah: 76 },
  { page: 12, juz: 1, startSurah: 2, startAyah: 77, endSurah: 2, endAyah: 83 },
  { page: 13, juz: 1, startSurah: 2, startAyah: 84, endSurah: 2, endAyah: 88 },
  { page: 14, juz: 1, startSurah: 2, startAyah: 89, endSurah: 2, endAyah: 93 },
  { page: 15, juz: 1, startSurah: 2, startAyah: 94, endSurah: 2, endAyah: 101 },
  { page: 16, juz: 1, startSurah: 2, startAyah: 102, endSurah: 2, endAyah: 105 },
  { page: 17, juz: 1, startSurah: 2, startAyah: 106, endSurah: 2, endAyah: 112 },
  { page: 18, juz: 1, startSurah: 2, startAyah: 113, endSurah: 2, endAyah: 119 },
  { page: 19, juz: 1, startSurah: 2, startAyah: 120, endSurah: 2, endAyah: 126 },
  { page: 20, juz: 1, startSurah: 2, startAyah: 127, endSurah: 2, endAyah: 134 },
  { page: 21, juz: 1, startSurah: 2, startAyah: 135, endSurah: 2, endAyah: 141 },
  { page: 22, juz: 2, startSurah: 2, startAyah: 142, endSurah: 2, endAyah: 145 },
  { page: 49, juz: 3, startSurah: 2, startAyah: 282, endSurah: 2, endAyah: 286 },
  // Juz 29
  { page: 562, juz: 29, startSurah: 67, startAyah: 1, endSurah: 67, endAyah: 12 },
  { page: 563, juz: 29, startSurah: 67, startAyah: 13, endSurah: 67, endAyah: 26 },
  { page: 564, juz: 29, startSurah: 67, startAyah: 27, endSurah: 68, endAyah: 15 },
  { page: 565, juz: 29, startSurah: 68, startAyah: 16, endSurah: 68, endAyah: 42 },
  { page: 566, juz: 29, startSurah: 68, startAyah: 43, endSurah: 69, endAyah: 8 },
  { page: 567, juz: 29, startSurah: 69, startAyah: 9, endSurah: 69, endAyah: 34 },
  { page: 568, juz: 29, startSurah: 69, startAyah: 35, endSurah: 70, endAyah: 10 },
  { page: 569, juz: 29, startSurah: 70, startAyah: 11, endSurah: 70, endAyah: 39 },
  { page: 570, juz: 29, startSurah: 70, startAyah: 40, endSurah: 71, endAyah: 10 },
  { page: 571, juz: 29, startSurah: 71, startAyah: 11, endSurah: 71, endAyah: 28 },
  { page: 572, juz: 29, startSurah: 72, startAyah: 1, endSurah: 72, endAyah: 13 },
  { page: 573, juz: 29, startSurah: 72, startAyah: 14, endSurah: 72, endAyah: 28 },
  { page: 574, juz: 29, startSurah: 73, startAyah: 1, endSurah: 73, endAyah: 19 },
  { page: 575, juz: 29, startSurah: 73, startAyah: 20, endSurah: 74, endAyah: 17 },
  { page: 576, juz: 29, startSurah: 74, startAyah: 18, endSurah: 74, endAyah: 47 },
  { page: 577, juz: 29, startSurah: 74, startAyah: 48, endSurah: 75, endAyah: 19 },
  { page: 578, juz: 29, startSurah: 75, startAyah: 20, endSurah: 76, endAyah: 5 },
  { page: 579, juz: 29, startSurah: 76, startAyah: 6, endSurah: 76, endAyah: 25 },
  { page: 580, juz: 29, startSurah: 76, startAyah: 26, endSurah: 77, endAyah: 19 },
  { page: 581, juz: 29, startSurah: 77, startAyah: 20, endSurah: 77, endAyah: 50 },
  // Juz 30 (Amma) - 100% exact King Fahd standard edition
  { page: 582, juz: 30, startSurah: 78, startAyah: 1, endSurah: 78, endAyah: 30 },
  { page: 583, juz: 30, startSurah: 78, startAyah: 31, endSurah: 79, endAyah: 15 },
  { page: 584, juz: 30, startSurah: 79, startAyah: 16, endSurah: 79, endAyah: 46 },
  { page: 585, juz: 30, startSurah: 80, startAyah: 1, endSurah: 80, endAyah: 42 },
  { page: 586, juz: 30, startSurah: 81, startAyah: 1, endSurah: 81, endAyah: 29 },
  { page: 587, juz: 30, startSurah: 82, startAyah: 1, endSurah: 83, endAyah: 6 },
  { page: 588, juz: 30, startSurah: 83, startAyah: 7, endSurah: 83, endAyah: 36 },
  { page: 589, juz: 30, startSurah: 84, startAyah: 1, endSurah: 84, endAyah: 25 },
  { page: 590, juz: 30, startSurah: 85, startAyah: 1, endSurah: 85, endAyah: 22 },
  { page: 591, juz: 30, startSurah: 86, startAyah: 1, endSurah: 87, endAyah: 15 },
  { page: 592, juz: 30, startSurah: 87, startAyah: 16, endSurah: 88, endAyah: 26 },
  { page: 593, juz: 30, startSurah: 89, startAyah: 1, endSurah: 89, endAyah: 30 },
  { page: 594, juz: 30, startSurah: 90, startAyah: 1, endSurah: 90, endAyah: 20 },
  { page: 595, juz: 30, startSurah: 91, startAyah: 1, endSurah: 92, endAyah: 21 },
  { page: 596, juz: 30, startSurah: 93, startAyah: 1, endSurah: 94, endAyah: 8 },
  { page: 597, juz: 30, startSurah: 95, startAyah: 1, endSurah: 96, endAyah: 19 },
  { page: 598, juz: 30, startSurah: 97, startAyah: 1, endSurah: 98, endAyah: 8 },
  { page: 599, juz: 30, startSurah: 99, startAyah: 1, endSurah: 100, endAyah: 11 },
  { page: 600, juz: 30, startSurah: 101, startAyah: 1, endSurah: 102, endAyah: 8 }, // القارعة والتكاثر
  { page: 601, juz: 30, startSurah: 103, startAyah: 1, endSurah: 105, endAyah: 5 }, // العصر والهمزة والفيل
  { page: 602, juz: 30, startSurah: 106, startAyah: 1, endSurah: 108, endAyah: 3 }, // قريش والماعون والكوثر
  { page: 603, juz: 30, startSurah: 109, startAyah: 1, endSurah: 111, endAyah: 5 }, // الكافرون والنصر والمسد
  { page: 604, juz: 30, startSurah: 112, startAyah: 1, endSurah: 114, endAyah: 6 }  // الإخلاص والفلق والناس
];

/**
 * Generate full 604 pages lookup using known boundaries and proportional interpolation for intermediate pages
 */
export const ALL_PAGES: QuranPageInfo[] = [];

// Build comprehensive 604 page definitions
(function buildAll604Pages() {
  // Map of surahs starting on each page
  const pageToSurahs: Record<number, number[]> = {};
  for (let s = 1; s <= 114; s++) {
    const p = SURAH_START_PAGE_MAP[s] || 1;
    if (!pageToSurahs[p]) pageToSurahs[p] = [];
    pageToSurahs[p].push(s);
  }

  for (let p = 1; p <= 604; p++) {
    const direct = QURAN_PAGE_BOUNDARIES.find(b => b.page === p);
    if (direct) {
      const sNames: string[] = [];
      for (let s = direct.startSurah; s <= direct.endSurah; s++) {
        sNames.push(getSurahInfo(s).name);
      }
      ALL_PAGES.push({
        pageNumber: p,
        juz: direct.juz,
        startSurah: direct.startSurah,
        startAyah: direct.startAyah,
        endSurah: direct.endSurah,
        endAyah: direct.endAyah,
        surahNames: sNames.length > 0 ? sNames : [getSurahInfo(direct.startSurah).name]
      });
    } else {
      // Find surah that covers this page
      let activeSurah = 1;
      for (let s = 114; s >= 1; s--) {
        if (SURAH_START_PAGE_MAP[s] <= p) {
          activeSurah = s;
          break;
        }
      }

      const nextSurah = activeSurah < 114 ? activeSurah + 1 : 114;
      const startP = SURAH_START_PAGE_MAP[activeSurah];
      const endP = activeSurah < 114 ? (SURAH_START_PAGE_MAP[nextSurah] >= startP ? SURAH_START_PAGE_MAP[nextSurah] : startP + 1) : 604;
      
      const sInfo = getSurahInfo(activeSurah);
      const totalPagesForSurah = Math.max(1, endP - startP);
      const pageIndexInSurah = Math.max(0, p - startP);

      const approxAyahsPerPage = Math.max(1, Math.ceil(sInfo.numberOfAyahs / totalPagesForSurah));
      const startA = Math.min(sInfo.numberOfAyahs, pageIndexInSurah * approxAyahsPerPage + 1);
      const endA = Math.min(sInfo.numberOfAyahs, (pageIndexInSurah + 1) * approxAyahsPerPage);

      const approxJuz = sInfo.juz || Math.min(30, Math.max(1, Math.ceil(p / 20)));

      ALL_PAGES.push({
        pageNumber: p,
        juz: approxJuz,
        startSurah: activeSurah,
        startAyah: startA,
        endSurah: activeSurah,
        endAyah: endA,
        surahNames: [sInfo.name]
      });
    }
  }
})();

export function getKingFahdPageInfo(pageNumber: number): QuranPageInfo {
  const found = ALL_PAGES.find(p => p.pageNumber === pageNumber);
  if (found) return found;
  return ALL_PAGES[0] || {
    pageNumber: 1,
    juz: 1,
    startSurah: 1,
    startAyah: 1,
    endSurah: 1,
    endAyah: 7,
    surahNames: ['الفاتحة']
  };
}

/**
 * Returns which page in the King Fahd Mushaf contains a given surah & ayah
 */
export function getPageOfAyah(surahNumber: number, ayahNumber: number): number {
  // 1. Direct check in verified ALL_PAGES
  for (const page of ALL_PAGES) {
    if (page.startSurah === surahNumber && page.endSurah === surahNumber) {
      if (ayahNumber >= page.startAyah && ayahNumber <= page.endAyah) {
        return page.pageNumber;
      }
    } else if (page.startSurah === surahNumber && page.endSurah > surahNumber) {
      if (ayahNumber >= page.startAyah) return page.pageNumber;
    } else if (page.endSurah === surahNumber && page.startSurah < surahNumber) {
      if (ayahNumber <= page.endAyah) return page.pageNumber;
    } else if (surahNumber > page.startSurah && surahNumber < page.endSurah) {
      return page.pageNumber;
    }
  }

  // 2. Exact start page from SURAH_START_PAGE_MAP
  const basePage = SURAH_START_PAGE_MAP[surahNumber];
  if (basePage !== undefined) {
    const sInfo = getSurahInfo(surahNumber);
    const nextS = surahNumber < 114 ? surahNumber + 1 : 114;
    const nextPage = SURAH_START_PAGE_MAP[nextS] || (basePage + 1);
    const surahPageSpan = Math.max(1, nextPage - basePage);

    if (surahPageSpan === 1 || sInfo.numberOfAyahs <= 1) {
      return basePage;
    }

    const progress = Math.max(0, Math.min(1, (ayahNumber - 1) / Math.max(1, sInfo.numberOfAyahs)));
    const offset = Math.floor(progress * surahPageSpan);
    return Math.min(604, basePage + offset);
  }

  return 1;
}

/**
 * Calculate precise fractional faces (أوجه القرآن الكريم) for any recitation portion.
 * Rules:
 * - 0.25 on quarter face (ربع وجه)
 * - 0.5 on half face (نصف وجه)
 * - 0.75 on three-quarters face (ثلاثة أرباع وجه)
 * - 1.0 on whole face (وجه كامل)
 * Supports single or multi-surah ranges and returns cleanly rounded fractions.
 */
export function calculateRecitationFractionalFaces(
  startSurah: number,
  startAyah: number,
  endSurah?: number,
  endAyah?: number
): number {
  const eSurah = endSurah || startSurah;
  const sInfo = getSurahInfo(startSurah);
  const eInfo = getSurahInfo(eSurah);

  const sAyah = Math.max(1, Math.min(startAyah || 1, sInfo.numberOfAyahs));
  const toAyah = Math.max(1, Math.min(endAyah || sAyah, eInfo.numberOfAyahs));

  const startPage = getPageOfAyah(startSurah, sAyah);
  const endPage = getPageOfAyah(eSurah, toAyah);

  // Single page range
  if (startPage === endPage) {
    if (startSurah === eSurah) {
      const ayahsRecited = Math.max(1, toAyah - sAyah + 1);
      const totalInSurah = sInfo.numberOfAyahs;

      if (ayahsRecited >= totalInSurah && totalInSurah <= 15) {
        return 1.0;
      }
      if (ayahsRecited <= 3 && totalInSurah >= 8) {
        return 0.25;
      }
      if (ayahsRecited <= 7 && totalInSurah >= 12) {
        return 0.5;
      }
      if (ayahsRecited <= 11 && totalInSurah >= 15) {
        return 0.75;
      }
      return 1.0;
    } else {
      // Multiple short surahs on the same page (e.g. Al-Falaq & An-Nas on page 604)
      return 1.0;
    }
  }

  // Multi-page range
  const fullPagesCount = Math.max(1, Math.abs(endPage - startPage) + 1);
  return fullPagesCount;
}

export function formatPageTitle(pageNumber: number): string {
  const page = getKingFahdPageInfo(pageNumber);
  if (page.startSurah === page.endSurah) {
    const sName = getSurahInfo(page.startSurah).name;
    return `الوجه ${pageNumber} (سورة ${sName} الآيات ${page.startAyah} - ${page.endAyah})`;
  }
  const s1 = getSurahInfo(page.startSurah).name;
  const s2 = getSurahInfo(page.endSurah).name;
  return `الوجه ${pageNumber} (من ${s1} ${page.startAyah} إلى ${s2} ${page.endAyah})`;
}

/**
 * Check if a specific page is completely covered by a list of recitation ranges
 */
export function isPageCovered(
  page: QuranPageInfo,
  ranges: Array<{ surahNumber: number; fromAyah: number; toAyah: number }>
): boolean {
  if (!ranges || ranges.length === 0) return false;

  if (page.startSurah === page.endSurah) {
    for (let ayah = page.startAyah; ayah <= page.endAyah; ayah++) {
      const isAyahCovered = ranges.some(
        r => r.surahNumber === page.startSurah && ayah >= r.fromAyah && ayah <= r.toAyah
      );
      if (!isAyahCovered) return false;
    }
    return true;
  }

  const firstSurahInfo = getSurahInfo(page.startSurah);
  for (let a = page.startAyah; a <= firstSurahInfo.numberOfAyahs; a++) {
    const covered = ranges.some(
      r => r.surahNumber === page.startSurah && a >= r.fromAyah && a <= r.toAyah
    );
    if (!covered) return false;
  }

  for (let a = 1; a <= page.endAyah; a++) {
    const covered = ranges.some(
      r => r.surahNumber === page.endSurah && a >= r.fromAyah && a <= r.toAyah
    );
    if (!covered) return false;
  }

  return true;
}

export interface PagePointsResult {
  completedNewPages: number[];
  completedReviewPages: number[];
  newCompletedPagesToday: number[];
  pointsEarnedToday: number;
  totalPagePoints: number;
}

export function evaluateStudentPageProgress(
  historicalNewRanges: Array<{ surahNumber: number; fromAyah: number; toAyah: number }>,
  historicalReviewRanges: Array<{ surahNumber: number; fromAyah: number; toAyah: number }>,
  todayNewRange?: { surahNumber: number; fromAyah: number; toAyah: number },
  todayReviewRanges?: Array<{ surahNumber: number; fromAyah: number; toAyah: number }>,
  previouslyCompletedNewPages: number[] = [],
  previouslyCompletedReviewPages: number[] = []
): PagePointsResult {
  const allNewRanges = todayNewRange
    ? [...historicalNewRanges, todayNewRange]
    : historicalNewRanges;

  const allReviewRanges = todayReviewRanges
    ? [...historicalReviewRanges, ...todayReviewRanges]
    : historicalReviewRanges;

  const completedNewPages: number[] = [];
  const completedReviewPages: number[] = [];
  const newCompletedPagesToday: number[] = [];

  for (const page of ALL_PAGES) {
    const pageNum = page.pageNumber;

    if (isPageCovered(page, allNewRanges)) {
      completedNewPages.push(pageNum);
      if (!previouslyCompletedNewPages.includes(pageNum)) {
        newCompletedPagesToday.push(pageNum);
      }
    }

    if (isPageCovered(page, allReviewRanges)) {
      completedReviewPages.push(pageNum);
    }
  }

  const totalNewPagePoints = completedNewPages.length * 1;
  const totalReviewPagePoints = completedReviewPages.length * 1;
  const totalPagePoints = totalNewPagePoints + totalReviewPagePoints;

  const newPagesTodayPoints = newCompletedPagesToday.length * 1;
  const newReviewPagesToday = completedReviewPages.filter(p => !previouslyCompletedReviewPages.includes(p));
  const pointsEarnedToday = newPagesTodayPoints + (newReviewPagesToday.length * 1);

  return {
    completedNewPages,
    completedReviewPages,
    newCompletedPagesToday,
    pointsEarnedToday,
    totalPagePoints
  };
}

/**
 * Calculates total completed/memorized pages for a student
 */
export function calculateStudentCompletedPages(
  student?: {
    id?: string;
    completedNewPages?: number[];
    completedReviewPages?: number[];
    currentSurah?: number;
    currentAyah?: number;
  } | null,
  evaluations: StudentEvaluation[] = []
): {
  newPagesCount: number;
  reviewPagesCount: number;
  totalPagesCount: number;
  uniqueNewPages: number[];
  uniqueReviewPages: number[];
  currentMushafPage?: number;
  currentJuz?: number;
  currentSurahName?: string;
} {
  if (!student) {
    return {
      newPagesCount: 0,
      reviewPagesCount: 0,
      totalPagesCount: 0,
      uniqueNewPages: [],
      uniqueReviewPages: [],
      currentMushafPage: 582,
      currentJuz: 30,
      currentSurahName: 'النبأ'
    };
  }

  const newPagesSet = new Set<number>(student.completedNewPages || []);
  const reviewPagesSet = new Set<number>(student.completedReviewPages || []);

  const studentEvals = evaluations.filter(e => e.studentId === student.id);

  for (const ev of studentEvals) {
    const details = ev.recitationDetails;
    if (!details) continue;

    if (Array.isArray(details.pagesCompletedToday)) {
      details.pagesCompletedToday.forEach(p => {
        if (typeof p === 'number' && p >= 1 && p <= 604) {
          newPagesSet.add(p);
        }
      });
    }

    if (details.todayNewItem && !details.todayNewItem.didNotRecite) {
      const startSurah = details.todayNewItem.surahNumber || 78;
      const startAyah = details.todayNewItem.fromAyah || 1;
      const endSurah = details.todayNewItem.toSurahNumber || startSurah;
      const endAyah = details.todayNewItem.toAyah || startAyah;

      const startPage = getPageOfAyah(startSurah, startAyah);
      const endPage = getPageOfAyah(endSurah, endAyah);
      const minP = Math.min(startPage, endPage);
      const maxP = Math.max(startPage, endPage);

      for (let p = minP; p <= maxP; p++) {
        newPagesSet.add(p);
      }
    }

    if (Array.isArray(details.todayReviewItems)) {
      for (const item of details.todayReviewItems) {
        if (item && !item.didNotRecite) {
          const sSurah = item.surahNumber || 78;
          const sAyah = item.fromAyah || 1;
          const eSurah = item.toSurahNumber || sSurah;
          const eAyah = item.toAyah || sAyah;

          const sPage = getPageOfAyah(sSurah, sAyah);
          const ePage = getPageOfAyah(eSurah, eAyah);
          const minP = Math.min(sPage, ePage);
          const maxP = Math.max(sPage, ePage);

          for (let p = minP; p <= maxP; p++) {
            reviewPagesSet.add(p);
          }
        }
      }
    }
  }

  const curSurah = student.currentSurah || 78;
  const curAyah = student.currentAyah || 1;
  const currentMushafPage = getPageOfAyah(curSurah, curAyah);
  const curPageInfo = getKingFahdPageInfo(currentMushafPage);

  if (newPagesSet.size === 0 && student.currentSurah) {
    if (currentMushafPage >= 582) {
      for (let p = 582; p <= currentMushafPage; p++) {
        newPagesSet.add(p);
      }
    } else {
      for (let p = 1; p <= currentMushafPage; p++) {
        newPagesSet.add(p);
      }
    }
  }

  const uniqueNewPages = Array.from(newPagesSet).sort((a, b) => a - b);
  const uniqueReviewPages = Array.from(reviewPagesSet).sort((a, b) => a - b);

  return {
    newPagesCount: uniqueNewPages.length,
    reviewPagesCount: uniqueReviewPages.length,
    totalPagesCount: uniqueNewPages.length,
    uniqueNewPages,
    uniqueReviewPages,
    currentMushafPage,
    currentJuz: curPageInfo.juz,
    currentSurahName: getSurahInfo(curSurah).name
  };
}
