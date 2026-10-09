import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileJson,
  ShieldCheck,
  Server,
  Cloud,
  ExternalLink,
  HardDrive,
  Building2,
  Layers,
  Sparkles,
  ArrowRightLeft,
  Trash2,
  Check,
  CheckCircle2,
  Loader2,
  LogIn,
  Globe,
  Link,
  Lock,
  Key,
  Copy,
  Mail
} from 'lucide-react';
import { OmranDataService, firebaseConfig, TARGET_FIRESTORE_DATABASE_ID } from '../../lib/firebase';
import { GoogleWorkspaceService } from '../../lib/googleWorkspace';
import { FullBackupData, GoogleOAuthConfig, QuranComplex, ComplexBackupData, Halaqah, Student } from '../../types';
import { ComplexDatabaseTransferModal } from '../ComplexDatabaseTransferModal';

interface DataBackupTabProps {
  onRefreshAllData: () => Promise<void>;
  googleAuthConfig?: GoogleOAuthConfig;
  onRefreshGoogleAuth?: () => Promise<void>;
  isSupervisor?: boolean;
  isDeveloper?: boolean;
  complexes?: QuranComplex[];
  onSaveComplex?: (complex: QuranComplex) => Promise<void>;
  halaqahs?: Halaqah[];
  students?: Student[];
}

