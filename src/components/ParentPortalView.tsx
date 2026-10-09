import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Award,
  Volume2,
  LogOut,
  Layers,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Key,
  User,
  XCircle,
  Clock,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  Trophy,
  Medal,
  Copy,
  Check,
  Headphones,
  Radio,
  ListOrdered,
  Info,
  Printer,
  Download,
  Search,
  X
} from 'lucide-react';
import { YouTubeAyahPlayer, formatTimeMMSS } from './recordings/YouTubeAyahPlayer';
import { AudioAyahPlayer } from './recordings/AudioAyahPlayer';
import { getAyahTextSync } from '../lib/quranTextService';
import confetti from 'canvas-confetti';
import {
  Student,
  AttendanceRecord,
  StudentEvaluation,
  AppSettings,
  BehaviorViolation,
  Exam,
  ExamSubmission,
  LeaderboardSettings,
  Halaqah,
  SurahRecording,
  RecordingsConfig,
  SurahRecordingSegment,
  IssuedCertificate,
  StudentListeningLog,
  QuranRecitationItem,
  QuranComplex
} from '../types';
import { StudentExamTaker } from './StudentExamTaker';
import { QuranAyahAudioPlayer } from './quran/QuranAyahAudioPlayer';
import { getSurahInfo } from '../data/quranData';
import { OmranDataService } from '../lib/firebase';
import { GoogleWorkspaceService } from '../lib/googleWorkspace';

