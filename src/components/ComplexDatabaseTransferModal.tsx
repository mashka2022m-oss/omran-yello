import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRightLeft,
  X,
  Database,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LogIn,
  Check,
  Building2,
  Users,
  BookOpen,
  Calendar,
  Award,
  Trash2,
  RefreshCw,
  Mail,
  ExternalLink,
  Layers,
  ChevronDown,
  Globe,
  User,
  UserCheck,
  Key,
  Copy,
  CheckCheck,
  FileText,
  Download,
  Terminal,
  Shield
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  QuranComplex,
  Halaqah,
  Student,
  AttendanceRecord,
  StudentEvaluation,
  Exam,
  GoogleOAuthConfig,
  ComplexMigrationProgress,
  ComplexMigrationResult
} from '../types';
import { OmranDataService, firebaseConfig, TARGET_FIRESTORE_DATABASE_ID } from '../lib/firebase';
import { GoogleWorkspaceService } from '../lib/googleWorkspace';

interface ComplexDatabaseTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  complexes: QuranComplex[];
  activeComplexId?: string;
  halaqahs?: Halaqah[];
  students?: Student[];
  googleAuthConfig?: GoogleOAuthConfig;
  onSuccessRefresh: () => Promise<void>;
  onSelectComplex?: (complexId: string) => void;
}

