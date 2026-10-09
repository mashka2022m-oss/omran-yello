import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Award,
  Download,
  Share2,
  Printer,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Eye,
  Sliders,
  Type,
  Palette,
  ChevronLeft,
  ChevronRight,
  Send,
  Copy,
  Users,
  Search,
  BookOpen,
  Calendar,
  Layers,
  X,
  FileText,
  BookmarkCheck,
  Check,
  Filter
} from 'lucide-react';
import {
  Student,
  Halaqah,
  AppSettings,
  CustomCertificateTemplate,
  CertificateOccasion,
  IssuedCertificate,
  ExamSubmission,
  getStudentParentPhone,
  QuranComplex
} from '../../types';
import { QURAN_SURAHS, getSurahInfo } from '../../data/quranData';
import { OmranDataService, OMRAN_CACHE_KEYS, getLocalCache, setLocalCache } from '../../lib/firebase';
import { triggerComplexThemePulse } from '../../utils/highlightHelper';
import jsPDF from 'jspdf';

interface CertificatesTabProps {
  students: Student[];
  halaqahs: Halaqah[];
  settings: AppSettings;
  currentUserName: string;
  isSupervisor: boolean;
  isDeveloper: boolean;
  activeHalaqahId?: string;
  onUpdateSettings?: (settings: AppSettings) => Promise<void>;
  certificates?: IssuedCertificate[];
  onSaveCertificate?: (cert: IssuedCertificate) => Promise<void>;
  onSaveCertificates?: (certs: IssuedCertificate[]) => Promise<void>;
  onDeleteCertificate?: (certId: string) => Promise<void>;
  selectedComplexId?: string;
  activeComplexName?: string;
  activeComplex?: QuranComplex | null;
  submissions?: ExamSubmission[];
  initialHighlightId?: string;
}

// 10 Distinctive Arabic Calligraphic Fonts
export const ARABIC_FONTS = [
  { id: 'Amiri', name: 'الأميري (نسخ قرآني كلاسيكي)', family: "'Amiri', serif" },
  { id: 'Cairo', name: 'القاهرة (عصري وواضح)', family: "'Cairo', sans-serif" },
  { id: 'Tajawal', name: 'تجوال (هندسي رشيق)', family: "'Tajawal', sans-serif" },
  { id: 'Almarai', name: 'المراعي (متزن ورسمي)', family: "'Almarai', sans-serif" },
  { id: 'Aref Ruqaa', name: 'عارف رقعة (رقعة تراثي فاخر)', family: "'Aref Ruqaa', serif" },
  { id: 'Scheherazade New', name: 'شهرزاد (نسخ أصيل)', family: "'Scheherazade New', serif" },
  { id: 'Reem Kufi', name: 'ريم كوفي (كوفي هندسي زخرفي)', family: "'Reem Kufi', sans-serif" },
  { id: 'Changa', name: 'تشانجا (عريض وقوي)', family: "'Changa', sans-serif" },
  { id: 'El Messiri', name: 'المسيري (فني أنيق ومميز)', family: "'El Messiri', sans-serif" },
  { id: 'Lateef', name: 'لطيف (نسخ شامي رشيق)', family: "'Lateef', serif" }
];

export const JUZ_NAMES = [
  { num: 30, name: 'الجزء الثلاثون (جزء عَمَّ)' },
  { num: 29, name: 'الجزء التاسع والعشرون (جزء تَبَارَك)' },
  { num: 28, name: 'الجزء الثامن والعشرون (جزء قَدْ سَمِعَ)' },
  { num: 27, name: 'الجزء السابع والعشرون (جزء الذَّارِيَات)' },
  { num: 26, name: 'الجزء السادس والعشرون (جزء الأَحْقَاف)' },
  { num: 25, name: 'الجزء الخامس والعشرون (جزء إِلَيْهِ يُرَدُّ)' },
  { num: 24, name: 'الجزء الرابع والعشرون (جزء فَمَنْ أَظْلَمُ)' },
  { num: 23, name: 'الجزء الثالث والعشرون (جزء وَمَا لِيَ)' },
  { num: 22, name: 'الجزء الثاني والعشرون (جزء وَمَنْ يَقْنُتْ)' },
  { num: 21, name: 'الجزء الحادي والعشرون (جزء اتْلُ مَا أُوحِيَ)' },
  { num: 20, name: 'الجزء العشرون (جزء أَمَّنْ خَلَقَ)' },
  { num: 19, name: 'الجزء التاسع عشر (جزء وَقَالَ الَّذِينَ)' },
  { num: 18, name: 'الجزء الثامن عشر (جزء قَدْ أَفْلَحَ)' },
  { num: 17, name: 'الجزء السابع عشر (جزء اقْتَرَبَ)' },
  { num: 16, name: 'الجزء السادس عشر (جزء قَالَ أَلَمْ)' },
  { num: 15, name: 'الجزء الخامس عشر (جزء سُبْحَانَ)' },
  { num: 14, name: 'الجزء الرابع عشر (جزء رُبَمَا)' },
  { num: 13, name: 'الجزء الثالث عشر (جزء وَمَا أُبَرِّئُ)' },
  { num: 12, name: 'الجزء الثاني عشر (جزء وَمَا مِنْ دَابَّةٍ)' },
  { num: 11, name: 'الجزء الحادي عشر (جزء يَعْتَذِرُونَ)' },
  { num: 10, name: 'الجزء العاشر (جزء وَاعْلَمُوا)' },
  { num: 9, name: 'الجزء التاسع (جزء قَالَ الْمَلَأُ)' },
  { num: 8, name: 'الجزء الثامن (جزء وَلَوْ أَنَّنَا)' },
  { num: 7, name: 'الجزء السابع (جزء وَإِذَا سَمِعُوا)' },
  { num: 6, name: 'الجزء السادس (جزء لَا يُحِبُّ اللَّهُ)' },
  { num: 5, name: 'الجزء الخامس (جزء وَالْمُحْصَنَاتُ)' },
  { num: 4, name: 'الجزء الرابع (جزء لَنْ تَنَالُوا)' },
  { num: 3, name: 'الجزء الثالث (جزء تِلْكَ الرُّسُلُ)' },
  { num: 2, name: 'الجزء الثاني (جزء سَيَقُولُ)' },
  { num: 1, name: 'الجزء الأول (جزء الم)' }
];

export const READY_MADE_TEMPLATES = [
  {
    id: 'platform_emerald_royal',
    name: 'القالب الملكي الزمردي',
    subtitle: 'الثيم الرسمي الفاخر المعتمد للمجمع',
    bgClass: 'bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#022c22]',
    borderClass: 'border-[#fbbf24]',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
    isPlatform: true
  },
  {
    id: 'platform_imperial_gold',
    name: 'القالب الذهبي الأندلسي',
    subtitle: 'إطار ذهبي مزخرف بنقوش إسلامية رفيعة',
    bgClass: 'bg-gradient-to-br from-[#fffdf5] via-[#fef9c3] to-[#fef08a]',
    borderClass: 'border-[#b45309]',
    textColor: '#1c1917',
    accentColor: '#b45309',
    isPlatform: true
  },
  {
    id: 'platform_classic_heritage',
    name: 'القالب التراثي الكلاسيكي',
    subtitle: 'تصميم عريق باللون الأبيض العاجي والذهب المعتق',
    bgClass: 'bg-[#fffefb]',
    borderClass: 'border-[#064e3b]',
    textColor: '#064e3b',
    accentColor: '#d97706',
    isPlatform: true
  },
  {
    id: 'platform_celestial_sapphire',
    name: 'القالب الكحلي القرآني',
    subtitle: 'درجات الأزرق الملكي مع لمسات ذهبية براقة',
    bgClass: 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]',
    borderClass: 'border-[#fbbf24]',
    textColor: '#ffffff',
    accentColor: '#38bdf8',
    isPlatform: true
  }
];

