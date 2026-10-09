import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
  Users,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  X,
  ExternalLink,
  Check
} from 'lucide-react';
import { QuranComplex, Halaqah, TeacherAccount, Student, isTeacherSupervisor } from '../types';

interface TeacherMultiComplexModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherAccount | null;
  teacherName: string;
  complexes: QuranComplex[];
  activeComplexId: string;
  onSelectComplex: (complexId: string) => void;
  halaqahs: Halaqah[];
  allTeachers: TeacherAccount[];
  students: Student[];
  isNewlyAdded?: boolean;
  newlyAddedComplexName?: string | null;
}

export const TeacherMultiComplexModal: React.FC<TeacherMultiComplexModalProps> = ({
  isOpen,
  onClose,
  teacher,
  teacherName,
  complexes,
  activeComplexId,
  onSelectComplex,
  halaqahs,
  allTeachers,
  students,
  isNewlyAdded = false,
  newlyAddedComplexName
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain && teacher) {
      try {
        localStorage.setItem(`omran_skip_complex_welcome_${teacher.id || teacher.username}`, 'true');
      } catch (e) {
        // ignore storage error
      }
    }
    onClose();
  };

  const handleSelectAndClose = (complexId: string) => {
    onSelectComplex(complexId);
    if (dontShowAgain && teacher) {
      try {
        localStorage.setItem(`omran_skip_complex_welcome_${teacher.id || teacher.username}`, 'true');
      } catch (e) {
        // ignore storage error
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#064e3b] via-[#043e2f] to-[#022c22] border-2 border-[#fbbf24]/50 rounded-3xl shadow-[0_0_50px_rgba(251,191,36,0.25)] text-slate-100 overflow-hidden my-auto">
        
        {/* Top Gold Accent Ribbon */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-sm" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-black/20 hover:bg-black/40 text-emerald-200 hover:text-white transition-colors cursor-pointer"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header Banner */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-amber-600 text-[#064e3b] flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 border border-amber-300/40">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/40 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isNewlyAdded ? 'تنبيه إضافة جديدة!' : 'تعدد المجمعات والحلقات'}
                </span>
                {newlyAddedComplexName && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    مُضاف حديثاً إلى: {newlyAddedComplexName}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-white mt-1.5 flex items-center gap-2">
                {isNewlyAdded ? 'تمت إضافتك في مجمّع قرآني آخر!' : 'أهلاً بك! أنت مسجّل في عدة مجمعات قرآنية'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 leading-relaxed">
                فضيلة الشيخ <span className="text-[#fbbf24] font-bold">{teacherName}</span>، حسابك مرتبط بأكثر من مجمع وحلقة. اختر المجمع الذي ترغب في إدارته والعمل عليه الآن، ويمكنك التبديل بينهم بكل سهولة في أي وقت:
              </p>
            </div>
          </div>

          {/* Complexes List Cards */}
          <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
            {complexes.map((comp) => {
              const isCurrent = comp.id === activeComplexId;
              const isNewlyAddedItem = comp.name === newlyAddedComplexName;

              // Check if teacher is supervisor of this complex
              const isSupervisorThis =
                (comp.supervisorTeacherId && (comp.supervisorTeacherId === teacher?.id)) ||
                (comp.supervisorTeacherName && teacher?.name && comp.supervisorTeacherName.trim().length > 3 && comp.supervisorTeacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()) ||
                (teacher?.role === 'developer');

              // Halaqahs in this complex belonging to teacher
              const complexHalaqahs = halaqahs.filter(h => (h.complexId || complexes[0]?.id) === comp.id);
              const teacherHalaqahs = isSupervisorThis
                ? complexHalaqahs
                : complexHalaqahs.filter(h => {
                    if (h.teacherIds?.includes(teacher?.id || '')) return true;
                    if (h.primaryTeacherName && teacher?.name && h.primaryTeacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()) return true;
                    if (h.teacherNames && teacher?.name && h.teacherNames.some(tn => tn.trim().toLowerCase() === teacher.name.trim().toLowerCase())) return true;
                    return false;
                  });

              // Student count in these halaqahs
              const halaqahIdSet = new Set(teacherHalaqahs.map(h => h.id));
              const complexStudentCount = students.filter(s => s.halaqahId && halaqahIdSet.has(s.halaqahId)).length;

              return (
                <div
                  key={comp.id}
                  onClick={() => handleSelectAndClose(comp.id)}
                  className={`group relative p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-emerald-900/60 border-[#fbbf24] shadow-lg shadow-amber-500/15 ring-2 ring-[#fbbf24]/20'
                      : 'bg-[#022c22]/80 border-[#065f46] hover:border-amber-400/70 hover:bg-[#043e2f]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      isCurrent
                        ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24]'
                        : 'bg-[#064e3b] text-[#86efac] border-[#065f46] group-hover:border-[#fbbf24]/50 group-hover:text-[#fbbf24]'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#fbbf24] transition-colors">
                          {comp.name}
                        </h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#fbbf24] text-[#064e3b] flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                            المجمع النشط حالياً
                          </span>
                        )}
                        {isNewlyAddedItem && !isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                            مضاف حديثاً
                          </span>
                        )}
                      </div>

                      {/* Role & Description */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-emerald-200/90 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-300/90">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {isSupervisorThis ? 'مشرف المجمع' : 'معلم حلقة'}
                        </span>
                        {comp.description && (
                          <>
                            <span className="text-emerald-700">•</span>
                            <span className="line-clamp-1">{comp.description}</span>
                          </>
                        )}
                      </div>

                      {/* Associated Halaqahs & Students */}
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-[#fbbf24]" />
                          الحلقات:
                        </span>
                        {teacherHalaqahs.length > 0 ? (
                          teacherHalaqahs.map(h => (
                            <span
                              key={h.id}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[#064e3b]/90 text-emerald-200 border border-[#065f46]"
                            >
                              {h.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-amber-300/80 italic">
                            جميع حلقات المجمع ({complexHalaqahs.length} حلقات)
                          </span>
                        )}

                        <span className="text-[11px] font-bold text-amber-300/90 mr-auto px-2 py-0.5 rounded-md bg-black/20 border border-amber-500/20 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {complexStudentCount} طالب
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Switch Action Button */}
                  <div className="shrink-0 flex sm:flex-col items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndClose(comp.id);
                      }}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                        isCurrent
                          ? 'bg-[#fbbf24] text-[#064e3b] hover:bg-yellow-400'
                          : 'bg-[#065f46] hover:bg-[#fbbf24] text-white hover:text-[#064e3b] border border-[#065f46] hover:border-[#fbbf24]'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>العمل هنا حالياً</span>
                        </>
                      ) : (
                        <>
                          <span>الانتقال والبدء</span>
                          <ChevronLeft className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Notice & Do Not Show Again */}
          <div className="mt-6 pt-4 border-t border-[#065f46] flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs text-emerald-200/90 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-[#065f46] text-[#fbbf24] focus:ring-0 focus:ring-offset-0 bg-[#022c22] cursor-pointer"
              />
              <span>تذكر اختياري وعدم إظهار هذه النافذة تلقائياً عند كل دخول</span>
            </label>

            <button
              onClick={handleClose}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
            >
              المتابعة مع المجمع الحالي
            </button>
          </div>

          {/* Helpful Navigation hint */}
          <p className="text-center text-[11px] text-emerald-300/70 mt-3 font-medium">
            يمكنك دائماً التبديل الفوري بين مجمعاتك في أي لحظة من شريط التنقل العلوي بجوار اسم المجمع.
          </p>
        </div>
      </div>
    </div>
  );
};
