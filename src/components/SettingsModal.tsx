import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Users,
  Layers,
  ArrowRightLeft,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  UserCheck,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  Shield,
  Key,
  KeyRound,
  BookOpen,
  Palette,
  Eye,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowLeftRight,
  Award,
  RefreshCw,
  Wand2
} from 'lucide-react';
import {
  TeacherAccount,
  Halaqah,
  Student,
  AppSettings,
  QuranComplex,
  ComplexThemeConfig,
  AttendancePointsSettings,
  getThreePartNameValidation,
  isTeacherDeveloper,
  getTeacherSixDigitCode,
  normalizeArabicDigits,
  normalizeTeacherText,
  normalizeArabicText
} from '../types';
import { ISLAMIC_THEME_PRESETS, applyComplexThemeToDOM, extractColorsFromImageDataUrl, generateHarmoniousIslamicPalette } from '../lib/themeUtils';
import { OmranDataService } from '../lib/firebase';
import { triggerComplexThemePulse } from '../utils/highlightHelper';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: TeacherAccount[];
  allTeachers?: TeacherAccount[];
  halaqahs: Halaqah[];
  students: Student[];
  settings: AppSettings;
  complexes?: QuranComplex[];
  activeComplex?: QuranComplex | null;
  isDeveloper: boolean;
  complexName?: string;
  activeHalaqahId?: string;
  onSaveTeacher: (teacher: TeacherAccount) => Promise<void>;
  onDeleteTeacher: (teacherId: string) => Promise<void>;
  onSaveHalaqah: (halaqah: Halaqah) => Promise<void>;
  onDeleteHalaqah: (halaqahId: string) => Promise<void>;
  onTransferStudent?: (studentId: string, targetHalaqahId: string, targetHalaqahName: string) => Promise<void>;
  onBatchTransferStudents?: (studentIds: string[], targetHalaqahId: string, targetHalaqahName: string) => Promise<void>;
  onSwitchActiveHalaqah?: (halaqahId: string) => void;
  onSaveComplex?: (complex: QuranComplex) => Promise<void>;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  initialTab?: string;
  initialHighlightId?: string;
}

