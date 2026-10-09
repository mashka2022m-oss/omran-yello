import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  Key,
  KeyRound,
  Copy,
  Check,
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  Phone,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  Loader2
} from 'lucide-react';
import {
  TeacherAccount,
  Student,
  Halaqah,
  QuranComplex,
  getThreePartNameValidation,
  getFourPartNameValidation,
  isTeacherDeveloper,
  getTeacherSixDigitCode,
  getTeacherAllComplexes,
  normalizeArabicText,
  normalizeTeacherText
} from '../../types';
import { GoogleWorkspaceService } from '../../lib/googleWorkspace';
import { OmranDataService } from '../../lib/firebase';
import { triggerComplexThemePulse } from '../../utils/highlightHelper';

interface AccountsTabProps {
  teachers: TeacherAccount[];
  students: Student[];
  halaqahs: Halaqah[];
  complexes?: QuranComplex[];
  isDeveloper?: boolean;
  onSaveTeacher: (teacher: TeacherAccount) => Promise<void>;
  onDeleteTeacher: (teacherId: string) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  onDeleteStudent?: (studentId: string) => Promise<void>;
  onSaveHalaqah?: (halaqah: Halaqah) => Promise<void>;
  onSaveComplex?: (complex: QuranComplex) => Promise<void>;
  initialSubTab?: 'teachers' | 'students';
  initialSearchQuery?: string;
  initialStudentToDeleteId?: string;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({
  teachers = [],
  students = [],
  halaqahs = [],
  complexes = [],
  isDeveloper = false,
  onSaveTeacher,
  onDeleteTeacher,
  onUpdateStudent,
  onDeleteStudent,
  onSaveHalaqah,
  onSaveComplex,
  initialSubTab,
  initialSearchQuery,
  initialStudentToDeleteId
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'teachers' | 'students'>(initialSubTab || 'teachers');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync initial props
  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
    if (initialSearchQuery !== undefined) setSearchQuery(initialSearchQuery);
  }, [initialSubTab, initialSearchQuery]);

  // Teacher modal / edit state
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [editingTeacherData, setEditingTeacherData] = useState<Partial<TeacherAccount> | null>(null);
  const [isNewTeacher, setIsNewTeacher] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'code'>('new');
  const [searchTeacherCode, setSearchTeacherCode] = useState('');
  const [foundTeacherByCode, setFoundTeacherByCode] = useState<TeacherAccount | null>(null);
  const [codeSearchError, setCodeSearchError] = useState('');
  const [selectedHalaqahIds, setSelectedHalaqahIds] = useState<string[]>([]);
  const [selectedComplexIds, setSelectedComplexIds] = useState<string[]>([]);
  const [primaryComplexId, setPrimaryComplexId] = useState<string>('');
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherAccount | null>(null);

