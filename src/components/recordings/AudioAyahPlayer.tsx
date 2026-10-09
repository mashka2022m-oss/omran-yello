import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Sparkles,
  Headphones,
  Check,
  Flame,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getAyahAudioUrl, FAMOUS_RECITERS, getSurahInfo } from '../../data/quranData';
import { loadAllQuranVerses, getAyahTextSync } from '../../lib/quranTextService';

interface AudioAyahPlayerProps {
  surahNumber: number;
  surahName?: string;
  fromAyah: number;
  toAyah: number;
  reciterName?: string;
  targetRepetitions?: number;
  initialCompletedRepetitions?: number;
  rewardPoints?: number;
  alreadyAwardedToday?: boolean;
  onRepetitionCompleted?: (newCompletedCount: number, isFullyCompleted: boolean) => Promise<void>;
}

export const AudioAyahPlayer: React.FC<AudioAyahPlayerProps> = ({
  surahNumber,
  surahName,
  fromAyah,
  toAyah,
  reciterName,
  targetRepetitions = 3,
  initialCompletedRepetitions = 0,
  rewardPoints = 5,
  alreadyAwardedToday = false,
  onRepetitionCompleted
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentAyah, setCurrentAyah] = useState<number>(fromAyah);
  const [completedReps, setCompletedReps] = useState<number>(initialCompletedRepetitions);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const [quranMapReady, setQuranMapReady] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentAyahRef = useRef<number>(fromAyah);
  const completedRepsRef = useRef<number>(initialCompletedRepetitions);

  // Sync refs
  useEffect(() => {
    currentAyahRef.current = currentAyah;
  }, [currentAyah]);

  useEffect(() => {
    completedRepsRef.current = completedReps;
  }, [completedReps]);

  useEffect(() => {
    setCompletedReps(initialCompletedRepetitions);
  }, [initialCompletedRepetitions]);

  // Pre-load Quran verses cache
  useEffect(() => {
    loadAllQuranVerses()
      .then(() => setQuranMapReady(true))
      .catch(() => setQuranMapReady(true));
  }, []);

  // Determine reciter folder
  const reciterObj = FAMOUS_RECITERS.find(
    r => r.name === reciterName || r.id === reciterName || reciterName?.includes(r.id)
  ) || FAMOUS_RECITERS[0];
  const reciterFolder = reciterObj.everyAyahFolder || 'Minshawy_Teacher_128kbps';

  // Surah info
  const sInfo = getSurahInfo(surahNumber);
  const safeSurahName = surahName || sInfo.name;
  const safeFromAyah = Math.max(1, Math.min(fromAyah, sInfo.numberOfAyahs));
  const safeToAyah = Math.max(safeFromAyah, Math.min(toAyah, sInfo.numberOfAyahs));
  const totalVersesInPassage = safeToAyah - safeFromAyah + 1;

  // Cleanup audio on unmount or target change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      isPlayingRef.current = false;
    };
  }, [surahNumber, safeFromAyah, safeToAyah, reciterFolder]);

  // Play next ayah in passage or loop repetition
  const playAyahAudio = useCallback((ayahNum: number) => {
    if (!isPlayingRef.current) return;
    setAudioError(null);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = getAyahAudioUrl(surahNumber, ayahNum, reciterFolder);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      if (!isPlayingRef.current) return;

      if (ayahNum < safeToAyah) {
        // Advance to next verse in the assigned passage
        const nextAyah = ayahNum + 1;
        setCurrentAyah(nextAyah);
        setTimeout(() => {
          if (isPlayingRef.current) {
            playAyahAudio(nextAyah);
          }
        }, 350);
      } else {
        // Reached end of assigned passage: increment repetition!
        const nextReps = completedRepsRef.current + 1;
        const isDone = nextReps >= targetRepetitions;
        setCompletedReps(nextReps);

        if (onRepetitionCompleted) {
          onRepetitionCompleted(nextReps, isDone).catch(() => {});
        }

        if (isDone) {
          // Completed all required repetitions!
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentAyah(safeFromAyah);

          try {
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 }
            });
          } catch (e) {}

          setCelebrationMsg(
            `🎉 هنيئاً لك! أتممت الاستماع للمقطع المقرر كاملاً (${targetRepetitions} من ${targetRepetitions}) وحصلت على +${rewardPoints} نقاط تميز في رصيدك!`
          );
        } else {
          // Automatic loop to next repetition
          setCelebrationMsg(`✨ أتممت التكرار رقم (${nextReps}) بنجاح! جاري بدء التكرار التالي (${nextReps + 1} من ${targetRepetitions})...`);
          setTimeout(() => {
            setCelebrationMsg(null);
          }, 3500);

          setCurrentAyah(safeFromAyah);
          setTimeout(() => {
            if (isPlayingRef.current) {
              playAyahAudio(safeFromAyah);
            }
          }, 1200);
        }
      }
    };

    audio.onerror = () => {
      console.warn(`Audio loading error for Surah ${surahNumber} Ayah ${ayahNum}`);
      setAudioError('جاري إعادة محاولة تشغيل التلاوة...');
      // Soft retry
      setTimeout(() => {
        if (isPlayingRef.current) {
          playAyahAudio(ayahNum);
        }
      }, 1500);
    };

    audio.play().catch(e => {
      console.warn('Audio play exception:', e);
      // If user blocked autoplay or tab blurred, pause
      setIsPlaying(false);
      isPlayingRef.current = false;
    });
  }, [surahNumber, safeFromAyah, safeToAyah, reciterFolder, targetRepetitions, rewardPoints, onRepetitionCompleted]);

  // Handle Play / Pause toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      // Pause
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // Start or Resume
      isPlayingRef.current = true;
      setIsPlaying(true);
      setCelebrationMsg(null);

      // Reset to beginning if was finished
      const startAyah = currentAyahRef.current >= safeFromAyah && currentAyahRef.current <= safeToAyah
        ? currentAyahRef.current
        : safeFromAyah;
      setCurrentAyah(startAyah);
      playAyahAudio(startAyah);
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentAyah(safeFromAyah);
  };

  // Get current verse text
  const currentAyahText = getAyahTextSync(surahNumber, currentAyah) || `سورة ${safeSurahName} - الآية (${currentAyah})`;
  const isAllRepetitionsCompleted = completedReps >= targetRepetitions;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#064e3b] border-2 border-[#fbbf24]/50 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-6">
      {/* Background Decorative Glow */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#fbbf24]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header: Surah & Assignment details (Locked start/end) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-800/80 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#022c22] border-2 border-[#fbbf24]/60 text-[#fbbf24] flex items-center justify-center shadow-lg shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                سورة {safeSurahName}
              </h3>
              <span className="text-xs px-3 py-1 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/40">
                الآيات ({safeFromAyah} إلى {safeToAyah})
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5 flex items-center gap-1.5">
              <span>بصوت {reciterObj.name}</span>
            </p>
          </div>
        </div>

        {/* Repetition Status Badge */}
        <div className="flex items-center gap-3 bg-[#022c22] p-2.5 px-4 rounded-2xl border border-emerald-700/60 shadow-md">
          <div className="text-right">
            <span className="text-[10px] text-emerald-300 block font-medium">مرات التكرار المكتملة</span>
            <span className="text-base sm:text-lg font-black font-mono text-[#fbbf24]">
              {completedReps} من {targetRepetitions}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
            {isAllRepetitionsCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-[#fbbf24]" />
            ) : (
              <RotateCcw className="w-4 h-4 text-emerald-300" />
            )}
          </div>
        </div>
      </div>

      {/* Repetition Visual Stepper */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-xs font-bold text-emerald-200">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>الهدف اليومي للاستماع: {targetRepetitions} مرات تكرار متقنة</span>
          </span>
          <span className="font-mono text-[#fbbf24]">{Math.min(100, Math.round((completedReps / targetRepetitions) * 100))}%</span>
        </div>
        <div className="h-3 w-full bg-[#022c22] rounded-full overflow-hidden border border-emerald-800 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAllRepetitionsCompleted
                ? 'bg-gradient-to-r from-emerald-500 via-amber-300 to-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                : 'bg-gradient-to-r from-emerald-600 via-amber-400 to-[#fbbf24]'
            }`}
            style={{ width: `${Math.min(100, (completedReps / targetRepetitions) * 100)}%` }}
          />
        </div>
      </div>

      {/* Celebration Notification */}
      {celebrationMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/30 to-amber-500/20 border-2 border-[#fbbf24] text-[#fbbf24] text-xs sm:text-sm font-black text-center shadow-xl relative z-10"
        >
          {celebrationMsg}
        </motion.div>
      )}

      {audioError && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs text-center">
          {audioError}
        </div>
      )}

      {/* DYNAMIC AYAH CARD (الآية التي تقرأ تظهر وبعدها تختفي بشكل جميل وتظهر الآية التالية) */}
      <div className="min-h-[190px] rounded-3xl bg-[#022c22]/90 border border-emerald-700/80 p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-inner relative overflow-hidden">
        {/* Ayah Badge */}
        <div className="flex items-center justify-between w-full pb-3 border-b border-emerald-800/60 text-xs">
          <span className="text-emerald-300 font-bold">
            سورة {safeSurahName}
          </span>
          <span className="px-3 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-black text-xs border border-[#fbbf24]/40 font-mono">
            الآية رقم {currentAyah} من {sInfo.numberOfAyahs}
          </span>
          <span className="text-[11px] text-emerald-400/80 font-mono">
            (المقطع: {currentAyah - safeFromAyah + 1} من {totalVersesInPassage})
          </span>
        </div>

        {/* Animated Ayah Text */}
        <div className="py-6 w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`ayah_${surahNumber}_${currentAyah}`}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl text-center space-y-3"
            >
              <p
                className="text-xl sm:text-2xl md:text-3xl font-serif leading-loose text-amber-100 font-bold selection:bg-[#fbbf24] selection:text-[#064e3b]"
                dir="rtl"
              >
                {currentAyahText}
                <span className="text-[#fbbf24] font-serif font-black mr-2 inline-block">
                  ﴿{currentAyah}﴾
                </span>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Audio Sound Wave Pulse */}
        <div className="flex items-center gap-1.5 h-6">
          {isPlaying ? (
            Array.from({ length: 9 }).map((_, i) => (
              <motion.span
                key={i}
                animate={{
                  height: [6, 18, 10, 24, 8][i % 5]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.6 + (i * 0.1),
                  ease: 'easeInOut'
                }}
                className="w-1 rounded-full bg-[#fbbf24]"
              />
            ))
          ) : (
            <span className="text-[11px] text-emerald-400/60 font-medium">
              اضغط على زر التشغيل للبدء بالاستماع
            </span>
          )}
        </div>
      </div>

      {/* Controls Bar: Big Play/Pause Button with Platform Theme */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="p-3.5 rounded-2xl bg-[#022c22] hover:bg-emerald-950 border border-emerald-700 text-emerald-300 hover:text-white transition-all cursor-pointer shadow-md"
          title="إعادة التكرار من بداية المقطع"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleTogglePlay}
          className={`px-8 py-4 rounded-3xl font-black text-sm sm:text-base flex items-center gap-3 transition-all cursor-pointer shadow-2xl ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-[#064e3b] shadow-amber-500/30'
              : 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:brightness-110 text-[#064e3b] shadow-[0_0_30px_rgba(251,191,36,0.4)] scale-105'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-6 h-6 fill-current" />
              <span>إيقاف مؤقت</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              <span>{isAllRepetitionsCompleted ? 'إعادة الاستماع للمقطع' : 'بدء الاستماع للمقطع المقرر'}</span>
            </>
          )}
        </button>
      </div>

      {/* Footer Info Notice */}
      <div className="text-center pt-2 border-t border-emerald-800/60 text-[11px] text-emerald-300/80">
        <span>
          نظام الاستماع الذكي: يقوم النظام تلقائياً برصد كل مرة استماع مكتملة للمقطع دون حاجة للضغط اليدوي، وعند استيفاء الهدف يُمنح الطالب نقاط التميز تلقائياً.
        </span>
      </div>
    </div>
  );
};
