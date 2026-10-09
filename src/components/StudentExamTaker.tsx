import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Clock,
  Hourglass,
  Timer,
  Check,
  Zap,
  Info,
  Layers,
  ArrowRight,
  ListChecks,
  BookmarkCheck
} from 'lucide-react';
import { Exam, ExamQuestion, ExamSubmission, ExamSubmissionAnswer, Student } from '../types';

interface StudentExamTakerProps {
  exam: Exam;
  student: Student;
  currentAttemptNumber: number;
  onFinishSubmission: (submission: ExamSubmission) => Promise<void>;
  onCancel: () => void;
}

// Fallback questions in case an exam was created without questions
const FALLBACK_QUESTIONS: ExamQuestion[] = [
  {
    id: 'q-fb-1',
    title: 'ما هي السورة التي تُسمى بـ (أم الكتاب) و (السبع المثاني)؟',
    type: 'multiple_choice',
    options: ['سورة الفاتحة', 'سورة البقرة', 'سورة الإخلاص', 'سورة يس'],
    correctAnswer: 'سورة الفاتحة',
    points: 5,
    explanation: 'سورة الفاتحة هي أم الكتاب والسبع المثاني والقرآن العظيم.'
  },
  {
    id: 'q-fb-2',
    title: 'حكم النون الساكنة في قوله تعالى: (مِن بَعْدِ) هو الإقلاب.',
    type: 'true_false',
    options: ['صح', 'خطأ'],
    correctAnswer: 'صح',
    points: 5,
    explanation: 'تُقلب النون الساكنة ميماً مخفاة بغنة إذا جاء بعدها حرف الباء.'
  },
  {
    id: 'q-fb-3',
    title: 'كم عدد أجزاء القرآن الكريم؟',
    type: 'multiple_choice',
    options: ['30 جزءاً', '60 جزءاً', '114 جزءاً', '25 جزءاً'],
    correctAnswer: '30 جزءاً',
    points: 5,
    explanation: 'يتكون القرآن الكريم من 30 جزءاً و 114 سورة مباركة.'
  }
];

