import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  Plus,
  Trash2,
  Edit,
  Lock,
  Phone,
  Shield,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  Users,
  RefreshCw,
  KeyRound,
  Search
} from 'lucide-react';
import { TeacherAccount, AppSettings, getThreePartNameValidation, isTeacherDeveloper, getTeacherSixDigitCode, normalizeArabicDigits } from '../types';
import { OmranDataService } from '../lib/firebase';

interface TeacherManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: TeacherAccount[];
  settings: AppSettings;
  onSaveTeacher: (teacher: TeacherAccount) => Promise<void>;
  onDeleteTeacher: (teacherId: string) => Promise<void>;
}

export const TeacherManagementModal: React.FC<TeacherManagementModalProps> = ({
  isOpen,
  onClose,
  teachers,
  settings,
  onSaveTeacher,
  onDeleteTeacher
}) => {
  const [editingTeacher, setEditingTeacher] = useState<Partial<TeacherAccount> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'code'>('new');
  const [searchTeacherCode, setSearchTeacherCode] = useState('');
  const [foundTeacherByCode, setFoundTeacherByCode] = useState<TeacherAccount | null>(null);
  const [codeSearchError, setCodeSearchError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsNew(true);
    setAddMode('new');
    setSearchTeacherCode('');
    setFoundTeacherByCode(null);
    setCodeSearchError('');
    setEditingTeacher({
      id: `teacher-${Date.now()}`,
      name: '',
      username: '',
      password: '123',
      phone: '',
      title: 'معلم شريك ومحفظ',
      isPrimary: false,
      createdAt: new Date().toISOString()
    });
    setStatusMsg(null);
  };

  const handleSearchTeacherByCode = async (codeToSearch?: string) => {
    const rawCode = (codeToSearch !== undefined ? codeToSearch : searchTeacherCode).trim();
    if (!rawCode) {
      setCodeSearchError('يرجى كتابة الرمز الفريد للمعلم المكون من 6 أرقام.');
      setFoundTeacherByCode(null);
      return;
    }
    const cleanDigits = normalizeArabicDigits(rawCode).replace(/\D/g, '');
    if (cleanDigits.length !== 6) {
      setCodeSearchError('يجب أن يتكون الرمز الفريد من 6 أرقام بالضبط.');
      setFoundTeacherByCode(null);
      return;
    }

    let matched = teachers.find(t => {
      const c = normalizeArabicDigits(t.teacherCode || getTeacherSixDigitCode(t)).replace(/\D/g, '').trim();
      return c === cleanDigits;
    });

    if (!matched) {
      try {
        const found = await OmranDataService.findTeacherByCode(cleanDigits);
        if (found) matched = found;
      } catch (err) {
        console.warn('TeacherManagementModal findTeacherByCode error:', err);
      }
    }

    if (matched) {
      setFoundTeacherByCode(matched);
      setCodeSearchError('');
    } else {
      setFoundTeacherByCode(null);
      setCodeSearchError(`لم يتم العثور على معلم مسجل بالرمز (${cleanDigits}). اطلب من المعلم نسخه من نافذة تعديل حسابه.`);
    }
  };

  const handleAttachTeacherByCode = async () => {
    if (!foundTeacherByCode) return;
    try {
      setIsSubmitting(true);
      const existingCIds = foundTeacherByCode.complexIds || (foundTeacherByCode.complexId ? [foundTeacherByCode.complexId] : []);
      const targetCId = settings.complexId;
      const updatedCIds = targetCId ? Array.from(new Set([...existingCIds, targetCId])) : existingCIds;

      const halaqahs = await OmranDataService.loadHalaqahs();
      const targetHName = (settings.halaqahName || '').trim();
      const matchHalaqah = halaqahs.find(h =>
        (targetCId && h.complexId === targetCId) ||
        (targetHName && h.name.trim() === targetHName)
      );

      if (matchHalaqah) {
        await OmranDataService.assignTeacherToHalaqahAndComplex(
          foundTeacherByCode.id,
          matchHalaqah.id,
          targetCId
        );
      } else {
        const updatedTeacher: TeacherAccount = {
          ...foundTeacherByCode,
          complexIds: updatedCIds,
          complexId: targetCId || foundTeacherByCode.complexId,
          complexName: settings.complexName || foundTeacherByCode.complexName,
          halaqahName: settings.halaqahName || foundTeacherByCode.halaqahName
        };
        await onSaveTeacher(updatedTeacher);
      }

      setStatusMsg({
        type: 'success',
        text: `تم إلحاق المعلم (${foundTeacherByCode.name}) بالحلقة والمجمع بنجاح!`
      });
      setEditingTeacher(null);
      setIsNew(false);
      setFoundTeacherByCode(null);
      setSearchTeacherCode('');
    } catch (err: any) {
      setCodeSearchError(err?.message || 'حدث خطأ أثناء إلحاق المعلم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (t: TeacherAccount) => {
    setIsNew(false);
    setEditingTeacher({ ...t });
    setStatusMsg(null);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
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

    const cleanTeacherName = editingTeacher.name.trim();
    const normTeacherName = cleanTeacherName.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

    // Check duplicate teacher name
    const duplicateTeacher = teachers.find(
      t => t.id !== editingTeacher.id &&
           t.name.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي') === normTeacherName
    );
    if (duplicateTeacher) {
      setStatusMsg({
        type: 'error',
        text: `عذراً، هذا الاسم (${cleanTeacherName}) مسجل مسبقاً لمعلم أو مشرف في المنظومة! يرجى كتابة الاسم الرباعي أو إضافة اسم العائلة والجد لتجنب تطابق الأسماء.`
      });
      return;
    }

    // Check duplicate username if new
    if (isNew) {
      const exists = teachers.some(
        t => t.username.trim().toLowerCase() === editingTeacher.username?.trim().toLowerCase()
      );
      if (exists) {
        setStatusMsg({ type: 'error', text: 'اسم المستخدم مسجل لمعلم آخر بالفعل. اختر اسم مستخدم مختلف.' });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const fullTeacher: TeacherAccount = {
        id: editingTeacher.id || `teacher-${Date.now()}`,
        name: editingTeacher.name.trim(),
        username: editingTeacher.username.trim(),
        password: editingTeacher.password?.trim() || '123',
        phone: editingTeacher.phone?.trim() || '0500000000',
        title: editingTeacher.title?.trim() || 'معلم شريك ومحفظ',
        isPrimary: editingTeacher.isPrimary ?? false,
        createdAt: editingTeacher.createdAt || new Date().toISOString()
      };

      await onSaveTeacher(fullTeacher);
      setStatusMsg({
        type: 'success',
        text: isNew
          ? `تمت إضافة حساب المعلم (${fullTeacher.name}) بنجاح! متصل بنفس الحلقة والطلاب.`
          : `تم تحديث بيانات المعلم (${fullTeacher.name}) بنجاح!`
      });
      setEditingTeacher(null);
      setIsNew(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ حساب المعلم.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      await onDeleteTeacher(id);
      setDeleteConfirmId(null);
      setStatusMsg({ type: 'success', text: 'تم حذف حساب المعلم بنجاح.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل حذف الحساب: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain" dir="rtl">
      <div className="w-full max-w-2xl bg-[#064e3b] border border-[#fbbf24]/40 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto overscroll-contain flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#065f46] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-[#064e3b] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                <span>إدارة حسابات المعلمين والمعاونين</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#022c22] text-[#fbbf24] border border-[#fbbf24]/30 font-sans">
                  {teachers.length} معلماً
                </span>
              </h2>
              <p className="text-xs text-[#86efac]/90 mt-0.5">
                مشاركة نفس الحلقة والطلاب مع المزامنة السحابية الفورية في {settings.halaqahName || 'الحلقة القرآنية'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-[#022c22] text-[#86efac] hover:text-white border border-[#065f46] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Info Banner */}
        <div className="bg-[#022c22]/90 border border-[#fbbf24]/30 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#fbbf24] shrink-0 mt-0.5" />
          <div className="text-xs text-[#86efac] leading-relaxed">
            <strong className="text-[#fbbf24] block mb-1">المزامنة الحية المشتركة:</strong>
            أي معلم يتم إضافته هنا يمتلك صلاحية كاملة على نفس الحلقة والطلاب وسجلات الحضور والتقييمات. أي تعديل يقوم به أي معلم ينعكس فوراً ولحظياً لدى المعلم الآخر دون تعارض.
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24]'
                : 'bg-red-500/20 border border-red-500/40 text-red-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-[#fbbf24]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-300" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Form Modal for Add / Edit */}
        {editingTeacher ? (
          <div className="bg-[#022c22]/80 border border-[#065f46] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#065f46] pb-3">
              <h3 className="text-sm font-bold text-[#fbbf24] font-heading flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>{isNew ? 'إضافة حساب معلم' : 'تعديل بيانات المعلم'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingTeacher(null);
                  setFoundTeacherByCode(null);
                  setSearchTeacherCode('');
                }}
                className="text-xs text-[#86efac] hover:text-white"
              >
                إلغاء
              </button>
            </div>

            {/* Mode Switcher */}
            {isNew && (
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

            {isNew && addMode === 'code' ? (
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
                      onClick={() => handleSearchTeacherByCode()}
                      className="px-4 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-[#fbbf24] border border-amber-400/40 font-bold text-xs cursor-pointer shrink-0 transition-all flex items-center gap-1.5"
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

                    <button
                      type="button"
                      onClick={handleAttachTeacherByCode}
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 text-[#064e3b]" />
                      <span>{isSubmitting ? 'جاري الإلحاق...' : 'إلحاق المعلم بهذه الحلقة'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveForm} className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#86efac] text-right">
                    اسم المعلم الثلاثي <span className="text-red-400">* (إلزامي)</span>
                  </label>
                  {editingTeacher.name && editingTeacher.name.trim().length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      getThreePartNameValidation(editingTeacher.name, 'معلم').isValid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {getThreePartNameValidation(editingTeacher.name, 'معلم').isValid ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
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
                  value={editingTeacher.name || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  placeholder="مثال: أحمد عبد الرحمن البلوشي أو عبد الله بن فهد آل ثاني"
                  className="w-full bg-[#064e3b]/80 border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-[#86efac]/40 outline-none"
                  dir="rtl"
                />
                <p className="text-[10px] text-[#86efac]/70 mt-1">
                  * يجب كتابة الاسم الثلاثي كاملاً (الاسم، اسم الأب، واسم العائلة).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#86efac] mb-1.5 text-right">
                  الصفة / المسمى بالحلقة
                </label>
                <input
                  type="text"
                  value={editingTeacher.title || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, title: e.target.value })}
                  placeholder="مثال: معلم شريك / معلم مساعد / محفظ"
                  className="w-full bg-[#064e3b]/80 border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-[#86efac]/40 outline-none"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#86efac] mb-1.5 text-right">
                  اسم المستخدم للدخول <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.username || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, username: e.target.value })}
                  placeholder="اسم المستخدم للدخول..."
                  className="w-full bg-[#064e3b]/80 border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-[#86efac]/40 outline-none"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#86efac] mb-1.5 text-right">
                  كلمة المرور للدخول <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.password || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, password: e.target.value })}
                  placeholder="كلمة المرور..."
                  className="w-full bg-[#064e3b]/80 border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-[#86efac]/40 outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#86efac] mb-1.5 text-right">
                  رقم هاتف المعلم / واتساب
                </label>
                <input
                  type="tel"
                  value={editingTeacher.phone || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  className="w-full bg-[#064e3b]/80 border border-[#065f46] focus:border-[#fbbf24] rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-[#86efac]/40 outline-none"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#064e3b] text-[#86efac] hover:text-white border border-[#065f46]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-xl text-xs font-black bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : isNew ? 'إضافة المعلم الآن' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </form>
          )}
        </div>
        ) : null}

        {/* Teachers List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#86efac] uppercase tracking-wider">
              قائمة معلمي الحلقة المعتمدين ({teachers.length})
            </h3>
            {!editingTeacher && (
              <button
                onClick={handleStartAdd}
                className="py-2 px-3.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.25)] transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#064e3b]" />
                <span>+ إضافة حساب معلم ثانٍ / شريك</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {teachers.filter(t => !isTeacherDeveloper(t)).map((teacher, idx) => {
              const isDefaultPrimary = teacher.isPrimary || idx === 0;

              return (
                <div
                  key={teacher.id}
                  className="bg-[#022c22]/80 border border-[#065f46] hover:border-[#fbbf24]/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#064e3b] text-[#fbbf24] border border-[#fbbf24]/30 flex items-center justify-center font-bold text-base shadow-inner shrink-0">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{teacher.name}</span>
                        {isDefaultPrimary ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/40 font-bold">
                            المعلم الأول
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#86efac] border border-emerald-500/30">
                            {teacher.title || 'معلم شريك'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#86efac]/80 mt-1">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-[#fbbf24]" />
                          <span>المستخدم: <strong className="text-white font-mono">{teacher.username}</strong></span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-[#fbbf24]" />
                          <span>الرمز: <strong className="text-[#fbbf24] font-mono">{teacher.password || '••••••'}</strong></span>
                        </span>
                        {teacher.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-[#86efac]" />
                            <span dir="ltr">{teacher.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleStartEdit(teacher)}
                      className="p-2 rounded-xl bg-[#064e3b] text-[#86efac] hover:text-[#fbbf24] border border-[#065f46] hover:border-[#fbbf24]/40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="تعديل حساب المعلم"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    {!isDefaultPrimary && (
                      <button
                        onClick={() => setDeleteConfirmId(teacher.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="حذف حساب المعلم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#064e3b] border border-red-500/50 rounded-[28px] p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">تأكيد حذف حساب المعلم</h3>
              <p className="text-xs text-[#86efac]/90 leading-relaxed">
                هل أنت متأكد من حذف هذا المعلم من الحلقة؟ لن يتمكن من تسجيل الدخول بعد الحذف.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#022c22] text-[#86efac] border border-[#065f46]"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer"
                >
                  نعم، احذف الحساب
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end border-t border-[#065f46]">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs sm:text-sm cursor-pointer shadow-lg transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
