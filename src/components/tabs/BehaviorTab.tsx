import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Send,
  MessageCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  Sparkles,
  RefreshCw,
  X,
  Filter,
  ShieldCheck,
  Eye,
  FileText
} from 'lucide-react';
import { Student, BehaviorViolation, ViolationSeverity, AppSettings } from '../../types';
import { triggerComplexThemePulse } from '../../utils/highlightHelper';

interface BehaviorTabProps {
  students: Student[];
  violations: BehaviorViolation[];
  settings: AppSettings;
  teacherName?: string;
  onSaveViolation: (violation: BehaviorViolation) => Promise<void>;
  onDeleteViolation: (id: string) => Promise<void>;
  preselectedStudentId?: string;
  onRefreshViolations?: () => Promise<void>;
  initialHighlightId?: string;
}

const COMMON_VIOLATIONS = [
  'الكلام الجانبي والتشويش أثناء التلاوة',
  'عدم إحضار المصحف الشريف أو الدفتر',
  'التأخر المتكرر عن موعد بداية الحلقة',
  'استخدام الهاتف المحمول أثناء التسميع',
  'إهمال مراجعة الماضي أو عدم التحضير المسبق',
  'سوء الأدب أو الخلاف والمشاغبة مع الزملاء',
  'الخروج من الحلقة دون استئذان المعلم',
  'النوم أو التكاسل والشرود في المجلس'
];

const COMMON_ACTIONS = [
  'تنبيه شفهي وتذكير بآداب مجالس القرآن الكريم',
  'إشعار ولي الأمر عبر الواتساب للتنسيق التربوي المشترك',
  'حسم نقطة واحدة من رصيد السلوك والتميز',
  'تغيير مكان جلوس الطالب لتفادي التشتت والانشغال',
  'استدعاء ولي الأمر إلى مقر الحلقة للتشاور والمتابعة',
  'تكليف الطالب بورد إضافي لتثبيت الحفظ وتعزيز الانضباط'
];