export const StudentExamTaker: React.FC<StudentExamTakerProps> = ({
  exam,
  student,
  currentAttemptNumber,
  onFinishSubmission,
  onCancel
}) => {
  // Normalize Questions to guarantee every question has an ID, options array, title, and points
  const questions: ExamQuestion[] = useMemo(() => {
    const rawList = Array.isArray(exam.questions) && exam.questions.length > 0
      ? exam.questions
      : typeof exam.questions === 'object' && exam.questions !== null
      ? Object.values(exam.questions)
      : [];

    if (rawList.length === 0) {
      return FALLBACK_QUESTIONS;
    }

    return rawList.map((q: any, idx: number) => ({
      id: q?.id || `q-${exam.id || 'exam'}-${idx + 1}`,
      title: q?.title || `السؤال رقم ${idx + 1}`,
      type: q?.type || 'multiple_choice',
      options: Array.isArray(q?.options) && q.options.length > 0
        ? q.options
        : q?.type === 'true_false'
        ? ['صح', 'خطأ']
        : ['الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4'],
      correctAnswer: q?.correctAnswer !== undefined ? q.correctAnswer : (q?.type === 'true_false' ? 'صح' : undefined),
      points: Number(q?.points) || 5,
      explanation: q?.explanation || '',
      timeLimitSeconds: q?.timeLimitSeconds ? Number(q.timeLimitSeconds) : undefined
    }));
  }, [exam]);

  const totalQuestions = questions.length;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<ExamSubmission | null>(null);
  const [timeExpiredAlert, setTimeExpiredAlert] = useState<string | null>(null);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const [isConfirmingSubmitModal, setIsConfirmingSubmitModal] = useState(false);

  // 1. Total Exam Timer
  const isTotalTimeMode = exam.timeLimitMode === 'total' || (!exam.timeLimitMode && (exam.totalTimeMinutes || 0) > 0);
  const allocatedMinutes = exam.totalTimeMinutes || 10;
  const totalAllocatedSeconds = allocatedMinutes * 60;
  const [totalSecondsLeft, setTotalSecondsLeft] = useState<number>(totalAllocatedSeconds);

  // 2. Per-Question Timer
  const isPerQuestionMode = exam.timeLimitMode === 'per_question';
  const getQuestionDuration = useCallback((qIndex: number) => {
    if (!questions[qIndex]) return 30;
    return questions[qIndex].timeLimitSeconds || exam.questionTimeSeconds || 30;
  }, [questions, exam.questionTimeSeconds]);

  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number>(() =>
    isPerQuestionMode ? getQuestionDuration(0) : 0
  );

  // 3. Open-ended Elapsed Stopwatch Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const currentQuestion = questions[currentQuestionIndex] || questions[0];

  const answersMapRef = useRef(answersMap);
  answersMapRef.current = answersMap;

  // Format MM:SS helper
  const formatTime = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Submission execution
  const executeSubmission = useCallback(async (forcedReason?: string) => {
    if (isSubmitting || isCompleted) return;
    setIsSubmitting(true);

    try {
      let totalEarned = 0;
      let hasPendingEssay = false;

      const currentAnswers = answersMapRef.current;
      const submissionAnswers: ExamSubmissionAnswer[] = questions.map(q => {
        const studentAns = (currentAnswers[q.id] || '').trim();
        let isCorrect = false;
        let pointsEarned = 0;
        let isAutoGraded = false;

        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          isAutoGraded = true;
          if (q.correctAnswer !== undefined && studentAns.toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
            isCorrect = true;
            pointsEarned = q.points;
            totalEarned += q.points;
          }
        } else {
          hasPendingEssay = true;
          isAutoGraded = false;
          pointsEarned = 0;
        }

        return {
          questionId: q.id,
          questionTitle: q.title,
          questionType: q.type,
          studentAnswer: studentAns,
          isAutoGraded,
          isCorrect: isAutoGraded ? isCorrect : undefined,
          pointsEarned,
          maxPoints: q.points
        };
      });

      const maxPossibleScore = exam.totalPoints || questions.reduce((s, q) => s + q.points, 0) || 100;
      const percentage = Math.round((totalEarned / maxPossibleScore) * 100);

      const submission: ExamSubmission = {
        id: `sub-${exam.id}-${student.id}-${Date.now()}`,
        examId: exam.id,
        examTitle: exam.title,
        studentId: student.id,
        studentName: student.name,
        googleEmail: student.googleEmail,
        googleUid: student.googleUid,
        halaqahId: student.halaqahId || '',
        halaqahName: student.halaqahName || 'الحلقة',
        attemptNumber: currentAttemptNumber,
        answers: submissionAnswers,
        totalScoreEarned: totalEarned,
        maxPossibleScore,
        percentage,
        pointsGrantedForLeaderboard: exam.grantsLeaderboardPoints ? totalEarned : 0,
        status: hasPendingEssay ? 'needs_grading' : 'completed',
        submittedAt: new Date().toISOString()
      };

      await onFinishSubmission(submission);
      setSubmittedResult(submission);
      setIsCompleted(true);
      if (forcedReason) {
        setTimeExpiredAlert(forcedReason);
      }
    } catch (e: any) {
      console.error('Error submitting exam:', e);
      alert('حدث خطأ أثناء حفظ الإجابات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
      setIsConfirmingSubmitModal(false);
    }
  }, [exam, student, currentAttemptNumber, questions, isSubmitting, isCompleted, onFinishSubmission]);

  // Total Timer Countdown Effect
  useEffect(() => {
    if (!isTotalTimeMode || isCompleted) return;

    const interval = setInterval(() => {
      setTotalSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          executeSubmission('انتهى الوقت المحدد للاختبار! تم تسليم كافة إجاباتك تلقائياً.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTotalTimeMode, isCompleted, executeSubmission]);

  // Per-Question Countdown Effect
  useEffect(() => {
    if (!isPerQuestionMode || isCompleted) return;

    setQuestionSecondsLeft(getQuestionDuration(currentQuestionIndex));

    const interval = setInterval(() => {
      setQuestionSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(idx => idx + 1);
          } else {
            executeSubmission('انتهى الوقت المخصص لآخر سؤال، وتم تسليم الاختبار.');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPerQuestionMode, currentQuestionIndex, totalQuestions, isCompleted, getQuestionDuration, executeSubmission]);

  // Elapsed Timer Effect
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  // Answer handler
  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswersMap(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Progress calculations
  const answeredCount = Object.keys(answersMap).filter(k => answersMap[k]?.trim()).length;
  const remainingQuestionsCount = Math.max(0, totalQuestions - answeredCount);
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Timer warnings & progress
  const totalTimeWarning = isTotalTimeMode && totalSecondsLeft <= 60;
  const totalTimeUrgent = isTotalTimeMode && totalSecondsLeft <= 30;
  const questionTimeWarning = isPerQuestionMode && questionSecondsLeft <= 10;
  const currentQDuration = isPerQuestionMode ? getQuestionDuration(currentQuestionIndex) : 30;
  const questionProgress = isPerQuestionMode ? (questionSecondsLeft / currentQDuration) * 100 : 100;
  const totalTimeProgress = isTotalTimeMode ? (totalSecondsLeft / totalAllocatedSeconds) * 100 : 100;

  // Manual submit trigger
  const handleOpenSubmitConfirm = () => {
    setIsConfirmingSubmitModal(true);
  };

  // Completed / Success Screen
  if (isCompleted && submittedResult) {
    const showScore = exam.gradeVisibility === 'immediate';

    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-10 rounded-[32px] bg-[#022c22] border-2 border-[#fbbf24] text-center space-y-6 shadow-2xl relative overflow-hidden" dir="rtl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#fbbf24]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#064e3b] flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 animate-bounce font-black">
            <Sparkles className="w-10 h-10" />
          </div>

          {timeExpiredAlert && (
            <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-[#fbbf24] shrink-0" />
              <span>{timeExpiredAlert}</span>
            </div>
          )}

          <div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-[#86efac] font-bold border border-emerald-500/30">
              تم التسليم السحابي بنجاح
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold font-heading text-white mt-3">
              بارك الله فيك يا {student.name}!
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200/90 mt-1.5">
              تم تسجيل إجاباتك ومحاولتك رقم #{currentAttemptNumber} لاختبار: <strong className="text-[#fbbf24]">{exam.title}</strong>
            </p>
          </div>

          {showScore ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#064e3b]/80 border border-[#065f46] space-y-3 shadow-inner">
              <span className="text-xs text-emerald-300 font-bold block">النتيجة والدرجة المحصلة</span>
              <div className="text-5xl font-black text-[#fbbf24] font-heading">
                {submittedResult.totalScoreEarned}{' '}
                <span className="text-xl font-medium text-emerald-300">/ {submittedResult.maxPossibleScore}</span>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-xs px-3 py-1 rounded-xl bg-[#022c22] text-[#86efac] font-bold border border-[#065f46]">
                  النسبة المئوية: {submittedResult.percentage}%
                </span>
                {exam.grantsLeaderboardPoints && (
                  <span className="text-xs px-3 py-1 rounded-xl bg-amber-500/20 text-[#fbbf24] font-bold border border-amber-500/30 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>+{submittedResult.totalScoreEarned} نقطة باللوحة</span>
                  </span>
                )}
              </div>
              {submittedResult.status === 'needs_grading' && (
                <p className="text-[11px] text-amber-200 pt-2 border-t border-emerald-800/80">
                  ملاحظة: يحتوي الاختبار على أسئلة مقالية ستُضاف درجاتها فور اعتماد المعلم.
                </p>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#064e3b]/60 border border-emerald-800 text-xs text-emerald-200 space-y-1">
              <p className="font-bold text-white">تم حفظ الاختبار لدى المعلم</p>
              <p>ستظهر الدرجة والتقييم في لوحتك فور مراجعة المعلم واعتماد النتائج.</p>
            </div>
          )}

          <div className="pt-3">
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-sm transition-all cursor-pointer shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 mx-auto"
            >
              <span>العودة إلى لوحة الطالب</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Arabic choice letter mapping
  const choiceLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

  return (
    <div className="max-w-4xl mx-auto rounded-[32px] bg-[#022c22] border border-[#065f46] shadow-2xl overflow-hidden relative" dir="rtl">
      {/* 1. TOP DEDICATED TIMER & STATUS BAR (HUD) */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-b border-[#065f46] space-y-4">
        {/* Main Title & Student Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/30">
                المحاولة #{currentAttemptNumber}
              </span>
              <span className="text-xs text-[#86efac] font-bold">
                الطالب: {student.name}
              </span>
              <span className="text-[10px] text-emerald-300/80 bg-[#022c22] px-2 py-0.5 rounded-full border border-emerald-800">
                {student.halaqahName || 'حلقة القرآن'}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold font-heading text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#fbbf24]" />
              <span>{exam.title}</span>
            </h2>
          </div>

          <button
            onClick={() => setIsConfirmingExit(true)}
            className="self-start sm:self-center text-xs text-emerald-300/90 hover:text-rose-300 border border-emerald-700/60 hover:border-rose-500/50 bg-[#022c22]/80 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            إلغاء وخروج
          </button>
        </div>

        {/* PROMINENT LIVE COUNTDOWN & "كم باقي" METRICS HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Box 1: Active Timer */}
          <div
            className={`p-3 rounded-2xl border flex flex-col justify-center transition-all ${
              totalTimeUrgent
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse shadow-lg shadow-rose-950/50'
                : totalTimeWarning
                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                : 'bg-[#064e3b]/80 border-emerald-700/70 text-emerald-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold opacity-90 mb-0.5">
              <span className="flex items-center gap-1">
                <Clock className={`w-3.5 h-3.5 ${totalTimeWarning ? 'text-rose-400' : 'text-[#fbbf24]'}`} />
                <span>{isTotalTimeMode ? 'الوقت المتبقي:' : isPerQuestionMode ? 'وقت السؤال:' : 'الوقت المنقضي:'}</span>
              </span>
              {isTotalTimeMode && (
                <span className="text-[10px] text-emerald-300">من {allocatedMinutes} د</span>
              )}
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tracking-wider text-[#fbbf24]">
              {isTotalTimeMode
                ? formatTime(totalSecondsLeft)
                : isPerQuestionMode
                ? `${questionSecondsLeft} ثانية`
                : formatTime(elapsedSeconds)}
            </div>
          </div>

          {/* Box 2: Current Question Info */}
          <div className="p-3 rounded-2xl bg-[#064e3b]/80 border border-emerald-700/70 text-emerald-100 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#86efac] mb-0.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>السؤال الحالي:</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-white">
              {currentQuestionIndex + 1} <span className="text-xs font-normal text-emerald-300">من أصل {totalQuestions}</span>
            </div>
          </div>

          {/* Box 3: Questions Remaining ("كم باقي") */}
          <div className="p-3 rounded-2xl bg-[#064e3b]/80 border border-emerald-700/70 text-emerald-100 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#86efac] mb-0.5">
              <Hourglass className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>المتبقي للإجابة:</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-[#fbbf24]">
              {remainingQuestionsCount === 0 ? (
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>اكتملت الإجابات</span>
                </span>
              ) : (
                <span>{remainingQuestionsCount} أسئلة متبقية</span>
              )}
            </div>
          </div>

          {/* Box 4: Total Answered & Percentage */}
          <div className="p-3 rounded-2xl bg-[#064e3b]/80 border border-emerald-700/70 text-emerald-100 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#86efac] mb-0.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>نسبة الإنجاز:</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-white">
              {progressPercent}% <span className="text-xs font-normal text-emerald-300">({answeredCount}/{totalQuestions})</span>
            </div>
          </div>
        </div>

        {/* Active Progress Bars */}
        <div className="space-y-1.5">
          {/* Exam Completion Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#022c22] border border-emerald-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#fbbf24] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Question or Total Time Progress Bar */}
          {isTotalTimeMode && (
            <div className="w-full h-1 rounded-full bg-emerald-950 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  totalTimeUrgent ? 'bg-rose-500' : totalTimeWarning ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${totalTimeProgress}%` }}
              />
            </div>
          )}

          {isPerQuestionMode && (
            <div className="w-full h-1 rounded-full bg-emerald-950 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  questionTimeWarning ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${questionProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. QUESTION BODY CONTAINER */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Question Header Card */}
        <div className="bg-[#064e3b]/50 border border-[#065f46] rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-xl bg-[#fbbf24] text-[#064e3b] font-black">
                السؤال {currentQuestionIndex + 1}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-900/80 text-emerald-200 border border-emerald-700 font-bold">
                {currentQuestion.type === 'multiple_choice'
                  ? 'اختيار من متعدد'
                  : currentQuestion.type === 'true_false'
                  ? 'صح أو خطأ'
                  : 'سؤال كتابي'}
              </span>
            </div>

            <span className="text-xs font-bold text-[#fbbf24] bg-[#022c22] px-3 py-1 rounded-xl border border-emerald-800">
              الدرجة: {currentQuestion.points} درجات
            </span>
          </div>

          <h3 className="text-base sm:text-xl font-bold font-heading text-white leading-relaxed pt-2">
            {currentQuestion.title}
          </h3>
        </div>

        {/* Question Choices & Input Areas */}
        <div className="space-y-4">
          {/* A. MULTIPLE CHOICE */}
          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-emerald-300 block">
                اختر إجابة واحدة صحيحة مما يلي:
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {(currentQuestion.options || []).map((option, idx) => {
                  const isSelected = answersMap[currentQuestion.id] === option;
                  const letter = choiceLetters[idx] || `${idx + 1}`;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, option)}
                      className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24] shadow-lg shadow-amber-500/20 font-bold scale-[1.01]'
                          : 'bg-[#064e3b]/30 hover:bg-[#064e3b]/70 border-emerald-800/80 text-emerald-100 hover:border-emerald-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected
                              ? 'bg-[#064e3b] text-[#fbbf24]'
                              : 'bg-[#022c22] text-emerald-300 border border-emerald-700'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold">{option}</span>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#064e3b] bg-[#064e3b] text-[#fbbf24]' : 'border-emerald-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. TRUE / FALSE */}
          {currentQuestion.type === 'true_false' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-emerald-300 block">
                حدد صحة العبارة التالية:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['صح', 'خطأ'].map(val => {
                  const isSelected = answersMap[currentQuestion.id] === val;
                  const isTrue = val === 'صح';

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, val)}
                      className={`p-5 rounded-2xl border-2 text-center transition-all flex items-center justify-center gap-3 cursor-pointer ${
                        isSelected
                          ? isTrue
                            ? 'bg-emerald-500 text-[#022c22] border-emerald-400 font-black shadow-lg shadow-emerald-500/20'
                            : 'bg-rose-500 text-white border-rose-400 font-black shadow-lg shadow-rose-500/20'
                          : 'bg-[#064e3b]/40 hover:bg-[#064e3b]/80 border-emerald-800 text-emerald-100'
                      }`}
                    >
                      {isTrue ? (
                        <CheckCircle2 className={`w-5 h-5 ${isSelected ? 'text-[#022c22]' : 'text-emerald-400'}`} />
                      ) : (
                        <XCircle className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-rose-400'}`} />
                      )}
                      <span className="text-base font-bold">{val}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* C. ESSAY / SHORT ANSWER */}
          {(currentQuestion.type === 'essay' || currentQuestion.type === 'short_answer') && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-300 block">
                اكتب إجابتك الواضحة هنا:
              </label>
              <textarea
                rows={currentQuestion.type === 'essay' ? 4 : 2}
                placeholder="اكتب إجابتك هنا بدقة وتأنٍ..."
                value={answersMap[currentQuestion.id] || ''}
                onChange={e => handleSelectAnswer(currentQuestion.id, e.target.value)}
                className="w-full p-4 rounded-2xl bg-[#064e3b]/50 border border-[#065f46] text-white text-xs sm:text-sm focus:border-[#fbbf24] focus:outline-none transition-all placeholder:text-emerald-300/40"
              />
              <div className="flex items-center justify-between text-[11px] text-emerald-300/70 px-1">
                <span className="flex items-center gap-1">
                  {answersMap[currentQuestion.id]?.trim() ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
                      <span className="text-[#fbbf24] font-semibold">تم حفظ المسودة</span>
                    </>
                  ) : (
                    <span>في انتظار الإجابة</span>
                  )}
                </span>
                <span>{answersMap[currentQuestion.id]?.length || 0} حرف</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. QUICK NAVIGATION MAP & FOOTER */}
      <div className="p-5 sm:p-6 bg-[#022c22] border-t border-[#065f46] space-y-4">
        {/* Question Numbers Grid (Jump Directly) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#86efac] flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>خريطة الأسئلة:</span>
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[240px] sm:max-w-md scrollbar-none">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answersMap[q.id]?.trim());
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                    isCurrent
                      ? 'bg-[#fbbf24] text-[#064e3b] font-black ring-2 ring-[#fbbf24]/50 shadow-md scale-105'
                      : isAnswered
                      ? 'bg-emerald-600 text-white border border-emerald-400'
                      : 'bg-[#064e3b]/60 text-emerald-400 border border-emerald-800 hover:border-emerald-600'
                  }`}
                  title={`السؤال ${idx + 1}: ${isAnswered ? 'تمت الإجابة' : 'لم تتم الإجابة بعد'}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#064e3b]/80 text-emerald-200 hover:text-white disabled:opacity-40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-emerald-700/50"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السؤال السابق</span>
          </button>

          <div className="flex items-center gap-2">
            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-950/30"
              >
                <span>السؤال التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : null}

            {/* Persistent Final Submit Button */}
            <button
              onClick={handleOpenSubmitConfirm}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                currentQuestionIndex === totalQuestions - 1 || answeredCount === totalQuestions
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-[#022c22] shadow-emerald-500/20 animate-pulse'
                  : 'bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'جارٍ التسليم...' : 'إنهاء وتسليم الاختبار'}</span>
            </button>
          </div>
        </div>

        {/* Global Footer Indicator */}
        <div className="pt-2 flex items-center justify-center">
          <span className="text-[11px] text-[#fbbf24] bg-[#064e3b]/50 px-3.5 py-1 rounded-full border border-emerald-800 font-bold">
            مشغل بواسطة منصة عمران
          </span>
        </div>
      </div>

      {/* 4. CONFIRM SUBMISSION MODAL */}
      {isConfirmingSubmitModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-5 text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-[#fbbf24] flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">تأكيد إنهاء وتسليم الاختبار</h3>
              <p className="text-xs text-emerald-200/90 mt-2 leading-relaxed">
                لقد أجبت عن <strong className="text-[#fbbf24]">{answeredCount}</strong> من أصل{' '}
                <strong className="text-white">{totalQuestions}</strong> أسئلة.
              </p>
              {remainingQuestionsCount > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-bold">
                  تنبيه: يوجد {remainingQuestionsCount} أسئلة لم تُجب عليها بعد!
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingSubmitModal(false)}
                className="flex-1 py-3 rounded-xl bg-emerald-900/60 text-emerald-200 text-xs font-bold hover:bg-emerald-900 cursor-pointer"
              >
                متابعة الحل
              </button>
              <button
                type="button"
                onClick={() => executeSubmission()}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg cursor-pointer transition-all"
              >
                {isSubmitting ? 'جارٍ التسليم...' : 'نعم، تسليم الاختبار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM EXIT MODAL */}
      {isConfirmingExit && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border border-amber-500/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-base font-bold text-white">تأكيد الخروج من الاختبار</h3>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              هل ترغب بالخروج وإلغاء هذه المحاولة؟ لن تُحفظ درجتك ما لم يتم تسليم الاختبار.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingExit(false)}
                className="px-4 py-2 rounded-xl bg-emerald-900/60 text-emerald-200 text-xs font-bold cursor-pointer"
              >
                متابعة الاختبار
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingExit(false);
                  onCancel();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                تأكيد الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