  // Student password edit modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Auto-select student for deletion if initialStudentToDeleteId is provided
  useEffect(() => {
    if (initialStudentToDeleteId && students.length > 0) {
      const match = students.find(s => s.id === initialStudentToDeleteId);
      if (match) {
        setActiveSubTab('students');
        setStudentToDelete(match);
      }
      setTimeout(() => {
        triggerComplexThemePulse(initialStudentToDeleteId);
      }, 350);
    }
  }, [initialStudentToDeleteId, students]);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkingTeacherId, setLinkingTeacherId] = useState<string | null>(null);
  const [unlinkingStudentId, setUnlinkingStudentId] = useState<string | null>(null);

  // Lock background scrolling when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isEditingTeacher || editingStudent !== null || teacherToDelete !== null || studentToDelete !== null;
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isEditingTeacher, editingStudent, teacherToDelete, studentToDelete]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getOrigin = () => {
    return window.location.origin + window.location.pathname;
  };

  // -------------------------------------------------------------
  // TEACHER HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddTeacher = () => {
    setIsNewTeacher(true);
    setAddMode('new');
    setSearchTeacherCode('');
    setFoundTeacherByCode(null);
    setCodeSearchError('');
    const firstComplex = complexes.length > 0 ? complexes[0] : null;
    const firstComplexId = firstComplex ? firstComplex.id : '';
    setPrimaryComplexId(firstComplexId);
    setSelectedComplexIds(firstComplexId ? [firstComplexId] : []);
    setEditingTeacherData({
      id: `teacher-${Date.now()}`,
      name: '',
      username: '',
      password: '123',
      phone: '',
      title: 'معلم حلقة ومحفظ',
      role: 'teacher',
      isPrimary: false,
      complexId: firstComplexId,
      complexName: firstComplex?.name || '',
      complexIds: firstComplexId ? [firstComplexId] : [],
      complexNames: firstComplex ? [firstComplex.name] : [],
      halaqahIds: halaqahs.length > 0 ? [halaqahs[0].id] : [],
      createdAt: new Date().toISOString()
    });
    setSelectedHalaqahIds(halaqahs.length > 0 ? [halaqahs[0].id] : []);
    setIsEditingTeacher(true);
    setStatusMsg(null);
  };

  const [isSearchingCode, setIsSearchingCode] = useState(false);

  const handleSearchTeacherByCode = async (codeToSearch?: string) => {
    const rawCode = (codeToSearch !== undefined ? codeToSearch : searchTeacherCode).trim();
    if (!rawCode) {
      setCodeSearchError('يرجى كتابة الرمز الفريد للمعلم المكون من 6 أرقام.');
      setFoundTeacherByCode(null);
      return;
    }
    const cleanDigits = rawCode.replace(/\D/g, '');
    if (cleanDigits.length !== 6) {
      setCodeSearchError('يجب أن يتكون الرمز الفريد من 6 أرقام بالضبط (مثال: 749201).');
      setFoundTeacherByCode(null);
      return;
    }

    try {
      setIsSearchingCode(true);
      setCodeSearchError('');

      // 1. Search in-memory teachers array
      let matched = teachers.find(t => {
        const c = (t.teacherCode || getTeacherSixDigitCode(t)).trim();
        return c === cleanDigits;
      });

      // 2. If not found in current props, query Firestore cloud database
      if (!matched) {
        matched = (await OmranDataService.findTeacherByCode(cleanDigits)) || undefined;
      }

      if (matched) {
        setFoundTeacherByCode(matched);
        setCodeSearchError('');
        // Pre-select first halaqah if none selected
        if (selectedHalaqahIds.length === 0 && halaqahs.length > 0) {
          setSelectedHalaqahIds([halaqahs[0].id]);
        }
      } else {
        setFoundTeacherByCode(null);
        setCodeSearchError(`لم يتم العثور على أي معلم مسجل بالرمز (${cleanDigits}). تأكد من صحة الرمز واطلب من المعلم نسخه من نافذة تعديل حسابه.`);
      }
    } catch (err: any) {
      setCodeSearchError('حدث خطأ أثناء التحقق من الرمز: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setIsSearchingCode(false);
    }
  };

  const handleAttachTeacherByCode = async () => {
    if (!foundTeacherByCode) return;
    try {
      setIsSubmitting(true);
      const targetComplex = complexes.find(c => c.id === primaryComplexId) || complexes[0];
      const targetComplexId = targetComplex ? targetComplex.id : '';
      const targetComplexName = targetComplex ? targetComplex.name : 'المجمع';

      // Merge complexIds
      const existingCIds = foundTeacherByCode.complexIds || (foundTeacherByCode.complexId ? [foundTeacherByCode.complexId] : []);
      const updatedComplexIds = Array.from(new Set([...existingCIds, ...(targetComplexId ? [targetComplexId] : [])]));
      const updatedComplexNames = complexes.filter(c => updatedComplexIds.includes(c.id)).map(c => c.name);

      // Merge halaqahIds
      const existingHIds = foundTeacherByCode.halaqahIds || (foundTeacherByCode.halaqahId ? [foundTeacherByCode.halaqahId] : []);
      const updatedHalaqahIds = Array.from(new Set([...existingHIds, ...selectedHalaqahIds]));
      const updatedHalaqahNames = halaqahs.filter(h => updatedHalaqahIds.includes(h.id)).map(h => h.name);

      const updatedTeacher: TeacherAccount = {
        ...foundTeacherByCode,
        complexId: targetComplexId || foundTeacherByCode.complexId,
        complexName: targetComplexName || foundTeacherByCode.complexName,
        complexIds: updatedComplexIds,
        complexNames: updatedComplexNames,
        halaqahId: selectedHalaqahIds[0] || foundTeacherByCode.halaqahId,
        halaqahName: halaqahs.find(h => h.id === selectedHalaqahIds[0])?.name || foundTeacherByCode.halaqahName,
        halaqahIds: updatedHalaqahIds,
        halaqahNames: updatedHalaqahNames
      };

      await onSaveTeacher(updatedTeacher);

      // Link selected halaqahs to this teacher
      if (onSaveHalaqah) {
        for (const hId of selectedHalaqahIds) {
          const matchH = halaqahs.find(h => h.id === hId);
          if (matchH) {
            const updatedH: Halaqah = {
              ...matchH,
              primaryTeacherId: foundTeacherByCode.id,
              primaryTeacherName: foundTeacherByCode.name,
              complexId: targetComplexId || matchH.complexId,
              complexName: targetComplexName || matchH.complexName
            };
            await onSaveHalaqah(updatedH).catch(() => {});
          }
        }
      }

      setStatusMsg({
        type: 'success',
        text: `تم إلحاق المعلم (${foundTeacherByCode.name}) بالمجمع والحلقات المحددة بنجاح!`
      });
      setIsEditingTeacher(false);
      setEditingTeacherData(null);
      setFoundTeacherByCode(null);
      setSearchTeacherCode('');
    } catch (err: any) {
      setCodeSearchError(err?.message || 'حدث خطأ أثناء إلحاق المعلم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditTeacher = (t: TeacherAccount) => {
    if (!isDeveloper && isTeacherDeveloper(t)) {
      setStatusMsg({ type: 'error', text: 'عذراً، لا يمكن تعديل حساب مبرمج ومطور المنظومة.' });
      return;
    }
    setIsNewTeacher(false);
    setAddMode('new');
    setEditingTeacherData({ ...t });
    const hIds = t.halaqahIds || (t.halaqahId ? [t.halaqahId] : []);
    setSelectedHalaqahIds(hIds);

    const cIds = t.complexIds && t.complexIds.length > 0
      ? t.complexIds
      : (t.complexId ? [t.complexId] : (complexes[0] ? [complexes[0].id] : []));
    setSelectedComplexIds(cIds);
    setPrimaryComplexId(t.complexId || cIds[0] || (complexes[0] ? complexes[0].id : ''));

    setIsEditingTeacher(true);
    setStatusMsg(null);
  };

  const handleToggleHalaqah = (hId: string, hComplexId?: string) => {
    setSelectedHalaqahIds(prev => {
      const exists = prev.includes(hId);
      const next = exists ? prev.filter(id => id !== hId) : [...prev, hId];
      return next;
    });

    // Auto-link parent complex if halaqah is checked
    if (hComplexId) {
      setSelectedComplexIds(prev => prev.includes(hComplexId) ? prev : [...prev, hComplexId]);
    }
  };

  const handleToggleComplexSelection = (compCatId: string) => {
    setSelectedComplexIds(prev => {
      if (prev.includes(compCatId)) {
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== compCatId);
      } else {
        return [...prev, compCatId];
      }
    });
  };

  const handleSaveTeacherForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacherData || !editingTeacherData.name?.trim() || !editingTeacherData.username?.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى إدخال اسم المعلم واسم المستخدم للدخول.' });
      return;
    }

    const isSuper = editingTeacherData.role === 'supervisor';
    const isDev = editingTeacherData.role === 'developer';
    const roleLabel: 'مشرف' | 'معلم' = (isDev || isSuper) ? 'مشرف' : 'معلم';
    const nameVal = getThreePartNameValidation(editingTeacherData.name, roleLabel);
    if (!nameVal.isValid) {
      setStatusMsg({ type: 'error', text: nameVal.message || 'الاسم الثلاثي إلزامي.' });
      return;
    }

    // Check duplicate username if adding new
    if (isNewTeacher) {
      const targetUser = (editingTeacherData.username || '').trim().toLowerCase();
      const exists = (teachers || []).some(
        t => (t.username || '').trim().toLowerCase() === targetUser
      );
      if (exists) {
        setStatusMsg({ type: 'error', text: 'اسم المستخدم مسجل لمعلم آخر بالفعل. يرجى اختيار اسم مستخدم مختلف.' });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const resolvedHalaqahNames = halaqahs
        .filter(h => selectedHalaqahIds.includes(h.id))
        .map(h => h.name);

      // Determine all selected complex IDs based on selected halaqahs AND explicitly selected complexes
      const complexesFromHalaqahs = halaqahs
        .filter(h => selectedHalaqahIds.includes(h.id) && h.complexId)
        .map(h => h.complexId!);

      const allCIds = Array.from(new Set([
        ...selectedComplexIds,
        ...complexesFromHalaqahs,
        ...(primaryComplexId ? [primaryComplexId] : [])
      ]));

      const targetPrimaryComplex = complexes.find(c => c.id === primaryComplexId) || complexes.find(c => allCIds.includes(c.id)) || complexes[0];
      const resolvedComplexNames = complexes.filter(c => allCIds.includes(c.id)).map(c => c.name);

      const teacherId = editingTeacherData.id || `teacher-${Date.now()}`;
      const teacherName = editingTeacherData.name.trim();

      const fullTeacher: TeacherAccount = {
        id: teacherId,
        name: teacherName,
        username: editingTeacherData.username.trim(),
        password: editingTeacherData.password?.trim() || '123',
        phone: editingTeacherData.phone?.trim() || '0500000000',
        title: editingTeacherData.title?.trim() || (isDev ? 'مشرف ومطور المنظومة' : (isSuper ? 'المعلم المشرف' : 'معلم حلقة ومحفظ')),
        role: editingTeacherData.role || 'teacher',
        isPrimary: isSuper || isDev,
        complexId: targetPrimaryComplex?.id,
        complexName: targetPrimaryComplex?.name,
        // Multi-complex assignment support:
        complexIds: allCIds,
        complexNames: resolvedComplexNames,
        halaqahId: selectedHalaqahIds[0] || '',
        halaqahName: resolvedHalaqahNames[0] || '',
        halaqahIds: selectedHalaqahIds,
        halaqahNames: resolvedHalaqahNames,
        teacherCode: editingTeacherData.teacherCode || getTeacherSixDigitCode(editingTeacherData),
        googleEmail: editingTeacherData.googleEmail,
        googleUid: editingTeacherData.googleUid,
        googleName: editingTeacherData.googleName,
        googlePhotoUrl: editingTeacherData.googlePhotoUrl,
        isGoogleLinked: editingTeacherData.isGoogleLinked ?? false,
        createdAt: editingTeacherData.createdAt || new Date().toISOString()
      };

      await onSaveTeacher(fullTeacher);

      // Update halaqah assignments and students bidirectionally
      try {
        const { OmranDataService } = await import('../../lib/firebase');
        const currentStudents = await OmranDataService.loadStudents();

        // 1. Link selected halaqahs to this teacher & bind all their students to target complex
        for (const hId of selectedHalaqahIds) {
          const matchH = halaqahs.find(h => h.id === hId);
          if (matchH) {
            const updatedH: Halaqah = {
              ...matchH,
              primaryTeacherId: teacherId,
              primaryTeacherName: teacherName,
              complexId: targetPrimaryComplex?.id || matchH.complexId,
              complexName: targetPrimaryComplex?.name || matchH.complexName,
              teacherIds: Array.from(new Set([...(matchH.teacherIds || []), teacherId])),
              teacherNames: Array.from(new Set([...(matchH.teacherNames || []), teacherName]))
            };
            if (onSaveHalaqah) {
              await onSaveHalaqah(updatedH).catch(() => {});
            } else {
              await OmranDataService.saveHalaqah(updatedH).catch(() => {});
            }

            // Sync and bind all students of this halaqah with the complex and halaqah
            const normHName = normalizeArabicText(matchH.name);
            const halStudents = currentStudents.filter(s =>
              s.halaqahId === hId ||
              (s.halaqahName && normalizeArabicText(s.halaqahName) === normHName)
            );
            for (const st of halStudents) {
              if (st.complexId !== updatedH.complexId || st.halaqahId !== updatedH.id || st.halaqahName !== updatedH.name) {
                await OmranDataService.saveStudent({
                  ...st,
                  complexId: updatedH.complexId,
                  complexName: updatedH.complexName,
                  halaqahId: updatedH.id,
                  halaqahName: updatedH.name
                }).catch(() => {});
              }
            }
          }
        }

        // 2. Detach old halaqahs this teacher is no longer assigned to
        const normTName = normalizeArabicText(teacherName);
        for (const oldH of halaqahs) {
          const isOldTeacher =
            oldH.primaryTeacherId === teacherId ||
            (normTName && oldH.primaryTeacherName && normalizeArabicText(oldH.primaryTeacherName) === normTName);

          if (isOldTeacher && !selectedHalaqahIds.includes(oldH.id)) {
            const detachedH: Halaqah = {
              ...oldH,
              primaryTeacherId: undefined,
              primaryTeacherName: '',
              teacherIds: (oldH.teacherIds || []).filter(id => id !== teacherId),
              teacherNames: (oldH.teacherNames || []).filter(n => normalizeArabicText(n) !== normTName)
            };
            if (onSaveHalaqah) {
              await onSaveHalaqah(detachedH).catch(() => {});
            } else {
              await OmranDataService.saveHalaqah(detachedH).catch(() => {});
            }
          }
        }

        // 3. Supervisor Assignment / Cleanup
        if (isSuper && targetPrimaryComplex) {
          await OmranDataService.assignSupervisorToComplex(teacherId, targetPrimaryComplex.id);
        } else if (!isSuper) {
          // If role is regular teacher, clear from any complex they might have supervised
          for (const c of complexes) {
            if (c.supervisorTeacherId === teacherId) {
              const clearedC: QuranComplex = {
                ...c,
                supervisorTeacherId: undefined,
                supervisorTeacherName: ''
              };
              if (onSaveComplex) {
                await onSaveComplex(clearedC).catch(() => {});
              } else {
                await OmranDataService.saveComplex(clearedC).catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        console.warn('Halaqah & complex teacher sync note:', err);
      }

      setStatusMsg({
        type: 'success',
        text: `تم حفظ بيانات حساب ${fullTeacher.name} وربطه بالمجمعات والحلقات المحددة بنجاح!`
      });
      setIsEditingTeacher(false);
      setEditingTeacherData(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'حدث خطأ أثناء حفظ حساب المعلم.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkTeacherGoogle = async (teacher: TeacherAccount) => {
    setLinkingTeacherId(teacher.id);
    try {
      const updated = await GoogleWorkspaceService.linkTeacherGoogleAccount(teacher);
      await onSaveTeacher(updated);
      if (editingTeacherData && editingTeacherData.id === teacher.id) {
        setEditingTeacherData(updated);
      }
      setStatusMsg({
        type: 'success',
        text: `تم ربط حساب Google (${updated.googleEmail}) بالمعلم ${teacher.name} بنجاح!`
      });
    } catch (err: any) {
      console.warn('Link teacher Google error:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'تعذر ربط حساب Google بالمعلم. يرجى المحاولة مرة أخرى.'
      });
    } finally {
      setLinkingTeacherId(null);
    }
  };

  const handleUnlinkTeacherGoogle = async (teacher: TeacherAccount) => {
    setLinkingTeacherId(teacher.id);
    try {
      const updated = await GoogleWorkspaceService.unlinkTeacherGoogleAccount(teacher);
      await onSaveTeacher(updated);
      if (editingTeacherData && editingTeacherData.id === teacher.id) {
        setEditingTeacherData(updated);
      }
      setStatusMsg({
        type: 'success',
        text: `تم فصل حساب Google عن المعلم ${teacher.name} بنجاح!`
      });
    } catch (err: any) {
      console.warn('Unlink teacher Google error:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'تعذر فصل حساب Google.'
      });
    } finally {
      setLinkingTeacherId(null);
    }
  };

  const handleUpdateTeacherRole = async (
    teacher: TeacherAccount,
    newRole: 'developer' | 'supervisor' | 'teacher'
  ) => {
    try {
      const isDev = newRole === 'developer';
      const isSuper = newRole === 'supervisor';
      const targetComplex = complexes.find(c => c.id === teacher.complexId) || complexes[0];
      const updated: TeacherAccount = {
        ...teacher,
        role: newRole,
        isPrimary: isSuper || isDev,
        title: isDev ? 'مشرف ومطور المنظومة' : (isSuper ? 'معلم مشرف' : 'معلم حلقة ومحفظ'),
        // Non-developer is strictly bound to single designated complex
        complexId: targetComplex?.id,
        complexName: targetComplex?.name,
        complexIds: targetComplex ? [targetComplex.id] : [],
        complexNames: targetComplex ? [targetComplex.name] : []
      };
      await onSaveTeacher(updated);
      const roleLabel = isDev
        ? 'مبرمج ومطور المنظومة (كامل الصلاحيات والتنقل بين كافة المجمعات)'
        : (isSuper ? 'معلم مشرف (إشراف كامل على مجمعه القرآني وحلقاته فقط)' : 'معلم حلقة ومحفظ');
      setStatusMsg({
        type: 'success',
        text: `تمت ترقية/تعيين (${teacher.name}) بنجاح إلى: ${roleLabel}`
      });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'فشل تغيير الرتبة والصلاحية: ' + e?.message });
    }
  };

  const handleToggleSupervisorRole = async (teacher: TeacherAccount) => {
    const nextRole = teacher.role === 'supervisor' || teacher.isPrimary ? 'teacher' : 'supervisor';
    await handleUpdateTeacherRole(teacher, nextRole);
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
      setIsSubmitting(true);
      await onDeleteTeacher(teacherToDelete.id);
      setStatusMsg({
        type: 'success',
        text: `تم حذف حساب المعلم (${teacherToDelete.name}) بنجاح.`
      });
      setTeacherToDelete(null);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'فشل حذف الحساب: ' + e?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // STUDENT HANDLERS
  // -------------------------------------------------------------
  const handleOpenEditStudent = (s: Student) => {
    setEditingStudent(s);
    setNewStudentPassword(s.password || '123');
    setNewStudentPhone(s.phone || '');
    setStatusMsg(null);
  };

  const handleSaveStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setIsSubmitting(true);
      const updated: Student = {
        ...editingStudent,
        password: newStudentPassword.trim() || '123',
        phone: newStudentPhone.trim() || editingStudent.phone
      };
      await onUpdateStudent(updated);
      setStatusMsg({
        type: 'success',
        text: `تم تحديث بيانات دخول الطالب (${updated.name}) بنجاح!`
      });
      setEditingStudent(null);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'فشل تحديث بيانات الطالب: ' + e?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkStudentGoogle = async (student: Student) => {
    try {
      setUnlinkingStudentId(student.id);
      const updated = await GoogleWorkspaceService.unlinkStudentGoogleAccount(student);
      await onUpdateStudent(updated);
      if (editingStudent && editingStudent.id === student.id) {
        setEditingStudent(updated);
      }
      setStatusMsg({
        type: 'success',
        text: `تم فصل حساب Google (${student.googleEmail || ''}) عن الطالب (${student.name}) بنجاح!`
      });
    } catch (e: any) {
      console.error('Unlink student Google error:', e);
      setStatusMsg({ type: 'error', text: 'فشل فصل حساب Google: ' + (e?.message || String(e)) });
    } finally {
      setUnlinkingStudentId(null);
    }
  };

  // Filtered lists: Programmer is strictly hidden from non-developers
  const filteredTeachers = (teachers || []).filter(
    t =>
      (isDeveloper || !isTeacherDeveloper(t)) &&
      ((t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
       (t.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
       (t.phone || '').includes(searchQuery))
  );

  const filteredStudents = (students || []).filter(
    s =>
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#064e3b] border border-[#fbbf24]/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-[#064e3b] flex items-center justify-center font-black shadow-lg shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black font-heading text-[#fbbf24] flex items-center gap-2">
                إدارة الحسابات والصلاحيات السحابية
              </h2>
              <p className="text-xs text-[#86efac] mt-0.5">
                ميزة المشرف العام: إدارة حسابات المعلمين والطلاب وتحديد أدوار المشرفين ونسخ روابط الدخول المباشرة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddTeacher}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة معلم / مشرف جديد</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-[#86efac]'
                : 'bg-red-950/80 border-red-500/50 text-red-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Sub-tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#022c22]/80 border border-[#065f46] p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('teachers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'teachers'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                : 'text-[#86efac] hover:bg-[#064e3b]/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>حسابات المعلمين والمشرفين ({teachers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'students'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                : 'text-[#86efac] hover:bg-[#064e3b]/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>حسابات وبوابات الطلاب ({students.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#86efac] absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث بالاسم أو المعرف أو الهاتف..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-[#064e3b]/60 border border-[#065f46] rounded-xl text-xs text-white placeholder-[#86efac]/50 focus:border-[#fbbf24] focus:outline-none"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. TEACHERS & SUPERVISORS TABLE                               */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'teachers' && (
        <div className="overflow-x-auto rounded-3xl border border-[#065f46] bg-[#022c22]/90 shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#064e3b] text-emerald-100 border-b border-[#065f46] font-bold">
              <tr>
                <th className="p-4">اسم المعلم / الحساب</th>
                <th className="p-4">اسم المستخدم</th>
                <th className="p-4">كلمة المرور</th>
                <th className="p-4">رقم الهاتف</th>
                <th className="p-4">الدور والصلاحية / الترقية</th>
                <th className="p-4">المجمع القرآني</th>
                <th className="p-4">الحلقات المخصصة</th>
                <th className="p-4 text-center">حساب Google والتسجيل السريع</th>
                <th className="p-4 text-center">رابط الدخول السريع</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/40 text-emerald-100">
              {filteredTeachers.map(teacher => {
                const cleanTUser = (teacher.username || '').trim().toLowerCase();
                const isSuper =
                  teacher.role === 'supervisor' ||
                  teacher.role === 'developer' ||
                  Boolean(teacher.isPrimary) ||
                  cleanTUser === 'admin' ||
                  cleanTUser === 'developer' ||
                  cleanTUser.includes('منتصر');

                const teacherLoginUrl = `${getOrigin()}?u=${encodeURIComponent(teacher.id || teacher.username || '')}`;

                // Calculate teacher's assigned complexes (multi-complex support)
                const teacherComplexes = getTeacherAllComplexes(teacher, teachers, complexes, halaqahs, false);
                const resolvedComplexNames: string[] = [];
                teacherComplexes.forEach(c => {
                  if (c && c.name && !resolvedComplexNames.includes(c.name)) {
                    resolvedComplexNames.push(c.name);
                  }
                });
                if (teacher.complexNames && Array.isArray(teacher.complexNames)) {
                  teacher.complexNames.forEach(cn => {
                    if (cn && typeof cn === 'string' && !resolvedComplexNames.includes(cn)) {
                      resolvedComplexNames.push(cn);
                    }
                  });
                }
                if (resolvedComplexNames.length === 0) {
                  const fallback = teacher.complexName || (complexes.find(c => c.id === teacher.complexId)?.name) || 'المجمع الرئيسي';
                  resolvedComplexNames.push(fallback);
                }
                const isMultiComplexTeacher = resolvedComplexNames.length > 1;

                const assignedHNames =
                  teacher.halaqahNames && teacher.halaqahNames.length > 0
                    ? teacher.halaqahNames
                    : teacher.halaqahIds && teacher.halaqahIds.length > 0
                    ? (halaqahs || []).filter(h => teacher.halaqahIds?.includes(h.id)).map(h => h.name)
                    : teacher.halaqahName
                    ? [teacher.halaqahName]
                    : ['جميع الحلقات'];

                return (
                  <tr
                    key={teacher.id}
                    id={`account-item-${teacher.id}`}
                    data-item-id={teacher.id}
                    className="hover:bg-emerald-900/20 transition-all"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700/50 text-[#fbbf24] flex items-center justify-center font-black shrink-0">
                          {(teacher.name || teacher.username || 'م').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{teacher.name}</span>
                            {isSuper && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-[#fbbf24] border border-amber-500/30 font-bold">
                                مشرف عام
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#86efac]/80">{teacher.title || 'محفظ ومربي'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-emerald-200">{teacher.username}</td>

                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg bg-[#064e3b] font-mono text-[#fbbf24] border border-[#065f46]">
                        {teacher.password || '123'}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-emerald-200">{teacher.phone || '-'}</td>

                    <td className="p-4 min-w-[210px]">
                      <div className="flex flex-col gap-1.5">
                        {teacher.role === 'developer' || cleanTUser === 'admin' || cleanTUser.includes('منتصر') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-[#064e3b] shadow-sm border border-amber-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>مبرمج ومطور المنظومة</span>
                          </span>
                        ) : teacher.role === 'supervisor' || teacher.isPrimary ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-[#fbbf24] border border-amber-500/40">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span>معلم مشرف (مجمعه فقط)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-800/40 text-emerald-300 border border-emerald-600/40">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span>معلم حلقة ومحفظ</span>
                          </span>
                        )}

                        {/* Quick Role Upgrade Dropdown for Developer */}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-amber-300/80 font-bold shrink-0">الترقية:</span>
                          <select
                            value={teacher.role || (teacher.isPrimary ? 'supervisor' : 'teacher')}
                            onChange={e => handleUpdateTeacherRole(teacher, e.target.value as 'developer' | 'supervisor' | 'teacher')}
                            className="w-full bg-[#022c22] border border-amber-500/40 hover:border-amber-400 rounded-lg px-2 py-1 text-[11px] text-amber-200 font-bold cursor-pointer focus:outline-none transition-colors"
                            title="ترقية أو تغيير رتبة وصلاحية هذا الحساب فورياً"
                          >
                            <option value="developer" className="bg-[#064e3b] text-amber-300 font-bold">ترقية إلى: مبرمج ومطور</option>
                            <option value="supervisor" className="bg-[#064e3b] text-emerald-200 font-bold">ترقية إلى: معلم مشرف</option>
                            <option value="teacher" className="bg-[#064e3b] text-emerald-300">تعيين كـ: معلم حلقة</option>
                          </select>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {teacher.role === 'developer' || cleanTUser === 'admin' || cleanTUser.includes('منتصر') ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-amber-400 text-[#064e3b] font-black shadow-sm" title="صلاحية المبرمج: يمكنه التنقل بين كافة المجمعات بحرية تامة">
                          <Sparkles className="w-3 h-3" />
                          المبرمج (يتنقل بين كل المجمعات)
                        </span>
                      ) : isMultiComplexTeacher ? (
                        <div className="flex flex-col gap-1 items-start min-w-[200px]">
                          {/* Main badge: انه في المجمع كذا وكذا */}
                          <div className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-emerald-900/50 to-[#064e3b] text-amber-200 border border-amber-400/60 font-bold shadow-md">
                            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              في {resolvedComplexNames.join(' و ')}
                            </span>
                          </div>

                          {/* Distinct tags for each complex */}
                          <div className="flex flex-wrap gap-1 items-center mt-0.5">
                            <span className="text-[9.5px] font-black text-amber-300 bg-amber-950/80 border border-amber-700/50 px-1.5 py-0.5 rounded-md">
                              مشترك بين ({resolvedComplexNames.length}) مجمعات
                            </span>
                            {resolvedComplexNames.map((cName, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-md bg-[#064e3b] text-emerald-200 border border-emerald-600/50 font-medium"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                {cName}
                              </span>
                            ))}
                          </div>

                          <span className="text-[9px] text-emerald-300/80 font-sans flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            صلاحية التنقل بين المجمعين وحلقاتهما
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-[#064e3b] text-[#86efac] border border-[#065f46] font-bold">
                            <Building2 className="w-3.5 h-3.5 text-[#fbbf24]" />
                            {resolvedComplexNames[0]}
                          </span>
                          <span className="text-[9px] text-emerald-400/60 font-sans">
                            مجمع حصري (لا يتنقل)
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {isSuper ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/40 font-bold">
                            كامل الحلقات (مشرف)
                          </span>
                        ) : assignedHNames.length > 0 ? (
                          assignedHNames.map((name, i) => {
                            const matchedH = halaqahs.find(h => h.name === name || (teacher.halaqahIds && teacher.halaqahIds[i] === h.id));
                            const hComp = matchedH?.complexId ? complexes.find(c => c.id === matchedH.complexId) : null;
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#064e3b] text-[#86efac] border border-[#065f46]"
                              >
                                <span>{name}</span>
                                {isMultiComplexTeacher && hComp && (
                                  <span className="text-[8.5px] px-1 py-0.2 rounded bg-[#022c22] text-amber-300 font-bold border border-amber-500/30">
                                    {hComp.name}
                                  </span>
                                )}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-red-300">غير محدد</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      {teacher.isGoogleLinked ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-900/70 text-emerald-200 border border-emerald-500/50 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[130px] font-mono">{teacher.googleEmail}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkTeacherGoogle(teacher)}
                            disabled={linkingTeacherId === teacher.id}
                            className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer disabled:opacity-50"
                          >
                            {linkingTeacherId === teacher.id ? 'جاري الفصل...' : 'فصل حساب Google'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLinkTeacherGoogle(teacher)}
                          disabled={linkingTeacherId === teacher.id}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-300 shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                          title="ربط حساب Google لهذا المعلم لتسجيل الدخول السريع"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>{linkingTeacherId === teacher.id ? 'جاري الربط...' : 'ربط Google'}</span>
                        </button>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `${getOrigin()}?u=${encodeURIComponent(teacher.id || teacher.username)}`;
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="فتح والدخول لحساب هذا المعلم مباشرة"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح الحساب</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(teacherLoginUrl, teacher.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#064e3b] hover:bg-emerald-700 text-[#86efac] hover:text-white border border-[#065f46] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          title="نسخ رابط الدخول المباشر لهذا المعلم"
                        >
                          {copiedId === teacher.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرابط</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditTeacher(teacher)}
                          className="p-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-[#86efac] hover:text-white transition-all cursor-pointer"
                          title="تعديل بيانات الحساب"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTeacherToDelete(teacher)}
                          className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-800 text-red-300 hover:text-white transition-all cursor-pointer"
                          title="حذف الحساب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ------------------------------------------------------------- */}
      {/* 2. STUDENTS ACCOUNTS TABLE                                     */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'students' && (
        <div className="overflow-x-auto rounded-3xl border border-[#065f46] bg-[#022c22]/90 shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#064e3b] text-emerald-100 border-b border-[#065f46] font-bold">
              <tr>
                <th className="p-4">اسم الطالب</th>
                <th className="p-4">معرّف الطالب (ID)</th>
                <th className="p-4">رمز / كلمة المرور</th>
                <th className="p-4">الحلقة</th>
                <th className="p-4">هاتف التواصل</th>
                <th className="p-4">حساب Google</th>
                <th className="p-4 text-center">رابط البوابة المباشر</th>
                <th className="p-4 text-center">إجراءات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/40 text-emerald-100">
              {filteredStudents.map(student => {
                const portalUrl = `${getOrigin()}?portal=${encodeURIComponent(student.id)}`;
                const halaqahObj = halaqahs.find(h => h.id === student.halaqahId);
                const halaqahName = halaqahObj ? halaqahObj.name : student.halaqahName || 'غير مسند';
                const isHighlighted = initialStudentToDeleteId === student.id;

                return (
                  <tr
                    key={student.id}
                    id={`student-item-${student.id}`}
                    data-item-id={student.id}
                    className={`transition-all ${
                      isHighlighted
                        ? 'bg-red-950/40 border border-red-500/60 ring-2 ring-red-400'
                        : 'hover:bg-emerald-900/20'
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{student.name}</span>
                        {isHighlighted && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-600 text-white font-bold">
                            المطلوب حذفه
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#86efac]/70">المستوى: {student.level}</div>
                    </td>

                    <td className="p-4 font-mono text-emerald-200">{student.id}</td>

                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg bg-[#064e3b] font-mono text-[#fbbf24] border border-[#065f46]">
                        {student.password || '123'}
                      </span>
                    </td>

                    <td className="p-4 text-emerald-200">{halaqahName}</td>

                    <td className="p-4 font-mono text-emerald-200">{student.phone}</td>

                    <td className="p-4">
                      {student.isGoogleLinked ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold" title={student.googleEmail || ''}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[110px]">{student.googleEmail || 'مرتبط'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkStudentGoogle(student)}
                            disabled={unlinkingStudentId === student.id}
                            className="px-2 py-0.5 rounded-lg bg-red-950/70 hover:bg-red-800 text-red-300 hover:text-white border border-red-500/40 text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="فصل حساب Google عن هذا الطالب"
                          >
                            <Trash2 className="w-2.5 h-2.5 shrink-0" />
                            <span>{unlinkingStudentId === student.id ? 'جاري الفصل...' : 'فصل الحساب'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-300/60">غير مرتبط</span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `${getOrigin()}?portal=${encodeURIComponent(student.id)}`;
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="فتح بوابة الطالب مباشرة"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح البوابة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(portalUrl, student.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#064e3b] hover:bg-emerald-700 text-[#86efac] hover:text-white border border-[#065f46] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          title="نسخ رابط الدخول المباشر لبوابة الطالب"
                        >
                          {copiedId === student.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرابط</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditStudent(student)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer"
                          title="تعديل كلمة مرور ورقم هاتف الطالب"
                        >
                          تعديل
                        </button>
                        {onDeleteStudent && (
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-800 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="حذف حساب الطالب نهائياً من المنظومة"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE STUDENT CONFIRMATION (للمبرمج)                  */}
      {/* ------------------------------------------------------------- */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain" dir="rtl">
          <div className="relative my-auto bg-[#022c22] border border-red-500/60 rounded-3xl p-5 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-heading">تأكيد حذف حساب الطالب</h3>
              <p className="text-xs text-[#86efac]/90 mt-2 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف حساب الطالب <span className="text-[#fbbf24] font-black">"{studentToDelete.name}"</span> نهائياً من قسم الحسابات؟
                <br />
                <span className="text-red-300 text-[11px]">سيتم حذف حسابه وكافة بيانات اعتماده من قاعدة البيانات.</span>
              </p>
              {Boolean(studentToDelete.isGoogleLinked || studentToDelete.googleEmail) && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs text-right mt-3 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🔗</span>
                    <span>حساب Google مرتبط بهذا الطالب:</span>
                  </div>
                  <div className="font-mono text-xs text-white" dir="ltr">
                    {studentToDelete.googleEmail}
                  </div>
                  <div className="text-[11px] text-amber-200/90 leading-tight">
                    سيتم فك ارتباط حساب Google وحذف بيانات اعتماده مع إتمام الحذف.
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#064e3b] text-[#86efac] hover:text-white border border-[#065f46] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={async () => {
                  if (!studentToDelete || !onDeleteStudent) return;
                  setIsDeletingStudent(true);
                  try {
                    await onDeleteStudent(studentToDelete.id);
                    setStatusMsg({ type: 'success', text: `تم حذف حساب الطالب (${studentToDelete.name}) بنجاح!` });
                    setStudentToDelete(null);
                  } catch (e: any) {
                    setStatusMsg({ type: 'error', text: e.message || 'تعذر حذف الطالب' });
                  } finally {
                    setIsDeletingStudent(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isDeletingStudent ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT TEACHER OR SUPERVISOR                       */}
      {/* ------------------------------------------------------------- */}
      {isEditingTeacher && editingTeacherData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain" dir="rtl">
          <div className="relative my-auto bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#065f46] shrink-0">
              <div className="flex items-center gap-2 text-base font-bold text-[#fbbf24] font-heading">
                <Users className="w-5 h-5" />
                <span>{isNewTeacher ? 'إضافة معلم أو مشرف' : 'تعديل بيانات الحساب والصلاحيات'}</span>
              </div>
              <button
                onClick={() => {
                  setIsEditingTeacher(false);
                  setEditingTeacherData(null);
                  setFoundTeacherByCode(null);
                  setSearchTeacherCode('');
                }}
                className="text-emerald-400 hover:text-white cursor-pointer"
              >
                ✕
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
                    يقوم المعلم بالضغط على زر <strong>(الحساب)</strong> في الشريط العلوي للمنظومة، وسيظهر رمزه الفريد المكون من 6 أرقام في أعلى النافذة ليقوم بنسخه ومشاركته معك.
                  </p>
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1.5">
                    أدخل الرمز الفريد للمعلم (6 أرقام):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="مثال: 482910"
                      value={searchTeacherCode}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setSearchTeacherCode(val);
                        if (val.length === 6) {
                          handleSearchTeacherByCode(val);
                        } else {
                          setFoundTeacherByCode(null);
                          setCodeSearchError('');
                        }
                      }}
                      className="flex-1 bg-[#064e3b]/80 border border-[#065f46] focus:border-[#fbbf24] rounded-xl px-3.5 py-2.5 text-base font-mono font-bold tracking-widest text-[#fbbf24] text-center outline-none"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      disabled={isSearchingCode}
                      onClick={() => handleSearchTeacherByCode()}
                      className="px-4 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-[#fbbf24] border border-amber-400/40 font-bold text-xs cursor-pointer shrink-0 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSearchingCode ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                          <span>جارٍ البحث...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>التحقق</span>
                        </>
                      )}
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

                    {/* Complex Target */}
                    {complexes.length > 0 && (
                      <div>
                        <label className="block text-emerald-200 font-bold mb-1">المجمع المستهدف للإلحاق:</label>
                        <select
                          value={primaryComplexId}
                          onChange={e => setPrimaryComplexId(e.target.value)}
                          className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-[#fbbf24] text-xs"
                        >
                          {complexes.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#022c22] text-white font-bold">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Halaqahs assignment */}
                    <div className="space-y-1.5">
                      <label className="block text-emerald-200 font-bold">حدد الحلقات التي سيتولى تدريسها في هذا المجمع:</label>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-[#064e3b]/40 rounded-xl border border-[#065f46]">
                        {halaqahs.map(h => {
                          const isChecked = selectedHalaqahIds.includes(h.id);
                          return (
                            <label
                              key={h.id}
                              onClick={() => handleToggleHalaqah(h.id)}
                              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-800/40 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded accent-amber-400"
                              />
                              <span className="text-white text-xs">{h.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAttachTeacherByCode}
                      disabled={isSubmitting || selectedHalaqahIds.length === 0}
                      className="w-full py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#064e3b]" />
                      <span>{isSubmitting ? 'جاري الإلحاق...' : 'إلحاق المعلم بهذا المجمع والحلقات المحددة'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveTeacherForm} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-emerald-200 font-bold">اسم المعلم / المشرف الثلاثي * (إلزامي):</label>
                  {editingTeacherData.name && editingTeacherData.name.trim().length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      getThreePartNameValidation(editingTeacherData.name, editingTeacherData.role === 'supervisor' ? 'مشرف' : 'معلم').isValid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {getThreePartNameValidation(editingTeacherData.name, editingTeacherData.role === 'supervisor' ? 'مشرف' : 'معلم').isValid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ثلاثي معتمد</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>يلزم 3 مقاطع</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="مثال: الشيخ عبد الله بن محمد الدوسري"
                  value={editingTeacherData.name || ''}
                  onChange={e => setEditingTeacherData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white outline-none focus:border-[#fbbf24]"
                />
                <p className="text-[10px] text-[#86efac]/70 mt-1">
                  * يشترط تسجيل الاسم الثلاثي كاملاً (الاسم، اسم الأب، واسم العائلة).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">اسم المستخدم (للدخول):</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: abdullah"
                    value={editingTeacherData.username || ''}
                    onChange={e => setEditingTeacherData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white outline-none focus:border-[#fbbf24]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">كلمة المرور:</label>
                  <input
                    type="text"
                    required
                    placeholder="123"
                    value={editingTeacherData.password || ''}
                    onChange={e => setEditingTeacherData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white outline-none focus:border-[#fbbf24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">رقم الهاتف (الواتساب):</label>
                  <input
                    type="text"
                    placeholder="0500000000"
                    value={editingTeacherData.phone || ''}
                    onChange={e => setEditingTeacherData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white outline-none focus:border-[#fbbf24]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">نوع الدور والصلاحية والترقية:</label>
                  <select
                    value={editingTeacherData.role || (editingTeacherData.isPrimary ? 'supervisor' : 'teacher')}
                    onChange={e => {
                      const val = e.target.value as 'developer' | 'supervisor' | 'teacher';
                      const isSuper = val === 'supervisor';
                      const isDev = val === 'developer';
                      setEditingTeacherData(prev => ({
                        ...prev,
                        role: val,
                        isPrimary: isSuper || isDev,
                        title: isDev ? 'مشرف ومطور المنظومة' : (isSuper ? 'معلم مشرف' : 'معلم حلقة ومحفظ')
                      }));
                    }}
                    className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-[#fbbf24] font-bold outline-none focus:border-[#fbbf24] text-xs"
                  >
                    <option value="developer" className="bg-[#022c22] text-amber-300 font-bold">مبرمج ومطور المنظومة (كامل الصلاحيات والتنقل بين كافة المجمعات)</option>
                    <option value="supervisor" className="bg-[#022c22] text-emerald-200 font-bold">معلم مشرف (إشراف كامل على مجمعه وحلقاته فقط - لا يتنقل)</option>
                    <option value="teacher" className="bg-[#022c22] text-emerald-300">معلم حلقة ومحفظ (مخصص لحلقاته فقط ضمن مجمعه)</option>
                  </select>
                </div>
              </div>

              {/* Programmer Direct Multi-Complex and Multi-Halaqahs Assignment */}
              <div className="space-y-3 pt-2 border-t border-[#065f46]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-emerald-200 font-bold flex items-center gap-1.5 text-xs">
                    <Building2 className="w-4 h-4 text-[#fbbf24]" />
                    <span>تخصيص المجمعات القرآنية والحلقات (صلاحية المبرمج المباشرة):</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-bold bg-[#064e3b] border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#fbbf24]" />
                    ربط مباشر بحلقات في عدة مجمعات دون الحاجة لرمز
                  </span>
                </div>

                <div className="text-[11px] text-emerald-200/90 leading-relaxed bg-[#022c22]/80 p-2.5 rounded-xl border border-emerald-700/50">
                  <strong className="text-amber-300">ميزة المبرمج:</strong> يمكنك كمبرمج ومطور ربط المعلم بحلقتين أو أكثر في مجمعات مختلفة مباشرة عبر تحديد المجمعات والحلقات أدناه. سيتمكن المعلم من التنقل السلس بين حلقاته في كلا المجمعين دون قيود.
                </div>

                {/* Primary Complex Selector */}
                <div>
                  <label className="block text-[11px] text-emerald-200 font-bold mb-1">المجمع الرئيسي الافتراضي للحساب:</label>
                  <select
                    value={primaryComplexId}
                    onChange={e => {
                      setPrimaryComplexId(e.target.value);
                      if (e.target.value) {
                        setSelectedComplexIds(prev => prev.includes(e.target.value) ? prev : [...prev, e.target.value]);
                      }
                    }}
                    className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-[#fbbf24] text-xs"
                  >
                    {complexes.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#022c22] text-white font-bold">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grouped Halaqahs by Complex Cards */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {complexes.map(comp => {
                    const compHalaqahs = halaqahs.filter(h => (h.complexId || complexes[0]?.id) === comp.id);
                    const selectedCountInComp = compHalaqahs.filter(h => selectedHalaqahIds.includes(h.id)).length;
                    const isCompSelected = selectedComplexIds.includes(comp.id) || selectedCountInComp > 0 || comp.id === primaryComplexId;

                    return (
                      <div
                        key={comp.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isCompSelected
                            ? 'bg-[#064e3b]/50 border-amber-400/50 shadow-sm'
                            : 'bg-[#022c22]/60 border-[#065f46] opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#065f46]/60">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-white">
                            <input
                              type="checkbox"
                              checked={isCompSelected}
                              onChange={() => handleToggleComplexSelection(comp.id)}
                              className="rounded accent-amber-400 w-4 h-4 cursor-pointer"
                            />
                            <Building2 className="w-3.5 h-3.5 text-[#fbbf24]" />
                            <span>{comp.name}</span>
                          </label>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            selectedCountInComp > 0
                              ? 'bg-amber-400 text-[#064e3b]'
                              : 'bg-[#022c22] text-emerald-400'
                          }`}>
                            {selectedCountInComp > 0 ? `${selectedCountInComp} حلقات مخصصة` : 'لا توجد حلقات مسندة'}
                          </span>
                        </div>

                        {/* Halaqahs checkboxes under this complex */}
                        <div className="pt-2">
                          {compHalaqahs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {compHalaqahs.map(h => {
                                const isChecked = selectedHalaqahIds.includes(h.id);
                                return (
                                  <label
                                    key={h.id}
                                    onClick={() => handleToggleHalaqah(h.id, comp.id)}
                                    className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer transition-all ${
                                      isChecked
                                        ? 'bg-[#fbbf24]/20 border border-amber-400/60 text-white font-bold'
                                        : 'bg-[#022c22]/70 border border-[#065f46]/60 text-emerald-200 hover:bg-[#064e3b]/40'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="rounded accent-amber-400 w-3.5 h-3.5"
                                    />
                                    <BookOpen className={`w-3.5 h-3.5 ${isChecked ? 'text-[#fbbf24]' : 'text-emerald-400'}`} />
                                    <span className="truncate">{h.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-emerald-400/60 italic py-1">لا توجد حلقات مسجلة في هذا المجمع بعد.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Google Account Linking in Modal */}
              <div className="bg-[#022c22]/70 border border-[#065f46] rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="text-xs font-bold text-emerald-100">ربط حساب Google للدخول السريع:</span>
                  </div>
                  {editingTeacherData.isGoogleLinked ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                      مرتبط
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400/60 font-medium">غير متصل</span>
                  )}
                </div>

                {editingTeacherData.isGoogleLinked ? (
                  <div className="flex items-center justify-between text-xs bg-[#064e3b]/50 p-2.5 rounded-xl border border-[#065f46]">
                    <span className="text-emerald-200 font-mono text-[11px] truncate max-w-[200px]">
                      {editingTeacherData.googleEmail}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeacherData(prev => ({
                          ...prev,
                          isGoogleLinked: false,
                          googleEmail: undefined,
                          googleUid: undefined,
                          googleName: undefined,
                          googlePhotoUrl: undefined
                        }));
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                    >
                      فصل حساب Google
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-300/80">
                      يمكن لهذا المعلم تسجيل الدخول فوراً بضغطة زر عبر حسابه في Google.
                    </span>
                    {!isNewTeacher && (
                      <button
                        type="button"
                        onClick={() => handleLinkTeacherGoogle(editingTeacherData as TeacherAccount)}
                        disabled={linkingTeacherId === editingTeacherData.id}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 shadow-sm inline-flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {linkingTeacherId === editingTeacherData.id ? 'جاري الربط...' : 'ربط الآن'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#065f46]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black cursor-pointer shadow-lg transition-all"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحساب سحابياً'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTeacher(false);
                    setEditingTeacherData(null);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-[#064e3b] hover:bg-emerald-800 text-emerald-200 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT STUDENT PASSWORD                                  */}
      {/* ------------------------------------------------------------- */}
      {editingStudent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain" dir="rtl">
          <div className="relative my-auto bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#065f46] shrink-0">
              <div className="flex items-center gap-2 text-base font-bold text-[#fbbf24] font-heading">
                <Key className="w-5 h-5" />
                <span>تعديل بيانات دخول الطالب</span>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-emerald-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentPassword} className="space-y-4 text-xs">
              <div className="p-3 bg-[#064e3b]/40 rounded-xl border border-[#065f46]">
                <div className="text-white font-bold">{editingStudent.name}</div>
                <div className="text-[11px] text-[#86efac] mt-0.5">معرف الطالب: {editingStudent.id}</div>
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">رمز / كلمة مرور الدخول:</label>
                <input
                  type="text"
                  required
                  value={newStudentPassword}
                  onChange={e => setNewStudentPassword(e.target.value)}
                  className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white font-mono font-bold outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">رقم الهاتف:</label>
                <input
                  type="text"
                  value={newStudentPhone}
                  onChange={e => setNewStudentPhone(e.target.value)}
                  className="w-full bg-[#064e3b]/70 border border-[#065f46] rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#fbbf24]"
                />
              </div>

              {/* Google Account Linking / Unlinking for Supervisor */}
              <div className="p-3 bg-[#064e3b]/40 rounded-xl border border-[#065f46] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-200">حساب Google المرتبط:</span>
                  {editingStudent.isGoogleLinked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {editingStudent.googleEmail || 'مرتبط'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-400/60">غير مرتبط بأي حساب Google</span>
                  )}
                </div>

                {editingStudent.isGoogleLinked && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleUnlinkStudentGoogle(editingStudent)}
                      disabled={unlinkingStudentId === editingStudent.id}
                      className="w-full py-2 px-3 rounded-lg bg-red-950/80 hover:bg-red-800 text-red-200 hover:text-white border border-red-500/40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{unlinkingStudentId === editingStudent.id ? 'جاري فصل الحساب...' : 'فصل حساب Google عن هذا الطالب'}</span>
                    </button>
                    <p className="text-[10px] text-emerald-300/70 mt-1 text-center">
                      فصل الحساب يتيح للطالب أو طالب آخر ربط هذا البريد بحساب جديد دون تعارض.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black cursor-pointer shadow-lg transition-all"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="py-2.5 px-4 rounded-xl bg-[#064e3b] hover:bg-emerald-800 text-emerald-200 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE TEACHER CONFIRMATION                            */}
      {/* ------------------------------------------------------------- */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overscroll-contain" dir="rtl">
          <div className="bg-[#022c22] border border-red-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تأكيد حذف حساب المعلم</h3>
              <p className="text-xs text-emerald-200/80 mt-1">
                هل أنت متأكد من حذف حساب المعلم ({teacherToDelete.name})؟ لن يتمكن من تسجيل الدخول بعد الآن.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmDeleteTeacher}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                {isSubmitting ? 'جاري الحذف...' : 'نعم، حذف الحساب'}
              </button>
              <button
                onClick={() => setTeacherToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-[#064e3b] text-emerald-200 text-xs font-bold hover:text-white cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
