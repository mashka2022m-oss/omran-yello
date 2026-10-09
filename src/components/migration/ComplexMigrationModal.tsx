import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRightLeft,
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Building2,
  Users,
  BookOpen,
  UserCheck,
  Award,
  FileText,
  ShieldAlert,
  LogIn,
  ExternalLink,
  Download,
  Trash2,
  Check,
  Copy,
  CheckCheck,
  RefreshCw,
  Layers,
  HardDrive,
  Key,
  Globe,
  Clock,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  QuranComplex,
  Student,
  Halaqah,
  TeacherAccount,
  AttendanceRecord,
  StudentEvaluation,
  BehaviorViolation,
  Exam,
  IssuedCertificate
} from '../../types';
import { OmranDataService, TARGET_FIRESTORE_DATABASE_ID } from '../../lib/firebase';
import { GoogleWorkspaceService } from '../../lib/googleWorkspace';

interface ComplexMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  complex: QuranComplex;
  allComplexes?: QuranComplex[];
  onComplexUpdated?: (updated: QuranComplex) => Promise<void> | void;
  onRefreshAllData?: () => Promise<void> | void;
}

interface MigrationStepInfo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  itemCount?: number;
}

export const ComplexMigrationModal: React.FC<ComplexMigrationModalProps> = ({
  isOpen,
  onClose,
  complex,
  allComplexes = [],
  onComplexUpdated,
  onRefreshAllData
}) => {
  // Active target complex
  const [selectedComplexId, setSelectedComplexId] = useState<string>(complex.id);
  const activeComplex = allComplexes.find(c => c.id === selectedComplexId) || complex;

  // Google Account & OAuth State
  const [googleAccount, setGoogleAccount] = useState<{
    email: string;
    name?: string;
    photoUrl?: string;
    accessToken?: string;
  } | null>(null);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Target Firebase Configuration
  const [targetProjectId, setTargetProjectId] = useState<string>(() => {
    const cleanId = activeComplex.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    return `omran-${cleanId || 'complex'}-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [targetDatabaseId, setTargetDatabaseId] = useState<string>('(default)');
  const [targetApiKey, setTargetApiKey] = useState<string>('');

  // Complex Stats Inspection
  const [isInspecting, setIsInspecting] = useState(false);
  const [complexStats, setComplexStats] = useState<{
    students: number;
    halaqahs: number;
    teachers: number;
    attendance: number;
    evaluations: number;
    violations: number;
    exams: number;
    certificates: number;
  }>({
    students: 0,
    halaqahs: 0,
    teachers: 0,
    attendance: 0,
    evaluations: 0,
    violations: 0,
    exams: 0,
    certificates: 0
  });

  // Migration Progress State
  const [migrationPhase, setMigrationPhase] = useState<'configure' | 'migrating' | 'completed' | 'error'>('configure');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Post-Migration Actions State
  const [isPurgingOld, setIsPurgingOld] = useState(false);
  const [oldPurged, setOldPurged] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [migrationReceipt, setMigrationReceipt] = useState<any>(null);

  // Pre-load current Google Account credentials if already linked
  useEffect(() => {
    if (!isOpen) return;
    const fetchExistingGoogle = async () => {
      try {
        const token = await GoogleWorkspaceService.getValidAccessToken();
        const email = localStorage.getItem('omran_google_account_email') ||
          activeComplex.databaseConfig?.connectedEmail ||
          'mohammedmonta2022m@gmail.com';
        if (email) {
          setGoogleAccount({
            email,
            accessToken: token || undefined
          });
        }
      } catch (err) {
        // silent fallback
      }
    };
    fetchExistingGoogle();
  }, [isOpen, activeComplex]);

  // Inspect and tally records for the selected complex
  useEffect(() => {
    if (!isOpen) return;
    const calculateStats = async () => {
      setIsInspecting(true);
      try {
        const [allStudents, allHalaqahs, allTeachers, allAttendance, allEvals, allViolations, allExams, allCerts] = await Promise.all([
          OmranDataService.loadStudents(),
          OmranDataService.loadHalaqahs(),
          OmranDataService.loadTeachers(),
          OmranDataService.loadAttendance(),
          OmranDataService.loadEvaluations(),
          OmranDataService.loadViolations(),
          OmranDataService.loadExams(),
          OmranDataService.loadCertificates()
        ]);

        const compHalaqahs = allHalaqahs.filter(h => h.complexId === activeComplex.id);
        const halaqahIds = new Set(compHalaqahs.map(h => h.id));

        const compStudents = allStudents.filter(s =>
          (s.complexId && s.complexId === activeComplex.id) ||
          (s.halaqahId && halaqahIds.has(s.halaqahId))
        );
        const studentIds = new Set(compStudents.map(s => s.id));

        const compTeachers = allTeachers.filter(t =>
          t.complexId === activeComplex.id ||
          (t.complexIds && t.complexIds.includes(activeComplex.id)) ||
          (t.halaqahIds && t.halaqahIds.some(hid => halaqahIds.has(hid)))
        );

        const compAttendance = allAttendance.filter(a => studentIds.has(a.studentId));
        const compEvals = allEvals.filter(e => studentIds.has(e.studentId));
        const compViolations = allViolations.filter(v => studentIds.has(v.studentId));
        const compExams = allExams.filter(ex => ex.complexId === activeComplex.id);
        const compCerts = allCerts.filter(c => c.complexId === activeComplex.id || studentIds.has(c.studentId));

        setComplexStats({
          students: compStudents.length,
          halaqahs: compHalaqahs.length,
          teachers: compTeachers.length,
          attendance: compAttendance.length,
          evaluations: compEvals.length,
          violations: compViolations.length,
          exams: compExams.length,
          certificates: compCerts.length
        });
      } catch (e) {
        console.warn('Inspect complex stats notice:', e);
      } finally {
        setIsInspecting(false);
      }
    };

    calculateStats();
  }, [isOpen, activeComplex]);

  // Migration Steps Definition
  const steps: MigrationStepInfo[] = [
    {
      id: 'step_inspect',
      title: 'فحص وتجميع بيانات المجمع السحابية',
      description: `استخراج ${complexStats.students} طالب، ${complexStats.halaqahs} حلقات، ${complexStats.teachers} معلمين وكافة السجلات التراكمية`,
      status: activeStepIndex > 0 ? 'completed' : activeStepIndex === 0 && migrationPhase === 'migrating' ? 'running' : 'pending'
    },
    {
      id: 'step_connect_firebase',
      title: 'الاتصال بحساب Google وتهيئة مشروع Firebase المستقل',
      description: `ربط الحساب (${googleAccount?.email || 'حساب Google المعتمد'}) وتجهيز قاعدة بيانات Firestore (${targetDatabaseId})`,
      status: activeStepIndex > 1 ? 'completed' : activeStepIndex === 1 ? 'running' : 'pending'
    },
    {
      id: 'step_write_complex',
      title: 'تأسيس وثيقة المجمع والهوية والإعدادات',
      description: `نقل اسم المجمع (${activeComplex.name})، الشعار، الختم، المشرف، والثيم الخاص`,
      status: activeStepIndex > 2 ? 'completed' : activeStepIndex === 2 ? 'running' : 'pending'
    },
    {
      id: 'step_migrate_halaqahs',
      title: 'نقل وترحيل الحلقات القرآنية والمشرفين',
      description: `إنشاء وتوثيق ${complexStats.halaqahs} حلقة قرآنية داخل القاعدة المنفصلة الجديدة`,
      status: activeStepIndex > 3 ? 'completed' : activeStepIndex === 3 ? 'running' : 'pending',
      itemCount: complexStats.halaqahs
    },
    {
      id: 'step_migrate_teachers',
      title: 'نقل وترحيل حسابات المعلمين وتوزيع الصلاحيات',
      description: `نقل ${complexStats.teachers} معلم ومشرف وربطهم بالحلقات القرآنية في القاعدة الجديدة`,
      status: activeStepIndex > 4 ? 'completed' : activeStepIndex === 4 ? 'running' : 'pending',
      itemCount: complexStats.teachers
    },
    {
      id: 'step_migrate_students',
      title: 'نقل وترحيل ملفات وسجلات الطلاب وأولياء الأمور',
      description: `نقل ${complexStats.students} طالب مع مواضع الحفظ والخطط التربوية وأرقام التواصل`,
      status: activeStepIndex > 5 ? 'completed' : activeStepIndex === 5 ? 'running' : 'pending',
      itemCount: complexStats.students
    },
    {
      id: 'step_migrate_attendance',
      title: 'نقل وترحيل كشوفات وسجلات الحضور والغياب',
      description: `ترحيل ${complexStats.attendance} سجل حضور وغياب تاريخي بجميع حالاته (حاضر، غائب، متأخر، معتذر)`,
      status: activeStepIndex > 6 ? 'completed' : activeStepIndex === 6 ? 'running' : 'pending',
      itemCount: complexStats.attendance
    },
    {
      id: 'step_migrate_evaluations',
      title: 'نقل وترحيل تقييمات التسميع والدرجات التراكمية',
      description: `نقل ${complexStats.evaluations} تقييم تسميع بالآيات ودرجات معايير الإتقان وملاحظات المشايخ`,
      status: activeStepIndex > 7 ? 'completed' : activeStepIndex === 7 ? 'running' : 'pending',
      itemCount: complexStats.evaluations
    },
    {
      id: 'step_migrate_exams_certs',
      title: 'نقل الاختبارات، الشهادات، والمخالفات السلوكية',
      description: `نقل ${complexStats.exams} اختبارات، ${complexStats.certificates} شهادة ممنوحة، و ${complexStats.violations} ملاحظة سلوكية`,
      status: activeStepIndex > 8 ? 'completed' : activeStepIndex === 8 ? 'running' : 'pending'
    },
    {
      id: 'step_finalize_separation',
      title: 'قفل الترحيل واعتماد قاعدة البيانات المنفصلة رسمياً',
      description: `تحديث إعدادات المجمع وتوثيق الاستقلال السحابي الكامل لقاعدة البيانات`,
      status: activeStepIndex >= 9 && migrationPhase === 'completed' ? 'completed' : activeStepIndex === 9 ? 'running' : 'pending'
    }
  ];

  // Handler to link Google Account interactively
  const handleLinkGoogleAccount = async () => {
    setIsLinkingGoogle(true);
    setGoogleError(null);
    try {
      const res = await GoogleWorkspaceService.linkGoogleAccount();
      setGoogleAccount({
        email: res.email,
        name: (res as any).name || undefined,
        photoUrl: (res as any).photoUrl || undefined,
        accessToken: res.accessToken
      });
      localStorage.setItem('omran_google_account_email', res.email);
    } catch (err: any) {
      setGoogleError(err?.message || 'تعذر تسجيل الدخول بحساب Google.');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  // Live Multi-Step Interactive Migration Execution
  const handleStartLiveMigration = async () => {
    if (!googleAccount?.email) {
      setGoogleError('يرجى اختيار أو تسجيل الدخول بحساب Google الذي تريد النقل إليه.');
      return;
    }

    setMigrationPhase('migrating');
    setProgressPercent(5);
    setActiveStepIndex(0);
    setErrorMessage(null);
    setStatusMessage('جارٍ فحص واستخراج بيانات المجمع وتحزيمها سحابياً...');

    try {
      const res = await OmranDataService.migrateComplexToDedicatedDatabase(
        {
          complexId: activeComplex.id,
          targetProjectId: targetProjectId.trim(),
          targetApiKey: targetApiKey.trim() || 'AIzaSyDEzjLSKGT89RkZk_r3PnWooCyuYok4pyc',
          targetGoogleEmail: googleAccount.email,
          targetDatabaseId: targetDatabaseId.trim() || '(default)'
        },
        (p) => {
          setProgressPercent(p.percent);
          setStatusMessage(p.detail || p.title);
        }
      );

      const isolatedConfig = {
        isCustom: true,
        projectId: targetProjectId.trim(),
        databaseId: targetDatabaseId.trim() || '(default)',
        apiKey: targetApiKey.trim() || 'AIzaSyDEzjLSKGT89RkZk_r3PnWooCyuYok4pyc',
        authDomain: `${targetProjectId.trim()}.firebaseapp.com`,
        storageBucket: `${targetProjectId.trim()}.firebasestorage.app`,
        connectedEmail: googleAccount.email,
        enabledAt: new Date().toISOString()
      };

      const updatedComplex: QuranComplex = {
        ...activeComplex,
        databaseConfig: isolatedConfig
      };

      if (onComplexUpdated) {
        await onComplexUpdated(updatedComplex);
      }
      if (onRefreshAllData) {
        await onRefreshAllData();
      }

      // Generate Migration Receipt Data
      const receipt = {
        version: '1.0.0-isolated',
        migrationType: 'google_account_firestore_separation',
        timestamp: new Date().toISOString(),
        complex: {
          id: activeComplex.id,
          name: activeComplex.name,
          supervisor: activeComplex.supervisorTeacherName
        },
        targetDatabase: isolatedConfig,
        stats: {
          ...complexStats,
          totalRecords: Object.values(complexStats).reduce((a: number, b: any) => a + Number(b || 0), 0)
        },
        googleAccount: {
          email: googleAccount.email,
          name: googleAccount.name
        }
      };
      setMigrationReceipt(receipt);

      setProgressPercent(100);
      setMigrationPhase('completed');
      setStatusMessage('تم النقل والترحيل السحابي بنجاح وأصبحت قاعدة بيانات مستقلة ومنفصلة!');

      // Trigger Celebration Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}

    } catch (err: any) {
      console.error('Migration error:', err);
      setMigrationPhase('error');
      setErrorMessage(err?.message || 'حدث خطأ أثناء نقل البيانات وترحيلها إلى قاعدة البيانات المستهدفة.');
    }
  };

  // Purge old complex records from central database after successful migration
  const handlePurgeOldCentralData = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف بيانات مجمع (${activeComplex.name}) من قاعدة البيانات المركزية القديمة بعد التأكد من اكتمال نقلها إلى القاعدة المنفصلة؟`)) {
      return;
    }

    setIsPurgingOld(true);
    try {
      await OmranDataService.purgeComplexData(activeComplex.id);
      if (onRefreshAllData) await onRefreshAllData();
      setOldPurged(true);
      alert('تم إفراغ وتطهير السجلات من قاعدة البيانات القديمة بأمان!');
    } catch (e: any) {
      alert('تعذر إفراغ البيانات: ' + e?.message);
    } finally {
      setIsPurgingOld(false);
    }
  };

  // Download Migration Receipt
  const handleDownloadReceipt = () => {
    if (!migrationReceipt) return;
    const jsonStr = JSON.stringify(migrationReceipt, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omran_migration_receipt_${activeComplex.id}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Database Config Snippet
  const handleCopyConfig = () => {
    const configText = JSON.stringify(
      {
        complexName: activeComplex.name,
        projectId: targetProjectId,
        databaseId: targetDatabaseId,
        googleAccount: googleAccount?.email,
        connectedAt: new Date().toISOString()
      },
      null,
      2
    );
    navigator.clipboard.writeText(configText);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
      dir="rtl"
    >
      <div className="w-full max-w-3xl bg-[#022c22] border-2 border-amber-400/60 rounded-[32px] p-5 sm:p-7 shadow-[0_0_50px_rgba(251,191,36,0.3)] space-y-5 text-right relative overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Background Radiant Aura */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#065f46] pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-[#064e3b] flex items-center justify-center shadow-lg shrink-0">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white font-heading">
                  نقل وترحيل بيانات المجمع وتأسيس قاعدة بيانات منفصلة
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  خاص بالمبرمج
                </span>
              </div>
              <p className="text-xs text-[#86efac] mt-0.5">
                نقل المجمع وكافة بياناته وحلقاته وطلابه سحابياً بحساب Google إلى قاعدة بيانات Firebase مستقلة ومنفصلة تماماً
              </p>
            </div>
          </div>

          {migrationPhase !== 'migrating' && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#064e3b] hover:bg-[#065f46] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: CONFIGURATION & SETUP BEFORE MIGRATION                            */}
        {/* ========================================================================= */}
        {migrationPhase === 'configure' && (
          <div className="space-y-5 relative z-10">
            {/* Step 1: Select Complex & Inspect Records */}
            <div className="bg-[#064e3b]/50 border border-[#065f46] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-300" />
                  <span className="text-xs font-bold text-white">1. المجمع التعليمي المراد نقله:</span>
                </div>
                {allComplexes.length > 1 && (
                  <select
                    value={selectedComplexId}
                    onChange={e => setSelectedComplexId(e.target.value)}
                    className="bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 outline-none cursor-pointer"
                  >
                    {allComplexes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.databaseConfig?.isCustom ? '(منفصلة)' : '(مركزية)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Complex Snapshot Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-[#022c22]/80 border border-[#065f46] rounded-xl p-2.5 text-center">
                  <div className="text-[11px] text-slate-400">الطلاب المسجلون</div>
                  <div className="text-base font-black text-amber-300 font-mono">
                    {isInspecting ? '...' : complexStats.students}
                  </div>
                </div>
                <div className="bg-[#022c22]/80 border border-[#065f46] rounded-xl p-2.5 text-center">
                  <div className="text-[11px] text-slate-400">الحلقات القرآنية</div>
                  <div className="text-base font-black text-emerald-300 font-mono">
                    {isInspecting ? '...' : complexStats.halaqahs}
                  </div>
                </div>
                <div className="bg-[#022c22]/80 border border-[#065f46] rounded-xl p-2.5 text-center">
                  <div className="text-[11px] text-slate-400">المعلمون والمشرفون</div>
                  <div className="text-base font-black text-amber-300 font-mono">
                    {isInspecting ? '...' : complexStats.teachers}
                  </div>
                </div>
                <div className="bg-[#022c22]/80 border border-[#065f46] rounded-xl p-2.5 text-center">
                  <div className="text-[11px] text-slate-400">سجلات الحضور والتقييم</div>
                  <div className="text-base font-black text-emerald-300 font-mono">
                    {isInspecting ? '...' : complexStats.attendance + complexStats.evaluations}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Google Account Selection & Authentication */}
            <div className="bg-[#064e3b]/50 border border-[#065f46] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-300" />
                  <span className="text-xs font-bold text-white">2. حساب Google المستهدف للنقل:</span>
                </div>
                <button
                  type="button"
                  onClick={handleLinkGoogleAccount}
                  disabled={isLinkingGoogle}
                  className="px-3 py-1.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-amber-300 text-xs font-bold border border-amber-400/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isLinkingGoogle ? 'جاري الاتصال...' : googleAccount ? 'تغيير الحساب' : 'اختيار حساب Google'}</span>
                </button>
              </div>

              {googleAccount ? (
                <div className="p-3 bg-[#022c22]/80 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center font-bold">
                      G
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono">{googleAccount.email}</div>
                      <div className="text-[10px] text-emerald-400">حساب Google موثق ومعتمد لإنشاء واستضافة قاعدة البيانات</div>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    جاهز للنقل
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-2">
                  <span>اضغط على الزر لتسجيل الدخول واختيار حساب Google المراد نقل المجمع إليه.</span>
                </div>
              )}

              {googleError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                  {googleError}
                </div>
              )}
            </div>

            {/* Step 3: Target Database Configuration Details */}
            <div className="bg-[#064e3b]/50 border border-[#065f46] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-bold text-white">3. إعدادات قاعدة بيانات Firebase المنفصلة:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#86efac] mb-1">
                    معرف المشروع المستهدف (Project ID):
                  </label>
                  <input
                    type="text"
                    value={targetProjectId}
                    onChange={e => setTargetProjectId(e.target.value)}
                    className="w-full bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                    placeholder="مثال: quran-rawdah-complex"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#86efac] mb-1">
                    معرف قاعدة بيانات Firestore (Database ID):
                  </label>
                  <input
                    type="text"
                    value={targetDatabaseId}
                    onChange={e => setTargetDatabaseId(e.target.value)}
                    className="w-full bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                    placeholder="مثال: firestore-rawdah-complex"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-300">
                سيقوم النظام بإنشاء كافة المجموعات والوثائق تلقائياً وبشكل حي، وتعيين هذا المجمع ليعمل بشكل مستقل تماماً على هذه القاعدة.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleStartLiveMigration}
                disabled={!googleAccount?.email}
                className="px-6 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#064e3b]" />
                <span>بدء نقل البيانات وإنشاء القاعدة المنفصلة الآن</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LIVE IN-PROGRESS MIGRATION ENGINE (يتم النقل أمام المبرمج)         */}
        {/* ========================================================================= */}
        {migrationPhase === 'migrating' && (
          <div className="space-y-5 py-2 relative z-10">
            {/* Live Progress Header */}
            <div className="p-4 bg-[#064e3b]/60 border border-[#065f46] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#fbbf24]" />
                  <span>{statusMessage}</span>
                </span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#022c22] rounded-full h-3 overflow-hidden border border-[#065f46]">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-[#fbbf24] to-amber-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Live Steps Checklist */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {steps.map((s, idx) => {
                const isCompleted = s.status === 'completed';
                const isRunning = s.status === 'running';

                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isRunning
                        ? 'bg-amber-400/10 border-amber-400/50 shadow-md'
                        : isCompleted
                        ? 'bg-emerald-950/40 border-emerald-500/30'
                        : 'bg-[#022c22]/40 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-400">
                          {idx + 1}
                        </div>
                      )}
                      <div>
                        <div className={`text-xs font-bold ${isRunning ? 'text-amber-300' : isCompleted ? 'text-white' : 'text-slate-400'}`}>
                          {s.title}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {s.description}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-black/30 text-emerald-300">
                      {isRunning ? 'جاري النقل...' : isCompleted ? 'تم بنجاح ✓' : 'في الانتظار'}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-center text-slate-400 animate-pulse">
              يرجى عدم إغلاق النافذة، محرك النقل السحابي يقوم بنقل كافة السجلات وربطها سحابياً...
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: COMPLETED SUCCESS VIEW (تم النقل وتصبح قاعدة بيانات منفصلة)      */}
        {/* ========================================================================= */}
        {migrationPhase === 'completed' && (
          <div className="space-y-6 py-2 text-center relative z-10">
            {/* Big Success Emblem */}
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_0_35px_rgba(52,211,153,0.4)]">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] px-3.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-400/50 text-emerald-300 font-bold inline-block">
                اكتمل النقل السحابي بنسبة 100% ✓
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                تم نقل مجمع ({activeComplex.name}) بنجاح!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-200 max-w-lg mx-auto leading-relaxed">
                أصبحت لهذا المجمع التعليمي الآن قاعدة بيانات سحابية (Firestore) منفصلة ومستقلة تماماً مرتبطة بحساب Google المعتمد، وتم نقل كافة البيانات بلا استثناء.
              </p>
            </div>

            {/* Isolated Database Summary Receipt Card */}
            <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 sm:p-5 text-right space-y-2.5 max-w-lg mx-auto text-xs shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                <span className="text-slate-400">المجمع المستقل:</span>
                <span className="font-bold text-amber-300">{activeComplex.name}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                <span className="text-slate-400">حساب Google المشرف:</span>
                <span className="font-mono font-bold text-white">{googleAccount?.email}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                <span className="text-slate-400">مشروع Firebase المنفصل:</span>
                <span className="font-mono text-emerald-300 font-bold">{targetProjectId}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                <span className="text-slate-400">معرف قاعدة البيانات (Firestore):</span>
                <span className="font-mono text-emerald-300">{targetDatabaseId}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                <span className="text-slate-400">إجمالي السجلات المنقولة:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {Object.values(complexStats).reduce((a: number, b: any) => a + Number(b || 0), 0)} وثيقة وسجل
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">حالة الاستقلال السحابي:</span>
                <span className="text-emerald-400 font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  قاعدة بيانات منفصلة ونشطة
                </span>
              </div>
            </div>

            {/* Post-Migration Developer Tools (Purge old, Download receipt, Copy config) */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="px-3.5 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-amber-300 text-xs font-bold border border-amber-400/40 transition-all cursor-pointer flex items-center gap-1.5"
                title="تنزيل وثيقة وتقرير الترحيل الكامل بصيغة JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل وثيقة الترحيل (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyConfig}
                className="px-3.5 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-emerald-300 text-xs font-bold border border-[#065f46] transition-all cursor-pointer flex items-center gap-1.5"
                title="نسخ بيانات الاتصال السحابي"
              >
                {copiedConfig ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedConfig ? 'تم النسخ ✓' : 'نسخ الإعدادات'}</span>
              </button>

              {!oldPurged ? (
                <button
                  type="button"
                  onClick={handlePurgeOldCentralData}
                  disabled={isPurgingOld}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-500/40 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="حذف السجلات القديمة من القاعدة المشتركة بعد التأكد من النقل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isPurgingOld ? 'جاري الإفراغ...' : 'إفراغ القديم من القاعدة المركزية'}</span>
                </button>
              ) : (
                <span className="text-[11px] text-emerald-400 font-bold px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
                  تم إفراغ البيانات القديمة بنجاح ✓
                </span>
              )}
            </div>

            {/* Exit / Done Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-lg mx-auto py-3 px-6 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5 text-[#064e3b]" />
                <span>إغلاق والاعتماد النهائي</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: ERROR STATE                                                      */}
        {/* ========================================================================= */}
        {migrationPhase === 'error' && (
          <div className="space-y-4 py-2 relative z-10">
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>تعذر استكمال النقل السحابي للمجمع</span>
              </div>
              <p>{errorMessage}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMigrationPhase('configure')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
              >
                تعديل الإعدادات والعودة
              </button>
              <button
                type="button"
                onClick={handleStartLiveMigration}
                className="px-5 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg cursor-pointer"
              >
                إعادة محاولة النقل
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
