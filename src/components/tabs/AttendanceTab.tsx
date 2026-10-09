import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle,
  Calendar,
  Save,
  CheckCheck,
  UserCheck,
  AlertCircle,
  Search,
  History,
  FileText,
  Printer,
  Copy,
  Share2,
  MessageCircle,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Send,
  Award,
  Sparkles,
  Loader2
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  AttendanceStatus,
  AppSettings,
  AbsenceMessageTemplate,
  getStudentParentPhone,
  QuranComplex
} from '../../types';
import { PrintableQuranicReport } from '../reports/PrintableQuranicReport';
import { LiveSyncButton } from '../loading/ModernLoadingSuite';

const DEFAULT_ABSENCE_TEMPLATES: AbsenceMessageTemplate[] = [
  {
    id: 'absence-template-default',
    title: 'رسالة تفقد غياب ودية (الافتراضية)',
    template: 'السلام عليكم ورحمة الله وبركاته، علومك شيخنا بشرنا عنك وعن {اسم_الولد}، استغربنا غيابه اليوم بشر عساه بخير؟',
    createdAt: new Date().toISOString()
  }
];

interface AttendanceTabProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => Promise<void>;
  settings?: AppSettings;
  teacherName?: string;
  isDeveloper?: boolean;
  onUpdateSettings?: (settings: AppSettings) => Promise<void>;
  complexName?: string;
  activeComplex?: QuranComplex | null;
  halaqahName?: string;
  isSyncing?: boolean;
  onRefreshData?: () => void | Promise<void>;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  students,
  attendanceRecords,
  onSaveAttendance,
  settings,
  teacherName,
  isDeveloper = false,
  onUpdateSettings,
  complexName,
  activeComplex,
  halaqahName,
  isSyncing,
  onRefreshData
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // 1. Daily Summary Message Modal State
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);

  // 2. Absent Student Notification Modal State
  const [selectedAbsentStudent, setSelectedAbsentStudent] = useState<Student | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('absence-template-default');
  const [customAbsentMessage, setCustomAbsentMessage] = useState<string>('');
  const [absentMessageCopied, setAbsentMessageCopied] = useState(false);

  // 3. Programmer Message Settings Modal State
  const [showMessageSettingsModal, setShowMessageSettingsModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<AbsenceMessageTemplate> | null>(null);
  const [templateFormTitle, setTemplateFormTitle] = useState('');
  const [templateFormText, setTemplateFormText] = useState('');
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const templateTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 4. Supervisor Attendance Points Settings Modal State
  const [showPointsSettingsModal, setShowPointsSettingsModal] = useState(false);
  const [presentPts, setPresentPts] = useState<number>(settings?.attendancePointsSettings?.presentPoints ?? 1);
  const [latePts, setLatePts] = useState<number>(settings?.attendancePointsSettings?.latePoints ?? 0);
  const [excusedPts, setExcusedPts] = useState<number>(settings?.attendancePointsSettings?.excusedPoints ?? 0);
  const [absentDeductPts, setAbsentDeductPts] = useState<number>(settings?.attendancePointsSettings?.absentPointsDeduction ?? 1);
  const [enableAttPts, setEnableAttPts] = useState<boolean>(settings?.attendancePointsSettings?.enableAttendancePoints ?? true);
  const [pointsSaveSuccess, setPointsSaveSuccess] = useState<string | null>(null);
  const [isSavingPoints, setIsSavingPoints] = useState(false);

  // Sync state if settings prop changes
  useEffect(() => {
    if (settings?.attendancePointsSettings) {
      setPresentPts(settings.attendancePointsSettings.presentPoints);
      setLatePts(settings.attendancePointsSettings.latePoints);
      setExcusedPts(settings.attendancePointsSettings.excusedPoints);
      setAbsentDeductPts(settings.attendancePointsSettings.absentPointsDeduction);
      setEnableAttPts(settings.attendancePointsSettings.enableAttendancePoints);
    }
  }, [settings]);

  // Resolved list of templates
  const absenceTemplates: AbsenceMessageTemplate[] =
    settings?.absenceMessageTemplates && settings.absenceMessageTemplates.length > 0
      ? settings.absenceMessageTemplates
      : DEFAULT_ABSENCE_TEMPLATES;

  // Current working attendance state for selectedDate (studentId -> { status, note })
  const [statusMap, setStatusMap] = useState<Record<string, { status: AttendanceStatus; note: string }>>(() => {
    const map: Record<string, { status: AttendanceStatus; note: string }> = {};
    const dateRecords = attendanceRecords.filter(r => r.date === selectedDate);
    students.forEach(s => {
      const existing = dateRecords.find(r => r.studentId === s.id);
      map[s.id] = {
        status: existing?.status || 'حاضر',
        note: existing?.note || ''
      };
    });
    return map;
  });

  // Re-sync statusMap whenever attendanceRecords, students, or selectedDate changes
  useEffect(() => {
    const dateRecords = attendanceRecords.filter(r => r.date === selectedDate);
    const newMap: Record<string, { status: AttendanceStatus; note: string }> = {};
    students.forEach(s => {
      const existing = dateRecords.find(r => r.studentId === s.id);
      newMap[s.id] = {
        status: existing?.status || 'حاضر',
        note: existing?.note || ''
      };
    });
    setStatusMap(newMap);
  }, [attendanceRecords, students, selectedDate]);

  // Re-sync when selectedDate changes
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSaveMessage('');
    const dateRecords = attendanceRecords.filter(r => r.date === newDate);
    const newMap: Record<string, { status: AttendanceStatus; note: string }> = {};
    students.forEach(s => {
      const existing = dateRecords.find(r => r.studentId === s.id);
      newMap[s.id] = {
        status: existing?.status || 'حاضر',
        note: existing?.note || ''
      };
    });
    setStatusMap(newMap);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note
      }
    }));
  };

  const handleMarkAllPresent = () => {
    setStatusMap(prev => {
      const updated = { ...prev };
      students.forEach(s => {
        updated[s.id] = {
          status: 'حاضر',
          note: prev[s.id]?.note || ''
        };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const recordsToSave: AttendanceRecord[] = students.map(s => {
        const entry = statusMap[s.id] || { status: 'حاضر', note: '' };
        return {
          id: `${selectedDate}_${s.id}`,
          date: selectedDate,
          studentId: s.id,
          status: entry.status || 'حاضر',
          note: entry.note || '',
          savedAt: new Date().toISOString()
        };
      });

      await onSaveAttendance(recordsToSave);
      setSaveMessage('تم حفظ سجل الحضور والغياب بنجاح!');
      setTimeout(() => setSaveMessage(''), 3500);
    } catch (e: any) {
      console.error('Save attendance error:', e);
      const detail = e?.message || e?.code || '';
      setSaveMessage(`حدث خطأ أثناء الحفظ ${detail ? `(${detail})` : ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Stats for the chosen date
  const statusValues = Object.values(statusMap) as Array<{ status: AttendanceStatus; note: string }>;
  const counts = {
    present: statusValues.filter(v => v.status === 'حاضر').length,
    absent: statusValues.filter(v => v.status === 'غائب').length,
    late: statusValues.filter(v => v.status === 'متأخر').length,
    excused: statusValues.filter(v => v.status === 'معتذر').length
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --------------------------------------------------------------------------
  // 1. Generate Daily Attendance Summary Message
  // --------------------------------------------------------------------------
  const generateDailySummaryText = (): string => {
    const dateObj = new Date(selectedDate);
    const dateFormatted = dateObj.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const cName = complexName || settings?.complexName || 'المجمع القرآني';
    const hName = halaqahName || settings?.halaqahName || 'الحلقة القرآنية';
    const tName = teacherName || settings?.teacherName || 'معلم ومحفظ الحلقة';

    const totalStudents = students.length;
    const presentList: Student[] = [];
    const absentList: { student: Student; note: string }[] = [];
    const lateList: { student: Student; note: string }[] = [];
    const excusedList: { student: Student; note: string }[] = [];

    students.forEach(s => {
      const entry = statusMap[s.id] || { status: 'حاضر', note: '' };
      if (entry.status === 'حاضر') presentList.push(s);
      else if (entry.status === 'غائب') absentList.push({ student: s, note: entry.note });
      else if (entry.status === 'متأخر') lateList.push({ student: s, note: entry.note });
      else if (entry.status === 'معتذر') excusedList.push({ student: s, note: entry.note });
    });

    let text = `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\n`;
    text += `📋 *تقرير حضور وغياب حلقة:* ${hName}\n`;
    text += `🕌 *المجمع القرآني:* ${cName}\n`;
    text += `👨‍🏫 *المعلم:* ${tName}\n`;
    text += `📅 *التاريخ:* ${dateFormatted} (${selectedDate})\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *إحصائية الحضور والغياب اليوم:* \n`;
    text += `• إجمالي الطلاب: ${totalStudents}\n`;
    text += `• ✅ الحاضرون: ${presentList.length}\n`;
    text += `• ❌ الغائبون: ${absentList.length}\n`;
    if (lateList.length > 0) text += `• ⏳ المتأخرون: ${lateList.length}\n`;
    if (excusedList.length > 0) text += `• 🌿 المعتذرون: ${excusedList.length}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📝 *كشف حضور وغياب الطلاب اليوم:*\n\n`;
    students.forEach((s, idx) => {
      const entry = statusMap[s.id] || { status: 'حاضر', note: '' };
      if (entry.status === 'حاضر') {
        text += `${idx + 1}. ${s.name} - ✅ حاضر\n`;
      } else if (entry.status === 'غائب') {
        text += `${idx + 1}. ${s.name} - ❌ غائب${entry.note ? ` (السبب: ${entry.note})` : ''}\n`;
      } else if (entry.status === 'متأخر') {
        text += `${idx + 1}. ${s.name} - ⏳ متأخر${entry.note ? ` (${entry.note})` : ''}\n`;
      } else if (entry.status === 'معتذر') {
        text += `${idx + 1}. ${s.name} - 🌿 معتذر${entry.note ? ` (العذر: ${entry.note})` : ''}\n`;
      }
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🌸 نسأل الله التوفيق والبركة لأبنائنا الحفظة الكرام 🌸\n`;
    text += activeComplex?.name || complexName || 'إدارة الحلقات والمجمعات القرآنية';
    return text;
  };

  const handleCopySummary = () => {
    const text = generateDailySummaryText();
    navigator.clipboard.writeText(text);
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 3000);
  };

  const handleShareSummaryWhatsApp = () => {
    const text = generateDailySummaryText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --------------------------------------------------------------------------
  // 2. Absent Student Notification Modal Handlers
  // --------------------------------------------------------------------------
  const formatTemplateWithStudent = (rawTemplate: string, studentName: string): string => {
    if (!rawTemplate) return '';
    const clean = studentName.trim();
    // Extract first name only (e.g. "محمد" from "محمد عبد الله المنصور") per user requirement
    const firstName = clean.split(/\s+/)[0] || clean;
    return rawTemplate
      .replace(/\{اسم_الولد\}|\{اسم_الطالب\}|\[اسم الطالب\]|\[اسم الولد\]|\(اسم الولد\)|\(اسم الطالب\)|\{الاسم_الأول\}|\[الاسم الأول\]/g, firstName)
      .trim();
  };

  const handleOpenAbsentModal = (student: Student) => {
    setSelectedAbsentStudent(student);
    const initialTmpl = absenceTemplates[0] || DEFAULT_ABSENCE_TEMPLATES[0];
    setSelectedTemplateId(initialTmpl.id);
    setCustomAbsentMessage(formatTemplateWithStudent(initialTmpl.template, student.name));
    setAbsentMessageCopied(false);
  };

  const handleSelectTemplate = (template: AbsenceMessageTemplate) => {
    setSelectedTemplateId(template.id);
    if (selectedAbsentStudent) {
      setCustomAbsentMessage(formatTemplateWithStudent(template.template, selectedAbsentStudent.name));
    }
  };

  const handleSendAbsentWhatsApp = () => {
    if (!selectedAbsentStudent) return;
    const rawPhone = getStudentParentPhone(selectedAbsentStudent);
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.slice(1);
    }
    const finalMsg = customAbsentMessage.trim();
    if (!cleanPhone) {
      alert('لا يوجد رقم هاتف مسجل لولي أمر هذا الطالب. يرجى نسخ نص الرسالة وإرسالها يدوياً.');
      return;
    }
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
  };

  const handleCopyAbsentMessage = () => {
    navigator.clipboard.writeText(customAbsentMessage);
    setAbsentMessageCopied(true);
    setTimeout(() => setAbsentMessageCopied(false), 3000);
  };

  // --------------------------------------------------------------------------
  // 3. Programmer Message Settings Handlers
  // --------------------------------------------------------------------------
  const handleInsertStudentTag = () => {
    const tag = '{اسم_الولد}';
    if (templateTextareaRef.current) {
      const start = templateTextareaRef.current.selectionStart || 0;
      const end = templateTextareaRef.current.selectionEnd || 0;
      const newText =
        templateFormText.substring(0, start) + tag + templateFormText.substring(end);
      setTemplateFormText(newText);
      setTimeout(() => {
        if (templateTextareaRef.current) {
          templateTextareaRef.current.focus();
          templateTextareaRef.current.setSelectionRange(start + tag.length, start + tag.length);
        }
      }, 50);
    } else {
      setTemplateFormText(prev => prev + tag);
    }
  };

  const handleStartAddTemplate = () => {
    setEditingTemplate({
      id: `tmpl_${Date.now()}`
    });
    setTemplateFormTitle('');
    setTemplateFormText('السلام عليكم ورحمة الله وبركاته، شيخنا الفاضل بشرنا عنك وعن {اسم_الولد}، استغربنا غيابه اليوم عساه بخير وصحة؟');
    setTemplateSaveSuccess(null);
  };

  const handleStartEditTemplate = (tmpl: AbsenceMessageTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateFormTitle(tmpl.title);
    setTemplateFormText(tmpl.template);
    setTemplateSaveSuccess(null);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!onUpdateSettings || !settings) return;

    const updatedTemplates = absenceTemplates.filter(t => t.id !== templateId);
    await onUpdateSettings({
      ...settings,
      absenceMessageTemplates: updatedTemplates.length > 0 ? updatedTemplates : DEFAULT_ABSENCE_TEMPLATES
    });
    setTemplateSaveSuccess('تم حذف الرسالة بنجاح.');
    setTimeout(() => setTemplateSaveSuccess(null), 3000);
  };

  const handleSaveTemplateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFormTitle.trim() || !templateFormText.trim() || !onUpdateSettings || !settings) {
      return;
    }

    setIsSavingTemplate(true);
    try {
      const templateId = editingTemplate?.id || `tmpl_${Date.now()}`;
      const newOrUpdated: AbsenceMessageTemplate = {
        id: templateId,
        title: templateFormTitle.trim(),
        template: templateFormText.trim(),
        createdAt: editingTemplate?.createdAt || new Date().toISOString()
      };

      const existingIdx = absenceTemplates.findIndex(t => t.id === templateId);
      let updatedList: AbsenceMessageTemplate[] = [];
      if (existingIdx >= 0) {
        updatedList = [...absenceTemplates];
        updatedList[existingIdx] = newOrUpdated;
      } else {
        updatedList = [...absenceTemplates, newOrUpdated];
      }

      await onUpdateSettings({
        ...settings,
        absenceMessageTemplates: updatedList
      });

      setEditingTemplate(null);
      setTemplateFormTitle('');
      setTemplateFormText('');
      setTemplateSaveSuccess('تم حفظ قالب الرسالة بنجاح وإدراجه ضمن قوالب النظام!');
      setTimeout(() => setTemplateSaveSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error saving template:', err);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Selector */}
      <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#fbbf24]" />
            <span>تسجيل الحضور والغياب اليومي</span>
          </h2>
          <p className="text-xs text-[#86efac]/90 mt-1">
            حدد حضور الطلاب وغيابهم وشارك تقرير الحضور بنقرة زر أو أرسل إشعارات الغياب لأولياء الأمور
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Sync / Refresh Button */}
          {onRefreshData && (
            <LiveSyncButton
              isSyncing={!!isSyncing}
              onRefresh={onRefreshData}
              label="تحديث الحضور والغياب"
              compact={false}
            />
          )}

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-[#022c22] border border-[#fbbf24]/30 px-3.5 py-2 rounded-2xl shadow-inner">
            <Calendar className="w-4 h-4 text-[#fbbf24]" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => handleDateChange(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-[#f0f9f6] outline-none cursor-pointer font-bold"
            />
          </div>

          {/* Daily Attendance Summary Message Button */}
          <button
            type="button"
            onClick={() => setShowDailySummaryModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#022c22] hover:bg-[#064e3b] border border-[#fbbf24]/40 hover:border-[#fbbf24] text-[#fbbf24] text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="إنشاء ونسخ رسالة حضور وغياب اليوم كاملة لمشاركتها في قروب الواتساب"
          >
            <FileText className="w-4 h-4 text-[#fbbf24]" />
            <span>رسالة تقرير حضور اليوم للنسخ</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] border border-[#fbbf24] text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.35)] transition-all cursor-pointer"
            title="معاينة وطباعة كشف الحضور واستخراج PDF"
          >
            <Printer className="w-4 h-4 text-[#064e3b]" />
            <span>طباعة كشف الحضور / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#022c22] hover:bg-[#064e3b] border border-[#fbbf24]/30 hover:border-[#fbbf24] text-[#f0f9f6] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <History className="w-4 h-4 text-[#fbbf24]" />
            <span>سجل الأيام السابقة</span>
          </button>

          {/* Supervisor Attendance Points Settings Button */}
          {onUpdateSettings && (
            <button
              type="button"
              onClick={() => {
                setShowPointsSettingsModal(true);
                setPointsSaveSuccess(null);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="تحديد نقاط الحضور والتأخر والاستئذان وخصم الغياب"
            >
              <Award className="w-4 h-4 text-[#fbbf24]" />
              <span>إعدادات نقاط الحضور والخصم</span>
            </button>
          )}

          {/* Programmer Message Settings Button */}
          {isDeveloper && (
            <button
              type="button"
              onClick={() => {
                setShowMessageSettingsModal(true);
                setEditingTemplate(null);
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#022c22] hover:bg-[#022c22]/80 border border-purple-400/50 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="إدارة قوالب رسائل الغياب في النظام (صلاحية خاصة بالمبرمج)"
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>إعدادات الرسائل (خاص بالمبرمج)</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Ribbon & Quick Action */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#064e3b]/70 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-[#86efac] font-bold">حاضر</span>
            <div className="text-2xl font-bold text-[#fbbf24] font-heading">{counts.present}</div>
          </div>
          <CheckCircle className="w-6 h-6 text-[#fbbf24]" />
        </div>

        <div className="bg-[#064e3b]/70 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-red-300 font-bold">غائب</span>
            <div className="text-2xl font-bold text-red-300 font-heading">{counts.absent}</div>
          </div>
          <XCircle className="w-6 h-6 text-red-400" />
        </div>

        <div className="bg-[#064e3b]/70 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-amber-300 font-bold">متأخر</span>
            <div className="text-2xl font-bold text-amber-300 font-heading">{counts.late}</div>
          </div>
          <Clock className="w-6 h-6 text-amber-400" />
        </div>

        <div className="bg-[#064e3b]/70 border border-[#065f46] rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-emerald-300 font-bold">معتذر</span>
            <div className="text-2xl font-bold text-emerald-300 font-heading">{counts.excused}</div>
          </div>
          <HelpCircle className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] overflow-hidden shadow-xl backdrop-blur-md">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#065f46] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث في أسماء الطلاب..."
              className="w-full bg-[#022c22] border border-[#065f46] rounded-2xl py-2 px-3.5 pr-9 text-xs text-[#f0f9f6] placeholder-[#86efac]/40 outline-none"
              dir="rtl"
            />
            <Search className="w-3.5 h-3.5 text-[#86efac]/60 absolute right-3 top-3" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllPresent}
              className="px-4 py-2 rounded-2xl bg-[#022c22] hover:bg-[#064e3b] border border-[#fbbf24]/30 hover:border-[#fbbf24] text-[#f0f9f6] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-[#fbbf24]" />
              <span>تحديد الجميع حاضر</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] border border-[#fbbf24] disabled:opacity-50 text-[#064e3b] text-xs font-black flex items-center gap-1.5 shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ كشف الحضور'}</span>
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="p-3 bg-[#fbbf24]/20 border-b border-[#fbbf24]/40 text-[#fbbf24] text-xs font-bold text-center">
            {saveMessage}
          </div>
        )}

        {/* Student Rows */}
        <div className="divide-y divide-[#fbbf24]/15">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-[#86efac]/60 text-xs">
              لا يوجد طلاب مسجلون لعرض الحضور.
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const currentStatus = statusMap[student.id]?.status || 'حاضر';
              const currentNote = statusMap[student.id]?.note || '';
              const parentPhone = getStudentParentPhone(student);

              return (
                <div
                  key={student.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#022c22]/40 transition-colors"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-8 h-8 rounded-xl bg-[#022c22] border border-[#fbbf24]/30 text-[#fbbf24] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{student.name}</h4>
                      <p className="text-[11px] text-[#86efac]/80">
                        {student.currentSurahName} (آية {student.currentAyah}) • ولي الأمر: {student.parentName}
                        {parentPhone ? ` • هاتف: ${parentPhone}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* 4 Status Buttons + Send to Absentee button */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[#022c22] p-1.5 rounded-2xl border border-[#fbbf24]/30 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'حاضر')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentStatus === 'حاضر'
                            ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                            : 'text-[#86efac]/80 hover:text-white'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>حاضر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'غائب')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentStatus === 'غائب'
                            ? 'bg-red-600 text-white font-black shadow-md'
                            : 'text-[#86efac]/80 hover:text-white'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>غائب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'متأخر')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentStatus === 'متأخر'
                            ? 'bg-amber-600 text-white font-black shadow-md'
                            : 'text-[#86efac]/80 hover:text-white'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>متأخر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'معتذر')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentStatus === 'معتذر'
                            ? 'bg-emerald-600 text-white font-black shadow-md'
                            : 'text-[#86efac]/80 hover:text-white'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>معتذر</span>
                      </button>
                    </div>

                    {/* Direct WhatsApp Send Button for Absent Student */}
                    {currentStatus === 'غائب' && (
                      <button
                        type="button"
                        onClick={() => handleOpenAbsentModal(student)}
                        className="px-3.5 py-1.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-pulse hover:animate-none"
                        title="إرسال رسالة تفقد غياب لولي أمر الطالب عبر واتساب"
                      >
                        <Send className="w-3.5 h-3.5 text-red-300 rotate-180" />
                        <span>إرسال للوالد</span>
                      </button>
                    )}
                  </div>

                  {/* Note / Excuse field */}
                  <div className="flex-1 min-w-[180px]">
                    <input
                      type="text"
                      value={currentNote}
                      onChange={e => handleNoteChange(student.id, e.target.value)}
                      placeholder={
                        currentStatus === 'معتذر'
                          ? 'اكتب سبب العذر أو الملاحظة...'
                          : currentStatus === 'غائب'
                          ? 'سبب الغياب إن وجد...'
                          : 'ملاحظة حضور (اختياري)...'
                      }
                      className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl py-1.5 px-3 text-xs text-[#f0f9f6] placeholder-[#86efac]/40 outline-none"
                      dir="rtl"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DAILY ATTENDANCE SUMMARY MESSAGE MODAL (جميلة، مرتبة، مع زر نسخ فوري)   */}
      {/* ========================================================================= */}
      {showDailySummaryModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#064e3b] border-2 border-[#fbbf24]/50 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-fadeIn text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#065f46] shrink-0 bg-[#064e3b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center font-bold shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    رسالة تقرير حضور وغياب اليوم
                  </h3>
                  <p className="text-xs text-[#86efac]">
                    تقرير مرتب وأنيق بالرموز التعبيرية جاهز للنسخ والمشاركة المباشرة عبر واتساب
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDailySummaryModal(false)}
                className="p-2 text-[#86efac] hover:text-white rounded-xl hover:bg-[#022c22] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Message Preview */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-4 relative">
                <pre
                  className="font-sans text-xs text-emerald-100 whitespace-pre-wrap leading-relaxed select-all"
                  dir="rtl"
                >
                  {generateDailySummaryText()}
                </pre>
              </div>

              {summaryCopied && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-400 text-emerald-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>تم نسخ الرسالة بنجاح! جاهزة للصق في قروب الواتساب.</span>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-[#022c22] border-t border-[#fbbf24]/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-[#86efac]/80">
                إجمالي الطلاب: <strong>{students.length}</strong> (حاضر: {counts.present} • غائب: {counts.absent})
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareSummaryWhatsApp}
                  className="px-4 py-2.5 rounded-2xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] border border-[#fbbf24]/40 hover:border-[#fbbf24] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة عبر واتساب</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] border border-[#fbbf24] text-[#064e3b] text-xs font-black flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Copy className="w-4 h-4" />
                  <span>{summaryCopied ? 'تم النسخ!' : 'نسخ الرسالة بالكامل'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABSENT STUDENT NOTIFICATION MODAL (إرسال للوالد مع اختيار القالب)        */}
      {/* ========================================================================= */}
      {selectedAbsentStudent && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#064e3b] border-2 border-[#fbbf24]/50 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-fadeIn text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#065f46] shrink-0 bg-[#064e3b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 flex items-center justify-center font-bold shadow-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    إشعار غياب: {selectedAbsentStudent.name}
                  </h3>
                  <p className="text-xs text-[#86efac]">
                    اختر القالب المناسب لإرساله إلى ولي أمر الطالب عبر واتساب
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAbsentStudent(null)}
                className="p-2 text-[#86efac] hover:text-white rounded-xl hover:bg-[#022c22] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Recipient Info Card */}
              <div className="bg-[#022c22] border border-[#065f46] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[#86efac] block text-[11px]">ولي الأمر:</span>
                  <strong className="text-white font-bold">{selectedAbsentStudent.parentName || 'ولي أمر الطالب'}</strong>
                </div>
                <div>
                  <span className="text-[#86efac] block text-[11px]">رقم الواتساب:</span>
                  <strong className="text-[#fbbf24] font-mono font-bold" dir="ltr">
                    {getStudentParentPhone(selectedAbsentStudent) || 'غير مسجل'}
                  </strong>
                </div>
                <div>
                  <span className="text-[#86efac] block text-[11px]">تاريخ الغياب:</span>
                  <strong className="text-white font-mono">{selectedDate}</strong>
                </div>
              </div>

              {/* Templates Selector */}
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-2">
                  اختر قالب الرسالة:
                </label>
                <div className="space-y-2">
                  {absenceTemplates.map(tmpl => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => handleSelectTemplate(tmpl)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#fbbf24]/15 border-[#fbbf24] text-white shadow-md'
                            : 'bg-[#022c22]/70 border-[#065f46] text-[#86efac] hover:bg-[#022c22]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className={isSelected ? 'text-[#fbbf24]' : 'text-white'}>
                            {tmpl.title}
                          </span>
                          {isSelected && <span className="text-[10px] bg-[#fbbf24] text-[#064e3b] px-2 py-0.5 rounded-full font-black">المحدد</span>}
                        </div>
                        <p className="text-[11px] text-[#86efac]/80 line-clamp-2">
                          {formatTemplateWithStudent(tmpl.template, selectedAbsentStudent.name)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editable Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-emerald-200">
                    نص الرسالة المرسلة لولي الأمر (يمكنك تعديلها بحرية):
                  </label>
                  <span className="text-[10px] text-[#86efac]/70">تم تعيين اسم الطالب تلقائياً</span>
                </div>
                <textarea
                  rows={4}
                  value={customAbsentMessage}
                  onChange={e => setCustomAbsentMessage(e.target.value)}
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl p-3 text-xs text-white leading-relaxed outline-none"
                  dir="rtl"
                />
              </div>

              {absentMessageCopied && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-400 text-emerald-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>تم نسخ نص الرسالة بنجاح!</span>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-[#022c22] border-t border-[#fbbf24]/20 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCopyAbsentMessage}
                className="px-4 py-2.5 rounded-2xl bg-[#022c22] hover:bg-[#064e3b] border border-[#fbbf24]/40 hover:border-[#fbbf24] text-[#f0f9f6] hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-4 h-4 text-[#fbbf24]" />
                <span>نسخ النص</span>
              </button>

              <button
                type="button"
                onClick={handleSendAbsentWhatsApp}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-xs font-black flex items-center gap-2 shadow-lg cursor-pointer transition-all"
              >
                <Send className="w-4 h-4 rotate-180" />
                <span>إرسال لولي الأمر عبر واتساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PROGRAMMER MESSAGE SETTINGS MODAL (إدارة القوالب وإضافة زر اسم الولد)   */}
      {/* ========================================================================= */}
      {showMessageSettingsModal && isDeveloper && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#064e3b] border-2 border-purple-400/50 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-fadeIn text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#065f46] shrink-0 bg-[#064e3b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center font-bold shadow-sm">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-heading">
                      إعدادات قوالب رسائل الغياب
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      خاص بالمبرمج
                    </span>
                  </div>
                  <p className="text-xs text-[#86efac]">
                    إضافة، تعديل وحذف رسائل تفقد الغياب وتحديد موضع اسم الطالب بدقة في الرسالة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMessageSettingsModal(false);
                  setEditingTemplate(null);
                }}
                className="p-2 text-[#86efac] hover:text-white rounded-xl hover:bg-[#022c22] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {templateSaveSuccess && (
                <div className="p-3 bg-purple-500/20 border border-purple-400 text-purple-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-purple-300" />
                  <span>{templateSaveSuccess}</span>
                </div>
              )}

              {/* Add / Edit Form */}
              {editingTemplate ? (
                <form onSubmit={handleSaveTemplateForm} className="bg-[#022c22] border-2 border-purple-400/40 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#065f46] pb-2">
                    <h4 className="text-xs font-bold text-[#fbbf24] flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4" />
                      <span>{templateFormTitle ? `تحرير: ${templateFormTitle}` : 'إضافة قالب رسالة جديد'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="text-xs text-[#86efac] hover:text-white cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-200 mb-1.5">
                      عنوان أو اسم القالب:
                    </label>
                    <input
                      type="text"
                      value={templateFormTitle}
                      onChange={e => setTemplateFormTitle(e.target.value)}
                      placeholder="مثلاً: رسالة تفقد غياب لطيفة، إشعار رسمي..."
                      className="w-full bg-[#064e3b]/50 border border-[#065f46] focus:border-purple-400 rounded-2xl py-2 px-3.5 text-xs text-white outline-none"
                      required
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-bold text-emerald-200">
                        نص القالب:
                      </label>
                      {/* Helper button to insert student name tag */}
                      <button
                        type="button"
                        onClick={handleInsertStudentTag}
                        className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/50 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all self-start sm:self-auto"
                        title="انقر لإدراج كود اسم الطالب {اسم_الولد} في موضع المؤشر"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ إدراج مكان اسم الطالب {`{اسم_الولد}`}</span>
                      </button>
                    </div>

                    <textarea
                      ref={templateTextareaRef}
                      rows={5}
                      value={templateFormText}
                      onChange={e => setTemplateFormText(e.target.value)}
                      placeholder="اكتب الرسالة هنا، وضع {اسم_الولد} في المكان الذي تريد أن يظهر فيه اسم الطالب..."
                      className="w-full bg-[#064e3b]/50 border border-[#065f46] focus:border-purple-400 rounded-2xl p-3 text-xs text-white leading-relaxed outline-none"
                      required
                      dir="rtl"
                    />

                    <div className="mt-1.5 p-2.5 rounded-xl bg-[#064e3b]/30 border border-[#065f46] text-[11px] text-[#86efac] leading-relaxed">
                      💡 <strong>توضيح للمبرمج:</strong> يمكنك كتابة <code className="bg-purple-950 px-1 py-0.5 rounded text-purple-300 font-mono">{`{اسم_الولد}`}</code> أو النقر على الزر أعلاه في الموضع المناسب في الرسالة، وسيقوم النظام تلقائياً باستبداله بـ <strong>(الاسم الأول فقط)</strong> لكل طالب عند إرسال الإشعار لولي أمره، لتبدو الرسالة لطيفة وموجهة بشكل شخصي ومباشر.
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSavingTemplate}
                      onClick={() => setEditingTemplate(null)}
                      className="px-4 py-2 rounded-xl bg-[#064e3b] text-xs text-[#86efac] hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTemplate}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingTemplate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جارٍ حفظ القالب...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>حفظ القالب</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleStartAddTemplate}
                    className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة قالب رسالة جديد</span>
                  </button>
                </div>
              )}

              {/* Existing Templates List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>قوالب الرسائل المسجلة في المنظومة ({absenceTemplates.length})</span>
                </h4>

                <div className="space-y-2.5">
                  {absenceTemplates.map((tmpl, idx) => (
                    <div
                      key={tmpl.id}
                      className="bg-[#022c22] border border-[#065f46] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-300 font-mono text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <h5 className="font-bold text-white text-sm">{tmpl.title}</h5>
                        </div>
                        <p className="text-[#86efac]/90 text-xs leading-relaxed bg-[#064e3b]/30 p-2.5 rounded-xl border border-[#065f46]/40 mt-1">
                          {tmpl.template}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEditTemplate(tmpl)}
                          className="px-3 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#064e3b]/80 border border-[#065f46] text-[#fbbf24] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          disabled={absenceTemplates.length <= 1}
                          className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/50 text-red-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                          title={absenceTemplates.length <= 1 ? 'لا يمكن حذف القالب الوحيد' : 'حذف القالب'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#022c22] border-t border-[#fbbf24]/20 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowMessageSettingsModal(false);
                  setEditingTemplate(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-xs font-bold text-[#f0f9f6] border border-[#fbbf24]/30 hover:border-[#fbbf24] cursor-pointer transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#064e3b] border border-[#fbbf24]/40 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-emerald-950/80 max-h-[90vh] flex flex-col my-auto overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#fbbf24]/20 shrink-0 bg-[#064e3b]">
              <h3 className="text-sm sm:text-base font-bold text-[#fbbf24] flex items-center gap-2 font-heading">
                <History className="w-5 h-5 text-[#fbbf24] shrink-0" />
                <span>سجل الحضور والغياب التراكمي لجميع الطلاب</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-xs px-3.5 py-1.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#f0f9f6] border border-[#fbbf24]/30 hover:border-[#fbbf24] cursor-pointer transition-colors"
              >
                إغلاق
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3">
              {students.map(student => {
                const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);
                const total = studentRecords.length;
                const presents = studentRecords.filter(r => r.status === 'حاضر').length;
                const absents = studentRecords.filter(r => r.status === 'غائب').length;
                const excuseds = studentRecords.filter(r => r.status === 'معتذر').length;
                const lates = studentRecords.filter(r => r.status === 'متأخر').length;
                const rate = total > 0 ? Math.round(((presents + lates) / total) * 100) : 100;

                return (
                  <div
                    key={student.id}
                    className="p-3.5 sm:p-4 bg-[#022c22]/80 border border-[#fbbf24]/20 hover:border-[#fbbf24]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{student.name}</h4>
                      <p className="text-[#86efac] mt-0.5">
                        إجمالي الأيام المسجلة: {total} يوم
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#fbbf24]/20 text-[#fbbf24] font-bold text-[11px]">
                        حاضر: {presents}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 text-[11px]">
                        غائب: {absents}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-[#86efac] text-[11px]">
                        معتذر: {excuseds}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#fbbf24] text-[#064e3b] font-black text-xs shadow-sm">
                        نسبة الالتزام: {rate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Points & Absence Deduction Configuration Modal */}
      {showPointsSettingsModal && onUpdateSettings && (
        <div className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#064e3b] border-2 border-[#fbbf24]/50 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-fadeIn text-right">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#065f46] shrink-0 bg-[#064e3b]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    إعدادات نقاط الحضور والغياب والخصومات
                  </h3>
                  <p className="text-xs text-[#86efac]/80">
                    خاص بالمشرف: تحديد كم نقطة يستحق الطالب عند الحضور، ومتى وكم يُخصم عليه عند الغياب أو التأخر
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPointsSettingsModal(false)}
                className="p-1.5 text-[#86efac] hover:text-white rounded-xl cursor-pointer hover:bg-[#022c22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {pointsSaveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-[#fbbf24]" />
                  <span>{pointsSaveSuccess}</span>
                </div>
              )}

              {/* Enable Attendance Points Toggle */}
              <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">تفعيل احتساب نقاط الحضور والغياب</h4>
                  <p className="text-xs text-[#86efac]/70 mt-0.5">
                    عند التفعيل، تُضاف نقاط الحضور وتُخصم نقاط الغياب والتأخر تلقائياً من رصيد الطالب
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableAttPts(!enableAttPts)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    enableAttPts ? 'bg-[#fbbf24]' : 'bg-[#064e3b]'
                  }`}
                >
                  <div
                    className={`bg-[#064e3b] w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      enableAttPts ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Points Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Present Points */}
                <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-bold text-[#fbbf24] flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>نقاط الحضور (حاضر):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={20}
                      value={presentPts}
                      onChange={e => setPresentPts(Number(e.target.value))}
                      className="w-full bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2 px-3 text-sm text-white font-black font-mono text-center outline-none"
                    />
                    <span className="text-xs text-[#86efac] shrink-0 font-bold">+ نقطة</span>
                  </div>
                  <p className="text-[10px] text-[#86efac]/70">تُضاف لرصيد الطالب عند تسجيله حاضر</p>
                </div>

                {/* Absent Deduction Points */}
                <div className="bg-[#022c22] border border-red-500/30 rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>خصم الغياب (غائب):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={20}
                      value={absentDeductPts}
                      onChange={e => setAbsentDeductPts(Number(e.target.value))}
                      className="w-full bg-[#064e3b] border border-red-500/40 focus:border-red-400 rounded-xl py-2 px-3 text-sm text-red-300 font-black font-mono text-center outline-none"
                    />
                    <span className="text-xs text-red-300 shrink-0 font-bold">- نقطة</span>
                  </div>
                  <p className="text-[10px] text-red-300/70">تُخصم من رصيد الطالب عند غيابه دون عذر</p>
                </div>

                {/* Late Points */}
                <div className="bg-[#022c22] border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>نقاط التأخر (متأخر):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min={-10}
                      max={10}
                      value={latePts}
                      onChange={e => setLatePts(Number(e.target.value))}
                      className="w-full bg-[#064e3b] border border-amber-500/40 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-amber-300 font-black font-mono text-center outline-none"
                    />
                    <span className="text-xs text-amber-300 shrink-0 font-bold">نقطة</span>
                  </div>
                  <p className="text-[10px] text-amber-300/70">مثال: 0 (بدون إضافة) أو -0.5 (خصم تأخر)</p>
                </div>

                {/* Excused Points */}
                <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    <span>نقاط الاستئذان (معتذر):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={10}
                      value={excusedPts}
                      onChange={e => setExcusedPts(Number(e.target.value))}
                      className="w-full bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2 px-3 text-sm text-emerald-300 font-black font-mono text-center outline-none"
                    />
                    <span className="text-xs text-emerald-300 shrink-0 font-bold">نقطة</span>
                  </div>
                  <p className="text-[10px] text-emerald-300/70">عادة 0 نقاط (لا إضافة ولا خصم بعذر)</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#065f46] shrink-0 bg-[#022c22]/95 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPointsSettingsModal(false)}
                className="px-4 py-2 rounded-2xl bg-[#064e3b] text-[#86efac] hover:text-white border border-[#065f46] text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>

              <button
                type="button"
                disabled={isSavingPoints}
                onClick={async () => {
                  if (settings && onUpdateSettings) {
                    setIsSavingPoints(true);
                    try {
                      await onUpdateSettings({
                        ...settings,
                        attendancePointsSettings: {
                          presentPoints: Number(presentPts),
                          latePoints: Number(latePts),
                          excusedPoints: Number(excusedPts),
                          absentPointsDeduction: Number(absentDeductPts),
                          enableAttendancePoints: Boolean(enableAttPts)
                        }
                      });
                      setPointsSaveSuccess('تم حفظ إعدادات نقاط الحضور والغياب بنجاح!');
                      setTimeout(() => {
                        setPointsSaveSuccess(null);
                        setShowPointsSettingsModal(false);
                      }, 1500);
                    } catch (err: any) {
                      console.error('Save points error:', err);
                    } finally {
                      setIsSavingPoints(false);
                    }
                  }
                }}
                className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingPoints ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#064e3b] animate-spin" />
                    <span>جارٍ الحفظ والتطبيق...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#064e3b]" />
                    <span>حفظ وتطبيق الإعدادات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Islamic Quranic Printable Attendance Sheet */}
      {settings && (
        <PrintableQuranicReport
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          documentType="attendance"
          students={students}
          attendance={attendanceRecords}
          evaluations={[]}
          settings={settings}
          teacherName={teacherName || settings.teacherName}
          selectedDate={selectedDate}
          complex={activeComplex}
        />
      )}
    </div>
  );
};
