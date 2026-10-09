import React, { useState } from 'react';
import {
  User,
  Lock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  Save,
  KeyRound,
  Copy,
  Check,
  QrCode,
  Sparkles
} from 'lucide-react';
import {
  TeacherAccount,
  Student,
  getFourPartNameValidation,
  isTeacherDeveloper,
  isTeacherSupervisor,
  getTeacherSixDigitCode
} from '../types';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeacher: TeacherAccount;
  allTeachers: TeacherAccount[];
  allStudents: Student[];
  onSaveTeacherAccount: (updatedTeacher: TeacherAccount) => Promise<void>;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  currentTeacher,
  allTeachers,
  allStudents,
  onSaveTeacherAccount
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(currentTeacher.name || '');
  const [username, setUsername] = useState(currentTeacher.username || '');
  const [password, setPassword] = useState(currentTeacher.password || '');
  const [confirmPassword, setConfirmPassword] = useState(currentTeacher.password || '');
  const [phone, setPhone] = useState(currentTeacher.phone || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const teacherCode = currentTeacher.teacherCode || getTeacherSixDigitCode(currentTeacher);

  const handleCopyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(teacherCode);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const normalizeText = (text: string) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .replace(/\s+/g, ' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = name.trim();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة (الاسم، اسم المستخدم، وكلمة المرور).');
      return;
    }

    const targetRoleLabel: 'معلم' | 'مشرف' = isTeacherSupervisor(currentTeacher) ? 'مشرف' : 'معلم';

    // 1. Strict 4-part name validation
    const nameVal = getFourPartNameValidation(cleanName, targetRoleLabel);
    if (!nameVal.isValid) {
      setErrorMsg(nameVal.message || 'يلزم كتابة الاسم الرباعي كاملاً (الاسم، اسم الأب، اسم الجد، واسم العائلة).');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setErrorMsg('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
      return;
    }

    const normName = normalizeText(cleanName);
    const normUser = cleanUser.toLowerCase();

    // 2. Duplicate Username Check against other teachers
    const duplicateUser = allTeachers.find(
      t => t.id !== currentTeacher.id && (t.username || '').trim().toLowerCase() === normUser
    );
    if (duplicateUser) {
      setErrorMsg(`اسم المستخدم (${cleanUser}) مستخدم بالفعل من قبل حساب آخر. يرجى اختيار اسم مستخدم مختلف.`);
      return;
    }

    // 3. Duplicate Full Name Check against other teachers
    const duplicateTeacherName = allTeachers.find(
      t => t.id !== currentTeacher.id && normalizeText(t.name) === normName
    );
    if (duplicateTeacherName) {
      setErrorMsg(`عذراً، هذا الاسم (${cleanName}) مسجل مسبقاً لمعلم أو مشرف آخر في المنظومة! يرجى كتابة الاسم الرباعي كاملاً وبشكل دقيق لتمييز الحساب.`);
      return;
    }

    // 4. Duplicate Full Name Check against students
    const duplicateStudentName = allStudents.find(
      s => normalizeText(s.name) === normName
    );
    if (duplicateStudentName) {
      setErrorMsg(`عذراً، هذا الاسم (${cleanName}) مطابق لاسم طالب مسجل في الحلقات! يرجى كتابة الاسم الرباعي المعتمد كاملاً منعاً لتداخل الصلاحيات.`);
      return;
    }

    setIsSaving(true);
    try {
      const updated: TeacherAccount = {
        ...currentTeacher,
        name: cleanName,
        username: cleanUser,
        password: cleanPass,
        phone: phone.trim()
      };

      await onSaveTeacherAccount(updated);
      setSuccessMsg('تم حفظ وتحديث بيانات حسابك بنجاح!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تحديث بيانات الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  const targetRoleLabel: 'معلم' | 'مشرف' = isTeacherSupervisor(currentTeacher) ? 'مشرف' : 'معلم';
  const nameVal = getFourPartNameValidation(name, targetRoleLabel);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#064e3b] border-2 border-[#fbbf24]/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/90 text-right relative my-auto animate-in fade-in duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="إغلاق النافذة"
        >
          <X className="w-5 h-5 text-amber-300" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-[#065f46]">
          <div className="w-12 h-12 rounded-2xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-heading">
              تعديل بيانات الحساب
            </h3>
            <p className="text-xs text-[#86efac]/90">
              {isTeacherDeveloper(currentTeacher)
                ? 'حساب المعلم والمشرف والمبرمج'
                : isTeacherSupervisor(currentTeacher)
                ? 'حساب المعلم المشرف'
                : 'حساب المعلم المحفّظ'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#fbbf24] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Unique 6-Digit Teacher Code Card */}
        <div className="mb-5 p-4 rounded-2xl bg-[#011a14] border-2 border-amber-400/50 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-[#fbbf24] border border-amber-400/40 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#86efac]">الرمز الفريد للمعلم (6 أرقام):</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-bold">
                  للإلحاق بالحلقات
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-widest text-[#fbbf24] mt-0.5" dir="ltr">
                {teacherCode}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                * شارك هذا الرمز مع المشرف لإضافتك إلى مجمعات أو حلقات أخرى بسهولة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-stretch sm:self-auto justify-center shadow-md ${
              isCopied
                ? 'bg-emerald-500 text-white font-black'
                : 'bg-[#064e3b] hover:bg-[#065f46] text-[#fbbf24] border border-amber-400/40'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>تم نسخ الرمز!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#fbbf24]" />
                <span>نسخ الرمز</span>
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full 4-Part Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#86efac]">
                الاسم الرباعي الكامل <span className="text-red-400">* (إلزامي 4 أسماء)</span>
              </label>
              {name.trim().length > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    nameVal.isValid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {nameVal.isValid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>رباعي معتمد</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>{nameVal.partsCount}/4 أسماء</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: محمد عبد الله بن أحمد المنصور"
                className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] rounded-2xl py-2.5 px-3.5 pr-10 text-sm text-[#f0f9f6] outline-none"
                dir="rtl"
              />
              <User className="w-4 h-4 text-[#fbbf24] absolute right-3.5 top-3.5" />
            </div>
            <p className="text-[10px] text-[#86efac]/70 mt-1">
              * يشترط كتابة الاسم الرباعي كاملاً لتجنب أي تطابق في الأسماء عبر المنظومة.
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-[#86efac] mb-1.5">
              اسم المستخدم للدخول <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] rounded-2xl py-2.5 px-3.5 pr-10 text-sm text-[#f0f9f6] outline-none"
                dir="ltr"
              />
              <ShieldCheck className="w-4 h-4 text-[#fbbf24] absolute right-3.5 top-3.5" />
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#86efac] mb-1.5">
                كلمة المرور الجديدة <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] rounded-2xl py-2.5 px-3.5 pr-10 text-sm text-[#f0f9f6] outline-none"
                  dir="rtl"
                />
                <KeyRound className="w-4 h-4 text-[#fbbf24] absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#86efac] mb-1.5">
                تأكيد كلمة المرور <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] rounded-2xl py-2.5 px-3.5 pr-10 text-sm text-[#f0f9f6] outline-none"
                  dir="rtl"
                />
                <Lock className="w-4 h-4 text-[#fbbf24] absolute right-3.5 top-3.5" />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#86efac] mb-1.5">
              رقم الهاتف / الواتساب
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] rounded-2xl py-2.5 px-3.5 pr-10 text-sm text-[#f0f9f6] outline-none"
                dir="ltr"
              />
              <Phone className="w-4 h-4 text-[#fbbf24] absolute right-3.5 top-3.5" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#065f46]">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-50 text-[#064e3b] font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isSaving ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-2xl bg-[#022c22] hover:bg-[#022c22]/70 text-[#86efac] border border-[#065f46] text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
