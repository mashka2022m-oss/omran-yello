import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Search,
  Users,
  UserCheck,
  BookOpen,
  Award,
  Trophy,
  ClipboardList,
  Sliders,
  Layers
} from 'lucide-react';

/* ========================================================================= */
/* 1. Global Top Loading Bar (شريط التحميل العلوي فائق الأناقة والنعومة)      */
/* Works like GitHub, YouTube, Linear, Vercel: non-intrusive, razor-thin,    */
/* luminous glowing tip, runs across the top of viewport during any fetch.   */
/* ========================================================================= */

interface TopProgressBarProps {
  isLoading: boolean;
  color?: string;
}

export const TopProgressBar: React.FC<TopProgressBarProps> = ({
  isLoading,
  color = '#fbbf24'
}) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;
    let watchdogTimer: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(20);
      timer1 = setTimeout(() => setProgress(55), 100);
      timer2 = setTimeout(() => setProgress(85), 250);
      timer3 = setTimeout(() => setProgress(94), 500);

      // Watchdog: Never let loading bar get stuck if background sync or transition is slow
      watchdogTimer = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
      }, 1400);
    } else if (visible) {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(hideTimer);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(watchdogTimer);
    };
  }, [isLoading, visible]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none overflow-hidden transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      role="progressbar"
      aria-label="جارٍ تحميل البيانات"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-[#fbbf24] to-amber-300 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(251,191,36,0.8)] relative"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px #fbbf24, 0 0 5px #34d399'
        }}
      >
        {/* Glowing Head Particle */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-200 blur-[2px] -mr-1" />
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 2. Live Sync Status & Refresh Button (مؤشر المزامنة الحية وزر التحديث)   */
/* ========================================================================= */

interface LiveSyncButtonProps {
  isSyncing: boolean;
  onRefresh: () => void | Promise<void>;
  lastSyncedText?: string;
  label?: string;
  compact?: boolean;
}

export const LiveSyncButton: React.FC<LiveSyncButtonProps> = ({
  isSyncing,
  onRefresh,
  lastSyncedText = 'مُحدّث سحابياً',
  label = 'تحديث فوري',
  compact = false
}) => {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isSyncing}
      className={`group flex items-center gap-2 rounded-xl transition-all cursor-pointer font-bold select-none ${
        compact
          ? 'px-2.5 py-1.5 text-[11px] bg-[#022c22]/90 hover:bg-[#064e3b] text-[#86efac] border border-[#065f46]'
          : 'px-3.5 py-2 text-xs bg-[#022c22]/90 hover:bg-[#064e3b] text-emerald-200 hover:text-white border border-[#065f46] shadow-sm'
      } ${isSyncing ? 'opacity-85 pointer-events-none' : 'active:scale-95'}`}
      title="مزامنة وتحديث البيانات فورياً مع قاعدة البيانات السحابية"
    >
      <RefreshCw
        className={`w-3.5 h-3.5 text-[#fbbf24] transition-transform duration-500 ${
          isSyncing ? 'animate-spin' : 'group-hover:rotate-180'
        }`}
      />
      <span className="whitespace-nowrap">
        {isSyncing ? 'جارٍ المزامنة...' : label}
      </span>
      {!compact && lastSyncedText && (
        <span className="hidden sm:inline-block text-[10px] text-emerald-400/70 border-r border-[#065f46] pr-2">
          {lastSyncedText}
        </span>
      )}
    </button>
  );
};

/* ========================================================================= */
/* 3. Domain-Specific Skeleton Loaders (هياكل تحميل مطابقة لتصميم كل قسم)   */
/* ========================================================================= */

