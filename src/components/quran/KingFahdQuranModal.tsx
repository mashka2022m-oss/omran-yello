import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Sparkles,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Layers,
  Award
} from 'lucide-react';
import { QURAN_SURAHS, getSurahInfo } from '../../data/quranData';
import {
  ALL_PAGES,
  getKingFahdPageInfo,
  getPageOfAyah,
  formatPageTitle,
  QuranPageInfo
} from '../../data/quranPagesData';
import { loadAllQuranVerses, getSurahVerses } from '../../lib/quranTextService';

export interface QuranHighlightItem {
  id: string;
  title: string; // e.g. "الحفظ الجديد" | "المراجعة الصغرى" | "مقرر الغد"
  surahNumber: number;
  fromAyah: number;
  toSurahNumber?: number;
  toAyah: number;
}

interface KingFahdQuranModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSurah?: number;
  initialAyah?: number;
  initialPage?: number;
  highlightItems?: QuranHighlightItem[];
  activeItemId?: string;
}

// Convert numbers to Arabic Eastern digits: 1 -> ١
export function toArabicNumerals(n: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return n.toString().replace(/\d/g, d => arabicDigits[parseInt(d, 10)]);
}

export const KingFahdQuranModal: React.FC<KingFahdQuranModalProps> = ({
  isOpen,
  onClose,
  initialSurah = 78,
  initialAyah = 1,
  initialPage,
  highlightItems = [],
  activeItemId
}) => {
  // Determine starting page
  const resolvedStartPage = useMemo(() => {
    if (initialPage && initialPage >= 1 && initialPage <= 604) {
      return initialPage;
    }
    return getPageOfAyah(initialSurah, initialAyah);
  }, [initialPage, initialSurah, initialAyah]);

  const [currentPage, setCurrentPage] = useState<number>(resolvedStartPage);
  const [fontSize, setFontSize] = useState<number>(24); // px for Quranic text
  const [selectedHighlightId, setSelectedHighlightId] = useState<string>(activeItemId || (highlightItems[0]?.id || ''));
  const [quranMap, setQuranMap] = useState<Record<number, string[]>>({});
  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(true);
  const [searchPageInput, setSearchPageInput] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const mushafScrollRef = useRef<HTMLDivElement | null>(null);

  // Active Highlight Item
  const activeHighlight = useMemo(() => {
    return highlightItems.find(h => h.id === selectedHighlightId) || highlightItems[0] || null;
  }, [highlightItems, selectedHighlightId]);

  // Ensure verses for current page are loaded
  const pageInfo: QuranPageInfo = useMemo(() => {
    return getKingFahdPageInfo(currentPage);
  }, [currentPage]);

  // Target Ayah and Surah to focus and scroll down to on this page
  const targetSurahNum = useMemo(() => {
    if (activeHighlight && getPageOfAyah(activeHighlight.surahNumber, activeHighlight.fromAyah) === currentPage) {
      return activeHighlight.surahNumber;
    }
    if (getPageOfAyah(initialSurah, initialAyah) === currentPage) {
      return initialSurah;
    }
    return pageInfo.startSurah;
  }, [activeHighlight, currentPage, initialSurah, initialAyah, pageInfo]);

  const targetAyahNum = useMemo(() => {
    if (activeHighlight && getPageOfAyah(activeHighlight.surahNumber, activeHighlight.fromAyah) === currentPage) {
      return activeHighlight.fromAyah;
    }
    if (getPageOfAyah(initialSurah, initialAyah) === currentPage) {
      return initialAyah;
    }
    return pageInfo.startAyah;
  }, [activeHighlight, currentPage, initialSurah, initialAyah, pageInfo]);

  // Sync starting page when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(resolvedStartPage);
      if (activeItemId) {
        setSelectedHighlightId(activeItemId);
      } else if (highlightItems[0]?.id) {
        setSelectedHighlightId(highlightItems[0].id);
      }
    }
  }, [isOpen, resolvedStartPage, activeItemId, highlightItems]);

  // Load complete authentic Uthmani Quran verses
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingVerses(true);

    loadAllQuranVerses()
      .then(data => {
        if (isMounted && data) {
          setQuranMap(data);
        }
      })
      .catch(err => {
        console.warn('Could not load bundled verses, will fetch on demand:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingVerses(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    for (let sNum = pageInfo.startSurah; sNum <= pageInfo.endSurah; sNum++) {
      if (!quranMap[sNum]) {
        getSurahVerses(sNum).then(v => {
          setQuranMap(prev => ({ ...prev, [sNum]: v }));
        });
      }
    }
  }, [isOpen, pageInfo, quranMap]);

  // Switch to another highlight item and jump straight to its start page
  const handleSelectHighlightItem = (item: QuranHighlightItem) => {
    setSelectedHighlightId(item.id);
    const targetPage = getPageOfAyah(item.surahNumber, item.fromAyah);
    setCurrentPage(targetPage);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < 604) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleJumpToSurah = (surahNum: number) => {
    const page = getPageOfAyah(surahNum, 1);
    setCurrentPage(page);
  };

  const handleJumpToPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(searchPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= 604) {
      setCurrentPage(p);
      setSearchPageInput('');
    }
  };

  // Keyboard navigation: Left/Right arrows
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // In RTL: Left arrow = Next page in reading sequence, Right arrow = Previous page
      if (e.key === 'ArrowLeft') {
        if (currentPage < 604) setCurrentPage(p => p + 1);
      } else if (e.key === 'ArrowRight') {
        if (currentPage > 1) setCurrentPage(p => p - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, onClose]);

  // Check if a specific ayah on this page is within the active highlighted portion
  const isAyahHighlighted = (surahNum: number, ayahNum: number): boolean => {
    if (!activeHighlight) return false;
    const startS = activeHighlight.surahNumber;
    const startA = activeHighlight.fromAyah;
    const endS = activeHighlight.toSurahNumber || startS;
    const endA = activeHighlight.toAyah;

    if (startS === endS) {
      return surahNum === startS && ayahNum >= startA && ayahNum <= endA;
    }

    if (surahNum === startS) {
      return ayahNum >= startA;
    }
    if (surahNum === endS) {
      return ayahNum <= endA;
    }
    if (surahNum > startS && surahNum < endS) {
      return true;
    }
    return false;
  };

  // Build the array of sections/surahs to render on this page
  const pageSections = useMemo(() => {
    const sections: Array<{
      surahNumber: number;
      surahInfo: ReturnType<typeof getSurahInfo>;
      startAyah: number;
      endAyah: number;
      isSurahBeginning: boolean;
      ayahs: Array<{ ayahNumber: number; text: string; isHighlighted: boolean }>;
    }> = [];

    const { startSurah, startAyah, endSurah, endAyah } = pageInfo;

    // Surahs present on this page
    for (let sNum = startSurah; sNum <= endSurah; sNum++) {
      const sInfo = getSurahInfo(sNum);
      const isStartSurah = sNum === startSurah;
      const isEndSurah = sNum === endSurah;

      const fromA = isStartSurah ? startAyah : 1;
      const toA = isEndSurah ? endAyah : sInfo.numberOfAyahs;
      const isBeginning = fromA === 1;

      const verses = quranMap[sNum] || [];
      const ayahList: Array<{ ayahNumber: number; text: string; isHighlighted: boolean }> = [];

      for (let a = fromA; a <= toA; a++) {
        let rawText = verses[a - 1] || '';
        if (!rawText) {
          rawText = `آية (${a}) من سورة ${sInfo.name}`;
        }

        // Clean any leading BOM or extra whitespace
        rawText = rawText.replace(/^\ufeff/, '').trim();

        // If ayah 1 of any surah other than Al-Fatiha and At-Tawbah, remove Basmalah prefix from text as we render it in a decorative header
        if (a === 1 && sNum !== 1 && sNum !== 9) {
          rawText = rawText.replace(/^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/, '').replace(/^بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ\s*/, '');
        }

        ayahList.push({
          ayahNumber: a,
          text: rawText,
          isHighlighted: isAyahHighlighted(sNum, a)
        });
      }

      sections.push({
        surahNumber: sNum,
        surahInfo: sInfo,
        startAyah: fromA,
        endAyah: toA,
        isSurahBeginning: isBeginning,
        ayahs: ayahList
      });
    }

    return sections;
  }, [pageInfo, quranMap, activeHighlight]);

  // Auto-scroll directly down to the targeted ayah when modal opens or page/item changes
  useEffect(() => {
    if (!isOpen) return;

    const performScroll = (behavior: ScrollBehavior = 'smooth') => {
      const container = mushafScrollRef.current;
      if (!container) return;
      const targetEl = (document.getElementById(`mushaf-ayah-${targetSurahNum}-${targetAyahNum}`) ||
                       container.querySelector('.ayah-primary-target') ||
                       container.querySelector('.ayah-highlighted')) as HTMLElement | null;
      if (targetEl) {
        const targetRect = targetEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
        const targetScrollTop = Math.max(0, relativeTop - (container.clientHeight / 2) + (targetRect.height / 2));
        container.scrollTo({
          top: targetScrollTop,
          behavior
        });
      }
    };

    // Immediate and follow-up scroll intervals to ensure instant jump on open then smooth lock
    const t0 = setTimeout(() => performScroll('auto'), 40);
    const t1 = setTimeout(() => performScroll('smooth'), 150);
    const t2 = setTimeout(() => performScroll('smooth'), 350);
    const t3 = setTimeout(() => performScroll('smooth'), 700);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, currentPage, targetSurahNum, targetAyahNum, pageSections, isLoadingVerses]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-[99999] flex flex-col bg-black/90 backdrop-blur-md overflow-hidden text-right select-none ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
      dir="rtl"
    >
      {/* Quran Modal Main Wrapper */}
      <div className="bg-[#022c22] border-2 border-[#fbbf24]/50 rounded-3xl w-full h-full max-w-5xl mx-auto flex flex-col shadow-2xl overflow-hidden relative">
        {/* ========================================================================= */}
        {/* 1. TOP CONTROL BAR & ITEM SWITCHER                                        */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-b border-[#065f46] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Right: Title & Mushaf King Fahd Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-heading text-white">
                  مصحف المدينة النبوية (مجمع الملك فهد)
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbbf24] text-[#064e3b]">
                  طبعة معتمدة
                </span>
              </div>
              <p className="text-[11px] text-[#86efac]/90">
                الجزء {pageInfo.juz} • {pageInfo.surahNames.join('، ')} • الوجه {currentPage} من 604
              </p>
            </div>
          </div>

          {/* Center: Highlight Items Switcher (New vs Reviews vs Tomorrow) */}
          {highlightItems.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#022c22] p-1 rounded-2xl border border-[#065f46] overflow-x-auto max-w-md">
              <span className="text-[10px] text-amber-300 font-bold px-1.5 whitespace-nowrap">
                مقرر الطالب:
              </span>
              {highlightItems.map(item => {
                const isSelected = item.id === selectedHighlightId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectHighlightItem(item)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#fbbf24] text-[#064e3b] shadow-sm font-black'
                        : 'text-[#86efac]/80 hover:text-white hover:bg-[#064e3b]/50'
                    }`}
                  >
                    <span>{item.title}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      (ص {getPageOfAyah(item.surahNumber, item.fromAyah)})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Left: Navigation and Tools (Zoom, Jump, Close) */}
          <div className="flex items-center gap-2">
            {/* Font Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-[#022c22] px-2 py-1 rounded-xl border border-[#065f46]">
              <button
                type="button"
                onClick={() => setFontSize(s => Math.min(38, s + 2))}
                className="p-1 rounded-lg text-[#86efac] hover:text-white hover:bg-[#064e3b] cursor-pointer"
                title="تكبير الخط"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-amber-300 px-1">{fontSize}</span>
              <button
                type="button"
                onClick={() => setFontSize(s => Math.max(18, s - 2))}
                className="p-1 rounded-lg text-[#86efac] hover:text-white hover:bg-[#064e3b] cursor-pointer"
                title="تصغير الخط"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#064e3b] text-[#86efac] hover:text-white hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer border border-[#065f46]"
              title="إغلاق المصحف"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SUB-BAR: QUICK JUMP TO SURAH / JUMP TO PAGE                            */}
        {/* ========================================================================= */}
        <div className="bg-[#022c22]/95 border-b border-[#065f46]/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Quick Surah Jump */}
          <div className="flex items-center gap-2">
            <span className="text-[#86efac] font-bold text-[11px]">انتقال لسورة:</span>
            <select
              value={pageInfo.startSurah}
              onChange={e => handleJumpToSurah(Number(e.target.value))}
              className="bg-[#064e3b] text-white border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-1 px-2.5 text-xs outline-none cursor-pointer font-bold"
            >
              {QURAN_SURAHS.map(s => (
                <option key={s.number} value={s.number} className="bg-[#022c22] text-white">
                  {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Page Jump Form */}
          <form onSubmit={handleJumpToPageSubmit} className="flex items-center gap-1.5">
            <span className="text-[#86efac] text-[11px]">رقم الوجه (1 - 604):</span>
            <input
              type="number"
              min={1}
              max={604}
              value={searchPageInput}
              onChange={e => setSearchPageInput(e.target.value)}
              placeholder={currentPage.toString()}
              className="w-14 bg-[#064e3b] text-[#fbbf24] text-center font-bold border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-0.5 px-1.5 text-xs outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-xl bg-[#fbbf24] text-[#064e3b] font-black text-xs cursor-pointer hover:bg-amber-400"
            >
              انتقال
            </button>
          </form>

          {/* Active Highlight Info Toast */}
          {activeHighlight && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>موضع التركيز: سورة {getSurahInfo(activeHighlight.surahNumber).name} (آية {activeHighlight.fromAyah} إلى {activeHighlight.toAyah})</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. MAIN MUSHAF PAGE CANVAS (KING FAHD GEOMETRIC FRAME)                    */}
        {/* ========================================================================= */}
        <div ref={mushafScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-gradient-to-b from-[#022c22] via-[#011e17] to-[#022c22] relative scroll-smooth">
          {/* Authentic Islamic Page Frame (الإطار الزخرفي للمصحف الشريف) */}
          <div className="w-full max-w-3xl bg-[#fffef5] text-[#1c1917] rounded-3xl p-6 sm:p-10 shadow-2xl border-4 border-[#064e3b] ring-4 ring-[#fbbf24]/50 relative transition-all">
            {/* Top Page Header (Juz, Surah, Page Number) */}
            <div className="flex items-center justify-between border-b-2 border-[#064e3b]/30 pb-2 mb-6 text-xs text-[#064e3b] font-bold font-heading">
              <div className="flex items-center gap-2">
                <span>الجُزْءُ {toArabicNumerals(pageInfo.juz)}</span>
              </div>
              <div className="text-center font-black text-sm text-[#064e3b]">
                سُورَةُ {pageSections.map(s => s.surahInfo.name).join(' وَ ')}
              </div>
              <div className="font-mono text-sm font-bold text-[#064e3b]">
                الوجه {toArabicNumerals(currentPage)}
              </div>
            </div>

            {/* Sections & Ayahs on this page */}
            <div className="space-y-6">
              {pageSections.map((sec, secIdx) => {
                return (
                  <div key={sec.surahNumber} className="space-y-4">
                    {/* Surah Header Banner if surah starts on this page */}
                    {sec.isSurahBeginning && (
                      <div className="my-4 text-center">
                        {/* Golden Calligraphic Surah Frame */}
                        <div className="inline-block w-full max-w-md mx-auto py-2.5 px-6 rounded-2xl bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] text-[#fbbf24] border-2 border-[#d97706] shadow-md">
                          <h4 className="font-quran text-lg sm:text-xl font-bold tracking-wide">
                            سُورَةُ {sec.surahInfo.name}
                          </h4>
                          <div className="flex items-center justify-center gap-4 text-[10px] text-emerald-200 mt-0.5">
                            <span>{sec.surahInfo.revelationType === 'Meccan' ? 'مَكِّيَّةٌ' : 'مَدَنِيَّةٌ'}</span>
                            <span>•</span>
                            <span>آيَاتُهَا {toArabicNumerals(sec.surahInfo.numberOfAyahs)}</span>
                          </div>
                        </div>

                        {/* Basmalah Banner (except At-Tawbah) */}
                        {sec.surahNumber !== 9 && (
                          <div className="text-center font-quran text-lg sm:text-2xl text-[#064e3b] pt-3 pb-1 tracking-wider font-bold">
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                          </div>
                        )}
                      </div>
                    )}

                    {/* Continuous Quran Text Stream for this page */}
                    <div
                      className="font-quran text-justify leading-[2.6] sm:leading-[2.8] text-[#1c1917] tracking-normal selection:bg-amber-300"
                      style={{ fontSize: `${fontSize}px` }}
                      dir="rtl"
                    >
                      {sec.ayahs.map(ayah => {
                        const isTargetAyah = sec.surahNumber === targetSurahNum && ayah.ayahNumber === targetAyahNum;
                        return (
                          <React.Fragment key={ayah.ayahNumber}>
                            <span
                              id={`mushaf-ayah-${sec.surahNumber}-${ayah.ayahNumber}`}
                              className={`transition-all rounded-lg px-2 py-1 inline duration-300 ${
                                isTargetAyah
                                  ? 'ayah-primary-target bg-[#fbbf24] text-[#064e3b] font-black shadow-[0_0_30px_rgba(251,191,36,0.9)] ring-4 ring-amber-500/90 scale-[1.03] animate-pulse z-10'
                                  : ayah.isHighlighted
                                  ? 'ayah-highlighted bg-[#fbbf24]/35 text-[#064e3b] font-bold shadow-[0_0_8px_rgba(251,191,36,0.3)] ring-1 ring-[#d97706]'
                                  : 'hover:bg-amber-100/60'
                              }`}
                              title={`سورة ${sec.surahInfo.name} - آية ${ayah.ayahNumber}`}
                            >
                              {ayah.text}
                            </span>
                            {/* Ornamental Ayah End Symbol with Arabic Eastern digits */}
                            <span className="inline-block mx-1 font-quran text-[#064e3b] font-bold text-[0.88em] select-none text-amber-700">
                              {' '}۝{toArabicNumerals(ayah.ayahNumber)}{' '}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Page Footer (Page number centered) */}
            <div className="mt-8 pt-3 border-t-2 border-[#064e3b]/30 text-center font-bold text-xs text-[#064e3b]">
              - {toArabicNumerals(currentPage)} -
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. BOTTOM NAVIGATION BAR (PREVIOUS & NEXT WITH KEYBOARD HINT)             */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-t border-[#065f46] px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          {/* Previous Page Button (Right side in RTL means backward in page number) */}
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#022c22] hover:bg-[#064e3b] disabled:opacity-30 disabled:cursor-not-allowed text-[#fbbf24] border border-[#065f46] font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-md active:scale-95"
          >
            <ChevronRight className="w-5 h-5 text-[#fbbf24]" />
            <span>الوجه السابق (ص {currentPage > 1 ? currentPage - 1 : 1})</span>
          </button>

          {/* Center Info */}
          <div className="hidden sm:flex flex-col items-center text-center">
            <span className="text-white font-bold text-xs font-heading">
              {formatPageTitle(currentPage)}
            </span>
            <span className="text-[10px] text-[#86efac]/70">
              يمكنك استخدام أسهم لوحة المفاتيح (← / →) للتنقل السريع
            </span>
          </div>

          {/* Next Page Button (Left side in RTL means forward in page number) */}
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= 604}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-[#064e3b] font-black text-xs sm:text-sm cursor-pointer transition-all shadow-lg active:scale-95"
          >
            <span>الوجه التالي (ص {currentPage < 604 ? currentPage + 1 : 604})</span>
            <ChevronLeft className="w-5 h-5 text-[#064e3b]" />
          </button>
        </div>
      </div>
    </div>
  );
};