export const BehaviorTab: React.FC<BehaviorTabProps> = ({
  students,
  violations,
  settings,
  teacherName,
  onSaveViolation,
  onDeleteViolation,
  preselectedStudentId,
  onRefreshViolations,
  initialHighlightId
}) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedViolationId, setCopiedViolationId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (initialHighlightId) {
      setTimeout(() => {
        triggerComplexThemePulse(initialHighlightId);
      }, 350);
    }
  }, [initialHighlightId]);

  // Auto-load violations on mount immediately
  const handleRefreshViolations = async () => {
    if (!onRefreshViolations) return;
    setIsRefreshing(true);
    try {
      await onRefreshViolations();
    } catch (e) {
      console.error('Failed to refresh violations:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefreshViolations();
  }, []);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTargetViolation, setDeleteTargetViolation] = useState<BehaviorViolation | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [formStudentId, setFormStudentId] = useState<string>(preselectedStudentId || (students[0]?.id || ''));

  // Instantly update student dropdown when students change (e.g. switching activeHalaqahId)
  useEffect(() => {
    if (preselectedStudentId && students.some(s => s.id === preselectedStudentId)) {
      setFormStudentId(preselectedStudentId);
    } else if (students.length > 0) {
      if (!formStudentId || !students.some(s => s.id === formStudentId)) {
        setFormStudentId(students[0].id);
      }
    } else {
      setFormStudentId('');
    }
  }, [students, preselectedStudentId, formStudentId]);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState<string>(
    new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [formViolationType, setFormViolationType] = useState<string>(COMMON_VIOLATIONS[0]);
  const [formCustomType, setFormCustomType] = useState<string>('');
  const [formSeverity, setFormSeverity] = useState<ViolationSeverity>('تنبيه');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formActionTaken, setFormActionTaken] = useState<string>(COMMON_ACTIONS[0]);
  const [formCustomAction, setFormCustomAction] = useState<string>('');
  const [formPointsDeducted, setFormPointsDeducted] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'تم الإشعار' | 'قيد المتابعة' | 'تم التوجيه والمعالجة'>('تم الإشعار');
  const [formParentNotified, setFormParentNotified] = useState<boolean>(true);
  const [formMessageText, setFormMessageText] = useState<string>('');
  const [formShowInPortal, setFormShowInPortal] = useState<boolean>(true);

  // Normalized phone formatting helper for Saudi / Gulf / International WhatsApp
  const normalizePhoneNumber = (phone: string): string => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('05')) {
      clean = '966' + clean.substring(1);
    } else if (clean.startsWith('5') && clean.length === 9) {
      clean = '966' + clean;
    }
    return clean;
  };

  // Find currently selected student in the form
  const currentFormStudent = students.find(s => s.id === formStudentId) || students[0];

  // Helper to open Add modal
  const handleOpenAddModal = (studentId?: string) => {
    const targetStdId = studentId || preselectedStudentId || students[0]?.id || '';
    const std = students.find(s => s.id === targetStdId) || students[0];

    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5);

    setFormId(null);
    setFormStudentId(targetStdId);
    setFormDate(now.toISOString().split('T')[0]);
    setFormTime(currentTimeStr);
    setFormViolationType(COMMON_VIOLATIONS[0]);
    setFormCustomType('');
    setFormSeverity('تنبيه');
    setFormDescription('');
    setFormActionTaken(COMMON_ACTIONS[0]);
    setFormCustomAction('');
    setFormPointsDeducted(0);
    setFormStatus('تم الإشعار');
    setFormParentNotified(true);
    setFormShowInPortal(true);

    // Initial draft message
    const defaultMsg = buildDefaultMessage(
      std?.name || 'الطالب',
      COMMON_VIOLATIONS[0],
      COMMON_ACTIONS[0]
    );
    setFormMessageText(defaultMsg);

    setIsModalOpen(true);
  };

  // Helper to open Edit modal
  const handleOpenEditModal = (violation: BehaviorViolation) => {
    setFormId(violation.id);
    setFormStudentId(violation.studentId);
    setFormDate(violation.date);
    setFormTime(violation.time || '17:00');

    if (COMMON_VIOLATIONS.includes(violation.violationType)) {
      setFormViolationType(violation.violationType);
      setFormCustomType('');
    } else {
      setFormViolationType('مخالفة أخرى مخصصة');
      setFormCustomType(violation.violationType);
    }

    setFormSeverity(violation.severity);
    setFormDescription(violation.description || '');

    if (COMMON_ACTIONS.includes(violation.actionTaken)) {
      setFormActionTaken(violation.actionTaken);
      setFormCustomAction('');
    } else {
      setFormActionTaken('إجراء آخر مخصص');
      setFormCustomAction(violation.actionTaken);
    }

    setFormPointsDeducted(violation.pointsDeducted || 0);
    setFormStatus(violation.status);
    setFormParentNotified(violation.parentNotified);
    setFormMessageText(violation.messageText || '');
    setFormShowInPortal(violation.showInPortal ?? true);

    setIsModalOpen(true);
  };

  // Build polite pedagogical message draft
  const buildDefaultMessage = (
    studentName: string,
    violationType: string,
    action: string
  ): string => {
    return `السلام عليكم ورحمة الله وبركاته
المكرم ولي أمر الطالب العزيز / *${studentName}* حفظكم الله ورعاكم..

تحية طيبة من *${settings.halaqahName || 'حلقة القرآن الكريم'}*، وحرصاً منا على رعاية الطالب وتأدبه بآداب القرآن الكريم، نود إحاطتكم بـ:
• *الملاحظة السلوكية اليوم:* ${violationType}
• *الإجراء والتوجيه المتخذ:* ${action}

شاكرين لكم عظيم تعاونكم ومتابعتكم المستمرة في البيت وحثه على الانضباط، فنحن معاً شركاء في بناء جيل قرآني متخلق بأخلاق المصحف الشريف.
مع وافر التقدير والدعاء،
معلم الحلقة: *${teacherName || settings.teacherName || 'معلم الحلقة'}*`;
  };

  // Generate Message via Gemini AI
  const handleGenerateAIMessage = async () => {
    const student = currentFormStudent;
    if (!student) return;

    setIsGeneratingMessage(true);
    const activeViolationType =
      formViolationType === 'مخالفة أخرى مخصصة' ? formCustomType || 'ملاحظة سلوكية' : formViolationType;
    const activeAction =
      formActionTaken === 'إجراء آخر مخصص' ? formCustomAction || 'تنبيه وتوجيه' : formActionTaken;

    try {
      const res = await fetch('/api/gemini/generate-violation-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          violationType: activeViolationType,
          severity: formSeverity,
          description: formDescription,
          actionTaken: activeAction,
          teacherName: teacherName || settings.teacherName,
          halaqahName: settings.halaqahName
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          setFormMessageText(data.message);
        }
      }
    } catch (e) {
      console.warn('AI Message generation fallback:', e);
      setFormMessageText(buildDefaultMessage(student.name, activeViolationType, activeAction));
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  // Copy Message Helper
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedViolationId(id);
    setTimeout(() => setCopiedViolationId(null), 2500);
  };

  // Direct WhatsApp Send
  const handleSendWhatsApp = async (violation: BehaviorViolation, targetPhone?: string) => {
    const std = students.find(s => s.id === violation.studentId);
    const phoneToSend = targetPhone || violation.parentNotificationPhone || std?.parentPhones?.[0] || std?.phone || '';

    if (!phoneToSend) {
      showToast('لم يتم العثور على رقم هاتف مسجل لولي أمر الطالب.');
      return;
    }

    const cleanPhone = normalizePhoneNumber(phoneToSend);
    const messageText = violation.messageText || buildDefaultMessage(violation.studentName, violation.violationType, violation.actionTaken);
    const encoded = encodeURIComponent(messageText);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Open WhatsApp
    window.open(url, '_blank');

    // Update violation to reflect parent notification if not already
    if (!violation.parentNotified || violation.status === 'قيد المتابعة') {
      const updated: BehaviorViolation = {
        ...violation,
        parentNotified: true,
        parentNotificationDate: new Date().toISOString().split('T')[0],
        parentNotificationPhone: phoneToSend,
        status: violation.status === 'قيد المتابعة' ? 'تم الإشعار' : violation.status
      };
      await onSaveViolation(updated);
    }
  };

  // Save Modal Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formStudentId) {
      setFormError('يرجى اختيار الطالب المعني أولاً.');
      return;
    }

    const student = currentFormStudent;
    const finalViolationType =
      formViolationType === 'مخالفة أخرى مخصصة' ? formCustomType.trim() || 'مخالفة سلوكية عامة' : formViolationType;
    const finalAction =
      formActionTaken === 'إجراء آخر مخصص' ? formCustomAction.trim() || 'تنبيه شفهي' : formActionTaken;

    const existingViolation = formId ? violations.find(v => v.id === formId) : null;
    const finalStudentName = student?.name || existingViolation?.studentName || 'طالب';
    const finalPhone =
      student?.parentPhones?.[0] || student?.phone || existingViolation?.parentNotificationPhone || '';

    setIsSaving(true);
    try {
      const violationObj: BehaviorViolation = {
        id: formId || `viol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        studentId: formStudentId,
        studentName: finalStudentName,
        date: formDate,
        time: formTime,
        violationType: finalViolationType,
        severity: formSeverity,
        description: formDescription.trim(),
        actionTaken: finalAction,
        pointsDeducted: Number(formPointsDeducted) || 0,
        status: formStatus,
        parentNotified: formParentNotified,
        parentNotificationDate: formParentNotified ? formDate : '',
        parentNotificationPhone: finalPhone || '',
        messageText: formMessageText.trim(),
        teacherName: teacherName || settings.teacherName,
        showInPortal: formShowInPortal,
        createdAt: existingViolation?.createdAt || new Date().toISOString()
      };

      await onSaveViolation(violationObj);
      setIsModalOpen(false);
      showToast(formId ? 'تم حفظ تعديل المخالفة بنجاح!' : 'تم تسجيل المخالفة بنجاح!');
    } catch (err) {
      console.error('Save violation error:', err);
      setFormError('حدث خطأ أثناء حفظ المخالفة، يرجى المحاولة ثانية.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mark Violation Resolved
  const handleToggleResolved = async (violation: BehaviorViolation) => {
    const nextStatus = violation.status === 'تم التوجيه والمعالجة' ? 'قيد المتابعة' : 'تم التوجيه والمعالجة';
    const updated: BehaviorViolation = {
      ...violation,
      status: nextStatus
    };
    await onSaveViolation(updated);
  };

  // Filtered List
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const matchSearch =
        v.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.violationType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.actionTaken.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStudent = selectedStudentFilter === 'all' || v.studentId === selectedStudentFilter;
      const matchSeverity = severityFilter === 'all' || v.severity === severityFilter;
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;

      return matchSearch && matchStudent && matchSeverity && matchStatus;
    });
  }, [violations, searchTerm, selectedStudentFilter, severityFilter, statusFilter]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = violations.length;
    const warnings = violations.filter(v => v.severity === 'تنبيه').length;
    const moderateOrSevere = violations.filter(v => v.severity === 'متوسطة' || v.severity === 'جسيمة').length;
    const notified = violations.filter(v => v.parentNotified).length;
    const resolved = violations.filter(v => v.status === 'تم التوجيه والمعالجة').length;
    return { total, warnings, moderateOrSevere, notified, resolved };
  }, [violations]);

  // Severity UI Styling Helper
  const getSeverityBadge = (severity: ViolationSeverity) => {
    switch (severity) {
      case 'تنبيه':
        return {
          label: 'تنبيه شفهي أخوي',
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        };
      case 'بسيطة':
        return {
          label: 'مخالفة خفيفة',
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
        };
      case 'متوسطة':
        return {
          label: 'مخالفة متوسطة',
          bg: 'bg-orange-500/15 border-orange-500/30 text-orange-300'
        };
      case 'جسيمة':
        return {
          label: 'مخالفة جسيمة',
          bg: 'bg-rose-600/20 border-rose-500/40 text-rose-300'
        };
      default:
        return {
          label: severity,
          bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#064e3b]/80 border border-[#065f46] rounded-[28px] p-5 sm:p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-[#064e3b] flex items-center justify-center shadow-lg border border-amber-400/40 font-black">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-white">
                سجل المخالفات السلوكية والتوجيه التربوي
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {violations.length} سجل
              </span>
            </div>
            <p className="text-xs text-[#86efac]/90 mt-1 leading-relaxed">
              تسجيل التوجيهات السلوكية لطلاب الحلقة وصياغة رسائل واتساب تربوية راقية لأولياء الأمور
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onRefreshViolations && (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefreshViolations}
              className="px-3.5 py-3 rounded-2xl bg-[#064e3b]/80 hover:bg-[#064e3b] border border-[#065f46] text-[#86efac] hover:text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              title="تحديث وتحميل المخالفات مباشرة"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#fbbf24]' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'جاري التحميل...' : 'تحديث المخالفات'}</span>
            </button>
          )}
          <button
            onClick={() => handleOpenAddModal()}
            className="px-5 py-3 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل مخالفة سلوكية جديدة</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#86efac] font-bold">إجمالي المخالفات</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-[#065f46] flex items-center justify-center text-[#fbbf24]">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#86efac] font-bold">تنبيهات خفيفة</div>
            <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5">{stats.warnings}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-[#065f46] flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#86efac] font-bold">تم إشعار ولي الأمر</div>
            <div className="text-2xl font-black text-[#fbbf24] font-mono mt-0.5">{stats.notified}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-[#065f46] flex items-center justify-center text-[#fbbf24]">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#86efac] font-bold">تم التوجيه والمعالجة</div>
            <div className="text-2xl font-black text-cyan-300 font-mono mt-0.5">{stats.resolved}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-[#065f46] flex items-center justify-center text-cyan-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#064e3b]/70 border border-[#065f46] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86efac]/70" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="البحث باسم الطالب، نوع المخالفة، أو الإجراء المتخذ..."
            className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-xs text-white placeholder-[#86efac]/50 focus:outline-none focus:border-[#fbbf24]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Student Filter */}
          <select
            value={selectedStudentFilter}
            onChange={e => setSelectedStudentFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-xs text-slate-200 focus:outline-none focus:border-[#fbbf24]"
          >
            <option value="all">جميع الطلاب ({students.length})</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-xs text-slate-200 focus:outline-none focus:border-[#fbbf24]"
          >
            <option value="all">كل درجات الشدة</option>
            <option value="تنبيه">تنبيه شفهي</option>
            <option value="بسيطة">مخالفة بسيطة</option>
            <option value="متوسطة">مخالفة متوسطة</option>
            <option value="جسيمة">مخالفة جسيمة</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-xs text-slate-200 focus:outline-none focus:border-[#fbbf24]"
          >
            <option value="all">كل الحالات</option>
            <option value="تم الإشعار">تم الإشعار</option>
            <option value="قيد المتابعة">قيد المتابعة</option>
            <option value="تم التوجيه والمعالجة">تم التوجيه والمعالجة</option>
          </select>
        </div>
      </div>

      {/* Violations List / Empty State */}
      {filteredViolations.length === 0 ? (
        <div className="bg-[#064e3b]/40 border border-[#065f46] rounded-[28px] p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#022c22] border border-[#065f46] text-[#86efac] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">لا توجد مخالفات سلوكية مسجلة</h3>
            <p className="text-xs text-[#86efac]/80 mt-1 max-w-sm mx-auto">
              الحمد لله، الحلقة تسير بانضباط ممتاز وهدوء، أو يمكنك تسجيل ملاحظة جديدة عند الحاجة.
            </p>
          </div>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 rounded-xl bg-[#fbbf24] text-[#064e3b] font-bold text-xs hover:bg-[#f59e0b] transition-all cursor-pointer"
          >
            تسجيل ملاحظة أو مخالفة سلوكية
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredViolations.map(violation => {
            const student = students.find(s => s.id === violation.studentId);
            const severityInfo = getSeverityBadge(violation.severity);
            const isResolved = violation.status === 'تم التوجيه والمعالجة';
            const isCopied = copiedViolationId === violation.id;

            return (
              <div
                key={violation.id}
                id={`violation-item-${violation.id}`}
                data-item-id={violation.id}
                className={`rounded-[24px] border transition-all ${
                  isResolved
                    ? 'bg-[#064e3b]/50 border-[#065f46]/80'
                    : 'bg-[#064e3b]/85 border-[#065f46] shadow-lg'
                } p-5 sm:p-6 space-y-4`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#065f46] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#022c22] border border-[#065f46] flex items-center justify-center text-[#fbbf24] font-black text-sm">
                      {violation.studentName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          {violation.studentName}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${severityInfo.bg}`}>
                          {severityInfo.label}
                        </span>
                        {violation.pointsDeducted ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            حسم: {violation.pointsDeducted} درجات
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#86efac]/80 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#fbbf24]" />
                          {violation.date}
                        </span>
                        {violation.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#fbbf24]" />
                            {violation.time}
                          </span>
                        )}
                        {violation.teacherName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#fbbf24]" />
                            بإشراف: {violation.teacherName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Resolve Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleResolved(violation)}
                      title={isResolved ? 'إعادة إلى قيد المتابعة' : 'تأكيد المعالجة والتوجيه'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#022c22] text-[#86efac] border border-[#065f46] hover:text-white hover:border-[#fbbf24]'
                      }`}
                    >
                      <CheckCircle className={`w-3.5 h-3.5 ${isResolved ? 'text-emerald-400' : 'text-[#86efac]'}`} />
                      <span>{violation.status}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(violation)}
                      title="تعديل المخالفة"
                      className="p-2 rounded-xl bg-[#022c22] border border-[#065f46] text-[#86efac] hover:text-[#fbbf24] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteTargetViolation(violation)}
                      title="حذف المخالفة"
                      className="p-2 rounded-xl bg-[#022c22] border border-[#065f46] text-rose-400 hover:text-rose-200 hover:border-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Violation Details Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2 bg-[#022c22]/80 border border-[#065f46] p-3.5 rounded-2xl">
                    <div className="text-[#fbbf24] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>نوع الملاحظة السلوكية:</span>
                    </div>
                    <div className="text-white font-bold text-sm">
                      {violation.violationType}
                    </div>
                    {violation.description && (
                      <div className="text-[#86efac]/90 pt-1 leading-relaxed border-t border-[#065f46]/60">
                        <strong className="text-slate-300">تفاصيل ما حدث: </strong>
                        {violation.description}
                      </div>
                    )}
                    <div className="text-[#f0f9f6] pt-1 border-t border-[#065f46]/60">
                      <strong className="text-emerald-300">الإجراء المتخذ: </strong>
                      {violation.actionTaken}
                    </div>
                  </div>

                  {/* WhatsApp Message & Action Box ("ويرسل رسالة") */}
                  <div className="flex flex-col justify-between space-y-3 bg-[#022c22]/90 border border-[#065f46] p-3.5 rounded-2xl">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#065f46]/60 pb-1.5">
                        <span className="text-[#fbbf24] font-bold flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>رسالة إشعار ولي الأمر التربوية:</span>
                        </span>
                        {violation.parentNotified ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>تم إشعار ولي الأمر</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-300 font-bold">
                            بانتظار الإرسال
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-200 mt-2 leading-relaxed whitespace-pre-line line-clamp-3 hover:line-clamp-none transition-all">
                        {violation.messageText || 'لم يتم تحديد نص رسالة خاص.'}
                      </p>
                    </div>

                    {/* Action Buttons to Send WhatsApp and Copy */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#065f46]/60">
                      <button
                        onClick={() => handleSendWhatsApp(violation)}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-95 text-white font-black text-[11px] flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>إرسال واتساب لولي الأمر</span>
                      </button>

                      <button
                        onClick={() => handleCopyMessage(violation.id, violation.messageText || '')}
                        className="py-2 px-3 rounded-xl bg-[#064e3b] hover:bg-[#022c22] border border-[#065f46] text-[#86efac] hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                        title="نسخ نص الرسالة"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ الرسالة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Violation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#064e3b] border border-[#fbbf24]/40 rounded-[32px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-5 text-right relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#065f46] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fbbf24] text-[#064e3b] flex items-center justify-center font-black">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    {formId ? 'تعديل سجل المخالفة والتوجيه التربوي' : 'تسجيل مخالفة سلوكية وتوجيه جديد'}
                  </h3>
                  <p className="text-xs text-[#86efac]">
                    توثيق الملاحظة السلوكية وصياغة رسالة راقية لولي الأمر
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#022c22] border border-[#065f46] text-[#86efac] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              {/* Student & Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#fbbf24] font-bold mb-1.5">
                    الطالب المعني:
                  </label>
                  <select
                    value={formStudentId}
                    onChange={e => {
                      const newId = e.target.value;
                      setFormStudentId(newId);
                      const std = students.find(s => s.id === newId);
                      if (std) {
                        setFormMessageText(
                          buildDefaultMessage(
                            std.name,
                            formViolationType === 'مخالفة أخرى مخصصة' ? formCustomType || 'ملاحظة سلوكية' : formViolationType,
                            formActionTaken === 'إجراء آخر مخصص' ? formCustomAction || 'تنبيه شفهي' : formActionTaken
                          )
                        );
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-white focus:outline-none focus:border-[#fbbf24] font-bold"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.currentSurahName || 'سورة'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#fbbf24] font-bold mb-1.5">
                    تاريخ المخالفة:
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>

                <div>
                  <label className="block text-[#fbbf24] font-bold mb-1.5">
                    الوقت:
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
              </div>

              {/* Violation Type */}
              <div>
                <label className="block text-[#fbbf24] font-bold mb-1.5">
                  نوع المخالفة السلوكية:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {COMMON_VIOLATIONS.map((type, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setFormViolationType(type);
                        setFormMessageText(
                          buildDefaultMessage(
                            currentFormStudent?.name || 'الطالب',
                            type,
                            formActionTaken === 'إجراء آخر مخصص' ? formCustomAction || 'تنبيه' : formActionTaken
                          )
                        );
                      }}
                      className={`p-2 rounded-xl text-right transition-all cursor-pointer text-[11px] font-bold border ${
                        formViolationType === type
                          ? 'bg-[#fbbf24] text-[#064e3b] border-amber-300 shadow-sm font-black'
                          : 'bg-[#022c22] text-[#86efac] border-[#065f46] hover:border-[#fbbf24]/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormViolationType('مخالفة أخرى مخصصة')}
                    className={`p-2 rounded-xl text-right transition-all cursor-pointer text-[11px] font-bold border ${
                      formViolationType === 'مخالفة أخرى مخصصة'
                        ? 'bg-[#fbbf24] text-[#064e3b] border-amber-300 font-black'
                        : 'bg-[#022c22] text-[#86efac] border-[#065f46]'
                    }`}
                  >
                    + مخالفة أخرى مخصصة
                  </button>
                </div>

                {formViolationType === 'مخالفة أخرى مخصصة' && (
                  <input
                    type="text"
                    value={formCustomType}
                    onChange={e => setFormCustomType(e.target.value)}
                    placeholder="اكتب وصف المخالفة المخصصة هنا..."
                    className="w-full p-2.5 rounded-xl bg-[#022c22] border border-[#fbbf24]/50 text-white placeholder-slate-400 focus:outline-none focus:border-[#fbbf24]"
                  />
                )}
              </div>

              {/* Severity & Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#fbbf24] font-bold mb-1.5">
                    درجة الشدة:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['تنبيه', 'بسيطة', 'متوسطة', 'جسيمة'] as ViolationSeverity[]).map(sev => (
                      <button
                        type="button"
                        key={sev}
                        onClick={() => setFormSeverity(sev)}
                        className={`py-2 rounded-xl font-bold text-center border transition-all cursor-pointer ${
                          formSeverity === sev
                            ? 'bg-[#fbbf24] text-[#064e3b] border-amber-300 font-black'
                            : 'bg-[#022c22] text-slate-300 border-[#065f46] hover:text-white'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[#fbbf24] font-bold mb-1.5 flex items-center justify-between">
                    <span>خصم نقاط من رصيد الطالب (اختياري):</span>
                    {currentFormStudent && (
                      <span className="text-[11px] text-amber-300 font-bold">
                        رصيد الطالب الحالي: {currentFormStudent.points || 0} نقطة
                      </span>
                    )}
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[0, 1, 2, 3, 5, 10].map(pts => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setFormPointsDeducted(pts)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            formPointsDeducted === pts
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'bg-[#022c22] text-rose-200/80 hover:text-white border border-rose-500/40'
                          }`}
                        >
                          {pts === 0 ? 'بدون خصم (0)' : `خصم ${pts} نقاط`}
                        </button>
                      ))}
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formPointsDeducted}
                          onChange={e => setFormPointsDeducted(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 p-1.5 rounded-lg bg-[#022c22] border border-[#065f46] text-center text-white font-mono text-xs font-bold focus:outline-none focus:border-[#fbbf24]"
                          placeholder="مخصص"
                        />
                      </div>
                    </div>
                    {formPointsDeducted > 0 && currentFormStudent && (
                      <p className="text-[11px] text-rose-300 font-bold">
                        ⚠️ سيتم خصم ({formPointsDeducted}) نقطة تلقائياً من رصيد الطالب (الرصيد بعد الخصم: {Math.max(0, (currentFormStudent.points || 0) - formPointsDeducted)} نقطة).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Details */}
              <div>
                <label className="block text-[#fbbf24] font-bold mb-1.5">
                  تفاصيل ما حدث وتوجيه الشيخ للطالب:
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="مثال: تحدث مع زميله في الصف أثناء تلاوة ورد الحفظ وتشتيت المجموعة، وتم تذكيره بآداب المجلس..."
                  className="w-full p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-white placeholder-[#86efac]/40 focus:outline-none focus:border-[#fbbf24] leading-relaxed"
                />
              </div>

              {/* Action Taken */}
              <div>
                <label className="block text-[#fbbf24] font-bold mb-1.5">
                  الإجراء المتخذ:
                </label>
                <select
                  value={formActionTaken}
                  onChange={e => {
                    const newAction = e.target.value;
                    setFormActionTaken(newAction);
                    setFormMessageText(
                      buildDefaultMessage(
                        currentFormStudent?.name || 'الطالب',
                        formViolationType === 'مخالفة أخرى مخصصة' ? formCustomType || 'ملاحظة سلوكية' : formViolationType,
                        newAction === 'إجراء آخر مخصص' ? formCustomAction || 'تنبيه' : newAction
                      )
                    );
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] text-white focus:outline-none focus:border-[#fbbf24] mb-2"
                >
                  {COMMON_ACTIONS.map((act, idx) => (
                    <option key={idx} value={act}>
                      {act}
                    </option>
                  ))}
                  <option value="إجراء آخر مخصص">+ إجراء آخر مخصص</option>
                </select>

                {formActionTaken === 'إجراء آخر مخصص' && (
                  <input
                    type="text"
                    value={formCustomAction}
                    onChange={e => setFormCustomAction(e.target.value)}
                    placeholder="اكتب الإجراء المتخذ بالتفصيل..."
                    className="w-full p-2.5 rounded-xl bg-[#022c22] border border-[#fbbf24]/50 text-white placeholder-slate-400 focus:outline-none focus:border-[#fbbf24]"
                  />
                )}
              </div>

              {/* Pedagogical WhatsApp Message Box ("ويرسل رسالة") */}
              <div className="bg-[#022c22] border border-amber-500/40 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#fbbf24] font-bold flex items-center gap-1.5 text-xs">
                    <MessageCircle className="w-4 h-4" />
                    <span>نص الرسالة التربوية لولي الأمر:</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleGenerateAIMessage}
                    disabled={isGeneratingMessage}
                    className="px-3 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingMessage ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingMessage ? 'جاري الصياغة...' : 'صياغة رسالة تربوية فورية'}</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={formMessageText}
                  onChange={e => setFormMessageText(e.target.value)}
                  placeholder="نص الرسالة التي سترسل لولي الأمر عبر الواتساب..."
                  className="w-full p-3 rounded-xl bg-[#064e3b]/50 border border-[#065f46] text-white focus:outline-none focus:border-[#fbbf24] leading-relaxed text-xs"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[#86efac]">
                    <input
                      type="checkbox"
                      checked={formShowInPortal}
                      onChange={e => setFormShowInPortal(e.target.checked)}
                      className="rounded accent-[#fbbf24] w-4 h-4 cursor-pointer"
                    />
                    <span>إظهار التوجيه في بوابة المتابعة الحية لولي الأمر</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[#86efac]/80">
                      هاتف الإرسال: {currentFormStudent?.parentPhones?.[0] || currentFormStudent?.phone || 'لا يوجد'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#065f46]">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSaving ? 'جاري الحفظ...' : formId ? 'تحديث وتعديل المخالفة' : 'حفظ المخالفة في السجل'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-5 rounded-2xl bg-[#022c22] hover:bg-[#064e3b] text-[#86efac] font-bold text-xs border border-[#065f46] cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Safe for iframes without window.confirm) */}
      {deleteTargetViolation && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#064e3b] border border-rose-500/50 rounded-[28px] max-w-md w-full p-6 text-right space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تأكيد حذف المخالفة السلوكية</h3>
                <p className="text-xs text-[#86efac]/80">هذا الإجراء سيحذف السجل بشكل نهائي</p>
              </div>
            </div>

            <div className="bg-[#022c22] border border-[#065f46] p-3.5 rounded-2xl text-xs space-y-1.5">
              <p className="text-white font-bold">
                الطالب: <span className="text-[#fbbf24]">{deleteTargetViolation.studentName}</span>
              </p>
              <p className="text-[#86efac]">نوع المخالفة: {deleteTargetViolation.violationType}</p>
              <p className="text-slate-400">تاريخ التسجيل: {deleteTargetViolation.date} {deleteTargetViolation.time ? `(${deleteTargetViolation.time})` : ''}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const targetId = deleteTargetViolation.id;
                  setDeleteTargetViolation(null);
                  await onDeleteViolation(targetId);
                  showToast('تم حذف سجل المخالفة بنجاح');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف نهائياً</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTargetViolation(null)}
                className="py-2.5 px-4 rounded-xl bg-[#022c22] border border-[#065f46] text-[#86efac] hover:text-white text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#022c22] border border-[#fbbf24] text-[#fbbf24] font-bold text-xs py-2.5 px-5 rounded-2xl shadow-xl shadow-black/60 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#fbbf24]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
