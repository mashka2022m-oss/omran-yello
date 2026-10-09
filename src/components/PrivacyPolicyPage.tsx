import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  FileSpreadsheet,
  FileText,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Mail,
  UserCheck,
  AlertCircle,
  Database,
  Globe,
  Trash2,
  BellRing,
  RefreshCw,
  Languages
} from 'lucide-react';
import { motion } from 'motion/react';

interface PrivacyPolicyPageProps {
  onBackToHome: () => void;
  onGoToLogin?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onBackToHome,
  onGoToLogin
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeLang, setActiveLang] = useState<'ar' | 'en'>('ar');
  const currentFullUrl = typeof window !== 'undefined' ? `${window.location.origin}/privacy` : 'https://omran-quran.app/privacy';

  const handleCopyUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentFullUrl);
    }
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b] py-8 sm:py-12 px-4 sm:px-6 lg:px-8" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Decorative background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#064e3b]/80 border border-[#065f46] p-4 rounded-2xl backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowRight className={`w-4 h-4 ${activeLang === 'en' ? 'rotate-180' : ''}`} />
            <span>{activeLang === 'ar' ? 'الرجوع إلى الصفحة الرئيسية لمنظومة عُمْرَان' : 'Back to Omran Quran Platform Homepage'}</span>
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Language Switcher */}
            <div className="flex items-center bg-[#022c22] p-1 rounded-xl border border-[#065f46]">
              <button
                type="button"
                onClick={() => setActiveLang('ar')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === 'ar' ? 'bg-amber-400 text-[#064e3b] shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === 'en' ? 'bg-amber-400 text-[#064e3b] shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                English (Google Review)
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#022c22] border border-[#065f46] text-[#86efac] hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="نسخ رابط صفحة الخصوصية"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? (activeLang === 'ar' ? 'تم نسخ الرابط!' : 'URL Copied!') : (activeLang === 'ar' ? 'نسخ رابط الخصوصية' : 'Copy Policy URL')}</span>
            </button>

            {onGoToLogin && (
              <button
                type="button"
                onClick={onGoToLogin}
                className="px-4 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black transition-all cursor-pointer shadow-md"
              >
                {activeLang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
              </button>
            )}
          </div>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] border-2 border-amber-500/40 rounded-[32px] p-6 sm:p-10 shadow-2xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-bold inline-block mb-1">
                {activeLang === 'ar' ? 'وثيقة سياسة الخصوصية وحماية البيانات الرسمية' : 'Official App Privacy Policy & Data Protection Statement'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-white">
                {activeLang === 'ar' ? 'سياسة الخصوصية - منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية' : 'Privacy Policy - Omran Quran Platform'}
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#86efac] leading-relaxed max-w-3xl">
            {activeLang === 'ar' ? (
              <>
                تلتزم <strong>منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية (Omran Quran Platform)</strong> بحماية خصوصية وأمان بيانات المعلمين والطلاب وأولياء الأمور والمشرفين. توضح هذه الوثيقة بوضوح وشفافية تفاصيل جمع واستخدام وتخزين البيانات، وحمايتها، والامتثال لسياسة بيانات مستخدمي خدمات Google API بما في ذلك متطلبات الاستخدام المحدود (Limited Use).
              </>
            ) : (
              <>
                <strong>Omran Quran Platform (منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية)</strong> is committed to protecting the privacy and security of teachers, students, parents, and supervisors. This policy comprehensively discloses what user data is accessed, how it is used, stored, and protected, our strict zero-third-party sharing policy, and our adherence to the Google API Services User Data Policy, including Limited Use requirements.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-300 border-t border-[#065f46]">
            <span><strong>{activeLang === 'ar' ? 'تاريخ السريان وآخر تحديث:' : 'Effective & Last Updated:'}</strong> September 20, 2026</span>
            <span>•</span>
            <span><strong>{activeLang === 'ar' ? 'الرابط المعتمد:' : 'Official URL:'}</strong> <code className="font-mono text-amber-300">{currentFullUrl}</code></span>
            <span>•</span>
            <span><strong>{activeLang === 'ar' ? 'الدعم الفني وتواصل المطور:' : 'Developer & Support Email:'}</strong> <a href="mailto:fds421885@gmail.com" className="font-mono text-amber-300 underline">fds421885@gmail.com</a></span>
          </div>
        </motion.div>

        {/* Section 1: Strict Zero Sharing / No Third Parties */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#064e3b]/50 border-2 border-emerald-500/40 rounded-[28px] p-6 sm:p-8 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-3 text-emerald-300">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <EyeOff className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-heading">
              {activeLang === 'ar' ? '1. عدم مشاركة أو بيع البيانات إطلاقاً (Strict Zero Third-Party Sharing)' : '1. Strict Zero Third-Party Sharing and Non-Sale of Data'}
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <div className="p-4 rounded-2xl bg-[#022c22]/90 border border-emerald-500/40 font-bold text-amber-200">
              {activeLang === 'ar' ? (
                <>
                  <span className="text-emerald-400 font-black">【إقرار صريح لا لبس فيه】</span> لا تقوم منظومة عُمْرَان ببيع، أو تأجير، أو مشاركة، أو نقل، أو الإفصاح عن أي بيانات مستخدمين شخصية أو بيانات تم استلامها من خدمات Google API إلى أي طرف ثالث، أو وسطاء بيانات، أو شركات إعلانية، أو جهات تجارية تحت أي ظرف كان.
                </>
              ) : (
                <>
                  <span className="text-emerald-400 font-black">[Explicit Affirmation]</span> Omran Quran Platform does NOT sell, rent, lease, share, transfer, or disclose any personal user data or information received from Google APIs to any third parties, data brokers, advertising platforms, or commercial partners under any circumstances.
                </>
              )}
            </div>

            <ul className="space-y-2 list-disc list-inside text-[#86efac]/90 pr-2">
              {activeLang === 'ar' ? (
                <>
                  <li>البيانات المُسجلة في المنظومة تُستخدم حصرياً لإدارة العمليات التعليمية للحلقات القرآنية (متابعة الحفظ، الحضور، درجات الاختبارات).</li>
                  <li>لا يتم استخدام بيانات المستخدمين أو الطلاب لتدريب أي نماذج للذكاء الاصطناعي (AI/ML models).</li>
                  <li>المنظومة خالية تماماً من أدوات التتبع الإعلاني وملفات تعريف الارتباط الدعائية.</li>
                </>
              ) : (
                <>
                  <li>All information stored is used strictly and exclusively for managing the educational operations of Quran memorization circles (memorization logs, attendance, and exam grades).</li>
                  <li>User data and Google API data are NEVER used to train any Artificial Intelligence (AI) or Machine Learning (ML) models.</li>
                  <li>The platform contains zero third-party advertising trackers, marketing cookies, or tracking pixels.</li>
                </>
              )}
            </ul>
          </div>
        </motion.div>

        {/* Section 2: Scopes & Google User Data Handled (Google Verification Requirement) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#064e3b]/80 to-[#022c22] border-2 border-amber-400/60 rounded-[28px] p-6 sm:p-8 space-y-5 shadow-xl"
        >
          <div className="flex items-center gap-3 text-amber-300">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#064e3b] flex items-center justify-center font-black">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                Google Workspace Scopes & Data Usage
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white font-heading">
                {activeLang === 'ar' ? '2. أذونات وبيانات Google المطلوبة وكيفية استخدامها بدقة' : '2. Google API Scopes Requested and Exact Functional Purposes'}
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {activeLang === 'ar' ? (
              <>
                تطلب المنظومة أذونات Google OAuth بموافقة صريحة واختيارية من المشرف أو المعلم فقط عند طلب وظائف محددة، وهي:
              </>
            ) : (
              <>
                Omran Quran Platform requests Google OAuth permissions strictly upon the explicit, optional consent of the supervisor/teacher for specific educational features:
              </>
            )}
          </p>

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Scope 1: Google Sheets */}
            <div className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 font-bold text-white">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>{activeLang === 'ar' ? 'نطاق جداول بيانات Google (Google Sheets)' : 'Google Sheets API Scope'}</span>
                </div>
                <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  https://www.googleapis.com/auth/spreadsheets
                </code>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {activeLang === 'ar' ? (
                  <>
                    <strong>البيانات التي يتم الوصول إليها والغرض:</strong> نقوم بإنشاء وتحديث جداول البيانات التي ينشئها المستخدم خصيصاً عبر المنظومة لتصدير سجلات حضور الطلاب، درجات التسميع اليومية، والتقارير الدورية إلى حسابه الشخصي في Google Sheets، مما يمنح المشرف تحكماً كاملاً في بيانات حلقته دون مغادرة حسابه.
                  </>
                ) : (
                  <>
                    <strong>Data Accessed & Purpose:</strong> Allows the application to create and update spreadsheets specifically created by the user within the platform. Used to export student attendance, daily memorization marks, and periodic reports directly to the user's personal Google Sheets for safe archival.
                  </>
                )}
              </p>
            </div>

            {/* Scope 2: Google Forms */}
            <div className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 font-bold text-white">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>{activeLang === 'ar' ? 'نطاق نماذج Google (Google Forms)' : 'Google Forms API Scope'}</span>
                </div>
                <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30">
                  https://www.googleapis.com/auth/forms.body
                </code>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {activeLang === 'ar' ? (
                  <>
                    <strong>البيانات التي يتم الوصول إليها والغرض:</strong> توليد نماذج اختبارات قرآنية اختيارية من بنك الأسئلة بالمنصة، وتصدير الأسئلة إلى نموذج في حساب المعلم لاستقبال إجابات الطلاب واسترجاع درجات التقييم التلقائية.
                  </>
                ) : (
                  <>
                    <strong>Data Accessed & Purpose:</strong> Allows creating Quranic assessment forms based on questions authored by the teacher, and reading the resulting assessment score to automatically populate the student leaderboard.
                  </>
                )}
              </p>
            </div>

            {/* Scope 3: Google Drive file scope */}
            <div className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 font-bold text-white">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span>{activeLang === 'ar' ? 'نطاق ملفات Google Drive المحددة (drive.file)' : 'Google Drive App-Specific Files Scope'}</span>
                </div>
                <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-400/30">
                  https://www.googleapis.com/auth/drive.file
                </code>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {activeLang === 'ar' ? (
                  <>
                    <strong>البيانات التي يتم الوصول إليها والغرض:</strong> حفظ واسترجاع ملف النسخة الاحتياطية المشفرة (JSON) الخاص بالمجمع القرآني فقط داخل مجلد خاص يحمل اسم المنصة في مساحة Google Drive للمستخدم. لا يمكن للتطبيق رؤية أو لمس أو قراءة أي ملفات أخرى في Drive.
                  </>
                ) : (
                  <>
                    <strong>Data Accessed & Purpose:</strong> Used exclusively to create and retrieve the encrypted JSON backup archive file in a dedicated Omran app folder on the user's Google Drive. The application cannot access, view, or read any other files stored on the user's Google Drive.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Mandatory Google Limited Use Statement (العربية والإنجليزية) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/50 border-2 border-amber-400/70 text-amber-100 text-xs sm:text-xs leading-relaxed space-y-3">
            <div className="font-bold flex items-center gap-2 text-amber-300 text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Google API Services User Data Policy - Limited Use Disclosure</span>
            </div>
            
            <div className="p-3 bg-[#022c22] rounded-xl border border-amber-400/40 text-white font-medium space-y-2">
              <p>
                <strong>Verbatim Compliance Statement:</strong>
              </p>
              <blockquote className="italic border-l-2 border-amber-400 pl-3 text-amber-200">
                "Omran Quran Platform's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold text-amber-300 hover:text-white inline-flex items-center gap-1"
                >
                  Google API Services User Data Policy
                  <ExternalLink className="w-3 h-3" />
                </a>
                , including the Limited Use requirements."
              </blockquote>
            </div>

            <p className="text-slate-300 text-[11px]">
              إن استخدام منظومة عُمْرَان ونقلها لأي معلومات يتم تلقيها من واجهات برمجة تطبيقات Google إلى أي تطبيق آخر سيلتزم تماماً بسياسة بيانات مستخدم خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود (Limited Use).
            </p>
          </div>
        </motion.div>

        {/* Section 3: Data Protection & Technical Security Mechanisms */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#064e3b]/50 border border-[#065f46] rounded-[28px] p-6 sm:p-8 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-3 text-emerald-300">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-heading">
              {activeLang === 'ar' ? '3. آليات حماية وتشفير البيانات الحساسة (Data Security & Encryption)' : '3. Data Security, Protection Mechanisms & Encryption'}
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <p>
              {activeLang === 'ar' ? (
                <>
                  تُطبق المنظومة معايير أمنية صارمة ومطابقة للمعايير العالمية لحماية كافة المعلومات المعالجة:
                </>
              ) : (
                <>
                  The platform employs industry-standard security protocols to safeguard all sensitive data:
                </>
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-3.5 rounded-xl bg-[#022c22] border border-[#065f46] space-y-1">
                <strong className="text-amber-300 block font-bold">
                  {activeLang === 'ar' ? 'التشفير أثناء النقل (In Transit)' : 'In-Transit Encryption'}
                </strong>
                <span className="text-slate-300 text-xs">
                  {activeLang === 'ar' ? 'كافة الاتصالات مشفرة عبر بروتوكول TLS 1.3 / HTTPS الآمن لحماية البيانات من التنصت أو التلاعب.' : 'All network communications are secured using modern TLS 1.3 / HTTPS encryption.'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#022c22] border border-[#065f46] space-y-1">
                <strong className="text-amber-300 block font-bold">
                  {activeLang === 'ar' ? 'التشفير أثناء التخزين (At Rest)' : 'At-Rest Encryption'}
                </strong>
                <span className="text-slate-300 text-xs">
                  {activeLang === 'ar' ? 'تُخزن السجلات في خوادم Google Cloud السحابية المعتمدة والمحمية بتشفير AES-256 القياسي.' : 'Database records are hosted on secure Google Cloud servers with AES-256 encryption at rest.'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#022c22] border border-[#065f46] space-y-1">
                <strong className="text-amber-300 block font-bold">
                  {activeLang === 'ar' ? 'أمان رموز OAuth' : 'OAuth Token Isolation'}
                </strong>
                <span className="text-slate-300 text-xs">
                  {activeLang === 'ar' ? 'رموز تفويض Google OAuth تُحفظ فقط في جلسة المتصفح المعزولة لدى المستخدم ولا يتم تخزينها في سجلات خارجية.' : 'OAuth tokens are held in client-side secure sandbox storage and are never exposed in backend logs.'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#022c22] border border-[#065f46] space-y-1">
                <strong className="text-amber-300 block font-bold">
                  {activeLang === 'ar' ? 'عزل البيانات الصارم' : 'Multi-Tenant Isolation'}
                </strong>
                <span className="text-slate-300 text-xs">
                  {activeLang === 'ar' ? 'فصل تام بين سجلات المجمعات القرآنية المختلفة بحيث لا يمكن لأي مجمع الاطلاع على بيانات مجمع آخر.' : 'Strict tenant separation ensures each Quranic complex operates with complete data isolation.'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 4: Data Retention, Deletion & Revocation (شرط أساسي لجوجل) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#064e3b]/50 border border-[#065f46] rounded-[28px] p-6 sm:p-8 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-3 text-amber-300">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center border border-amber-400/30">
              <Trash2 className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-heading">
              {activeLang === 'ar' ? '4. فترات الاحتفاظ بالبيانات، وسياسة الحذف، وإلغاء الأذونات' : '4. Data Retention, User Deletion Rights & Permission Revocation'}
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <div className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2">
              <h3 className="font-bold text-amber-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeLang === 'ar' ? 'فترة الاحتفاظ بالبيانات (Data Retention Period):' : 'Data Retention Period:'}</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                {activeLang === 'ar' ? (
                  <>
                    يتم الاحتفاظ ببيانات الطلاب والحلقات طالما كان حساب المجمع أو المعلم نشطاً ويستخدم المنظومة خلال العام الدراسي القرآني. في حال توقف المجمع عن استخدام المنظومة أو طلب حذف البيانات، يتم حذف السجلات نهائياً من قاعدة البيانات خلال 30 يوماً من تاريخ الطلب.
                  </>
                ) : (
                  <>
                    Student records and attendance are retained only while the Quranic complex or teacher account remains active during the Quranic academic year. If an account is closed or deletion is requested, all associated data is permanently erased from the database within 30 days.
                  </>
                )}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2">
              <h3 className="font-bold text-amber-300 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>{activeLang === 'ar' ? 'حق حذف البيانات فورياً (How to Request Data Deletion):' : 'How to Request Immediate Data Deletion:'}</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                {activeLang === 'ar' ? (
                  <>
                    يحق لأي مستخدم، معلم، أو ولي أمر طلب الحذف الكامل والدائم لكافة بياناته وسجلات أبنائه في أي وقت، وذلك بمراسلتنا على بريد الدعم الفني: <a href="mailto:fds421885@gmail.com" className="font-mono text-amber-300 font-bold underline">fds421885@gmail.com</a>، وسيتم تأكيد الحذف الفوري وإشعار المستخدم خلال مدة أقصاها 48 ساعة.
                  </>
                ) : (
                  <>
                    Any teacher, supervisor, or parent can request complete and permanent deletion of their data at any time by emailing support at <a href="mailto:fds421885@gmail.com" className="font-mono text-amber-300 font-bold underline">fds421885@gmail.com</a>. Deletion requests are processed and confirmed within 48 hours.
                  </>
                )}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#022c22] border border-[#065f46] space-y-2">
              <h3 className="font-bold text-amber-300 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <span>{activeLang === 'ar' ? 'إلغاء أذونات Google في أي وقت (How to Revoke Google Permissions):' : 'How to Revoke Google Permissions Anytime:'}</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                {activeLang === 'ar' ? (
                  <>
                    يمكن للمستخدم في أي لحظة إلغاء ربط التطبيق بحساب Google وسحب كافة الصلاحيات بضغطة زر واحدة مباشرة عبر صفحة أمان حساب Google الرسمية:{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 font-bold underline inline-flex items-center gap-1"
                    >
                      إدارة تطبيقات الجهات الخارجية بحساب Google
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>.
                  </>
                ) : (
                  <>
                    Users may revoke Omran Quran Platform's access to their Google Account at any time directly through Google's official security settings:{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 font-bold underline inline-flex items-center gap-1"
                    >
                      Google Third-Party Account Permissions
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>.
                  </>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Section 5: Notice of Changes & Policy Updates (Google Requirement) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-[#064e3b]/50 border border-[#065f46] rounded-[28px] p-6 sm:p-8 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-3 text-amber-300">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center border border-amber-400/30">
              <BellRing className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-heading">
              {activeLang === 'ar' ? '5. إشعار التغييرات وتحديثات سياسة الخصوصية (Notification of Policy Updates)' : '5. Policy Updates and Notification of Changes'}
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <p>
              {activeLang === 'ar' ? (
                <>
                  تلتزم إدارة <strong>منظومة عُمْرَان</strong> بإشعار المستخدمين مقدماً في حال حدوث أي تغييرات جوهرية على كيفية الوصول إلى بيانات مستخدمي Google أو استخدامها أو معالجتها. سيتم نشر التعديلات على هذه الصفحة مع تحديث "تاريخ آخر تعديل"، وسيتم عرض إشعار بارز داخل واجهة المنظومة لضمان علم وموافقة المستخدمين قبل بدء سريان أي تغيير.
                </>
              ) : (
                <>
                  <strong>Omran Quran Platform</strong> undertakes to notify users in advance of any material changes regarding how Google user data is accessed, utilized, or handled. Any policy revisions will be published on this page with an updated Effective Date, and prominent in-app notices will alert users prior to changes taking effect.
                </>
              )}
            </p>
          </div>
        </motion.div>

        {/* Section 6: Developer & Support Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#022c22] border-2 border-emerald-500/40 rounded-[28px] p-6 sm:p-8 space-y-4 shadow-xl text-center sm:text-right flex flex-col sm:flex-row items-center justify-between gap-5"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-300">
              <Mail className="w-5 h-5" />
              <h3 className="text-base sm:text-lg font-black font-heading text-white">
                {activeLang === 'ar' ? 'التواصل والدعم الفني ومسؤول حماية البيانات' : 'Developer, Privacy Officer & Support Contact'}
              </h3>
            </div>
            <p className="text-xs text-[#86efac]">
              {activeLang === 'ar' ? 'لأي استفسارات بخصوص حماية البيانات أو سياسة الاستخدام أو مراجعة Google:' : 'For inquiries regarding privacy, data rights, or Google Verification review:'}
            </p>
            <div className="pt-1 text-xs font-mono text-amber-300 font-bold space-y-1">
              <div>
                {activeLang === 'ar' ? 'البريد الإلكتروني المعتمد للدعم الفني:' : 'Official Support & Developer Email:'}{' '}
                <a href="mailto:fds421885@gmail.com" className="underline hover:text-white">fds421885@gmail.com</a>
              </div>
              <div className="text-slate-300 font-sans text-[11px]">
                {activeLang === 'ar' ? 'المطور والمشرف البرمجي: م. محمد منتصر' : 'Lead Developer & Architect: Eng. Mohamed Montaser'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToHome}
            className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#064e3b] font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer shrink-0"
          >
            {activeLang === 'ar' ? 'الرجوع للصفحة الرئيسية' : 'Return to Home'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