type TabType = 'teachers' | 'halaqahs' | 'transfers' | 'general';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  teachers,
  allTeachers = [],
  halaqahs,
  students,
  settings,
  complexes = [],
  activeComplex,
  isDeveloper,
  complexName,
  activeHalaqahId,
  onSaveTeacher,
  onDeleteTeacher,
  onSaveHalaqah,
  onDeleteHalaqah,
  onTransferStudent,
  onBatchTransferStudents,
  onSwitchActiveHalaqah,
  onSaveComplex,
  onUpdateSettings,
  initialTab,
  initialHighlightId
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('teachers');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock body scroll when modal is open and handle initial tab & highlight
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        if (initialTab === 'halaqahs' || initialTab === 'teachers' || initialTab === 'transfers' || initialTab === 'general') {
          setActiveTab(initialTab as TabType);
        }
      }
      if (initialHighlightId) {
        setTimeout(() => {
          triggerComplexThemePulse(initialHighlightId);
        }, 350);
      }
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen, initialTab, initialHighlightId]);

  // Clear messages on tab change
  useEffect(() => {
    setStatusMsg(null);
  }, [activeTab]);

  // ==========================================
  // 1. Teachers State & Handlers
  // ==========================================
  const [editingTeacher, setEditingTeacher] = useState<Partial<TeacherAccount> | null>(null);
  const [isNewTeacher, setIsNewTeacher] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'code'>('new');
  const [searchTeacherCode, setSearchTeacherCode] = useState('');
  const [foundTeacherByCode, setFoundTeacherByCode] = useState<TeacherAccount | null>(null);
  const [codeSearchError, setCodeSearchError] = useState('');
  const [selectedHalaqahIdForAttach, setSelectedHalaqahIdForAttach] = useState<string>('');
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null);

  const handleStartAddTeacher = () => {
    setIsNewTeacher(true);
    setAddMode('new');
    setSearchTeacherCode('');
    setFoundTeacherByCode(null);
    setCodeSearchError('');
    setSelectedHalaqahIdForAttach(halaqahs[0]?.id || '');
    setEditingTeacher({
      id: `teacher-${Date.now()}`,
      name: '',
      username: '',
      password: '123',
      phone: '',
      title: 'معلم ومحفظ',
      role: 'teacher',
      complexId: activeComplex?.id,
      complexName: activeComplex?.name || complexName,
      createdAt: new Date().toISOString()
    });
    setStatusMsg(null);
  };

  const handleSearchTeacherByCode = async (codeToSearch?: string) => {
    const rawInput = (codeToSearch !== undefined ? codeToSearch : searchTeacherCode).trim();
    if (!rawInput) {
      setCodeSearchError('يرجى كتابة الرمز الفريد للمعلم المكون من 6 أرقام (أو اسم المستخدم أو رقم الهاتف).');
      setFoundTeacherByCode(null);
      return;
    }
    const cleanInput = normalizeArabicDigits(rawInput).trim();
    const cleanDigits = cleanInput.replace(/\D/g, '');

    const pool = (allTeachers && allTeachers.length > 0) ? allTeachers : teachers;

    const findTeacher = (list: TeacherAccount[]) => {
      return list.find(t => {
        const c = normalizeArabicDigits(t.teacherCode || getTeacherSixDigitCode(t)).replace(/\D/g, '');
        if (cleanDigits && (c === cleanDigits || (cleanDigits.length === 6 && c.slice(-6) === cleanDigits) || (cleanDigits.length >= 4 && c.includes(cleanDigits)))) return true;
        if (cleanInput && t.username && t.username.toLowerCase().trim() === cleanInput.toLowerCase().replace('@', '')) return true;
        if (cleanDigits.length >= 8 && t.phone && t.phone.replace(/\D/g, '').includes(cleanDigits)) return true;
        if (cleanInput.length >= 3 && t.name && (t.name.trim().toLowerCase() === cleanInput.toLowerCase() || t.name.trim().toLowerCase().includes(cleanInput.toLowerCase()))) return true;
        return false;
      });
    };

    let matched = findTeacher(pool);

    // If not found in current memory list, load from live Firestore
    if (!matched) {
      try {
        const cloudTeachers = await OmranDataService.loadTeachers();
        matched = findTeacher(cloudTeachers);
      } catch (e) {
        console.warn('Live teacher search cloud error:', e);
      }
    }

    // Direct multi-db / central db lookup
    if (!matched) {
      try {
        const found = await OmranDataService.findTeacherByCode(cleanDigits || cleanInput);
        if (found) matched = found;
      } catch (e) {
        console.warn('findTeacherByCode error:', e);
      }
    }

    if (matched) {
      setFoundTeacherByCode(matched);
      setCodeSearchError('');
      if (!selectedHalaqahIdForAttach && halaqahs.length > 0) {
        setSelectedHalaqahIdForAttach(halaqahs[0].id);
      }
    } else {
      setFoundTeacherByCode(null);
      setCodeSearchError(`لم يتم العثور على معلم مسجل بالبيانات المدخلة (${cleanInput}). تأكد من صحة الرمز واطلب من المعلم نسخه من نافذة تعديل حسابه.`);
    }
  };

  const handleAttachTeacherByCode = async () => {
    if (!foundTeacherByCode) return;
    try {
      setIsSubmitting(true);
      const targetComplexId = activeComplex?.id || '';
      const targetComplexName = activeComplex?.name || complexName || 'المجمع';

      const existingCIds = foundTeacherByCode.complexIds || (foundTeacherByCode.complexId ? [foundTeacherByCode.complexId] : []);
      const updatedComplexIds = Array.from(new Set([...existingCIds, ...(targetComplexId ? [targetComplexId] : [])]));
      const updatedComplexNames = complexes.filter(c => updatedComplexIds.includes(c.id)).map(c => c.name);

      const existingHIds = foundTeacherByCode.halaqahIds || (foundTeacherByCode.halaqahId ? [foundTeacherByCode.halaqahId] : []);
      const updatedHalaqahIds = Array.from(new Set([...existingHIds, ...(selectedHalaqahIdForAttach ? [selectedHalaqahIdForAttach] : [])]));
      const updatedHalaqahNames = halaqahs.filter(h => updatedHalaqahIds.includes(h.id)).map(h => h.name);

      const updatedTeacher: TeacherAccount = {
        ...foundTeacherByCode,
        complexId: targetComplexId || foundTeacherByCode.complexId,
        complexName: targetComplexName || foundTeacherByCode.complexName,
        complexIds: updatedComplexIds,
        complexNames: updatedComplexNames,
        halaqahId: selectedHalaqahIdForAttach || foundTeacherByCode.halaqahId,
        halaqahName: halaqahs.find(h => h.id === selectedHalaqahIdForAttach)?.name || foundTeacherByCode.halaqahName,
        halaqahIds: updatedHalaqahIds,
        halaqahNames: updatedHalaqahNames
      };

      await onSaveTeacher(updatedTeacher);

      if (selectedHalaqahIdForAttach && onSaveHalaqah) {
        const targetH = halaqahs.find(h => h.id === selectedHalaqahIdForAttach);
        if (targetH) {
          await onSaveHalaqah({
            ...targetH,
            primaryTeacherId: updatedTeacher.id,
            primaryTeacherName: updatedTeacher.name
          }).catch(() => {});
        }
      }
      setStatusMsg({
        type: 'success',
        text: `تم إلحاق المعلم (${foundTeacherByCode.name}) بالمجمع والحلقة بنجاح!`
      });
      setEditingTeacher(null);
      setIsNewTeacher(false);
      setFoundTeacherByCode(null);
      setSearchTeacherCode('');
    } catch (err: any) {
      setCodeSearchError(err?.message || 'حدث خطأ أثناء إلحاق المعلم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditTeacher = (teacher: TeacherAccount) => {
    setIsNewTeacher(false);
    setEditingTeacher({ ...teacher });
    setStatusMsg(null);
  };

  const handleSaveTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !editingTeacher.name?.trim() || !editingTeacher.username?.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى كتابة اسم المعلم واسم المستخدم للدخول.' });
      return;
    }

    const nameVal = getThreePartNameValidation(editingTeacher.name, 'معلم');
    if (!nameVal.isValid) {
      setStatusMsg({ type: 'error', text: nameVal.message || 'الاسم الثلاثي للمعلم إلزامي.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const teacherPayload: TeacherAccount = {
        id: editingTeacher.id || `teacher-${Date.now()}`,
        name: editingTeacher.name.trim(),
        username: editingTeacher.username.trim(),
        password: editingTeacher.password?.trim() || '123',
        phone: editingTeacher.phone?.trim() || '0500000000',
        title: editingTeacher.title?.trim() || 'معلم ومحفظ',
        role: editingTeacher.role || 'teacher',
        complexId: editingTeacher.complexId || activeComplex?.id,
        complexName: editingTeacher.complexName || activeComplex?.name || complexName,
        createdAt: editingTeacher.createdAt || new Date().toISOString()
      };

      await onSaveTeacher(teacherPayload);
      setStatusMsg({
        type: 'success',
        text: isNewTeacher ? 'تمت إضافة المعلم بنجاح!' : 'تم تحديث بيانات المعلم بنجاح!'
      });
      setEditingTeacher(null);
      setIsNewTeacher(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ المعلم.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteTeacher = async (id: string) => {
    try {
      setIsSubmitting(true);
      await onDeleteTeacher(id);
      setStatusMsg({ type: 'success', text: 'تم حذف حساب المعلم بنجاح.' });
      setDeleteTeacherId(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل حذف المعلم.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 2. Halaqahs State & Handlers
  // ==========================================
  const [editingHalaqah, setEditingHalaqah] = useState<Partial<Halaqah> | null>(null);
  const [isNewHalaqah, setIsNewHalaqah] = useState(false);
  const [deleteHalaqahId, setDeleteHalaqahId] = useState<string | null>(null);

  const handleStartAddHalaqah = () => {
    setIsNewHalaqah(true);
    setEditingHalaqah({
      id: `halaqah-${Date.now()}`,
      name: '',
      description: '',
      complexId: activeComplex?.id,
      complexName: activeComplex?.name || complexName,
      primaryTeacherName: teachers[0]?.name || '',
      createdAt: new Date().toISOString()
    });
    setStatusMsg(null);
  };

  const handleStartEditHalaqah = (h: Halaqah) => {
    setIsNewHalaqah(false);
    setEditingHalaqah({
      ...h,
      complexId: h.complexId || activeComplex?.id,
      complexName: h.complexName || activeComplex?.name || complexName
    });
    setStatusMsg(null);
  };

  const handleSaveHalaqahSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHalaqah || !editingHalaqah.name?.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى كتابة اسم الحلقة القرآنية.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const targetComplex = (editingHalaqah.complexId ? complexes.find(c => c.id === editingHalaqah.complexId) : null) || activeComplex || complexes[0];
      const selectedTeacherName = editingHalaqah.primaryTeacherName?.trim();
      const matchedTeacher = selectedTeacherName
        ? teachers.find(t => t.name.trim() === selectedTeacherName || normalizeTeacherText(t.name) === normalizeTeacherText(selectedTeacherName))
        : null;

      const halaqahPayload: Halaqah = {
        id: editingHalaqah.id || `halaqah-${Date.now()}`,
        name: editingHalaqah.name.trim(),
        description: editingHalaqah.description?.trim() || '',
        complexId: targetComplex?.id || editingHalaqah.complexId || 'complex-main',
        complexName: targetComplex?.name || editingHalaqah.complexName || complexName || 'المجمع القرآني',
        primaryTeacherId: matchedTeacher?.id || editingHalaqah.primaryTeacherId,
        primaryTeacherName: matchedTeacher?.name || selectedTeacherName || '',
        createdAt: editingHalaqah.createdAt || new Date().toISOString()
      };

      await onSaveHalaqah(halaqahPayload);

      // Link matched teacher bidirectionally
      if (matchedTeacher) {
        const updatedTeacher: TeacherAccount = {
          ...matchedTeacher,
          complexId: halaqahPayload.complexId,
          complexName: halaqahPayload.complexName,
          complexIds: Array.from(new Set([...(matchedTeacher.complexIds || []), halaqahPayload.complexId!])),
          complexNames: Array.from(new Set([...(matchedTeacher.complexNames || []), halaqahPayload.complexName || 'المجمع'])),
          halaqahId: halaqahPayload.id,
          halaqahName: halaqahPayload.name,
          halaqahIds: Array.from(new Set([...(matchedTeacher.halaqahIds || []), halaqahPayload.id])),
          halaqahNames: Array.from(new Set([...(matchedTeacher.halaqahNames || []), halaqahPayload.name]))
        };
        await onSaveTeacher(updatedTeacher).catch(() => {});
      }

      // Sync all students of this halaqah with the target complex and halaqah name
      const normHName = normalizeArabicText(halaqahPayload.name);
      const halaqahStudents = students.filter(s =>
        s.halaqahId === halaqahPayload.id ||
        (s.halaqahName && normalizeArabicText(s.halaqahName) === normHName)
      );
      for (const st of halaqahStudents) {
        if (st.complexId !== halaqahPayload.complexId || st.halaqahId !== halaqahPayload.id || st.halaqahName !== halaqahPayload.name) {
          await OmranDataService.saveStudent({
            ...st,
            complexId: halaqahPayload.complexId,
            complexName: halaqahPayload.complexName,
            halaqahId: halaqahPayload.id,
            halaqahName: halaqahPayload.name
          }).catch(() => {});
        }
      }

      setStatusMsg({
        type: 'success',
        text: isNewHalaqah ? 'تمت إضافة الحلقة القرآنية وتثبيتها بنجاح!' : 'تم تحديث بيانات الحلقة وربطها بنجاح!'
      });
      setEditingHalaqah(null);
      setIsNewHalaqah(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ الحلقة.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteHalaqah = async (id: string) => {
    try {
      setIsSubmitting(true);
      await onDeleteHalaqah(id);
      setStatusMsg({ type: 'success', text: 'تم حذف الحلقة القرآنية بنجاح.' });
      setDeleteHalaqahId(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل حذف الحلقة.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 3. Student Transfer State & Handlers
  // ==========================================
  const [transferFilterHalaqah, setTransferFilterHalaqah] = useState<string>('all');
  const [transferSearch, setTransferSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetDestinationHalaqahId, setTargetDestinationHalaqahId] = useState<string>('');

  const filteredTransferStudents = students.filter(st => {
    const matchHalaqah = transferFilterHalaqah === 'all' || st.halaqahId === transferFilterHalaqah;
    const matchSearch = !transferSearch || st.name.toLowerCase().includes(transferSearch.toLowerCase());
    return matchHalaqah && matchSearch;
  });

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (selectedStudentIds.length === filteredTransferStudents.length && filteredTransferStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredTransferStudents.map(s => s.id));
    }
  };

  const handleExecuteTransfer = async () => {
    if (!targetDestinationHalaqahId) {
      setStatusMsg({ type: 'error', text: 'يرجى اختيار الحلقة المراد نقل الطلاب إليها.' });
      return;
    }
    if (selectedStudentIds.length === 0) {
      setStatusMsg({ type: 'error', text: 'يرجى تحديد طالب واحد على الأقل لنقله.' });
      return;
    }

    const targetHalaqah = halaqahs.find(h => h.id === targetDestinationHalaqahId);
    const targetName = targetHalaqah?.name || 'الحلقة المختارة';

    try {
      setIsSubmitting(true);
      if (selectedStudentIds.length === 1 && onTransferStudent) {
        await onTransferStudent(selectedStudentIds[0], targetDestinationHalaqahId, targetName);
      } else if (onBatchTransferStudents) {
        await onBatchTransferStudents(selectedStudentIds, targetDestinationHalaqahId, targetName);
      } else if (onTransferStudent) {
        for (const sid of selectedStudentIds) {
          await onTransferStudent(sid, targetDestinationHalaqahId, targetName);
        }
      }
      setStatusMsg({
        type: 'success',
        text: `تم نقل ${selectedStudentIds.length} طالب إلى ${targetName} بنجاح!`
      });
      setSelectedStudentIds([]);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل نقل الطلاب.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 4. General Settings State & Handlers
  // ==========================================
  const [generalForm, setGeneralForm] = useState({
    halaqahName: settings.halaqahName || '',
    complexName: activeComplex?.name || settings.complexName || '',
    allowStudentRegistration: settings.allowStudentRegistration ?? true,
    workDaysPerWeek: settings.workDaysPerWeek ?? 5,
    presentPoints: settings.attendancePointsSettings?.presentPoints ?? 1,
    latePoints: settings.attendancePointsSettings?.latePoints ?? 0,
    excusedPoints: settings.attendancePointsSettings?.excusedPoints ?? 0,
    absentPointsDeduction: settings.attendancePointsSettings?.absentPointsDeduction ?? 1,
    enableAttendancePoints: settings.attendancePointsSettings?.enableAttendancePoints ?? true
  });

  // Dynamic Theme state for the active complex
  const [themeColors, setThemeColors] = useState<ComplexThemeConfig>(() => {
    return activeComplex?.theme || {
      primaryColor: '#022c22',
      secondaryColor: '#064e3b',
      accentColor: '#fbbf24',
      backgroundColor: '#022c22',
      surfaceColor: 'rgba(6, 78, 59, 0.7)',
      cardColor: '#064e3b',
      textColor: '#f0f9f6'
    };
  });

  // Image color extraction & role swapping state
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [swapFirstRole, setSwapFirstRole] = useState<keyof ComplexThemeConfig | null>(null);
  const themeImageInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize generalForm & themeColors whenever activeComplex, settings, or modal open status changes
  useEffect(() => {
    if (isOpen) {
      setGeneralForm({
        halaqahName: settings.halaqahName || '',
        complexName: activeComplex?.name || settings.complexName || '',
        allowStudentRegistration: settings.allowStudentRegistration ?? true,
        workDaysPerWeek: settings.workDaysPerWeek ?? 5,
        presentPoints: settings.attendancePointsSettings?.presentPoints ?? 1,
        latePoints: settings.attendancePointsSettings?.latePoints ?? 0,
        excusedPoints: settings.attendancePointsSettings?.excusedPoints ?? 0,
        absentPointsDeduction: settings.attendancePointsSettings?.absentPointsDeduction ?? 1,
        enableAttendancePoints: settings.attendancePointsSettings?.enableAttendancePoints ?? true
      });
      if (activeComplex?.theme) {
        setThemeColors(activeComplex.theme);
        applyComplexThemeToDOM(activeComplex.theme, true);
      }
      setSwapFirstRole(null);
    }
  }, [isOpen, activeComplex, settings]);

  const handleApplyThemePreset = (preset: ComplexThemeConfig) => {
    setThemeColors(preset);
    applyComplexThemeToDOM(preset, true);
  };

  // Upload image & extract harmonious color palette
  const handleThemeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت.' });
      return;
    }

    setIsExtractingColors(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const result = await extractColorsFromImageDataUrl(dataUrl);
        setThemeColors(result.theme);
        applyComplexThemeToDOM(result.theme, true);
        setExtractedPalette(result.palette || []);
        setStatusMsg({
          type: 'success',
          text: `تم استخراج الألوان من الصورة بنجاح! تم استخراج (${result.palette.length}) درجات لونية متناسقة.`
        });
      } catch (err: any) {
        console.error('Color extraction failed:', err);
        setStatusMsg({ type: 'error', text: 'تعذر استخراج الألوان من الصورة. يرجى تجربة صورة أخرى أو استخدام الباقات الجاهزة.' });
      } finally {
        setIsExtractingColors(false);
        if (themeImageInputRef.current) themeImageInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setIsExtractingColors(false);
      setStatusMsg({ type: 'error', text: 'حدث خطأ أثناء قراءة ملف الصورة.' });
    };
    reader.readAsDataURL(file);
  };

  // Interactive Swap between two color roles (e.g. text color <-> background color)
  const handleSelectRoleForSwap = (role: keyof ComplexThemeConfig) => {
    if (!swapFirstRole) {
      setSwapFirstRole(role);
      setStatusMsg({
        type: 'success',
        text: `تم تحديد (${getRoleArabicName(role)}). اضغط الآن على اللون الثاني للتبديل بينهما فوراً!`
      });
    } else if (swapFirstRole === role) {
      setSwapFirstRole(null);
      setStatusMsg(null);
    } else {
      const color1 = themeColors[swapFirstRole] || '#022c22';
      const color2 = themeColors[role] || '#fbbf24';

      const updated = {
        ...themeColors,
        [swapFirstRole]: color2,
        [role]: color1
      };
      setThemeColors(updated);
      applyComplexThemeToDOM(updated, true);

      setStatusMsg({
        type: 'success',
        text: `تم التبديل بنجاح بين (${getRoleArabicName(swapFirstRole)}) و (${getRoleArabicName(role)})!`
      });
      setSwapFirstRole(null);
    }
  };

  const getRoleArabicName = (role: keyof ComplexThemeConfig): string => {
    switch (role) {
      case 'backgroundColor': return 'لون الخلفية الرئيسي';
      case 'primaryColor': return 'اللون الأساسي';
      case 'cardColor': return 'لون البطاقات';
      case 'secondaryColor': return 'اللون الثانوي';
      case 'accentColor': return 'لون التمييز والأزرار';
      case 'textColor': return 'لون النصوص';
      default: return String(role);
    }
  };

  // Direct Quick Swap between common role pairs
  const handleQuickSwap = (roleA: keyof ComplexThemeConfig, roleB: keyof ComplexThemeConfig) => {
    const valA = themeColors[roleA] || '#022c22';
    const valB = themeColors[roleB] || '#ffffff';
    const updated = {
      ...themeColors,
      [roleA]: valB,
      [roleB]: valA
    };
    setThemeColors(updated);
    applyComplexThemeToDOM(updated, true);
    setStatusMsg({
      type: 'success',
      text: `تم التبديل الفوري بين (${getRoleArabicName(roleA)}) و (${getRoleArabicName(roleB)})!`
    });
  };

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const attPoints: AttendancePointsSettings = {
        presentPoints: Number(generalForm.presentPoints),
        latePoints: Number(generalForm.latePoints),
        excusedPoints: Number(generalForm.excusedPoints),
        absentPointsDeduction: Number(generalForm.absentPointsDeduction),
        enableAttendancePoints: Boolean(generalForm.enableAttendancePoints)
      };

      await onUpdateSettings({
        halaqahName: generalForm.halaqahName.trim(),
        complexName: generalForm.complexName.trim() || activeComplex?.name || settings.complexName,
        allowStudentRegistration: generalForm.allowStudentRegistration,
        workDaysPerWeek: Number(generalForm.workDaysPerWeek) || 5,
        attendancePointsSettings: attPoints
      });

      if (activeComplex && onSaveComplex) {
        const updatedComplex: QuranComplex = {
          ...activeComplex,
          name: generalForm.complexName.trim() || activeComplex.name,
          theme: themeColors
        };
        await onSaveComplex(updatedComplex);
        applyComplexThemeToDOM(themeColors, true);
      }

      setStatusMsg({ type: 'success', text: 'تم حفظ الإعدادات العامة ونقاط الحضور وثيم المجمع بنجاح!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل حفظ الإعدادات.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      dir="rtl"
    >
      <div
        className="border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors"
        data-complex-themed="true"
        style={{
          '--complex-bg': themeColors.backgroundColor,
          '--complex-primary': themeColors.primaryColor,
          '--complex-secondary': themeColors.secondaryColor,
          '--complex-card': themeColors.cardColor || themeColors.secondaryColor,
          '--complex-accent': themeColors.accentColor,
          '--complex-border': themeColors.secondaryColor,
          '--complex-text': themeColors.textColor || '#f0f9f6',
          '--complex-subtext': `${themeColors.textColor || '#f0f9f6'}cc`,
          backgroundColor: themeColors.cardColor || themeColors.backgroundColor,
          borderColor: themeColors.secondaryColor || '#065f46',
          color: themeColors.textColor || '#f0f9f6'
        } as React.CSSProperties}
      >
        {/* Modal Header */}
        <div
          className="p-4 sm:p-5 border-b flex items-center justify-between shrink-0 z-20"
          style={{
            backgroundColor: themeColors.primaryColor || '#022c22',
            borderColor: themeColors.secondaryColor || '#065f46'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: `${themeColors.accentColor}25`,
                borderColor: `${themeColors.accentColor}50`,
                color: themeColors.accentColor || '#fbbf24'
              }}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                إعدادات المنظومة والحلقات
                {activeComplex && (
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full border font-bold"
                    style={{
                      backgroundColor: themeColors.secondaryColor || '#064e3b',
                      borderColor: `${themeColors.accentColor}50`,
                      color: themeColors.accentColor || '#fbbf24'
                    }}
                  >
                    {activeComplex.name}
                  </span>
                )}
              </h2>
              <p className="text-xs opacity-80" style={{ color: themeColors.textColor || '#86efac' }}>
                إدارة المعلمين والحلقات ونقل الطلاب وضبط قواعد المنظومة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer"
            style={{ color: themeColors.textColor || '#86efac' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Sticky & Prominent) */}
        <div
          className="flex border-b px-3 overflow-x-auto gap-1 shrink-0 z-10 sticky top-0 shadow-sm"
          style={{
            backgroundColor: themeColors.primaryColor || '#022c22',
            borderColor: themeColors.secondaryColor || '#065f46'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className="px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer"
            style={
              activeTab === 'teachers'
                ? {
                    borderColor: themeColors.accentColor,
                    color: themeColors.accentColor,
                    backgroundColor: `${themeColors.secondaryColor}80`,
                    fontWeight: 900
                  }
                : {
                    borderColor: 'transparent',
                    color: themeColors.textColor ? `${themeColors.textColor}B3` : '#86efac'
                  }
            }
          >
            <Users className="w-4 h-4" />
            <span>المعلمون والمحفظون ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('halaqahs')}
            className="px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer"
            style={
              activeTab === 'halaqahs'
                ? {
                    borderColor: themeColors.accentColor,
                    color: themeColors.accentColor,
                    backgroundColor: `${themeColors.secondaryColor}80`,
                    fontWeight: 900
                  }
                : {
                    borderColor: 'transparent',
                    color: themeColors.textColor ? `${themeColors.textColor}B3` : '#86efac'
                  }
            }
          >
            <Layers className="w-4 h-4" />
            <span>الحلقات القرآنية ({halaqahs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className="px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer"
            style={
              activeTab === 'transfers'
                ? {
                    borderColor: themeColors.accentColor,
                    color: themeColors.accentColor,
                    backgroundColor: `${themeColors.secondaryColor}80`,
                    fontWeight: 900
                  }
                : {
                    borderColor: 'transparent',
                    color: themeColors.textColor ? `${themeColors.textColor}B3` : '#86efac'
                  }
            }
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>نقل وتوزيع الطلاب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className="px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer"
            style={
              activeTab === 'general'
                ? {
                    borderColor: themeColors.accentColor,
                    color: themeColors.accentColor,
                    backgroundColor: `${themeColors.secondaryColor}80`,
                    fontWeight: 900
                  }
                : {
                    borderColor: 'transparent',
                    color: themeColors.textColor ? `${themeColors.textColor}B3` : '#86efac'
                  }
            }
          >
            <Sliders className="w-4 h-4" />
            <span>الإعدادات العامة والثيم</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl border flex items-center gap-2 text-sm ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-red-950/80 border-red-500 text-red-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: TEACHERS */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base">قائمة المعلمين والمشرفين</h3>
                  <p className="text-xs text-[#86efac]/80">إدارة حسابات المعلمين وصلاحياتهم في المجمع</p>
                </div>
                {!editingTeacher && (
                  <button
                    type="button"
                    onClick={handleStartAddTeacher}
                    className="flex items-center gap-2 bg-[#fbbf24] text-[#064e3b] font-bold px-3.5 py-2 rounded-xl hover:bg-amber-300 transition text-sm cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة معلم جديد</span>
                  </button>
                )}
              </div>

              {editingTeacher ? (
                /* Teacher Form / Code Lookup Container */
                <div className="bg-[#022c22]/70 border border-[#065f46] rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#065f46]">
                    <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      {isNewTeacher ? 'إضافة حساب معلم' : 'تعديل بيانات المعلم'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeacher(null);
                        setFoundTeacherByCode(null);
                        setSearchTeacherCode('');
                      }}
                      className="text-xs text-[#86efac]/70 hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>

                  {/* Mode Switcher when adding a new teacher */}
                  {isNewTeacher && (
                    <div className="grid grid-cols-2 gap-2 bg-[#064e3b]/60 p-1 rounded-2xl border border-[#065f46]">
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode('new');
                          setFoundTeacherByCode(null);
                          setCodeSearchError('');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          addMode === 'new'
                            ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                            : 'text-[#86efac] hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إنشاء حساب جديد</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode('code');
                          setCodeSearchError('');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          addMode === 'code'
                            ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                            : 'text-[#86efac] hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>مسجل بالفعل (بالرمز الفريد)</span>
                      </button>
                    </div>
                  )}

                  {isNewTeacher && addMode === 'code' ? (
                    /* Search & Attach by 6-Digit Code */
                    <div className="space-y-4 text-xs">
                      <div className="p-3.5 rounded-2xl bg-[#011a14] border border-amber-400/40 text-[#86efac] space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                          <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>كيفية الحصول على الرمز الفريد للمعلم:</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          يقوم المعلم بالضغط على زر <strong>(الحساب)</strong> في أعلى شاشة المنظومة، وسيظهر رمزه الفريد المكون من 6 أرقام في أعلى النافذة ليقوم بنسخه ومشاركته معك.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold mb-1.5" style={{ color: themeColors.textColor || '#86efac' }}>
                          أدخل الرمز الفريد للمعلم (6 أرقام) أو اسم المستخدم أو رقم الهاتف:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={30}
                            placeholder="أدخل الرمز (مثال: 482910) أو اسم المستخدم"
                            value={searchTeacherCode}
                            onChange={e => {
                              const val = e.target.value;
                              setSearchTeacherCode(val);
                              const digitsOnly = normalizeArabicDigits(val).replace(/\D/g, '');
                              if (digitsOnly.length === 6) {
                                handleSearchTeacherByCode(digitsOnly);
                              } else if (val.trim().length === 0) {
                                setFoundTeacherByCode(null);
                                setCodeSearchError('');
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchTeacherByCode();
                              }
                            }}
                            className="flex-1 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold tracking-widest text-center outline-none"
                            style={{
                              backgroundColor: `${themeColors.primaryColor}CC`,
                              border: `1.5px solid ${themeColors.secondaryColor}`,
                              color: themeColors.accentColor || '#fbbf24'
                            }}
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => handleSearchTeacherByCode()}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer shrink-0 transition-all flex items-center gap-1.5 shadow"
                            style={{
                              backgroundColor: themeColors.accentColor || '#fbbf24',
                              color: themeColors.primaryColor || '#022c22'
                            }}
                          >
                            <Search className="w-4 h-4" />
                            <span>التحقق</span>
                          </button>
                        </div>
                        {codeSearchError && (
                          <div className="mt-2 p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{codeSearchError}</span>
                          </div>
                        )}
                      </div>

                      {foundTeacherByCode && (
                        <div className="p-4 rounded-2xl bg-[#01221a] border-2 border-emerald-500/60 shadow-lg space-y-3.5 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-[#065f46] pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-[#fbbf24] border border-amber-400/30 flex items-center justify-center font-bold text-sm">
                                {foundTeacherByCode.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{foundTeacherByCode.name}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    معلم مسجل
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#86efac]/80 font-mono">
                                  @{foundTeacherByCode.username} {foundTeacherByCode.phone ? `• ${foundTeacherByCode.phone}` : ''}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#fbbf24] bg-black/30 px-2 py-1 rounded-lg border border-amber-400/30" dir="ltr">
                              {foundTeacherByCode.teacherCode || getTeacherSixDigitCode(foundTeacherByCode)}
                            </span>
                          </div>

                          {/* Halaqah selector */}
                          {halaqahs.length > 0 && (
                            <div>
                              <label className="block text-emerald-200 font-bold mb-1">
                                تعيين الحلقة في هذا المجمع:
                              </label>
                              <select
                                value={selectedHalaqahIdForAttach}
                                onChange={e => setSelectedHalaqahIdForAttach(e.target.value)}
                                className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-[#fbbf24] text-xs"
                              >
                                {halaqahs.map(h => (
                                  <option key={h.id} value={h.id} className="bg-[#022c22] text-white">
                                    {h.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleAttachTeacherByCode}
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#064e3b]" />
                            <span>{isSubmitting ? 'جاري الإلحاق...' : 'إلحاق المعلم بهذا المجمع والحلقة'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSaveTeacherSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#86efac] mb-1">
                            الاسم الثلاثي للمعلم <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={editingTeacher.name || ''}
                            onChange={e => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                            placeholder="مثال: عبد الله أحمد المنصور"
                            className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#86efac] mb-1">
                            اسم المستخدم للدخول <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={editingTeacher.username || ''}
                            onChange={e => setEditingTeacher({ ...editingTeacher, username: e.target.value })}
                            placeholder="مثال: abdullah"
                            className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#86efac] mb-1">
                            كلمة المرور للدخول
                          </label>
                          <input
                            type="text"
                            value={editingTeacher.password || ''}
                            onChange={e => setEditingTeacher({ ...editingTeacher, password: e.target.value })}
                            placeholder="كلمة المرور (الافتراضي 123)"
                            className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#86efac] mb-1">
                            رقم هاتف المعلم (واتساب)
                          </label>
                          <input
                            type="tel"
                            value={editingTeacher.phone || ''}
                            onChange={e => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                            placeholder="05XXXXXXXX"
                            className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#86efac] mb-1">
                            المسمى والصفة
                          </label>
                          <input
                            type="text"
                            value={editingTeacher.title || ''}
                            onChange={e => setEditingTeacher({ ...editingTeacher, title: e.target.value })}
                            placeholder="مثال: معلم ومحفظ / المشرف الإداري"
                            className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#86efac] mb-1">
                            الرتبة والصلاحية
                          </label>
                          <select
                            value={editingTeacher.role || 'teacher'}
                            onChange={e => setEditingTeacher({ ...editingTeacher, role: e.target.value as any })}
                            className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          >
                            <option value="teacher">معلم حلقة</option>
                            <option value="supervisor">مشرف مجمع</option>
                            {isDeveloper && <option value="developer">مبرمج ومطور المنظومة</option>}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#065f46]">
                        <button
                          type="button"
                          onClick={() => setEditingTeacher(null)}
                          className="px-4 py-2 rounded-xl bg-[#064e3b] text-[#86efac] hover:bg-[#064e3b]/80 text-sm font-medium transition cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-5 py-2 rounded-xl bg-[#fbbf24] text-[#064e3b] font-bold text-sm hover:bg-amber-300 transition cursor-pointer flex items-center gap-2"
                        >
                          {isSubmitting ? 'جاري الحفظ...' : 'حفظ بيانات المعلم'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* Teachers List */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teachers.filter(t => isDeveloper || !isTeacherDeveloper(t)).map(t => (
                    <div
                      key={t.id}
                      id={`teacher-item-${t.id}`}
                      data-item-id={t.id}
                      className="bg-[#022c22]/60 border border-[#065f46] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-amber-400/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#064e3b] border border-amber-400/20 flex items-center justify-center font-bold text-amber-300 text-sm shrink-0">
                          {t.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{t.name}</span>
                            {t.role === 'developer' ? (
                              <span className="text-[10px] bg-purple-900/60 border border-purple-400/40 text-purple-200 px-1.5 py-0.5 rounded">
                                مبرمج ومطور
                              </span>
                            ) : t.role === 'supervisor' ? (
                              <span className="text-[10px] bg-amber-900/60 border border-amber-400/40 text-amber-200 px-1.5 py-0.5 rounded">
                                مشرف
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-900/60 border border-emerald-400/40 text-emerald-200 px-1.5 py-0.5 rounded">
                                معلم
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#86efac]/70 flex items-center gap-2 mt-0.5">
                            <span>@{t.username}</span>
                            {t.phone && <span>• {t.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditTeacher(t)}
                          className="p-1.5 text-amber-300 hover:bg-[#064e3b] rounded-lg transition cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deleteTeacherId === t.id ? (
                          <div className="flex items-center gap-1 bg-red-950/80 px-2 py-1 rounded-lg border border-red-500">
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteTeacher(t.id)}
                              className="text-xs text-red-300 font-bold hover:underline cursor-pointer"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTeacherId(null)}
                              className="text-xs text-white hover:underline cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteTeacherId(t.id)}
                            className="p-1.5 text-red-400 hover:bg-[#064e3b] rounded-lg transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HALAQAHS */}
          {activeTab === 'halaqahs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base">قائمة الحلقات القرآنية</h3>
                  <p className="text-xs text-[#86efac]/80">إضافة وتعديل الحلقات وتعيين المعلم المشرف</p>
                </div>
                {!editingHalaqah && (
                  <button
                    type="button"
                    onClick={handleStartAddHalaqah}
                    className="flex items-center gap-2 bg-[#fbbf24] text-[#064e3b] font-bold px-3.5 py-2 rounded-xl hover:bg-amber-300 transition text-sm cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة حلقة جديدة</span>
                  </button>
                )}
              </div>

              {editingHalaqah ? (
                /* Halaqah Form */
                <form onSubmit={handleSaveHalaqahSubmit} className="bg-[#022c22]/70 border border-[#065f46] rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#065f46]">
                    <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      {isNewHalaqah ? 'إضافة حلقة قرآنية جديدة' : 'تعديل بيانات الحلقة'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingHalaqah(null)}
                      className="text-xs text-[#86efac]/70 hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#86efac] mb-1">
                        اسم الحلقة القرآنية <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingHalaqah.name || ''}
                        onChange={e => setEditingHalaqah({ ...editingHalaqah, name: e.target.value })}
                        placeholder="مثال: حلقة ابن كثير"
                        className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#86efac] mb-1">
                        المعلم المشرف على الحلقة
                      </label>
                      <select
                        value={editingHalaqah.primaryTeacherName || ''}
                        onChange={e => setEditingHalaqah({ ...editingHalaqah, primaryTeacherName: e.target.value })}
                        className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="">-- اختر المعلم --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {complexes.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-[#86efac] mb-1">
                          المجمع القرآني التابعة له الحلقة
                        </label>
                        <select
                          value={editingHalaqah.complexId || activeComplex?.id || complexes[0]?.id || ''}
                          onChange={e => {
                            const cId = e.target.value;
                            const targetC = complexes.find(c => c.id === cId);
                            setEditingHalaqah({
                              ...editingHalaqah,
                              complexId: cId || undefined,
                              complexName: targetC?.name || editingHalaqah.complexName
                            });
                          }}
                          className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-[#fbbf24] font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          {complexes.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#064e3b] text-white">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#86efac] mb-1">
                        وصف أو ملاحظات عن الحلقة
                      </label>
                      <input
                        type="text"
                        value={editingHalaqah.description || ''}
                        onChange={e => setEditingHalaqah({ ...editingHalaqah, description: e.target.value })}
                        placeholder="مثال: حلقة المتقدمين في الحفظ والمراجعة"
                        className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#065f46]">
                    <button
                      type="button"
                      onClick={() => setEditingHalaqah(null)}
                      className="px-4 py-2 rounded-xl bg-[#064e3b] text-[#86efac] hover:bg-[#064e3b]/80 text-sm font-medium transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-[#fbbf24] text-[#064e3b] font-bold text-sm hover:bg-amber-300 transition cursor-pointer flex items-center gap-2"
                    >
                      {isSubmitting ? 'جاري الحفظ...' : 'حفظ بيانات الحلقة'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Halaqahs List */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {halaqahs.map(h => {
                    const halaqahStudentsCount = students.filter(s => s.halaqahId === h.id).length;
                    const isActive = activeHalaqahId === h.id;

                    return (
                      <div
                        key={h.id}
                        id={`halaqah-item-${h.id}`}
                        data-item-id={h.id}
                        className={`bg-[#022c22]/60 border rounded-xl p-4 flex flex-col justify-between gap-3 transition ${
                          isActive
                            ? 'border-amber-400 bg-[#064e3b]/50 shadow-md'
                            : 'border-[#065f46] hover:border-amber-400/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-white text-base flex items-center gap-2">
                              <span>{h.name}</span>
                              {isActive && (
                                <span className="text-[10px] bg-amber-400 text-[#064e3b] font-extrabold px-2 py-0.5 rounded-full">
                                  الحلقة النشطة حالياً
                                </span>
                              )}
                            </div>
                            {h.description && (
                              <p className="text-xs text-[#86efac]/70 mt-1">{h.description}</p>
                            )}
                            <div className="text-xs text-amber-200/90 mt-2 flex items-center flex-wrap gap-2">
                              <span className="bg-[#065f46]/80 text-[#86efac] text-[11px] px-2 py-0.5 rounded-md border border-[#065f46]">
                                المجمع: {h.complexName || activeComplex?.name || 'المجمع الرئيسي'}
                              </span>
                              <span>المعلم: {h.primaryTeacherName || 'غير محدد'}</span>
                              <span>• عدد الطلاب: {halaqahStudentsCount}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditHalaqah(h)}
                              className="p-1.5 text-amber-300 hover:bg-[#064e3b] rounded-lg transition cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {deleteHalaqahId === h.id ? (
                              <div className="flex items-center gap-1 bg-red-950/80 px-2 py-1 rounded-lg border border-red-500">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDeleteHalaqah(h.id)}
                                  className="text-xs text-red-300 font-bold hover:underline cursor-pointer"
                                >
                                  تأكيد
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteHalaqahId(null)}
                                  className="text-xs text-white hover:underline cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteHalaqahId(h.id)}
                                className="p-1.5 text-red-400 hover:bg-[#064e3b] rounded-lg transition cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {onSwitchActiveHalaqah && !isActive && (
                          <div className="pt-2 border-t border-[#065f46]/50 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onSwitchActiveHalaqah(h.id)}
                              className="text-xs bg-[#064e3b] hover:bg-amber-400 hover:text-[#064e3b] text-amber-300 font-semibold px-3 py-1.5 rounded-lg border border-amber-400/30 transition cursor-pointer"
                            >
                              التبديل إلى هذه الحلقة
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDENT TRANSFERS */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <div className="bg-[#022c22]/70 border border-[#065f46] rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base">نقل الطلاب وتوزيعهم بين الحلقات</h3>
                    <p className="text-xs text-[#86efac]/80">حدد الطلاب واختر الحلقة الوجهة للنقل الفوري</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={targetDestinationHalaqahId}
                      onChange={e => setTargetDestinationHalaqahId(e.target.value)}
                      className="bg-[#064e3b] border border-amber-400/40 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                    >
                      <option value="">-- اختر الحلقة الوجهة --</option>
                      {halaqahs.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isSubmitting || selectedStudentIds.length === 0 || !targetDestinationHalaqahId}
                      onClick={handleExecuteTransfer}
                      className="flex items-center gap-1.5 bg-[#fbbf24] disabled:bg-gray-600 disabled:text-gray-400 text-[#064e3b] font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-300 transition cursor-pointer shadow-sm shrink-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>نقل ({selectedStudentIds.length}) طالب</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#065f46]">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#86efac]/60 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={transferSearch}
                      onChange={e => setTransferSearch(e.target.value)}
                      placeholder="بحث باسم الطالب..."
                      className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={transferFilterHalaqah}
                      onChange={e => setTransferFilterHalaqah(e.target.value)}
                      className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="all">كل الحلقات المصدر</option>
                      {halaqahs.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="px-3 py-2 bg-[#064e3b] hover:bg-[#064e3b]/80 rounded-xl text-xs text-amber-300 font-semibold border border-[#065f46] whitespace-nowrap cursor-pointer"
                    >
                      {selectedStudentIds.length === filteredTransferStudents.length && filteredTransferStudents.length > 0
                        ? 'إلغاء التحديد'
                        : 'تحديد الكل'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Students Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[45vh] overflow-y-auto pr-1">
                {filteredTransferStudents.map(st => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  const currentHalaqah = halaqahs.find(h => h.id === st.halaqahId);

                  return (
                    <div
                      key={st.id}
                      onClick={() => toggleSelectStudent(st.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-400 text-white'
                          : 'bg-[#022c22]/60 border-[#065f46] hover:border-amber-400/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="text-amber-300">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-[#86efac]/50" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-xs truncate">{st.name}</div>
                          <div className="text-[11px] text-[#86efac]/70 truncate">
                            الحلقة الحالية: {currentHalaqah?.name || 'غير محدد'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GENERAL SETTINGS & THEME CUSTOMIZATION */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneralSettings} className="space-y-5">
              {/* Basic Organization Info */}
              <div
                className="border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
                style={{
                  backgroundColor: `${themeColors.cardColor || '#064e3b'}80`,
                  borderColor: themeColors.secondaryColor || '#065f46'
                }}
              >
                <h3
                  className="font-bold text-base flex items-center gap-2 pb-2 border-b"
                  style={{
                    color: themeColors.accentColor || '#fbbf24',
                    borderColor: `${themeColors.secondaryColor || '#065f46'}80`
                  }}
                >
                  <Sliders className="w-4 h-4" />
                  <span>بيانات وهوية المنظومة والحلقة</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textColor || '#86efac' }}>
                      اسم المجمع القرآني
                    </label>
                    <input
                      type="text"
                      value={generalForm.complexName}
                      onChange={e => setGeneralForm({ ...generalForm, complexName: e.target.value })}
                      placeholder="مثال: مجمع النور القرآني"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      style={{
                        backgroundColor: `${themeColors.primaryColor || '#022c22'}CC`,
                        border: `1px solid ${themeColors.secondaryColor || '#065f46'}`
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textColor || '#86efac' }}>
                      اسم الحلقة الافتراضية
                    </label>
                    <input
                      type="text"
                      value={generalForm.halaqahName}
                      onChange={e => setGeneralForm({ ...generalForm, halaqahName: e.target.value })}
                      placeholder="مثال: حلقة الإمام الشاطبي"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      style={{
                        backgroundColor: `${themeColors.primaryColor || '#022c22'}CC`,
                        border: `1px solid ${themeColors.secondaryColor || '#065f46'}`
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textColor || '#86efac' }}>
                      أيام العمل الأسبوعية
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={generalForm.workDaysPerWeek}
                      onChange={e => setGeneralForm({ ...generalForm, workDaysPerWeek: Number(e.target.value) })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      style={{
                        backgroundColor: `${themeColors.primaryColor || '#022c22'}CC`,
                        border: `1px solid ${themeColors.secondaryColor || '#065f46'}`
                      }}
                    />
                  </div>

                  {/* ONLY DEVELOPER CAN TOGGLE PUBLIC STUDENT REGISTRATION */}
                  {isDeveloper && (
                    <div className="flex items-center gap-3 pt-4 sm:pt-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generalForm.allowStudentRegistration}
                          onChange={e => setGeneralForm({ ...generalForm, allowStudentRegistration: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                        <span className="mr-3 text-xs font-bold" style={{ color: themeColors.textColor || '#86efac' }}>
                          إتاحة تسجيل الطلاب الجدد من البوابة العامة (صلاحية المبرمج)
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance & Absence Points Configuration (نقاط الحضور والغياب) */}
              <div
                className="border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
                style={{
                  backgroundColor: `${themeColors.cardColor || '#064e3b'}80`,
                  borderColor: themeColors.secondaryColor || '#065f46'
                }}
              >
                <div
                  className="flex items-center justify-between pb-2 border-b flex-wrap gap-2"
                  style={{ borderColor: `${themeColors.secondaryColor || '#065f46'}80` }}
                >
                  <h3
                    className="font-bold text-base flex items-center gap-2"
                    style={{ color: themeColors.accentColor || '#fbbf24' }}
                  >
                    <Award className="w-4 h-4" />
                    <span>قواعد واحتساب نقاط الحضور والغياب للطلاب</span>
                  </h3>
                  <span className="text-[11px] opacity-80" style={{ color: themeColors.textColor || '#86efac' }}>
                    تُحسب هذه النقاط تلقائياً في رصيد الطالب التراكمي وتظهر في لوحة الشرف
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalForm.enableAttendancePoints}
                      onChange={e => setGeneralForm({ ...generalForm, enableAttendancePoints: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                    <span className="mr-3 text-xs font-bold" style={{ color: themeColors.textColor || '#86efac' }}>
                      تفعيل احتساب نقاط الحضور والغياب في رصيد الطالب
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textColor || '#86efac' }}>
                      نقاط الحضور اليومي:
                    </label>
                    <input
                      type="number"
                      value={generalForm.presentPoints}
                      onChange={e => setGeneralForm({ ...generalForm, presentPoints: Number(e.target.value) })}
                      className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      style={{
                        backgroundColor: `${themeColors.primaryColor || '#022c22'}CC`,
                        border: `1px solid ${themeColors.secondaryColor || '#065f46'}`
                      }}
                    />
                    <span className="text-[10px] text-emerald-300/70 block mt-0.5">عادة +1 نقطة لكل يوم حضور</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textColor || '#86efac' }}>
                      نقاط التأخر:
                    </label>
                    <input
                      type="number"
                      value={generalForm.latePoints}
                      onChange={e => setGeneralForm({ ...generalForm, latePoints: Number(e.target.value) })}
                      className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      style={{
                        backgroundColor: `${themeColors.primaryColor || '#022c22'}CC`,
                        border: `1px solid ${themeColors.secondaryColor || '#065f46'}`
                      }}
                    />
                    <span className="text-[10px] text-amber-300/70 block mt-0.5">0 أو -1 عند التأخر</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textColor || '#86efac' }}>
                      نقاط الاستئذان بعذر:
                    </label>
                    <input
                      type="number"
                      value={generalForm.excusedPoints}
                      onChange={e => setGeneralForm({ ...generalForm, excusedPoints: Number(e.target.value) })}
                      className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      style={{
                        backgroundColor: `${themeColors.primaryColor || '#022c22'}CC`,
                        border: `1px solid ${themeColors.secondaryColor || '#065f46'}`
                      }}
                    />
                    <span className="text-[10px] text-blue-300/70 block mt-0.5">عادة 0 نقاط (لا خصم بعذر)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textColor || '#86efac' }}>
                      خصم الغياب بدون عذر:
                    </label>
                    <input
                      type="number"
                      value={generalForm.absentPointsDeduction}
                      onChange={e => setGeneralForm({ ...generalForm, absentPointsDeduction: Number(e.target.value) })}
                      className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      style={{
                        backgroundColor: `${themeColors.primaryColor || '#022c22'}CC`,
                        border: `1px solid ${themeColors.secondaryColor || '#065f46'}`
                      }}
                    />
                    <span className="text-[10px] text-rose-300/70 block mt-0.5">يُخصم من رصيد الطالب (مثلاً 1)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Quran Complex Theme Customizer with LIVE PREVIEW */}
              <div
                className="border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
                style={{
                  backgroundColor: `${themeColors.cardColor || '#064e3b'}80`,
                  borderColor: themeColors.secondaryColor || '#065f46'
                }}
              >
                <div
                  className="flex items-center justify-between pb-2 border-b flex-wrap gap-2"
                  style={{ borderColor: `${themeColors.secondaryColor || '#065f46'}80` }}
                >
                  <div>
                    <h3
                      className="font-bold text-base flex items-center gap-2"
                      style={{ color: themeColors.accentColor || '#fbbf24' }}
                    >
                      <Palette className="w-4 h-4" />
                      <span>تخصيص ثيم وألوان المجمع القرآني (معاينة حية فورية)</span>
                    </h3>
                    <p className="text-[11px] opacity-80" style={{ color: themeColors.textColor || '#86efac' }}>
                      ارفع صورة لاستخراج الهوية، أو اختر من الباقات، وبدّل بين الألوان بضغطة زر
                    </p>
                  </div>

                  {/* Hidden Image Upload Input & Button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={themeImageInputRef}
                      accept="image/*"
                      onChange={handleThemeImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isExtractingColors}
                      onClick={() => themeImageInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all border disabled:opacity-50"
                      style={{
                        backgroundColor: themeColors.accentColor || '#fbbf24',
                        color: themeColors.primaryColor || '#022c22',
                        borderColor: `${themeColors.primaryColor || '#022c22'}40`
                      }}
                      title="ارفع أي صورة أو شعار للمجمع لاستخراج الألوان منها آلياً"
                    >
                      {isExtractingColors ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جارٍ استخراج الألوان...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع صورة واستخراج الألوان</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Extracted Palette Swatches if available */}
                {extractedPalette.length > 0 && (
                  <div
                    className="p-3 rounded-xl border space-y-1.5"
                    style={{
                      backgroundColor: `${themeColors.primaryColor || '#022c22'}90`,
                      borderColor: themeColors.secondaryColor || '#065f46'
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-bold" style={{ color: themeColors.accentColor || '#fbbf24' }}>
                      <span className="flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>الألوان المستخرجة من الصورة ({extractedPalette.length} درجات):</span>
                      </span>
                      <span className="text-[10px] opacity-75 font-normal" style={{ color: themeColors.textColor }}>
                        {swapFirstRole
                          ? `اضغط على أي لون لتطبيقه على (${getRoleArabicName(swapFirstRole)})`
                          : 'اضغط على دور لوني أدناه ثم اختر لوناً من هنا'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {extractedPalette.map((colorHex, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (swapFirstRole) {
                              setThemeColors(prev => ({
                                ...prev,
                                [swapFirstRole]: colorHex
                              }));
                              setStatusMsg({
                                type: 'success',
                                text: `تم تعيين اللون (${colorHex}) لـ (${getRoleArabicName(swapFirstRole)})!`
                              });
                              setSwapFirstRole(null);
                            }
                          }}
                          className="group relative w-7 h-7 rounded-lg border border-white/30 shadow transition-transform hover:scale-110 cursor-pointer flex items-center justify-center"
                          style={{ backgroundColor: colorHex }}
                          title={`تطبيق ${colorHex}`}
                        >
                          <span className="sr-only">{colorHex}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Color Role Swapping Panel */}
                <div
                  className="p-3.5 rounded-xl border space-y-2.5"
                  style={{
                    backgroundColor: `${themeColors.primaryColor || '#022c22'}70`,
                    borderColor: themeColors.secondaryColor || '#065f46'
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: themeColors.accentColor || '#fbbf24' }}>
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>التبديل التفاعلي بين الألوان (اضغط على أي لونين للتبديل بينهما):</span>
                    </span>
                    {swapFirstRole && (
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-bold animate-pulse"
                        style={{
                          backgroundColor: `${themeColors.accentColor}30`,
                          color: themeColors.accentColor
                        }}
                      >
                        تم تحديد: {getRoleArabicName(swapFirstRole)} • اضغط على اللون الثاني لإتمام التبديل
                      </span>
                    )}
                  </div>

                  {/* 5 Color Roles Clickable Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        { key: 'backgroundColor', label: 'لون الخلفية' },
                        { key: 'primaryColor', label: 'اللون الأساسي' },
                        { key: 'cardColor', label: 'لون البطاقات' },
                        { key: 'accentColor', label: 'لون التمييز' },
                        { key: 'textColor', label: 'لون النصوص' }
                      ] as const
                    ).map(item => {
                      const isFirst = swapFirstRole === item.key;
                      const val = themeColors[item.key] || '#ffffff';
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleSelectRoleForSwap(item.key)}
                          className={`p-2 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                            isFirst
                              ? 'ring-2 ring-amber-400 scale-105 shadow-lg font-black'
                              : 'hover:scale-[1.02] shadow-sm'
                          }`}
                          style={{
                            backgroundColor: `${themeColors.secondaryColor || '#064e3b'}90`,
                            borderColor: isFirst ? (themeColors.accentColor || '#fbbf24') : `${themeColors.secondaryColor || '#065f46'}`
                          }}
                          title="اضغط للتبديل مع لون آخر"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] opacity-75 line-clamp-1" style={{ color: themeColors.textColor }}>
                              {item.label}
                            </span>
                            <span className="text-[11px] font-mono font-bold line-clamp-1" style={{ color: themeColors.textColor }}>
                              {val}
                            </span>
                          </div>
                          <span
                            className="w-6 h-6 rounded-lg border border-white/30 shrink-0 shadow"
                            style={{ backgroundColor: val }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Swap Shortcuts */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] opacity-70 ml-1" style={{ color: themeColors.textColor }}>تبديل سريع:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickSwap('textColor', 'backgroundColor')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 hover:brightness-110"
                      style={{
                        backgroundColor: `${themeColors.secondaryColor}60`,
                        borderColor: `${themeColors.accentColor}50`,
                        color: themeColors.textColor
                      }}
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>النصوص ⇄ الخلفية</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSwap('primaryColor', 'accentColor')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 hover:brightness-110"
                      style={{
                        backgroundColor: `${themeColors.secondaryColor}60`,
                        borderColor: `${themeColors.accentColor}50`,
                        color: themeColors.textColor
                      }}
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>الأساسي ⇄ التمييز</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSwap('cardColor', 'backgroundColor')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 hover:brightness-110"
                      style={{
                        backgroundColor: `${themeColors.secondaryColor}60`,
                        borderColor: `${themeColors.accentColor}50`,
                        color: themeColors.textColor
                      }}
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>البطاقات ⇄ الخلفية</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Live Preview Box */}
                <div
                  className="rounded-2xl p-4 border transition-all duration-300 space-y-3 shadow-md"
                  style={{
                    backgroundColor: themeColors.backgroundColor,
                    borderColor: themeColors.primaryColor,
                    color: themeColors.textColor
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow"
                        style={{
                          backgroundColor: themeColors.cardColor,
                          color: themeColors.accentColor
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black font-heading">
                        معاينة مباشرة: بطاقات وأزرار {generalForm.complexName || 'المجمع'}
                      </span>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: `${themeColors.accentColor}25`,
                        color: themeColors.accentColor
                      }}
                    >
                      ثيم نشط
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      className="p-3 rounded-xl border space-y-1 shadow-sm"
                      style={{
                        backgroundColor: themeColors.cardColor,
                        borderColor: themeColors.primaryColor
                      }}
                    >
                      <div className="text-xs font-bold" style={{ color: themeColors.textColor }}>
                        بطاقة الحلقة القرآنية
                      </div>
                      <div className="text-[11px] opacity-80" style={{ color: themeColors.textColor }}>
                        متابعة الحفظ والتسميع اليومي (14 طالب مسجل)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                        style={{
                          backgroundColor: themeColors.accentColor,
                          color: themeColors.primaryColor
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>زر رئيسي</span>
                      </button>
                      <div
                        className="p-2 rounded-xl border text-xs font-bold"
                        style={{
                          backgroundColor: themeColors.secondaryColor,
                          borderColor: themeColors.primaryColor,
                          color: themeColors.textColor
                        }}
                      >
                        زر ثانوي
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Themes List */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-emerald-200">
                    اختر من باقات الثيمات الإسلامية المعتمدة:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {ISLAMIC_THEME_PRESETS.map(preset => {
                      const isSelected =
                        themeColors.backgroundColor === preset.colors.backgroundColor &&
                        themeColors.accentColor === preset.colors.accentColor;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyThemePreset(preset.colors)}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-md scale-[1.02]'
                              : 'border-[#065f46] hover:border-amber-400/50 bg-[#064e3b]/50'
                          }`}
                          style={{
                            backgroundColor: preset.colors.backgroundColor
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[11px] font-black line-clamp-1"
                              style={{ color: preset.colors.textColor }}
                            >
                              {preset.name.split(' ')[0]}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: preset.colors.cardColor }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: preset.colors.secondaryColor }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: preset.colors.accentColor }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Hex Pickers */}
                <div className="pt-2 border-t border-[#065f46]">
                  <label className="block text-xs font-bold text-emerald-200 mb-2">
                    أو حدد الألوان المخصصة يدوياً:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="block text-[11px] text-[#86efac]/90 mb-1">اللون الأساسي:</span>
                      <div className="flex items-center gap-2 bg-[#064e3b] p-1.5 rounded-xl border border-[#065f46]">
                        <input
                          type="color"
                          value={themeColors.primaryColor}
                          onChange={e => setThemeColors({ ...themeColors, primaryColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-white">{themeColors.primaryColor}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] text-[#86efac]/90 mb-1">اللون الثانوي/البطاقات:</span>
                      <div className="flex items-center gap-2 bg-[#064e3b] p-1.5 rounded-xl border border-[#065f46]">
                        <input
                          type="color"
                          value={themeColors.secondaryColor}
                          onChange={e => setThemeColors({ ...themeColors, secondaryColor: e.target.value, cardColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-white">{themeColors.secondaryColor}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] text-[#86efac]/90 mb-1">لون التمييز والذهب:</span>
                      <div className="flex items-center gap-2 bg-[#064e3b] p-1.5 rounded-xl border border-[#065f46]">
                        <input
                          type="color"
                          value={themeColors.accentColor}
                          onChange={e => setThemeColors({ ...themeColors, accentColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-white">{themeColors.accentColor}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] text-[#86efac]/90 mb-1">لون الخلفية:</span>
                      <div className="flex items-center gap-2 bg-[#064e3b] p-1.5 rounded-xl border border-[#065f46]">
                        <input
                          type="color"
                          value={themeColors.backgroundColor}
                          onChange={e => setThemeColors({ ...themeColors, backgroundColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-white">{themeColors.backgroundColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-black text-sm transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
                  style={{
                    backgroundColor: themeColors.accentColor || '#fbbf24',
                    color: themeColors.primaryColor || '#022c22'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ وتطبيق الإعدادات...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ الإعدادات وثيم المجمع</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
