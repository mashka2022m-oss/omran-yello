import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Medal,
  Award,
  Search,
  BookOpen,
  FileText,
  Headphones,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  TrendingUp,
  Flame,
  Calendar,
  Layers,
  ChevronLeft,
  Plus,
  Minus,
  Check
} from 'lucide-react';
import {
  Student,
  Halaqah,
  StudentEvaluation,
  ExamSubmission,
  StudentListeningLog,
  LeaderboardSettings
} from '../../types';

interface LeaderboardTabProps {
  students: Student[];
  halaqahs: Halaqah[];
  attendance?: any[];
  evaluations: StudentEvaluation[];
  submissions: ExamSubmission[];
  listeningLogs?: StudentListeningLog[];
  leaderboardSettings?: LeaderboardSettings;
  isSupervisor?: boolean;
  isDeveloper?: boolean;
  activeHalaqahId?: string;
  currentUserName?: string;
  onSaveLeaderboardSettings?: (settings: LeaderboardSettings) => Promise<void>;
  onAwardBonusPoints?: (studentId: string, points: number, reason: string) => Promise<void>;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  students = [],
  halaqahs = [],
  attendance = [],
  evaluations = [],
  submissions = [],
  listeningLogs = [],
  leaderboardSettings = {
    scope: 'all_unified',
    includeExamPoints: true,
    includeEvaluationScores: true,
    updatedAt: new Date().toISOString()
  },
  isSupervisor = false,
  isDeveloper = false,
  activeHalaqahId = 'all',
  currentUserName,
  onSaveLeaderboardSettings,
  onAwardBonusPoints
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>(
    activeHalaqahId !== 'all' ? activeHalaqahId : 'all'
  );
  const [selectedStudentForBreakdown, setSelectedStudentForBreakdown] = useState<Student | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<'all_unified' | 'per_halaqah'>(
    leaderboardSettings?.scope === 'per_halaqah' ? 'per_halaqah' : 'all_unified'
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Bonus Points Award / Deduction Modal state
  const [awardModalStudent, setAwardModalStudent] = useState<Student | null>(null);
  const [pointsActionType, setPointsActionType] = useState<'award' | 'deduct'>('award');
  const [bonusPointsAmount, setBonusPointsAmount] = useState<number>(10);
  const [bonusPointsReason, setBonusPointsReason] = useState<string>('تميز وانضباط قرآني');
  const [isSubmittingBonus, setIsSubmittingBonus] = useState<boolean>(false);
  const [bonusSuccessMsg, setBonusSuccessMsg] = useState<string | null>(null);

  const handleOpenPointsModal = (student: Student, action: 'award' | 'deduct' = 'award') => {
    const liveStudent = students.find(s => s.id === student.id) || student;
    const rankItem = studentRankList.find(r => r.student.id === liveStudent.id);
    const effectivePoints = typeof liveStudent.points === 'number'
      ? liveStudent.points
      : (rankItem?.totalPoints || 0);

    const refreshedStudent: Student = {
      ...liveStudent,
      points: effectivePoints
    };

    setAwardModalStudent(refreshedStudent);
    setPointsActionType(action);
    setBonusPointsAmount(action === 'award' ? 10 : 5);
    setBonusPointsReason(action === 'award' ? 'انضباط وتميز قرآني' : 'تقصير متكرر في الحفظ والتسميع');
    setBonusSuccessMsg(null);
  };

  const handleConfirmAwardBonus = async () => {
    if (!awardModalStudent || !onAwardBonusPoints) return;
    if (bonusPointsAmount <= 0) return;
    setIsSubmittingBonus(true);
    setBonusSuccessMsg(null);
    try {
      const delta = pointsActionType === 'award' ? bonusPointsAmount : -bonusPointsAmount;
      await onAwardBonusPoints(awardModalStudent.id, delta, bonusPointsReason);
      if (pointsActionType === 'award') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setBonusSuccessMsg(`تمت إضافة (+${bonusPointsAmount}) نقطة بنجاح إلى رصيد الطالب ${awardModalStudent.name}!`);
      } else {
        setBonusSuccessMsg(`تم خصم (-${bonusPointsAmount}) نقطة بنجاح من رصيد الطالب ${awardModalStudent.name}!`);
      }
      setTimeout(() => {
        setAwardModalStudent(null);
        setBonusSuccessMsg(null);
        setIsSubmittingBonus(false);
      }, 1600);
    } catch (e: any) {
      console.error(e);
      setIsSubmittingBonus(false);
    }
  };