export const ComplexDatabaseTransferModal: React.FC<ComplexDatabaseTransferModalProps> = ({
  isOpen,
  onClose,
  complexes,
  activeComplexId,
  halaqahs = [],
  students = [],
  googleAuthConfig,
  onSuccessRefresh,
  onSelectComplex
}) => {
  // Complex selection
  const [selectedComplexId, setSelectedComplexId] = useState<string>(
    activeComplexId || complexes[0]?.id || ''
  );

  // Sync active complex if prop changes
  useEffect(() => {
    if (activeComplexId) {
      setSelectedComplexId(activeComplexId);
    } else if (complexes[0]?.id && !selectedComplexId) {
      setSelectedComplexId(complexes[0].id);
    }
  }, [activeComplexId, complexes]);

  const targetComplex = complexes.find(c => c.id === selectedComplexId) || complexes[0];

  // Developer email from platform settings
  const developerEmail = (googleAuthConfig?.connectedEmail || '').trim();

  // Target Google Account state
  const [targetGoogleEmail, setTargetGoogleEmail] = useState<string>(() => {
    return targetComplex?.databaseConfig?.connectedEmail || developerEmail || '';
  });

  // Target Firebase Credentials
  const [targetProjectId, setTargetProjectId] = useState<string>(() => {
    return targetComplex?.databaseConfig?.projectId || '';
  });

  const [targetApiKey, setTargetApiKey] = useState<string>(() => {
    return targetComplex?.databaseConfig?.apiKey || '';
  });

  const [targetDatabaseId, setTargetDatabaseId] = useState<string>(() => {
    const existing = targetComplex?.databaseConfig?.databaseId;
    if (existing && existing !== '(default)' && !existing.startsWith('isolated-')) {
      return existing;
    }
    return '(default)';
  });

  const [targetAuthDomain, setTargetAuthDomain] = useState<string>('');
  const [targetStorageBucket, setTargetStorageBucket] = useState<string>('');
  const [targetAppId, setTargetAppId] = useState<string>('');

  // Raw Config Paste Box (Developer can paste full firebaseConfig snippet or JSON)
  const [rawConfigSnippet, setRawConfigSnippet] = useState<string>('');
  const [isRawSnippetParsed, setIsRawSnippetParsed] = useState<boolean>(false);

  // Options
  const [purgeFromCentral, setPurgeFromCentral] = useState<boolean>(true);
  const [showDeveloperGuide, setShowDeveloperGuide] = useState<boolean>(true);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  // Test Connection State
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Flow State: 'configure' | 'transferring' | 'completed' | 'error'
  const [migrationState, setMigrationState] = useState<'configure' | 'transferring' | 'completed' | 'error'>('configure');
  const [isSigningInGoogle, setIsSigningInGoogle] = useState<boolean>(false);
  const [progress, setProgress] = useState<ComplexMigrationProgress>({
    step: 0,
    totalSteps: 10,
    percent: 0,
    title: 'في انتظار بدء النقل...',
    detail: '',
    logs: []
  });
  const [migrationResult, setMigrationResult] = useState<ComplexMigrationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-scroll log terminal
  const logTerminalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [progress.logs]);

  // Update defaults when switching target complex
  useEffect(() => {
    if (targetComplex) {
      if (targetComplex.databaseConfig?.connectedEmail) {
        setTargetGoogleEmail(targetComplex.databaseConfig.connectedEmail);
      }
      if (targetComplex.databaseConfig?.projectId) {
        setTargetProjectId(targetComplex.databaseConfig.projectId);
      }
      if (targetComplex.databaseConfig?.apiKey) {
        setTargetApiKey(targetComplex.databaseConfig.apiKey);
      }
      if (targetComplex.databaseConfig?.databaseId && !targetComplex.databaseConfig.databaseId.startsWith('isolated-')) {
        setTargetDatabaseId(targetComplex.databaseConfig.databaseId);
      } else {
        setTargetDatabaseId('(default)');
      }
      setConnectionTestResult(null);
    }
  }, [targetComplex?.id]);

  if (!isOpen) return null;

  // Compute preview stats for target complex
  const complexHalaqahs = halaqahs.filter(h => h.complexId === targetComplex?.id);
  const complexHalaqahIds = new Set(complexHalaqahs.map(h => h.id));
  const complexStudents = students.filter(s => (s.halaqahId && complexHalaqahIds.has(s.halaqahId)) || s.complexId === targetComplex?.id);

  // Handle parsing of pasted firebaseConfig string
  const handleParseRawConfig = (text: string) => {
    setRawConfigSnippet(text);
    if (!text.trim()) return;

    try {
      // 1. Try JSON parse first
      let cleanText = text.trim();
      if (cleanText.includes('{') && cleanText.includes('}')) {
        const jsonMatch = cleanText.substring(cleanText.indexOf('{'), cleanText.lastIndexOf('}') + 1);
        try {
          const parsed = JSON.parse(jsonMatch);
          if (parsed.projectId || parsed.apiKey) {
            if (parsed.projectId) setTargetProjectId(parsed.projectId);
            if (parsed.apiKey) setTargetApiKey(parsed.apiKey);
            if (parsed.authDomain) setTargetAuthDomain(parsed.authDomain);
            if (parsed.storageBucket) setTargetStorageBucket(parsed.storageBucket);
            if (parsed.appId) setTargetAppId(parsed.appId);
            setIsRawSnippetParsed(true);
            setConnectionTestResult(null);
            return;
          }
        } catch {}
      }

      // 2. Regex fallback for JS object style (apiKey: "...", projectId: '...')
      const apiKeyMatch = text.match(/apiKey\s*[:=]\s*["']([^"']+)["']/i);
      const projectIdMatch = text.match(/projectId\s*[:=]\s*["']([^"']+)["']/i);
      const authDomainMatch = text.match(/authDomain\s*[:=]\s*["']([^"']+)["']/i);
      const storageBucketMatch = text.match(/storageBucket\s*[:=]\s*["']([^"']+)["']/i);
      const appIdMatch = text.match(/appId\s*[:=]\s*["']([^"']+)["']/i);

      let found = false;
      if (projectIdMatch && projectIdMatch[1]) {
        setTargetProjectId(projectIdMatch[1].trim());
        found = true;
      }
      if (apiKeyMatch && apiKeyMatch[1]) {
        setTargetApiKey(apiKeyMatch[1].trim());
        found = true;
      }
      if (authDomainMatch && authDomainMatch[1]) {
        setTargetAuthDomain(authDomainMatch[1].trim());
      }
      if (storageBucketMatch && storageBucketMatch[1]) {
        setTargetStorageBucket(storageBucketMatch[1].trim());
      }
      if (appIdMatch && appIdMatch[1]) {
        setTargetAppId(appIdMatch[1].trim());
      }

      if (found) {
        setIsRawSnippetParsed(true);
        setConnectionTestResult(null);
      }
    } catch (e) {
      console.warn('Error parsing firebase config snippet:', e);
    }
  };

  // Google sign in / account chooser handler
  const handleSelectGoogleAccount = async () => {
    setIsSigningInGoogle(true);
    setErrorMessage(null);
    try {
      const res = await GoogleWorkspaceService.selectAnyGoogleAccountForMigration();
      if (res?.email) {
        setTargetGoogleEmail(res.email.trim());
      }
    } catch (err: any) {
      if (err?.isPopupClosed) {
        setErrorMessage('تم إغلاق نافذة اختيار الحساب قبل الاختيار.');
      } else {
        setErrorMessage(err?.message || 'تعذر استكمال اختيار حساب Google.');
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // Test Real Connection to Target Firebase Project
  const handleTestRealConnection = async () => {
    if (!targetProjectId.trim()) {
      setErrorMessage('يرجى إدخال معرف المشروع (Project ID) لفحص الاتصال.');
      return;
    }
    if (!targetApiKey.trim()) {
      setErrorMessage('يرجى إدخال مفتاح الويب (API Key) لفحص الاتصال بمشروعك.');
      return;
    }

    setIsTestingConnection(true);
    setErrorMessage(null);
    setConnectionTestResult(null);

    try {
      const res = await OmranDataService.testRealFirebaseConnection({
        projectId: targetProjectId.trim(),
        apiKey: targetApiKey.trim(),
        databaseId: targetDatabaseId.trim() || '(default)',
        authDomain: targetAuthDomain.trim() || undefined,
        storageBucket: targetStorageBucket.trim() || undefined,
        appId: targetAppId.trim() || undefined
      });

      setConnectionTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        details: res.details
      });
    } catch (err: any) {
      setConnectionTestResult({
        tested: true,
        success: false,
        message: err?.message || 'حدث خطأ أثناء فحص الاتصال بـ Firebase.'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Copy Recommended Security Rules to Clipboard
  const handleCopySecurityRules = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  // Start Real Migration Handler
  const handleStartRealMigration = async () => {
    if (!targetComplex) return;

    const cleanProjId = targetProjectId.trim();
    const cleanApiKey = targetApiKey.trim();

    if (!cleanProjId) {
      setErrorMessage('يرجى إدخال معرف مشروع Firebase (Project ID) للبدء.');
      return;
    }
    if (!cleanApiKey) {
      setErrorMessage('يرجى إدخال مفتاح الويب (Web API Key) الخاص بمشروع فايربيس للاتصال بالسيرفر وكتابة البيانات.');
      return;
    }

    setErrorMessage(null);
    setMigrationState('transferring');
    setProgress({
      step: 1,
      totalSteps: 10,
      percent: 5,
      title: 'بدء الاتصال الفعلي بمشروع Firebase المستهدف...',
      detail: `جاري الاتصال بمشروع (${cleanProjId}) والتحقق من صلاحية مفتاح API...`,
      logs: [
        `[${new Date().toLocaleTimeString('ar-SA')}] بدء جلسة النقل الفعلي لبيانات مجمع (${targetComplex.name})...`,
        `[${new Date().toLocaleTimeString('ar-SA')}] مشروع Firebase المستهدف: (${cleanProjId})`,
        `[${new Date().toLocaleTimeString('ar-SA')}] جاري فحص الاتصال وقراءة/كتابة وثيقة الاختبار...`
      ]
    });

    try {
      const res = await OmranDataService.migrateComplexToDedicatedDatabase(
        {
          complexId: targetComplex.id,
          targetProjectId: cleanProjId,
          targetApiKey: cleanApiKey,
          targetGoogleEmail: targetGoogleEmail.trim() || undefined,
          targetDatabaseId: targetDatabaseId.trim() || '(default)',
          targetAuthDomain: targetAuthDomain.trim() || undefined,
          targetStorageBucket: targetStorageBucket.trim() || undefined,
          targetAppId: targetAppId.trim() || undefined,
          purgeFromCentral: purgeFromCentral
        },
        (p) => {
          setProgress(p);
        }
      );

      setMigrationResult(res);
      setMigrationState('completed');

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 130,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      // Refresh parent app data
      await onSuccessRefresh();
    } catch (err: any) {
      console.error('Migration error:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء نقل بيانات المجمع إلى فايربيس.');
      setMigrationState('error');
    }
  };

  // Download JSON backup of the transferred data
  const handleDownloadBackupJson = async () => {
    if (!targetComplex) return;
    try {
      const backup = await OmranDataService.exportFullBackup();
      const complexData = {
        complex: targetComplex,
        databaseConfig: targetComplex.databaseConfig,
        migratedAt: new Date().toISOString(),
        halaqahs: complexHalaqahs,
        students: complexStudents,
        stats: migrationResult?.stats
      };
      const blob = new Blob([JSON.stringify(complexData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omran_migrated_${targetComplex.id}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('تعذر تنزيل الملف: ' + e.message);
    }
  };

  // Purge now handler (if developer didn't check purge earlier, but wants to purge after migration)
  const handlePurgeNow = async () => {
    if (!targetComplex) return;
    if (!window.confirm(`هل أنت متأكد من حذف بيانات مجمع (${targetComplex.name}) من القاعدة المركزية بعد التأكد من وجودها في فايربيس الجديد؟`)) {
      return;
    }
    try {
      await OmranDataService.purgeComplexData(targetComplex.id);
      if (migrationResult) {
        setMigrationResult({ ...migrationResult, purgedFromCentral: true });
      }
      await onSuccessRefresh();
      alert('تم إفراغ البيانات من القاعدة المركزية بنجاح.');
    } catch (err: any) {
      setErrorMessage('تعذر إفراغ البيانات المركزية: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const firebaseConsoleDataUrl = targetProjectId.trim()
    ? `https://console.firebase.google.com/project/${targetProjectId.trim()}/firestore/data`
    : 'https://console.firebase.google.com/';

  const firebaseConsoleRulesUrl = targetProjectId.trim()
    ? `https://console.firebase.google.com/project/${targetProjectId.trim()}/firestore/rules`
    : 'https://console.firebase.google.com/';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-right" dir="rtl">
      <div className="w-full max-w-3xl bg-[#022c22] border-2 border-amber-500/70 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-b border-[#065f46] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#064e3b] flex items-center justify-center shadow-lg shadow-amber-400/20 shrink-0">
              <Database className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black font-heading text-white">
                  النقل الفعلي للمجمع إلى مشروع Firebase مستقل
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-400 text-[#064e3b] font-black shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  اتصال ونقل حقيقي 100%
                </span>
              </div>
              <p className="text-xs text-[#86efac] mt-1 leading-relaxed">
                ترحيل كامل بيانات المجمع (حلقات، طلاب، كشوفات، تقييمات) إلى مشروعك السحابي في Firebase ومتابعتها مباشرة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={migrationState === 'transferring'}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* STAGE 1: CONFIGURE & SELECT ACCOUNT */}
          {migrationState === 'configure' && (
            <div className="space-y-5">
              
              {/* Complex Selector Card */}
              <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">المجمع التعليمي المراد نقله:</span>
                      <span className="text-[11px] text-[#86efac]">اختر المجمع الذي ترغب في نقله وتخصيص قاعدة بيانات مستقلة له:</span>
                    </div>
                  </div>

                  <select
                    value={selectedComplexId}
                    onChange={e => setSelectedComplexId(e.target.value)}
                    className="bg-[#022c22] border-2 border-amber-400/50 rounded-xl px-3.5 py-2 text-xs font-bold text-amber-300 outline-none cursor-pointer focus:border-amber-400"
                  >
                    {complexes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.databaseConfig?.isCustom ? '[منفصل مسبقاً]' : '[قاعدة مركزية]'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entity breakdown */}
                {targetComplex && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#065f46]/60">
                    <div className="p-2.5 rounded-xl bg-[#022c22]/80 border border-[#065f46] text-center">
                      <span className="text-[10px] text-slate-300 block">حلقات التحفيظ</span>
                      <strong className="text-amber-300 font-bold text-sm">{complexHalaqahs.length}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#022c22]/80 border border-[#065f46] text-center">
                      <span className="text-[10px] text-slate-300 block">الطلاب المسجلين</span>
                      <strong className="text-emerald-300 font-bold text-sm">{complexStudents.length}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#022c22]/80 border border-[#065f46] text-center">
                      <span className="text-[10px] text-slate-300 block">المشرف المسؤول</span>
                      <strong className="text-white font-bold text-[11px] truncate block">{targetComplex.supervisorTeacherName || 'المشرف العام'}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#022c22]/80 border border-[#065f46] text-center">
                      <span className="text-[10px] text-slate-300 block">الحالة الحالية</span>
                      <strong className="text-amber-400 font-bold text-[11px]">
                        {targetComplex.databaseConfig?.isCustom ? 'قاعدة منفصلة' : 'قاعدة مركزية'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* REAL EXPLANATION & FIREBASE CONSOLE ACCESS BANNER */}
              <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-teal-500/20 border-2 border-amber-400 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] px-3 py-0.5 rounded-full bg-amber-400 text-[#064e3b] font-black inline-flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      آلية العمل الحقيقية لفايربيس (Real Firebase Project)
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white font-heading">
                      كيف يعمل نقل البيانات الحقيقي إلى حسابك في Firebase؟
                    </h4>
                  </div>

                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#064e3b] font-black text-xs shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>فتح Firebase Console لإنشاء مشروع ↗</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                  <div className="bg-[#022c22]/90 border border-[#065f46] p-3 rounded-xl space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-[#064e3b] flex items-center justify-center text-[10px] font-black">1</span>
                      أنشئ مشروعاً مجاناً
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      في كونسول فايربيس اضغط <strong>Add project</strong> واختر أي اسم (مثلاً: <span className="text-emerald-300 font-mono">omran-complex</span>) في ثوانٍ بدون بطاقة بنكية.
                    </p>
                  </div>

                  <div className="bg-[#022c22]/90 border border-[#065f46] p-3 rounded-xl space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-[#064e3b] flex items-center justify-center text-[10px] font-black">2</span>
                      فعّل Firestore Database
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      من القائمة اليسرى اضغط <strong>Build &gt; Firestore Database</strong> ثم <strong>Create database</strong> واختر (Start in test mode).
                    </p>
                  </div>

                  <div className="bg-[#022c22]/90 border border-[#065f46] p-3 rounded-xl space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-[#064e3b] flex items-center justify-center text-[10px] font-black">3</span>
                      انسخ الكود وضعه هنا
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      من إعدادات المشروع (Project Settings ⚙️) انسخ <strong>Project ID</strong> و <strong>Web API Key</strong> أو الصق كود التكوين كاملاً بالأسفل.
                    </p>
                  </div>
                </div>
              </div>

              {/* SMART CONFIGURATION INPUT (لصق الكود كاملاً أو إدخال الحقول) */}
              <div className="bg-[#022c22] border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-400/40">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      بيانات مشروع Firebase المستهدف (Project Credentials)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    مطلوبة للاتصال الفعلي
                  </span>
                </div>

                {/* Quick Paste Area */}
                <div className="space-y-1.5 bg-[#064e3b]/40 p-3 rounded-xl border border-[#065f46]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      الصق كود إعدادات فايربيس كاملاً (firebaseConfig) للاستخراج التلقائي السريع:
                    </label>
                    {isRawSnippetParsed && (
                      <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        تم استخراج المعرفات بنجاح
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={rawConfigSnippet}
                    onChange={e => handleParseRawConfig(e.target.value)}
                    placeholder={`مثال: const firebaseConfig = { apiKey: "AIzaSy...", projectId: "my-complex-project", ... };`}
                    className="w-full bg-[#022c22] border border-[#065f46] rounded-lg p-2.5 text-xs text-white font-mono placeholder:text-slate-500 outline-none focus:border-amber-400"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    يمكنك لصق كود Web SDK كاملاً كما نسخه من Firebase Console، أو تعبئة الحقول أدناه يدوياً.
                  </span>
                </div>

                {/* Individual Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-200 mb-1">
                      معرف مشروع Firebase (Project ID) <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      value={targetProjectId}
                      onChange={e => {
                        setTargetProjectId(e.target.value);
                        setConnectionTestResult(null);
                      }}
                      placeholder="مثال: my-quran-complex-123"
                      className="w-full bg-[#064e3b] border border-[#065f46] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-amber-400"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-200 mb-1">
                      مفتاح الويب (Web API Key) <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      value={targetApiKey}
                      onChange={e => {
                        setTargetApiKey(e.target.value);
                        setConnectionTestResult(null);
                      }}
                      placeholder="مثال: AIzaSyDEzjLSKGT89RkZk..."
                      className="w-full bg-[#064e3b] border border-[#065f46] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-amber-400"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-200 mb-1">
                      معرف قاعدة البيانات (Database ID) - اتركه (default):
                    </label>
                    <input
                      type="text"
                      value={targetDatabaseId}
                      onChange={e => {
                        const val = e.target.value.trim();
                        setTargetDatabaseId(val || '(default)');
                      }}
                      placeholder="(default)"
                      className="w-full bg-[#064e3b] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                      dir="ltr"
                    />
                    <span className="text-[10px] text-amber-300/80 block mt-1">
                      💡 في فايربيس تكون قاعدة البيانات دائماً <code className="text-white font-bold">(default)</code>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-200 mb-1">
                      بريد حساب Google المالك (اختياري / للتوثيق):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={targetGoogleEmail}
                        onChange={e => setTargetGoogleEmail(e.target.value)}
                        placeholder="client.complex@gmail.com"
                        className="w-full bg-[#064e3b] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleSelectGoogleAccount}
                        disabled={isSigningInGoogle}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1"
                        title="اختيار حساب Google"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>اختيار</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Real Connection Test Action */}
                <div className="pt-2 border-t border-[#065f46] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">فحص الاتصال الفعلي بقاعدة بيانات المشروع:</span>
                    <span className="text-[11px] text-[#86efac]">
                      يختبر صلاحية القراءة والكتابة في خوادم Google للتأكد قبل بدء النقل.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestRealConnection}
                    disabled={isTestingConnection || !targetProjectId.trim() || !targetApiKey.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 shrink-0"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>جاري فحص الاتصال بالخادم...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-white" />
                        <span>اختبار الاتصال الفعلي بـ Firebase الآن ⚡</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Connection Test Status Banner */}
                {connectionTestResult && (
                  <div className={`p-4 rounded-xl border-2 transition-all space-y-2 ${
                    connectionTestResult.success
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-500 text-rose-200'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      {connectionTestResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <strong className="font-bold text-xs block text-white">
                          {connectionTestResult.success ? 'الاتصال جاهز وسليم 100%!' : 'فشل اختبار الاتصال بمشروعك'}
                        </strong>
                        <p className="text-[11px] leading-relaxed">
                          {connectionTestResult.message}
                        </p>
                      </div>
                    </div>

                    {/* Security Rules Helper if permission-denied */}
                    {!connectionTestResult.success && (
                      <div className="bg-[#022c22] p-3 rounded-lg border border-rose-500/40 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            حل مشكلة قواعد الأمان (Firestore Security Rules):
                          </span>
                          <button
                            type="button"
                            onClick={handleCopySecurityRules}
                            className="px-2.5 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedRules ? (
                              <>
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                                <span>تم النسخ!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>نسخ القواعد</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-300">
                          ادخل إلى <strong>Firestore Database &gt; Rules</strong> في كونسول فايربيس والصق القواعد التالية لتسمح بنقل البيانات:
                        </p>
                        <pre className="p-2 rounded bg-black/50 text-[10px] font-mono text-emerald-300 overflow-x-auto" dir="ltr">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                        </pre>
                        {targetProjectId && (
                          <a
                            href={firebaseConsoleRulesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-300 underline font-bold flex items-center gap-1"
                          >
                            <span>فتح صفحة Rules في مشروعك مباشرة ↗</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Purge Options & Migration Launch */}
              <div className="bg-[#022c22] border border-[#065f46] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-400/40">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      خيارات الترحيل وإفراغ البيانات المركزية
                    </h4>
                  </div>
                </div>

                {/* Purge option toggle */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-[#065f46] cursor-pointer hover:border-amber-400/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={purgeFromCentral}
                    onChange={e => setPurgeFromCentral(e.target.checked)}
                    className="mt-0.5 accent-amber-400 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      إفراغ بيانات هذا المجمع من القاعدة المركزية القديمة بعد نجاح نقله إلى مشروعه المستقل
                    </span>
                    <p className="text-[11px] text-[#86efac]/80 mt-0.5">
                      يضمن استقلال المجمع التام وعدم تكرار سجلاته في القاعدة المركزية (يمكنك الاحتفاظ بنسخة وعدم الحذف).
                    </p>
                  </div>
                </label>

                {/* Primary Launch Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartRealMigration}
                    disabled={!targetProjectId.trim() || !targetApiKey.trim()}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:brightness-110 text-[#064e3b] font-black text-sm sm:text-base shadow-[0_0_25px_rgba(251,191,36,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowRightLeft className="w-5 h-5 text-[#064e3b] stroke-[2.5]" />
                    <span>
                      بدء النقل الفعلي لبيانات المجمع إلى مشروع Firebase المستقل 🚀
                    </span>
                  </button>
                  <span className="text-[10px] text-slate-400 text-center block mt-1.5">
                    سيتم رفع وكتابة كل حلقة، طالب، سجل حضور، وتقييم حقيقةً إلى خوادم Google Firebase في مشروعك.
                  </span>
                </div>
              </div>

              {/* Error box if any */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

            </div>
          )}

          {/* STAGE 2: LIVE REAL-TIME TRANSFER IN PROGRESS */}
          {migrationState === 'transferring' && (
            <div className="space-y-6 py-4">
              
              {/* Progress Bar & Percentage */}
              <div className="bg-[#064e3b]/50 border-2 border-amber-400/50 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{progress.title}</span>
                  </span>
                  <span className="font-mono text-base font-black text-white">{progress.percent}%</span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-[#022c22] rounded-full h-4 p-0.5 border border-[#065f46] overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-300 transition-all duration-200 relative overflow-hidden shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                    style={{ width: `${progress.percent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                <p className="text-xs text-[#86efac] animate-pulse">
                  {progress.detail || 'يرجى الانتظار، جاري كتابة السجلات والمستندات حقيقةً إلى قاعدة بيانات Firebase...'}
                </p>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-300 pt-1">
                  <span>المجمع: <strong className="text-white">{targetComplex?.name}</strong></span>
                  <span>•</span>
                  <span>المشروع المستهدف: <strong className="font-mono text-amber-300">{targetProjectId}</strong></span>
                  <span>•</span>
                  <span>الخطوة: <strong className="text-white">{progress.step} / {progress.totalSteps}</strong></span>
                </div>
              </div>

              {/* Live Real-time Terminal / Logs Window */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-200 font-bold px-1">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>سجل الكتابة السحابية اللحظية لمستندات Firebase (Real Document Writes):</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    مباشر (Live Sync)
                  </span>
                </div>

                <div
                  ref={logTerminalRef}
                  className="bg-[#022c22] border-2 border-[#065f46] rounded-2xl p-4 font-mono text-[11px] h-52 overflow-y-auto space-y-1.5 text-emerald-300 shadow-inner"
                >
                  {progress.logs.length === 0 ? (
                    <div className="text-slate-500 text-center py-6">جاري تهيئة البث المباشر لسجلات النقل...</div>
                  ) : (
                    progress.logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-400">›</span>
                        <span className={index === progress.logs.length - 1 ? 'text-white font-bold' : 'text-[#86efac]/90'}>
                          {log}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* STAGE 3: COMPLETED SCREEN (تم النقل ورابط مباشر لكونسول فايربيس) */}
          {migrationState === 'completed' && migrationResult && (
            <div className="space-y-6 py-2 text-center">
              
              {/* Giant Celebratory Badge */}
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-amber-400 text-[#064e3b] flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.5)]">
                <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-400 text-emerald-200 font-bold inline-block mb-2 shadow-sm">
                  تم الانتهاء والنقل الحقيقي بنجاح 100% ✓
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-heading text-white">
                  تم نقل بيانات المجمع بالكامل إلى Firebase!
                </h3>
                <p className="text-xs sm:text-sm text-emerald-200 mt-2 max-w-lg mx-auto leading-relaxed">
                  تمت كتابة كافة مجموعات ومستندات مجمع <strong className="text-amber-300">({migrationResult.complexName})</strong> مباشرة في مشروع Firebase المستقل <strong className="text-white font-mono">({migrationResult.targetProjectId})</strong>.
                </p>
              </div>

              {/* PRIMARY PROMINENT ACTION: Open Firebase Console Directly */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-400/20 via-emerald-500/25 to-teal-500/20 border-2 border-amber-400 max-w-lg mx-auto space-y-3">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>تأكد بنفسك في وحدة تحكم Google:</span>
                </div>
                <a
                  href={migrationResult.firebaseConsoleUrl || firebaseConsoleDataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#064e3b] font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>فتح مشروعك في Firebase Console لرؤية البيانات الآن ↗</span>
                  <ExternalLink className="w-4 h-4 text-[#064e3b]" />
                </a>
                <span className="text-[10px] text-slate-300 block">
                  ستجد كافة المجموعات (students, halaqahs, attendance, evaluations, exams...) ظاهرة ببياناتها الفعلية.
                </span>
              </div>

              {/* Statistics & Specs Card */}
              <div className="bg-[#064e3b]/60 border-2 border-emerald-400/50 rounded-2xl p-5 text-right space-y-3 max-w-lg mx-auto text-xs shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                  <span className="text-slate-300">المجمع المنقول:</span>
                  <span className="font-bold text-amber-300 font-heading">{migrationResult.complexName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                  <span className="text-slate-300">مشروع Firebase المستقل:</span>
                  <span className="font-mono font-bold text-white" dir="ltr">{migrationResult.targetProjectId}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                  <span className="text-slate-300">قاعدة البيانات:</span>
                  <span className="font-mono text-emerald-300 font-bold">{migrationResult.targetDatabaseId}</span>
                </div>

                {/* Sub-records breakdown */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-emerald-200 block mb-2">إجمالي السجلات التي تم ترحيلها حقيقةً ({migrationResult.stats.totalRecords} سجل):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-center">
                    <div className="p-2 rounded-lg bg-[#022c22] border border-[#065f46]">
                      <span className="text-slate-400 block text-[10px]">الطلاب</span>
                      <strong className="text-emerald-300">{migrationResult.stats.studentsCount}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#022c22] border border-[#065f46]">
                      <span className="text-slate-400 block text-[10px]">الحلقات</span>
                      <strong className="text-amber-300">{migrationResult.stats.halaqahsCount}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#022c22] border border-[#065f46]">
                      <span className="text-slate-400 block text-[10px]">الحضور</span>
                      <strong className="text-white">{migrationResult.stats.attendanceCount}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#022c22] border border-[#065f46]">
                      <span className="text-slate-400 block text-[10px]">التقييمات</span>
                      <strong className="text-amber-400">{migrationResult.stats.evaluationsCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="pt-3 border-t border-[#065f46] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackupJson}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>تنزيل نسخة JSON احتياطية</span>
                  </button>

                  {migrationResult.purgedFromCentral ? (
                    <span className="text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      تم إفراغ القاعدة المركزية
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePurgeNow}
                      className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[11px] font-bold cursor-pointer"
                    >
                      إفراغ القاعدة المركزية الآن
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* STAGE 4: ERROR STATE */}
          {migrationState === 'error' && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-500/60 text-red-200 space-y-2">
                <div className="flex items-center gap-2.5 font-bold text-red-300 text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span>تعذر إتمام عملية نقل المجمع إلى Firebase</span>
                </div>
                <p className="text-xs leading-relaxed">{errorMessage}</p>
              </div>

              {progress.logs.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-300 font-bold">السجلات قبل التوقف:</span>
                  <div className="bg-[#022c22] border border-red-500/30 rounded-xl p-3 font-mono text-[10px] h-32 overflow-y-auto text-red-200">
                    {progress.logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-[#022c22] border-t border-[#065f46] flex items-center justify-between gap-3 shrink-0">
          {migrationState === 'configure' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleStartRealMigration}
                disabled={!targetProjectId.trim() || !targetApiKey.trim()}
                className="px-6 py-3 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs sm:text-sm font-black shadow-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#064e3b] stroke-[2.5]" />
                <span>
                  بدء النقل الفعلي إلى مشروع فايربيس 🚀
                </span>
              </button>
            </>
          )}

          {migrationState === 'transferring' && (
            <div className="w-full text-center text-xs text-amber-300 flex items-center justify-center gap-2 font-bold py-1">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>جاري الكتابة الحقيقية في خوادم Google Firebase، يرجى عدم إغلاق النافذة...</span>
            </div>
          )}

          {migrationState === 'completed' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:brightness-110 text-[#064e3b] font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>تم بنجاح، إغلاق والعودة للوحة التحكم</span>
            </button>
          )}

          {migrationState === 'error' && (
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => setMigrationState('configure')}
                className="px-5 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg cursor-pointer"
              >
                تعديل الإعدادات وإعادة المحاولة
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
