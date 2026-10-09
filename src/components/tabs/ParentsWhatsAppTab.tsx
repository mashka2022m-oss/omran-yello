import React, { useState, useEffect } from 'react';
import {
  Send,
  MessageCircle,
  Copy,
  Check,
  Phone,
  Edit,
  ExternalLink,
  RefreshCw,
  Search,
  BookOpen,
  Sparkles,
  Award,
  UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Student, AttendanceRecord, StudentEvaluation, AppSettings, QuranComplex } from '../../types';
import { calculateRealisticQuranAssignment, formatQuranPortion, getSurahInfo } from '../../data/quranData';

interface ParentsWhatsAppTabProps {
  students: Student[];
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  settings: AppSettings;
  preselectedStudentId?: string;
  senderAccountName?: string;
  currentUserName?: string;
  activeComplex?: QuranComplex | null;
}

export const ParentsWhatsAppTab: React.FC<ParentsWhatsAppTabProps> = ({
  students,
  attendance,
  evaluations,
  settings,
  preselectedStudentId,
  senderAccountName,
  currentUserName,
  activeComplex
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic sender name based on active logged-in teacher account (e.g. محمد، أنس)
  const initialSender = currentUserName || senderAccountName || settings.teacherName || 'معلم ومحفظ الحلقة';
  const [senderName, setSenderName] = useState<string>(initialSender);
  const [isEditingSender, setIsEditingSender] = useState(false);

  useEffect(() => {
    if (currentUserName || senderAccountName) {
      setSenderName(currentUserName || senderAccountName || settings.teacherName || 'معلم ومحفظ الحلقة');
    }
  }, [currentUserName, senderAccountName, settings.teacherName]);

  // Messages map: studentId -> message string
  const [messagesMap, setMessagesMap] = useState<Record<string, string>>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Helper to build pristine, 100% accurate and comprehensive message from teacher records
  const buildComprehensiveMessage = (
    student: Student,
    status: string,
    evalData?: StudentEvaluation,
    customSender?: string
  ): string => {
    let baseUrl = '';
    if (typeof window !== 'undefined') {
      const cleanHref = window.location.origin + window.location.pathname;
      baseUrl = cleanHref.replace(/\/+$/, '');
    }
    const portalUrl = baseUrl ? `${baseUrl}/?portal=${encodeURIComponent(student.id)}` : '';

    // Realistic calculation fallback if not evaluated yet
    const realisticAssignment = calculateRealisticQuranAssignment(
      student.currentSurah || student.currentSurahName || 78,
      student.currentAyah || 1,
      student.level || 'متوسط',
      student.dailyNewTarget || 'نصف وجه'
    );

    // 1. Today's recitation (what was recited today)
    let todayNewText = '';
    let todayReviewText = '';

    if (evalData?.recitationDetails?.todayNewItem) {
      const item = evalData.recitationDetails.todayNewItem;
      const sInfo = getSurahInfo(item.surahNumber);
      const toSurahInfo = item.toSurahNumber ? getSurahInfo(item.toSurahNumber) : sInfo;
      todayNewText = formatQuranPortion(
        item.surahName || sInfo.name,
        item.fromAyah,
        item.toAyah,
        sInfo.numberOfAyahs,
        item.type,
        item.toSurahName || toSurahInfo.name,
        toSurahInfo.numberOfAyahs
      );
    } else if (evalData?.recitationDetails?.newMemorizationAchieved) {
      todayNewText = evalData.recitationDetails.newMemorizationAchieved;
    } else if (status === 'حاضر') {
      todayNewText = `سورة ${student.currentSurahName}: من الآية (${student.currentAyah}) (أتم التسميع)`;
    } else {
      todayNewText = 'لم يسمّع اليوم نظراً لعدم الحضور';
    }

    if (evalData?.recitationDetails?.todayReviewItems && evalData.recitationDetails.todayReviewItems.length > 0) {
      const reviewLines = evalData.recitationDetails.todayReviewItems.map(r => {
        const sInfo = getSurahInfo(r.surahNumber);
        const toSurahInfo = r.toSurahNumber ? getSurahInfo(r.toSurahNumber) : sInfo;
        return formatQuranPortion(
          r.surahName || sInfo.name,
          r.fromAyah,
          r.toAyah,
          sInfo.numberOfAyahs,
          r.type,
          r.toSurahName || toSurahInfo.name,
          toSurahInfo.numberOfAyahs
        );
      });
      todayReviewText = reviewLines.join('\n▫️ ');
    } else if (evalData?.recitationDetails?.reviewAchieved) {
      todayReviewText = evalData.recitationDetails.reviewAchieved;
    } else if (status === 'حاضر') {
      todayReviewText = `مراجعة وتثبيت ما تم حفظه من سورة ${student.currentSurahName}`;
    } else {
      todayReviewText = 'لم يراجع في الحلقة اليوم';
    }

    const teacherNote =
      evalData?.recitationDetails?.teacherNotes ||
      (status === 'حاضر'
        ? 'أداء متميز وتلاوة مباركة ما شاء الله، نسأل الله له التوفيق.'
        : 'نرجو المتابعة والتواصل مع المعلم.');

    // 2. Tomorrow's required assignment
    let tomNewText = '';
    let tomReviewText = '';

    if (evalData?.recitationDetails?.tomorrowNewItem) {
      const tItem = evalData.recitationDetails.tomorrowNewItem;
      const sInfo = getSurahInfo(tItem.surahNumber);
      const toSurahInfo = tItem.toSurahNumber ? getSurahInfo(tItem.toSurahNumber) : sInfo;
      tomNewText = formatQuranPortion(
        tItem.surahName || sInfo.name,
        tItem.fromAyah,
        tItem.toAyah,
        sInfo.numberOfAyahs,
        tItem.type,
        tItem.toSurahName || toSurahInfo.name,
        toSurahInfo.numberOfAyahs
      );
    } else if (student.aiPlan?.currentDailyAssignment?.newMemorization) {
      tomNewText = student.aiPlan.currentDailyAssignment.newMemorization;
    } else {
      tomNewText = realisticAssignment.newMemorization;
    }

    if (evalData?.recitationDetails?.tomorrowReviewItem) {
      const tRev = evalData.recitationDetails.tomorrowReviewItem;
      const sInfo = getSurahInfo(tRev.surahNumber);
      const toSurahInfo = tRev.toSurahNumber ? getSurahInfo(tRev.toSurahNumber) : sInfo;
      tomReviewText = formatQuranPortion(
        tRev.surahName || sInfo.name,
        tRev.fromAyah,
        tRev.toAyah,
        sInfo.numberOfAyahs,
        tRev.type,
        tRev.toSurahName || toSurahInfo.name,
        toSurahInfo.numberOfAyahs
      );
    } else if (student.aiPlan?.currentDailyAssignment?.review) {
      tomReviewText = student.aiPlan.currentDailyAssignment.review;
    } else {
      tomReviewText = realisticAssignment.review;
    }

    const sheikh =
      evalData?.recitationDetails?.tomorrowSuggestedSheikh ||
      student.aiPlan?.currentDailyAssignment?.suggestedSheikh ||
      realisticAssignment.suggestedSheikh;

    const isNoneSheikh = sheikh === 'بدون' || sheikh === 'لا يوجد' || evalData?.recitationDetails?.tomorrowTargetRepetitions === 0;
    const formattedSheikh = isNoneSheikh ? 'بدون (لا يتطلب استماع لهذه الجلسة)' : sheikh;

    const homeNote =
      evalData?.recitationDetails?.tomorrowDailyNote ||
      student.aiPlan?.currentDailyAssignment?.dailyNote ||
      realisticAssignment.dailyNote;

    const effectiveSender = customSender || senderName;
    const complexDisplayName = activeComplex?.name || settings.complexName || 'مجمع تحفيظ القرآن الكريم';

    // Construct clean, formatted WhatsApp message
    let msg = `السلام عليكم ورحمة الله وبركاته\n`;
    msg += `المكرم ولي أمر الطالب العزيز / *${student.name}* حفظه الله ورعاه\n`;
    msg += `نحيطكم علماً بتقرير متابعة الطالب في *${student.halaqahName || settings.halaqahName || 'حلقة القرآن الكريم'}* (${complexDisplayName}) ليوم ${new Date().toLocaleDateString('ar-SA')}:\n\n`;

    msg += `• *حالة الحضور اليوم:* ${status}\n\n`;

    msg += `[ إنجاز وتسميع اليوم في الحلقة ]\n`;
    msg += `• *الحفظ الجديد اليوم:* ${todayNewText}\n`;
    if (todayReviewText.includes('\n')) {
      msg += `• *المراجعة والتثبيت اليوم:*\n- ${todayReviewText}\n`;
    } else {
      msg += `• *المراجعة والتثبيت اليوم:* ${todayReviewText}\n`;
    }
    msg += `• *ملاحظات وتوجيه المعلم:* ${teacherNote}\n\n`;

    msg += `[ المقرر المطلوب لليوم التالي بإذن الله ]\n`;
    msg += `• *ورد الحفظ الجديد القادم:* ${tomNewText}\n`;
    msg += `• *ورد المراجعة والتثبيت:* ${tomReviewText}\n`;
    msg += `• *القارئ المقترح للاستماع له بالمنزل:* ${formattedSheikh}\n`;
    msg += `• *توجيه المتابعة المنزلية:* ${homeNote}\n\n`;

    msg += `• *لمتابعة ملف الطالب وخطة حفظه وسجل درجاته مباشرة عبر البوابة الحية، اضغط على الرابط:* \n`;
    msg += `${portalUrl}\n\n`;
    msg += `جزاكم الله خيراً ونفع بكم وبأبنائنا الكرام\n`;
    msg += `معلم ومحفظ الحلقة: *${effectiveSender}*\n`;
    msg += `إدارة: *${complexDisplayName}*`;

    return msg;
  };

  // Re-sync messages whenever students, evaluations, attendance, or senderName change
  useEffect(() => {
    const updatedMap: Record<string, string> = {};
    students.forEach(student => {
      const todayAtt = attendance.find(
        a => a.date === todayStr && a.studentId === student.id
      );
      const status = todayAtt?.status || 'حاضر';
      const evalData = evaluations.find(
        e => e.date === todayStr && e.studentId === student.id
      );

      updatedMap[student.id] = buildComprehensiveMessage(student, status, evalData, senderName);
    });

    setMessagesMap(updatedMap);
  }, [students, attendance, evaluations, settings, senderName, activeComplex]);

  const handleUpdateSenderName = (newName: string) => {
    setSenderName(newName);
    const updatedMap: Record<string, string> = {};
    students.forEach(student => {
      const todayAtt = attendance.find(
        a => a.date === todayStr && a.studentId === student.id
      );
      const status = todayAtt?.status || 'حاضر';
      const evalData = evaluations.find(
        e => e.date === todayStr && e.studentId === student.id
      );

      updatedMap[student.id] = buildComprehensiveMessage(student, status, evalData, newName);
    });
    setMessagesMap(updatedMap);
  };

  const handleRefreshStudentMessage = (student: Student) => {
    const todayAtt = attendance.find(
      a => a.date === todayStr && a.studentId === student.id
    );
    const status = todayAtt?.status || 'حاضر';
    const evalData = evaluations.find(
      e => e.date === todayStr && e.studentId === student.id
    );

    const freshMsg = buildComprehensiveMessage(student, status, evalData, senderName);
    setMessagesMap(prev => ({
      ...prev,
      [student.id]: freshMsg
    }));
  };

  const handleCopy = (studentId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(studentId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleOpenEdit = (studentId: string) => {
    setEditingStudentId(studentId);
    setEditingText(messagesMap[studentId] || '');
  };

  const handleSaveEdit = () => {
    if (editingStudentId) {
      setMessagesMap(prev => ({
        ...prev,
        [editingStudentId]: editingText
      }));
      setEditingStudentId(null);
    }
  };

  const filteredStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#fbbf24]" />
            <span>رسائل الواتساب اليومية لأولياء الأمور</span>
          </h2>
          <p className="text-xs text-[#86efac]/90 mt-1">
            صياغة رسائل تفصيلية ومباشرة تعكس ما سمّعه الطالب اليوم ومقرره لغد وروابط البوابة الحية
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Active Sender Account Badge & Modifier */}
          <div className="flex items-center gap-2 text-xs bg-[#022c22] px-3.5 py-2 rounded-2xl border border-amber-400/40 shadow-inner">
            <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[#86efac]">الحساب المُرسل منه:</span>
            <span className="font-bold text-amber-300 font-mono bg-amber-400/15 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
              {senderName}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingSender(!isEditingSender)}
              className="text-[11px] text-amber-300 hover:text-white underline cursor-pointer mr-1.5 font-bold"
            >
              {isEditingSender ? 'إغلاق' : 'تغيير'}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-[#fbbf24] bg-[#022c22] px-3.5 py-2 rounded-2xl border border-[#065f46]">
            <BookOpen className="w-4 h-4 text-[#fbbf24]" />
            <span>تُحدّث فورياً بحسب الحساب المُرسل</span>
          </div>
        </div>
      </div>

      {/* Account Sender Customization Panel */}
      {isEditingSender && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-[#022c22] via-[#064e3b] to-[#022c22] border-2 border-amber-400/70 rounded-2xl p-4 shadow-xl space-y-3"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>تحديد الحساب أو المعلم الذي يُكتب اسمه في تذييل رسالة الواتساب:</span>
              </span>
              <p className="text-[11px] text-[#86efac]/80">
                سواء كنت مسجلاً باسمك (مثل محمد أو أنس) أو كمعلم للحلقة، يمكنك تثبيت اسم الحساب المرسل منه بدقة.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {currentUserName && currentUserName !== senderName && (
                <button
                  type="button"
                  onClick={() => handleUpdateSenderName(currentUserName)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold border border-amber-400/30 transition-all cursor-pointer"
                >
                  استخدام اسم حسابي ({currentUserName})
                </button>
              )}
              {senderAccountName && senderAccountName !== senderName && (
                <button
                  type="button"
                  onClick={() => handleUpdateSenderName(senderAccountName)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                >
                  استخدام اسم المعلم ({senderAccountName})
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={senderName}
              onChange={e => handleUpdateSenderName(e.target.value)}
              placeholder="اكتب اسم الحساب أو المعلم المرسل هنا..."
              className="w-full bg-[#022c22] border border-amber-400/40 text-amber-200 text-xs font-bold rounded-xl py-2 px-3 focus:border-amber-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setIsEditingSender(false)}
              className="px-4 py-2 rounded-xl bg-amber-400 text-[#064e3b] text-xs font-black shrink-0 hover:bg-amber-300 cursor-pointer transition-all"
            >
              تم
            </button>
          </div>
        </motion.div>
      )}

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="بحث باسم الطالب أو ولي الأمر..."
          className="w-full bg-[#064e3b]/60 border border-[#065f46] focus:border-[#fbbf24] rounded-2xl py-3 px-4 pr-11 text-xs sm:text-sm text-[#f0f9f6] placeholder-[#86efac]/40 outline-none backdrop-blur-md"
          dir="rtl"
        />
        <Search className="w-4 h-4 text-[#86efac]/60 absolute right-4 top-3.5" />
      </div>

      {/* Student Cards List */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-12 text-center text-[#86efac]/60 text-xs backdrop-blur-md">
            لا يوجد طلاب مطابقون.
          </div>
        ) : (
          filteredStudents.map((student, sIdx) => {
            const todayAtt = attendance.find(
              a => a.date === todayStr && a.studentId === student.id
            );
            const status = todayAtt?.status || 'حاضر';
            const evalData = evaluations.find(
              e => e.date === todayStr && e.studentId === student.id
            );
            const msg = messagesMap[student.id] || buildComprehensiveMessage(student, status, evalData, senderName);
            const isCopied = copiedId === student.id;

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(sIdx * 0.04, 0.4) }}
                className="bg-[#064e3b]/60 border border-[#065f46] hover:border-[#fbbf24]/50 rounded-[32px] p-6 transition-all shadow-xl backdrop-blur-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Info: Student Profile & Numbers */}
                  <div className="lg:w-1/3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#064e3b] flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#86efac]/80">
                          <span>ولي الأمر: {student.parentName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[#86efac]">حضور اليوم:</span>
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-xl ${
                            status === 'حاضر'
                              ? 'bg-[#fbbf24]/20 text-[#fbbf24]'
                              : status === 'غائب'
                              ? 'bg-red-500/20 text-red-300'
                              : status === 'معتذر'
                              ? 'bg-emerald-500/20 text-[#86efac]'
                              : 'bg-[#064e3b] text-[#86efac]/60'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[#86efac]">تسميع اليوم:</span>
                        <span className="font-bold text-[#fbbf24]">
                          {evalData ? 'تم تسجيل التسميع' : 'لم يسجل بعد'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[#86efac]">مقرر الغد:</span>
                        <span className="text-white font-bold truncate max-w-[150px]">
                          {student.aiPlan?.currentDailyAssignment?.newMemorization || 'مقرر الغد محدد'}
                        </span>
                      </div>
                    </div>

                    {/* Parent Phone Numbers List with Direct Send */}
                    <div>
                      <div className="text-[11px] font-bold text-[#86efac] mb-1.5">
                        أرقام هواتف أولياء الأمور للإرسال:
                      </div>
                      <div className="space-y-2">
                        {student.parentPhones && student.parentPhones.length > 0 ? (
                          student.parentPhones.map((phone, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#022c22] border border-[#065f46] text-xs"
                            >
                              <div className="flex items-center gap-1.5 text-slate-300" dir="ltr">
                                <Phone className="w-3.5 h-3.5 text-[#fbbf24]" />
                                <span>{phone}</span>
                              </div>
                              <button
                                onClick={() => handleSendWhatsApp(phone, msg)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                              >
                                <Send className="w-3 h-3" />
                                <span>إرسال واتساب</span>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#022c22] border border-[#065f46] text-xs">
                            <span className="text-[#86efac]" dir="ltr">
                              {student.phone}
                            </span>
                            <button
                              onClick={() => handleSendWhatsApp(student.phone, msg)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <Send className="w-3 h-3" />
                              <span>إرسال</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Box: Formatted Message Box */}
                  <div className="lg:w-2/3 flex flex-col justify-between bg-[#022c22] border border-[#065f46] rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#065f46] pb-2">
                      <span className="text-xs font-bold text-[#fbbf24] flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>نص الرسالة المعتمدة بالتفاصيل</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRefreshStudentMessage(student)}
                          title="تحديث الرسالة من بيانات المعلم"
                          className="p-1.5 rounded-xl text-[#86efac] hover:text-[#fbbf24] hover:bg-[#064e3b] cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(student.id)}
                          title="تعديل نص الرسالة يدوياً"
                          className="p-1.5 rounded-xl text-[#86efac] hover:text-[#fbbf24] hover:bg-[#064e3b] cursor-pointer transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopy(student.id, msg)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isCopied
                              ? 'bg-[#fbbf24]/20 text-[#fbbf24]'
                              : 'bg-[#064e3b] text-[#86efac] hover:text-white border border-[#065f46]'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#fbbf24]" />
                              <span>تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Message Preview */}
                    <div className="bg-[#064e3b]/40 rounded-2xl p-4 text-xs text-[#f0f9f6] whitespace-pre-line leading-relaxed font-sans border border-[#065f46] max-h-60 overflow-y-auto">
                      {msg}
                    </div>

                    <div className="text-[11px] text-[#86efac]/70 flex items-center justify-between pt-1">
                      <span>الرابط المرفق: بوابة المتابعة الحية للطالب</span>
                      <a
                        href={`/?portal=${student.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#fbbf24] hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>معاينة صفحة الطالب</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Manual Edit Message Modal */}
      {editingStudentId && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#064e3b] border border-[#fbbf24]/40 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#fbbf24] font-heading">
              تعديل نص رسالة الواتساب
            </h3>
            <textarea
              rows={9}
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl p-3.5 text-xs text-[#f0f9f6] outline-none resize-none"
              dir="rtl"
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setEditingStudentId(null)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#86efac] hover:bg-[#022c22] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-md cursor-pointer"
              >
                حفظ النص المعدل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