  // Filter students by selected halaqah (if not 'all')
  const filteredPool = useMemo(() => {
    let pool = students;
    if (selectedHalaqahFilter !== 'all') {
      pool = pool.filter(s => s.halaqahId === selectedHalaqahFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      pool = pool.filter(s => s.name.toLowerCase().includes(q));
    }
    return pool;
  }, [students, selectedHalaqahFilter, searchQuery]);

  // Compute point breakdown for each student
  const studentRankList = useMemo(() => {
    return filteredPool.map(st => {
      // 1. Exam points
      const stSubmissions = submissions.filter(sub => sub.studentId === st.id);
      const examPoints = stSubmissions.reduce(
        (sum, s) => sum + (s.pointsGrantedForLeaderboard || 0),
        0
      );
      const bestPercentage = stSubmissions.reduce(
        (max, s) => Math.max(max, s.percentage || 0),
        0
      );

      // 2. Evaluation / criteria & recitation points
      const stEvaluations = evaluations.filter(ev => ev.studentId === st.id);
      const evalPoints = stEvaluations.reduce((sum, ev) => {
        const criteriaPts = Number(ev.recitationDetails?.criteriaPointsEarnedToday) || 0;
        const pagePts = Number(ev.recitationDetails?.pagesPointsEarnedToday) || 0;
        const attPts = Number(ev.recitationDetails?.attendancePointsEarnedToday) || 0;
        const pts = ev.recitationDetails?.pointsEarnedToday;
        const recitationOnly = criteriaPts + pagePts;
        const dailyTotal = recitationOnly > 0 
          ? recitationOnly 
          : (pts !== undefined && pts !== null ? Math.max(0, pts - attPts) : 0);
        return sum + dailyTotal;
      }, 0);

      // Fallback: If student has criteriaPoints stored on their profile
      const storedRecitationPoints = (Number(st.criteriaPoints) || 0) + (Number(st.totalPagePoints) || 0);
      const finalEvalPoints = Math.max(evalPoints, storedRecitationPoints);

      // 3. Listening points
      const stLogs = listeningLogs.filter(l => l.studentId === st.id && l.isFullyCompleted);
      const logsListeningPoints = stLogs.length * 5;
      const finalListeningPoints = Math.max(logsListeningPoints, st.listeningPoints || 0);

      // 4. Attendance & Absence points (+1 for present, -1 for absent)
      const stAttRecords = attendance.filter((a: any) => a.studentId === st.id);
      const presentCount = stAttRecords.filter((a: any) => a.status === 'حاضر').length;
      const absentCount = stAttRecords.filter((a: any) => a.status === 'غائب').length;
      const attendancePoints = (presentCount * 1) - (absentCount * 1);

      // 5. Total points: master student points balance
      const totalPagePoints = Number(st.totalPagePoints) || 0;
      const computedTotal = examPoints + finalEvalPoints + finalListeningPoints + attendancePoints;
      const totalPoints = typeof st.points === 'number' && st.points > 0
        ? st.points
        : Math.max(0, computedTotal + (Number(st.bonusPoints) || 0));

      const halaqahName =
        st.halaqahName || halaqahs.find(h => h.id === st.halaqahId)?.name || 'الحلقة القرآنية';

      return {
        student: st,
        totalPoints,
        examPoints,
        evalPoints: finalEvalPoints,
        listeningPoints: finalListeningPoints,
        pagePoints: totalPagePoints,
        attendancePoints,
        presentDays: presentCount,
        absentDays: absentCount,
        completedExams: stSubmissions.length,
        completedEvaluations: stEvaluations.length,
        completedListenings: stLogs.length,
        bestPercentage,
        halaqahName,
        stSubmissions,
        stEvaluations,
        stLogs
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.bestPercentage - a.bestPercentage);
  }, [filteredPool, submissions, evaluations, listeningLogs, halaqahs]);

  // Selected student breakdown details
  const breakdownData = useMemo(() => {
    if (!selectedStudentForBreakdown) return null;
    return studentRankList.find(item => item.student.id === selectedStudentForBreakdown.id);
  }, [selectedStudentForBreakdown, studentRankList]);

  const handleSaveScope = async (scope: 'all_unified' | 'per_halaqah') => {
    setActiveScope(scope);
    if (onSaveLeaderboardSettings) {
      setIsSavingSettings(true);
      try {
        await onSaveLeaderboardSettings({
          ...leaderboardSettings,
          scope,
          updatedAt: new Date().toISOString()
        });
      } finally {
        setIsSavingSettings(false);
        setIsSettingsOpen(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-[32px] bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#064e3b] border border-[#fbbf24]/50 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#fbbf24]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#064e3b] flex items-center justify-center shadow-lg border border-[#fbbf24]/40 shrink-0">
              <Trophy className="w-8 h-8 text-[#064e3b]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                  لوحة الشرف والتفوق القرآني
                </h2>
                <span className="text-xs px-3 py-1 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/30">
                  {activeScope === 'per_halaqah' ? 'ترتيب الحلقة' : 'الترتيب العام الموحد'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-xl leading-relaxed">
                لوحة تنافسية شاملة ترصد وتجمع نقاط الطلاب من تقييمات التسميع اليومية، الاختبارات القرآنية، إنجاز الاستماع المنزلي، والأوجه المكتملة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(isSupervisor || isDeveloper) && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#022c22] hover:bg-emerald-950 border border-[#fbbf24]/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Sliders className="w-4 h-4 text-[#fbbf24]" />
                <span>إعدادات نطاق اللوحة</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 pt-5 border-t border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب لرؤية ترتيبه ونقاطه..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-xl bg-[#022c22]/90 border border-[#065f46] text-white text-xs placeholder:text-emerald-300/50 focus:border-[#fbbf24] focus:outline-none font-bold"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-emerald-200 font-bold shrink-0">تصفية حسب الحلقة:</span>
            <select
              value={selectedHalaqahFilter}
              onChange={e => setSelectedHalaqahFilter(e.target.value)}
              className="text-xs text-amber-200 bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-2 focus:border-[#fbbf24] focus:outline-none cursor-pointer font-bold"
            >
              <option value="all">جميع الحلقات ({students.length} طالب)</option>
              {halaqahs.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {studentRankList.length > 0 && !searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {studentRankList.slice(0, 3).map((item, idx) => {
            const badges = [
              {
                label: 'المركز الأول • تاج التفوق',
                icon: Trophy,
                border: 'border-[#fbbf24]',
                glow: 'shadow-[0_0_25px_rgba(251,191,36,0.35)]',
                bg: 'bg-gradient-to-b from-amber-500/20 via-[#064e3b] to-[#022c22]',
                badgeBg: 'bg-[#fbbf24]',
                badgeText: 'text-[#064e3b]',
                cardBorder: 'border-[#fbbf24]',
                rankNumber: 1
              },
              {
                label: 'المركز الثاني • وسام التميز',
                icon: Medal,
                border: 'border-slate-300',
                glow: 'shadow-[0_0_20px_rgba(203,213,225,0.2)]',
                bg: 'bg-gradient-to-b from-slate-400/20 via-[#064e3b] to-[#022c22]',
                badgeBg: 'bg-slate-300',
                badgeText: 'text-slate-900',
                cardBorder: 'border-slate-300/60',
                rankNumber: 2
              },
              {
                label: 'المركز الثالث • درع الاجتهاد',
                icon: Award,
                border: 'border-amber-600',
                glow: 'shadow-[0_0_20px_rgba(217,119,6,0.2)]',
                bg: 'bg-gradient-to-b from-amber-600/20 via-[#064e3b] to-[#022c22]',
                badgeBg: 'bg-amber-600',
                badgeText: 'text-white',
                cardBorder: 'border-amber-600/60',
                rankNumber: 3
              }
            ];
            const badge = badges[idx] || badges[0];
            const BadgeIcon = badge.icon;

            return (
              <div
                key={item.student.id}
                onClick={() => setSelectedStudentForBreakdown(item.student)}
                className={`p-6 rounded-3xl border ${badge.cardBorder} ${badge.bg} ${badge.glow} flex flex-col justify-between gap-4 cursor-pointer transition-all hover:scale-[1.02] relative overflow-hidden group`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md ${badge.badgeBg} ${badge.badgeText}`}>
                    <BadgeIcon className="w-4 h-4" />
                    <span>{badge.label}</span>
                  </span>

                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#022c22] text-emerald-300 font-bold border border-emerald-800">
                    الترتيب #{badge.rankNumber}
                  </span>
                </div>

                <div className="text-center py-2">
                  <div className="w-16 h-16 rounded-2xl bg-[#022c22] border-2 border-[#fbbf24]/50 text-[#fbbf24] text-2xl font-black flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:border-[#fbbf24] transition-colors">
                    {item.student.name.charAt(0)}
                  </div>
                  <h3 className="text-lg font-black text-white font-heading">{item.student.name}</h3>
                  <p className="text-xs text-emerald-300/80 mt-0.5">{item.halaqahName}</p>
                </div>

                <div className="bg-[#022c22]/90 rounded-2xl p-3 border border-emerald-800/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-emerald-300/70 block">تسميع ومعايير</span>
                    <strong className="text-emerald-400 font-mono text-xs">{item.evalPoints}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300/70 block">الاختبارات</span>
                    <strong className="text-emerald-400 font-mono text-xs">{item.examPoints}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#fbbf24] block">إجمالي النقاط</span>
                    <strong className="text-[#fbbf24] font-mono text-base font-black">{item.totalPoints}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStudentForBreakdown(item.student);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#fbbf24]/20 hover:bg-[#fbbf24]/30 text-[#fbbf24] border border-[#fbbf24]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>عرض التفاصيل</span>
                  </button>
                  {onAwardBonusPoints && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPointsModal(item.student, 'award');
                        }}
                        className="px-3 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                        title="إضافة نقاط تشجيعية"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>منح</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPointsModal(item.student, 'deduct');
                        }}
                        className="px-2.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="خصم نقاط جزائية"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span>خصم</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Ranking Table Card */}
      <div className="rounded-[32px] bg-[#064e3b]/60 border border-[#065f46] p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#065f46]">
          <div className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-[#fbbf24]" />
            <h3 className="text-base font-bold text-white font-heading">
              قائمة ترتيب الطلاب التنافسية ({studentRankList.length} طالب)
            </h3>
          </div>
          <span className="text-xs text-[#86efac] font-medium">
            انقر على أي طالب للاطلاع على تفاصيل وكيفية جمع نقاطه
          </span>
        </div>

        {studentRankList.length === 0 ? (
          <div className="text-center py-12 text-xs text-emerald-200/70">
            لا يوجد طلاب مطابقين للبحث أو الحلقة المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-emerald-800/60 bg-[#022c22]/70">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#064e3b]/80 text-emerald-200 border-b border-[#065f46] text-[11px] font-bold">
                <tr>
                  <th className="p-3 text-center">الترتيب</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الحلقة</th>
                  <th className="p-3 text-center">نقاط التسميع والمعايير</th>
                  <th className="p-3 text-center">نقاط الاختبارات</th>
                  <th className="p-3 text-center">نقاط الاستماع</th>
                  <th className="p-3 text-center">الأوجه المكتملة</th>
                  <th className="p-3 text-center">إجمالي النقاط</th>
                  <th className="p-3 text-left">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/60 text-white">
                {studentRankList.map((item, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr
                      key={item.student.id}
                      onClick={() => setSelectedStudentForBreakdown(item.student)}
                      className="hover:bg-emerald-900/40 transition-colors cursor-pointer group"
                    >
                      <td className="p-3 text-center font-mono">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shadow-sm ${
                            rank === 1
                              ? 'bg-[#fbbf24] text-[#064e3b]'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : rank === 3
                              ? 'bg-amber-600 text-white'
                              : 'bg-[#022c22] text-emerald-300 border border-emerald-700'
                          }`}
                        >
                          {rank}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-[#fbbf24] transition-colors">
                            {item.student.name}
                          </span>
                          {rank <= 3 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold">
                              متميز
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-emerald-300/80">{item.halaqahName}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-300">
                        {item.evalPoints}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-300">
                        {item.examPoints}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-300">
                        {item.listeningPoints}
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-300">
                        {item.pagePoints}
                      </td>
                      <td className="p-3 text-center font-mono text-sm font-black text-[#fbbf24]">
                        {item.totalPoints}
                      </td>
                      <td className="p-3 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {onAwardBonusPoints && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPointsModal(item.student, 'award');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-[#064e3b] text-[11px] font-black border border-amber-400/40 transition-all flex items-center gap-1 cursor-pointer"
                                title="إضافة نقاط تشجيعية لهذا الطالب"
                              >
                                <Plus className="w-3 h-3" />
                                <span>منح</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPointsModal(item.student, 'deduct');
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[11px] font-black border border-rose-500/40 transition-all flex items-center gap-1 cursor-pointer"
                                title="خصم نقاط جزائية من هذا الطالب"
                              >
                                <Minus className="w-3 h-3" />
                                <span>خصم</span>
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForBreakdown(item.student)}
                            className="px-3 py-1 rounded-lg bg-emerald-800/80 hover:bg-[#fbbf24] text-emerald-100 hover:text-[#064e3b] text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>عرض النقاط</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED POINT BREAKDOWN MODAL FOR SELECTED STUDENT */}
      {selectedStudentForBreakdown && breakdownData && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#022c22] border border-[#fbbf24]/60 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#064e3b] font-black text-xl flex items-center justify-center shadow-lg">
                  {selectedStudentForBreakdown.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white font-heading">
                      {selectedStudentForBreakdown.name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/30">
                      الترتيب #{studentRankList.findIndex(i => i.student.id === selectedStudentForBreakdown.id) + 1}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    الحلقة: {breakdownData.halaqahName} • إجمالي رصيد النقاط: <strong className="text-[#fbbf24] font-mono text-sm">{breakdownData.totalPoints} نقطة</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForBreakdown(null)}
                className="p-2 rounded-xl text-emerald-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Point Sources Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-emerald-800 text-center space-y-1">
                <span className="text-[10px] text-emerald-300 font-bold block">تقييم التسميع</span>
                <span className="text-lg font-black text-[#fbbf24] font-mono">{breakdownData.evalPoints}</span>
                <span className="text-[10px] text-emerald-400/80 block">نقطة مكتسبة</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-emerald-800 text-center space-y-1">
                <span className="text-[10px] text-emerald-300 font-bold block">الاختبارات القرآنية</span>
                <span className="text-lg font-black text-[#fbbf24] font-mono">{breakdownData.examPoints}</span>
                <span className="text-[10px] text-emerald-400/80 block">نقطة معتمدة</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-emerald-800 text-center space-y-1">
                <span className="text-[10px] text-emerald-300 font-bold block">الاستماع القرآني</span>
                <span className="text-lg font-black text-[#fbbf24] font-mono">{breakdownData.listeningPoints}</span>
                <span className="text-[10px] text-emerald-400/80 block">تكرارات منجزة</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-emerald-800 text-center space-y-1">
                <span className="text-[10px] text-emerald-300 font-bold block">نقاط تشجيعية / حسم</span>
                <span className={`text-lg font-black font-mono ${(breakdownData.student.bonusPoints || 0) >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {(breakdownData.student.bonusPoints || 0) >= 0 ? `+${breakdownData.student.bonusPoints || 0}` : breakdownData.student.bonusPoints}
                </span>
                <span className="text-[10px] text-emerald-400/80 block">تعديلات المعلم</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#011a14] border border-[#fbbf24]/40 text-center space-y-1">
                <span className="text-[10px] text-amber-300 font-bold block">إجمالي الرصيد الفعلي</span>
                <span className="text-lg font-black text-[#fbbf24] font-mono">{breakdownData.totalPoints}</span>
                <span className="text-[10px] text-emerald-300/80 block">الرصيد المعتمد</span>
              </div>
            </div>

            {/* Itemized Lists: How Points Were Gathered */}
            <div className="space-y-4">
              {/* 1. Recitation Evaluations Points List */}
              <div className="bg-[#064e3b]/30 rounded-2xl p-4 border border-emerald-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white border-b border-emerald-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#fbbf24]" />
                    <span>سجل نقاط التسميع اليومي ({breakdownData.stEvaluations.length})</span>
                  </div>
                  <span className="text-[#fbbf24] font-mono">
                    المجموع: {breakdownData.evalPoints} نقطة
                  </span>
                </div>

                {breakdownData.stEvaluations.length === 0 ? (
                  <p className="text-xs text-emerald-300/60 text-center py-2">
                    لم تسجل تقييمات يومية بنقاط لهذا الطالب حتى الآن.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {breakdownData.stEvaluations.map(ev => {
                      const pts = ev.recitationDetails?.pointsEarnedToday ?? ((ev.recitationDetails?.criteriaPointsEarnedToday || 0) + (ev.recitationDetails?.pagesPointsEarnedToday || 0));
                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-xl bg-[#022c22] border border-emerald-900/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="text-[#fbbf24] font-bold">تاريخ: {ev.date}</span>
                            <span className="text-slate-300 text-[11px] block mt-0.5">
                              {ev.recitationDetails?.newMemorizationAchieved || 'تسميع يومي'}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                            +{pts} نقطة
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Exams Points List */}
              <div className="bg-[#064e3b]/30 rounded-2xl p-4 border border-emerald-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white border-b border-emerald-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#fbbf24]" />
                    <span>سجل نقاط الاختبارات القرآنية ({breakdownData.stSubmissions.length})</span>
                  </div>
                  <span className="text-[#fbbf24] font-mono">
                    المجموع: {breakdownData.examPoints} نقطة
                  </span>
                </div>

                {breakdownData.stSubmissions.length === 0 ? (
                  <p className="text-xs text-emerald-300/60 text-center py-2">
                    لم ينجز الطالب أي اختبارات إلكترونية بعد.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {breakdownData.stSubmissions.map(sub => (
                      <div
                        key={sub.id}
                        className="p-2.5 rounded-xl bg-[#022c22] border border-emerald-900/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="text-white font-bold">{sub.examTitle}</span>
                          <span className="text-emerald-300 text-[11px] block mt-0.5 font-mono">
                            الدرجة: {sub.totalScoreEarned} من {sub.maxPossibleScore} ({sub.percentage}%)
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#fbbf24]/20 text-[#fbbf24] font-mono font-bold">
                          +{sub.pointsGrantedForLeaderboard || 0} نقطة شرف
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Listening Points List */}
              <div className="bg-[#064e3b]/30 rounded-2xl p-4 border border-emerald-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white border-b border-emerald-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-[#fbbf24]" />
                    <span>سجل الاستماع القرآني المكتمل ({breakdownData.completedListenings})</span>
                  </div>
                  <span className="text-[#fbbf24] font-mono">
                    المجموع: {breakdownData.listeningPoints} نقطة
                  </span>
                </div>

                {breakdownData.stLogs.length === 0 ? (
                  <p className="text-xs text-emerald-300/60 text-center py-2">
                    {breakdownData.listeningPoints > 0
                      ? `رصيد استماع معتمد: +${breakdownData.listeningPoints} نقطة`
                      : 'لم يتم إتمام أي جلسة استماع قرآني مكتملة بعد.'}
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {breakdownData.stLogs.map(l => (
                      <div
                        key={l.id}
                        className="p-2.5 rounded-xl bg-[#022c22] border border-emerald-900/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="text-white font-bold">
                            سورة {l.surahName} (الآيات {l.fromAyah} إلى {l.toAyah})
                          </span>
                          <span className="text-emerald-300 text-[11px] block mt-0.5">
                            تم تكرار الاستماع {l.completedCount} مرات في تاريخ ({l.date})
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                          +5 نقاط
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-emerald-800 gap-2 flex-wrap">
              {onAwardBonusPoints && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const st = selectedStudentForBreakdown;
                      setSelectedStudentForBreakdown(null);
                      handleOpenPointsModal(st, 'award');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>منح نقاط تشجيعية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const st = selectedStudentForBreakdown;
                      setSelectedStudentForBreakdown(null);
                      handleOpenPointsModal(st, 'deduct');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Minus className="w-4 h-4" />
                    <span>خصم نقاط جزائية</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedStudentForBreakdown(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 font-bold text-xs cursor-pointer shadow-md mr-auto"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AWARD BONUS POINTS MODAL (منح نقاط تشجيعية للطلاب من لوحة الشرف) */}
      {awardModalStudent && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border-2 border-[#fbbf24] rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-[0_0_35px_rgba(251,191,36,0.3)] space-y-5 text-right relative">
            <button
              onClick={() => {
                if (!isSubmittingBonus) {
                  setAwardModalStudent(null);
                  setBonusSuccessMsg(null);
                }
              }}
              className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-emerald-800 pb-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
                pointsActionType === 'award'
                  ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-[#064e3b]'
                  : 'bg-gradient-to-br from-rose-500 to-rose-600 text-white'
              }`}>
                {pointsActionType === 'award' ? <Sparkles className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-heading">
                  {pointsActionType === 'award' ? 'منح نقاط تشجيعية للطالب' : 'خصم نقاط جزائية من الطالب'}
                </h3>
                <p className="text-xs text-amber-300 font-bold">
                  {awardModalStudent.name} (رصيده الحالي: {awardModalStudent.points || 0} نقطة)
                </p>
              </div>
            </div>

            {/* Toggle Action Type Segmented Control */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#011a14] border border-[#065f46]">
              <button
                type="button"
                onClick={() => {
                  setPointsActionType('award');
                  setBonusPointsAmount(10);
                  setBonusPointsReason('انضباط وتميز قرآني');
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pointsActionType === 'award'
                    ? 'bg-[#fbbf24] text-[#064e3b] shadow-md'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>منح نقاط (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPointsActionType('deduct');
                  setBonusPointsAmount(5);
                  setBonusPointsReason('تقصير متكرر في الحفظ والتسميع');
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pointsActionType === 'deduct'
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md'
                    : 'text-rose-300 hover:text-white'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>خصم نقاط (-)</span>
              </button>
            </div>

            {bonusSuccessMsg ? (
              <div className={`p-4 rounded-2xl border text-center font-bold text-sm flex items-center justify-center gap-2 animate-fadeIn ${
                pointsActionType === 'award'
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}>
                <Check className="w-5 h-5" />
                <span>{bonusSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Presets and Custom Points */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#86efac] block">
                    {pointsActionType === 'award' ? 'اختر مقدار النقاط المراد إضافتها:' : 'اختر مقدار النقاط المراد خصمها:'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(pointsActionType === 'award'
                      ? [5, 10, 15, 20, 25, 50, 100]
                      : [1, 2, 3, 5, 10, 15, 20]
                    ).map(pts => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setBonusPointsAmount(pts)}
                        className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          bonusPointsAmount === pts
                            ? pointsActionType === 'award'
                              ? 'bg-[#fbbf24] text-[#064e3b] shadow-md scale-105'
                              : 'bg-rose-500 text-white shadow-md scale-105'
                            : pointsActionType === 'award'
                              ? 'bg-[#064e3b] text-emerald-200 hover:text-white border border-[#065f46]'
                              : 'bg-rose-950/40 text-rose-200 hover:text-white border border-rose-800/40'
                        }`}
                      >
                        {pointsActionType === 'award' ? `+${pts}` : `-${pts}`} نقطة
                      </button>
                    ))}
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={bonusPointsAmount}
                        onChange={e => setBonusPointsAmount(Math.max(1, Number(e.target.value)))}
                        className={`w-full py-2 px-2 bg-[#022c22] border rounded-xl text-center text-xs font-black outline-none ${
                          pointsActionType === 'award'
                            ? 'border-[#065f46] focus:border-[#fbbf24] text-[#fbbf24]'
                            : 'border-rose-800/60 focus:border-rose-400 text-rose-300'
                        }`}
                        placeholder="مخصص"
                      />
                    </div>
                  </div>
                </div>

                {/* Reason Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#86efac] block">
                    {pointsActionType === 'award' ? 'سبب منح النقاط التكريمية:' : 'سبب خصم النقاط الجزائية:'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(pointsActionType === 'award'
                      ? [
                          'انضباط وتميز قرآني',
                          'إتقان استثنائي في التسميع',
                          'تفوق في مسابقة الحفظ',
                          'حفظ متن تجويدي إضافي',
                          'التزام فائق بالمراجعة اليومية',
                          'حسن خلق وأدب رفيع'
                        ]
                      : [
                          'تقصير متكرر في الحفظ والتسميع',
                          'عدم الالتزام بالمراجعة اليومية',
                          'تأخر متكرر عن وقت الحلقة',
                          'تشويش وسلوك غير لائق بالحلقة',
                          'عدم إحضار المصحف الشريف',
                          'إهمال الواجبات المحددة'
                        ]
                    ).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setBonusPointsReason(r)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          bonusPointsReason === r
                            ? pointsActionType === 'award'
                              ? 'bg-[#064e3b] text-[#fbbf24] border border-[#fbbf24]'
                              : 'bg-rose-950 text-rose-300 border border-rose-500'
                            : 'bg-[#022c22] text-emerald-300/80 border border-[#065f46] hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={bonusPointsReason}
                    onChange={e => setBonusPointsReason(e.target.value)}
                    placeholder="أو اكتب سبباً مخصصاً..."
                    className="w-full mt-1.5 py-2 px-3 bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                {/* Preview Banner */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                  pointsActionType === 'award'
                    ? 'bg-[#011a14] border-[#065f46]'
                    : 'bg-rose-950/20 border-rose-800/40'
                }`}>
                  <span className={pointsActionType === 'award' ? 'text-[#86efac]' : 'text-rose-300'}>
                    {pointsActionType === 'award' ? 'الرصيد بعد الإضافة سيكون:' : 'الرصيد بعد الخصم سيكون:'}
                  </span>
                  <span className={`font-mono font-black text-sm ${
                    pointsActionType === 'award' ? 'text-[#fbbf24]' : 'text-rose-400'
                  }`}>
                    {pointsActionType === 'award'
                      ? (awardModalStudent.points || 0) + (Number(bonusPointsAmount) || 0)
                      : Math.max(0, (awardModalStudent.points || 0) - (Number(bonusPointsAmount) || 0))} نقطة
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-800">
                  <button
                    type="button"
                    disabled={isSubmittingBonus}
                    onClick={() => setAwardModalStudent(null)}
                    className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingBonus || bonusPointsAmount <= 0}
                    onClick={handleConfirmAwardBonus}
                    className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all disabled:opacity-50 ${
                      pointsActionType === 'award'
                        ? 'bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b]'
                        : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:brightness-110 text-white'
                    }`}
                  >
                    {isSubmittingBonus ? (
                      <span>جارٍ اعتماد التغيير...</span>
                    ) : pointsActionType === 'award' ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>اعتماد وإضافة (+{bonusPointsAmount}) نقطة</span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-4 h-4" />
                        <span>تأكيد وخصم (-{bonusPointsAmount}) نقطة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEADERBOARD SCOPE SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border border-[#fbbf24]/60 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 text-right relative">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-emerald-800/80 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-[#fbbf24] border border-[#fbbf24]/40 flex items-center justify-center shrink-0">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  إعدادات نطاق لوحة الشرف
                </h3>
                <p className="text-xs text-[#fbbf24] font-bold mt-0.5">
                  تحديد آلية التنافس وترتيب الطلاب
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSaveScope('all_unified')}
                disabled={isSavingSettings}
                className={`w-full p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                  activeScope === 'all_unified'
                    ? 'bg-[#064e3b] border-[#fbbf24] ring-2 ring-[#fbbf24]/40 text-white'
                    : 'bg-[#022c22] border-[#065f46] text-emerald-200 hover:bg-[#064e3b]/50'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>1. الترتيب العام الموحد (كافة الحلقات معاً)</span>
                  {activeScope === 'all_unified' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                  )}
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  يتنافس جميع طلاب المركز في قائمة موحدة واحدة ويظهر ترتيب المراكز الأولى على مستوى المجمع ككل.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSaveScope('per_halaqah')}
                disabled={isSavingSettings}
                className={`w-full p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                  activeScope === 'per_halaqah'
                    ? 'bg-[#064e3b] border-[#fbbf24] ring-2 ring-[#fbbf24]/40 text-white'
                    : 'bg-[#022c22] border-[#065f46] text-emerald-200 hover:bg-[#064e3b]/50'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>2. الترتيب الداخلي المستقل لكل حلقة</span>
                  {activeScope === 'per_halaqah' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                  )}
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  يقتصر التنافس والترتيب على طلاب كل حلقة بمفردها، بحيث يكون لكل حلقة مراكزها الأولى الخاصة.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-900/60 text-emerald-300 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
