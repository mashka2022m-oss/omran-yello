import React from 'react';
import {
  BookOpen,
  LogOut,
  UserCheck,
  Calendar,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Moon,
  Clock,
  Users,
  Settings,
  Layers,
  ChevronDown,
  Building2,
  Workflow,
  CheckCircle,
  X,
  UserCog
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, AppSettings, Halaqah, QuranComplex, TeacherAccount } from '../types';

interface NavbarProps {
  currentUser: { username: string; role: UserRole; studentId?: string } | null;
  currentTeacher?: TeacherAccount | null;
  onLinkGoogleTeacher?: () => Promise<void>;
  onUnlinkGoogleTeacher?: () => Promise<void>;
  isLinkingGoogleTeacher?: boolean;
  onLogout: () => void;
  settings: AppSettings;
  studentsCount: number;
  teachersCount?: number;
  complexesCount?: number;
  complexName?: string;
  activeComplex?: QuranComplex | null;
  availableComplexes?: QuranComplex[];
  activeComplexId?: string;
  onSwitchComplex?: (complexId: string) => void;
  onOpenMultiComplexModal?: () => void;
  canSwitchComplex?: boolean;
  halaqahs?: Halaqah[];
  assignedHalaqahs?: Halaqah[];
  isSupervisor?: boolean;
  isDeveloper?: boolean;
  activeHalaqahId?: string;
  onSwitchHalaqah?: (halaqahId: string) => void;
  onOpenTeacherManagement?: () => void;
  onOpenSettings?: () => void;
  onOpenComplexManagement?: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenEditAccount?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTeacher,
  onLinkGoogleTeacher,
  onUnlinkGoogleTeacher,
  isLinkingGoogleTeacher = false,
  onLogout,
  settings,
  studentsCount,
  teachersCount = 1,
  complexesCount = 1,
  complexName,
  activeComplex,
  availableComplexes = [],
  activeComplexId,
  onSwitchComplex,
  onOpenMultiComplexModal,
  canSwitchComplex = false,
  halaqahs = [],
  assignedHalaqahs = [],
  isSupervisor = false,
  isDeveloper = false,
  activeHalaqahId,
  onSwitchHalaqah,
  onOpenTeacherManagement,
  onOpenSettings,
  onOpenComplexManagement,
  onOpenPrivacyPolicy,
  onOpenEditAccount
}) => {
  const effectiveLogoUrl = (activeComplex?.logoUrl || settings?.themeLogoUrl || '').trim();
  const [logoImgFailed, setLogoImgFailed] = React.useState(false);

  React.useEffect(() => {
    setLogoImgFailed(false);
  }, [effectiveLogoUrl]);

  const todayArabic = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  // Determine which halaqahs can be selected by this user
  const selectableHalaqahs = isSupervisor ? halaqahs : assignedHalaqahs;
  const currentHalaqah = halaqahs.find(h => h.id === activeHalaqahId) || selectableHalaqahs[0] || halaqahs[0];
  const displayHalaqahName = currentHalaqah ? currentHalaqah.name : settings.halaqahName;
  const displayComplexName = activeComplex?.name || complexName || settings.complexName || 'مجمع تحفيظ القرآن الكريم';
  const complexInitial = displayComplexName.replace(/^(مجمع|مراكز|حلقات|جمعية)\s+/i, '').trim().charAt(0) || 'ق';

  return (
    <header
      className="sticky top-0 z-30 bg-[#1b2e35]/95 backdrop-blur-xl border-b-4 border-b-[#16262e] border-[#2b4550] px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 shadow-xl transition-all w-full max-w-full overflow-hidden"
      style={activeComplex?.theme ? {
        backgroundColor: activeComplex.theme.secondaryColor ? `${activeComplex.theme.secondaryColor}f2` : undefined,
        borderColor: activeComplex.theme.primaryColor || undefined
      } : undefined}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2 w-full max-w-full overflow-hidden">
        {/* ROW 1: Brand (Logo + Complex Name) & Quick User Actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Brand & Logo: Complex Name and Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div
              className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shadow-lg border-2 border-[#2b4550] border-b-4 border-b-[#16262e] overflow-hidden shrink-0 transition-transform duration-200 hover:scale-105"
              style={activeComplex?.theme ? {
                backgroundColor: activeComplex.theme.cardColor || activeComplex.theme.secondaryColor,
                borderColor: activeComplex.theme.accentColor ? `${activeComplex.theme.accentColor}99` : '#ffc800',
                color: activeComplex.theme.accentColor || '#ffc800'
              } : {
                backgroundColor: '#203843',
                borderColor: '#2b4550',
                color: '#ffc800'
              }}
            >
              {effectiveLogoUrl && !logoImgFailed ? (
                <img
                  src={effectiveLogoUrl}
                  alt={displayComplexName}
                  onError={() => setLogoImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="relative flex flex-col items-center justify-center w-full h-full p-1 shadow-inner bg-[#203843]"
                >
                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#131f24] border border-[#ffc800]/40 shadow-inner">
                    <span
                      className="font-black text-xs sm:text-sm tracking-tight leading-none drop-shadow-sm font-heading text-[#ffc800]"
                    >
                      {complexInitial}
                    </span>
                  </div>
                  <span
                    className="text-[7px] sm:text-[7.5px] font-bold tracking-tight mt-0.5 text-slate-300"
                  >
                    مجمع
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="text-sm sm:text-base lg:text-lg font-black font-heading tracking-tight text-white truncate"
                title={displayComplexName}
              >
                {displayComplexName}
              </h1>
              <p className="text-[10px] sm:text-xs text-[#ffd233] font-bold truncate hidden sm:block">
                {settings.complexName ? 'منظومة إدارة المجمعات القرآنية' : 'مجمع تحفيظ القرآن الكريم'}
              </p>
            </div>
          </div>

          {/* Right User & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Top Complexes Button */}
            {currentUser?.role === 'admin' && isDeveloper && onOpenComplexManagement && (
              <button
                onClick={onOpenComplexManagement}
                title="إدارة المجمعات القرآنية وتوزيع الحلقات"
                className="flex items-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-2xl bg-[#ffc800] hover:bg-[#ffd233] text-[#131f24] text-xs font-black border-b-4 border-[#e5a500] active:translate-y-[2px] active:border-b-2 shadow-sm transition-all cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#131f24]" />
                <span className="hidden xs:inline">المجمعات</span>
                {complexesCount !== undefined && (
                  <span
                    className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-[#131f24] text-[#ffc800]"
                  >
                    {complexesCount}
                  </span>
                )}
              </button>
            )}

            {/* Quranic AI Assistant Button */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('omran:open_ai_assistant'))}
                title="المساعد القرآني الذكي (AI) - انقر لفتح المحادثة والتقارير والشهادات"
                className="flex items-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-2xl bg-[#1cb0f6] hover:bg-[#2bc2ff] text-white text-xs font-black border-b-4 border-[#1899d6] active:translate-y-[2px] active:border-b-2 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse" />
                <span className="hidden xs:inline">المساعد الذكي</span>
              </button>
            )}

            {/* Top Settings Button */}
            {currentUser?.role === 'admin' && isSupervisor && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="إعدادات الحلقات والمعلمين ونقل الطلاب وتخصيص هوية وثيم المجمع"
                className="flex items-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-2xl bg-[#ffc800] hover:bg-[#ffd233] text-[#131f24] text-xs font-black border-b-4 border-[#e5a500] active:translate-y-[2px] active:border-b-2 shadow-sm transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#131f24]" />
                <span className="hidden sm:inline">الإعدادات</span>
              </button>
            )}

            {currentUser?.role === 'admin' && isSupervisor && !onOpenSettings && onOpenTeacherManagement && (
              <button
                onClick={onOpenTeacherManagement}
                title="إدارة حسابات المعلمين"
                className="flex items-center gap-1.5 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-2xl bg-[#203843] hover:bg-[#2b4550] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] text-xs font-black text-white shadow-sm transition-all cursor-pointer active:translate-y-[2px] active:border-b-2"
              >
                <Users className="w-3.5 h-3.5 text-[#ffc800]" />
                <span className="hidden sm:inline">إدارة المعلمين</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-[#131f24] text-[#ffd233]">
                  {teachersCount}
                </span>
              </button>
            )}

            {/* Google Account Linking for Teachers and Supervisors */}
            {currentUser?.role === 'admin' && currentTeacher && (
              <div className="flex items-center">
                {currentTeacher.isGoogleLinked && currentTeacher.googleEmail ? (
                  <div
                    className="flex items-center gap-1 sm:gap-1.5 py-1.5 px-2.5 rounded-2xl bg-[#203843] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] text-xs shadow-sm"
                    title={`حساب Google المرتبط: ${currentTeacher.googleEmail}`}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="text-[11px] font-bold text-slate-200 hidden md:inline">
                      مربوط بـ Google
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-[#ffc800] shrink-0" />
                    {onUnlinkGoogleTeacher && (
                      <button
                        type="button"
                        onClick={onUnlinkGoogleTeacher}
                        title="إلغاء ربط حساب Google"
                        className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer mr-0.5"
                      >
                        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  onLinkGoogleTeacher && (
                    <button
                      type="button"
                      onClick={onLinkGoogleTeacher}
                      disabled={isLinkingGoogleTeacher}
                      title="ربط حسابك الحالي بحساب Google لتسجيل الدخول السريع لاحقاً"
                      className="flex items-center gap-1 sm:gap-1.5 py-1.5 px-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-black border-b-4 border-slate-300 active:translate-y-[2px] active:border-b-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="font-heading font-extrabold text-slate-800 hidden xs:inline">
                        {isLinkingGoogleTeacher ? 'جاري الربط...' : 'ربط Google'}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

            {/* Privacy Policy Quick In-App Button */}
            {onOpenPrivacyPolicy && (
              <button
                onClick={onOpenPrivacyPolicy}
                title="سياسة الخصوصية وحماية البيانات (Privacy Policy)"
                className="p-2 rounded-2xl bg-[#203843] hover:bg-[#2b4550] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm flex items-center gap-1 active:translate-y-[2px] active:border-b-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#ffc800]" />
                <span className="hidden xl:inline text-xs font-bold">الخصوصية</span>
              </button>
            )}

            {currentUser && (
              <div
                className="flex items-center gap-1.5 sm:gap-2 bg-[#203843] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] rounded-2xl px-2.5 sm:px-3 py-1.5 shadow-sm shrink-0"
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#ffc800] text-[#131f24] flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-sm"
                >
                  {currentUser.username.charAt(0)}
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    {currentUser.username}
                  </div>
                  <div className="text-[9px] text-[#ffd233] font-bold">
                    {currentUser.role === 'admin' ? (isDeveloper ? 'معلم ومشرف ومبرمج' : isSupervisor ? 'المعلم المشرف' : 'معلم') : 'طالب'}
                  </div>
                </div>

                {/* Edit Account Button */}
                {currentUser.role === 'admin' && onOpenEditAccount && (
                  <button
                    type="button"
                    onClick={onOpenEditAccount}
                    title="تعديل بيانات الحساب (اسم المستخدم، كلمة المرور، والاسم الرباعي)"
                    className="p-1 sm:p-1.5 text-[#ffc800] hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-bold"
                  >
                    <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden lg:inline">الحساب</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="p-1 sm:p-1.5 text-slate-300 hover:text-red-400 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Smooth Horizontal Slider for Complex & Halaqah Selectors and Quick Info */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none slider-horizontal py-1 px-0.5 w-full border-t border-[#2b4550]/60 shrink-0">
          {/* Complex Switcher / Badge */}
          {canSwitchComplex && availableComplexes.length > 1 && onSwitchComplex ? (
            <div
              className="flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 shadow-sm transition-all border-2 border-[#2b4550] border-b-4 border-b-[#16262e] bg-[#203843] hover:bg-[#2b4550] shrink-0"
            >
              <Building2
                className="w-3.5 h-3.5 text-[#ffc800] shrink-0"
              />
              <select
                value={activeComplexId || availableComplexes[0]?.id || ''}
                onChange={e => onSwitchComplex(e.target.value)}
                className="text-xs text-white font-black bg-transparent border-none focus:outline-none cursor-pointer pr-1 max-w-[160px] sm:max-w-xs truncate"
                title={isDeveloper ? "التبديل بين كافة المجمعات القرآنية (إشراف شامل للمبرمج)" : "التبديل بين المجمعات المرتبط بها"}
              >
                {availableComplexes.map(c => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="bg-[#203843] text-white py-1"
                  >
                    {c.name}{isDeveloper ? (c.databaseConfig?.isCustom ? ` ⚡ [مستقل: ${c.databaseConfig.projectId}]` : ' (المركزية)') : ''}
                  </option>
                ))}
              </select>
              {onOpenMultiComplexModal && (
                <button
                  type="button"
                  onClick={onOpenMultiComplexModal}
                  title="عرض بطاقات المجمعات والحلقات التابعة لك"
                  className="p-1 rounded-lg hover:bg-white/15 text-[#ffc800] hover:text-white transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : null}

          {/* Halaqah selector / label */}
          {currentUser?.role === 'admin' && (
            <div className="shrink-0">
              {isSupervisor ? (
                halaqahs.length > 0 && onSwitchHalaqah ? (
                  <div className="flex items-center gap-1.5 bg-[#203843] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] rounded-2xl px-2.5 py-1 shadow-sm">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc800] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffc800]" />
                    </span>
                    <span className="text-[10px] text-[#ffd233] font-black hidden sm:inline shrink-0">مساحة الحلقة:</span>
                    <select
                      value={activeHalaqahId || 'all'}
                      onChange={e => onSwitchHalaqah(e.target.value)}
                      className="text-xs text-white font-bold bg-transparent border-none cursor-pointer focus:outline-none max-w-[150px] sm:max-w-[210px] truncate"
                      title="التبديل بين حلقات العمل"
                    >
                      <option value="all" className="bg-[#203843] text-white">
                        {isDeveloper ? 'جميع الحلقات لكافة المجمعات' : `جميع حلقات ${complexName || 'المجمع'}`} ({studentsCount} طالب)
                      </option>
                      {halaqahs.map(h => (
                        <option key={h.id} value={h.id} className="bg-[#203843] text-white">
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 font-bold px-2.5 py-1 bg-[#203843] rounded-2xl border-2 border-[#2b4550] border-b-4 border-b-[#16262e]">
                    {displayHalaqahName}
                  </p>
                )
              ) : (
                assignedHalaqahs.length > 1 && onSwitchHalaqah ? (
                  <div className="flex items-center gap-1.5 bg-[#203843] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] rounded-2xl px-2.5 py-1 shadow-sm">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc800] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffc800]" />
                    </span>
                    <span className="text-[10px] text-[#ffd233] font-black hidden sm:inline shrink-0">الحلقة:</span>
                    <select
                      value={activeHalaqahId || assignedHalaqahs[0]?.id || ''}
                      onChange={e => onSwitchHalaqah(e.target.value)}
                      className="text-xs text-white font-bold bg-transparent border-none cursor-pointer focus:outline-none max-w-[170px] sm:max-w-[240px] truncate"
                      title="التبديل بين مساحات حلقاتك المخصصة"
                    >
                      {assignedHalaqahs.map(h => (
                        <option key={h.id} value={h.id} className="bg-[#203843] text-white">
                          {h.name} {h.complexName ? `(${h.complexName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : assignedHalaqahs.length === 1 ? (
                  <div className="inline-flex items-center gap-1.5 text-xs text-white font-bold bg-[#203843] px-2.5 py-1 rounded-2xl border-2 border-[#2b4550] border-b-4 border-b-[#16262e] shadow-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffc800] shrink-0" />
                    <span className="text-[#ffd233] font-black shrink-0">الحلقة:</span>
                    <span className="truncate max-w-[160px] sm:max-w-none">
                      {assignedHalaqahs[0].name} {assignedHalaqahs[0].complexName ? `(${assignedHalaqahs[0].complexName})` : ''}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-amber-300 font-bold bg-[#203843] border-2 border-amber-500/40 px-2.5 py-1 rounded-2xl shrink-0">
                    لم يتم تعيينك في حلقة بعد
                  </span>
                )
              )}
            </div>
          )}

          {/* Student count pill */}
          {currentUser?.role === 'admin' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl bg-[#203843] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] text-xs text-[#ffc800] font-black shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{studentsCount} طالباً</span>
            </div>
          )}

          {/* Date pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl bg-[#203843] border-2 border-[#2b4550] border-b-4 border-b-[#16262e] text-xs text-slate-300 font-bold shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#ffc800]" />
            <span className="truncate">{todayArabic}</span>
          </div>

          {/* Database indicator badge */}
          {isDeveloper && (
            activeComplex?.databaseConfig?.isCustom ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-[10px] font-black bg-[#203843] text-[#ffc800] border-2 border-[#ffc800]/50 border-b-4 border-b-[#e5a500] shadow-sm shrink-0"
                title={`المجمع متصل ومستقل 100% بمشروع فايربيس: ${activeComplex.databaseConfig.projectId}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc800] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffc800]" />
                </span>
                <span>قاعدة: {activeComplex.databaseConfig.projectId}</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-[10px] font-bold bg-[#203843] text-slate-300 border-2 border-[#2b4550] border-b-4 border-b-[#16262e] shrink-0"
                title="متصل بالقاعدة المركزية المشتركة للمنظومة"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffc800]" />
                <span>القاعدة المركزية</span>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
};
