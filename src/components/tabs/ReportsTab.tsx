import React, { useState, useMemo } from 'react';
import {
  Award,
  Calendar,
  Sparkles,
  Printer,
  FileText,
  User,
  Sliders,
  BarChart3,
  BookOpen,
  Phone,
  Layers,
  ClipboardList,
  CheckCircle2,
  X,
  Filter,
  Check,
  TrendingUp,
  Clock,
  ShieldCheck,
  UserCheck,
  UserX,
  Trophy,
  ChevronLeft,
  MessageSquare,
  Send,
  Copy
} from 'lucide-react';
import { Student, AttendanceRecord, StudentEvaluation, AppSettings, getStudentParentPhone, QuranComplex, LibraryDocument } from '../../types';
import { getSurahInfo } from '../../data/quranData';
import { calculateStudentCompletedPages } from '../../data/quranPagesData';
import { ReportsChartsView } from './ReportsChartsView';
import {
  PrintableQuranicReport,
  ReportDocumentType,
  CustomReportFields
} from '../reports/PrintableQuranicReport';

interface ReportsTabProps {
  students: Student[];
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  settings: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => Promise<void>;
  teacherName?: string;
  activeComplex?: QuranComplex | null;
  certificates?: any[];
  onSaveLibraryDoc?: (doc: LibraryDocument) => Promise<void>;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  students,
  attendance,
  evaluations,
  settings,
  onUpdateSettings,
  teacherName,
  activeComplex,
  onSaveLibraryDoc
}) => {
  const [workDays, setWorkDays] = useState<number>(settings.workDaysPerWeek || 5);

  // Modal 1: Comprehensive Single Student Profile Modal
  const [detailedStudent, setDetailedStudent] = useState<Student | null>(null);

  // Modal 2: Custom Report Builder Modal
  const [isCustomReportModalOpen, setIsCustomReportModalOpen] = useState(false);
  const [customReportTargetMode, setCustomReportTargetMode] = useState<'all' | 'multiple' | 'single'>('all');
  const [customSelectedStudentIds, setCustomSelectedStudentIds] = useState<string[]>([]);
  const [customSingleStudentId, setCustomSingleStudentId] = useState<string>(students[0]?.id || '');
  const [customReportTimeframe, setCustomReportTimeframe] = useState<'comprehensive' | 'monthly' | 'weekly'>('comprehensive');
  const [customFields, setCustomFields] = useState<CustomReportFields>({
    includeAttendance: true,
    includeMemorization: true,
    includeEvaluations: true,
    includeParentPhone: true,
    includePagesAndVerses: true,
    includeTeacherNotes: true
  });

  // Modal 3: Printable Quranic Report (PDF Preview & Print)
  const [printDocumentType, setPrintDocumentType] = useState<ReportDocumentType | null>(null);
  const [studentForPrint, setStudentForPrint] = useState<Student | undefined>(undefined);
  const [targetStudentIdsForPrint, setTargetStudentIdsForPrint] = useState<string[]>([]);

  // Modal 4: Text Message Export
  const [isTextMessageModalOpen, setIsTextMessageModalOpen] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState('');
  const [textMessageStudent, setTextMessageStudent] = useState<Student | null>(null);
  const [textMessageCopied, setTextMessageCopied] = useState(false);

  // Search in Student Roster
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Save work days setting
  const handleSaveWorkDays = async (days: number) => {
    setWorkDays(days);
    if (onUpdateSettings) {
      await onUpdateSettings({
        ...settings,
        workDaysPerWeek: days
      });
    }
  };

  // Helper to get latest recitations for a student
  const getStudentLatestRecitations = (std: Student) => {
    const studentEvals = evaluations
      .filter(e => e.studentId === std.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const latest = studentEvals[0];
    const sInfo = getSurahInfo(std.currentSurah || 78);

    const todayNew = latest?.recitationDetails?.todayNewItem;
    let latestNew = latest?.recitationDetails?.newMemorizationAchieved || `سورة ${std.currentSurahName || sInfo.name} (${std.currentAyah || 1})`;
    if (todayNew) {
      const s1 = getSurahInfo(todayNew.surahNumber || 78);
      const s2 = todayNew.toSurahNumber ? getSurahInfo(todayNew.toSurahNumber) : s1;
      if (todayNew.toSurahNumber && todayNew.toSurahNumber !== todayNew.surahNumber) {
        latestNew = `من سورة ${s1.name} (آية ${todayNew.fromAyah || 1}) إلى سورة ${s2.name} (آية ${todayNew.toAyah || 1})`;
      } else {
        latestNew = `سورة ${s1.name} (${todayNew.fromAyah || 1}-${todayNew.toAyah || 1})`;
      }
    }

    const latestReview = latest?.recitationDetails?.todayReviewItems && latest.recitationDetails.todayReviewItems.length > 0
      ? latest.recitationDetails.todayReviewItems.map(item => {
          const s1 = getSurahInfo(item.surahNumber || 78);
          const s2 = item.toSurahNumber ? getSurahInfo(item.toSurahNumber) : s1;
          if (item.toSurahNumber && item.toSurahNumber !== item.surahNumber) {
            return `من سورة ${s1.name} (آية ${item.fromAyah || 1}) إلى سورة ${s2.name} (آية ${item.toAyah || 1})`;
          }
          return `سورة ${s1.name} (${item.fromAyah || 1}-${item.toAyah || 1})`;
        }).join(' • ')
      : latest?.recitationDetails?.reviewAchieved || 'المراجعة المقررة';

    return {
      name: std.name,
      parentPhone: getStudentParentPhone(std),
      latestNew,
      latestNewDate: latest?.date || '',
      latestReview,
      latestReviewDate: latest?.date || ''
    };
  };

  // Open single student print
  const handlePrintSingleStudent = (std: Student) => {
    setStudentForPrint(std);
    setPrintDocumentType('individual');
  };

  // Generate formatted Arabic text report for WhatsApp or copying
  const handleGenerateTextMessage = (std?: Student) => {
    const today = new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());

    const timeframeLabel = customReportTimeframe === 'weekly'
      ? 'التقرير الأسبوعي'
      : (customReportTimeframe === 'monthly' ? 'التقرير الشهري' : 'السجل القرآني الشامل');

    const complex = activeComplex?.name || settings.complexName || 'مجمع تحفيظ القرآن الكريم';
    const teacher = teacherName || settings.teacherName || 'معلم الحلقة';

    let msg = `🌿 *${timeframeLabel}* 🌿\n`;
    msg += `🏛️ ${complex}\n`;
    msg += `📅 تاريخ التقرير: ${today}\n`;
    msg += `👨‍🏫 إشراف المعلم: ${teacher}\n`;
    msg += `------------------------------------\n\n`;

    let targetList: Student[] = [];
    if (std) {
      targetList = [std];
    } else if (customReportTargetMode === 'single') {
      const found = students.find(s => s.id === customSingleStudentId) || students[0];
      if (found) targetList = [found];
    } else if (customReportTargetMode === 'selected') {
      targetList = students.filter(s => customSelectedStudentIds.includes(s.id));
    } else {
      targetList = students;
    }

    targetList.forEach((st, idx) => {
      const parentPhone = getStudentParentPhone(st);
      const recData = getStudentLatestRecitations(st);
      const stAtt = attendance.filter(a => a.studentId === st.id);
      const pres = stAtt.filter(a => a.status === 'حاضر').length;
      const abs = stAtt.filter(a => a.status === 'غائب').length;
      const attPct = stAtt.length > 0 ? Math.round((pres / stAtt.length) * 100) : 100;
      const pagesInfo = calculateStudentCompletedPages(st, evaluations);
      const latestEval = evaluations.find(e => e.studentId === st.id);
      const evalScore = latestEval ? (Object.values(latestEval.criteriaValues || {})[0] || 'متقن') : 'منتظم';

      msg += `⭐ *الطالب (${idx + 1}): ${st.name}*\n`;
      msg += `📖 الحلقة: ${st.halaqahName || settings.halaqahName}\n`;

      if (customFields.includeMemorization) {
        msg += `• الحفظ الجديد: ${recData.latestNew}\n`;
        msg += `• المراجعة والتثبيت: ${recData.latestReview}\n`;
      }
      if (customFields.includePagesAndVerses) {
        msg += `• إجمالي الأوجه المنجزة: ${pagesInfo.totalPagesCount} وجه | النقاط: ${st.points || 0} نقطة\n`;
      }
      if (customFields.includeAttendance) {
        msg += `• نسبة المواظبة: ${attPct}% (حاضر: ${pres} ، غائب: ${abs})\n`;
      }
      if (customFields.includeEvaluations) {
        msg += `• مستوى التقييم والإتقان: ${evalScore}\n`;
      }
      if (customFields.includeTeacherNotes && (latestEval?.recitationDetails?.teacherNotes || st.notes)) {
        msg += `• توجيهات المعلم: ${latestEval?.recitationDetails?.teacherNotes || st.notes}\n`;
      }
      if (customFields.includeParentPhone && parentPhone) {
        msg += `• هاتف ولي الأمر: ${parentPhone}\n`;
      }
      msg += `\n`;
    });

    msg += `------------------------------------\n`;
    msg += `✅ *معتمد إلكترونياً* من إدارة ${complex}\n`;
    msg += `﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾`;

    setGeneratedReportText(msg);
    setTextMessageStudent(std || (targetList.length === 1 ? targetList[0] : null));
    setIsTextMessageModalOpen(true);
    setTextMessageCopied(false);
  };

  // Open custom builder print
  const handlePrintCustomReport = () => {
    let resolvedIds: string[] = [];
    if (customReportTargetMode === 'all') {
      resolvedIds = students.map(s => s.id);
    } else if (customReportTargetMode === 'single') {
      resolvedIds = customSingleStudentId ? [customSingleStudentId] : (students[0] ? [students[0].id] : []);
    } else {
      resolvedIds = customSelectedStudentIds.length > 0 ? customSelectedStudentIds : students.map(s => s.id);
    }

    setTargetStudentIdsForPrint(resolvedIds);
    if (customReportTargetMode === 'single' && resolvedIds[0]) {
      const single = students.find(s => s.id === resolvedIds[0]);
      setStudentForPrint(single);
      setPrintDocumentType('individual');
    } else {
      setPrintDocumentType('custom');
    }
    setIsCustomReportModalOpen(false);
  };

  // Filtered students for roster
  const filteredRosterStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    const q = studentSearchQuery.trim().toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.currentSurahName && s.currentSurahName.toLowerCase().includes(q)) ||
      getStudentParentPhone(s).includes(q)
    );
  }, [students, studentSearchQuery]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACTION BAR                                               */}
      {/* ========================================================================= */}
      <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#fbbf24]" />
            <span>التقارير الإحصائية والرسوم التوضيحية للحلقة القرآنية</span>
          </h2>
          <p className="text-xs text-[#86efac]/90 mt-1">
            الرسوم البيانية المباشرة، سجلات الطلاب الفردية الشاملة، وأداة استخراج تقارير PDF الفاخرة المخصصة
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Custom Report Builder Button */}
          <button
            type="button"
            onClick={() => {
              setCustomSelectedStudentIds(students.map(s => s.id));
              setIsCustomReportModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] border border-[#fbbf24] text-xs font-black flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#064e3b]" />
            <span>أداة استخراج تقارير PDF مخصصة</span>
          </button>

          {/* Schedule Settings: Work Days */}
          <div className="flex items-center gap-1.5 bg-[#022c22] border border-[#fbbf24]/30 px-3 py-1.5 rounded-2xl text-xs shadow-inner">
            <span className="text-[#86efac] font-bold text-[11px]">أيام الحلقة:</span>
            <button
              onClick={() => handleSaveWorkDays(4)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                workDays === 4
                  ? 'bg-[#fbbf24] text-[#064e3b] shadow-sm font-black'
                  : 'text-[#f0f9f6]/70 hover:text-white'
              }`}
            >
              4 أيام
            </button>
            <button
              onClick={() => handleSaveWorkDays(5)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                workDays === 5
                  ? 'bg-[#fbbf24] text-[#064e3b] shadow-sm font-black'
                  : 'text-[#f0f9f6]/70 hover:text-white'
              }`}
            >
              5 أيام
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE CHARTS & VISUAL ANALYTICS VIEW                             */}
      {/* ========================================================================= */}
      <ReportsChartsView
        students={students}
        evaluations={evaluations}
        attendance={attendance}
        settings={settings}
      />

      {/* ========================================================================= */}
      {/* 3. STUDENT ROSTER CARDS (Click any student for full record & PDF export)  */}
      {/* ========================================================================= */}
      <div className="bg-[#022c22]/90 border border-[#065f46] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#065f46]">
          <div>
            <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <User className="w-5 h-5 text-[#fbbf24]" />
              <span>قائمة طلاب الحلقة (اضغط على أي طالب لفتح سجله كاملاً واستخراج تقريره)</span>
            </h3>
            <p className="text-xs text-[#86efac]/80 mt-0.5">
              يعرض عدد الآيات التي سمعها الطالب، الأوجه المحفوظة، تقييماته، حضوره وغيابه، مع إمكانية طباعة تقرير فردي فاخر
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={studentSearchQuery}
              onChange={e => setStudentSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو السورة..."
              className="bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-1.5 px-3 text-xs text-white outline-none w-48"
            />
            <span className="text-xs font-bold text-[#fbbf24] bg-[#064e3b] px-3 py-1.5 rounded-xl border border-[#065f46]">
              {filteredRosterStudents.length} طالب
            </span>
          </div>
        </div>

        {/* Student Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRosterStudents.map(student => {
            const stdEvals = evaluations
              .filter(e => e.studentId === student.id)
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            const stdAtt = attendance.filter(a => a.studentId === student.id);
            const presents = stdAtt.filter(a => a.status === 'حاضر').length;
            const absents = stdAtt.filter(a => a.status === 'غائب').length;
            const totalRecorded = stdAtt.length;
            const attRate = totalRecorded > 0 ? Math.round((presents / totalRecorded) * 100) : 100;

            const versesHeard = student.listenedAyahsCount || (student.currentAyah || 1) * 3 + stdEvals.length * 10;
            const studentPagesInfo = calculateStudentCompletedPages(student, evaluations);
            const pagesCount = studentPagesInfo.totalPagesCount;

            const latestEval = stdEvals[0];
            const evalSummary = latestEval ? Object.values(latestEval.criteriaValues || {})[0] || 'ممتاز' : '—';

            return (
              <div
                key={student.id}
                onClick={() => setDetailedStudent(student)}
                className="bg-[#064e3b]/40 hover:bg-[#064e3b]/80 border border-[#065f46] hover:border-[#fbbf24]/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-[#065f46] group-hover:border-[#fbbf24] text-[#fbbf24] font-black flex items-center justify-center text-sm transition-colors">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#fbbf24] transition-colors">
                        {student.name}
                      </h4>
                      <span className="text-[11px] text-[#86efac]/80 block">
                        المستوى: {student.level}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {student.currentSurahName || 'النبأ'} ({student.currentAyah || 1})
                  </span>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-[#065f46]/60">
                  <div className="bg-[#022c22]/70 p-2 rounded-xl">
                    <span className="text-[#86efac]/70 block text-[10px]">الآيات المسموعة</span>
                    <strong className="text-amber-300 font-mono text-xs">{versesHeard}</strong>
                  </div>
                  <div className="bg-[#022c22]/70 p-2 rounded-xl">
                    <span className="text-[#86efac]/70 block text-[10px]">الأوجه المحفوظة</span>
                    <strong className="text-white font-mono text-xs">{pagesCount} وجه</strong>
                  </div>
                  <div className="bg-[#022c22]/70 p-2 rounded-xl">
                    <span className="text-[#86efac]/70 block text-[10px]">نسبة الحضور</span>
                    <strong className="text-emerald-400 font-mono text-xs">{attRate}%</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#86efac]/80 pt-1">
                  <span>آخر تقييم: <strong className="text-white">{evalSummary}</strong></span>
                  <span className="text-[#fbbf24] font-bold group-hover:underline flex items-center gap-1">
                    <span>فتح السجل الكامل</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: COMPREHENSIVE SINGLE STUDENT PROFILE MODAL                       */}
      {/* ========================================================================= */}
      {detailedStudent && (() => {
        const student = detailedStudent;
        const studentEvals = evaluations
          .filter(e => e.studentId === student.id)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const studentAtt = attendance.filter(a => a.studentId === student.id);
        const presents = studentAtt.filter(a => a.status === 'حاضر').length;
        const absents = studentAtt.filter(a => a.status === 'غائب').length;
        const excused = studentAtt.filter(a => a.status === 'معتذر').length;
        const totalDays = studentAtt.length;
        const attRate = totalDays > 0 ? Math.round((presents / totalDays) * 100) : 100;

        const versesHeard = student.listenedAyahsCount || (student.currentAyah || 1) * 3 + studentEvals.length * 10;
        const studentPagesInfo = calculateStudentCompletedPages(student, evaluations);
        const newPages = studentPagesInfo.newPagesCount;
        const revPages = studentPagesInfo.reviewPagesCount;
        const totalPages = studentPagesInfo.totalPagesCount;

        return (
          <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-[#064e3b] border-2 border-[#fbbf24]/50 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-fadeIn text-right">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#065f46] shrink-0 bg-[#064e3b]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] font-black text-lg flex items-center justify-center shadow-md">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-heading">
                      السجل القرآني الشامل: {student.name}
                    </h3>
                    <p className="text-xs text-[#86efac]/90">
                      المستوى: {student.level} • هاتف ولي الأمر: {getStudentParentPhone(student) || 'غير مسجل'} • الحلقة: {student.halaqahName || settings.halaqahName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateTextMessage(student)}
                    className="px-3 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] border border-[#fbbf24]/50 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                    title="استخراج تقرير الطالب كرسالة نصية منسقة للواتساب"
                  >
                    <MessageSquare className="w-4 h-4 text-[#fbbf24]" />
                    <span>رسالة التقرير</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handlePrintSingleStudent(student);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] border border-[#fbbf24] text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4 text-[#064e3b]" />
                    <span>استخراج PDF فاخر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailedStudent(null)}
                    className="p-2 text-[#86efac] hover:text-white rounded-xl cursor-pointer hover:bg-[#022c22]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {/* 4 KPI Big Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-[#022c22] border border-[#065f46]">
                    <span className="text-[11px] text-[#86efac] block">الآيات التي سمعها</span>
                    <strong className="text-xl font-black text-amber-300 font-mono">{versesHeard}</strong>
                    <span className="text-[10px] text-[#86efac]/70 block">آية مسجلة</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#022c22] border border-[#065f46]">
                    <span className="text-[11px] text-[#86efac] block">الأوجه المحفوظة</span>
                    <strong className="text-xl font-black text-white font-mono">{totalPages}</strong>
                    <span className="text-[10px] text-[#86efac]/70 block">({newPages} جديد • {revPages} مراجعة)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#022c22] border border-[#065f46]">
                    <span className="text-[11px] text-[#86efac] block">نسبة الحضور</span>
                    <strong className="text-xl font-black text-emerald-400 font-mono">{attRate}%</strong>
                    <span className="text-[10px] text-[#86efac]/70 block">({presents} حاضر • {absents} غائب)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#022c22] border border-[#065f46]">
                    <span className="text-[11px] text-[#86efac] block">إجمالي النقاط</span>
                    <strong className="text-xl font-black text-[#fbbf24] font-mono">{student.points || 0}</strong>
                    <span className="text-[10px] text-[#86efac]/70 block">نقطة تميز</span>
                  </div>
                </div>

                {/* Recitation Current Position */}
                <div className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2">
                  <span className="text-xs font-bold text-[#fbbf24] block">الموضع الحالي في التسميع:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#86efac]/70">السورة والآية:</span>
                      <strong className="text-white block mt-0.5">سورة {student.currentSurahName || 'النبأ'} (آية {student.currentAyah || 1})</strong>
                    </div>
                    <div>
                      <span className="text-[#86efac]/70">المقرر اليومي للحفظ:</span>
                      <strong className="text-white block mt-0.5">{student.dailyNewTarget || 'محدد من المعلم'}</strong>
                    </div>
                  </div>
                </div>

                {/* Full Evaluations History Table */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#fbbf24]" />
                    <span>سجل التسميع والتقييمات المسجلة للطالب ({studentEvals.length}):</span>
                  </h4>

                  {studentEvals.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#86efac]/70 bg-[#022c22]/50 rounded-2xl border border-[#065f46]">
                      لا توجد جلسات تقييم مسجلة بعد لهذا الطالب.
                    </div>
                  ) : (
                    <div className="border border-[#065f46] rounded-2xl overflow-hidden bg-[#022c22]">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-[#064e3b] text-[#fbbf24] text-[11px] border-b border-[#065f46]">
                            <th className="p-2.5 w-24">التاريخ</th>
                            <th className="p-2.5">الحفظ الجديد</th>
                            <th className="p-2.5">المراجعة</th>
                            <th className="p-2.5 w-20 text-center">التقييم</th>
                            <th className="p-2.5">توجيه المعلم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#065f46]/60">
                          {studentEvals.map(ev => {
                            const newRec = ev.recitationDetails?.todayNewItem
                              ? `سورة ${getSurahInfo(ev.recitationDetails.todayNewItem.surahNumber).name} (${ev.recitationDetails.todayNewItem.fromAyah || 1}-${ev.recitationDetails.todayNewItem.toAyah || 1})`
                              : ev.recitationDetails?.newMemorizationAchieved || '—';

                            const revRec = ev.recitationDetails?.todayReviewItems && ev.recitationDetails.todayReviewItems.length > 0
                              ? ev.recitationDetails.todayReviewItems.map(item => {
                                  const s1 = getSurahInfo(item.surahNumber || 78);
                                  const s2 = item.toSurahNumber ? getSurahInfo(item.toSurahNumber) : s1;
                                  if (item.toSurahNumber && item.toSurahNumber !== item.surahNumber) {
                                    return `من سورة ${s1.name} (آية ${item.fromAyah || 1}) إلى سورة ${s2.name} (آية ${item.toAyah || 1})`;
                                  }
                                  return `سورة ${s1.name} (${item.fromAyah || 1}-${item.toAyah || 1})`;
                                }).join(' • ')
                              : ev.recitationDetails?.reviewAchieved || '—';

                            const scoreVal = Object.values(ev.criteriaValues || {})[0] || 'متقن';

                            return (
                              <tr key={ev.id} className="hover:bg-[#064e3b]/30">
                                <td className="p-2.5 font-mono text-[11px] text-[#86efac]">{ev.date}</td>
                                <td className="p-2.5 font-bold text-white">{newRec}</td>
                                <td className="p-2.5 text-slate-300">{revRec}</td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                                    {scoreVal}
                                  </span>
                                </td>
                                <td className="p-2.5 text-[11px] text-slate-300">
                                  {ev.recitationDetails?.teacherNotes || 'أداء طيب ومتقن.'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Attendance & Absence Log */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#fbbf24]" />
                    <span>سجل الحضور والغياب والمواظبة ({studentAtt.length} يوم مسجل):</span>
                  </h4>

                  {studentAtt.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#86efac]/70 bg-[#022c22]/50 rounded-2xl border border-[#065f46]">
                      لا توجد سجلات حضور مسجلة للطالب.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {studentAtt.slice(0, 16).map(att => (
                        <div
                          key={att.id}
                          className="p-2 rounded-xl bg-[#022c22] border border-[#065f46] flex items-center justify-between"
                        >
                          <span className="font-mono text-[11px] text-[#86efac]">{att.date}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              att.status === 'حاضر'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : att.status === 'غائب'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#fbbf24]/20 shrink-0 bg-[#022c22]/95 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePrintSingleStudent(student)}
                    className="px-4 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] border border-[#fbbf24] font-black text-xs flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Printer className="w-4 h-4 text-[#064e3b]" />
                    <span>طباعة تقرير PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleGenerateTextMessage(student);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-[#064e3b] hover:bg-[#064e3b]/80 text-[#fbbf24] hover:text-white border border-[#fbbf24]/50 font-black text-xs flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-4 h-4 text-[#fbbf24]" />
                    <span>استخراج كرسالة واتساب منسقة</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailedStudent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#86efac] hover:text-white"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOM REPORT BUILDER MODAL (Choose students & fields to export) */}
      {/* ========================================================================= */}
      {isCustomReportModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#064e3b] border-2 border-[#fbbf24]/50 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-fadeIn text-right">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#065f46] shrink-0 bg-[#064e3b]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    أداة استخراج التقارير القرآنية المخصصة (PDF)
                  </h3>
                  <p className="text-xs text-[#86efac]/80">
                    حدد الطلاب والبيانات التي ترغب باستخراجها في تقرير فاخر بالثيم المعتمد
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomReportModalOpen(false)}
                className="p-1.5 text-[#86efac] hover:text-white rounded-xl cursor-pointer hover:bg-[#022c22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* 1. Target Students Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#fbbf24]">
                  1. تحديد الطلاب المستهدفين بالتقرير:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomReportTargetMode('all');
                      setCustomSelectedStudentIds(students.map(s => s.id));
                    }}
                    className={`p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                      customReportTargetMode === 'all'
                        ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24] font-black shadow-sm'
                        : 'bg-[#022c22] hover:bg-[#064e3b] text-[#f0f9f6]/80 hover:text-white border-[#fbbf24]/30 hover:border-[#fbbf24]'
                    }`}
                  >
                    جميع الطلاب ({students.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomReportTargetMode('multiple')}
                    className={`p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                      customReportTargetMode === 'multiple'
                        ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24] font-black shadow-sm'
                        : 'bg-[#022c22] hover:bg-[#064e3b] text-[#f0f9f6]/80 hover:text-white border-[#fbbf24]/30 hover:border-[#fbbf24]'
                    }`}
                  >
                    تحديد طلاب معينين ({customSelectedStudentIds.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomReportTargetMode('single')}
                    className={`p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                      customReportTargetMode === 'single'
                        ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24] font-black shadow-sm'
                        : 'bg-[#022c22] hover:bg-[#064e3b] text-[#f0f9f6]/80 hover:text-white border-[#fbbf24]/30 hover:border-[#fbbf24]'
                    }`}
                  >
                    طالب واحد فقط
                  </button>
                </div>
              </div>

              {/* Single Student Selector */}
              {customReportTargetMode === 'single' && (
                <div className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-1.5">
                  <label className="text-xs font-semibold text-[#86efac] block">اختر الطالب:</label>
                  <select
                    value={customSingleStudentId}
                    onChange={e => setCustomSingleStudentId(e.target.value)}
                    className="w-full bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2 px-3 text-xs text-white outline-none cursor-pointer font-bold"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.currentSurahName || 'النبأ'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multi-student Checkboxes */}
              {customReportTargetMode === 'multiple' && (
                <div className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between pb-1 border-b border-[#065f46] text-xs">
                    <span className="text-[#86efac] font-bold">حدد الطلاب المطلوب إدراجهم:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (customSelectedStudentIds.length === students.length) {
                          setCustomSelectedStudentIds([]);
                        } else {
                          setCustomSelectedStudentIds(students.map(s => s.id));
                        }
                      }}
                      className="text-[#fbbf24] font-bold hover:underline"
                    >
                      {customSelectedStudentIds.length === students.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {students.map(std => {
                      const isChecked = customSelectedStudentIds.includes(std.id);
                      return (
                        <label
                          key={std.id}
                          className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                              : 'bg-[#064e3b]/30 border-[#065f46] text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setCustomSelectedStudentIds(prev => [...prev, std.id]);
                              } else {
                                setCustomSelectedStudentIds(prev => prev.filter(id => id !== std.id));
                              }
                            }}
                            className="rounded text-amber-500 bg-[#022c22] border-[#065f46]"
                          />
                          <span className="truncate">{std.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Choose Fields to Include */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#fbbf24]">
                  2. حدد الأعمدة والبيانات التي ترغب باستخراجها:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] flex items-center gap-2.5 cursor-pointer hover:bg-[#022c22]/80">
                    <input
                      type="checkbox"
                      checked={customFields.includeAttendance}
                      onChange={e => setCustomFields(f => ({ ...f, includeAttendance: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 bg-[#064e3b] border-[#065f46]"
                    />
                    <div>
                      <span className="font-bold text-white block">سجل الحضور والغياب والمواظبة</span>
                      <span className="text-[10px] text-[#86efac]/70">نسبة الحضور وأيام الالتزام</span>
                    </div>
                  </label>

                  <label className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] flex items-center gap-2.5 cursor-pointer hover:bg-[#022c22]/80">
                    <input
                      type="checkbox"
                      checked={customFields.includeMemorization}
                      onChange={e => setCustomFields(f => ({ ...f, includeMemorization: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 bg-[#064e3b] border-[#065f46]"
                    />
                    <div>
                      <span className="font-bold text-white block">أين وصلوا في الحفظ والمراجعة</span>
                      <span className="text-[10px] text-[#86efac]/70">السورة والآية ومقرر المراجعة</span>
                    </div>
                  </label>

                  <label className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] flex items-center gap-2.5 cursor-pointer hover:bg-[#022c22]/80">
                    <input
                      type="checkbox"
                      checked={customFields.includeEvaluations}
                      onChange={e => setCustomFields(f => ({ ...f, includeEvaluations: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 bg-[#064e3b] border-[#065f46]"
                    />
                    <div>
                      <span className="font-bold text-white block">سجل التقييمات ومستويات الإتقان</span>
                      <span className="text-[10px] text-[#86efac]/70">آخر التقييمات والدرجات المستحقة</span>
                    </div>
                  </label>

                  <label className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] flex items-center gap-2.5 cursor-pointer hover:bg-[#022c22]/80">
                    <input
                      type="checkbox"
                      checked={customFields.includeParentPhone}
                      onChange={e => setCustomFields(f => ({ ...f, includeParentPhone: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 bg-[#064e3b] border-[#065f46]"
                    />
                    <div>
                      <span className="font-bold text-white block">أرقام هواتف أولياء أمور الطلاب</span>
                      <span className="text-[10px] text-[#86efac]/70">للتواصل والمتابعة المباشرة</span>
                    </div>
                  </label>

                  <label className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] flex items-center gap-2.5 cursor-pointer hover:bg-[#022c22]/80">
                    <input
                      type="checkbox"
                      checked={customFields.includePagesAndVerses}
                      onChange={e => setCustomFields(f => ({ ...f, includePagesAndVerses: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 bg-[#064e3b] border-[#065f46]"
                    />
                    <div>
                      <span className="font-bold text-white block">الأوجه والآيات المنجزة والنقاط</span>
                      <span className="text-[10px] text-[#86efac]/70">إجمالي الأوجه المحفوظة ورصيد النقاط</span>
                    </div>
                  </label>

                  <label className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] flex items-center gap-2.5 cursor-pointer hover:bg-[#022c22]/80">
                    <input
                      type="checkbox"
                      checked={customFields.includeTeacherNotes}
                      onChange={e => setCustomFields(f => ({ ...f, includeTeacherNotes: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 bg-[#064e3b] border-[#065f46]"
                    />
                    <div>
                      <span className="font-bold text-white block">ملاحظات وتوجيهات المعلم</span>
                      <span className="text-[10px] text-[#86efac]/70">توصيات المحفظ لولي الأمر</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Timeframe */}
              <div className="p-3 rounded-2xl bg-[#022c22] border border-[#065f46] flex items-center justify-between text-xs">
                <span className="text-[#86efac] font-bold">فترة التقرير:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomReportTimeframe('comprehensive')}
                    className={`px-3 py-1 rounded-xl font-bold cursor-pointer ${
                      customReportTimeframe === 'comprehensive'
                        ? 'bg-[#fbbf24] text-[#064e3b]'
                        : 'text-[#86efac]/70 hover:text-white'
                    }`}
                  >
                    السجل الشامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomReportTimeframe('monthly')}
                    className={`px-3 py-1 rounded-xl font-bold cursor-pointer ${
                      customReportTimeframe === 'monthly'
                        ? 'bg-[#fbbf24] text-[#064e3b]'
                        : 'text-[#86efac]/70 hover:text-white'
                    }`}
                  >
                    شهري
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomReportTimeframe('weekly')}
                    className={`px-3 py-1 rounded-xl font-bold cursor-pointer ${
                      customReportTimeframe === 'weekly'
                        ? 'bg-[#fbbf24] text-[#064e3b]'
                        : 'text-[#86efac]/70 hover:text-white'
                    }`}
                  >
                    أسبوعي
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#fbbf24]/20 shrink-0 bg-[#022c22]/95 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintCustomReport}
                  className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] border border-[#fbbf24] font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4 text-[#064e3b]" />
                  <span>استخراج PDF فاخر</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomReportModalOpen(false);
                    handleGenerateTextMessage();
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-[#064e3b] hover:bg-[#064e3b]/80 text-[#fbbf24] hover:text-white border border-[#fbbf24]/50 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-[#fbbf24]" />
                  <span>استخراج كرسالة منسقة (واتساب)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#86efac] hover:text-white cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FORMATTED TEXT MESSAGE REPORT PREVIEW & SEND                    */}
      {/* ========================================================================= */}
      {isTextMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#022c22] border-2 border-[#fbbf24]/50 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden text-right">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] px-6 py-4 border-b border-[#065f46] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    تقرير المتابعة كرسالة نصية منسقة
                  </h3>
                  <p className="text-[11px] text-[#86efac]">
                    جاهزة للنسخ والمشاركة المباشرة عبر الواتساب مع أولياء الأمور
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTextMessageModalOpen(false)}
                className="p-2 text-[#86efac] hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Body */}
            <div className="p-6 space-y-4">
              <div className="bg-[#011a14] border border-[#065f46] rounded-2xl p-4 max-h-96 overflow-y-auto font-mono text-xs sm:text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed select-text" dir="rtl">
                {generatedReportText}
              </div>

              {textMessageCopied && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تم نسخ نص التقرير بالكامل للحافظة بنجاح! يمكنك الآن لصقه في أي محادثة.</span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-[#022c22]/95 border-t border-[#fbbf24]/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedReportText);
                    setTextMessageCopied(true);
                    setTimeout(() => setTextMessageCopied(false), 3000);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#f0f9f6] hover:text-white border border-[#fbbf24]/30 hover:border-[#fbbf24] font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Copy className="w-4 h-4 text-[#fbbf24]" />
                  <span>{textMessageCopied ? 'تم النسخ!' : 'نسخ الرسالة بالكامل'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {textMessageStudent ? (
                  <button
                    type="button"
                    onClick={() => {
                      const parentPhone = getStudentParentPhone(textMessageStudent);
                      const cleanPhone = parentPhone ? parentPhone.replace(/\D/g, '') : '';
                      if (cleanPhone) {
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(generatedReportText)}`, '_blank');
                      } else {
                        window.open(`https://wa.me/?text=${encodeURIComponent(generatedReportText)}`, '_blank');
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال عبر واتساب لولي الأمر</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(`https://wa.me/?text=${encodeURIComponent(generatedReportText)}`, '_blank');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>مشاركة عبر واتساب</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE QURANIC REPORT (PDF PREVIEW & PRINT)                   */}
      {/* ========================================================================= */}
      {printDocumentType && (
        <PrintableQuranicReport
          isOpen={true}
          onClose={() => {
            setPrintDocumentType(null);
            setStudentForPrint(undefined);
            setTargetStudentIdsForPrint([]);
          }}
          documentType={printDocumentType}
          students={students}
          selectedStudent={studentForPrint}
          selectedStudentIds={targetStudentIdsForPrint}
          customFields={customFields}
          attendance={attendance}
          evaluations={evaluations}
          settings={settings}
          teacherName={teacherName || settings.teacherName}
          reportType={customReportTimeframe}
          complex={activeComplex}
          getStudentLatestRecitations={getStudentLatestRecitations}
          onSaveDocument={onSaveLibraryDoc}
        />
      )}
    </div>
  );
};