// Attendance Tab Skeleton (مطابق لقسم الحضور والغياب مع خيارات الحالة الأربعة)
export const AttendanceSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Top Controls Bar */}
      <div className="bg-[#064e3b]/40 border border-[#065f46]/60 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="h-10 w-44 rounded-xl shimmer-box" />
          <div className="h-10 w-28 rounded-xl shimmer-box hidden sm:block" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="h-10 w-36 rounded-xl shimmer-box" />
          <div className="h-10 w-28 rounded-xl shimmer-box" />
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(idx => (
          <div
            key={idx}
            className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded shimmer-box" />
              <div className="w-8 h-8 rounded-xl shimmer-box" />
            </div>
            <div className="h-7 w-14 rounded-lg shimmer-box" />
            <div className="h-2 w-full rounded-full shimmer-box" />
          </div>
        ))}
      </div>

      {/* Student Attendance Roster Card */}
      <div className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 border-b border-[#065f46]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded shimmer-box" />
            <div className="h-5 w-40 rounded shimmer-box" />
          </div>
          <div className="h-8 w-28 rounded-xl shimmer-box" />
        </div>

        {/* Shimmering Student Attendance Rows */}
        <div className="divide-y divide-[#065f46]/40 p-2 sm:p-3 space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="p-3 sm:p-4 rounded-xl bg-[#022c22]/50 border border-[#065f46]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            >
              {/* Student Info */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl shimmer-box shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-36 sm:w-48 rounded shimmer-box" />
                  <div className="h-3 w-24 rounded shimmer-box" />
                </div>
              </div>

              {/* 4 Status Buttons (حاضر / غائب / متأخر / معتذر) */}
              <div className="grid grid-cols-4 gap-1.5 w-full md:w-96">
                <div className="h-9 rounded-xl shimmer-box" />
                <div className="h-9 rounded-xl shimmer-box" />
                <div className="h-9 rounded-xl shimmer-box" />
                <div className="h-9 rounded-xl shimmer-box" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Students Tab Skeleton (مطابق لقسم الطلاب وإدارة السجلات)
export const StudentsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Header Filters & Add Button */}
      <div className="bg-[#064e3b]/40 border border-[#065f46]/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="h-10 w-full sm:w-72 rounded-xl shimmer-box" />
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="h-10 w-28 rounded-xl shimmer-box" />
          <div className="h-10 w-36 rounded-xl shimmer-box" />
        </div>
      </div>

      {/* Grid of Student Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-4 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl shimmer-box shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded shimmer-box" />
                  <div className="h-3 w-20 rounded shimmer-box" />
                </div>
              </div>
              <div className="h-6 w-16 rounded-full shimmer-box" />
            </div>

            {/* Surah Progress Bar */}
            <div className="space-y-1.5 bg-[#022c22]/50 p-2.5 rounded-xl border border-[#065f46]/30">
              <div className="flex justify-between">
                <div className="h-3 w-16 rounded shimmer-box" />
                <div className="h-3 w-12 rounded shimmer-box" />
              </div>
              <div className="h-2 w-full rounded-full shimmer-box" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-[#065f46]/40">
              <div className="h-8 w-20 rounded-xl shimmer-box" />
              <div className="flex gap-1.5">
                <div className="w-8 h-8 rounded-xl shimmer-box" />
                <div className="w-8 h-8 rounded-xl shimmer-box" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Home Tab Skeleton (مطابق للصفحة الرئيسية والإحصائيات)
export const HomeSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* 4 Large Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(idx => (
          <div
            key={idx}
            className="bg-[#064e3b]/40 border border-[#065f46]/60 rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded shimmer-box" />
              <div className="w-9 h-9 rounded-xl shimmer-box" />
            </div>
            <div className="h-8 w-16 rounded-lg shimmer-box" />
            <div className="h-3 w-28 rounded shimmer-box" />
          </div>
        ))}
      </div>

      {/* Quick Action Grid */}
      <div className="bg-[#064e3b]/30 border border-[#065f46]/50 rounded-2xl p-5 space-y-3">
        <div className="h-5 w-36 rounded shimmer-box" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 rounded-2xl shimmer-box" />
          ))}
        </div>
      </div>

      {/* Split Dual Card Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map(panel => (
          <div
            key={panel}
            className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-5 space-y-3"
          >
            <div className="flex justify-between items-center pb-2 border-b border-[#065f46]/50">
              <div className="h-5 w-32 rounded shimmer-box" />
              <div className="h-4 w-16 rounded shimmer-box" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map(row => (
                <div key={row} className="h-12 rounded-xl shimmer-box" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Evaluation Tab Skeleton (مطابق لتقييم التسميع والمقاييس)
export const EvaluationSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Student Selector Card */}
      <div className="bg-[#064e3b]/40 border border-[#065f46]/60 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl shimmer-box" />
          <div className="space-y-2">
            <div className="h-5 w-44 rounded shimmer-box" />
            <div className="h-3 w-28 rounded shimmer-box" />
          </div>
        </div>
        <div className="h-10 w-full md:w-56 rounded-xl shimmer-box" />
      </div>

      {/* Surah & Verses Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-5 space-y-3">
          <div className="h-4 w-28 rounded shimmer-box" />
          <div className="h-11 rounded-xl shimmer-box" />
          <div className="h-11 rounded-xl shimmer-box" />
        </div>
        <div className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-5 space-y-3">
          <div className="h-4 w-28 rounded shimmer-box" />
          <div className="h-11 rounded-xl shimmer-box" />
          <div className="h-11 rounded-xl shimmer-box" />
        </div>
      </div>

      {/* Rubric Criteria Sliders */}
      <div className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-5 space-y-4">
        <div className="h-5 w-36 rounded shimmer-box" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-3.5 rounded-xl bg-[#022c22]/50 border border-[#065f46]/40 space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-20 rounded shimmer-box" />
                <div className="h-3 w-8 rounded shimmer-box" />
              </div>
              <div className="h-3 w-full rounded-full shimmer-box" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Generic Adaptive Tab Skeleton (لأي قسم آخر مثل الشهادات، لوحة الشرف، المخالفات، الواتساب، إلخ)
export const GenericTabSkeleton: React.FC<{ title?: string }> = ({
  title = 'جَارٍ تَحْدِيثُ البَيَانَاتِ سَحَابِيّاً...'
}) => {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Header bar */}
      <div className="bg-[#064e3b]/40 border border-[#065f46]/60 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl shimmer-box" />
          <div className="h-5 w-40 rounded shimmer-box" />
        </div>
        <div className="h-9 w-28 rounded-xl shimmer-box" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-4 space-y-2">
            <div className="h-4 w-24 rounded shimmer-box" />
            <div className="h-7 w-16 rounded-lg shimmer-box" />
          </div>
        ))}
      </div>

      {/* Content Feed */}
      <div className="bg-[#064e3b]/35 border border-[#065f46]/50 rounded-2xl p-4 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-xl shimmer-box" />
        ))}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 4. Tab Skeleton Router / Renderer                                         */
