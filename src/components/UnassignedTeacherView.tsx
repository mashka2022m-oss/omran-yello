import React, { useState } from 'react';
import {
  ShieldAlert,
  LogOut,
  RefreshCw,
  Clock,
  BookOpen,
  Info,
  Phone,
  CheckCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { AppSettings } from '../types';

interface UnassignedTeacherViewProps {
  teacherName: string;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  settings?: AppSettings;
}

export const UnassignedTeacherView: React.FC<UnassignedTeacherViewProps> = ({
  teacherName,
  onRefresh,
  onLogout,
  settings
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedOnce, setRefreshedOnce] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setRefreshedOnce(true);
      setTimeout(() => setRefreshedOnce(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-2xl bg-gradient-to-b from-[#064e3b] to-[#022c22] border-2 border-amber-500/40 rounded-[32px] p-6 sm:p-10 shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Warning Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#022c22] flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.35)] border-2 border-amber-300">
              <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-[#022c22] border border-amber-400 flex items-center justify-center text-amber-400 shadow-md">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Header Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تنبيه إداري للحساب</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
            لم يتم تعيينك في حلقة بعد
          </h2>
          <p className="text-sm sm:text-base text-amber-200/90 max-w-lg mx-auto leading-relaxed">
            أهلاً وسهلاً بك فضيلة الشيخ <span className="text-[#fbbf24] font-bold">{teacherName}</span> في مجمع الحلقات القرآنية المباركة.
          </p>
        </div>

        {/* Explanatory Card */}
        <div className="bg-[#022c22]/80 border border-[#065f46] rounded-2xl p-5 text-right space-y-3 shadow-inner">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed space-y-2">
              <p>
                تم التحقق من بيانات دخولك بنجاح، لكن حسابك لم يُسنَد إليه أي حلقة قرآنية حتى الآن في قاعدة البيانات السحابية.
              </p>
              <p className="text-xs text-[#86efac]">
                يُرجى من فضيلتكم التواصل مع المشرف على المجمع القرآني أو إدارة الحلقات لربط حسابك بالحلقة أو الحلقات المخصصة لك، حتى تتمكن من:
              </p>
              <ul className="text-xs text-slate-300 space-y-1 pr-4 list-disc marker:text-amber-400">
                <li>استعراض قائمة طلاب حلقتك وبياناتهم</li>
                <li>رصد الحضور والغياب اليومي والتسميع</li>
                <li>إرسال تقارير الحفظ والواتساب لأولياء الأمور</li>
                <li>متابعة خطط الحفظ والمراجعة وسجل الانضباط والسلوك</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)] cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'جارٍ التحقق والمزامنة...' : 'تحديث والتحقق من التعيين'}</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#022c22] hover:bg-white/10 border border-[#065f46] hover:border-red-400 text-slate-200 hover:text-red-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {refreshedOnce && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500/20 text-[#86efac] text-xs border border-emerald-500/30 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-[#86efac]" />
            <span>تم التحقق من قاعدة البيانات، لم يتم تعيينك بحلقة بعد. يرجى مراجعة المشرف.</span>
          </div>
        )}

        {/* Global Footer Indicator */}
        <div className="pt-3 border-t border-[#065f46]/40 flex items-center justify-center">
          <span className="text-[11px] text-[#fbbf24] bg-[#064e3b]/60 px-3.5 py-1 rounded-full border border-amber-400/30 font-bold">
            مشغل بواسطة منصة عمران
          </span>
        </div>
      </div>
    </div>
  );
};
