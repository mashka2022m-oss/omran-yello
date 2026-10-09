import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Award,
  Users,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HardDrive,
  ArrowLeft,
  Lock,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  GraduationCap,
  HeartHandshake,
  Layers,
  HelpCircle,
  Database,
  Languages,
  Trophy,
  Medal,
  Volume2,
  Play,
  RotateCcw,
  MessageCircle,
  Send,
  Printer,
  Sliders,
  Star,
  Flame,
  ShieldAlert,
  Building2,
  Headphones,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PublicLandingPageProps {
  onOpenLogin: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenParentPortal?: () => void;
  appName?: string;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  onOpenLogin,
  onOpenPrivacyPolicy,
  onOpenParentPortal,
  appName = 'منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية'
}) => {
  const [showEnglishOverview, setShowEnglishOverview] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Interactive Feature Tabs Navigator
  const featureTabs = [
    {
      id: 'complexes',
      title: 'إدارة المجمعات والحلقات',
      icon: Building2,
      tag: 'الهيكل التنظيمي والصلاحيات',
      color: 'from-amber-500 to-amber-600',
      badge: 'متعدد المجمعات',
      headline: 'إدارة مركزية مستقلة لكل مجمع قرآني مع صلاحيات متدرجة ودقيقة',
      description: 'توفر المنظومة بيئة تشغيل سحابية مرنة تعزل قواعد بيانات كل مجمع قرآني وتتيح إدارة الحلقات، توزيع الطلاب، وتعيين المعلمين والمشرفين بمرونة كاملة.',
      highlights: [
        'عزل أو دمج بيانات المجمعات القرآنية مع التبديل الفوري بنقرة واحدة.',
        'مستويات صلاحيات دقيقة: المشرف العام، مشرف المجمع، معلم الحلقة، المعلم المساعد، ولي الأمر، والطالب.',
        'إدارة الحلقات القرآنية ونقل الطلاب وتوزيعهم حسب المستويات ومتابعة الشواغر.',
        'سجل شامل للمشرفين والمعلمين مع إمكانية ربط كل معلم بعدة مجمعات وحلقات.'
      ]
    },
    {
      id: 'recitation',
      title: 'سجل التسميع ومعايير التجويد',
      icon: BookOpen,
      tag: 'الحفظ والمراجعة وخطة الغد',
      color: 'from-emerald-500 to-emerald-600',
      badge: 'تقييم تجويدي ذكي',
      headline: 'رصد دقيق لمقدار الحفظ ومعايير الأداء التجويدي واقتراح خطة الغد الذكية',
      description: 'نظام متكامل لتسميع القرآن الكريم يقسم الورد اليومي إلى حفظ جديد، مراجعة صغرى (أحدث ٥ أجزاء)، ومراجعة كبرى، مع تقييم بنود الأداء واحتساب النقاط تلقائياً.',
      highlights: [
        'معايير تجويد دقيقة: مخارج الحروف، الغنة، أحكام المدود، الطلاقة والانطلاق، وإعراب الحركات.',
        'احتساب نقاط التسميع ونقاط الأوجه والصفحات المنجزة تلقائياً وإضافتها لرصيد الطالب في لوحة الشرف.',
        'اقتراح خطة الغد ومقرر الحفظ التالي آلياً بحسب إنجاز الطالب ومستواه التعليمي.',
        'شارة فحص الجاهزية: التحقق المسبق من استماع الطالب للمقطع وتكراره قبل التسميع.'
      ],
      previewSnippet: {
        badgeText: 'سجل التسميع اليومي',
        subText: 'الطالب: عبد الرحمن أحمد • سورة الشعراء (١ - ١٥)',
        stat1: { label: 'معايير التجويد', val: '٤.٩ / ٥' },
        stat2: { label: 'نقاط التميز المكتسبة', val: '+٢٥ نقطة' }
      }
    },
    {
      id: 'listening',
      title: 'مشغل الآيات والتكرار الصوتي',
      icon: Headphones,
      tag: 'بالرسم العثماني لمجمع الملك فهد',
      color: 'from-amber-400 to-amber-500',
      badge: 'استماع آية بآية',
      headline: 'استماع تفاعلي بالرسم العثماني المعتمد مع عداد تكرار منزلي آلي',
      description: 'نظام استماع صوتي متطور يعرض الآيات القرآنية آية بآية بالخط العثماني لمجمع الملك فهد متزامنة مع تلاوات خاشعة لنخبة من كبار مشايخ العالم الإسلامي.',
      highlights: [
        'تحديد المقطع القرآني بدقة من الآية (أ) إلى الآية (ب) من قبل المعلم دون إمكانية تجاوزها أو التلاعب.',
        'تحديد عدد مرات التكرار المطلوبة (من ١ إلى ٢٠ تكرار) من قبل المحفظ للمتابعة المنزلية.',
        'احتساب ذكي وآلي لمرات السماع والتكرار بدون تدخل الطالب، وإيداع نقاط التميز فور إتمام المقرر.',
        'نخبة من كبار المشايخ المتقنين: الشيخ الحصري، المنشاوي، عبد الباسط، العفاسي، علي جابر، المعيقلي، الشاطري.'
      ],
      previewSnippet: {
        badgeText: 'سورة الشعراء - الآيات [٩ - ١٢]',
        subText: 'بصوت الشيخ محمود خليل الحصري (المصحف المعلم)',
        stat1: { label: 'التكرار المطلوب', val: '٥ مرات' },
        stat2: { label: 'الإنجاز المنزلي', val: 'مكتمل بنجاح' }
      }
    },
    {
      id: 'exams',
      title: 'بنك الاختبارات وGoogle Forms',
      icon: FileText,
      tag: 'تصحيح آلي وتكامل سحابي',
      color: 'from-blue-500 to-blue-600',
      badge: 'تكامل Google Forms',
      headline: 'إنشاء اختبارات قرآنية متقدمة وربطها بنماذج Google Forms وسحب النتائج لحظياً',
      description: 'بنك متكامل لاختبارات الحفظ والتجويد يتيح إنشاء أسئلة إلكترونية متعددة الأنواع، والربط الذكي بنماذج Google Forms مع تعبئة بيانات الطالب تلقائياً ورصد الدرجات.',
      highlights: [
        'أنواع أسئلة شاملة: اختيار من متعدد، إكمال آيات، أحكام التجويد، وأسئلة مقالية للمراجعة.',
        'تكامل مباشر مع Google Forms: إنشاء النماذج تلقائياً وسحب إجابات الطلاب دون تدخل يدوي.',
        'تعبئة اسم الطالب ورقم الجلوس تلقائياً في رابط الاختبار لمنع الالتباس والأخطاء.',
        'إمكانية مراجعة الإجابات ونسب النجاح، واحتساب درجات الاختبار في لوحة الشرف فورياً.'
      ],
      previewSnippet: {
        badgeText: 'اختبار تجويد جزء عمّ',
        subText: '٢٠ سؤالاً قياسياً • تصحيح سحابي فوري عبر Google Forms',
        stat1: { label: 'متوسط الدرجات', val: '٩٦٪' },
        stat2: { label: 'الشهادة الممنوحة', val: 'ممتاز مرتفع' }
      }
    },
    {
      id: 'certificates',
      title: 'الشهادات الرقمية والأرشيف',
      icon: Award,
      tag: 'طباعة فورية A4 وجودة فائقة',
      color: 'from-teal-500 to-teal-600',
      badge: 'أرشيف معتمد',
      headline: 'إصدار شهادات تقدير وتفوق قرآني احترافية جاهزة للطباعة والتنزيل وحفظها في أرشيف دائم',
      description: 'منظومة إصدار شهادات إتقان فاخرة بختم المجمع وتوقيع المعلم والمشرف، محفوظة بصفة دائمة في ملف الطالب وبوابة ولي الأمر للرجوع إليها وطباعتها في أي وقت.',
      highlights: [
        'تصميمات إسلامية راقية متوافقة تماماً مع معايير الطباعة الورقية A4 وPDF بجودة فائقة.',
        'أرشفة سحابية كاملة لكل شهادة صادرة برقم اعتماد وتاريخ رسمي وتفاصيل التكريم.',
        'إمكانية وصول الطالب وولي الأمر لشهاداته الصادرة من خلال بوابته الخاصة في أي وقت.',
        'إصدار جماعي بنقرة زر لجميع طلاب الحلقة المجتازين للاختبارات القرآنية.'
      ],
      previewSnippet: {
        badgeText: 'شهادة إتقان حفظ جزء تبارك',
        subText: 'معتمدة برقم توثيق رسمي وخاتم المجمع القرآني',
        stat1: { label: 'التقدير العام', val: 'ممتاز مع مرتبة الشرف' },
        stat2: { label: 'خيارات التصدير', val: 'طباعة A4 / PDF' }
      }
    },
    {
      id: 'leaderboard',
      title: 'لوحة الشرف وتصنيف المتصدرين',
      icon: Trophy,
      tag: 'تحفيز وتنافس قرآني شريف',
      color: 'from-amber-400 to-amber-600',
      badge: 'معادلة نقاط موحدة',
      headline: 'لوحة شرف تفاعلية تجمع كافة محاور التميز مع إمكانية تتبع مصادر النقاط بالتفصيل',
      description: 'نظام تصنيف وتكريم عادل يجمع نقاط التسميع اليومية ومعايير التجويد، نقاط الاختبارات، نقاط الاستماع والتكرار المنزلي، ونقاط الصفحات المنجزة مع بحث وتفصيل فوري.',
      highlights: [
        'معادلة موحدة ومحدثة لحظياً عند المعلمين والمشرفين والطلاب دون أي تعارض أو تأخير.',
        'منصة تتويج للمراكز الثلاثة الأولى (كؤوس ذهبية وفضية وبرونزية وأوسمة شرف).',
        'محرك بحث فوري بالاسم يتيح الضغط على أي طالب لاستعراض أين وكيف جمع نقاطه بالتفصيل.',
        'إمكانية ضبط نطاق اللوحة: ترتيب على مستوى الحلقة محلياً أو الترتيب العام الموحد للمجمع.'
      ],
      previewSnippet: {
        badgeText: 'المتصدر الأول: أسامة البشير',
        subText: 'حلقة الإمام الشاطبي • إجمالي النقاط: ٤٢٠ نقطة',
        stat1: { label: 'نقاط التسميع', val: '+٢٤٠' },
        stat2: { label: 'نقاط الاختبارات', val: '+١٨٠' }
      }
    },
    {
      id: 'whatsapp',
      title: 'تقارير الواتساب وبوابة ولي الأمر',
      icon: MessageCircle,
      tag: 'تواصل وتربية مستمرة',
      color: 'from-emerald-400 to-teal-500',
      badge: 'إشعار فوري بضغطة زر',
      headline: 'تقارير إنجاز يومية منمقة بالآيات ترسل عبر الواتساب وبوابة إلكترونية لولي الأمر',
      description: 'تجسير التواصل بين المجمع والمنزل عبر قوالب رسائل واتساب ذكية ترصد الحفظ والغياب وخطة الغد، مع بوابة تفاعلية لولي الأمر لمتابعة مسيرة ابنه لحظة بلحظة.',
      highlights: [
        'توليد تقارير يومية وأسبوعية وشهرية نصية منمقة بآيات قرآنية جاهزة للإرسال لواتساب بنقرة واحدة.',
        'بوابة خاصة بولي الأمر للاطلاع على الحضور، سجل التسميع، خطة الغد، والشهادات.',
        'سجل التوجيه والملاحظات السلوكية والتربوية لمتابعة الانضباط وتدوين توصيات المشايخ.',
        'إشعارات ذكية تنبه ولي الأمر بالغياب أو التأخر أو استحقاق الاختبار والشهادة.'
      ],
      previewSnippet: {
        badgeText: 'تقرير إنجاز يومي - واتساب',
        subText: 'تم إرساله لولي أمر الطالب: تم بحمد الله تسميع ورد اليوم بإتقان',
        stat1: { label: 'حالة الحضور', val: 'حاضر في الموعد' },
        stat2: { label: 'خطة الغد المقررة', val: 'سورة القصص (١ - ١٠)' }
      }
    }
  ];

  const faqs = [
    {
      q: 'هل تدعم المنظومة تشغيل عدة مجمعات وحلقات قرآنية مستقلة؟',
      a: 'نعم، المنظومة مصممة بهيكل متعدد المجمعات (Multi-Complex) يتيح إنشاء وإدارة مجمعات مستقلة تماماً، وتوزيع الحلقات والمعلمين، مع إمكانية التبديل السلس أو مشاركة قواعد البيانات بإشراف المشرف العام وإدارة المجمعات.'
    },
    {
      q: 'كيف يعمل نظام الاستماع وتكرار الآيات الجديد؟ وهل يمنع التلاعب؟',
      a: 'المعلم يحدد المقطع بدقة من آية محددة إلى آية أخرى مع عدد مرات التكرار المطلوبة (من ١ إلى ٢٠ مرة) وقارئ معتمد بالرسم العثماني لمجمع الملك فهد. لا يستطيع الطالب تجاوز المقطع، ويقوم النظام باحتساب مرات الاستماع آلياً عند إتمام كل تكرار وإيداع نقاط التميز تلقائياً في حسابه ولوحة الشرف.'
    },
    {
      q: 'كيف يتم احتساب درجات ونقاط لوحة الشرف للطلاب؟',
      a: 'تعتمد المنظومة معادلة تفوق شاملة وموحدة تجمع: نقاط معايير التسميع اليومي (المخارج، التجويد، الطلاقة)، نقاط اجتياز الاختبارات ومسابقات Google Forms، نقاط الاستماع والتكرار الصوتي المنزلي، ونقاط الأوجه والصفحات المنجزة. ويمكن لأي طالب أو معلم الضغط على أي اسم لاستعراض تفاصيل ومصادر نقاطه بدقة.'
    },
    {
      q: 'لماذا تطلب المنظومة أذونات Google Workspace (Sheets, Drive, Forms)؟',
      a: 'تطلب المنظومة هذه الأذونات strictly on-demand عند رغبة المعلم أو المشرف بتصدير درجات التسميع وسجلات الحضور إلى جداول Google Sheets الشخصية الخاصة به، أو إنشاء اختبارات Google Forms وسحب درجاتها، أو حفظ نسخ احتياطية مشفرة في مجلد مخصص في Google Drive. لا نصل لأي ملفات شخصية أخرى، وتخضع العملية لسياسة الاستخدام المحدود الصارمة من Google.'
    },
    {
      q: 'أين تُحفظ الشهادات الصادرة وهل يمكن للطالب وولي الأمر استعراضها؟',
      a: 'جميع الشهادات التي تصدر للطلاب تُحفظ تلقائياً في الأرشيف السحابي الدائم للمجمع وتظهر فوراً في حساب الطالب وبوابة ولي الأمر، حيث يمكن استعراضها وطباعتها بجودة فائقة A4 أو حفظها كملف PDF في أي وقت دون أن تُفقد.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#131f24] text-[#ffffff] font-sans selection:bg-[#58cc02] selection:text-[#131f24]" dir="rtl">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[550px] h-[550px] bg-[#58cc02]/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 w-[650px] h-[650px] bg-[#1cb0f6]/12 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#ffc800]/10 rounded-full blur-3xl" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#131f24]/95 border-b-2 border-[#2b4550] transition-all w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand / Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#ffc800] border-b-4 border-[#e5a500] p-0.5 shadow-lg shadow-yellow-500/20 shrink-0 flex items-center justify-center text-[#131f24]">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#131f24]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-black font-heading tracking-tight text-white truncate">
                  منظومة عُمْرَان
                </h1>
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-[#ffc800]/20 text-[#ffc800] font-black border border-[#ffc800]/40 hidden xs:inline shrink-0">
                  Omran
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#ffd233] hidden sm:block truncate font-bold">
                الصرح الرقمي الذكي لإدارة المجمعات والحلقات القرآنية
              </p>
            </div>
          </div>

          {/* Quick Nav Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* English reviewer toggle */}
            <button
              type="button"
              onClick={() => setShowEnglishOverview(!showEnglishOverview)}
              className="text-xs font-bold text-[#ffc800] hover:text-white p-2 sm:px-3 sm:py-2 rounded-xl bg-[#203843] border-2 border-b-4 border-[#2b4550] hover:border-[#ffc800] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:translate-y-0.5"
              title="Toggle English Overview for Google Reviewers"
            >
              <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">{showEnglishOverview ? 'العربية' : 'English'}</span>
              <span className="md:hidden text-[11px]">EN</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrivacyPolicy}
              className="text-xs font-bold text-[#ffd233] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-[#203843] border-2 border-b-4 border-[#2b4550] hover:border-[#ffc800] active:translate-y-0.5"
              title="وثيقة سياسة الخصوصية"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffc800]" />
              <span className="hidden lg:inline">وثيقة الخصوصية</span>
            </button>

            {onOpenParentPortal && (
              <button
                type="button"
                onClick={onOpenParentPortal}
                className="text-xs font-bold text-[#ffc800] hover:text-white transition-colors cursor-pointer px-3.5 py-2 rounded-xl bg-[#203843] border-2 border-b-4 border-[#2b4550] hover:border-[#ffc800] hidden md:inline-flex items-center gap-1.5 active:translate-y-0.5"
              >
                <GraduationCap className="w-4 h-4 text-[#ffc800]" />
                <span>بوابة ولي الأمر</span>
              </button>
            )}

            {/* Prominent Login Button for all devices */}
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#ffc800] border-2 border-[#ffc800] border-b-4 border-[#e5a500] hover:brightness-105 text-[#131f24] text-xs sm:text-sm font-black shadow-lg shadow-yellow-500/25 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:translate-y-[2px] active:border-b-2 shrink-0"
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#131f24]" />
              <span className="font-heading font-extrabold whitespace-nowrap">تسجيل الدخول</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 space-y-16 sm:space-y-24 pb-20">
        {/* Optional English Overview Banner for Google Reviewers */}
        <AnimatePresence>
          {showEnglishOverview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#1b2e35] border-b-4 border-[#ffc800] px-4 sm:px-6 lg:px-8 py-6 text-left shadow-2xl"
              dir="ltr"
            >
              <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[#ffc800] font-bold text-sm">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Google OAuth Verification Quick Reference Guide (English Summary)</span>
                  </div>
                  <button
                    onClick={() => setShowEnglishOverview(false)}
                    className="text-xs text-slate-300 hover:text-white px-3 py-1 rounded-xl bg-white/10 cursor-pointer"
                  >
                    Close English Panel ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-200">
                  <div className="bg-[#203843] p-4 rounded-2xl border-2 border-[#2b4550] space-y-1.5">
                    <strong className="text-white block font-bold">1. Application & Brand Identity</strong>
                    <p className="text-[#ffd233]">
                      <strong>Name:</strong> Omran Quran Platform (منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية).
                    </p>
                    <p>
                      A full-featured educational web application dedicated to managing Quran memorization schools, halaqahs, attendance, and student evaluations.
                    </p>
                  </div>

                  <div className="bg-[#203843] p-4 rounded-2xl border-2 border-[#2b4550] space-y-1.5">
                    <strong className="text-white block font-bold">2. Purpose of Google User Data Requests</strong>
                    <p>
                      The app requests Google Workspace permissions (Google Sheets, Google Forms, Google Drive file scope) strictly on-demand when an authorized teacher/supervisor requests:
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-amber-200 space-y-0.5">
                      <li>Exporting attendance & student evaluation grades into personal Google Sheets.</li>
                      <li>Generating Quran assessment quizzes in Google Forms.</li>
                      <li>Saving JSON backup archives in a dedicated Drive app folder.</li>
                    </ul>
                  </div>

                  <div className="bg-[#203843] p-4 rounded-2xl border-2 border-[#2b4550] space-y-1.5">
                    <strong className="text-white block font-bold">3. Privacy, Security & Limited Use</strong>
                    <p>
                      Zero third-party data sharing. Data is never sold, leased, or used for advertising/AI training. Fully complies with Google Limited Use Policy.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={onOpenPrivacyPolicy}
                        className="text-xs font-bold text-[#ffc800] underline hover:text-white cursor-pointer"
                      >
                        View Full Privacy Policy Document →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HERO SECTION */}
        <section className="pt-8 sm:pt-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 flex flex-col items-center"
          >
            {/* Complete Quranic Verse Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-[#1b2e35] border-2 border-[#ffc800]/60 text-[#ffd233] text-xs sm:text-base font-quran shadow-[0_4px_20px_rgba(255,200,0,0.18)] max-w-full flex-wrap"
            >
              <Sparkles className="w-4 h-4 text-[#ffc800] shrink-0 animate-pulse" />
              <span className="text-center font-bold tracking-wide leading-relaxed text-white">
                ﴿ إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا ﴾
              </span>
              <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-[#ffc800]/20 text-[#ffc800] font-black border border-[#ffc800]/40 shrink-0">
                سورة الإسراء: ٩
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading text-white leading-tight tracking-tight"
            >
              المنظومة الرقمية الشاملة لإدارة
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ffc800] via-[#ffd900] to-[#ff9600] mt-2">
                حلقات ومجمعات القرآن الكريم
              </span>
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="text-sm sm:text-base text-slate-200 max-w-3xl mx-auto leading-relaxed font-medium"
            >
              بيئة تقنية وتربوية رائدة صُممت خصيصاً لخدمة أهل القرآن الكريم: رصد التسميع اليومي بمعايير التجويد الدقيقة، تشغيل المصحف الشريف بالرسم العثماني مع تكرار الآيات، بنك اختبارات Google Forms، أرشيف الشهادات الرقمية، ولوحة شرف تنافسية تجمع كافة محاور التميز لحظياً.
            </motion.p>

            {/* CTA Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full"
            >
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#ffc800] border-2 border-[#ffc800] border-b-4 border-[#e5a500] hover:brightness-105 text-[#131f24] text-base font-black shadow-[0_6px_25px_rgba(255,200,0,0.35)] flex items-center justify-center gap-3 transition-all cursor-pointer group active:translate-y-[2px] active:border-b-2"
              >
                <span>دخول لوحة التحكم والبدء</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform text-[#131f24]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('features-explorer');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#203843] border-2 border-[#2b4550] border-b-4 border-[#16262e] hover:border-[#ffc800] text-white text-sm font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md active:translate-y-[2px] active:border-b-2"
              >
                <Sparkles className="w-5 h-5 text-[#ffc800]" />
                <span>استكشاف كافة مميزات المنظومة بالتفصيل</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Quick Metrics / Pillars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 pt-8 text-right">
            {[
              { title: 'متعدد المجمعات', desc: 'إدارة مركزية مستقلة لكل مجمع وحلقة', color: 'text-[#ffc800]', icon: Building2 },
              { title: 'تكرار الآيات', desc: 'مشغل قرآني بالرسم العثماني وتكرار آلي', color: 'text-[#1cb0f6]', icon: Headphones },
              { title: 'بنك الاختبارات', desc: 'تكامل ذكي مع نماذج Google Forms', color: 'text-[#ff9600]', icon: FileText },
              { title: 'لوحة الشرف', desc: 'معادلة نقاط موحدة وبحث وتفاصيل حية', color: 'text-[#ce82ff]', icon: Trophy }
            ].map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 25, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="bg-[#203843] border-2 border-b-4 border-[#2b4550] hover:border-[#ffc800] rounded-2xl p-4 sm:p-5 backdrop-blur-sm transition-all shadow-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`${pillar.color} text-lg sm:text-xl font-black font-heading`}>
                      {pillar.title}
                    </span>
                    <Icon className={`w-5 h-5 ${pillar.color}`} />
                  </div>
                  <div className="text-xs text-slate-300 font-medium">{pillar.desc}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* SECTION: INTERACTIVE ALL-FEATURES EXPLORER */}
        <section id="features-explorer" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffc800]/15 border border-[#ffc800]/40 text-[#ffc800] text-xs font-black">
              <Sparkles className="w-4 h-4 text-[#ffc800]" />
              <span>دليل المزايا والوظائف الشاملة بالتفصيل</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black font-heading text-white">
              كل ما تحتاجه لإدارة الصرح القرآني من الألف إلى الياء
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              اضغط على أي ركن من أركان المنظومة لاستكشاف تفاصيل تشغيله ومزاياه العملية
            </p>
          </div>

          {/* Interactive Feature Tabs Navigator */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none justify-start lg:justify-center slider-horizontal">
            {featureTabs.map((tab, idx) => {
              const TabIcon = tab.icon;
              const isActive = activeFeatureTab === idx;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(idx)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer border-2 border-b-4 active:translate-y-0.5 ${
                    isActive
                      ? 'bg-[#ffc800] text-[#131f24] border-[#ffc800] border-b-[#e5a500] shadow-[0_4px_16px_rgba(255,200,0,0.3)] scale-[1.02]'
                      : 'bg-[#203843] hover:bg-[#274452] text-white border-[#2b4550] border-b-[#16262e] hover:border-[#ffc800]'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isActive ? 'text-[#131f24]' : 'text-[#ffc800]'}`} />
                  <span>{tab.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Detailed Showcase Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeatureTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-[#1b2e35] border-2 border-b-4 border-[#2b4550] rounded-[32px] p-6 sm:p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="space-y-6 text-right">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] px-3 py-1 rounded-full bg-[#ffc800] text-[#131f24] font-black">
                    {featureTabs[activeFeatureTab].badge}
                  </span>
                  <span className="text-xs text-[#ffc800] font-bold">
                    {featureTabs[activeFeatureTab].tag}
                  </span>
                </div>

                <h4 className="text-xl sm:text-3xl font-black font-heading text-white leading-tight">
                  {featureTabs[activeFeatureTab].headline}
                </h4>

                <p className="text-xs sm:text-base text-slate-200 leading-relaxed max-w-4xl font-medium">
                  {featureTabs[activeFeatureTab].description}
                </p>

                <div className="space-y-3 pt-2">
                  <span className="text-xs sm:text-sm font-black text-[#ffc800] block">
                    أبرز الخصائص والقدرات الفنية:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {featureTabs[activeFeatureTab].highlights.map((h, hIdx) => (
                      <div
                        key={hIdx}
                        className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#203843] border-2 border-[#2b4550] text-xs sm:text-sm text-slate-200 font-medium"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#ffc800] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="px-6 py-3 rounded-2xl bg-[#ffc800] border-2 border-[#ffc800] border-b-4 border-[#e5a500] hover:brightness-105 text-[#131f24] text-xs sm:text-sm font-black shadow-md flex items-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
                  >
                    <Lock className="w-4 h-4 text-[#131f24]" />
                    <span>الدخول إلى المنظومة الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenPrivacyPolicy}
                    className="px-5 py-3 rounded-2xl bg-[#203843] hover:bg-[#274452] text-slate-200 text-xs sm:text-sm font-bold border-2 border-[#2b4550] border-b-4 border-[#16262e] cursor-pointer transition-colors active:translate-y-0.5"
                  >
                    الاطلاع على سياسة الأمان والخصوصية
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* SECTION: TRANSPARENT DATA USAGE & GOOGLE WORKSPACE DISCLOSURE */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#1b2e35] border-2 border-b-4 border-[#2b4550] rounded-[32px] p-6 sm:p-10 space-y-6 shadow-2xl relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#2b4550] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#ffc800] border-b-4 border-[#e5a500] text-[#131f24] flex items-center justify-center font-black shadow-lg shrink-0">
                  <ShieldCheck className="w-7 h-7 text-[#131f24]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black font-heading text-white">
                      شفافية طلب البيانات واستخدام خدمات Google Workspace
                    </h3>
                    <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#ffc800] text-[#131f24] font-black">
                      معايير الأمان المعتمدة
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                    توضيح شفاف لأغراض طلب أذونات Google وكيفية حماية بيانات مستخدمي المنظومة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="px-5 py-2.5 rounded-2xl bg-[#203843] border-2 border-[#2b4550] border-b-4 border-[#16262e] hover:border-[#ffc800] text-white text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 self-start md:self-auto active:translate-y-0.5"
              >
                <span>الاطلاع على سياسة الخصوصية كاملة</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#ffc800]" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Google Sheets Card */}
              <div className="p-5 rounded-2xl bg-[#203843] border-2 border-b-4 border-[#2b4550] space-y-3 shadow-inner hover:border-[#ffc800] transition-colors">
                <div className="flex items-center gap-2.5 text-[#ffc800]">
                  <FileSpreadsheet className="w-6 h-6" />
                  <h4 className="text-base font-bold text-white font-heading">
                    جداول Google Sheets
                  </h4>
                </div>
                <div className="text-xs text-slate-300 space-y-2 leading-relaxed font-medium">
                  <p>
                    <strong className="text-[#ffc800] block font-bold">الغرض من طلب الإذن:</strong>
                    تصدير سجلات درجات تسميع الطلاب، كشوف الحضور والغياب الشهرية، والتقارير الإحصائية إلى جداول بيانات خاصة بحساب المعلم أو المشرف نفسه.
                  </p>
                  <p className="text-[11px] text-[#ffd233] border-t border-white/10 pt-2">
                    ✓ لا يتم القراءة أو الوصول إلى أي جداول أخرى خارج نطاق ما ينشئه المستخدم عبر المنظومة.
                  </p>
                </div>
              </div>

              {/* Google Forms Card */}
              <div className="p-5 rounded-2xl bg-[#203843] border-2 border-b-4 border-[#2b4550] space-y-3 shadow-inner hover:border-[#1cb0f6] transition-colors">
                <div className="flex items-center gap-2.5 text-[#1cb0f6]">
                  <FileText className="w-6 h-6" />
                  <h4 className="text-base font-bold text-white font-heading">
                    نماذج Google Forms
                  </h4>
                </div>
                <div className="text-xs text-slate-300 space-y-2 leading-relaxed font-medium">
                  <p>
                    <strong className="text-[#ffc800] block font-bold">الغرض من طلب الإذن:</strong>
                    تمكين المعلم من إنشاء اختبارات ومسابقات قرآنية إلكترونية تلقائياً للطلاب، واسترجاع درجات الإجابات لعرضها في لوحة المتصدرين.
                  </p>
                  <p className="text-[11px] text-[#1cb0f6] border-t border-white/10 pt-2">
                    ✓ يقتصر الوصول على النماذج التي يصممها المعلم خصيصاً لاختبارات حلقته القرآنية.
                  </p>
                </div>
              </div>

              {/* Google Drive Card */}
              <div className="p-5 rounded-2xl bg-[#203843] border-2 border-b-4 border-[#2b4550] space-y-3 shadow-inner hover:border-[#ffc800] transition-colors">
                <div className="flex items-center gap-2.5 text-[#ffc800]">
                  <HardDrive className="w-6 h-6" />
                  <h4 className="text-base font-bold text-white font-heading">
                    مساحة Google Drive (نطاق مخصص)
                  </h4>
                </div>
                <div className="text-xs text-slate-300 space-y-2 leading-relaxed font-medium">
                  <p>
                    <strong className="text-[#ffc800] block font-bold">الغرض من طلب الإذن:</strong>
                    حفظ أرشيف النسخ الاحتياطية المشفرة (JSON) للمجمع القرآني داخل مجلد مخصص للمنصة في مساحة المستخدم السحابية الشخصية لحفظ البيانات للأبد.
                  </p>
                  <p className="text-[11px] text-[#ffd233] border-t border-white/10 pt-2">
                    ✓ نستخدم النطاق المقيد (drive.file) دون أي إمكانية للاطلاع على أي ملفات أخرى في Drive.
                  </p>
                </div>
              </div>
            </div>

            {/* Zero-Sharing Affirmation */}
            <div className="bg-[#203843] border-2 border-b-4 border-[#2b4550] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffc800]/20 text-[#ffc800] flex items-center justify-center shrink-0 border border-[#ffc800]/40">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-xs sm:text-sm text-white font-medium">
                  <strong className="text-[#ffc800] block font-bold">تعهد بعدم بيع أو مشاركة البيانات:</strong>
                  تلتزم منظومة عُمران بعدم بيع أو مشاركة بيانات المستخدمين أو الطلاب مع أي طرف ثالث، ولا يتم استخدام بيانات Google لأي غرض غير تشغيل الوظائف القرآنية للمنصة.
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-xs text-[#ffc800] hover:text-white underline font-bold whitespace-nowrap cursor-pointer"
              >
                قراءة بنود الاستخدام المحدود (Limited Use)
              </button>
            </div>
          </motion.div>
        </section>

        {/* WORKFLOW: STUDENT & TEACHER JOURNEY */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black font-heading text-white">
              رحلة الحفظ والتقييم في المنظومة
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              خطوات متسلسلة ومتكاملة تضمن إتقان الحفظ وبناء الأجيال القرآنية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: '١', title: 'التسجيل وتوزيع الحلقات', desc: 'إضافة بيانات الطالب وتعيين الشيخ وتحديد خطة الحفظ المناسبة.' },
              { step: '٢', title: 'الاستماع المنزلي وتكرار الآيات', desc: 'استماع الطالب لمقرر الغد بالرسم العثماني وإتمام التكرار المطلوب.' },
              { step: '٣', title: 'التسميع وتقييم معايير التجويد', desc: 'رصد الحفظ والمراجعة وتقييم المخارج والأحكام واقتراح خطة الغد.' },
              { step: '٤', title: 'تقرير الواتساب وجداول Sheets', desc: 'إشعار فوري لولي الأمر بالإنجاز ومزامنة السجلات السحابية الدائمة.' },
              { step: '٥', title: 'الاختبارات والتتويج بالشهادات', desc: 'أداء اختبارات Google Forms والتكريم في لوحة الشرف والشهادات.' }
            ].map((step, idx) => (
              <div
                key={step.step}
                className="p-5 rounded-2xl bg-[#203843] border-2 border-b-4 border-[#2b4550] hover:border-[#ffc800] space-y-3 text-right transition-all shadow-md"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#ffc800] border-b-4 border-[#e5a500] text-[#131f24] font-black flex items-center justify-center text-sm shadow-md font-heading">
                  {step.step}
                </div>
                <h4 className="text-sm font-bold text-white font-heading">{step.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* USER ROLES SECTION */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="bg-[#1b2e35] border-2 border-b-4 border-[#2b4550] rounded-[32px] p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-bold font-heading text-white text-center">
              الفئات المستفيدة ومستويات الصلاحيات في المنظومة
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {[
                {
                  icon: Users,
                  color: 'text-[#ffc800]',
                  border: 'border-[#2b4550]',
                  title: 'المشرف العام وإدارة المجمعات',
                  desc: 'إدارة المجمعات والحلقات، تعيين المعلمين، ضبط إعدادات الربط السحابي ومراقبة الجودة الشاملة.'
                },
                {
                  icon: BookOpen,
                  color: 'text-[#ffd233]',
                  border: 'border-[#2b4550]',
                  title: 'معلمو الحلقات',
                  desc: 'تسجيل الحفظ اليومي، رصد الحضور والتسميع، إصدار تقارير الواتساب، وتصدير الدرجات لجداول Google Sheets.'
                },
                {
                  icon: GraduationCap,
                  color: 'text-[#1cb0f6]',
                  border: 'border-[#2b4550]',
                  title: 'الطلاب',
                  desc: 'متابعة الإنجاز القرآني، خوض الاختبارات الذكية، استعراض لوحة الشرف، والاستماع للتلاوات المتقنة.'
                },
                {
                  icon: HeartHandshake,
                  color: 'text-[#ce82ff]',
                  border: 'border-[#2b4550]',
                  title: 'أولياء الأمور',
                  desc: 'الاطلاع الفوري على تقارير الأبناء، متابعة الحضور والغياب، واستلام رسائل الإنجاز الدورية.'
                }
              ].map((role) => {
                const RoleIcon = role.icon;
                return (
                  <div
                    key={role.title}
                    className="p-4 rounded-2xl bg-[#203843] border-2 border-b-4 border-[#2b4550] space-y-1.5 hover:border-[#ffc800] transition-colors shadow-md"
                  >
                    <div className={`flex items-center gap-2 ${role.color} font-bold`}>
                      <RoleIcon className="w-4 h-4" />
                      <span>{role.title}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-medium">
                      {role.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black font-heading text-white">
              الأسئلة الشائعة حول المنظومة
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              إجابات وافية على كافة الاستفسارات الفنية والإدارية
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border-2 border-b-4 border-[#2b4550] bg-[#203843] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-right flex items-center justify-between gap-4 text-sm font-bold text-white cursor-pointer hover:bg-[#274452] transition-colors active:translate-y-0.5"
                  >
                    <span className="leading-relaxed">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#ffc800] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-5 pb-5 text-xs text-slate-200 leading-relaxed border-t-2 border-[#2b4550] pt-3 font-medium"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* CALL TO ACTION BOTTOM BANNER */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="bg-[#1b2e35] border-2 border-b-4 border-[#2b4550] rounded-[32px] p-6 sm:p-10 space-y-4 text-center sm:text-right flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-[#ffc800] font-bold text-xs">
                <Sparkles className="w-5 h-5 text-[#ffc800]" />
                <span>جاهز للارتقاء بمجمعك وحلقتك القرآنية؟</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                ابدأ الآن باستخدام منظومة عُمْرَان الرقمية المتكاملة
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed font-medium">
                انضم إلى المجمعات والحلقات الرائدة في إدارة تحفيظ القرآن الكريم ومتابعة الحفاظ بدقة وسهولة وأمان سحابي دائم.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#ffc800] border-2 border-[#ffc800] border-b-4 border-[#e5a500] hover:brightness-105 text-[#131f24] text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:translate-y-0.5"
              >
                <span>دخول لوحة التحكم</span>
                <Lock className="w-4 h-4 text-[#131f24]" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#2b4550] bg-[#0e171c] py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
            <div className="space-y-1.5">
              <div className="flex items-center justify-center md:justify-start gap-2 text-white font-bold text-sm">
                <BookOpen className="w-4 h-4 text-[#ffc800]" />
                <span>منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية</span>
              </div>
              <p className="text-[11px] text-[#ffd233] font-medium">
                خدمة كتاب الله تعالى وأهل القرآن الكريم • إشراف وبرمجة: م. محمد منتصر
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                الموقع المعتمد لتوثيق المنظومة واعتماد أذونات Google Cloud Console
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-[#ffc800] hover:text-white underline font-bold px-3.5 py-2 rounded-xl bg-[#203843] border-2 border-b-4 border-[#2b4550] cursor-pointer flex items-center gap-1.5 active:translate-y-0.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#ffc800]" />
                <span>سياسة الخصوصية (Privacy Policy)</span>
              </button>

              <button
                type="button"
                onClick={onOpenLogin}
                className="text-[#131f24] font-black px-4 py-2 rounded-xl bg-[#ffc800] border-2 border-[#ffc800] border-b-4 border-[#e5a500] hover:brightness-105 cursor-pointer active:translate-y-0.5"
              >
                تسجيل الدخول للمنظومة
              </button>

              <a
                href="mailto:fds421885@gmail.com"
                className="text-slate-300 hover:text-white transition-colors px-3.5 py-2 rounded-xl bg-[#203843] border-2 border-b-4 border-[#2b4550] font-medium"
                title="بريد الدعم الفني وتواصل المطور"
              >
                الدعم الفني: <span className="font-mono text-[#ffc800]">fds421885@gmail.com</span>
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2b4550] text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} منظومة عُمْرَان - جميع الحقوق محفوظة لخدمة مجمعات القرآن الكريم.</span>
            <span>Omran Quran Platform • Hosted on verified domain • All Google API terms strictly respected.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