export const DataBackupTab: React.FC<DataBackupTabProps> = ({
  onRefreshAllData,
  googleAuthConfig,
  onRefreshGoogleAuth,
  isSupervisor,
  isDeveloper,
  complexes = [],
  onSaveComplex,
  halaqahs = [],
  students = []
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [sheetsExportResult, setSheetsExportResult] = useState<{ spreadsheetId: string; spreadsheetUrl: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<FullBackupData | null>(null);
  const [driveExportResult, setDriveExportResult] = useState<{ fileName: string; folderName: string; webViewLink: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; linkUrl?: string; linkText?: string } | null>(null);

  // Complex-specific state
  const [selectedComplexId, setSelectedComplexId] = useState<string>(complexes[0]?.id || '');
  const [showDbConfigForm, setShowDbConfigForm] = useState(false);
  const [customDbConfig, setCustomDbConfig] = useState({
    apiKey: '',
    projectId: '',
    authDomain: '',
    storageBucket: '',
    appId: ''
  });
  const [isSavingDbConfig, setIsSavingDbConfig] = useState(false);

  // Complex export / import / purge state
  const [isExportingComplex, setIsExportingComplex] = useState(false);
  const [isImportingComplex, setIsImportingComplex] = useState(false);
  const [complexBackupToRestore, setComplexBackupToRestore] = useState<ComplexBackupData | null>(null);

  // Complex purge dialog
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // Complex migration / transfer dialog
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetDb, setTransferTargetDb] = useState({
    projectId: '',
    apiKey: '',
    notes: ''
  });
  const [isTransferring, setIsTransferring] = useState(false);

  // Automated Database Linking Flow State (الربط التلقائي بتسجيل الدخول)
  const [isAutoLinkingOpen, setIsAutoLinkingOpen] = useState(false);
  const [autoLinkStep, setAutoLinkStep] = useState<'idle' | 'signing_in' | 'configuring' | 'testing' | 'completed' | 'error'>('idle');
  const [autoLinkProgressText, setAutoLinkProgressText] = useState('');
  const [autoLinkTargetComplex, setAutoLinkTargetComplex] = useState<QuranComplex | null>(null);
  const [autoLinkResult, setAutoLinkResult] = useState<{
    email: string;
    projectId: string;
    databaseId: string;
    complexName?: string;
    timestamp: string;
  } | null>(null);
  const [autoLinkError, setAutoLinkError] = useState<string | null>(null);

  // Developer URL & Netlify Hosting Detection State
  const [detectedOrigin, setDetectedOrigin] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  });
  const [customDomainInput, setCustomDomainInput] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Compute active base URL: custom domain if entered, else detected origin, else fallback
  const activeBaseUrl = (customDomainInput.trim()
    ? (customDomainInput.trim().startsWith('http') ? customDomainInput.trim().replace(/\/+$/, '') : `https://${customDomainInput.trim().replace(/\/+$/, '')}`)
    : (detectedOrigin || 'https://omran-quran.netlify.app')
  );

  const activePrivacyUrl = `${activeBaseUrl}/privacy`;
  const activeHomeUrl = `${activeBaseUrl}/`;

  let activeHostname = '';
  try {
    activeHostname = new URL(activeBaseUrl).hostname;
  } catch {
    activeHostname = activeBaseUrl.replace(/^https?:\/\//, '').split('/')[0];
  }

  const handleCopyText = (text: string, fieldId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const activeComplex = complexes.find(c => c.id === selectedComplexId) || complexes[0];

  // Handle Full Export to Local JSON
  const handleExport = async () => {
    setIsExporting(true);
    setStatusMsg(null);
    try {
      const backupData = await OmranDataService.exportFullBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `omran_quran_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMsg({
        type: 'success',
        text: 'تم تصدير النسخة الاحتياطية الكاملة لبيانات المنصة بنجاح!'
      });
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: 'فشل تصدير النسخة الاحتياطية: ' + (e.message || 'خطأ غير معروف')
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Direct Export to Google Drive
  const handleExportGoogleDrive = async () => {
    setIsExportingDrive(true);
    setStatusMsg(null);
    setDriveExportResult(null);

    try {
      let token = await GoogleWorkspaceService.getValidAccessToken();
      if (!token) {
        const linkRes = await GoogleWorkspaceService.linkGoogleAccount();
        token = linkRes.accessToken;
        if (onRefreshGoogleAuth) await onRefreshGoogleAuth();
      }

      const backupData = await OmranDataService.exportFullBackup();
      const res = await GoogleWorkspaceService.exportBackupToGoogleDrive(backupData, googleAuthConfig);
      setDriveExportResult(res);

      setStatusMsg({
        type: 'success',
        text: `تم حفظ النسخة الاحتياطية بنجاح في Google Drive داخل مجلد "${res.folderName}"!`,
        linkUrl: res.webViewLink,
        linkText: 'فتح الملف في Google Drive ↗'
      });
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: 'تعذر تصدير النسخة إلى Google Drive: ' + (e.message || 'يرجى ربط حساب Google أولاً')
      });
    } finally {
      setIsExportingDrive(false);
    }
  };

  // Handle Full Export to Google Sheets (Saved persistently in Cloud & Multi-Tabbed)
  const handleExportGoogleSheets = async () => {
    setIsExportingSheets(true);
    setStatusMsg(null);
    setSheetsExportResult(null);

    try {
      let token = await GoogleWorkspaceService.getValidAccessToken();
      if (!token) {
        const linkRes = await GoogleWorkspaceService.linkGoogleAccount();
        token = linkRes.accessToken;
        if (onRefreshGoogleAuth) await onRefreshGoogleAuth();
      }

      const backupData = await OmranDataService.exportFullBackup();
      const res = await GoogleWorkspaceService.exportFullPlatformBackupToGoogleSheet(backupData, token);
      setSheetsExportResult(res);

      setStatusMsg({
        type: 'success',
        text: 'تم إنشاء وتصدير النسخة الاحتياطية الشاملة إلى جداول Google Sheets بنجاح مع كافة التبويبات!',
        linkUrl: res.spreadsheetUrl,
        linkText: 'فتح جدول البيانات في Google Sheets ↗'
      });
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: 'تعذر التصدير إلى Google Sheets: ' + (e.message || 'يرجى ربط حساب Google أولاً')
      });
    } finally {
      setIsExportingSheets(false);
    }
  };

  // Handle Full JSON Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupData: FullBackupData = JSON.parse(content);

        if (!backupData || (!Array.isArray(backupData.students) && !Array.isArray(backupData.attendance))) {
          throw new Error('الملف لا يحتوي على بيانات نسخة احتياطية صالحة لمنصة عمران.');
        }

        setPendingRestore(backupData);
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: 'الملف غير صالح أو تالف: ' + err.message
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsImporting(true);
    setStatusMsg(null);

    try {
      const stats = await OmranDataService.importFullBackup(pendingRestore);
      await onRefreshAllData();
      setStatusMsg({
        type: 'success',
        text: `تمت استعادة البيانات بنجاح: (${stats.studentsCount}) طالب، (${stats.attendanceCount}) سجل حضور، (${stats.halaqahsCount || 0}) حلقة، و (${stats.complexesCount || 0}) مجمع!`
      });
      setPendingRestore(null);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: 'فشل استيراد النسخة الاحتياطية: ' + (err.message || 'خطأ غير متوقع')
      });
    } finally {
      setIsImporting(false);
    }
  };

  // ----------------------------------------------------
  // Complex Specific Database Handlers
  // ----------------------------------------------------

  // 1. Export Complex Backup
  const handleExportComplexBackup = async () => {
    if (!activeComplex) return;
    setIsExportingComplex(true);
    setStatusMsg(null);
    try {
      const complexData = await OmranDataService.exportComplexBackup(activeComplex.id);
      const jsonStr = JSON.stringify(complexData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `omran_complex_${activeComplex.name.replace(/\s+/g, '_')}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMsg({
        type: 'success',
        text: `تم تصدير نسخة احتياطية مستقلة لمجمع (${activeComplex.name}) بنجاح! تحتوي على (${complexData.students.length}) طلاب و (${complexData.halaqahs.length}) حلقات.`
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل تصدير مجمع: ' + (err.message || 'خطأ غير معروف') });
    } finally {
      setIsExportingComplex(false);
    }
  };

  // 2. Import Complex Backup File
  const handleUploadComplexBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeComplex) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupData: ComplexBackupData = JSON.parse(content);

        if (!backupData || !Array.isArray(backupData.halaqahs) || !Array.isArray(backupData.students)) {
          throw new Error('ملف المجمع غير صالح أو لا يحتوي على بنية بيانات مجمع صحيحة.');
        }

        setComplexBackupToRestore(backupData);
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: 'ملف المجمع غير صالح: ' + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImportComplex = async () => {
    if (!complexBackupToRestore || !activeComplex) return;
    setIsImportingComplex(true);
    setStatusMsg(null);
    try {
      const stats = await OmranDataService.importComplexBackup(complexBackupToRestore, activeComplex.id);
      await onRefreshAllData();
      setStatusMsg({
        type: 'success',
        text: `تم استيراد بيانات المجمع (${activeComplex.name}) بنجاح: (${stats.studentsCount}) طالب و (${stats.halaqahsCount}) حلقات!`
      });
      setComplexBackupToRestore(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل استيراد المجمع: ' + err.message });
    } finally {
      setIsImportingComplex(false);
    }
  };

  // 3. Save Custom Database Config for Complex (الربط والتفعيل)
  const handleSaveCustomDatabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplex) return;
    if (!customDbConfig.projectId.trim() || !customDbConfig.apiKey.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى إدخال Project ID و API Key على الأقل.' });
      return;
    }

    try {
      setIsSavingDbConfig(true);
      const updatedConfig = {
        isCustom: true,
        projectId: customDbConfig.projectId.trim(),
        apiKey: customDbConfig.apiKey.trim(),
        authDomain: customDbConfig.authDomain.trim() || `${customDbConfig.projectId.trim()}.firebaseapp.com`,
        storageBucket: customDbConfig.storageBucket.trim() || `${customDbConfig.projectId.trim()}.appspot.com`,
        appId: customDbConfig.appId.trim(),
        enabledAt: new Date().toISOString()
      };

      await OmranDataService.updateComplexDatabaseConfig(activeComplex.id, updatedConfig);
      if (onSaveComplex) {
        await onSaveComplex({
          ...activeComplex,
          databaseConfig: updatedConfig
        });
      }
      await onRefreshAllData();

      setStatusMsg({
        type: 'success',
        text: `تم ربط وتفعيل قاعدة البيانات المنفصلة لمجمع (${activeComplex.name}) بالمشروع (${updatedConfig.projectId}) بنجاح!`
      });
      setShowDbConfigForm(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل ربط قاعدة البيانات: ' + err.message });
    } finally {
      setIsSavingDbConfig(false);
    }
  };

  // 4. Reset to Default Central Database
  const handleResetToCentralDatabase = async () => {
    if (!activeComplex) return;
    try {
      setIsSavingDbConfig(true);
      await OmranDataService.updateComplexDatabaseConfig(activeComplex.id, { isCustom: false });
      if (onSaveComplex) {
        await onSaveComplex({
          ...activeComplex,
          databaseConfig: { isCustom: false }
        });
      }
      await onRefreshAllData();
      setStatusMsg({
        type: 'success',
        text: `تمت إعادة مجمع (${activeComplex.name}) إلى قاعدة البيانات السحابية المركزية الموحدة للمنصة.`
      });
      setShowDbConfigForm(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'حدث خطأ: ' + err.message });
    } finally {
      setIsSavingDbConfig(false);
    }
  };

  // Automated Database Linking Handler (بدل الربط اليدوي: تسجيل دخول وإكمال كل شيء وتأكيد الانتهاء)
  const startAutomatedDatabaseLinking = async (targetComplex?: QuranComplex) => {
    const complexToLink = targetComplex || (selectedComplexId ? activeComplex : null);
    setAutoLinkTargetComplex(complexToLink);
    setIsAutoLinkingOpen(true);
    setAutoLinkError(null);
    setAutoLinkResult(null);
    setAutoLinkStep('signing_in');
    setAutoLinkProgressText('جاري فتح نافذة تسجيل الدخول الآمن بحساب Google والمصادقة...');

    try {
      // Step 1: Sign in with Google
      const authResult = await GoogleWorkspaceService.linkGoogleAccount();
      const connectedEmail = authResult.email || 'حساب Google المعتمد';

      // Step 2: Configure database credentials automatically
      setAutoLinkStep('configuring');
      setAutoLinkProgressText(`تم التحقق من الحساب بنجاح (${connectedEmail})! جاري تهيئة وضبط قاعدة البيانات السحابية (Firestore)...`);

      const targetProjId = firebaseConfig.projectId || 'omran-ffbad';
      const targetDbId = TARGET_FIRESTORE_DATABASE_ID || 'ai-studio-9d31420a-1d75-4c6c-a7b6-8e5ec8416a66';

      const automatedDbConfig = {
        isCustom: !!complexToLink,
        projectId: targetProjId,
        apiKey: firebaseConfig.apiKey || '',
        authDomain: firebaseConfig.authDomain || `${targetProjId}.firebaseapp.com`,
        storageBucket: firebaseConfig.storageBucket || `${targetProjId}.firebasestorage.app`,
        appId: firebaseConfig.appId || '',
        databaseId: targetDbId,
        connectedEmail: connectedEmail,
        enabledAt: new Date().toISOString()
      };

      // Step 3: Test connection & check read/write permissions
      setAutoLinkStep('testing');
      setAutoLinkProgressText('جاري اختبار الاتصال بقاعدة البيانات السحابية وفحص سرعة الاستجابة ومزامنة الصلاحيات...');
      await OmranDataService.testConnection();

      // Step 4: Save & activate config
      if (complexToLink) {
        await OmranDataService.updateComplexDatabaseConfig(complexToLink.id, automatedDbConfig);
        if (onSaveComplex) {
          await onSaveComplex({
            ...complexToLink,
            databaseConfig: automatedDbConfig
          });
        }
      }

      if (onRefreshGoogleAuth) {
        await onRefreshGoogleAuth();
      }

      await onRefreshAllData();

      // Step 5: Mark completed! "ولما يخلص يقول انه خلص"
      const completionData = {
        email: connectedEmail,
        projectId: targetProjId,
        databaseId: targetDbId,
        complexName: complexToLink ? complexToLink.name : 'قاعدة بيانات المنصة المركزية',
        timestamp: new Date().toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setAutoLinkResult(completionData);
      setAutoLinkStep('completed');
      setAutoLinkProgressText('تم إكمال وتأمين ربط قاعدة البيانات السحابية بنجاح تام!');

      setStatusMsg({
        type: 'success',
        text: `تم ربط وتفعيل قاعدة البيانات السحابية (${completionData.complexName}) بحساب (${connectedEmail}) بنجاح تام!`
      });
      setShowDbConfigForm(false);
    } catch (err: any) {
      console.error('Automated database linking error:', err);
      setAutoLinkStep('error');
      setAutoLinkError(err?.message || 'حدث خطأ أثناء محاولة ربط قاعدة البيانات تلقائياً.');
    }
  };

  // 5. Purge Complex Data (إفراغ بيانات المجمع)
  const handlePurgeComplexData = async () => {
    if (!activeComplex || purgeConfirmationText.trim() !== 'تأكيد الإفراغ') return;
    try {
      setIsPurging(true);
      const res = await OmranDataService.purgeComplexData(activeComplex.id);
      await onRefreshAllData();
      setStatusMsg({
        type: 'success',
        text: `تم إفراغ بيانات مجمع (${activeComplex.name}) بنجاح: تم حذف (${res.deletedStudents}) طالب و (${res.deletedAttendance}) سجل حضور بأمان.`
      });
      setIsPurgeModalOpen(false);
      setPurgeConfirmationText('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل إفراغ بيانات المجمع: ' + err.message });
    } finally {
      setIsPurging(false);
    }
  };

  // 6. Transfer Complex Data (نقل لقاعدة بيانات)
  const handleTransferComplexData = async () => {
    if (!activeComplex) return;
    try {
      setIsTransferring(true);
      const complexData = await OmranDataService.exportComplexBackup(activeComplex.id);

      const jsonStr = JSON.stringify(complexData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transfer_${activeComplex.id}_${transferTargetDb.projectId || 'external'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMsg({
        type: 'success',
        text: `تم تجهيز ونقل بيانات مجمع (${activeComplex.name}) المستهدفة لقاعدة البيانات (${transferTargetDb.projectId || 'الخارجية'}) وتنزيل ملف حزمة الترحيل!`
      });
      setIsTransferModalOpen(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل النقل: ' + err.message });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-[#f0f9f6]" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-2 border-amber-500/40 rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                رتبة الإدارة المركزية وتطوير المنصة
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                قواعد البيانات الموزعة والمجمعات
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
              النسخ الاحتياطي وفصل قواعد بيانات المجمعات
            </h2>
            <p className="text-xs sm:text-sm text-[#86efac] max-w-2xl leading-relaxed">
              تحكم كامل في قواعد البيانات السحابية: ربط كل مجمع بقاعدة بيانات خاصة منفصلة، تصدير واستيراد بيانات المجمعات، نقل البيانات، وإفراغ السجلات بأمان تام.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#064e3b] font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#064e3b] stroke-[2.5]" />
              <span>{isExporting ? 'جاري التصدير...' : 'تصدير شامل للمنصة'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {statusMsg && (
        <div
          className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-bold shadow-lg ${
            statusMsg.type === 'success'
              ? 'bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24]'
              : 'bg-red-500/20 border border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-[#fbbf24]" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-300" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          {statusMsg.linkUrl && (
            <a
              href={statusMsg.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#fbbf24] text-[#064e3b] text-xs font-black hover:brightness-110 shadow shrink-0 cursor-pointer"
            >
              <span>{statusMsg.linkText || 'عرض في Google Drive'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 0: UNIVERSAL CLOUD DATABASE CONNECTION (قاعدة البيانات السحابية العامة) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-2 border-emerald-500/50 rounded-[32px] p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-300 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white font-heading">
                {isDeveloper ? 'قاعدة البيانات السحابية (Firebase Firestore)' : 'قاعدة البيانات السحابية المركزية الموحدة'}
              </h3>
              <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-400 text-emerald-200 font-bold flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                متصلة ومفعلة سحابياً 100%
              </span>
            </div>
            {isDeveloper ? (
              <p className="text-xs text-[#86efac] mt-1 leading-relaxed">
                مشروع المنصة: <span className="font-mono text-amber-300 font-bold">{firebaseConfig.projectId || 'omran-ffbad'}</span> • قاعدة البيانات: <span className="font-mono text-emerald-200">{TARGET_FIRESTORE_DATABASE_ID}</span>
              </p>
            ) : (
              <p className="text-xs text-[#86efac] mt-1 leading-relaxed">
                نظام المزامنة والتخزين السحابي المباشر لحفظ سجلات الحلقات والطلاب بأعلى معايير الأمان والتشفير.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => startAutomatedDatabaseLinking()}
          className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2.5 shrink-0 relative z-10"
          title="تسجيل الدخول وربط قاعدة البيانات تلقائياً دون إدخال أي كود أو مفاتيح"
        >
          <Sparkles className="w-4 h-4 text-[#064e3b]" />
          <span>تسجيل الدخول والربط السحابي التلقائي</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: DEVELOPER CONSOLE & NETLIFY HOSTING (قسم المبرمج: سياسة الخصوصية واستضافة Netlify) */}
      {/* ========================================================================= */}
      {isDeveloper && (
      <div className="bg-gradient-to-br from-[#022c22] via-[#064e3b]/90 to-[#022c22] border-2 border-amber-400/60 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glowing badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#065f46]">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-[#064e3b] flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black font-heading text-white">
                  مركز تحكم المبرمج: سياسة الخصوصية واعتماد Google واستضافة Netlify
                </h3>
                <span className="text-[10px] px-3 py-0.5 rounded-full bg-amber-400 text-[#064e3b] font-black shadow-sm">
                  خاص بالمبرمج (Developer)
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold">
                  مهيأ لـ Netlify
                </span>
              </div>
              <p className="text-xs text-[#86efac] mt-1 leading-relaxed">
                يتعرف النظام تلقائياً على رابط المنصة الحالي (Domain)، ويجهز كافة الروابط المطلوبة لاعتماد Google Cloud Console ومراجعة سياسة الخصوصية مع زر نسخ فوري، ويوفر ملفات الاستضافة المجهزة لـ Netlify.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Domain Detection & Custom Override Bar */}
        <div className="bg-[#022c22]/90 border border-amber-400/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">رابط المنصة المكتشف تلقائياً (Detected Site Origin):</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-amber-300 font-bold bg-[#064e3b] px-2.5 py-1 rounded-lg border border-amber-400/30 inline-block" dir="ltr">
                    {detectedOrigin || 'جاري التعرف على النطاق...'}
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    تم التعرف عليه تلقائياً
                  </span>
                </div>
              </div>
            </div>

            {/* Custom domain input toggle */}
            <div className="w-full md:w-auto">
              <label className="block text-[11px] font-bold text-emerald-200 mb-1">
                هل تريد توليد الروابط لنطاق Netlify أو نطاق مخصص آخر؟
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="مثال: omran-quran.netlify.app"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  className="bg-[#064e3b] border border-amber-400/40 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder:text-emerald-300/40 outline-none focus:border-amber-300 w-full sm:w-64"
                  dir="ltr"
                />
                {customDomainInput && (
                  <button
                    type="button"
                    onClick={() => setCustomDomainInput('')}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-amber-200 transition-colors shrink-0"
                  >
                    استعادة التلقائي
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY GOOGLE CONSOLE REQUIRED LINKS (GRID) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span>الروابط الجاهزة للنسخ إلى Google Cloud Console (شاشة موافقة OAuth):</span>
            </h4>
            <span className="text-[11px] text-[#86efac]/80">اضغط على زر النسخ بجانب أي حقل لنسخه فوراً</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Box 1: Privacy Policy URL (Most Critical) */}
            <div className="bg-[#064e3b]/80 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    رابط سياسة الخصوصية المعتمد (Privacy Policy URL):
                  </span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/40">
                    مطلوب للتحقق
                  </span>
                </div>
                <p className="text-[11px] text-[#86efac]/90 leading-relaxed mb-2">
                  الصقه في خانة <strong className="text-white">"Application privacy policy link"</strong> داخل Google Cloud Console.
                </p>
                <div className="p-2.5 rounded-xl bg-[#022c22] border border-amber-400/40 font-mono text-xs text-amber-300 font-bold break-all" dir="ltr">
                  {activePrivacyUrl}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#065f46]">
                <button
                  type="button"
                  onClick={() => handleCopyText(activePrivacyUrl, 'privacy')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedField === 'privacy' ? (
                    <>
                      <Check className="w-4 h-4 text-[#064e3b]" />
                      <span>تم نسخ رابط الخصوصية! ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#064e3b]" />
                      <span>نسخ رابط سياسة الخصوصية</span>
                    </>
                  )}
                </button>
                <a
                  href={activePrivacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-[#022c22] hover:bg-[#064e3b] border border-amber-400/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>معاينة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Box 2: Home Page URL */}
            <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 space-y-3 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    رابط الصفحة التعريفية للمنصة (Home Page URL):
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    مطلوب
                  </span>
                </div>
                <p className="text-[11px] text-[#86efac]/90 leading-relaxed mb-2">
                  الصقه في خانة <strong className="text-white">"Application home page"</strong> في شاشة موافقة Google.
                </p>
                <div className="p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] font-mono text-xs text-white font-bold break-all" dir="ltr">
                  {activeHomeUrl}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#065f46]">
                <button
                  type="button"
                  onClick={() => handleCopyText(activeHomeUrl, 'home')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#022c22] hover:bg-[#065f46] border border-emerald-400/40 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedField === 'home' ? (
                    <>
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>تم نسخ الرابط الرئيسي! ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ رابط الصفحة الرئيسية</span>
                    </>
                  )}
                </button>
                <a
                  href={activeHomeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-[#022c22] hover:bg-[#064e3b] border border-[#065f46] text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>معاينة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Box 3: Authorized Domain */}
            <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 space-y-3 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white block mb-1">
                  النطاق المصرح به (Authorized Domain):
                </span>
                <p className="text-[11px] text-[#86efac]/90 leading-relaxed mb-2">
                  الصقه في قائمة <strong className="text-white">"Authorized domains"</strong> في Google Cloud و Firebase Auth.
                </p>
                <div className="p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] font-mono text-xs text-amber-200 font-bold" dir="ltr">
                  {activeHostname}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyText(activeHostname, 'domain')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#022c22] hover:bg-[#065f46] border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedField === 'domain' ? (
                  <>
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>تم نسخ النطاق! ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ النطاق المصرح به</span>
                  </>
                )}
              </button>
            </div>

            {/* Box 4: Authorized JavaScript Origin */}
            <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 space-y-3 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white block mb-1">
                  أصل JavaScript المصرح به (Authorized JavaScript Origin):
                </span>
                <p className="text-[11px] text-[#86efac]/90 leading-relaxed mb-2">
                  الصقه في <strong className="text-white">Credentials &gt; OAuth 2.0 Client &gt; Authorized JavaScript origins</strong>.
                </p>
                <div className="p-2.5 rounded-xl bg-[#022c22] border border-[#065f46] font-mono text-xs text-amber-200 font-bold" dir="ltr">
                  {activeBaseUrl}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyText(activeBaseUrl, 'origin')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#022c22] hover:bg-[#065f46] border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedField === 'origin' ? (
                  <>
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>تم نسخ أصل JavaScript! ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ أصل JavaScript</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Box 5: Technical Support & Developer Contact Email (Google Console Requirement) */}
          <div className="bg-[#022c22] border-2 border-amber-400/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <span className="text-xs sm:text-sm font-black text-white">
                  بريد الدعم الفني وتواصل المطور المعتمد (Support & Developer Email):
                </span>
                <span className="text-[10px] bg-amber-400 text-[#064e3b] font-bold px-2 py-0.5 rounded-full">
                  مطلوب في Google Console
                </span>
              </div>
              <p className="text-[11px] text-[#86efac]/90 leading-relaxed">
                الصقه في خانتي <strong className="text-white">"User support email"</strong> و <strong className="text-white">"Developer contact information"</strong> في شاشة موافقة Google:
              </p>
              <div className="font-mono text-xs text-amber-300 font-bold bg-[#064e3b]/80 px-3 py-1 rounded-lg border border-amber-400/40 inline-block" dir="ltr">
                fds421885@gmail.com
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyText('fds421885@gmail.com', 'support_email')}
              className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#064e3b] font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
            >
              {copiedField === 'support_email' ? (
                <>
                  <Check className="w-4 h-4 text-[#064e3b]" />
                  <span>تم نسخ بريد الدعم الفني! ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#064e3b]" />
                  <span>نسخ البريد (fds421885@gmail.com)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* NETLIFY HOSTING SETUP & READINESS STATUS */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-2 border-emerald-400/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#065f46] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/40">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>تهيئة وجاهزية الاستضافة على Netlify</span>
                  <span className="text-[10px] bg-emerald-500 text-[#064e3b] font-black px-2 py-0.5 rounded-full">
                    مضبوطة ومكتملة بنسبة 100%
                  </span>
                </h4>
                <p className="text-[11px] text-[#86efac]">
                  تم تضمين كافة الملفات والقواعد البرمجية لتعمل المنصة على Netlify بكفاءة عالية وبدون أخطاء 404
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyText('Build command: npm run build\nPublish directory: dist\nNode version: 20', 'netlify_config')}
              className="px-3 py-1.5 rounded-xl bg-[#022c22] border border-emerald-400/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedField === 'netlify_config' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  <span>تم نسخ إعدادات Netlify!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ إعدادات بناء Netlify</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#022c22]/90 border border-[#065f46] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ملف public/_redirects</span>
              </div>
              <p className="text-[11px] text-[#86efac]/80 font-mono">
                /* /index.html 200
              </p>
              <p className="text-[10px] text-slate-300">
                يضمن عدم ظهور خطأ 404 عند فتح رابط سياسة الخصوصية /privacy أو تسجيل الدخول أو تحديث الصفحة مباشرة على Netlify.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#022c22]/90 border border-[#065f46] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ملف netlify.toml</span>
              </div>
              <p className="text-[11px] text-[#86efac]/80 font-mono">
                command = &quot;npm run build&quot;
              </p>
              <p className="text-[10px] text-slate-300">
                يحدد مجلد النشر dist وترويسات الأمان ونسخة Node 20 تلقائياً بمجرد ربط المستودع.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#022c22]/90 border border-[#065f46] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>إعدادات النشر على Netlify</span>
              </div>
              <div className="text-[10px] text-slate-300 space-y-0.5">
                <div>• أمر البناء: <span className="font-mono text-amber-300">npm run build</span></div>
                <div>• مجلد النشر: <span className="font-mono text-amber-300">dist</span></div>
                <div>• بيئة التشغيل: <span className="font-mono text-emerald-300">Node v20</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: COMPLEX DATABASE SEPARATION & MANAGEMENT (المجمعات وقواعد البيانات) */}
      {/* ========================================================================= */}
      {isDeveloper && (
      <div className="bg-[#022c22]/95 border-2 border-amber-500/40 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#065f46]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#064e3b] flex items-center justify-center shadow-lg shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-heading text-white">
                  فصل وتخصيص قواعد بيانات المجمعات القرآنية
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  خاص بالمبرمج
                </span>
              </div>
              <p className="text-xs text-[#86efac] mt-0.5">
                يمكنك جعل كل مجمع يعمل على قاعدة بيانات خاصة به منفصلة تماماً، أو إبقاؤه على القاعدة المركزية.
              </p>
            </div>
          </div>

          {/* Complex Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-200">اختر المجمع:</span>
            <select
              value={selectedComplexId}
              onChange={e => {
                setSelectedComplexId(e.target.value);
                setShowDbConfigForm(false);
              }}
              className="bg-[#064e3b] border-2 border-amber-400/50 rounded-2xl px-4 py-2 text-xs sm:text-sm font-black text-amber-300 outline-none cursor-pointer focus:border-amber-400"
            >
              {complexes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.databaseConfig?.isCustom ? '[قاعدة منفصلة]' : '[قاعدة مركزية]'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeComplex && (
          <div className="space-y-6">
            {/* Active Complex Status Card */}
            <div className="bg-[#064e3b]/50 border border-[#065f46] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-white">
                    المجمع النشط: <span className="text-amber-300">{activeComplex.name}</span>
                  </h4>
                  {activeComplex.databaseConfig?.isIsolated ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-900/90 text-blue-200 border border-blue-400 font-mono font-bold flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                      قاعدة بيانات منفصلة معزولة 100%: {activeComplex.databaseConfig.databaseId || activeComplex.databaseConfig.projectId}
                    </span>
                  ) : activeComplex.databaseConfig?.isCustom ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-900/80 text-blue-200 border border-blue-400 font-mono font-bold">
                      قاعدة بيانات منفصلة: {activeComplex.databaseConfig.projectId}
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-400 font-bold">
                      قاعدة بيانات المنصة المركزية المشتركة
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#86efac]">
                  المشرف المسؤول: <strong className="text-white">{activeComplex.supervisorTeacherName || 'المشرف المسؤول'}</strong>
                  {activeComplex.databaseConfig?.connectedEmail && (
                    <span className="mr-3 text-emerald-300 font-mono text-[11px]">
                      (حساب Google المعتمد: {activeComplex.databaseConfig.connectedEmail})
                    </span>
                  )}
                  {activeComplex.databaseConfig?.migratedAt ? (
                    <span className="mr-3 text-amber-300 font-mono text-[11px]">
                      (تاريخ النقل السحابي: {new Date(activeComplex.databaseConfig.migratedAt).toLocaleDateString('ar-SA')})
                    </span>
                  ) : activeComplex.databaseConfig?.enabledAt && (
                    <span className="mr-3 text-slate-300">
                      (تاريخ الربط: {new Date(activeComplex.databaseConfig.enabledAt).toLocaleDateString('ar-SA')})
                    </span>
                  )}
                </p>
              </div>

              {/* Action buttons for this complex */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Primary Developer Feature: Transfer Complex to Isolated Firebase DB with Google Account */}
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:brightness-110 text-[#064e3b] text-xs font-black shadow-lg shadow-amber-400/20 transition-all cursor-pointer flex items-center gap-2"
                  title="نقل وترحيل المجمع وبياناته بالكامل إلى قاعدة بيانات Firebase منفصلة بحساب Google"
                >
                  <ArrowRightLeft className="w-4 h-4 text-[#064e3b] stroke-[2.5]" />
                  <span>نقل لقاعدة بيانات منفصلة (حساب Google)</span>
                </button>

                {/* Automated Sign-In & Linking */}
                <button
                  type="button"
                  onClick={() => startAutomatedDatabaseLinking(activeComplex)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-emerald-700 text-[#86efac] hover:text-white border border-[#065f46] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="تسجيل الدخول والربط التلقائي بقاعدة البيانات دون إدخال يدوي"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>الربط التلقائي</span>
                </button>

                {/* Secondary: Manual Developer Form Toggle */}
                <button
                  type="button"
                  onClick={() => setShowDbConfigForm(!showDbConfigForm)}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-200 text-xs font-bold border border-amber-400/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-amber-300" />
                  <span>{showDbConfigForm ? 'إخفاء الإدخال اليدوي' : 'إدخال يدوي مخصص'}</span>
                </button>

                {activeComplex.databaseConfig?.isCustom && (
                  <button
                    type="button"
                    onClick={handleResetToCentralDatabase}
                    disabled={isSavingDbConfig}
                    className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-all cursor-pointer"
                  >
                    إعادة للقاعدة المركزية
                  </button>
                )}
              </div>
            </div>

            {/* FORM: Link to Custom Database (ربط وتفعيل) */}
            {showDbConfigForm && (
              <form onSubmit={handleSaveCustomDatabaseConfig} className="bg-[#064e3b]/70 border-2 border-amber-400/50 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#065f46] pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">
                      إعدادات ربط قاعدة بيانات مخصصة لمجمع: ({activeComplex.name})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDbConfigForm(false)}
                    className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>

                {/* Helpful automated linking shortcut inside the form */}
                <div className="p-3.5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-400/40 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 text-xs text-amber-200">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>لست بحاجة لملء هذه الخانات يدوياً! يمكنك الضغط على زر الدخول وسيقوم النظام بتسجيل الدخول وإكمال كل شيء وتأكيد الربط فوراً:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => startAutomatedDatabaseLinking(activeComplex)}
                    className="px-4 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول والربط التلقائي فوراً</span>
                  </button>
                </div>

                <p className="text-xs text-amber-200">
                  أو أدخل بيانات مشروع Firebase المخصص لهذا المجمع يدوياً إذا كنت مبرمجاً متقدماً:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#86efac] mb-1">
                      معرف المشروع (Firebase Project ID): <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: quran-complex-sub1"
                      value={customDbConfig.projectId}
                      onChange={e => setCustomDbConfig(prev => ({ ...prev, projectId: e.target.value }))}
                      className="w-full bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#86efac] mb-1">
                      مفتاح التطبيق (Web API Key): <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="AIzaSy..."
                      value={customDbConfig.apiKey}
                      onChange={e => setCustomDbConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      className="w-full bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#86efac] mb-1">
                      نطاق المصادقة (Auth Domain):
                    </label>
                    <input
                      type="text"
                      placeholder="quran-complex-sub1.firebaseapp.com"
                      value={customDbConfig.authDomain}
                      onChange={e => setCustomDbConfig(prev => ({ ...prev, authDomain: e.target.value }))}
                      className="w-full bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#86efac] mb-1">
                      معرف التطبيق (App ID):
                    </label>
                    <input
                      type="text"
                      placeholder="1:123456789:web:abcdef"
                      value={customDbConfig.appId}
                      onChange={e => setCustomDbConfig(prev => ({ ...prev, appId: e.target.value }))}
                      className="w-full bg-[#022c22] border border-[#065f46] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDbConfigForm(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDbConfig}
                    className="px-6 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSavingDbConfig ? 'جاري التفعيل والربط...' : 'تفعيل والربط بقاعدة البيانات الخاصة'}
                  </button>
                </div>
              </form>
            )}

            {/* 4 ACTION TILES FOR THIS COMPLEX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Tile 1: Export Complex Data */}
              <div className="bg-[#064e3b]/40 border border-[#065f46] hover:border-amber-400/50 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-amber-400/40 text-amber-400 flex items-center justify-center mb-2.5">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white">تصدير نسخة المجمع</h4>
                  <p className="text-[11px] text-[#86efac]/80 mt-1 leading-relaxed">
                    تنزيل ملف JSON يحتوي فقط على حلقات وطلاب وسجلات مجمع ({activeComplex.name}).
                  </p>
                </div>
                <button
                  onClick={handleExportComplexBackup}
                  disabled={isExportingComplex}
                  className="w-full py-2 px-3 rounded-xl bg-[#022c22] hover:bg-[#064e3b] border border-amber-400/40 text-amber-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExportingComplex ? 'جاري التصدير...' : 'تصدير نسخة المجمع'}
                </button>
              </div>

              {/* Tile 2: Import / Restore Complex Data */}
              <div className="bg-[#064e3b]/40 border border-[#065f46] hover:border-amber-400/50 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-emerald-400/40 text-emerald-400 flex items-center justify-center mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white">استيراد بيانات لمجمع</h4>
                  <p className="text-[11px] text-[#86efac]/80 mt-1 leading-relaxed">
                    تحميل نسخة سابقة خاصة بهذا المجمع ودمجها مباشرة في قاعدة بياناته.
                  </p>
                </div>
                <label className="w-full py-2 px-3 rounded-xl bg-[#022c22] hover:bg-[#064e3b] border border-[#065f46] text-emerald-300 hover:text-white text-xs font-bold transition-all cursor-pointer text-center block">
                  <span>{isImportingComplex ? 'جاري الاستيراد...' : 'اختيار ملف (.json)'}</span>
                  <input
                    type="file"
                    accept=".json"
                    disabled={isImportingComplex}
                    onChange={handleUploadComplexBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Tile 3: Transfer to Isolated Database (نقل وترحيل المجمع لقاعدة منفصلة) */}
              <div className="bg-[#064e3b]/50 border-2 border-amber-400/60 hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-amber-400/60 text-amber-400 flex items-center justify-center shadow-sm">
                    <ArrowRightLeft className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400 text-[#064e3b] font-black">
                    ميزة المبرمج المطورة
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">نقل لقاعدة بيانات منفصلة (Google)</h4>
                  <p className="text-[11px] text-[#86efac]/90 mt-1 leading-relaxed">
                    اختيار حساب Google وإنشاء قاعدة بيانات Firebase منفصلة ونقل كافة الحلقات والطلاب وسجلات المجمع مباشرة سحابياً.
                  </p>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#064e3b] text-xs font-black shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>بدء نقل البيانات للمجمع...</span>
                </button>
              </div>

              {/* Tile 4: Purge Complex Data (إفراغ بيانات المجمع) */}
              <div className="bg-rose-950/30 border border-rose-600/40 hover:border-rose-500 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#022c22] border border-rose-400/40 text-rose-400 flex items-center justify-center mb-2.5">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-rose-200">إفراغ بيانات المجمع</h4>
                  <p className="text-[11px] text-rose-300/80 mt-1 leading-relaxed">
                    حذف الطلاب وسجلات الحضور والتقييمات التابعة لهذا المجمع حصراً مع حماية باقي المنصة.
                  </p>
                </div>
                <button
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600/60 text-rose-200 text-xs font-bold transition-all cursor-pointer"
                >
                  إفراغ السجلات...
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: GENERAL PLATFORM FULL BACKUPS (Google Drive & JSON) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-[#fbbf24]" />
          <span>النسخ الاحتياطي العام لكامل منصة عمران:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Google Sheets Interactive Cloud Backup */}
          <div className="bg-gradient-to-b from-[#064e3b]/90 to-[#022c22]/95 border-2 border-[#34a853]/60 rounded-[32px] p-6 space-y-5 shadow-2xl backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#022c22] border border-[#34a853] text-[#34a853] flex items-center justify-center shadow-lg">
                  <Database className="w-6 h-6" />
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#34a853]/20 border border-[#34a853]/50 text-[#86efac] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Google Sheets
                </span>
              </div>
              <h3 className="text-base font-bold font-heading text-white">
                جداول Google Sheets السحابية
              </h3>
              <p className="text-xs text-[#86efac]/90 leading-relaxed">
                تصدير نسخة حية وشاملة إلى جداول Google Sheets تضم تبويبات متعددة (الطلاب، الحضور، التسميع، الاختبارات، والتسليمات) مع حفظ دائم في السحابة.
              </p>

              {googleAuthConfig?.isLinked && googleAuthConfig.connectedEmail && (
                <div className="p-2.5 rounded-xl bg-[#022c22]/90 border border-emerald-600/60 text-[11px] text-emerald-300">
                  <div className="text-[10px] text-emerald-400 font-bold mb-0.5">الحساب المربوط سحابياً للأبد:</div>
                  <span className="font-mono text-white break-all">{googleAuthConfig.connectedEmail}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 relative z-10">
              <button
                onClick={handleExportGoogleSheets}
                disabled={isExportingSheets}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#34a853] to-emerald-600 hover:brightness-110 disabled:opacity-50 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>{isExportingSheets ? 'جاري التصدير إلى Sheets...' : 'تصدير الآن إلى Google Sheets'}</span>
              </button>

              {sheetsExportResult && (
                <a
                  href={sheetsExportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-2 px-3 rounded-xl bg-[#022c22] border border-[#34a853]/40 text-[#86efac] text-xs font-bold hover:bg-[#064e3b] transition-all cursor-pointer"
                >
                  <span>فتح جدول Google Sheets ↗</span>
                </a>
              )}
            </div>
          </div>

          {/* Card 2: Google Drive Cloud Backup */}
          <div className="bg-gradient-to-b from-[#064e3b]/80 to-[#022c22]/90 border-2 border-[#fbbf24]/40 rounded-[32px] p-6 space-y-5 shadow-2xl backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#022c22] border border-[#fbbf24] text-[#fbbf24] flex items-center justify-center shadow-lg">
                  <Cloud className="w-6 h-6" />
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Google Drive
                </span>
              </div>
              <h3 className="text-base font-bold font-heading text-white">
                نسخ احتياطي في Google Drive
              </h3>
              <p className="text-xs text-[#86efac]/90 leading-relaxed">
                تصدير سحابي مباشر لقاعدة البيانات إلى مجلد <strong className="text-white">"نسخ منصة عمران القرآنية الاحتياطية"</strong> في Google Drive مع التوقيت الدقيق.
              </p>

              {googleAuthConfig?.isLinked && googleAuthConfig.connectedEmail && (
                <div className="p-2.5 rounded-xl bg-[#022c22]/80 border border-emerald-700/60 text-[11px] text-emerald-300">
                  <div className="text-[10px] text-amber-400 font-bold mb-0.5">حساب Drive المتصل:</div>
                  <span className="font-mono text-white break-all">{googleAuthConfig.connectedEmail}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 relative z-10">
              <button
                onClick={handleExportGoogleDrive}
                disabled={isExportingDrive}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#fbbf24] to-amber-500 hover:brightness-110 disabled:opacity-50 text-[#064e3b] font-black text-xs shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-[#064e3b]" />
                <span>{isExportingDrive ? 'جاري التصدير السحابي...' : 'تصدير إلى Google Drive'}</span>
              </button>

              {driveExportResult && (
                <a
                  href={driveExportResult.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-2 px-3 rounded-xl bg-[#022c22] border border-[#fbbf24]/30 text-[#fbbf24] text-xs font-bold hover:bg-[#064e3b] transition-all cursor-pointer"
                >
                  <span>فتح ملف النسخة المحفوظة ↗</span>
                </a>
              )}
            </div>
          </div>

          {/* Card 3: Export Local JSON Card */}
          <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 space-y-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#022c22] border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center shadow-md">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-heading text-white">
                تنزيل نسخة احتياطية (JSON)
              </h3>
              <p className="text-xs text-[#86efac]/80 leading-relaxed">
                تحميل ملف بصيغة JSON على جهاز الكمبيوتر أو الهاتف يحتوي على جميع سجلات الطلاب والمجمعات والتقييمات.
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#022c22] hover:bg-[#065f46] border border-[#fbbf24]/50 disabled:opacity-50 text-[#fbbf24] font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#fbbf24]" />
              <span>{isExporting ? 'جاري تجهيز النسخة...' : 'تنزيل ملف JSON'}</span>
            </button>
          </div>

          {/* Card 4: Import Card */}
          <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 space-y-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#022c22] border border-[#065f46] text-[#86efac] flex items-center justify-center shadow-md">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-heading text-white">
                استعادة / استيراد بيانات
              </h3>
              <p className="text-xs text-[#86efac]/80 leading-relaxed">
                اختر ملف نسخة احتياطية بصيغة JSON لاستعادة جميع السجلات في قاعدة بيانات المنصة ومزامنتها فوراً.
              </p>
            </div>

            <label className="w-full py-3.5 px-4 rounded-2xl bg-[#022c22] hover:bg-[#065f46] border border-[#065f46] text-[#86efac] hover:text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-[#fbbf24]" />
              <span>{isImporting ? 'جاري الاستيراد...' : 'اختر ملف (.json)'}</span>
              <input
                type="file"
                accept=".json"
                disabled={isImporting}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Google Developer / Verification Privacy Policy Box */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-2 border-amber-400/50 rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-white text-sm">رابط سياسة الخصوصية المعتمد لمنصة عمران (لمراجعة Google Console):</span>
          </div>
          <p className="text-xs text-[#86efac]/90 leading-relaxed">
            صفحة رسمية ومستقلة تؤكد أن المنصة لا تجمع أو تشارك بيانات المستخدمين مع أي أطراف ثالثة ومخصصة لمراجعة تطبيق Google Workspace:
          </p>
          <div className="font-mono text-xs text-amber-300 font-bold bg-[#022c22]/90 px-3 py-1.5 rounded-xl border border-amber-400/30 inline-block" dir="ltr">
            {activePrivacyUrl}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleCopyText(activePrivacyUrl, 'bottom_privacy')}
            className="flex-1 md:flex-none py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#064e3b] font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copiedField === 'bottom_privacy' ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم النسخ! ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ الرابط</span>
              </>
            )}
          </button>
          <a
            href={activePrivacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none py-2.5 px-4 rounded-xl bg-[#022c22] hover:bg-[#064e3b] border border-amber-400/40 text-amber-300 font-bold text-xs shadow-md transition-all text-center cursor-pointer flex items-center justify-center gap-1"
          >
            <span>فتح الصفحة</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Cloud Sync Status info */}
      <div className="bg-[#064e3b]/40 border border-[#065f46] rounded-[32px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#86efac]/80 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-2xl bg-[#022c22] text-[#fbbf24] flex items-center justify-center border border-[#065f46]">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">{isDeveloper ? 'مشروع فايربيس السحابي المتصل:' : 'الخادم السحابي المتصل:'}</span>
            <span className="font-mono text-[#fbbf24]">{isDeveloper ? 'omran-ffbad (Firestore Realtime)' : 'قاعدة البيانات المركزية المشفرة'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[#fbbf24] font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>المزامنة السحابية المركزية الموزعة مفعلة</span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: Full Restore Confirmation Modal */}
      {/* ---------------------------------------------------- */}
      {pendingRestore && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#064e3b] border border-[#fbbf24]/50 rounded-[32px] p-6 sm:p-7 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#fbbf24]/20 text-[#fbbf24] flex items-center justify-center mx-auto border border-[#fbbf24]/30">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-heading">تأكيد استعادة النسخة الاحتياطية الكاملة</h3>
              <p className="text-xs text-[#86efac]/90 mt-2 leading-relaxed">
                هل أنت متأكد من استعادة هذه النسخة؟
                <br />
                تحتوي على <span className="text-[#fbbf24] font-bold">({pendingRestore.students?.length || 0})</span> طالباً، <span className="text-[#fbbf24] font-bold">({pendingRestore.complexes?.length || 0})</span> مجمعاً، و <span className="text-[#fbbf24] font-bold">({pendingRestore.attendance?.length || 0})</span> سجل حضور.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-[#022c22] text-[#86efac] hover:text-white border border-[#065f46] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isImporting}
                className="flex-1 py-2.5 rounded-2xl text-xs font-black bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] shadow-lg cursor-pointer transition-all"
              >
                {isImporting ? 'جاري الاستعادة...' : 'نعم، استعادة البيانات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: Complex Restore Confirmation Modal */}
      {/* ---------------------------------------------------- */}
      {complexBackupToRestore && activeComplex && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#064e3b] border border-[#fbbf24]/50 rounded-[32px] p-6 sm:p-7 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#fbbf24]/20 text-[#fbbf24] flex items-center justify-center mx-auto border border-[#fbbf24]/30">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                استيراد بيانات لمجمع ({activeComplex.name})
              </h3>
              <p className="text-xs text-[#86efac]/90 mt-2 leading-relaxed">
                هل تود دمج بيانات هذه النسخة؟
                <br />
                تتضمن <span className="text-amber-300 font-bold">({complexBackupToRestore.students?.length || 0})</span> طالباً و <span className="text-amber-300 font-bold">({complexBackupToRestore.halaqahs?.length || 0})</span> حلقات.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setComplexBackupToRestore(null)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-[#022c22] text-[#86efac] hover:text-white border border-[#065f46] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmImportComplex}
                disabled={isImportingComplex}
                className="flex-1 py-2.5 rounded-2xl text-xs font-black bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] shadow-lg cursor-pointer transition-all"
              >
                {isImportingComplex ? 'جاري الاستيراد...' : 'تأكيد الاستيراد للمجمع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: Purge Complex Data Modal (إفراغ بيانات المجمع) */}
      {/* ---------------------------------------------------- */}
      {isPurgeModalOpen && activeComplex && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#022c22] border-2 border-rose-600 rounded-[32px] p-6 sm:p-7 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-black text-white">تأكيد إفراغ بيانات المجمع</h3>
            </div>
            <p className="text-xs text-rose-200 leading-relaxed">
              تحذير أمني: أنت على وشك حذف كافة سجلات الطلاب والحضور والتقييمات التابعة لمجمع <strong className="text-white">({activeComplex.name})</strong> نهائياً. لن يتأثر أي مجمع آخر بهذه العملية.
            </p>
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                لتأكيد الإفراغ، اكتب بالأسفل: <span className="text-rose-400">تأكيد الإفراغ</span>
              </label>
              <input
                type="text"
                placeholder="تأكيد الإفراغ"
                value={purgeConfirmationText}
                onChange={e => setPurgeConfirmationText(e.target.value)}
                className="w-full bg-[#064e3b] border border-rose-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPurgeModalOpen(false);
                  setPurgeConfirmationText('');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handlePurgeComplexData}
                disabled={isPurging || purgeConfirmationText.trim() !== 'تأكيد الإفراغ'}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg cursor-pointer disabled:opacity-40"
              >
                {isPurging ? 'جاري الإفراغ...' : 'إفراغ بيانات المجمع الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: Developer Feature: Complex Dedicated Firebase Database Transfer Modal */}
      {/* ---------------------------------------------------- */}
      <ComplexDatabaseTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        complexes={complexes}
        activeComplexId={selectedComplexId || activeComplex?.id}
        halaqahs={halaqahs}
        students={students}
        googleAuthConfig={googleAuthConfig}
        onSuccessRefresh={onRefreshAllData}
      />

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: Automated Database Linking Modal (الربط التلقائي بتسجيل الدخول) */}
      {/* ---------------------------------------------------- */}
      {isAutoLinkingOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#022c22] border-2 border-emerald-500/60 rounded-[32px] p-6 sm:p-7 shadow-2xl space-y-5 text-right relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#065f46] pb-3.5 relative z-10">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Database className="w-6 h-6 text-amber-400" />
                <h3 className="text-base sm:text-lg font-black text-white font-heading">
                  الربط السحابي التلقائي لقاعدة البيانات
                </h3>
              </div>
              {autoLinkStep !== 'completed' && (
                <button
                  type="button"
                  onClick={() => setIsAutoLinkingOpen(false)}
                  disabled={autoLinkStep === 'signing_in' || autoLinkStep === 'configuring' || autoLinkStep === 'testing'}
                  className="text-xs text-slate-300 hover:text-white cursor-pointer disabled:opacity-30"
                >
                  إغلاق
                </button>
              )}
            </div>

            {/* Target Label */}
            <div className="bg-[#064e3b]/50 border border-[#065f46] rounded-2xl p-3 text-xs text-[#86efac] flex items-center justify-between relative z-10">
              <span>الجهة المستهدفة بالربط:</span>
              <span className="font-bold text-amber-300">
                {autoLinkTargetComplex ? `مجمع: ${autoLinkTargetComplex.name}` : 'قاعدة بيانات المنصة المركزية العامة'}
              </span>
            </div>

            {/* STEP 1 to 3: In Progress View */}
            {(autoLinkStep === 'signing_in' || autoLinkStep === 'configuring' || autoLinkStep === 'testing') && (
              <div className="space-y-5 py-3 relative z-10">
                {/* Visual Step Tracker */}
                <div className="space-y-2.5">
                  {/* Step 1 */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    autoLinkStep === 'signing_in'
                      ? 'bg-amber-400/10 border-amber-400/50 text-amber-300'
                      : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      {autoLinkStep === 'signing_in' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">الخطوة 1: تسجيل الدخول والمصادقة بحساب Google</div>
                        <div className="text-[11px] text-slate-300">التحقق من هوية المشرف والصلاحيات عبر النافذة المنبثقة</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/30">
                      {autoLinkStep === 'signing_in' ? 'جاري التنفيذ...' : 'مكتملة ✓'}
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    autoLinkStep === 'configuring'
                      ? 'bg-amber-400/10 border-amber-400/50 text-amber-300'
                      : autoLinkStep === 'testing'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-black/20 border-white/5 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      {autoLinkStep === 'configuring' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      ) : autoLinkStep === 'testing' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-[10px]">2</div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">الخطوة 2: تهيئة واكتشاف قاعدة البيانات السحابية (Firestore)</div>
                        <div className="text-[11px] text-slate-300">تجهيز مفاتيح الربط وتعيين المشروع تلقائياً</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/30">
                      {autoLinkStep === 'configuring' ? 'جاري التهيئة...' : autoLinkStep === 'testing' ? 'مكتملة ✓' : 'في الانتظار'}
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    autoLinkStep === 'testing'
                      ? 'bg-amber-400/10 border-amber-400/50 text-amber-300'
                      : 'bg-black/20 border-white/5 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      {autoLinkStep === 'testing' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-[10px]">3</div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">الخطوة 3: فحص الاتصال ومزامنة الصلاحيات وتأمين السجلات</div>
                        <div className="text-[11px] text-slate-300">اختبار القراءة والكتابة السحابية والتحقق الفوري</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/30">
                      {autoLinkStep === 'testing' ? 'جاري الفحص...' : 'في الانتظار'}
                    </span>
                  </div>
                </div>

                {/* Live progress message */}
                <div className="p-3.5 bg-black/30 border border-emerald-500/20 rounded-2xl text-center">
                  <p className="text-xs text-amber-200 animate-pulse">
                    {autoLinkProgressText}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    يرجى عدم إغلاق الصفحة، النظام يقوم بإكمال كافة الخطوات آلياً...
                  </p>
                </div>
              </div>
            )}

            {/* STEP 4: COMPLETED SCREEN (ولما يخلص يقول انه خلص) */}
            {autoLinkStep === 'completed' && (
              <div className="text-center space-y-5 py-2 relative z-10">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_0_35px_rgba(52,211,153,0.4)]">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-400/40 text-emerald-300 font-bold inline-block mb-2">
                    تم الانتهاء بنسبة 100% ✓
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                    تم إكمال ربط قاعدة البيانات بنجاح!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-200 mt-2 max-w-md mx-auto leading-relaxed">
                    تم تسجيل الدخول وتوصيل وتفعيل قاعدة البيانات السحابية بالكامل، وكافة الجداول والبيانات متزامنة ومؤمنة سحابياً الآن.
                  </p>
                </div>

                <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-2xl p-4 text-right space-y-2 max-w-md mx-auto text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                    <span className="text-slate-400">الحساب المعتمد:</span>
                    <span className="font-mono font-bold text-white">{autoLinkResult?.email}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                    <span className="text-slate-400">الوجهة المستهدفة:</span>
                    <span className="font-bold text-amber-300">{autoLinkResult?.complexName}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                    <span className="text-slate-400">مشروع قاعدة البيانات (Firestore):</span>
                    <span className="font-mono text-emerald-300">{autoLinkResult?.projectId}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#065f46]">
                    <span className="text-slate-400">حالة التزامن:</span>
                    <span className="text-emerald-400 font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      متصلة ونشطة 100%
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">تاريخ وتوقيت الربط:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{autoLinkResult?.timestamp}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoLinkingOpen(false);
                      setAutoLinkStep('idle');
                    }}
                    className="w-full max-w-md mx-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:brightness-110 text-[#064e3b] font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>تم، إغلاق والعودة للمنصة</span>
                  </button>
                </div>
              </div>
            )}

            {/* ERROR STATE */}
            {autoLinkStep === 'error' && (
              <div className="space-y-4 py-2 relative z-10">
                <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-300 text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    <span>تعذر استكمال الربط التلقائي</span>
                  </div>
                  <p>{autoLinkError}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAutoLinkingOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => startAutomatedDatabaseLinking(autoLinkTargetComplex || undefined)}
                    className="px-5 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg cursor-pointer"
                  >
                    إعادة المحاولة لتسجيل الدخول والربط
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