interface ParentPortalViewProps {
  student: Student;
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  settings: AppSettings;
  violations?: BehaviorViolation[];
  exams?: Exam[];
  submissions?: ExamSubmission[];
  students?: Student[];
  halaqahs?: Halaqah[];
  leaderboardSettings?: LeaderboardSettings;
  recordings?: SurahRecording[];
  recordingsConfig?: RecordingsConfig;
  certificates?: IssuedCertificate[];
  listeningLogs?: StudentListeningLog[];
  activeComplex?: QuranComplex | null;
  complexes?: QuranComplex[];
  isLoggedInStudent?: boolean;
  onLogout?: () => void;
  onSaveSubmission?: (submission: ExamSubmission) => Promise<void>;
  onUpdateStudent?: (updatedStudent: Student) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  student,
  attendance,
  evaluations,
  settings,
  violations = [],
  exams = [],
  submissions = [],
  students = [],
  halaqahs = [],
  leaderboardSettings,
  recordings = [],
  recordingsConfig,
  certificates = [],
  listeningLogs = [],
  activeComplex,
  complexes = [],
  isLoggedInStudent,
  onLogout,
  onSaveSubmission,
  onUpdateStudent
}) => {
  const [activeTakingExam, setActiveTakingExam] = useState<Exam | null>(null);
  const [activeTakingAttemptNum, setActiveTakingAttemptNum] = useState<number>(1);
  const [viewingReviewSubmission, setViewingReviewSubmission] = useState<ExamSubmission | null>(null);
  const [openedGoogleFormExam, setOpenedGoogleFormExam] = useState<Exam | null>(null);
  const [googleFormModalData, setGoogleFormModalData] = useState<{
    exam: Exam;
    rawUrl: string;
    prefilledUrl: string;
    hasPrefill: boolean;
  } | null>(null);
  const [nameCopiedNotice, setNameCopiedNotice] = useState(false);

  // Student Google Authentication & Linking State
  const [currentStudent, setCurrentStudent] = useState<Student>(student);
  const [googleAuthGateExam, setGoogleAuthGateExam] = useState<Exam | null>(null);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [googleLinkError, setGoogleLinkError] = useState('');
  const [isCheckingGoogleScore, setIsCheckingGoogleScore] = useState(false);
  const [googleScoreFeedback, setGoogleScoreFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Synchronize internal student state if props change
  React.useEffect(() => {
    setCurrentStudent(student);
  }, [student]);

  // Resolved Complex Identity for Student Portal
  const resolvedComplex = useMemo(() => {
    if (activeComplex) return activeComplex;
    if (complexes && currentStudent.complexId) {
      return complexes.find(c => c.id === currentStudent.complexId) || complexes[0] || null;
    }
    return complexes?.[0] || null;
  }, [activeComplex, complexes, currentStudent.complexId]);

  const displayComplexName = currentStudent.complexName || resolvedComplex?.name || settings.complexName || 'مجمع تحفيظ القرآن الكريم';

  const handleLinkGoogleAccount = async (targetExamAfterLink?: Exam | null) => {
    setIsLinkingGoogle(true);
    setGoogleLinkError('');
    try {
      const updated = await GoogleWorkspaceService.linkStudentGoogleAccount(currentStudent);
      setCurrentStudent(updated);
      if (onUpdateStudent) {
        onUpdateStudent(updated);
      }
      setGoogleAuthGateExam(null);

      // If linking was triggered by clicking an exam, launch it now!
      if (targetExamAfterLink) {
        if (targetExamAfterLink.deliveryMode === 'google_form') {
          handleLaunchGoogleForm(targetExamAfterLink, updated);
        } else {
          const mySubs = submissions.filter(s => s.examId === targetExamAfterLink.id && s.studentId === updated.id);
          setActiveTakingAttemptNum(mySubs.length + 1);
          setActiveTakingExam(targetExamAfterLink);
        }
      }
    } catch (err: any) {
      console.warn('Student Google link notice:', err);
      const errMsg = err?.message || String(err);
      if (errMsg === 'هذا الحساب مربوط بالفعل' || errMsg.includes('مربوط بالفعل')) {
        setGoogleLinkError('هذا الحساب مربوط بالفعل');
      } else if (err?.isPopupClosed || errMsg.includes('popup-closed')) {
        setGoogleLinkError('تم إغلاق نافذة تسجيل الدخول من Google قبل الإكمال. يرجى الضغط مرة أخرى واختيار حساب Google الخاص بك.');
      } else if (err?.isPopupBlocked || errMsg.includes('popup-blocked')) {
        setGoogleLinkError('المتصفح حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح ثم المحاولة مرة أخرى.');
      } else {
        setGoogleLinkError(errMsg || 'تعذر استكمال الربط بحساب Google. يرجى إعادة المحاولة.');
      }
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogleAccount = async () => {
    try {
      setIsLinkingGoogle(true);
      const updated = await GoogleWorkspaceService.unlinkStudentGoogleAccount(currentStudent);
      setCurrentStudent(updated);
      if (onUpdateStudent) {
        onUpdateStudent(updated);
      }
      setGoogleLinkError('');
    } catch (e: any) {
      console.error('Unlink student Google account error:', e);
      setGoogleLinkError(e?.message || 'تعذر فصل حساب Google');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleCheckAndRecordGoogleScore = async (targetExam: Exam, isAuto: boolean = false) => {
    if (!isAuto) {
      setIsCheckingGoogleScore(true);
      setGoogleScoreFeedback(null);
    }
    try {
      const result = await GoogleWorkspaceService.fetchAndRecordStudentGoogleFormScore(
        targetExam,
        currentStudent,
        submissions
      );
      if (result.found && result.submission) {
        if (onSaveSubmission) {
          await onSaveSubmission(result.submission);
        }
        setGoogleScoreFeedback({
          success: true,
          message: `تم رصد وتحديث درجتك بنجاح! الدرجة: ${result.submission.totalScoreEarned} من ${result.submission.maxPossibleScore} (${result.submission.percentage}%)`
        });
        if (googleFormModalData) {
          setTimeout(() => {
            setGoogleFormModalData(null);
          }, 2500);
        }
      } else if (!isAuto) {
        setGoogleScoreFeedback({
          success: false,
          message: result.message
        });
      }
    } catch (err: any) {
      if (!isAuto) {
        setGoogleScoreFeedback({
          success: false,
          message: err?.message || 'تعذر التحقق من درجات Google Forms حالياً.'
        });
      }
    } finally {
      if (!isAuto) {
        setIsCheckingGoogleScore(false);
      }
    }
  };

  // Auto-sync Google Form scores whenever student returns to this page or in background
  useEffect(() => {
    const checkActiveGoogleForms = async () => {
      const gfExams = exams.filter(e => e.deliveryMode === 'google_form');
      if (gfExams.length === 0) return;

      if (googleFormModalData?.exam) {
        await handleCheckAndRecordGoogleScore(googleFormModalData.exam, true);
        return;
      }

      for (const ex of gfExams) {
        await handleCheckAndRecordGoogleScore(ex, true);
      }
    };

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkActiveGoogleForms();
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    let pollInterval: any = null;
    if (googleFormModalData?.exam) {
      pollInterval = setInterval(() => {
        handleCheckAndRecordGoogleScore(googleFormModalData.exam, true);
      }, 8000);
    }

    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [googleFormModalData, exams, currentStudent, submissions]);

  const studentAttendance = attendance.filter(a => a.studentId === student.id);
  const studentEvaluations = evaluations.filter(e => e.studentId === student.id);
  const studentViolations = violations.filter(
    v => v.studentId === student.id && (v.showInPortal ?? true)
  );

  const [viewingCertModal, setViewingCertModal] = useState<IssuedCertificate | null>(null);

  // Student certificates matching their ID or exact name
  const studentCertificates = useMemo(() => {
    if (!certificates || certificates.length === 0) return [];
    const cleanName = (currentStudent.name || '').trim();
    return certificates.filter(
      c => c.studentId === currentStudent.id || (c.studentName && c.studentName.trim() === cleanName)
    );
  }, [certificates, currentStudent]);

  // Available Exams for this Student
  const studentHalaqahId = student.halaqahId || '';
  const studentExams = exams.filter(ex => {
    // Check target halaqat
    const matchesHalaqah = ex.targetHalaqat.includes('all') || (studentHalaqahId && ex.targetHalaqat.includes(studentHalaqahId));
    if (!matchesHalaqah) return false;

    // Check scheduling (if scheduled for the future)
    if (ex.scheduleType === 'scheduled' && ex.startDate && new Date(ex.startDate) > new Date()) {
      return false;
    }
    return true;
  });

  const studentSubmissions = submissions.filter(s => s.studentId === student.id);

  // Sort evaluations from newest to oldest
  const sortedEvaluations = [...studentEvaluations].sort((a, b) => b.date.localeCompare(a.date));

  const presentsCount = studentAttendance.filter(a => a.status === 'حاضر').length;
  const attendanceRate =
    studentAttendance.length > 0
      ? Math.round((presentsCount / studentAttendance.length) * 100)
      : 100;

  // Honor Board / Leaderboard Calculation for Student Portal (Unified Formula identical to LeaderboardTab)
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [selectedStudentForBreakdown, setSelectedStudentForBreakdown] = useState<any | null>(null);

  const activeScope = leaderboardSettings?.scope || 'all_unified';
  const isPerHalaqahScope = activeScope === 'per_halaqah';

  // Filter students based on supervisor's setting (all halaqat vs per halaqah)
  const poolStudents = students && students.length > 0 ? students : [student];
  const eligibleStudents = useMemo(() => {
    return poolStudents.filter(s => {
      if (isPerHalaqahScope) {
        return s.halaqahId === student.halaqahId;
      }
      return true;
    });
  }, [poolStudents, isPerHalaqahScope, student.halaqahId]);

  const studentRankList = useMemo(() => {
    return eligibleStudents.map(st => {
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

      // 2. Evaluation / criteria points
      const stEvaluations = evaluations.filter(ev => ev.studentId === st.id);
      const evalPoints = stEvaluations.reduce((sum, ev) => {
        const criteriaPts = ev.recitationDetails?.criteriaPointsEarnedToday || 0;
        const pagePts = ev.recitationDetails?.pagesPointsEarnedToday || 0;
        const pts = ev.recitationDetails?.pointsEarnedToday;
        const dailyTotal = pts !== undefined && pts !== null ? pts : (criteriaPts + pagePts);
        return sum + dailyTotal;
      }, 0);

      // Fallback: If student has criteriaPoints stored on their profile
      const finalEvalPoints = Math.max(evalPoints, (st.criteriaPoints || 0) + (st.totalPagePoints || 0));

      // 3. Listening points
      const stLogs = (listeningLogs || []).filter(l => l.studentId === st.id && l.isFullyCompleted);
      const logsListeningPoints = stLogs.length * 5;
      const finalListeningPoints = Math.max(logsListeningPoints, st.listeningPoints || 0);

      // 4. Completed pages points
      const totalPagePoints = st.totalPagePoints || 0;

      // 5. Total points: master student points balance
      const computedTotal = examPoints + finalEvalPoints + finalListeningPoints + totalPagePoints;
      const totalPoints = typeof st.points === 'number'
        ? Math.max(0, st.points)
        : Math.max(0, computedTotal + (st.bonusPoints || 0));

      const halaqahName =
        st.halaqahName || halaqahs?.find(h => h.id === st.halaqahId)?.name || 'الحلقة القرآنية';

      return {
        student: st,
        totalPoints,
        examPoints,
        evalPoints: finalEvalPoints,
        listeningPoints: finalListeningPoints,
        pagePoints: totalPagePoints,
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
  }, [eligibleStudents, submissions, evaluations, listeningLogs, halaqahs]);

  const displayedRankList = useMemo(() => {
    if (!leaderboardSearch.trim()) return studentRankList;
    const q = leaderboardSearch.trim().toLowerCase();
    return studentRankList.filter(item =>
      item.student.name.toLowerCase().includes(q) ||
      item.halaqahName.toLowerCase().includes(q)
    );
  }, [studentRankList, leaderboardSearch]);

  const myRankIndex = studentRankList.findIndex(item => item.student.id === student.id);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const myRankingData = myRankIndex >= 0 ? studentRankList[myRankIndex] : null;
  const studentHalaqahObj = halaqahs?.find(h => h.id === student.halaqahId);
  const currentHalaqahTitle = student.halaqahName || studentHalaqahObj?.name || 'حلقتك القرآنية';

  // Audio Recording & Ayah Listening for Students
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>('');
  const [activePortalAyah, setActivePortalAyah] = useState<SurahRecordingSegment | null>(null);
  const [activePortalTargetAyah, setActivePortalTargetAyah] = useState<SurahRecordingSegment | null>(null);
  const [portalLiveTime, setPortalLiveTime] = useState<number>(0);
  const [listensCount, setListensCount] = useState<number>(0);
  const [listeningCelebrationMsg, setListeningCelebrationMsg] = useState<string | null>(null);

  const handleRecordListening = async () => {
    const target = recordingsConfig?.dailyRepetitionTarget || 3;
    const rewardPoints = recordingsConfig?.listeningPointsReward ?? settings?.dailyListeningPoints ?? 5;

    if (listensCount >= target) {
      // Reset counter
      setListensCount(0);
      return;
    }

    const nextCount = listensCount + 1;
    setListensCount(nextCount);

    if (nextCount >= target) {
      const todayStr = new Date().toISOString().split('T')[0];
      const alreadyAwarded = currentStudent.dailyListeningCompletedDate === todayStr;

      if (!alreadyAwarded && onUpdateStudent) {
        const updatedStudent: Student = {
          ...currentStudent,
          listeningPoints: (currentStudent.listeningPoints || 0) + rewardPoints,
          points: (currentStudent.points || 0) + rewardPoints,
          dailyListeningCompletedDate: todayStr
        };
        onUpdateStudent(updatedStudent);

        try {
          await OmranDataService.saveListeningLog({
            id: `listen_${Date.now()}_${currentStudent.id}`,
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            halaqahId: currentStudent.halaqahId,
            surahNumber: activeRecording?.surahNumber || currentStudent.currentSurah || 78,
            surahName: activeRecording?.surahName || currentStudent.currentSurahName || 'النبأ',
            fromAyah: 1,
            toAyah: activeRecording?.segments?.length || 1,
            targetCount: target,
            completedCount: target,
            isFullyCompleted: true,
            date: todayStr,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Save listening log note:', e);
        }

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setListeningCelebrationMsg(`🎉 هنيئاً لك! أتممت الاستماع القرآني وحصلت على +${rewardPoints} نقاط تميز في رصيدك.`);
        setTimeout(() => setListeningCelebrationMsg(null), 6000);
      } else {
        setListeningCelebrationMsg(`✨ رائع جداً! أتممت عدد مرات الاستماع المقررة (${target} مرات) اليوم.`);
        setTimeout(() => setListeningCelebrationMsg(null), 4000);
      }
    }
  };

  // Initialize selected recording based on student's current Surah
  React.useEffect(() => {
    if (recordings && recordings.length > 0) {
      const matchSurah = recordings.find(r => r.surahNumber === currentStudent.currentSurah);
      const chosen = matchSurah || recordings[0];
      if (chosen && (!selectedRecordingId || !recordings.some(r => r.id === selectedRecordingId))) {
        setSelectedRecordingId(chosen.id);
        const firstSeg = chosen.segments && chosen.segments.length > 0 ? chosen.segments[0] : null;
        setActivePortalAyah(firstSeg);
        setActivePortalTargetAyah(null);
      }
    }
  }, [recordings, currentStudent.currentSurah]);

  const activeRecording = recordings.find(r => r.id === selectedRecordingId) || recordings[0];

  // Handle Google Form exam launch with student name prefill and auto-clipboard
  const handleLaunchGoogleForm = (exam: Exam, targetStudent?: Student) => {
    const activeSt = targetStudent || currentStudent;
    const rawUrl = exam.googleFormResponderUrl || exam.googleFormUrl;
    if (!rawUrl) {
      alert('لم يتم ربط أو توليد رابط Google Form لهذا الاختبار بعد. يرجى التواصل مع المعلم.');
      return;
    }

    let prefilledUrl = rawUrl;
    let hasPrefill = false;

    if (exam.googleFormNameEntryId) {
      const entryKey = exam.googleFormNameEntryId.startsWith('entry.')
        ? exam.googleFormNameEntryId
        : `entry.${exam.googleFormNameEntryId}`;
      const joinChar = rawUrl.includes('?') ? '&' : '?';
      prefilledUrl = `${rawUrl}${joinChar}${entryKey}=${encodeURIComponent(activeSt.name)}`;
      hasPrefill = true;
    }

    // Auto-copy the registered student name to clipboard so student never misspells it
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeSt.name).then(() => {
        setNameCopiedNotice(true);
        setTimeout(() => setNameCopiedNotice(false), 4000);
      }).catch(() => {});
    }

    setGoogleFormModalData({
      exam,
      rawUrl,
      prefilledUrl,
      hasPrefill
    });
  };

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.history.replaceState({}, '', window.location.pathname);
      window.location.reload();
    }
  };

  // Student's exact assigned passage (dictated by teacher)
  const currentAssignedPassage = useMemo(() => {
    if (currentStudent.activeListeningAssignment) {
      const isNone =
        currentStudent.activeListeningAssignment.sheikhName === 'بدون' ||
        currentStudent.activeListeningAssignment.requiredRepetitions === 0;
      return {
        ...currentStudent.activeListeningAssignment,
        requiredRepetitions: isNone ? 0 : (currentStudent.activeListeningAssignment.requiredRepetitions ?? 3),
        isCompleted: isNone ? true : currentStudent.activeListeningAssignment.isCompleted
      };
    }
    const newItem = currentStudent.aiPlan?.currentDailyAssignment?.newItem;
    const isPlanNone = currentStudent.aiPlan?.currentDailyAssignment?.suggestedSheikh === 'بدون';
    if (newItem && newItem.surahNumber) {
      return {
        surahNumber: newItem.surahNumber,
        surahName: newItem.surahName || getSurahInfo(newItem.surahNumber).name,
        fromAyah: newItem.fromAyah || 1,
        toAyah: newItem.toAyah || newItem.fromAyah || 7,
        sheikhName: currentStudent.aiPlan?.currentDailyAssignment?.suggestedSheikh || 'الشيخ محمد صديق المنشاوي (المصحف المعلم)',
        requiredRepetitions: isPlanNone ? 0 : (currentStudent.aiPlan?.currentDailyAssignment?.targetRepetitions ?? 3),
        assignedDate: new Date().toISOString().split('T')[0],
        completedRepetitions: 0,
        isCompleted: isPlanNone
      };
    }
    const sNum = currentStudent.currentSurah || 78;
    const sInfo = getSurahInfo(sNum);
    const fromA = currentStudent.currentAyah || 1;
    const toA = Math.min(fromA + 5, sInfo.numberOfAyahs);
    return {
      surahNumber: sNum,
      surahName: currentStudent.currentSurahName || sInfo.name,
      fromAyah: fromA,
      toAyah: toA,
      sheikhName: 'الشيخ محمد صديق المنشاوي (المصحف المعلم)',
      requiredRepetitions: 3,
      assignedDate: new Date().toISOString().split('T')[0],
      completedRepetitions: 0,
      isCompleted: false
    };
  }, [currentStudent]);

  const [selectedCertificateForView, setSelectedCertificateForView] = useState<IssuedCertificate | null>(null);

  // Tomorrow's Real Assignment Dictated by Teacher (خطة ومقرر الغد الحقيقي الذي حدده المعلم)
  const tomorrowPlanInfo = useMemo(() => {
    const latestEval = sortedEvaluations[0];
    const aiAssignment = currentStudent.aiPlan?.currentDailyAssignment;

    // 1. Tomorrow's New Memorization (الجديد المقرّر من المعلم)
    let newMemorizationText = '';
    let newDetail: any = null;

    if (latestEval?.recitationDetails?.tomorrowNewItem) {
      const it = latestEval.recitationDetails.tomorrowNewItem;
      newDetail = it;
      const sInfo = getSurahInfo(it.surahNumber);
      const toInfo = it.toSurahNumber ? getSurahInfo(it.toSurahNumber) : sInfo;
      newMemorizationText = it.formattedText || (
        it.surahNumber === (it.toSurahNumber || it.surahNumber) && it.fromAyah === 1 && it.toAyah >= sInfo.numberOfAyahs
          ? `سورة ${sInfo.name} كاملة (الآيات 1 - ${sInfo.numberOfAyahs})`
          : `سورة ${sInfo.name}: من الآية (${it.fromAyah}) إلى الآية (${it.toAyah})`
      );
    } else if (aiAssignment?.newMemorization && !aiAssignment.newMemorization.includes('حسب توجيه')) {
      newMemorizationText = aiAssignment.newMemorization;
      newDetail = aiAssignment.newItem;
    } else if (currentStudent.targetSurahName) {
      newMemorizationText = `سورة ${currentStudent.targetSurahName} (من آية ${currentStudent.targetFromAyah || 1} إلى ${currentStudent.targetToAyah || currentStudent.currentAyah})`;
    } else {
      const curS = currentStudent.currentSurah || 78;
      const curA = currentStudent.currentAyah || 1;
      const sInfo = getSurahInfo(curS);
      const nextA = Math.min(curA + 5, sInfo.numberOfAyahs);
      newMemorizationText = `سورة ${sInfo.name}: من الآية (${curA}) إلى الآية (${nextA})`;
    }

    // 2. Tomorrow's Review Items (مقرر المراجعة والتثبيت والتراكمي المحدد من المعلم)
    let reviewItemsList: QuranRecitationItem[] = [];
    if (latestEval?.recitationDetails?.tomorrowReviewItems && latestEval.recitationDetails.tomorrowReviewItems.length > 0) {
      reviewItemsList = latestEval.recitationDetails.tomorrowReviewItems;
    } else if (aiAssignment?.reviewItems && aiAssignment.reviewItems.length > 0) {
      reviewItemsList = aiAssignment.reviewItems;
    } else if (currentStudent.persistentReviewItems && currentStudent.persistentReviewItems.length > 0) {
      reviewItemsList = currentStudent.persistentReviewItems;
    } else if (latestEval?.recitationDetails?.tomorrowReviewItem) {
      reviewItemsList = [latestEval.recitationDetails.tomorrowReviewItem];
    } else if (aiAssignment?.reviewItem) {
      reviewItemsList = [aiAssignment.reviewItem];
    }

    const reviewSummaryText = (aiAssignment?.review && !aiAssignment.review.includes('المحفوظ السابق'))
      ? aiAssignment.review
      : (latestEval?.recitationDetails?.tomorrowReviewItem?.formattedText || (
        reviewItemsList.length > 0
          ? reviewItemsList.map(r => r.formattedText || `${r.type}: سورة ${r.surahName} (${r.fromAyah}-${r.toAyah})`).join(' • ')
          : (currentStudent.reviewSurahName ? `سورة ${currentStudent.reviewSurahName} (من آية ${currentStudent.reviewFromAyah || 1} إلى ${currentStudent.reviewToAyah || 1})` : 'لم يُحدّد المعلم مقرراً للمراجعة لغد - التركيز على الحفظ الجديد')
      ));

    const teacherNote = latestEval?.recitationDetails?.tomorrowDailyNote || aiAssignment?.dailyNote || '';
    const sheikh = latestEval?.recitationDetails?.tomorrowSuggestedSheikh || aiAssignment?.suggestedSheikh || '';

    return {
      newMemorizationText,
      newDetail,
      reviewItemsList,
      reviewSummaryText,
      teacherNote,
      sheikh
    };
  }, [sortedEvaluations, currentStudent]);

  if (activeTakingExam) {
    return (
      <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] p-4 sm:p-6 lg:p-8">
        <StudentExamTaker
          exam={activeTakingExam}
          student={student}
          currentAttemptNumber={activeTakingAttemptNum}
          onFinishSubmission={async sub => {
            if (onSaveSubmission) {
              await onSaveSubmission(sub);
            } else {
              await OmranDataService.saveSubmission(sub);
            }
            setActiveTakingExam(null);
          }}
          onCancel={() => setActiveTakingExam(null)}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 relative z-10 transition-colors duration-300"
      style={resolvedComplex?.theme ? {
        backgroundColor: resolvedComplex.theme.backgroundColor || '#022c22',
        color: resolvedComplex.theme.textColor || '#f0f9f6'
      } : {
        backgroundColor: '#022c22',
        color: '#f0f9f6'
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Portal Header */}
        <div
          className="border rounded-[32px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md transition-all"
          style={resolvedComplex?.theme ? {
            backgroundColor: resolvedComplex.theme.secondaryColor ? `${resolvedComplex.theme.secondaryColor}bb` : 'rgba(6, 78, 59, 0.6)',
            borderColor: resolvedComplex.theme.primaryColor || '#065f46'
          } : {
            backgroundColor: 'rgba(6, 78, 59, 0.6)',
            borderColor: '#065f46'
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#064e3b] flex items-center justify-center border border-[#fbbf24]/40 shadow-lg font-black shrink-0 overflow-hidden"
              style={resolvedComplex?.theme?.accentColor ? {
                borderColor: resolvedComplex.theme.accentColor
              } : undefined}
            >
              {resolvedComplex?.logoUrl ? (
                <img src={resolvedComplex.logoUrl} alt={displayComplexName} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1
                className="text-lg sm:text-xl font-bold font-heading text-white flex items-center gap-2"
                style={resolvedComplex?.theme?.accentColor ? { color: resolvedComplex.theme.accentColor } : undefined}
              >
                {displayComplexName}
              </h1>
              <p
                className="text-xs font-bold"
                style={resolvedComplex?.theme?.accentColor ? { color: resolvedComplex.theme.accentColor } : { color: '#fbbf24' }}
              >
                {currentStudent.halaqahName || settings.halaqahName || 'الحلقة القرآنية'} • إشراف المعلم: {settings.teacherName || 'معلم ومحفظ الحلقة'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Google Account Status Badge */}
            {currentStudent.isGoogleLinked && currentStudent.googleEmail ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-xs shadow-sm" title={currentStudent.googleEmail}>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-emerald-300 font-bold truncate max-w-[150px]">{currentStudent.googleEmail}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">موثق</span>
                <button
                  type="button"
                  onClick={handleUnlinkGoogleAccount}
                  disabled={isLinkingGoogle}
                  className="text-[10px] text-red-300 hover:text-red-100 hover:underline cursor-pointer mr-1 px-1 py-0.5 rounded bg-red-950/50 border border-red-500/30"
                  title="فصل حساب Google"
                >
                  فصل
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setGoogleLinkError('');
                  handleLinkGoogleAccount(null);
                }}
                disabled={isLinkingGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                title="اضغط لربط حسابك بـ Google وتفعيل دخول الاختبارات"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isLinkingGoogle ? 'جاري الربط...' : 'ربط حساب Google'}</span>
              </button>
            )}

            {/* Prominent Account Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#022c22] border border-[#fbbf24]/40 text-xs shadow-md">
              <User className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="text-[#86efac]">حسابك:</span>
              <span className="font-bold text-white">{currentStudent.name}</span>
              <span className="text-[#fbbf24] font-mono font-bold">- {currentStudent.password || '123'}</span>
            </div>

            {/* Logout Button Always Visible */}
            <button
              onClick={handleLogoutAction}
              className="px-4 py-2 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="تسجيل الخروج والعودة للشاشة الرئيسية"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Student Profile Card Hero */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#064e3b] border border-[#fbbf24]/40 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#064e3b] text-2xl font-black font-heading flex items-center justify-center shadow-lg border border-[#fbbf24]/40 shrink-0">
                {currentStudent.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-heading">
                    {currentStudent.name}
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] text-xs font-bold border border-[#fbbf24]/30">
                    مستوى {currentStudent.level}
                  </span>
                  {currentStudent.isGoogleLinked && currentStudent.googleEmail && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>حساب Google موثق</span>
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#86efac] text-xs font-bold border border-emerald-500/30 font-mono">
                    {currentStudent.name} - {currentStudent.password || '123'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#f0f9f6]/90 mt-1">
                  موضع الحفظ الحالي: <strong className="text-[#fbbf24]">سورة {currentStudent.currentSurahName} (الآية {currentStudent.currentAyah})</strong>
                </p>
                <p className="text-xs text-[#86efac]/80 mt-0.5">
                  ولي الأمر: {currentStudent.parentName}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 bg-[#022c22] sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-[#065f46]">
              <span className="text-xs text-[#86efac]">نسبة التزام الحضور:</span>
              <span className="text-2xl sm:text-3xl font-black text-[#fbbf24] font-heading">
                {attendanceRate}%
              </span>
            </div>
          </div>
        </div>

        {/* QURAN EXAMS & QUIZZES SECTION FOR STUDENTS */}
        <div className="bg-[#064e3b]/60 border border-[#fbbf24]/40 rounded-[32px] p-6 sm:p-8 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#065f46]">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#fbbf24]" />
              <h3 className="text-base sm:text-lg font-bold font-heading text-white">
                الاختبارات والتقييمات القرآنية ({studentExams.length})
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/30">
              الاختبارات الإلكترونية
            </span>
          </div>

          {studentExams.length === 0 ? (
            <div className="text-center py-8 text-xs text-emerald-200/80 bg-[#022c22]/50 p-6 rounded-2xl border border-emerald-800/60">
              لا توجد اختبارات متاحة لحلقتك حالياً. تابع مع المعلم عند إعلان اختبار جديد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentExams.map(exam => {
                const mySubmissions = studentSubmissions.filter(s => s.examId === exam.id);
                const attemptsUsed = mySubmissions.length;
                const isLimited = exam.attemptLimitType === 'limited';
                const maxAttempts = exam.maxAttempts || 1;
                const hasReachedLimit = isLimited && attemptsUsed >= maxAttempts;
                const isExpired = exam.hasDeadline && exam.deadlineDate && new Date(exam.deadlineDate) < new Date();
                const canTake = !hasReachedLimit && !isExpired;

                const bestSubmission = mySubmissions.reduce<ExamSubmission | null>((best, cur) => {
                  if (!best || cur.totalScoreEarned > best.totalScoreEarned) return cur;
                  return best;
                }, null);

                return (
                  <div
                    key={exam.id}
                    className="p-5 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700">
                            {exam.questions.length} أسئلة • {exam.totalPoints} درجات
                          </span>
                          {exam.deliveryMode === 'google_form' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-200 font-bold border border-blue-600/50 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3 text-blue-300" />
                              Google Forms
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-600/40">
                              نظام المنصة
                            </span>
                          )}
                        </div>

                        {isExpired ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-600/40">
                            انتهى الموعد
                          </span>
                        ) : hasReachedLimit ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/40 font-bold">
                            استنفدت المحاولات ({attemptsUsed}/{maxAttempts})
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                            متاح للبدء
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white line-clamp-1">{exam.title}</h4>
                      {exam.description && (
                        <p className="text-[11px] text-emerald-200/80 mt-1 line-clamp-2">{exam.description}</p>
                      )}

                      {bestSubmission && (
                        <div className="mt-3 p-2.5 rounded-xl bg-[#064e3b]/50 border border-emerald-800 text-xs flex items-center justify-between">
                          <span className="text-emerald-300">أفضل نتيجة محققة:</span>
                          <span className="font-bold text-[#fbbf24]">
                            {bestSubmission.totalScoreEarned} / {bestSubmission.maxPossibleScore} ({bestSubmission.percentage}%)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-emerald-900/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-emerald-300/80">
                        {isLimited ? `المحاولات المتبقية: ${Math.max(0, maxAttempts - attemptsUsed)}` : 'محاولات غير محدودة'}
                      </div>

                      <div className="flex items-center gap-2">
                        {mySubmissions.length > 0 && (
                          <button
                            onClick={() => setViewingReviewSubmission(bestSubmission)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <span>مراجعة النتيجة</span>
                          </button>
                        )}

                        {canTake && (
                          <button
                            onClick={() => {
                              // Mandatory Google verification gate:
                              // If student has not linked their Google account, block entry until authenticated
                              if (!currentStudent.isGoogleLinked || !currentStudent.googleEmail) {
                                setGoogleAuthGateExam(exam);
                                return;
                              }

                              if (exam.deliveryMode === 'google_form') {
                                handleLaunchGoogleForm(exam);
                              } else {
                                setActiveTakingAttemptNum(attemptsUsed + 1);
                                setActiveTakingExam(exam);
                              }
                            }}
                            className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                              exam.deliveryMode === 'google_form'
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b]'
                            }`}
                          >
                            {exam.deliveryMode === 'google_form' ? (
                              <>
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>بدء الاختبار عبر Google Forms</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>ابدأ الاختبار الآن</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* QURAN AUDIO LISTENING & AYAH REPETITION SECTION */}
        <div className="space-y-4">
          <QuranAyahAudioPlayer
            student={currentStudent}
            surahNumber={currentAssignedPassage.surahNumber}
            surahName={currentAssignedPassage.surahName}
            fromAyah={currentAssignedPassage.fromAyah}
            toAyah={currentAssignedPassage.toAyah}
            selectedSheikhName={currentAssignedPassage.sheikhName}
            requiredRepetitions={currentAssignedPassage.requiredRepetitions ?? 3}
            listeningPointsReward={10}
            onRepetitionComplete={async (newCount, isFullyDone) => {
              const updated: Student = {
                ...currentStudent,
                activeListeningAssignment: {
                  ...currentAssignedPassage,
                  completedRepetitions: newCount,
                  isCompleted: isFullyDone
                }
              };
              if (isFullyDone) {
                updated.listeningPoints = (updated.listeningPoints || 0) + 10;
                updated.points = (updated.points || 0) + 10;
                updated.dailyListeningCompletedDate = new Date().toISOString().split('T')[0];
              }
              setCurrentStudent(updated);
              await OmranDataService.saveStudent(updated);
              if (onUpdateStudent) onUpdateStudent(updated);
            }}
          />
        </div>

        {/* STUDENT CERTIFICATES & AWARDS ARCHIVE */}
        <div className="bg-[#064e3b]/60 border border-[#fbbf24]/40 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#065f46]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-heading text-white flex items-center gap-2">
                  <span>سجل الشهادات والجوائز التقديرية</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#fbbf24] text-[#064e3b] font-black">
                    {studentCertificates.length} شهادات معتمدة
                  </span>
                </h3>
                <p className="text-xs text-[#86efac]/80 mt-0.5">
                  جميع الشهادات الصادرة والمحفوظة في أرشيف الطالب الرسمي مع إمكانية عرضها وطباعتها
                </p>
              </div>
            </div>
          </div>

          {studentCertificates.length === 0 ? (
            <div className="text-center py-8 text-xs text-emerald-200/80 bg-[#022c22]/50 p-6 rounded-2xl border border-emerald-800/60">
              لم تصدر شهادات لهذا الطالب بعد، وستظهر هنا فور إصدارها واعتمادها من قبل المعلم أو إدارة المجمع القرآني.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentCertificates.map(cert => (
                <div
                  key={cert.id}
                  className="p-5 rounded-2xl bg-[#022c22] border border-[#fbbf24]/30 space-y-3 flex flex-col justify-between shadow-md hover:border-[#fbbf24]/70 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {cert.type || 'شهادة تميز قرآنية'}
                      </span>
                      <span className="text-[11px] text-[#86efac]/80 font-mono">
                        {cert.issueDate || cert.createdAt?.split('T')[0]}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white font-heading">
                      {cert.title || 'شهادة شكر وتقدير وإتقان'}
                    </h4>

                    {cert.appreciationText && (
                      <p className="text-xs text-emerald-100/90 leading-relaxed bg-[#064e3b]/30 p-2.5 rounded-xl border border-[#065f46]/50">
                        {cert.appreciationText}
                      </p>
                    )}

                    <div className="text-[11px] text-[#86efac] flex items-center justify-between pt-1">
                      <span>إشراف المعلم: {cert.teacherName || 'معلم الحلقة'}</span>
                      {cert.complexName && <span>مجمع: {cert.complexName}</span>}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#065f46]/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedCertificateForView(cert)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#fbbf24] text-[#064e3b] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      <Award className="w-3.5 h-3.5 fill-current" />
                      <span>عرض الشهادة وطباعتها</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HONOR BOARD / LEADERBOARD SECTION FOR STUDENTS ACCORDING TO SUPERVISOR CONFIG */}
        <div className="bg-[#064e3b]/60 border border-[#fbbf24]/40 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#065f46]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-heading text-white flex items-center gap-2">
                  <span>لوحة الشرف والتفوق القرآني</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#fbbf24] text-[#064e3b] font-black">
                    {isPerHalaqahScope ? 'ترتيب الحلقة محلياً' : 'الترتيب العام لجميع الحلقات'}
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  {isPerHalaqahScope
                    ? `إعداد المشرف: يظهر هنا ترتيب وتنافس طلاب حلقة (${currentHalaqahTitle}) فقط.`
                    : 'إعداد المشرف: يظهر هنا الترتيب العام الموحد لجميع طلاب الحلقات بالمركز.'}
                </p>
              </div>
            </div>

            {/* Current Student Standing Pill */}
            {myRank && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#022c22] border border-[#fbbf24]/40 text-xs shadow-md">
                <Medal className="w-4 h-4 text-[#fbbf24]" />
                <span className="text-emerald-300">ترتيبك:</span>
                <span className="font-black text-[#fbbf24] text-sm font-heading">
                  المركز #{myRank}
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  ({myRankingData?.totalPoints || 0} نقطة)
                </span>
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="ابحث باسم الطالب لرؤية ترتيبه وتفاصيل نقاطه..."
                value={leaderboardSearch}
                onChange={e => setLeaderboardSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 rounded-xl bg-[#022c22]/90 border border-[#065f46] text-white text-xs placeholder:text-emerald-300/50 focus:border-[#fbbf24] focus:outline-none font-bold"
              />
            </div>
            <div className="text-[11px] text-emerald-300/80 font-bold self-start sm:self-center">
              إجمالي الطلاب المصنفين: {displayedRankList.length} طالب
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          {studentRankList.length > 0 && !leaderboardSearch.trim() && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {studentRankList.slice(0, 3).map((item, idx) => {
                const isMe = item.student.id === student.id;
                const badges = [
                  { label: 'المركز الأول', icon: Trophy, border: 'border-[#fbbf24]', bg: 'bg-[#fbbf24]/20', text: 'text-[#fbbf24]' },
                  { label: 'المركز الثاني', icon: Medal, border: 'border-slate-300', bg: 'bg-slate-300/20', text: 'text-slate-200' },
                  { label: 'المركز الثالث', icon: Award, border: 'border-amber-600', bg: 'bg-amber-600/20', text: 'text-amber-300' }
                ];
                const badge = badges[idx] || badges[0];
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={item.student.id}
                    onClick={() => setSelectedStudentForBreakdown(item)}
                    className={`p-4 rounded-2xl border transition-all text-center relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:scale-[1.02] ${
                      isMe
                        ? 'bg-[#064e3b] border-[#fbbf24] ring-2 ring-[#fbbf24]/40 shadow-xl'
                        : 'bg-[#022c22]/90 border-[#065f46] hover:border-[#fbbf24]/50'
                    }`}
                  >
                    {isMe && (
                      <span className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded-full bg-[#fbbf24] text-[#064e3b] font-black">
                        أنت
                      </span>
                    )}

                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-2 ${badge.bg} ${badge.text} border ${badge.border}`}>
                        <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{badge.label}</span>
                      </span>
                      <h4 className="text-sm font-bold text-white truncate">{item.student.name}</h4>
                      <p className="text-[11px] text-emerald-300/70 mt-0.5">{item.halaqahName}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-emerald-800/60 flex items-center justify-around text-xs">
                      <div>
                        <span className="text-[10px] text-emerald-400/80 block">النقاط</span>
                        <strong className="text-[#fbbf24] font-mono text-sm">{item.totalPoints}</strong>
                      </div>
                      <div className="w-px h-6 bg-emerald-800/60" />
                      <div>
                        <span className="text-[10px] text-emerald-400/80 block">التسميع</span>
                        <strong className="text-emerald-300 font-mono text-xs">{item.evalPoints}</strong>
                      </div>
                      <div className="w-px h-6 bg-emerald-800/60" />
                      <div>
                        <span className="text-[10px] text-emerald-400/80 block">الاختبارات</span>
                        <strong className="text-blue-300 font-mono text-xs">{item.examPoints}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentForBreakdown(item);
                      }}
                      className="mt-2.5 py-1 px-3 rounded-xl bg-white/5 hover:bg-[#fbbf24]/20 text-[#fbbf24] text-[11px] font-bold border border-white/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>عرض تفاصيل ومصادر النقاط</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Rank Table */}
          <div className="rounded-2xl border border-[#065f46] overflow-hidden bg-[#022c22]/70">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#064e3b]/80 text-emerald-200 border-b border-[#065f46] text-[11px]">
                  <tr>
                    <th className="p-3">الترتيب</th>
                    <th className="p-3">اسم الطالب</th>
                    {!isPerHalaqahScope && <th className="p-3">الحلقة</th>}
                    <th className="p-3 text-center">نقاط التسميع</th>
                    <th className="p-3 text-center">نقاط الاختبارات</th>
                    <th className="p-3 text-center">نقاط الاستماع</th>
                    <th className="p-3 text-left">إجمالي النقاط</th>
                    <th className="p-3 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#065f46]/40 text-white">
                  {displayedRankList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-emerald-300/70">
                        لا توجد نتائج مطابقة لبحثك في لوحة الشرف.
                      </td>
                    </tr>
                  ) : (
                    displayedRankList.map((item) => {
                      const isMe = item.student.id === student.id;
                      const originalIdx = studentRankList.findIndex(x => x.student.id === item.student.id);
                      return (
                        <tr
                          key={item.student.id}
                          onClick={() => setSelectedStudentForBreakdown(item)}
                          className={`transition-colors cursor-pointer ${
                            isMe
                              ? 'bg-[#064e3b] font-bold text-[#fbbf24] border-l-4 border-l-[#fbbf24]'
                              : 'hover:bg-[#064e3b]/40'
                          }`}
                        >
                          <td className="p-3 font-mono">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${
                              originalIdx === 0
                                ? 'bg-[#fbbf24] text-[#064e3b]'
                                : originalIdx === 1
                                ? 'bg-slate-300 text-slate-900'
                                : originalIdx === 2
                                ? 'bg-amber-600 text-white'
                                : 'bg-[#022c22] text-emerald-300 border border-emerald-800'
                            }`}>
                              {originalIdx + 1}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span>{item.student.name}</span>
                              {isMe && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fbbf24] text-[#064e3b] font-black">
                                  أنت
                                </span>
                              )}
                            </div>
                          </td>
                          {!isPerHalaqahScope && (
                            <td className="p-3 text-emerald-300/80 text-[11px]">{item.halaqahName}</td>
                          )}
                          <td className="p-3 text-center font-mono text-emerald-300 font-bold">{item.evalPoints}</td>
                          <td className="p-3 text-center font-mono text-blue-300 font-bold">{item.examPoints}</td>
                          <td className="p-3 text-center font-mono text-amber-300 font-bold">{item.listeningPoints}</td>
                          <td className="p-3 text-left font-mono font-bold text-[#fbbf24] text-sm">
                            {item.totalPoints}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForBreakdown(item);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-[#fbbf24] hover:text-[#064e3b] text-[#86efac] text-[10px] font-bold border border-emerald-700/50 transition-colors"
                            >
                              عرض النقاط
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* STUDENT POINTS BREAKDOWN MODAL */}
        {selectedStudentForBreakdown && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 text-right relative">
              <button
                onClick={() => setSelectedStudentForBreakdown(null)}
                className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-emerald-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-heading text-white">
                    تفاصيل ومصادر نقاط: {selectedStudentForBreakdown.student.name}
                  </h3>
                  <p className="text-xs text-[#86efac]/80 mt-0.5">
                    {selectedStudentForBreakdown.halaqahName} • إجمالي النقاط:{' '}
                    <strong className="text-[#fbbf24] font-mono text-sm">{selectedStudentForBreakdown.totalPoints}</strong> نقطة
                  </p>
                </div>
              </div>

              {/* 4 Pillars Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-emerald-700/50 space-y-1">
                  <span className="text-[10px] text-emerald-300 block font-bold">نقاط التسميع</span>
                  <span className="text-lg font-black text-emerald-200 font-mono">
                    +{selectedStudentForBreakdown.evalPoints}
                  </span>
                  <span className="text-[9px] text-emerald-400/70 block">
                    {selectedStudentForBreakdown.completedEvaluations} تقييم تسميع
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-blue-700/50 space-y-1">
                  <span className="text-[10px] text-blue-300 block font-bold">نقاط الاختبارات</span>
                  <span className="text-lg font-black text-blue-200 font-mono">
                    +{selectedStudentForBreakdown.examPoints}
                  </span>
                  <span className="text-[9px] text-blue-400/70 block">
                    {selectedStudentForBreakdown.completedExams} اختبار منجز
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-amber-700/50 space-y-1">
                  <span className="text-[10px] text-amber-300 block font-bold">نقاط الاستماع</span>
                  <span className="text-lg font-black text-amber-200 font-mono">
                    +{selectedStudentForBreakdown.listeningPoints}
                  </span>
                  <span className="text-[9px] text-amber-400/70 block">
                    {selectedStudentForBreakdown.completedListenings} جلسة تكرار
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-teal-700/50 space-y-1">
                  <span className="text-[10px] text-teal-300 block font-bold">نقاط الصفحات</span>
                  <span className="text-lg font-black text-teal-200 font-mono">
                    +{selectedStudentForBreakdown.pagePoints || 0}
                  </span>
                  <span className="text-[9px] text-teal-400/70 block">أوجه مكتملة</span>
                </div>
              </div>

              {/* Exam Submissions Details */}
              {selectedStudentForBreakdown.stSubmissions?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>سجل الاختبارات المنجزة ({selectedStudentForBreakdown.stSubmissions.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedStudentForBreakdown.stSubmissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-2.5 rounded-xl bg-[#064e3b]/30 border border-emerald-800/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">{sub.examTitle}</span>
                          <span className="text-[10px] text-emerald-300/70 block">{sub.submittedAt ? sub.submittedAt.split('T')[0] : ''}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-blue-300 font-bold">+{sub.pointsGrantedForLeaderboard || 0} نقطة</span>
                          <span className="text-[10px] text-emerald-400/80 block">({sub.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recitation Evaluation Criteria Details */}
              {selectedStudentForBreakdown.stEvaluations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>سجل تقييمات التسميع الأخيرة ({selectedStudentForBreakdown.stEvaluations.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedStudentForBreakdown.stEvaluations.slice(-5).reverse().map((ev: any) => {
                      const cPts = ev.recitationDetails?.criteriaPointsEarnedToday || 0;
                      const pPts = ev.recitationDetails?.pagesPointsEarnedToday || 0;
                      const tot = ev.recitationDetails?.pointsEarnedToday ?? (cPts + pPts);
                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-xl bg-[#064e3b]/30 border border-emerald-800/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white">{ev.date} - تسميع يومي</span>
                            <span className="text-[10px] text-emerald-300/70 block">
                              ورد الحفظ: {ev.dailyTarget || 'مقرر الحفظ'} • التقييم: {ev.totalScore}%
                            </span>
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-emerald-300 font-bold">+{tot} نقطة</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-emerald-800">
                <button
                  onClick={() => setSelectedStudentForBreakdown(null)}
                  className="px-5 py-2 rounded-xl bg-[#fbbf24] text-[#064e3b] font-bold text-xs cursor-pointer hover:bg-amber-300 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW PREVIOUS ATTEMPT MODAL */}
        {viewingReviewSubmission && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#fbbf24]" />
                    <span>مراجعة درجات: {viewingReviewSubmission.examTitle}</span>
                  </h3>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    الدرجة: {viewingReviewSubmission.totalScoreEarned} من {viewingReviewSubmission.maxPossibleScore} ({viewingReviewSubmission.percentage}%)
                  </p>
                </div>
                <button
                  onClick={() => setViewingReviewSubmission(null)}
                  className="p-2 rounded-xl text-emerald-300 hover:text-white cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {viewingReviewSubmission.answers.map((ans, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#064e3b]/40 border border-emerald-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-white">س {idx + 1}: {ans.questionTitle}</span>
                      <span className="text-[#fbbf24]">{ans.pointsEarned} / {ans.maxPoints} درجة</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#022c22] text-emerald-100">
                      <span className="text-emerald-400 font-bold block">إجابتك:</span>
                      <p className="text-white">{ans.studentAnswer || 'لم تتم الإجابة'}</p>
                    </div>
                    {ans.teacherFeedback && (
                      <div className="text-amber-300 bg-amber-950/40 p-2 rounded-xl border border-amber-500/20">
                        <strong>ملاحظة المعلم: </strong>{ans.teacherFeedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {viewingReviewSubmission.teacherGeneralFeedback && (
                <div className="p-3 rounded-2xl bg-[#064e3b]/60 border border-[#065f46] text-xs text-white">
                  <strong className="text-[#fbbf24]">توجيه عام من المعلم: </strong>
                  {viewingReviewSubmission.teacherGeneralFeedback}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-emerald-800">
                <button
                  onClick={() => setViewingReviewSubmission(null)}
                  className="px-5 py-2 rounded-xl bg-[#fbbf24] text-[#064e3b] font-bold text-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tomorrow's Target / Current Assignment Box */}
        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 sm:p-8 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#065f46]">
            <h3 className="text-base sm:text-lg font-bold font-heading text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#fbbf24]" />
              <span>المقرر والتكليف القادم (خطة الغد المعتمدة من المعلم)</span>
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/30">
              متابعة منزلية
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Target */}
            <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#86efac]">
                    <BookOpen className="w-4 h-4 text-[#fbbf24]" />
                    <span>ورد الحفظ الجديد المطلوب غداً</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#064e3b] text-[#fbbf24] font-bold border border-[#065f46]">
                    حفظ جديد
                  </span>
                </div>
                <p className="text-base sm:text-lg font-black text-white leading-relaxed font-heading">
                  {tomorrowPlanInfo.newMemorizationText}
                </p>
              </div>

              {tomorrowPlanInfo.sheikh && (
                <div className="pt-2 border-t border-[#065f46]/60 flex items-center gap-1.5 text-xs text-[#86efac]/90">
                  <Volume2 className="w-3.5 h-3.5 text-[#fbbf24]" />
                  <span>القارئ المعلم المقترح: <strong className="text-white">{tomorrowPlanInfo.sheikh}</strong></span>
                </div>
              )}
            </div>

            {/* Review Target */}
            <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#86efac]">
                    <RotateCcw className="w-4 h-4 text-[#fbbf24]" />
                    <span>مقرر المراجعة والتثبيت والتراكمي</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50">
                    {tomorrowPlanInfo.reviewItemsList.length > 1 ? `${tomorrowPlanInfo.reviewItemsList.length} مقررات مراجعة` : 'مراجعة وتثبيت'}
                  </span>
                </div>

                {tomorrowPlanInfo.reviewItemsList.length > 0 ? (
                  <div className="space-y-2">
                    {tomorrowPlanInfo.reviewItemsList.map((rev, rIdx) => {
                      const sInfo = getSurahInfo(rev.surahNumber);
                      const toInfo = rev.toSurahNumber ? getSurahInfo(rev.toSurahNumber) : sInfo;
                      return (
                        <div key={rev.id || rIdx} className="bg-[#064e3b]/50 p-3 rounded-2xl border border-emerald-700/60 space-y-1.5 shadow-sm">
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              rev.type?.includes('تراكمي') || rev.type?.includes('تراكمية')
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#064e3b] font-black shadow-sm'
                                : rev.type?.includes('كبرى') || rev.type?.includes('اختبار')
                                ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/50'
                                : 'bg-[#064e3b] text-[#fbbf24] border border-[#065f46]'
                            }`}>
                              <Layers className="w-3 h-3" />
                              <span>{rev.type || 'مراجعة وتثبيت'}</span>
                            </span>
                            <span className="text-emerald-300 font-mono text-[11px]">
                              {sInfo.name === toInfo.name ? `سورة ${sInfo.name}` : `من ${sInfo.name} إلى ${toInfo.name}`}
                            </span>
                          </div>
                          <div className="text-sm sm:text-base font-black text-white font-heading">
                            {rev.formattedText || (
                              rev.isFullSurah
                                ? `سورة ${sInfo.name} كاملة (${sInfo.numberOfAyahs} آية)`
                                : `سورة ${sInfo.name}: من الآية (${rev.fromAyah}) إلى (${rev.toAyah})`
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-base sm:text-lg font-black text-white leading-relaxed font-heading">
                    {tomorrowPlanInfo.reviewSummaryText}
                  </p>
                )}
              </div>

              {tomorrowPlanInfo.teacherNote && (
                <div className="pt-2 border-t border-[#065f46]/60 text-xs text-amber-200/90 italic">
                  💡 {tomorrowPlanInfo.teacherNote}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Recitation History */}
        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#065f46]">
            <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#fbbf24]" />
              <span>سجل التسميع اليومي والتقييمات الأخيرة ({sortedEvaluations.length})</span>
            </h3>
            <span className="text-xs text-[#86efac] font-medium">
              أحدث التقييمات
            </span>
          </div>

          {sortedEvaluations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-300">
              لم يتم رصد تسميعات مسجلة بعد.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvaluations.map(ev => {
                const evalDateArabic = new Intl.DateTimeFormat('ar-SA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }).format(new Date(ev.date));

                const newDidNotRecite = ev.recitationDetails?.newMemorizationDidNotRecite;
                const newDidNotReciteReason = ev.recitationDetails?.newMemorizationDidNotReciteReason;

                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#065f46]/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{evalDateArabic}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({ev.date})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/30">
                          درجة التسميع: {ev.score}%
                        </span>
                        {ev.teacherName && (
                          <span className="text-[11px] text-[#86efac]/80">
                            بإشراف: {ev.teacherName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recitation Content Details */}
                    <div className="space-y-2 text-xs">
                      {/* New Memorization */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-[#86efac] font-bold flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-[#fbbf24]" />
                          <span>ورد الحفظ الجديد:</span>
                        </span>
                        {newDidNotRecite ? (
                          <span className="text-amber-300 font-bold bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/30 inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>لم يُسمّع ({newDidNotReciteReason || 'لم يحفظ'})</span>
                          </span>
                        ) : (
                          <span className="font-bold text-[#fbbf24] text-sm">
                            {ev.recitationDetails?.newMemorizationAchieved || 'تم التسميع بنجاح'}
                          </span>
                        )}
                      </div>

                      {/* Review Items */}
                      {ev.recitationDetails?.todayReviewItems && ev.recitationDetails.todayReviewItems.length > 0 ? (
                        <div className="pt-2 border-t border-[#065f46]/50 space-y-1.5">
                          <span className="text-[#86efac] font-bold flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5 text-[#fbbf24]" />
                            <span>المراجعة والتثبيت:</span>
                          </span>
                          <div className="space-y-1.5 pr-2">
                            {ev.recitationDetails.todayReviewItems.map((rev, rIdx) => (
                              <div key={rev.id || rIdx} className="flex flex-wrap items-center justify-between gap-1 text-[11px] bg-[#064e3b]/30 p-2 rounded-xl border border-[#065f46]/40">
                                <span className="text-white font-medium">
                                  • {rev.type}: سورة {rev.surahName} (آية {rev.fromAyah} إلى {rev.toAyah})
                                </span>
                                {rev.didNotRecite ? (
                                  <span className="text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                                    لم يُسمّع ({rev.didNotReciteReason || 'لم يحفظ'})
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>تم التسميع</span>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : ev.recitationDetails?.reviewAchieved ? (
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 pt-2 border-t border-[#065f46]/50">
                          <span className="text-[#86efac] font-bold flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5 text-[#fbbf24]" />
                            <span>ما سمّعه في المراجعة والتثبيت:</span>
                          </span>
                          <span className="font-bold text-white text-right">
                            {ev.recitationDetails.reviewAchieved}
                          </span>
                        </div>
                      ) : null}

                      {/* Teacher Notes */}
                      {ev.recitationDetails?.teacherNotes && (
                        <div className="text-[#f0f9f6] pt-2 border-t border-[#065f46]/50 bg-[#064e3b]/30 p-2.5 rounded-xl">
                          <span className="text-[#fbbf24] font-bold flex items-center gap-1 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
                            <span>ملاحظات وتوجيه المعلم:</span>
                          </span>
                          {ev.recitationDetails.teacherNotes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Behavioral & Pedagogical Guidance Section for Parents */}
        {studentViolations.length > 0 && (
          <div className="bg-[#064e3b]/60 border border-amber-500/40 rounded-[32px] p-6 space-y-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#065f46]">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#fbbf24]" />
                <span>ملاحظات السلوك والتوجيه التربوي للحلقة ({studentViolations.length})</span>
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-[#fbbf24] border border-amber-500/30 font-bold">
                متابعة سلوكية وتربوية
              </span>
            </div>

            <div className="space-y-3">
              {studentViolations.map(viol => {
                const isResolved = viol.status === 'تم التوجيه والمعالجة';

                return (
                  <div
                    key={viol.id}
                    className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {viol.violationType}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            viol.severity === 'تنبيه'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {viol.severity}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#86efac]/80">
                        <span>تاريخ: {viol.date}</span>
                        {isResolved ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>تم التوجيه والمعالجة</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                            قيد المتابعة
                          </span>
                        )}
                      </div>
                    </div>

                    {viol.description && (
                      <div className="text-slate-200 leading-relaxed bg-[#064e3b]/30 p-2.5 rounded-xl border border-[#065f46]/50">
                        <strong className="text-[#86efac]">توجيه الشيخ وتفاصيل الملاحظة: </strong>
                        {viol.description}
                      </div>
                    )}

                    {viol.actionTaken && (
                      <div className="text-[#86efac]">
                        <strong className="text-emerald-300">الإجراء المتخذ: </strong>
                        {viol.actionTaken}
                      </div>
                    )}

                    {viol.messageText && (
                      <div className="text-slate-300 italic pt-1 border-t border-[#065f46]/60">
                        "{viol.messageText}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Portal Global Footer */}
        <footer className="mt-12 pt-6 border-t border-[#065f46]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#86efac]/70">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#fbbf24]" />
            <span className="font-bold text-white">{displayComplexName}</span>
          </div>
          <div className="flex items-center gap-2 text-center text-xs text-[#fbbf24] font-bold bg-[#064e3b]/80 px-3.5 py-1.5 rounded-full border border-amber-400/30 shadow-sm">
            <span>مشغل بواسطة منصة عمران</span>
          </div>
          <p className="text-[11px] text-[#86efac]/60">
            بوابة الطالب وولي الأمر • متابعة الحفظ والتسميع والاختبارات
          </p>
        </footer>

        {/* SMART GOOGLE FORM LAUNCH & PRE-FILL MODAL */}
        {googleFormModalData && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#022c22] border border-[#fbbf24]/60 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 text-right relative">
              <button
                onClick={() => setGoogleFormModalData(null)}
                className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-emerald-800/80 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-heading text-white">
                    بدء الاختبار عبر Google Forms
                  </h3>
                  <p className="text-xs text-[#fbbf24] font-bold mt-0.5">
                    {googleFormModalData.exam.title}
                  </p>
                </div>
              </div>

              {/* Student Identity Card & Auto-prefill Status */}
              <div className="p-4 rounded-2xl bg-[#064e3b]/60 border border-emerald-700/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-emerald-300 font-bold">
                    حسابك والاسم المعتمد في المنصة:
                  </span>
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(currentStudent.name);
                        setNameCopiedNotice(true);
                        setTimeout(() => setNameCopiedNotice(false), 3000);
                      }
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {nameCopiedNotice ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#fbbf24]" />
                        <span className="text-[#fbbf24] font-bold">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الاسم</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="text-base sm:text-lg font-black text-white font-heading bg-[#022c22] p-3 rounded-xl border border-emerald-600/50 flex items-center justify-between">
                    <span>{currentStudent.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                      مطابق لقوائم المركز
                    </span>
                  </div>
                  {currentStudent.googleEmail && (
                    <div className="text-xs text-emerald-300 bg-emerald-950/70 p-2 rounded-xl border border-emerald-700/50 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>الحساب المعتمد: <strong>{currentStudent.googleEmail}</strong></span>
                    </div>
                  )}
                </div>

                <div className="text-xs leading-relaxed text-emerald-100/90 pt-1">
                  <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-600/40">
                    <Sparkles className="w-4 h-4 text-[#fbbf24] shrink-0 mt-0.5" />
                    <span>
                      أجب على أسئلة النموذج بحسابك Google، وفور تسليمك اضغط على زر (احسب درجتي وسجلها) ليقوم النظام تلقائياً برصد درجتك دون الحاجة لمراجعة يدوية.
                    </span>
                  </div>
                </div>
              </div>

              {/* Automatic Scoring Feedback */}
              {googleScoreFeedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                    googleScoreFeedback.success
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                      : 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                  }`}
                >
                  {googleScoreFeedback.success ? (
                    <Award className="w-5 h-5 text-[#fbbf24] shrink-0" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">{googleScoreFeedback.message}</p>
                    {googleScoreFeedback.success && (
                      <p className="text-[11px] text-[#86efac]">
                        تم تحديث درجاتك في المنصة ولوحة الشرف بنجاح!
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => {
                    window.open(googleFormModalData.prefilledUrl, '_blank');
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-[#064e3b]" />
                  <span>1. فتح نموذج الاختبار في نافذة جديدة والبدء</span>
                </button>

                <button
                  onClick={() => handleCheckAndRecordGoogleScore(googleFormModalData.exam)}
                  disabled={isCheckingGoogleScore}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all disabled:opacity-60"
                >
                  {isCheckingGoogleScore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>جاري فحص إجاباتك من Google Forms وحساب الدرجة...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 text-emerald-200" />
                      <span>2. أنهيت الإرسال - احسب درجتي وسجلها تلقائياً الآن</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setGoogleFormModalData(null);
                    setGoogleScoreFeedback(null);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors text-center"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE FORM SUBMITTED CONFIRMATION MODAL */}
        {openedGoogleFormExam && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-[#fbbf24]" />
              </div>
              <h3 className="text-lg font-bold text-white">
                بارك الله فيك ونفع بك!
              </h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                تم تسجيل فتحك لاختبار <strong>"{openedGoogleFormExam.title}"</strong>.
                <br />
                فور تسليمك للنموذج، يمكنك الضغط على زر حساب الدرجة لتسجيلها تلقائياً في حسابك.
              </p>

              {googleScoreFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs text-right border ${
                    googleScoreFeedback.success
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                      : 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                  }`}
                >
                  {googleScoreFeedback.message}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => handleCheckAndRecordGoogleScore(openedGoogleFormExam)}
                  disabled={isCheckingGoogleScore}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isCheckingGoogleScore ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>جاري الفحص...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>احسب درجتي وسجلها الآن</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const url = openedGoogleFormExam.googleFormResponderUrl || openedGoogleFormExam.googleFormUrl;
                    if (url) window.open(url, '_blank');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح النموذج</span>
                </button>
                <button
                  onClick={() => {
                    setOpenedGoogleFormExam(null);
                    setGoogleScoreFeedback(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#fbbf24] text-[#064e3b] text-xs font-black cursor-pointer shadow-md hover:bg-[#f59e0b]"
                >
                  تم، العودة للحساب
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANDATORY GOOGLE AUTH GATEKEEPER MODAL BEFORE EXAM ENTRY */}
        {googleAuthGateExam && (
          <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#022c22] border border-[#fbbf24]/60 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-[#fbbf24] border border-[#fbbf24]/40 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white font-heading">
                تسجيل الدخول بـ Google مطلوب لدخول الاختبار
              </h3>

              <div className="p-3.5 rounded-2xl bg-[#064e3b]/70 border border-emerald-700/60 text-right space-y-2">
                <p className="text-xs text-emerald-100 font-semibold leading-relaxed">
                  أهلاً بك يا <strong>{currentStudent.name}</strong>! لدخول اختبار:
                  <span className="block text-[#fbbf24] font-bold mt-1 text-sm">"{googleAuthGateExam.title}"</span>
                </p>
                <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                  يشترط النظام تسجيل الدخول بحساب Google المعتمد لديك، حتى يتسنى التحقق من هويتك وتوثيق إجاباتك ورصد درجاتك في سجلك تلقائياً دون أي تدخل يدوي.
                </p>
              </div>

              {googleLinkError && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs text-right leading-relaxed">
                  {googleLinkError}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleLinkGoogleAccount(googleAuthGateExam)}
                  disabled={isLinkingGoogle}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLinkingGoogle ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-emerald-600 rounded-full animate-spin" />
                      <span>جاري التحقق بحساب Google...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>تسجيل الدخول والربط بحساب Google</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-emerald-300/80 text-center flex items-center justify-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
                  <span>بمجرد تسجيل الدخول بحساب Google، سيتم فتح الاختبار فوراً ورصد نتيجتك لحسابك تلقائياً.</span>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setGoogleAuthGateExam(null);
                    setGoogleLinkError('');
                  }}
                  disabled={isLinkingGoogle}
                  className="w-full py-2 px-4 rounded-xl text-emerald-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors mt-1"
                >
                  إلغاء والعودة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CERTIFICATE PREVIEW & PRINT MODAL FOR STUDENT / PARENT */}
        {selectedCertificateForView && (
          <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#022c22] border-2 border-[#fbbf24]/60 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 text-right relative flex flex-col">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/40 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-heading">
                      {selectedCertificateForView.templateName || 'شهادة تميز وإتقان قرآني'}
                    </h3>
                    <p className="text-xs text-[#fbbf24] font-bold">
                      الطالب: {selectedCertificateForView.studentName || currentStudent.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCertificateForView(null)}
                  className="p-2 rounded-xl text-emerald-300 hover:text-white bg-emerald-950/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Certificate Canvas / Card View */}
              <div
                id="portal-printable-certificate"
                className="relative w-full aspect-[1.414/1] rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col justify-between border-4 border-[#fbbf24] select-none text-center"
                style={{
                  background: selectedCertificateForView.templateType === 'custom' && selectedCertificateForView.customTemplateImageUrl
                    ? `url(${selectedCertificateForView.customTemplateImageUrl}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)',
                  color: '#f0f9f6'
                }}
              >
                {selectedCertificateForView.templateType === 'custom' && selectedCertificateForView.customTemplateImageUrl ? (
                  /* Custom template display with overlay student name */
                  <div className="w-full h-full flex flex-col justify-center items-center relative">
                    <div className="font-quran text-2xl sm:text-4xl md:text-5xl font-black text-[#064e3b] py-2">
                      {selectedCertificateForView.studentName || currentStudent.name}
                    </div>
                    {selectedCertificateForView.dateArabic && (
                      <div className="text-xs sm:text-sm text-slate-700 font-bold mt-2">
                        {selectedCertificateForView.dateArabic}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Ready-made emerald royal certificate */
                  <>
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="font-quran text-sm sm:text-lg text-[#fbbf24] font-bold">
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                      </div>
                      <div className="font-quran text-xs sm:text-sm text-emerald-200 opacity-90 px-4">
                        ﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾
                      </div>
                      <h1 className="font-heading font-black text-xl sm:text-3xl md:text-4xl text-[#fbbf24] mt-2 tracking-wide">
                        شَهَادَةُ تَمَيُّزٍ وَإِتْقَانٍ قُرْآنِيٍّ
                      </h1>
                    </div>

                    <div className="space-y-2 sm:space-y-3 my-auto py-2">
                      <p className="text-xs sm:text-sm text-emerald-200 font-semibold">
                        يَسُرُّ إِدَارَةَ الحِلْقَةِ أَنْ تَمْنَحَ هذِهِ الشَّهَادَةَ المُبَارَكَةَ لِلطَّالِبِ النَّجِيبِ:
                      </p>
                      <div className="font-quran text-2xl sm:text-4xl md:text-5xl font-black text-[#fbbf24] py-1">
                        {selectedCertificateForView.studentName || currentStudent.name}
                      </div>
                      <p className="text-xs sm:text-sm text-white/95 max-w-lg mx-auto leading-relaxed font-medium">
                        {selectedCertificateForView.occasionText || selectedCertificateForView.occasion || 'تقديراً لاجتهاده وحرصه المتميز في حفظ وتلاوة كتاب الله الكريم'}
                      </p>
                      <div className="text-[11px] text-[#86efac]">
                        {selectedCertificateForView.halaqahName && <span>الحلقة: <strong>{selectedCertificateForView.halaqahName}</strong> • </span>}
                        <span>المجمع: <strong>{selectedCertificateForView.complexName || displayComplexName}</strong></span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#fbbf24]/30 flex items-center justify-between text-[11px] sm:text-xs text-emerald-200">
                      <div className="text-right">
                        <span className="block text-[10px] text-emerald-400">معلم ومحفظ الحلقة:</span>
                        <span className="font-bold text-white">{selectedCertificateForView.teacherName || settings.teacherName || 'الشيخ المعلم'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[#fbbf24] font-bold">
                        {resolvedComplex?.stampUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={resolvedComplex.stampUrl} alt="ختم المجمع" className="w-10 h-10 object-contain rounded-full shadow-md" />
                            <span>ختم معتمد • {displayComplexName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Award className="w-4 h-4" />
                            <span>معتمد رسمياً • {displayComplexName}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-left">
                        <span className="block text-[10px] text-emerald-400">تاريخ الإصدار:</span>
                        <span className="font-bold text-white">{selectedCertificateForView.dateArabic || selectedCertificateForView.createdAt?.split('T')[0]}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-emerald-800">
                <button
                  type="button"
                  onClick={() => {
                    const printContent = document.getElementById('portal-printable-certificate');
                    if (printContent) {
                      const printWin = window.open('', '', 'width=900,height=650');
                      if (printWin) {
                        printWin.document.write(`
                          <html dir="rtl">
                            <head>
                              <title>شهادة - ${selectedCertificateForView.studentName || currentStudent.name}</title>
                              <style>
                                body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                                @page { size: A4 landscape; margin: 0; }
                              </style>
                            </head>
                            <body>
                              ${printContent.outerHTML}
                              <script>window.onload = function() { window.print(); window.close(); };<\/script>
                            </body>
                          </html>
                        `);
                        printWin.document.close();
                      } else {
                        window.print();
                      }
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#fbbf24] text-[#064e3b] font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer hover:bg-[#f59e0b]"
                >
                  <Award className="w-4 h-4" />
                  <span>طباعة الشهادة الرسمية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCertificateForView(null)}
                  className="px-4 py-2 rounded-xl bg-[#064e3b] text-emerald-200 font-bold text-xs hover:text-white cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