export const CertificatesTab: React.FC<CertificatesTabProps> = ({
  students,
  halaqahs,
  settings,
  currentUserName,
  isSupervisor,
  isDeveloper,
  activeHalaqahId,
  onUpdateSettings,
  certificates = [],
  onSaveCertificate,
  onSaveCertificates,
  onDeleteCertificate,
  selectedComplexId,
  activeComplexName,
  activeComplex,
  submissions = [],
  initialHighlightId
}) => {
  // Navigation Sub-Tabs ('issue' | 'archive' | 'builder' | 'templates')
  const [activeSubTab, setActiveSubTab] = useState<'issue' | 'archive' | 'builder' | 'templates'>('issue');

  useEffect(() => {
    if (initialHighlightId) {
      setActiveSubTab('archive');
      setTimeout(() => {
        triggerComplexThemePulse(initialHighlightId);
      }, 350);
    }
  }, [initialHighlightId]);

  // Load custom templates (Dual persistence)
  const [customTemplates, setCustomTemplates] = useState<CustomCertificateTemplate[]>(() => {
    return getLocalCache<CustomCertificateTemplate[]>('omran_certificates_templates', []);
  });

  // Local certificates fallback
  const [localCertificates, setLocalCertificates] = useState<IssuedCertificate[]>(() => {
    return getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []);
  });

  // Keep local certificates in sync with props dynamically so UI reflects additions instantly without page refresh
  useEffect(() => {
    if (certificates && certificates.length > 0) {
      setLocalCertificates(prev => {
        const map = new Map<string, IssuedCertificate>();
        for (const c of certificates) if (c?.id) map.set(c.id, c);
        for (const c of prev) if (c?.id && !map.has(c.id)) map.set(c.id, c);
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }
  }, [certificates]);

  // Track deleted certificate IDs locally to ensure instantaneous and permanent deletion
  const [deletedCertIds, setDeletedCertIds] = useState<Set<string>>(() => {
    return OmranDataService.getDeletedCertificateIds();
  });

  // Success Popup Modal ("تم حفظ الشهادة منبثقة ويضغط تم ويديه لنماذجي")
  const [savedPopupModal, setSavedPopupModal] = useState<{
    isOpen: boolean;
    studentName?: string;
    count?: number;
  } | null>(null);

  // Automatically integrate passed exam submissions as certificates in the archive
  const examCertificates = useMemo<IssuedCertificate[]>(() => {
    if (!submissions || submissions.length === 0) return [];
    return submissions
      .filter(sub => (sub.percentage && sub.percentage >= 60) || sub.isPassed || (sub.totalScoreEarned && sub.totalScoreEarned > 0))
      .map(sub => {
        const pct = sub.percentage;
        const gradeLabel = pct >= 90 ? 'ممتاز مرتفع مع مرتبة الشرف' : (pct >= 80 ? 'جيد جداً مرتفع' : (pct >= 65 ? 'جيد' : 'اجتياز معتمد'));
        const dateObj = sub.submittedAt ? new Date(sub.submittedAt) : new Date();
        const dateArabic = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(dateObj);
        const dateGregorian = dateObj.toISOString().split('T')[0];
        return {
          id: `cert_exam_${sub.id}`,
          studentId: sub.studentId,
          studentName: sub.studentName,
          halaqahId: sub.halaqahId,
          halaqahName: sub.halaqahName,
          complexId: sub.complexId || selectedComplexId || activeComplex?.id,
          complexName: sub.complexName || activeComplex?.name || activeComplexName || settings.complexName || 'مجمع تحفيظ القرآن الكريم',
          occasion: 'اجتياز اختبار قرآني',
          occasionText: `اجتياز اختبار (${sub.examTitle}) بنتيجة ${sub.totalScoreEarned} من ${sub.maxPossibleScore} (${pct}%) • ${gradeLabel}`,
          templateId: 'platform_emerald_royal',
          templateName: 'شهادة اجتياز اختبار قرآني',
          templateType: 'ready',
          signatureMode: 'auto',
          dateArabic,
          dateGregorian,
          createdAt: sub.submittedAt || new Date().toISOString(),
          createdByName: 'نظام الاختبارات القرآنية'
        } as IssuedCertificate;
      });
  }, [submissions, selectedComplexId, activeComplexName, settings.complexName]);

  // Combined certificates list with exam certificates, excluding deleted ones
  // Combined certificates list with exam certificates, excluding deleted ones
  const allCertificates = useMemo(() => {
    const combinedMap = new Map<string, IssuedCertificate>();
    // 1. Include local certificates (instantly available upon saving)
    for (const c of localCertificates) {
      if (c?.id && !deletedCertIds.has(c.id)) {
        combinedMap.set(c.id, c);
      }
    }
    // 2. Merge certificates from props
    if (certificates && certificates.length > 0) {
      for (const c of certificates) {
        if (c?.id && !deletedCertIds.has(c.id)) {
          combinedMap.set(c.id, c);
        }
      }
    }
    // 3. Merge exam-generated certificates
    for (const ec of examCertificates) {
      if (ec?.id && !deletedCertIds.has(ec.id) && !combinedMap.has(ec.id)) {
        combinedMap.set(ec.id, ec);
      }
    }
    return Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [certificates, localCertificates, deletedCertIds, examCertificates]);

  // Saved confirmation toast ("تم حفظ الشهادة")
  const [savedSuccessToast, setSavedSuccessToast] = useState<string | null>(null);
  const [isSavingCert, setIsSavingCert] = useState(false);
  const [savedStudentIds, setSavedStudentIds] = useState<Set<string>>(new Set());

  // In-app Delete Confirmation Modal (solves window.confirm issue in iframes)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'template' | 'certificate';
    id: string;
    title: string;
  } | null>(null);

  // Archive filters
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveHalaqahFilter, setArchiveHalaqahFilter] = useState('all');
  const [archiveOccasionFilter, setArchiveOccasionFilter] = useState('all');

  // Filtered Archive Certificates
  const filteredArchiveCertificates = useMemo(() => {
    return allCertificates.filter(cert => {
      const q = archiveSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        cert.studentName.toLowerCase().includes(q) ||
        (cert.occasion && cert.occasion.toLowerCase().includes(q)) ||
        (cert.occasionText && cert.occasionText.toLowerCase().includes(q)) ||
        (cert.halaqahName && cert.halaqahName.toLowerCase().includes(q)) ||
        (cert.complexName && cert.complexName.toLowerCase().includes(q));
      const matchHalaqah = archiveHalaqahFilter === 'all' || cert.halaqahId === archiveHalaqahFilter;
      const matchOccasion = archiveOccasionFilter === 'all' || cert.occasion === archiveOccasionFilter;
      return matchSearch && matchHalaqah && matchOccasion;
    });
  }, [allCertificates, archiveSearch, archiveHalaqahFilter, archiveOccasionFilter]);

  // Save custom templates to local cache & cloud settings
  const saveCustomTemplates = async (updated: CustomCertificateTemplate[]) => {
    setCustomTemplates(updated);
    localStorage.setItem('omran_certificates_templates', JSON.stringify(updated));
    if (onUpdateSettings) {
      try {
        await onUpdateSettings({
          ...settings,
          customCertificatesTemplates: updated
        } as any);
      } catch (err) {
        console.warn('Failed to sync certificate templates to settings:', err);
      }
    }
  };

  // Sync from settings if available
  useEffect(() => {
    const fromSettings = (settings as any)?.customCertificatesTemplates;
    if (Array.isArray(fromSettings) && fromSettings.length > 0) {
      setCustomTemplates(fromSettings);
      localStorage.setItem('omran_certificates_templates', JSON.stringify(fromSettings));
    }
  }, [settings]);

  // Sync from activeComplex custom templates (including Assistant-created platform templates)
  useEffect(() => {
    if (activeComplex?.customCertificateTemplates && activeComplex.customCertificateTemplates.length > 0) {
      setCustomTemplates(prev => {
        const map = new Map<string, CustomCertificateTemplate>();
        for (const t of prev) map.set(t.id, t);
        for (const t of activeComplex.customCertificateTemplates!) map.set(t.id, t);
        const merged = Array.from(map.values());
        localStorage.setItem('omran_certificates_templates', JSON.stringify(merged));
        return merged;
      });
    }
  }, [activeComplex?.customCertificateTemplates]);

  // ---------------------------------------------------------------------------
  // TRACK 1: ISSUE CERTIFICATES STATE
  // ---------------------------------------------------------------------------
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>(activeHalaqahId || 'all');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('platform_emerald_royal');
  const [occasion, setOccasion] = useState<CertificateOccasion>('شكر وتقدير وتميز');
  const [selectedJuz, setSelectedJuz] = useState<number>(30);
  const [selectedSurahNum, setSelectedSurahNum] = useState<number>(78);
  const [examName, setExamName] = useState<string>('اختبار القرآن الكريم الفصلي');
  const [examScore, setExamScore] = useState<string>('ممتاز مع مرتبة الشرف');
  const [customOccasionText, setCustomOccasionText] = useState<string>('');
  const [customCertificateTitle, setCustomCertificateTitle] = useState<string>('شكر وتقدير');
  const [saveCustomTemplateOption, setSaveCustomTemplateOption] = useState<boolean>(false);
  const [customTemplateNameInput, setCustomTemplateNameInput] = useState<string>('');

  // Signatures configuration
  const [signatureMode, setSignatureMode] = useState<'auto' | 'custom' | 'none'>('auto');
  const [customTeacherName, setCustomTeacherName] = useState<string>(settings.teacherName || currentUserName || '');
  const [customSupervisorName, setCustomSupervisorName] = useState<string>(isSupervisor ? currentUserName : 'المشرف العام');

  // Live preview & generated certificates modal
  const [isGeneratedModalOpen, setIsGeneratedModalOpen] = useState(false);
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // TRACK 2: CUSTOM TEMPLATE BUILDER STATE
  // ---------------------------------------------------------------------------
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [builderName, setBuilderName] = useState('');
  const [builderImage, setBuilderImage] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [builderSuccess, setBuilderSuccess] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [savedTemplateModal, setSavedTemplateModal] = useState<{
    isOpen: boolean;
    templateId: string;
    templateName: string;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Free-form Drag & Drop on Canvas
  const [draggingElement, setDraggingElement] = useState<'name' | 'date' | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Floating Student Name Settings
  const [namePosX, setNamePosX] = useState<number>(50); // percentage 0-100
  const [namePosY, setNamePosY] = useState<number>(50); // percentage 0-100
  const [nameFontSize, setNameFontSize] = useState<number>(36);
  const [nameFontFamily, setNameFontFamily] = useState<string>('Amiri');
  const [nameColor, setNameColor] = useState<string>('#064e3b');
  const [nameTextAlign, setNameTextAlign] = useState<'center' | 'right' | 'left'>('center');
  const [nameFontWeight, setNameFontWeight] = useState<'normal' | 'bold' | '900'>('bold');
  const [testStudentName, setTestStudentName] = useState('محمد عبد الرحمن المنصور');

  // Floating Date Settings
  const [showDateOnCert, setShowDateOnCert] = useState<boolean>(true);
  const [datePosX, setDatePosX] = useState<number>(20);
  const [datePosY, setDatePosY] = useState<number>(85);
  const [dateFontSize, setDateFontSize] = useState<number>(14);
  const [dateFontFamily, setDateFontFamily] = useState<string>('Cairo');
  const [dateColor, setDateColor] = useState<string>('#4b5563');

  // Free-form Drag & Drop for student name and date on the canvas with window listener for 100% fluid dragging
  useEffect(() => {
    if (!draggingElement) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
      const boundedX = Math.round(Math.max(2, Math.min(98, rawX)));
      const boundedY = Math.round(Math.max(2, Math.min(98, rawY)));

      if (draggingElement === 'name') {
        setNamePosX(boundedX);
        setNamePosY(boundedY);
      } else if (draggingElement === 'date') {
        setDatePosX(boundedX);
        setDatePosY(boundedY);
      }
    };

    const handlePointerUp = () => {
      setDraggingElement(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingElement]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const certificatePrintRef = useRef<HTMLDivElement | null>(null);

  // Filter students based on halaqah and search
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchHalaqah = selectedHalaqahFilter === 'all' || s.halaqahId === selectedHalaqahFilter;
      const matchSearch = !studentSearch.trim() || s.name.toLowerCase().includes(studentSearch.trim().toLowerCase());
      return matchHalaqah && matchSearch;
    });
  }, [students, selectedHalaqahFilter, studentSearch]);

  // Selected students objects
  const targetStudents = useMemo(() => {
    const list = students.filter(s => selectedStudentIds.includes(s.id));
    if (list.length > 0) return list;
    // Fallback: if student selected from archive but not in current filtered student list
    if (selectedStudentIds.length > 0) {
      const fallbackList: Student[] = [];
      for (const id of selectedStudentIds) {
        const found = allCertificates.find(c => c.studentId === id);
        if (found) {
          fallbackList.push({
            id: found.studentId,
            name: found.studentName,
            complexId: found.complexId,
            halaqahId: found.halaqahId,
            halaqahName: found.halaqahName,
            points: 0,
            currentSurah: 1,
            currentSurahName: 'الفاتحة',
            currentAyah: 1,
            createdAt: found.createdAt
          } as unknown as Student);
        }
      }
      if (fallbackList.length > 0) return fallbackList;
    }
    return list;
  }, [students, selectedStudentIds, allCertificates]);

  // Whether the current preview student's certificate is already saved
  const isCurrentStudentSaved = useMemo(() => {
    const curStd = targetStudents[previewStudentIndex];
    if (!curStd) return false;
    if (savedStudentIds.has(curStd.id)) return true;
    return allCertificates.some(c => c.studentId === curStd.id && c.occasion === occasion);
  }, [targetStudents, previewStudentIndex, savedStudentIds, allCertificates, occasion]);

  // Selected template object
  const activeTemplate = useMemo(() => {
    const ready = READY_MADE_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (ready) {
      if (ready.id === 'platform_emerald_royal' && activeComplex?.theme) {
        return {
          type: 'ready' as const,
          data: {
            ...ready,
            name: `قالب هوية وثيم ${activeComplex.name || 'المجمع'}`,
            subtitle: `مستوحى مباشرة من الهوية المعتمدة وألوان ${activeComplex.name || 'المجمع'}`,
            accentColor: activeComplex.theme.accentColor || ready.accentColor,
            textColor: activeComplex.theme.textColor || ready.textColor
          }
        };
      }
      return { type: 'ready' as const, data: ready };
    }
    const custom = customTemplates.find(t => t.id === selectedTemplateId);
    if (custom) return { type: 'custom' as const, data: custom };
    return { type: 'ready' as const, data: READY_MADE_TEMPLATES[0] };
  }, [selectedTemplateId, customTemplates, activeComplex]);

  // Today dates
  const todayArabic = useMemo(() => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  }, []);

  const todayGregorian = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }, []);

  // Format Occasion Text
  const getOccasionDescription = () => {
    if (occasion === 'شكر وتقدير وتميز') {
      return 'لِتَفَوُّقِهِ وَانْضِبَاطِهِ المُتَمَيِّزِ فِي حِلْقَةِ القُرْآنِ الكَرِيمِ، وَحُسْنِ خُلُقِهِ وَمُوَاظَبَتِهِ عَلَى تِلَاوَةِ كِتَابِ اللهِ تَعَالَى';
    }
    if (occasion === 'إتمام جزء من القرآن الكريم') {
      const juzObj = JUZ_NAMES.find(j => j.num === selectedJuz);
      return `لإِتْمَامِهِ حِفْظَ وَإِتْقَانَ (${juzObj?.name || `الجزء ${selectedJuz}`}) كَامِلاً بِمَشِيئَةِ اللهِ وَعَوْنِهِ بِمُسْتَوَى رَفِيعٍ`;
    }
    if (occasion === 'إتمام سورة من القرآن الكريم') {
      const sInfo = getSurahInfo(selectedSurahNum);
      return `لإِتْمَامِهِ حِفْظَ وَتَسْمِيعَ (سُورَةِ ${sInfo.name}) كَامِلَةً مُتْقَنَةً بِأَحْكَامِ التَّجْوِيدِ`;
    }
    if (occasion === 'اجتياز اختبار قرآني') {
      return `لاِجْتِيَازِهِ بِجَدَارَةٍ (${examName}) بِتَقْدِيرِ (${examScore})، نَسْأَلُ اللهَ أَنْ يَنْفَعَ بِهِ الإِسْلَامَ وَالمُسْلِمِينَ`;
    }
    if (occasion === 'مواظبة وانضباط قرآني') {
      return 'لِالْتِزَامِهِ المُسْتَمِرِّ وَحُضُورِهِ النَّمُوذَجِيِّ وَانْضِبَاطِهِ الرَّفِيعِ فِي جَمِيعِ أَيَّامِ الحِلْقَةِ القُرْآنِيَّةِ';
    }
    return customOccasionText.trim() || 'لِتَمَيُّزِهِ وَاجْتِهَادِهِ فِي حِلْقَةِ القُرْآنِ الكَرِيمِ وَحِفْظِ كِتَابِ اللهِ';
  };

  // Helper to dynamically get the top Certificate Title (e.g. شكر وتقدير، إتمام جزء، إلخ)
  const getCertificateHeaderTitle = (certOccasion?: string, certTitle?: string): string => {
    if (certTitle && certTitle.trim()) return certTitle.trim();
    const effectiveOcc = certOccasion || occasion;
    if (effectiveOcc === 'مناسبة مخصصة') {
      return customCertificateTitle.trim() || 'شَهَادَةُ شُكْرٍ وَتَقْدِيرٍ';
    }
    if (effectiveOcc === 'إتمام جزء من القرآن الكريم') {
      return 'شَهَادَةُ إِتْمَامِ جُزْءٍ قُرْآنِيٍّ';
    }
    if (effectiveOcc === 'إتمام سورة من القرآن الكريم') {
      return 'شَهَادَةُ إِتْمَامِ سُورَةٍ قُرْآنِيَّةٍ';
    }
    if (effectiveOcc === 'اجتياز اختبار قرآني') {
      return 'شَهَادَةُ اجْتِيَازِ وَتَفَوُّقٍ فِي الاخْتِبَارِ';
    }
    if (effectiveOcc === 'مواظبة وانضباط قرآني') {
      return 'شَهَادَةُ انْضِبَاطٍ وَمُوَاظَبَةٍ قُرْآنِيَّةٍ';
    }
    return 'شَهَادَةُ تَمَيُّزٍ وَإِتْقَانٍ قُرْآنِيٍّ';
  };

  // Handle Multi-Select helpers
  const handleSelectAllFiltered = () => {
    const allIds = filteredStudents.map(s => s.id);
    const newSelected = Array.from(new Set([...selectedStudentIds, ...allIds]));
    setSelectedStudentIds(newSelected);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredStudents.map(s => s.id));
    setSelectedStudentIds(selectedStudentIds.filter(id => !filteredIds.has(id)));
  };

  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(i => i !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // ---------------------------------------------------------------------------
  // UPLOAD CUSTOM TEMPLATE HANDLER (STRICT 5MB LIMIT)
  // ---------------------------------------------------------------------------
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuilderError(null);
    setBuilderSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 5MB limit validation as specified by user
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      setBuilderError('حجم صورة الشهادة يتجاوز الحد الأقصى المسموح به (5 ميجابايت). يرجى اختيار صورة بدقة مناسبة لا تتجاوز 5 ميجا.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setBuilderError('يرجى اختيار ملف صورة صالح (PNG, JPG, JPEG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBuilderImage(reader.result as string);
      if (!builderName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setBuilderName(`نموذج ${cleanName}`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Custom Template
  const handleSaveCustomTemplate = async () => {
    setBuilderError(null);
    setBuilderSuccess(null);

    if (!builderImage) {
      setBuilderError('يرجى رفع صورة قالب الشهادة أولاً.');
      return;
    }

    if (!builderName.trim()) {
      setBuilderError('يرجى تسمية النموذج لحفظه في قائمة النماذج.');
      return;
    }

    // Check maximum 5 custom uploaded templates per complex (AI/platform templates are excluded from this quota)
    const uploadedTemplatesCount = customTemplates.filter(t => !t.isPlatformAiTemplate).length;
    if (!editingTemplateId && uploadedTemplatesCount >= 5) {
      setBuilderError('تم الوصول للحد الأقصى المسموح به للنماذج المرفوعة (5 نماذج لكل مجمع). يمكنك تعديل أو حذف أحد النماذج السابقة لإضافة نموذج جديد.');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const newTemplate: CustomCertificateTemplate = {
        id: editingTemplateId || `custom_tpl_${Date.now()}`,
        complexId: settings.complexName || 'main_complex',
        halaqahId: activeHalaqahId,
        name: builderName.trim(),
        imageUrl: builderImage,
        studentNamePosition: {
          x: namePosX,
          y: namePosY,
          fontSize: nameFontSize,
          fontFamily: nameFontFamily,
          color: nameColor,
          textAlign: nameTextAlign,
          fontWeight: nameFontWeight
        },
        showDate: showDateOnCert,
        datePosition: {
          x: datePosX,
          y: datePosY,
          fontSize: dateFontSize,
          fontFamily: dateFontFamily,
          color: dateColor,
          textAlign: 'center'
        },
        createdByTeacherName: currentUserName,
        createdAt: new Date().toISOString()
      };

      let updated: CustomCertificateTemplate[];
      if (editingTemplateId) {
        updated = customTemplates.map(t => (t.id === editingTemplateId ? newTemplate : t));
      } else {
        updated = [...customTemplates, newTemplate];
      }

      await saveCustomTemplates(updated);
      setSelectedTemplateId(newTemplate.id);
      setEditingTemplateId(null);
      setBuilderImage(null);
      setBuilderName('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Open Success Popup Modal!
      setSavedTemplateModal({
        isOpen: true,
        templateId: newTemplate.id,
        templateName: newTemplate.name
      });
    } catch (err: any) {
      console.error('Failed to save custom template:', err);
      setBuilderError(err?.message || 'حدث خطأ أثناء حفظ النموذج.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Edit existing custom template
  const handleEditTemplate = (tpl: CustomCertificateTemplate) => {
    setEditingTemplateId(tpl.id);
    setBuilderName(tpl.name);
    setBuilderImage(tpl.imageUrl);
    setNamePosX(tpl.studentNamePosition.x);
    setNamePosY(tpl.studentNamePosition.y);
    setNameFontSize(tpl.studentNamePosition.fontSize);
    setNameFontFamily(tpl.studentNamePosition.fontFamily);
    setNameColor(tpl.studentNamePosition.color);
    setNameTextAlign(tpl.studentNamePosition.textAlign);
    setNameFontWeight(tpl.studentNamePosition.fontWeight || 'bold');
    setShowDateOnCert(!!tpl.showDate);
    if (tpl.datePosition) {
      setDatePosX(tpl.datePosition.x);
      setDatePosY(tpl.datePosition.y);
      setDateFontSize(tpl.datePosition.fontSize);
      setDateFontFamily(tpl.datePosition.fontFamily);
      setDateColor(tpl.datePosition.color);
    }
    setActiveSubTab('builder');
  };

  // Confirm and execute deletion (Zero window.confirm, 100% works in iframes)
  const confirmDeleteAction = async () => {
    if (!deleteConfirmModal || isDeletingItem) return;
    const { type, id } = deleteConfirmModal;
    setIsDeletingItem(true);
    try {
      if (type === 'template') {
        const updated = customTemplates.filter(t => t.id !== id);
        await saveCustomTemplates(updated);
        if (selectedTemplateId === id) {
          setSelectedTemplateId('platform_emerald_royal');
        }
        setCopiedNotification('تم حذف النموذج بنجاح.');
        setTimeout(() => setCopiedNotification(null), 4000);
      } else if (type === 'certificate') {
        // 1. Instantly track as deleted so it immediately vanishes from the UI and never resurrects
        OmranDataService.addDeletedCertificateId(id);
        setDeletedCertIds(prev => new Set([...prev, id]));
        // 2. Instantly filter from local state
        setLocalCertificates(prev => prev.filter(c => c.id !== id));
        // 3. Clean from localStorage
        try {
          const stored = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []);
          setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, stored.filter(c => c.id !== id));
        } catch (e) {}
        // 4. Notify parent / Firestore
        if (onDeleteCertificate) {
          try {
            await onDeleteCertificate(id);
          } catch (e) {
            console.warn('onDeleteCertificate notice:', e);
          }
        } else {
          try {
            await OmranDataService.deleteCertificate(id);
          } catch (e) {
            console.warn('OmranDataService.deleteCertificate notice:', e);
          }
        }
        setCopiedNotification('تم حذف الشهادة بنجاح.');
        setSavedSuccessToast('تم حذف الشهادة بنجاح');
        setTimeout(() => {
          setCopiedNotification(null);
          setSavedSuccessToast(null);
        }, 4000);
      }
      setDeleteConfirmModal(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Open Delete Confirmation Modal for Template
  const handleDeleteTemplate = (id: string, name?: string) => {
    const tpl = customTemplates.find(t => t.id === id);
    setDeleteConfirmModal({
      isOpen: true,
      type: 'template',
      id,
      title: name || tpl?.name || 'النموذج المخصص'
    });
  };

  // Open Delete Confirmation Modal for Certificate
  const handleDeleteCertificateClick = (cert: IssuedCertificate) => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'certificate',
      id: cert.id,
      title: `شهادة الطالب: ${cert.studentName} (${cert.occasion})`
    });
  };

  // Build IssuedCertificate payload
  const createCertificatePayload = (student: Student): IssuedCertificate => {
    const halaqahName = student.halaqahName || settings.halaqahName;
    const complexName = activeComplex?.name || activeComplexName || settings.complexName || 'مجمع تحفيظ القرآن الكريم';
    const teacherTitle = signatureMode === 'custom'
      ? customTeacherName
      : (student.halaqahName ? `معلم ${student.halaqahName}` : settings.teacherName);
    const supervisorTitle = signatureMode === 'custom'
      ? customSupervisorName
      : (complexName ? `مشرف ${complexName}` : 'المشرف العام');

    return {
      id: `cert_${student.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: student.id,
      studentName: student.name,
      halaqahId: student.halaqahId || activeHalaqahId,
      halaqahName,
      complexId: selectedComplexId || settings.complexName,
      complexName,
      occasion,
      occasionText: getOccasionDescription(),
      templateId: selectedTemplateId,
      templateName: activeTemplate.data.name,
      templateType: activeTemplate.type,
      customTemplateImageUrl: activeTemplate.type === 'custom' ? activeTemplate.data.imageUrl : undefined,
      signatureMode,
      teacherName: signatureMode !== 'none' ? teacherTitle : undefined,
      supervisorName: signatureMode !== 'none' ? supervisorTitle : undefined,
      dateArabic: todayArabic,
      dateGregorian: todayGregorian,
      createdAt: new Date().toISOString(),
      createdByName: currentUserName
    };
  };

  // Save single student's certificate
  const handleSaveCertificateForStudent = async (student: Student) => {
    if (!student || isSavingCert) return;
    setIsSavingCert(true);
    try {
      const cert = createCertificatePayload(student);
      // Immediately reflect in UI & local state
      setLocalCertificates(prev => [cert, ...prev.filter(c => c.id !== cert.id)]);
      setSavedStudentIds(prev => new Set([...prev, student.id]));

      // Save to localStorage immediately so archive reflects it instantly
      try {
        const stored = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []);
        const updatedStored = [cert, ...stored.filter(c => c.id !== cert.id)];
        setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, updatedStored);
      } catch (e) {}

      if (onSaveCertificate) {
        await onSaveCertificate(cert);
      } else {
        await OmranDataService.saveCertificate(cert);
      }
      setSavedSuccessToast('تم حفظ الشهادة بنجاح في الأرشيف!');
      setSavedPopupModal({
        isOpen: true,
        studentName: student.name,
        count: 1
      });
      setTimeout(() => setSavedSuccessToast(null), 4000);
    } catch (err) {
      console.warn('Certificate local save completed, remote sync warning:', err);
      setSavedSuccessToast('تم حفظ الشهادة بنجاح');
      setTimeout(() => setSavedSuccessToast(null), 4000);
    } finally {
      setIsSavingCert(false);
    }
  };

  // Save all target students certificates
  const handleSaveAllCertificates = async () => {
    if (targetStudents.length === 0 || isSavingCert) return;
    setIsSavingCert(true);
    try {
      const certsToSave = targetStudents.map(s => createCertificatePayload(s));
      setLocalCertificates(prev => {
        const map = new Map<string, IssuedCertificate>();
        for (const c of certsToSave) map.set(c.id, c);
        for (const c of prev) if (!map.has(c.id)) map.set(c.id, c);
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setSavedStudentIds(new Set(targetStudents.map(s => s.id)));

      try {
        const stored = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []);
        const map = new Map<string, IssuedCertificate>();
        for (const c of stored) if (c?.id) map.set(c.id, c);
        for (const c of certsToSave) if (c?.id) map.set(c.id, c);
        setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, Array.from(map.values()));
      } catch (e) {}

      if (onSaveCertificates) {
        await onSaveCertificates(certsToSave);
      } else {
        await OmranDataService.saveCertificates(certsToSave);
      }
      setSavedSuccessToast(`تم حفظ (${targetStudents.length}) شهادة بنجاح في الأرشيف`);
      setSavedPopupModal({
        isOpen: true,
        count: targetStudents.length
      });
      setTimeout(() => setSavedSuccessToast(null), 4000);
    } catch (err) {
      console.warn('Batch certificates local save completed, remote sync notice:', err);
      setSavedSuccessToast('تم حفظ الشهادات بنجاح');
      setTimeout(() => setSavedSuccessToast(null), 4000);
    } finally {
      setIsSavingCert(false);
    }
  };

  // Preview Archive certificate
  const handleOpenPreviewFromArchive = (cert: IssuedCertificate) => {
    setSelectedStudentIds([cert.studentId]);
    setSelectedTemplateId(cert.templateId);
    setOccasion(cert.occasion as any);
    setCustomOccasionText(cert.occasionText);
    setSignatureMode(cert.signatureMode || 'auto');
    if (cert.teacherName) setCustomTeacherName(cert.teacherName);
    if (cert.supervisorName) setCustomSupervisorName(cert.supervisorName);
    setPreviewStudentIndex(0);
    setIsGeneratedModalOpen(true);
  };

  // Download PDF from Archive
  const handleDownloadArchiveSinglePdf = async (cert: IssuedCertificate) => {
    setIsExporting(true);
    setExportStatusText('جاري تجهيز وتحميل ملف الـ PDF...');
    try {
      const student: Student = students.find(s => s.id === cert.studentId) || ({
        id: cert.studentId,
        name: cert.studentName,
        halaqahId: cert.halaqahId,
        halaqahName: cert.halaqahName
      } as any);
      const { pdf, file } = await generateSinglePdfDoc(student, 0);
      pdf.save(file.name);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
      setExportStatusText(null);
    }
  };

  // WhatsApp share from Archive
  const handleSendWhatsAppForArchive = async (cert: IssuedCertificate) => {
    const student: Student = students.find(s => s.id === cert.studentId) || ({
      id: cert.studentId,
      name: cert.studentName,
      halaqahId: cert.halaqahId,
      halaqahName: cert.halaqahName
    } as any);
    await handleSendWhatsApp(student, 0);
  };

  // ---------------------------------------------------------------------------
  // EXPORT AND DOWNLOAD HANDLERS
  // ---------------------------------------------------------------------------
  // Helper to render high-resolution canvas for a student's certificate
  const renderCertificateCanvas = async (student: Student, _index: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    // Ultra-High-Definition 300+ DPI A4 Landscape (3508 x 2480 pixels)
    const baseWidth = 1754;
    const baseHeight = 1240;
    const scale = 2; // 2x Super-Resolution for pristine 300 DPI print & ultra-crisp vectors
    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);

    const width = baseWidth;
    const height = baseHeight;

    try {
      await document.fonts.ready;
    } catch (e) {}

    if (activeTemplate.type === 'custom') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeTemplate.data.imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      ctx.drawImage(img, 0, 0, width, height);

      // Student Name
      const pos = activeTemplate.data.studentNamePosition;
      const fFamily = ARABIC_FONTS.find(f => f.id === pos.fontFamily)?.id || 'Amiri';
      ctx.font = `${pos.fontWeight || 'bold'} ${Math.round(pos.fontSize * 1.8)}px '${fFamily}', serif`;
      ctx.fillStyle = pos.color || '#064e3b';
      ctx.textAlign = pos.textAlign || 'center';
      const px = (pos.x / 100) * width;
      const py = (pos.y / 100) * height;
      ctx.fillText(student.name, px, py);

      // Date if enabled
      if (activeTemplate.data.showDate && activeTemplate.data.datePosition) {
        const dPos = activeTemplate.data.datePosition;
        const dFamily = ARABIC_FONTS.find(f => f.id === dPos.fontFamily)?.id || 'Cairo';
        ctx.font = `${Math.round(dPos.fontSize * 1.8)}px '${dFamily}', sans-serif`;
        ctx.fillStyle = dPos.color || '#4b5563';
        ctx.textAlign = dPos.textAlign || 'center';
        ctx.fillText(todayArabic, (dPos.x / 100) * width, (dPos.y / 100) * height);
      }
    } else {
      // Ready-made platform certificate
      const isEmeraldTheme = activeTemplate.data.id === 'platform_emerald_royal';
      const cTheme = activeComplex?.theme;
      const certAccentColor = activeTemplate.data.accentColor || '#fbbf24';
      const certTextColor = activeTemplate.data.textColor || '#ffffff';

      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (isEmeraldTheme && cTheme) {
        grad.addColorStop(0, cTheme.primaryColor || '#022c22');
        grad.addColorStop(0.5, cTheme.secondaryColor || '#064e3b');
        grad.addColorStop(1, cTheme.primaryColor || '#022c22');
      } else if (isEmeraldTheme) {
        grad.addColorStop(0, '#022c22');
        grad.addColorStop(0.5, '#064e3b');
        grad.addColorStop(1, '#022c22');
      } else if (activeTemplate.data.id === 'platform_imperial_gold') {
        grad.addColorStop(0, '#fffdf5');
        grad.addColorStop(0.5, '#fef9c3');
        grad.addColorStop(1, '#fef08a');
      } else if (activeTemplate.data.id === 'platform_celestial_sapphire') {
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#0f172a');
      } else {
        grad.addColorStop(0, '#fffefb');
        grad.addColorStop(1, '#fffefb');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Outer gold border
      ctx.lineWidth = 18;
      ctx.strokeStyle = certAccentColor;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // Inner thin border
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = activeTemplate.data.id === 'platform_imperial_gold' ? '#b4530944' : `${certAccentColor}44`;
      ctx.strokeRect(56, 56, width - 112, height - 112);

      // 0. Top Official Complex Logo & Identity (Top-Right)
      const complexLogoToDraw = (activeComplex?.logoUrl || settings?.themeLogoUrl || '').trim();
      const complexName = activeComplex?.name || activeComplexName || settings.complexName || 'مجمع تحفيظ القرآن الكريم';
      let logoDrawn = false;
      if (complexLogoToDraw) {
        try {
          const lImg = new Image();
          lImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            lImg.onload = () => resolve();
            lImg.onerror = () => reject();
            lImg.src = complexLogoToDraw;
          });
          ctx.save();
          ctx.beginPath();
          ctx.arc(width - 150, 130, 48, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(lImg, width - 150 - 48, 130 - 48, 96, 96);
          ctx.restore();

          // Border ring around logo
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = certAccentColor;
          ctx.beginPath();
          ctx.arc(width - 150, 130, 48, 0, Math.PI * 2);
          ctx.stroke();

          // Caption under logo
          ctx.font = "bold 16px 'Cairo', sans-serif";
          ctx.fillStyle = certAccentColor;
          ctx.textAlign = 'center';
          const shortName = complexName.length > 20 ? complexName.substring(0, 20) + '...' : complexName;
          ctx.fillText(shortName, width - 150, 195);
          logoDrawn = true;
        } catch (e) {
          logoDrawn = false;
        }
      }

      if (!logoDrawn) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(width - 150, 130, 44, 0, Math.PI * 2);
        ctx.fillStyle = `${certAccentColor}22`;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = certAccentColor;
        ctx.stroke();
        ctx.font = "900 34px 'Cairo', sans-serif";
        ctx.fillStyle = certAccentColor;
        ctx.textAlign = 'center';
        ctx.fillText(complexName.replace(/^(مجمع|مراكز|حلقات|جمعية)\s+/i, '').trim().charAt(0) || 'ق', width - 150, 142);
        ctx.font = "bold 15px 'Cairo', sans-serif";
        const shortName = complexName.length > 20 ? complexName.substring(0, 20) + '...' : complexName;
        ctx.fillText(shortName, width - 150, 195);
        ctx.restore();
      }

      // Top-Left: Official Accreditation Emblem
      ctx.save();
      ctx.font = "bold 18px 'Cairo', sans-serif";
      ctx.fillStyle = certAccentColor;
      ctx.textAlign = 'center';
      ctx.fillText('اعتماد رسمي موثق', 150, 125);
      ctx.font = "14px 'Cairo', sans-serif";
      ctx.fillStyle = certTextColor;
      ctx.fillText('منظومة عمران القرآنية', 150, 150);
      ctx.restore();

      // 1. Basmalah
      ctx.fillStyle = certAccentColor;
      ctx.textAlign = 'center';
      ctx.font = "bold 34px 'Amiri', serif";
      ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, 130);

      // 2. Quranic Ayah with correct orientation brackets
      ctx.font = "24px 'Amiri', serif";
      ctx.fillText('\uFD3E يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ \uFD3F', width / 2, 195);

      // 3. Title
      ctx.font = "900 58px 'Cairo', sans-serif";
      ctx.fillStyle = certAccentColor;
      ctx.fillText('شَهَادَةُ تَمَيُّزٍ وَإِتْقَانٍ قُرْآنِيٍّ', width / 2, 305);

      // 4. Intro text
      ctx.font = "26px 'Cairo', sans-serif";
      ctx.fillStyle = certTextColor;
      ctx.fillText('يَسُرُّ إِدَارَةَ الحِلْقَةِ أَنْ تَمْنَحَ هذِهِ الشَّهَادَةَ المُبَارَكَةَ لِلطَّالِبِ النَّجِيبِ:', width / 2, 400);

      // 5. Student Name
      ctx.font = "bold 68px 'Amiri', serif";
      ctx.fillStyle = certAccentColor;
      ctx.fillText(student.name, width / 2, 510);

      // 6. Occasion
      ctx.font = "26px 'Cairo', sans-serif";
      ctx.fillStyle = certTextColor;
      const occText = getOccasionDescription();
      ctx.fillText(occText, width / 2, 600);

      // 7. Halaqah & Complex
      const halaqahName = student.halaqahName || settings.halaqahName;
      ctx.font = "22px 'Cairo', sans-serif";
      ctx.fillText(`الحلقة: ${halaqahName} • المجمع: ${complexName}`, width / 2, 680);

      // 8. Signatures
      if (signatureMode !== 'none') {
        const tName = signatureMode === 'custom' ? customTeacherName : (student.halaqahName ? `معلم ${student.halaqahName}` : settings.teacherName);
        const sName = signatureMode === 'custom' ? customSupervisorName : (settings.complexName ? `مشرف ${settings.complexName}` : 'المشرف العام');

        ctx.font = "bold 24px 'Cairo', sans-serif";
        ctx.textAlign = 'right';
        ctx.fillText(`معلم الحلقة: ${tName}`, width - 260, 920);
        ctx.textAlign = 'left';
        ctx.fillText(`المشرف العام: ${sName}`, 260, 920);
      }

      // 9. Complex Official Seal in bottom-left corner
      let stampDrawn = false;
      const complexStampToDraw = (activeComplex?.stampUrl || settings?.themeStampUrl || '').trim();
      if (complexStampToDraw) {
        try {
          const sImg = new Image();
          sImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            sImg.onload = () => resolve();
            sImg.onerror = () => reject();
            sImg.src = complexStampToDraw;
          });
          ctx.save();
          ctx.beginPath();
          ctx.arc(180, 1050, 55, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(sImg, 125, 995, 110, 110);
          ctx.restore();

          // Border ring around stamp
          ctx.lineWidth = 3;
          ctx.strokeStyle = certAccentColor;
          ctx.beginPath();
          ctx.arc(180, 1050, 55, 0, Math.PI * 2);
          ctx.stroke();

          stampDrawn = true;
        } catch (e) {
          stampDrawn = false;
        }
      }

      if (!stampDrawn) {
        ctx.textAlign = 'center';
        ctx.fillStyle = certAccentColor;
        ctx.beginPath();
        ctx.arc(180, 1050, 55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = activeTemplate.data.id === 'platform_imperial_gold' ? '#ffffff' : (cTheme?.primaryColor || '#064e3b');
        ctx.font = "bold 15px 'Cairo', sans-serif";
        const shortComp = complexName.length > 18 ? complexName.substring(0, 18) + '...' : complexName;
        ctx.fillText(shortComp, 180, 1042);
        ctx.font = "bold 13px 'Cairo', sans-serif";
        ctx.fillText('ختم معتمد', 180, 1065);
      }

      // 10. Dates (Centered cleanly along the bottom)
      ctx.font = "20px 'Cairo', sans-serif";
      ctx.fillStyle = certTextColor;
      ctx.textAlign = 'center';
      ctx.fillText(`تاريخ الإصدار: ${todayArabic} • الموافق: ${todayGregorian}`, width / 2 + 50, 1055);
    }

    return canvas;
  };

  // Helper to generate jsPDF document
  const generateSinglePdfDoc = async (student: Student, index: number): Promise<{ pdf: jsPDF; blob: Blob; file: File }> => {
    const canvas = await renderCertificateCanvas(student, index);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'SLOW');
    const blob = pdf.output('blob');
    const fileName = `شهادة_${student.name.replace(/\s+/g, '_')}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });
    return { pdf, blob, file };
  };

  // 1. Download single PNG
  const handleDownloadSinglePNG = async (student: Student, index: number) => {
    setIsExporting(true);
    setExportStatusText('جاري إنشاء صورة الشهادة عالية الدقة...');
    try {
      const canvas = await renderCertificateCanvas(student, index);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `شهادة_${student.name.replace(/\s+/g, '_')}_${index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsExporting(false);
      setExportStatusText(null);
    }
  };

  // 2. Download single PDF
  const handleDownloadSinglePDF = async (student: Student, index: number) => {
    setIsExporting(true);
    setExportStatusText('جاري تجهيز وتحميل ملف الـ PDF...');
    try {
      const { pdf, file } = await generateSinglePdfDoc(student, index);
      pdf.save(file.name);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
      setExportStatusText(null);
    }
  };

  // 3. Download All Merged PDF
  const handleDownloadAllMergedPDF = async () => {
    if (targetStudents.length === 0) return;
    setIsExporting(true);
    setExportStatusText(`جاري تجميع ${targetStudents.length} شهادة في ملف PDF واحد...`);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      for (let i = 0; i < targetStudents.length; i++) {
        setExportStatusText(`جاري معالجة شهادة (${i + 1} من ${targetStudents.length}): ${targetStudents[i].name}...`);
        if (i > 0) pdf.addPage('a4', 'landscape');
        const canvas = await renderCertificateCanvas(targetStudents[i], i);
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'SLOW');
      }
      pdf.save(`شهادات_الطلاب_المجمعة_${targetStudents.length}.pdf`);
    } catch (err) {
      console.error('Failed to export merged PDF:', err);
    } finally {
      setIsExporting(false);
      setExportStatusText(null);
    }
  };

  // 4. Send via WhatsApp With PDF
  const handleSendWhatsApp = async (student: Student, index: number = previewStudentIndex) => {
    setIsExporting(true);
    setExportStatusText('جاري إنشاء ملف الشهادة PDF لمشاركته عبر الواتساب...');
    const parentPhone = getStudentParentPhone(student);
    const cleanPhone = parentPhone ? parentPhone.replace(/\D/g, '') : '';
    const occasionText = getOccasionDescription();
    const halaqahName = student.halaqahName || settings.halaqahName;

    const message = `السلام عليكم ورحمة الله وبركاته،
نزف إليكم أسمى آيات التهاني والتبريكات بمناسبة حصول ابنكم المتميز *(${student.name})* على شهادة شكر وتقدير وإتقان قرآني من حلقة: *${halaqahName}*.

🌟 *المناسبة:*
${occasionText}

📄 *مرفق مع هذه الرسالة ملف الشهادة المعتمدة (PDF).*
نسأل الله تعالى أن يجعله من أهل القرآن العظيم وأن ينفع به والديه وأمته.
مع تحيات إدارة حلقة ${halaqahName} • ${activeComplex?.name || settings.complexName || 'مجمع تحفيظ القرآن الكريم'}`;

    try {
      const { pdf, file } = await generateSinglePdfDoc(student, index);

      // 1. Try Native Web Share API with File (Mobile Chrome on Android, iOS Safari, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `شهادة إتقان: ${student.name}`,
            text: message
          });
          setIsExporting(false);
          setExportStatusText(null);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setIsExporting(false);
            setExportStatusText(null);
            return;
          }
          console.warn('Native share failed, using download fallback:', shareErr);
        }
      }

      // 2. Direct Fallback: Download the PDF file directly to device
      pdf.save(file.name);

      // 3. Open WhatsApp with message
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      // 4. Inform user with prominent message
      setCopiedNotification(
        `تم تنزيل ملف الشهادة (PDF: ${file.name}) إلى جهازك وفتح محادثة الواتساب؛ يمكنك الآن إرفاق ملف الـ PDF فوراً في المحادثة لولي الأمر!`
      );
      setTimeout(() => setCopiedNotification(null), 7000);
    } catch (err) {
      console.error('Error sharing PDF via WhatsApp:', err);
    } finally {
      setIsExporting(false);
      setExportStatusText(null);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* --------------------------------------------------------------------- */}
      {/* Top Banner & Sub-Tabs Navigation                                      */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] p-6 rounded-3xl border border-[#fbbf24]/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
            <Award className="w-4 h-4 text-[#fbbf24]" />
            <span>نظام الشهادات والأوسمة القرآنية الرسمية</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
            إصدار وتصميم شهادات التميز والإتقان القرآني
          </h2>
          <p className="text-xs text-[#86efac]/90 mt-1 max-w-2xl leading-relaxed">
            استخراج شهادات الشكر، إتمام الأجزاء، حفظ السور، والاختبارات القرآنية بنماذج رسمية فاخرة أو رفع وتخصيص نماذج المجمع الخاصة بكل سهولة.
          </p>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-1.5 bg-[#022c22] p-1.5 rounded-2xl border border-[#065f46] shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('issue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'issue'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                : 'text-[#86efac] hover:text-white hover:bg-[#064e3b]/50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>إصدار الشهادات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('archive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'archive'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                : 'text-[#86efac] hover:text-white hover:bg-[#064e3b]/50'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>الشهادات المحفوظة ({allCertificates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTemplateId(null);
              setBuilderImage(null);
              setBuilderName('');
              setActiveSubTab('builder');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'builder'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                : 'text-[#86efac] hover:text-white hover:bg-[#064e3b]/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>إعداد نموذج مخصص</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'templates'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-md'
                : 'text-[#86efac] hover:text-white hover:bg-[#064e3b]/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>نماذجي ({customTemplates.filter(t => !t.isPlatformAiTemplate).length}/5)</span>
          </button>
        </div>
      </div>

      {savedSuccessToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-green-800 text-white border-2 border-emerald-400 text-sm font-bold flex items-center justify-between gap-3 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-amber-300 shrink-0" />
            <span className="text-base">{savedSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedSuccessToast(null)}
            className="text-white/80 hover:text-white cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {copiedNotification && (
        <div className="p-4 rounded-2xl bg-emerald-900/90 text-emerald-100 border border-emerald-500 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB 1: ISSUE CERTIFICATES (READY-MADE OR CUSTOM)                   */}
      {/* ===================================================================== */}
      {activeSubTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Select Student(s) */}
            <div className="bg-[#022c22] p-5 rounded-3xl border border-[#065f46] shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#fbbf24] text-[#064e3b] font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-base font-bold text-white font-heading">
                    تحديد الطلاب المستحقين للشهادة
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#86efac]">تم اختيار:</span>
                  <span className="font-bold text-[#fbbf24] bg-[#064e3b] px-2.5 py-0.5 rounded-full border border-[#065f46]">
                    {selectedStudentIds.length} من {students.length}
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#86efac] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="ابحث عن اسم الطالب..."
                    className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-2xl pr-9 pl-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                  />
                </div>

                {halaqahs.length > 0 && (
                  <select
                    value={selectedHalaqahFilter}
                    onChange={e => setSelectedHalaqahFilter(e.target.value)}
                    className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                  >
                    <option value="all">كافة الحلقات القرآنية</option>
                    {halaqahs.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.primaryTeacherName ? `(${h.primaryTeacherName})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#065f46]/50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[#fbbf24] hover:text-amber-300 font-bold cursor-pointer"
                  >
                    تحديد الكل المعروضين ({filteredStudents.length})
                  </button>
                  <span className="text-[#86efac]/40">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="text-[#86efac]/70 hover:text-white cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Scrollable Student Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {filteredStudents.map(std => {
                  const isSelected = selectedStudentIds.includes(std.id);
                  return (
                    <div
                      key={std.id}
                      onClick={() => toggleStudentSelection(std.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                        isSelected
                          ? 'bg-[#064e3b] border-[#fbbf24] text-white shadow-md'
                          : 'bg-[#022c22]/80 border-[#065f46]/70 text-[#86efac] hover:bg-[#064e3b]/30'
                      }`}
                    >
                      <div className="truncate text-xs">
                        <span className="font-bold block truncate">{std.name}</span>
                        <span className="text-[10px] opacity-75 truncate block">
                          {std.halaqahName || 'الحلقة'} • ص {std.currentAyah || 1}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24]'
                            : 'border-[#065f46] text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Choose Occasion */}
            <div className="bg-[#022c22] p-5 rounded-3xl border border-[#065f46] shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#fbbf24] text-[#064e3b] font-black text-xs flex items-center justify-center">
                  2
                </div>
                <h3 className="text-base font-bold text-white font-heading">
                  مناسبة منح الشهادة والتكريم
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  'شكر وتقدير وتميز',
                  'إتمام جزء من القرآن الكريم',
                  'إتمام سورة من القرآن الكريم',
                  'اجتياز اختبار قرآني',
                  'مواظبة وانضباط قرآني',
                  'مناسبة مخصصة'
                ].map(occ => {
                  const isCur = occasion === occ;
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setOccasion(occ as CertificateOccasion)}
                      className={`p-3 rounded-2xl text-xs font-bold border transition-all text-right cursor-pointer ${
                        isCur
                          ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24] shadow-md font-black'
                          : 'bg-[#064e3b]/30 border-[#065f46] text-[#86efac] hover:bg-[#064e3b]/60'
                      }`}
                    >
                      {occ}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic inputs based on occasion */}
              {occasion === 'إتمام جزء من القرآن الكريم' && (
                <div className="p-3.5 rounded-2xl bg-[#064e3b]/40 border border-[#065f46] space-y-2">
                  <label className="block text-xs font-bold text-[#fbbf24]">
                    اختر الجزء القرآني الذي أتم حفظه أو إتقانه:
                  </label>
                  <select
                    value={selectedJuz}
                    onChange={e => setSelectedJuz(Number(e.target.value))}
                    className="w-full bg-[#022c22] border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                  >
                    {JUZ_NAMES.map(j => (
                      <option key={j.num} value={j.num}>
                        {j.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {occasion === 'إتمام سورة من القرآن الكريم' && (
                <div className="p-3.5 rounded-2xl bg-[#064e3b]/40 border border-[#065f46] space-y-2">
                  <label className="block text-xs font-bold text-[#fbbf24]">
                    اختر السورة الكريمة التي أتم حفظها:
                  </label>
                  <select
                    value={selectedSurahNum}
                    onChange={e => setSelectedSurahNum(Number(e.target.value))}
                    className="w-full bg-[#022c22] border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                  >
                    {QURAN_SURAHS.map(s => (
                      <option key={s.number} value={s.number}>
                        {s.number}. سورة {s.name} ({s.numberOfAyahs} آية - {s.revelationType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {occasion === 'اجتياز اختبار قرآني' && (
                <div className="p-3.5 rounded-2xl bg-[#064e3b]/40 border border-[#065f46] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#fbbf24] mb-1">
                      اسم الاختبار القرآني:
                    </label>
                    <input
                      type="text"
                      value={examName}
                      onChange={e => setExamName(e.target.value)}
                      placeholder="مثلاً: اختبار جزء عم، اختبار أحكام النون..."
                      className="w-full bg-[#022c22] border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#fbbf24] mb-1">
                      الدرجة أو التقدير:
                    </label>
                    <input
                      type="text"
                      value={examScore}
                      onChange={e => setExamScore(e.target.value)}
                      placeholder="مثلاً: 100/100 (ممتاز مرتفع)"
                      className="w-full bg-[#022c22] border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                    />
                  </div>
                </div>
              )}

              {occasion === 'مناسبة مخصصة' && (
                <div className="p-3.5 rounded-2xl bg-[#064e3b]/40 border border-[#065f46] space-y-2">
                  <label className="block text-xs font-bold text-[#fbbf24]">
                    اكتب نص العبارة والمناسبة المخصصة للتكريم:
                  </label>
                  <textarea
                    rows={2}
                    value={customOccasionText}
                    onChange={e => setCustomOccasionText(e.target.value)}
                    placeholder="مثلاً: لحفظه المتن الجزرية في التجويد وإتقان مخارج الحروف وصفاتها..."
                    className="w-full bg-[#022c22] border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24] resize-none"
                  />
                </div>
              )}
            </div>

            {/* Step 3: Choose Template */}
            <div className="bg-[#022c22] p-5 rounded-3xl border border-[#065f46] shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#fbbf24] text-[#064e3b] font-black text-xs flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-base font-bold text-white font-heading">
                    اختيار نموذج وقالب الشهادة
                  </h3>
                </div>
                <span className="text-xs text-[#86efac]">
                  {customTemplates.length} نماذج مخصصة للمجمع
                </span>
              </div>

              {/* Ready-made Platform Templates */}
              <div>
                <span className="text-xs font-bold text-amber-300 block mb-2">
                  القوالب الرسمية الفاخرة المعتمدة (تتضمن ختم المجمع الرسمي):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {READY_MADE_TEMPLATES.map(tpl => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'border-[#fbbf24] ring-2 ring-[#fbbf24]/30 shadow-lg'
                            : 'border-[#065f46] hover:border-[#fbbf24]/50'
                        } ${tpl.bgClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4
                              className="font-black text-sm"
                              style={{ color: tpl.id === 'platform_imperial_gold' ? '#b45309' : '#fbbf24' }}
                            >
                              {tpl.name}
                            </h4>
                            <p className="text-[11px] opacity-80 mt-0.5 line-clamp-1" style={{ color: tpl.textColor }}>
                              {tpl.subtitle}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-[#fbbf24] text-[#064e3b] shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Complex Templates (if any) */}
              {customTemplates.length > 0 && (
                <div className="pt-2 border-t border-[#065f46]">
                  <span className="text-xs font-bold text-emerald-300 block mb-2">
                    النماذج الخاصة بالحلقة (بدون ختم رسمي حسب الرغبة):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customTemplates.map(tpl => {
                      const isSelected = selectedTemplateId === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer bg-[#064e3b]/30 flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-[#fbbf24] ring-2 ring-[#fbbf24]/30 bg-[#064e3b]/70 shadow-lg'
                              : 'border-[#065f46] hover:border-[#fbbf24]/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-9 rounded-lg bg-black/40 overflow-hidden border border-[#065f46] shrink-0">
                              <img src={tpl.imageUrl} alt={tpl.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-white">{tpl.name}</h4>
                              <span className="text-[10px] text-[#86efac]/70 block">
                                أنشأه: {tpl.createdByTeacherName || 'المعلم'}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-[#fbbf24] text-[#064e3b] shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Signatures & Names */}
            <div className="bg-[#022c22] p-5 rounded-3xl border border-[#065f46] shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#fbbf24] text-[#064e3b] font-black text-xs flex items-center justify-center">
                  4
                </div>
                <h3 className="text-base font-bold text-white font-heading">
                  ظهور أسماء واعتمادات المعلم والمشرف
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'auto', label: 'تلقائياً من بيانات الحلقة والمجمع' },
                  { id: 'custom', label: 'كتابة اسم المعلم والمشرف يدوياً' },
                  { id: 'none', label: 'عدم ظهور اسم المعلم والمشرف نهائياً' }
                ].map(opt => {
                  const isCur = signatureMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSignatureMode(opt.id as any)}
                      className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        isCur
                          ? 'bg-[#fbbf24] text-[#064e3b] border-[#fbbf24] shadow-md font-black'
                          : 'bg-[#022c22] border-[#fbbf24]/30 hover:border-[#fbbf24]/60 text-[#f0f9f6]/80 hover:bg-[#064e3b]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {signatureMode === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-[#fbbf24] mb-1">
                      اسم المعلم الذي سيظهر على الشهادة:
                    </label>
                    <input
                      type="text"
                      value={customTeacherName}
                      onChange={e => setCustomTeacherName(e.target.value)}
                      placeholder="اسم المعلم / المحفظ"
                      className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#fbbf24] mb-1">
                      اسم المشرف الذي سيظهر على الشهادة:
                    </label>
                    <input
                      type="text"
                      value={customSupervisorName}
                      onChange={e => setCustomSupervisorName(e.target.value)}
                      placeholder="اسم المشرف العام"
                      className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action & Summary Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#022c22] p-6 rounded-3xl border border-[#fbbf24]/50 shadow-xl space-y-5 sticky top-20">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#065f46]">
                <Sparkles className="w-5 h-5 text-[#fbbf24]" />
                <h3 className="font-bold text-white font-heading text-base">
                  جاهزية إصدار الشهادات
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-[#86efac]">
                  <span>عدد الطلاب المحددين:</span>
                  <strong className="text-white font-mono text-sm bg-[#064e3b] px-2.5 py-0.5 rounded-lg border border-[#065f46]">
                    {selectedStudentIds.length} طالباً
                  </strong>
                </div>

                <div className="flex items-center justify-between text-[#86efac]">
                  <span>المناسبة:</span>
                  <span className="text-[#fbbf24] font-bold truncate max-w-[170px]">
                    {occasion}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#86efac]">
                  <span>النموذج المختار:</span>
                  <span className="text-white font-bold truncate max-w-[170px]">
                    {activeTemplate.data.name}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#86efac]">
                  <span>ختم المجمع المعتمد:</span>
                  <span className="font-bold">
                    {activeTemplate.type === 'ready' ? (
                      <span className="text-emerald-400">
                        {activeComplex?.stampUrl ? 'ختم رسمي معتمد ✓' : 'ختم معتمد'}
                      </span>
                    ) : (
                      <span className="text-amber-300">بدون ختم (نموذج خاص)</span>
                    )}
                  </span>
                </div>
              </div>

              {selectedStudentIds.length === 0 ? (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 text-center">
                  يرجى تحديد طالب واحد على الأقل في الخطوة (1) للمتابعة.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewStudentIndex(0);
                      setIsGeneratedModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#fbbf24] via-amber-400 to-[#f59e0b] hover:brightness-110 text-[#064e3b] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                  >
                    <Award className="w-5 h-5" />
                    <span>إنشاء الشهادات والمعاينة الآن ({selectedStudentIds.length})</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingCert}
                    onClick={async () => {
                      await handleSaveAllCertificates();
                      setPreviewStudentIndex(0);
                      setIsGeneratedModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#064e3b] hover:bg-[#064e3b]/80 border border-[#fbbf24]/50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" />
                    <span>{isSavingCert ? 'جاري حفظ الشهادة...' : `حفظ الشهادات ومعاينتها فوراً (${selectedStudentIds.length})`}</span>
                  </button>
                </div>
              )}

              <p className="text-[11px] text-[#86efac]/70 text-center leading-relaxed">
                فور الضغط، ستظهر معاينة تفاعلية لكافة الشهادات مع خيارات التنزيل كملفات PDF منفصلة، أو ملف مجمع، أو صور PNG عالية الجودة وحفظها مباشرة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB: SAVED CERTIFICATES ARCHIVE                                    */}
      {/* ===================================================================== */}
      {activeSubTab === 'archive' && (
        <div className="bg-[#022c22] p-6 rounded-3xl border border-[#065f46] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#065f46]">
            <div>
              <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-[#fbbf24]" />
                <span>سجل الشهادات المحفوظة والمعتمدة للمجمع ({allCertificates.length})</span>
              </h3>
              <p className="text-xs text-[#86efac]/90 mt-1">
                أرشيف كامل لكافة شهادات التميز والإتقان التي تم إنشاؤها وحفظها لطلاب الحلقات، مع إمكانية المعاينة، الطباعة، التحميل، والمشاركة وحذف الشهادة بكل سهولة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('issue')}
              className="px-4 py-2 rounded-xl bg-[#fbbf24] hover:bg-amber-400 text-[#064e3b] font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار وحفظ شهادة جديدة</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#86efac] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={archiveSearch}
                onChange={e => setArchiveSearch(e.target.value)}
                placeholder="ابحث باسم الطالب أو المناسبة..."
                className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-2xl pr-9 pl-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24]"
              />
            </div>

            {halaqahs.length > 0 && (
              <select
                value={archiveHalaqahFilter}
                onChange={e => setArchiveHalaqahFilter(e.target.value)}
                className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24]"
              >
                <option value="all">كافة الحلقات القرآنية</option>
                {halaqahs.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={archiveOccasionFilter}
              onChange={e => setArchiveOccasionFilter(e.target.value)}
              className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24]"
            >
              <option value="all">كافة المناسبات والتكريمات</option>
              {[
                'شكر وتقدير وتميز',
                'إتمام جزء من القرآن الكريم',
                'إتمام سورة من القرآن الكريم',
                'اجتياز اختبار قرآني',
                'مواظبة وانضباط قرآني',
                'مناسبة مخصصة'
              ].map(occ => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          </div>

          {allCertificates.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-[#064e3b]/20 rounded-3xl border border-dashed border-[#065f46]">
              <div className="w-14 h-14 rounded-2xl bg-[#064e3b] text-[#fbbf24] flex items-center justify-center mx-auto shadow-md">
                <Award className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">لم يتم حفظ أي شهادة بعد</h4>
              <p className="text-xs text-[#86efac]/70 max-w-md mx-auto">
                عندما يقوم المجمع أو المعلم بإصدار الشهادات والضغط على "حفظ الشهادة"، سيتم أرشفة الشهادات تلقائياً هنا في قاعدة البيانات لتكون محفوظة وموثقة دائماً.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('issue')}
                className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] text-[#064e3b] font-black text-xs cursor-pointer shadow-md mt-2"
              >
                إصدار وحفظ أول شهادة الآن
              </button>
            </div>
          ) : filteredArchiveCertificates.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#86efac]/70 bg-[#064e3b]/20 rounded-2xl border border-[#065f46]">
              لا توجد شهادات مطابقة لخيارات البحث والفلترة.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredArchiveCertificates.map(cert => (
                <div
                  key={cert.id}
                  id={`cert-item-${cert.id}`}
                  data-item-id={cert.id}
                  className="bg-[#022c22] border-2 border-[#065f46] hover:border-[#fbbf24] rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Live Visual Certificate Preview (كأنها معاينة واسم الطالب والبيانات المكتوبة موجودة) */}
                  <div
                    className="w-full aspect-[1.414/1] relative p-3 sm:p-4 flex flex-col justify-between text-center select-none overflow-hidden border-b border-[#065f46]"
                    style={{
                      backgroundImage: (cert.customTemplateImageUrl || customTemplates.find(t => t.id === cert.templateId)?.imageUrl) ? `url(${cert.customTemplateImageUrl || customTemplates.find(t => t.id === cert.templateId)?.imageUrl})` : undefined,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      backgroundColor: cert.templateType === 'ready'
                        ? (cert.templateId === 'platform_imperial_gold'
                            ? '#fef9c3'
                            : (cert.templateId === 'platform_classic_heritage'
                                ? '#fffefb'
                                : (cert.templateId === 'platform_celestial_sapphire'
                                    ? '#0f172a'
                                    : (activeComplex?.theme?.primaryColor || '#022c22'))))
                        : (activeComplex?.theme?.secondaryColor || '#064e3b')
                    }}
                  >
                    {/* Inner gold frame */}
                    <div
                      className="absolute inset-1.5 border rounded-xl pointer-events-none"
                      style={{ borderColor: activeComplex?.theme?.accentColor ? `${activeComplex.theme.accentColor}77` : 'rgba(251,191,36,0.5)' }}
                    />

                    {/* Top Header */}
                    <div className="relative z-10 pt-0.5">
                      <div
                        className="text-[8.5px] font-serif font-bold"
                        style={{ color: activeComplex?.theme?.accentColor || '#fbbf24' }}
                      >
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                      </div>
                      <div
                        className="text-[10px] sm:text-[11px] font-heading font-black mt-0.5"
                        style={{ color: activeComplex?.theme?.accentColor || '#fbbf24' }}
                      >
                        {cert.occasion === 'اجتياز اختبار قرآني' ? 'شَهَادَةُ اجْتِيَازِ وَتَفَوُّقِ فِي الاخْتِبَارِ' : 'شَهَادَةُ تَمَيُّزٍ وَإِتْقَانٍ قُرْآنِيٍّ'}
                      </div>
                    </div>

                    {/* Center Student Name in large calligraphic font */}
                    <div className="relative z-10 my-auto py-1">
                      <p className="text-[8px] sm:text-[9px] opacity-80" style={{ color: cert.templateId === 'platform_imperial_gold' || cert.templateId === 'platform_classic_heritage' ? '#064e3b' : (activeComplex?.theme?.textColor || '#86efac') }}>
                        تُمنح للطالب النجيب:
                      </p>
                      <div
                        className="font-quran text-lg sm:text-2xl font-black py-0.5 leading-tight truncate px-2"
                        style={{ color: cert.templateId === 'platform_imperial_gold' ? '#b45309' : (activeComplex?.theme?.accentColor || '#fbbf24') }}
                      >
                        {cert.studentName}
                      </div>
                      <p
                        className="text-[8px] sm:text-[9px] leading-tight line-clamp-2 px-2 opacity-90 max-w-xs mx-auto font-medium"
                        style={{ color: cert.templateId === 'platform_imperial_gold' || cert.templateId === 'platform_classic_heritage' ? '#1c1917' : '#ffffff' }}
                      >
                        {cert.occasionText || cert.occasion}
                      </p>
                    </div>

                    {/* Bottom details: Signatures & Bottom-Left Seal */}
                    <div className="relative z-10 pt-1 border-t border-white/20 flex items-center justify-between text-[8px] px-1"
                      style={{ color: cert.templateId === 'platform_imperial_gold' || cert.templateId === 'platform_classic_heritage' ? '#064e3b' : '#86efac' }}
                    >
                      <div className="text-right truncate max-w-[65%]">
                        <span>{cert.halaqahName || 'الحلقة'} • {cert.dateArabic || cert.dateGregorian}</span>
                      </div>

                      {/* Seal positioned in bottom-left */}
                      <div className="flex items-center gap-1 font-bold text-[#fbbf24] bg-black/40 px-1.5 py-0.5 rounded-md shrink-0">
                        <Award className="w-3 h-3 text-[#fbbf24]" />
                        <span>معتمد</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="p-3 bg-[#064e3b]/30 space-y-2">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-bold text-white truncate">{cert.studentName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#022c22] text-[#fbbf24] border border-[#065f46] shrink-0 font-medium">
                        {cert.occasion}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-[#065f46]/50">
                      <button
                        type="button"
                        onClick={() => handleOpenPreviewFromArchive(cert)}
                        className="flex-1 py-1.5 rounded-xl bg-[#fbbf24] hover:bg-amber-400 text-[#064e3b] font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                        title="معاينة الشهادة وطباعتها بدقة فائقة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadArchiveSinglePdf(cert)}
                        className="p-1.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] hover:text-white border border-[#fbbf24]/30 hover:border-[#fbbf24] cursor-pointer transition-colors shadow-sm"
                        title="تنزيل كـ PDF فاخر"
                      >
                        <Download className="w-4 h-4 text-[#fbbf24]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppForArchive(cert)}
                        className="p-1.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] hover:text-white border border-[#fbbf24]/30 hover:border-[#fbbf24] cursor-pointer transition-colors shadow-sm"
                        title="إرسال عبر الواتساب لولي الأمر"
                      >
                        <Send className="w-4 h-4 text-[#fbbf24]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCertificateClick(cert)}
                        className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-red-100 border border-red-500/40 cursor-pointer transition-colors"
                        title="حذف هذه الشهادة نهائياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB 2: CUSTOM TEMPLATE BUILDER                                     */}
      {/* ===================================================================== */}
      {activeSubTab === 'builder' && (
        <div className="bg-[#022c22] p-6 rounded-3xl border border-[#065f46] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#065f46]">
            <div>
              <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#fbbf24]" />
                <span>{editingTemplateId ? 'تعديل نموذج الشهادة المخصص' : 'إعداد وتصميم نموذج شهادة خاص بالمجمع'}</span>
              </h3>
              <p className="text-xs text-[#86efac]/90 mt-1">
                ارفع صورة قالب الشهادة الخاص بمجمعك (حتى 5 ميجابايت)، واسحب عنصر اسم الطالب والتاريخ لموضعهما بكل دقة.
              </p>
            </div>

            <div className="text-xs text-amber-300 font-bold bg-[#064e3b] px-3.5 py-1.5 rounded-xl border border-[#065f46]">
              النماذج الحالية للمجمع: {customTemplates.length} من 5 نماذج
            </div>
          </div>

          {builderError && (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{builderError}</span>
            </div>
          )}

          {builderSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{builderSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left/Canvas Column (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">معاينة النموذج وموضع اسم الطالب:</span>
                <span className="text-[11px] text-[#fbbf24] font-bold flex items-center gap-1">
                  <span>✋</span>
                  <span>اسحب الاسم والتاريخ مباشرة بالماوس أو اللمس لوضعهما بحرية</span>
                </span>
              </div>

              {/* Certificate Canvas Frame with Free-form Dragging */}
              <div
                ref={canvasContainerRef}
                className="w-full aspect-[1.414/1] bg-black/60 rounded-3xl border-2 border-dashed border-[#065f46] relative overflow-hidden flex items-center justify-center shadow-2xl select-none touch-none"
                style={{
                  backgroundImage: builderImage ? `url(${builderImage})` : undefined,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  touchAction: 'none'
                }}
              >
                {!builderImage ? (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#064e3b] text-[#fbbf24] flex items-center justify-center mx-auto shadow-md">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">لم تقم برفع صورة القالب بعد</h4>
                      <p className="text-xs text-[#86efac]/80 mt-1 max-w-sm">
                        اضغط على زر رفع الصورة أدناه لاختيار تصميم الشهادة (لا يزيد حجم الصورة عن 5 ميجابايت).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs cursor-pointer shadow-lg transition-all"
                    >
                      اختيار صورة الشهادة (حتى 5MB)
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Draggable Floating Student Name */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggingElement('name');
                        try {
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        } catch {}
                      }}
                      onPointerUp={(e) => {
                        setDraggingElement(null);
                        try {
                          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                        } catch {}
                      }}
                      style={{
                        position: 'absolute',
                        left: `${namePosX}%`,
                        top: `${namePosY}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${nameFontSize}px`,
                        fontFamily: ARABIC_FONTS.find(f => f.id === nameFontFamily)?.family || 'Amiri',
                        color: nameColor,
                        textAlign: nameTextAlign,
                        fontWeight: nameFontWeight,
                        whiteSpace: 'nowrap',
                        touchAction: 'none'
                      }}
                      className={`cursor-grab active:cursor-grabbing border-2 ${
                        draggingElement === 'name'
                          ? 'border-[#fbbf24] bg-amber-400/30 ring-4 ring-[#fbbf24]/40 scale-105 shadow-2xl z-30'
                          : 'border-dashed border-amber-400/80 bg-amber-400/10 hover:border-amber-300 hover:bg-amber-400/20 z-20'
                      } px-3 py-1 rounded-xl shadow-lg transition-transform select-none group flex items-center gap-1.5`}
                      title="اسحب هذا الاسم بحرية وضعه في أي مكان تريده على الشهادة"
                    >
                      <span>{testStudentName || 'اسم الطالب هنا'}</span>
                      <span className="text-[10px] bg-black/70 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                        ✋ اسحب
                      </span>
                    </div>

                    {/* Draggable Floating Date (Optional) */}
                    {showDateOnCert && (
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDraggingElement('date');
                          try {
                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          } catch {}
                        }}
                        onPointerUp={(e) => {
                          setDraggingElement(null);
                          try {
                            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                          } catch {}
                        }}
                        style={{
                          position: 'absolute',
                          left: `${datePosX}%`,
                          top: `${datePosY}%`,
                          transform: 'translate(-50%, -50%)',
                          fontSize: `${dateFontSize}px`,
                          fontFamily: ARABIC_FONTS.find(f => f.id === dateFontFamily)?.family || 'Cairo',
                          color: dateColor,
                          whiteSpace: 'nowrap',
                          touchAction: 'none'
                        }}
                        className={`cursor-grab active:cursor-grabbing border-2 ${
                          draggingElement === 'date'
                            ? 'border-emerald-400 bg-emerald-400/30 ring-4 ring-emerald-400/40 scale-105 shadow-2xl z-30'
                            : 'border-dashed border-emerald-400/80 bg-emerald-400/10 hover:border-emerald-300 hover:bg-emerald-400/20 z-20'
                        } px-2.5 py-1 rounded-xl shadow-lg transition-transform select-none group flex items-center gap-1.5`}
                        title="اسحب التاريخ بحرية إلى أي موضع"
                      >
                        <span>{todayArabic}</span>
                        <span className="text-[10px] bg-black/70 text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                          ✋ اسحب
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Upload Input & Actions */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#f0f9f6] hover:text-white border border-[#fbbf24]/30 hover:border-[#fbbf24] text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4 text-[#fbbf24]" />
                  <span>{builderImage ? 'تغيير صورة النموذج' : 'رفع صورة النموذج (حتى 5MB)'}</span>
                </button>
              </div>
            </div>

            {/* Right/Controls Column (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-xs font-bold text-[#fbbf24] mb-1">
                  اسم النموذج (للتمييز في القائمة):
                </label>
                <input
                  type="text"
                  value={builderName}
                  onChange={e => setBuilderName(e.target.value)}
                  placeholder="مثلاً: نموذج شهادة الشكر السنوية"
                  className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#fbbf24]"
                />
              </div>

              {/* Test Name Input */}
              <div>
                <label className="block text-xs font-bold text-[#86efac] mb-1">
                  اسم تجريبي للمعاينة الفورية:
                </label>
                <input
                  type="text"
                  value={testStudentName}
                  onChange={e => setTestStudentName(e.target.value)}
                  placeholder="اكتب اسماً للتجربة"
                  className="w-full bg-[#064e3b]/50 border border-[#065f46] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#fbbf24]"
                />
              </div>

              {/* Student Name Positioning & Typography Controls (Without complicated X/Y sliders) */}
              <div className="p-4 rounded-2xl bg-[#064e3b]/30 border border-[#065f46] space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#fbbf24]">
                  <Type className="w-4 h-4" />
                  <span>تنسيق خط اسم الطالب:</span>
                </div>

                {/* Free Drag Indicator */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-[#064e3b] border border-amber-400/40 text-xs text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="leading-snug">
                    <p className="font-bold text-amber-300 text-[11px]">التحريك الحر والمباشر:</p>
                    <p className="text-[10px] text-[#86efac]/90">
                      امسك اسم الطالب مباشرة من الشهادة واسحبه بالماوس أو اللمس لوضعه في أي مكان بدقة وسهولة.
                    </p>
                  </div>
                </div>

                {/* Font Family (10 Arabic Fonts) */}
                <div>
                  <label className="block text-xs font-semibold text-[#86efac] mb-1">
                    نوع الخط العربي (اختر من 10 خطوط فاخرة):
                  </label>
                  <select
                    value={nameFontFamily}
                    onChange={e => setNameFontFamily(e.target.value)}
                    className="w-full bg-[#022c22] border border-[#065f46] rounded-xl p-2 text-xs text-white outline-none focus:border-[#fbbf24]"
                  >
                    {ARABIC_FONTS.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size & Weight */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#86efac] mb-1">حجم الخط ({nameFontSize}px):</label>
                    <input
                      type="range"
                      min={18}
                      max={72}
                      value={nameFontSize}
                      onChange={e => setNameFontSize(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[#86efac] mb-1">وزن الخط:</label>
                    <select
                      value={nameFontWeight}
                      onChange={e => setNameFontWeight(e.target.value as any)}
                      className="w-full bg-[#022c22] border border-[#065f46] rounded-xl p-1.5 text-xs text-white outline-none"
                    >
                      <option value="normal">عادي (Normal)</option>
                      <option value="bold">عريض (Bold)</option>
                      <option value="900">عريض جداً (Black)</option>
                    </select>
                  </div>
                </div>

                {/* Color Palette */}
                <div>
                  <label className="block text-xs font-semibold text-[#86efac] mb-1">لون اسم الطالب:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={nameColor}
                      onChange={e => setNameColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['#064e3b', '#b45309', '#1e3a8a', '#111827', '#991b1b', '#0284c7'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNameColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border ${nameColor === c ? 'ring-2 ring-white' : 'border-white/20'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Controls (Optional - Without X/Y sliders) */}
              <div className="p-4 rounded-2xl bg-[#064e3b]/30 border border-[#065f46] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <Calendar className="w-4 h-4" />
                    <span>إظهار التاريخ على الشهادة</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showDateOnCert}
                    onChange={e => setShowDateOnCert(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-[#022c22] border-[#065f46]"
                  />
                </div>

                {showDateOnCert && (
                  <div className="space-y-2.5 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#022c22]/80 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-center gap-2">
                      <span>✋</span>
                      <span>اسحب التاريخ مباشرة على الشهادة وضعه في أي زاوية أو موضع تريده.</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#86efac] mb-1">حجم التاريخ ({dateFontSize}px):</label>
                        <input
                          type="range"
                          min={10}
                          max={32}
                          value={dateFontSize}
                          onChange={e => setDateFontSize(Number(e.target.value))}
                          className="w-full accent-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[#86efac] mb-1">لون التاريخ:</label>
                        <input
                          type="color"
                          value={dateColor}
                          onChange={e => setDateColor(e.target.value)}
                          className="w-full h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button with Loading State */}
              <button
                type="button"
                disabled={isSavingTemplate}
                onClick={handleSaveCustomTemplate}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-50 text-[#064e3b] font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                {isSavingTemplate ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#064e3b] border-t-transparent rounded-full animate-spin" />
                    <span>جاري حفظ واعتماد النموذج...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ النموذج في نماذج المجمع</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB 3: MY SAVED TEMPLATES (UP TO 5 PER COMPLEX)                    */}
      {/* ===================================================================== */}
      {activeSubTab === 'templates' && (
        <div className="bg-[#022c22] p-6 rounded-3xl border border-[#065f46] shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#065f46]">
            <div>
              <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#fbbf24]" />
                <span>نماذج الشهادات الخاصة بالمجمع ({customTemplates.filter(t => !t.isPlatformAiTemplate).length}/5)</span>
              </h3>
              <p className="text-xs text-[#86efac]/90 mt-1">
                تظهر هذه النماذج لجميع معلمي ومشرفي المجمع، والنماذج المولدة بالذكاء الاصطناعي لا تُحتسب ضمن الحد الأقصى (5 نماذج).
              </p>
            </div>

            {customTemplates.filter(t => !t.isPlatformAiTemplate).length < 5 && (
              <button
                type="button"
                onClick={() => {
                  setEditingTemplateId(null);
                  setBuilderImage(null);
                  setBuilderName('');
                  setActiveSubTab('builder');
                }}
                className="px-4 py-2 rounded-xl bg-[#fbbf24] text-[#064e3b] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نموذج جديد</span>
              </button>
            )}
          </div>

          {customTemplates.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-[#064e3b]/20 rounded-3xl border border-dashed border-[#065f46]">
              <div className="w-12 h-12 rounded-2xl bg-[#064e3b] text-[#86efac] flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">لا توجد نماذج مخصصة محفوظة بعد</h4>
              <p className="text-xs text-[#86efac]/70 max-w-md mx-auto">
                يمكن للمجمع رفع حتى 5 تصاميم شهادات مخصصة تناسب هويته الرسمية واستخدامها فورياً لكافة الحلقات.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('builder')}
                className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] text-[#064e3b] font-black text-xs cursor-pointer shadow-md mt-2"
              >
                إعداد أول نموذج الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTemplates.map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className="bg-[#064e3b]/30 rounded-2xl border border-[#065f46] overflow-hidden flex flex-col shadow-md"
                >
                  <div className="aspect-[1.414/1] bg-black/40 overflow-hidden relative">
                    <img src={tpl.imageUrl} alt={tpl.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-black/70 text-amber-300 px-2 py-0.5 rounded-md">
                      نموذج #{idx + 1}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-white">{tpl.name}</h4>
                      <p className="text-[11px] text-[#86efac]/70 mt-0.5">
                        أنشأه: {tpl.createdByTeacherName || 'المشرف'} • خط: {tpl.studentNamePosition.fontFamily}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#065f46]/50">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setActiveSubTab('issue');
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-[#fbbf24] text-[#064e3b] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>استخدام</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditTemplate(tpl)}
                        className="p-1.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] hover:text-white border border-[#fbbf24]/30 hover:border-[#fbbf24] cursor-pointer transition-colors shadow-sm"
                        title="تعديل الموضع والخط"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        className="p-1.5 rounded-xl bg-red-950/60 text-red-300 hover:text-red-100 border border-red-500/40 cursor-pointer"
                        title="حذف هذا النموذج"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* GENERATED CERTIFICATES INTERACTIVE PREVIEW & EXPORT MODAL             */}
      {/* ===================================================================== */}
      {isGeneratedModalOpen && targetStudents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#022c22] border-2 border-[#fbbf24]/50 rounded-3xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden text-right">
            {/* Modal Top Bar */}
            <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] px-6 py-4 border-b border-[#fbbf24]/20 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center shadow-sm">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    معاينة الشهادات المعتمدة ({targetStudents.length} شهادة)
                  </h3>
                  <p className="text-[11px] text-[#86efac]">
                    طالب {previewStudentIndex + 1} من {targetStudents.length}: {targetStudents[previewStudentIndex]?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Save Current Student Certificate Button */}
                <button
                  type="button"
                  disabled={isSavingCert}
                  onClick={async () => {
                    const curStd = targetStudents[previewStudentIndex] || targetStudents[0];
                    if (curStd) {
                      await handleSaveCertificateForStudent(curStd);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 ${
                    isCurrentStudentSaved
                      ? 'bg-[#022c22] text-[#fbbf24] border border-[#fbbf24]'
                      : 'bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] border border-[#fbbf24]'
                  }`}
                  title="حفظ الشهادة وتوثيقها في الأرشيف"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSavingCert
                      ? 'جاري الحفظ...'
                      : isCurrentStudentSaved
                      ? 'تم حفظ الشهادة ✓'
                      : 'حفظ الشهادة'}
                  </span>
                </button>

                {/* Save All Certificates (if multiple) */}
                {targetStudents.length > 1 && (
                  <button
                    type="button"
                    disabled={isSavingCert}
                    onClick={async () => {
                      await handleSaveAllCertificates();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#064e3b]/80 border border-[#fbbf24]/50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                    title="حفظ كافة الشهادات المعروضة دفعة واحدة"
                  >
                    <BookmarkCheck className="w-4 h-4 text-[#fbbf24]" />
                    <span>{isSavingCert ? 'جاري الحفظ...' : `حفظ الكل (${targetStudents.length})`}</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsGeneratedModalOpen(false)}
                  className="p-2 text-[#86efac] hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer mr-1"
                  title="إغلاق نافذة المعاينة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Students Switcher Pagination Bar (if multiple students) */}
            {targetStudents.length > 1 && (
              <div className="bg-[#011a14] px-4 py-2 border-b border-[#065f46] flex items-center justify-between gap-3 text-xs overflow-x-auto shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={previewStudentIndex === 0}
                    onClick={() => setPreviewStudentIndex(i => Math.max(0, i - 1))}
                    className="p-1 rounded-lg bg-[#064e3b] disabled:opacity-30 text-white cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-[#86efac] font-mono">
                    {previewStudentIndex + 1} / {targetStudents.length}
                  </span>
                  <button
                    type="button"
                    disabled={previewStudentIndex === targetStudents.length - 1}
                    onClick={() => setPreviewStudentIndex(i => Math.min(targetStudents.length - 1, i + 1))}
                    className="p-1 rounded-lg bg-[#064e3b] disabled:opacity-30 text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Student Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {targetStudents.map((std, idx) => (
                    <button
                      key={std.id}
                      type="button"
                      onClick={() => setPreviewStudentIndex(idx)}
                      className={`px-3 py-1 rounded-xl whitespace-nowrap text-xs font-bold transition-all cursor-pointer ${
                        previewStudentIndex === idx
                          ? 'bg-[#fbbf24] text-[#064e3b] font-black'
                          : 'bg-[#064e3b]/50 text-[#86efac] hover:text-white'
                      }`}
                    >
                      {idx + 1}. {std.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notification / Status Banner inside Modal (Prominently displays "تم حفظ الشهادة") */}
            {savedSuccessToast && (
              <div className="mx-4 sm:mx-6 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900 via-green-800 to-emerald-900 text-white border-2 border-emerald-400 text-sm font-bold flex items-center justify-between gap-3 shadow-2xl animate-fade-in shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700/80 border border-emerald-400/60 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-[#fbbf24]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{savedSuccessToast}</p>
                    <p className="text-[11px] text-emerald-200 font-normal">
                      تم توثيق الشهادة وتأكيد حفظها رسمياً في أرشيف المجمع وسجل الطالب الإلكتروني
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGeneratedModalOpen(false);
                      setActiveSubTab('archive');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    عرض في الأرشيف
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedSuccessToast(null)}
                    className="text-white/80 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Certificate Preview Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#011a14] flex justify-center items-center">
              {(() => {
                const curStudent = targetStudents[previewStudentIndex] || targetStudents[0];
                const halaqahName = curStudent.halaqahName || settings.halaqahName;
                const complexName = activeComplex?.name || activeComplexName || settings.complexName || 'مجمع تحفيظ القرآن الكريم';
                const teacherTitle = signatureMode === 'custom'
                  ? customTeacherName
                  : (curStudent.halaqahName ? `معلم ${curStudent.halaqahName}` : settings.teacherName);
                const supervisorTitle = signatureMode === 'custom'
                  ? customSupervisorName
                  : (complexName ? `مشرف ${complexName}` : 'المشرف العام');

                return (
                  <div
                    id="cert-single-preview"
                    className="w-full max-w-[850px] min-h-[540px] sm:min-h-[580px] md:aspect-[1.414/1] rounded-3xl relative overflow-hidden shadow-2xl flex flex-col justify-between p-5 sm:p-8 md:p-12 text-center border-4 select-none shrink-0 my-auto"
                    style={{
                      backgroundImage: activeTemplate.type === 'custom' ? `url(${activeTemplate.data.imageUrl})` : undefined,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: activeTemplate.type === 'ready'
                        ? (activeTemplate.data.id === 'platform_imperial_gold'
                            ? '#fef9c3'
                            : (activeTemplate.data.id === 'platform_classic_heritage'
                                ? '#fffefb'
                                : (activeTemplate.data.id === 'platform_celestial_sapphire'
                                    ? '#0f172a'
                                    : (activeComplex?.theme?.primaryColor || '#022c22'))))
                        : '#000000',
                      borderColor: activeTemplate.data.accentColor || '#fbbf24'
                    }}
                  >
                    {/* If Custom Template: Render floating name & date */}
                    {activeTemplate.type === 'custom' ? (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            left: `${activeTemplate.data.studentNamePosition.x}%`,
                            top: `${activeTemplate.data.studentNamePosition.y}%`,
                            transform: 'translate(-50%, -50%)',
                            fontSize: `${activeTemplate.data.studentNamePosition.fontSize}px`,
                            fontFamily: ARABIC_FONTS.find(f => f.id === activeTemplate.data.studentNamePosition.fontFamily)?.family || 'Amiri',
                            color: activeTemplate.data.studentNamePosition.color,
                            textAlign: activeTemplate.data.studentNamePosition.textAlign,
                            fontWeight: activeTemplate.data.studentNamePosition.fontWeight || 'bold',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {curStudent.name}
                        </div>

                        {activeTemplate.data.showDate && activeTemplate.data.datePosition && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${activeTemplate.data.datePosition.x}%`,
                              top: `${activeTemplate.data.datePosition.y}%`,
                              transform: 'translate(-50%, -50%)',
                              fontSize: `${activeTemplate.data.datePosition.fontSize}px`,
                              fontFamily: ARABIC_FONTS.find(f => f.id === activeTemplate.data.datePosition.fontFamily)?.family || 'Cairo',
                              color: activeTemplate.data.datePosition.color,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {todayArabic}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Ready-Made Platform Design */
                      <>
                        {/* Top Official Complex Logo, Bismillah & Quranic Verse */}
                        <div className="w-full flex flex-col items-center justify-center pt-2 sm:pt-1 pb-1">
                          <div className="w-full flex items-center justify-between px-2 sm:px-6 mb-2">
                            {/* Right: Complex Logo & Identity */}
                            <div className="flex items-center gap-2">
                              {activeComplex?.logoUrl ? (
                                <img
                                  src={activeComplex.logoUrl}
                                  alt={complexName}
                                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-xl border border-amber-400/50 shadow-md bg-black/20"
                                />
                              ) : (
                                <div
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-md"
                                  style={{
                                    backgroundColor: activeComplex?.theme?.cardColor || '#064e3b',
                                    color: activeTemplate.data.accentColor,
                                    borderColor: activeTemplate.data.accentColor
                                  }}
                                >
                                  {complexName.replace(/^(مجمع|مراكز|حلقات|جمعية)\s+/i, '').trim().charAt(0) || 'ق'}
                                </div>
                              )}
                              <div className="text-right hidden sm:block">
                                <strong className="text-xs font-heading font-black block" style={{ color: activeTemplate.data.accentColor }}>
                                  {complexName}
                                </strong>
                                <span className="text-[9px] opacity-75 block" style={{ color: activeTemplate.data.textColor }}>
                                  منظومة الحلقات القرآنية
                                </span>
                              </div>
                            </div>

                            {/* Center: Bismillah */}
                            <div
                              className="font-quran text-sm sm:text-base md:text-xl font-bold tracking-wide leading-normal"
                              style={{ color: activeTemplate.data.accentColor }}
                            >
                              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                            </div>

                            {/* Left: Official Accreditation Badge */}
                            <div className="text-left hidden sm:block">
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold"
                                style={{
                                  color: activeTemplate.data.accentColor,
                                  borderColor: `${activeTemplate.data.accentColor}55`,
                                  backgroundColor: 'rgba(0,0,0,0.25)'
                                }}
                              >
                                وثيقة معتمدة
                              </span>
                            </div>
                          </div>

                          <div
                            className="font-quran text-xs sm:text-sm md:text-base opacity-90 leading-relaxed mb-2 px-2 text-center max-w-lg"
                            style={{ color: activeTemplate.data.accentColor }}
                          >
                            ﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾
                          </div>
                          <h1
                            className="font-heading font-black text-xl sm:text-3xl md:text-4xl tracking-normal leading-normal py-1"
                            style={{ color: activeTemplate.data.accentColor }}
                          >
                            شَهَادَةُ تَمَيُّزٍ وَإِتْقَانٍ قُرْآنِيٍّ
                          </h1>
                        </div>

                        {/* Student Name & Occasion */}
                        <div className="space-y-2 sm:space-y-3 my-auto py-2 sm:py-4">
                          <p
                            className="text-xs sm:text-sm font-semibold opacity-90 leading-normal"
                            style={{ color: activeTemplate.data.textColor }}
                          >
                            يَسُرُّ إِدَارَةَ الحِلْقَةِ أَنْ تَمْنَحَ هذِهِ الشَّهَادَةَ المُبَارَكَةَ لِلطَّالِبِ النَّجِيبِ:
                          </p>

                          <div
                            className="font-quran text-2xl sm:text-4xl md:text-5xl font-black py-1 sm:py-2 leading-tight"
                            style={{ color: activeTemplate.data.accentColor }}
                          >
                            {curStudent.name}
                          </div>

                          <p
                            className="text-xs sm:text-sm leading-relaxed max-w-xl mx-auto px-4 font-medium"
                            style={{ color: activeTemplate.data.textColor }}
                          >
                            {getOccasionDescription()}
                          </p>

                          <div
                            className="text-[11px] sm:text-xs opacity-75 mt-1"
                            style={{ color: activeTemplate.data.textColor }}
                          >
                            الحلقة: <strong className="font-bold">{halaqahName}</strong> • المجمع: <strong className="font-bold">{complexName}</strong>
                          </div>
                        </div>

                        {/* Footer Details: Signatures, Seal & Date */}
                        <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-white/20">
                          {signatureMode !== 'none' && (
                            <div className="flex items-center justify-between px-4 sm:px-6 text-xs sm:text-sm font-bold" style={{ color: activeTemplate.data.textColor }}>
                              <div className="text-right">
                                <span className="block text-[10px] opacity-75">معلم الحلقة:</span>
                                <span>{teacherTitle}</span>
                              </div>

                              <div className="text-left">
                                <span className="block text-[10px] opacity-75">المشرف العام:</span>
                                <span>{supervisorTitle}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] sm:text-[11px] px-2 opacity-80" style={{ color: activeTemplate.data.textColor }}>
                            <span>تاريخ الإصدار: {todayArabic}</span>

                            {/* Official Seal badge on ready-made */}
                            <div className="flex items-center gap-1.5 font-bold" style={{ color: activeTemplate.data.accentColor }}>
                              {activeComplex?.stampUrl ? (
                                <div className="flex items-center gap-2">
                                  <img src={activeComplex.stampUrl} alt="ختم المجمع" className="w-9 h-9 object-contain rounded-full shadow-sm" />
                                  <span>ختم معتمد • {complexName}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Award className="w-4 h-4" />
                                  <span>معتمد رسمياً • {complexName}</span>
                                </div>
                              )}
                            </div>

                            <span>الموافق: {todayGregorian}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Notification / Status Banner */}
            {(copiedNotification || exportStatusText) && (
              <div className="px-6 py-2.5 bg-emerald-950/90 border-t border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{exportStatusText || copiedNotification}</span>
                </div>
                {copiedNotification && (
                  <button
                    type="button"
                    onClick={() => setCopiedNotification(null)}
                    className="text-emerald-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Modal Bottom Actions Bar */}
            <div className="p-4 bg-[#022c22] border-t border-[#fbbf24]/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Save Certificate Button */}
                <button
                  type="button"
                  disabled={isSavingCert}
                  onClick={async () => {
                    const curStd = targetStudents[previewStudentIndex] || targetStudents[0];
                    if (curStd) {
                      await handleSaveCertificateForStudent(curStd);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 ${
                    isCurrentStudentSaved
                      ? 'bg-[#022c22] text-[#fbbf24] border border-[#fbbf24]'
                      : 'bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] border border-[#fbbf24]'
                  }`}
                  title="حفظ الشهادة وتوثيقها في الأرشيف"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSavingCert
                      ? 'جاري الحفظ...'
                      : isCurrentStudentSaved
                      ? 'تم حفظ الشهادة بنجاح ✓'
                      : 'حفظ الشهادة'}
                  </span>
                </button>

                {/* Download as Image PNG */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownloadSinglePNG(targetStudents[previewStudentIndex], previewStudentIndex)}
                  className="px-4 py-2.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] disabled:opacity-50 text-[#f0f9f6] hover:text-white border border-[#fbbf24]/40 hover:border-[#fbbf24] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="تنزيل الشهادة كصورة PNG عالية الدقة"
                >
                  <Download className="w-4 h-4 text-[#fbbf24]" />
                  <span>تحميل كصورة (PNG)</span>
                </button>

                {/* Print/Download Separate PDF */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownloadSinglePDF(targetStudents[previewStudentIndex], previewStudentIndex)}
                  className="px-4 py-2.5 rounded-xl bg-[#022c22] hover:bg-[#064e3b] disabled:opacity-50 text-[#fbbf24] hover:text-white border border-[#fbbf24]/40 hover:border-[#fbbf24] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="تنزيل شهادة هذا الطالب كـ PDF منفصل"
                >
                  <Printer className="w-4 h-4 text-[#fbbf24]" />
                  <span>تنزيل PDF للطالب الحالي</span>
                </button>

                {/* Print/Download All Merged PDF */}
                {targetStudents.length > 1 && (
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleDownloadAllMergedPDF}
                    className="px-4 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-50 text-[#064e3b] border border-[#fbbf24] font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
                    title="تنزيل كافة الشهادات في ملف PDF واحد مجمع"
                  >
                    <FileText className="w-4 h-4 text-[#064e3b]" />
                    <span>تنزيل الكل بملف PDF مجمع ({targetStudents.length})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Send via WhatsApp (with actual PDF file) */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleSendWhatsApp(targetStudents[previewStudentIndex], previewStudentIndex)}
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] border border-[#25D366]/40 hover:brightness-105 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  title="إرسال ملف الشهادة PDF مباشرة عبر الواتساب لولي الأمر"
                >
                  <Send className="w-4 h-4" />
                  <span>{isExporting ? 'جاري تجهيز الشهادة...' : 'إرسال عبر واتساب (ملف PDF)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal (100% works in iframes and mobile) */}
      {deleteConfirmModal && deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#022c22] border-2 border-red-500/60 rounded-3xl w-full max-w-md p-6 shadow-2xl text-right space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white font-heading">
                  {deleteConfirmModal.type === 'template' ? 'تأكيد حذف النموذج المخصص' : 'تأكيد حذف الشهادة'}
                </h4>
                <p className="text-xs text-red-300 mt-0.5">
                  تنبيه: سيتم الحذف نهائياً من قاعدة البيانات والأرشيف
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#011a14] border border-red-500/20 text-xs text-white/90 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف <strong className="text-amber-300 font-bold">{deleteConfirmModal.title}</strong>؟
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => !isDeletingItem && setDeleteConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={confirmDeleteAction}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:opacity-75 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/40 cursor-pointer transition-all active:scale-95"
              >
                {isDeletingItem ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحذف بأمان...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، احذف نهائياً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup Modal for Custom Template Addition */}
      {savedTemplateModal && savedTemplateModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative bg-gradient-to-b from-[#064e3b] to-[#022c22] border-2 border-[#fbbf24] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-center space-y-4">
            {/* Top Close 'X' Button */}
            <button
              type="button"
              onClick={() => setSavedTemplateModal(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#86efac] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Emblem / Badge */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 text-[#064e3b] flex items-center justify-center mx-auto shadow-xl shadow-amber-950/50 border-2 border-[#fbbf24]">
              <Award className="w-9 h-9" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white font-heading">
                لقد تمت إضافة النموذج بنجاح! 🎉
              </h3>
              <p className="text-xs text-[#86efac]/90 leading-relaxed px-2">
                تم اعتماد وحفظ قالب الشهادة الخاص بالمجمع <strong className="text-amber-300 font-bold">"{savedTemplateModal.templateName}"</strong> بنجاح، ويمكنك الآن الانتقال لمعاينته وإصدار شهادات الطلاب باستخدامه فورياً.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId(savedTemplateModal.templateId);
                  setSavedTemplateModal(null);
                  setActiveSubTab('issue');
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>انتقل لرؤية النموذج</span>
              </button>
              <button
                type="button"
                onClick={() => setSavedTemplateModal(null)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                البقاء هنا
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup Modal for Issued / Saved Certificate in Archive */}
      {savedPopupModal && savedPopupModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative bg-gradient-to-b from-[#064e3b] to-[#022c22] border-2 border-[#fbbf24] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-center space-y-4">
            {/* Top Close 'X' Button */}
            <button
              type="button"
              onClick={() => setSavedPopupModal(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#86efac] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Emblem / Badge */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 text-[#064e3b] flex items-center justify-center mx-auto shadow-xl shadow-amber-950/50 border-2 border-[#fbbf24]">
              <BookmarkCheck className="w-9 h-9" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white font-heading">
                تم حفظ الشهادة وتوثيقها في الأرشيف! 📜
              </h3>
              <p className="text-xs text-[#86efac]/90 leading-relaxed px-2">
                {savedPopupModal.count && savedPopupModal.count > 1 ? (
                  <>تم حفظ وتوثيق <strong className="text-amber-300 font-bold">({savedPopupModal.count}) شهادة</strong> بنجاح في أرشيف المجمع الدائم، وتم تحديث السجل فورياً دون الحاجة لتحديث الصفحة.</>
                ) : (
                  <>تم حفظ وتوثيق شهادة الطالب <strong className="text-amber-300 font-bold">"{savedPopupModal.studentName || 'المحدد'}"</strong> بنجاح في أرشيف المجمع الدائم، وتم تحديث السجل فورياً.</>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSavedPopupModal(null);
                  setIsGeneratedModalOpen(false);
                  setActiveSubTab('archive');
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all active:scale-95"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>انتقل إلى سجل الأرشيف</span>
              </button>
              <button
                type="button"
                onClick={() => setSavedPopupModal(null)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                متابعة المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
