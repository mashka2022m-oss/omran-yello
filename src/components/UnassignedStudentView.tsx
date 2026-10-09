import React, { useState } from 'react';
import {
  ShieldAlert,
  LogOut,
  RefreshCw,
  Clock,
  BookOpen,
  Info,
  CheckCircle,
  Sparkles,
  Phone,
  UserCheck,
  Award
} from 'lucide-react';
import { AppSettings } from '../types';

interface UnassignedStudentViewProps {
  studentName: string;
  studentPhone?: string;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  settings?: AppSettings;
}

export const UnassignedStudentView: React.FC<UnassignedStudentViewProps> = ({
  studentName,
  studentPhone,
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
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-2xl bg-gradient-to-b from-[#064e3b] to-[#022c22] border-2 border-amber-500/40 rounded-[32px] p-6 sm:p-10 shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Warning / Badge Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#064e3b] flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.35)] border-2 border-amber-300">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-[#022c22] border border-amber-400 flex items-center justify-center text-amber-400 shadow-md">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Header Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>حساب طالب / ولي أمر — قيد التعيين والإرفاق</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
            لم يتم إرفاقك في حلقة قرآنية بعد
          </h2>
          <p className="text-sm sm:text-base text-amber-200/90 max-w-lg mx-auto leading-relaxed font-medium">
            أهلاً بك يا بطل القرآن <span className="text-[#fbbf24] font-bold">{studentName}</span> في مجمع الحلقات القرآنية المباركة.
          </p>
        </div>

        {/* Explanatory Card */}
        <div className="bg-[#022c22]/85 border border-[#065f46] rounded-2xl p-5 text-right space-y-3.5 shadow-inner">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-emerald-100/95 leading-relaxed space-y-2.5">
              <p>
                تم تسجيل وتوثيق بياناتك في المنظومة بنجاح، ولكن لم يتم إرفاق حسابك حتى الآن بإحدى الحلقات القرآنية من قِبل إدارة الحلقات والمشرف المسؤول <span className="text-[#fbbf24] font-bold">({settings?.teacherName || 'المعلم المشرف'})</span>.
              </p>
              <div className="bg-[#064e3b]/60 p-3 rounded-xl border border-[#065f46] text-xs text-[#86efac] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#fbbf24] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">الخطوة المطلوبة:</span> يرجى من ولي الأمر أو الطالب إشعار مشرف المسجد أو إدارة الحلقات لتعيين الحلقة المناسبة لمستوى الطالب وسنه.
                </div>
              </div>
              <p className="text-xs text-[#86efac] font-semibold pt-1">
                بمجرد إرفاقك بالحلقة القرآنية، سيتم تفعيل بوابتك السحابية فوراً لتتمكن من:
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pr-4 list-disc marker:text-amber-400">
                <li>متابعة ورد الحفظ والمراجعة اليومي وخطة المساعد الذكي</li>
                <li>رصد درجات التسميع وأحكام التجويد وملاحظات المعلم اليومية</li>
                <li>متابعة سجل الحضور والغياب وأوسمة ونقاط التفوق</li>
                <li>استلام رسائل الواتساب والتواصل الدوري مع معلم الحلقة</li>
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
            <span>{isRefreshing ? 'جارٍ التحقق والمزامنة السحابية...' : 'التحقق والمزامنة السحابية الآن'}</span>
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 text-xs border border-amber-500/30 animate-fade-in">
            <Clock className="w-4 h-4 text-amber-300" />
            <span>تم التحقق من قاعدة البيانات: لا زال الحساب في انتظار إرفاقه بحلقة. يرجى مراجعة إدارة الحلقات.</span>
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