/* ========================================================================= */

interface TabSkeletonProps {
  activeTab: string;
}

export const TabSkeleton: React.FC<TabSkeletonProps> = ({ activeTab }) => {
  switch (activeTab) {
    case 'attendance':
      return <AttendanceSkeleton />;
    case 'students':
      return <StudentsSkeleton />;
    case 'home':
      return <HomeSkeleton />;
    case 'evaluation':
      return <EvaluationSkeleton />;
    case 'teacher_attendance':
      return <AttendanceSkeleton />;
    case 'exams':
    case 'certificates':
    case 'leaderboard':
    case 'behavior':
    case 'parents':
    case 'reports':
    case 'accounts':
    case 'backup':
    default:
      return <GenericTabSkeleton />;
  }
};

/* ========================================================================= */
/* 5. Minimal Backward-Compatible CloudLoadingScreen export                 */
/* ========================================================================= */

export const CloudLoadingScreen: React.FC<{
  isLoading?: boolean;
  onRetry?: () => void;
  onForceEnter?: () => void;
}> = ({ isLoading = true, onForceEnter }) => {
  // If invoked anywhere as fallback, simply trigger force enter or render non-blocking top bar
  useEffect(() => {
    if (onForceEnter) {
      const t = setTimeout(onForceEnter, 100);
      return () => clearTimeout(t);
    }
  }, [onForceEnter]);

  return <TopProgressBar isLoading={isLoading} />;
};

export const QuranInlineLoader: React.FC<{ message?: string }> = ({
  message = 'جَارٍ تَحْدِيثُ البَيَانَاتِ سَحَابِيّاً...'
}) => {
  return (
    <div className="flex items-center justify-center gap-3 py-6 px-4 text-center select-none" dir="rtl">
      <RefreshCw className="w-4 h-4 text-[#fbbf24] animate-spin" />
      <span className="text-xs font-bold text-amber-300 tracking-wide">{message}</span>
    </div>
  );
};
