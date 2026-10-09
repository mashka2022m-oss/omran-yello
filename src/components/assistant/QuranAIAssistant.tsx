import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Share2,
  Plus,
  Trash2,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  GripHorizontal,
  User,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  BookmarkCheck,
  Bookmark,
  FolderPlus,
  Table as TableIcon,
  Table2,
  BarChart3,
  PieChart,
  TrendingUp,
  Award,
  Printer,
  Download,
  Volume2,
  Edit3,
  Globe,
  Building2,
  Layers,
  Search,
  Eye,
  Palette,
  Play,
  RotateCcw,
  CheckSquare,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import {
  Student,
  Halaqah,
  AttendanceRecord,
  StudentEvaluation,
  QuranComplex,
  LibraryDocument,
  IssuedCertificate,
  CustomCertificateTemplate,
  SurahRecording,
  StudentListeningLog
} from '../../types';
import { READY_MADE_TEMPLATES } from '../tabs/CertificatesTab';
import { OmranDataService } from '../../lib/firebase';
import { triggerComplexThemePulse, dispatchHighlightItem } from '../../utils/highlightHelper';

interface QuranAIAssistantProps {
  currentUser: {
    username: string;
    role: string;
    teacherId?: string;
    studentId?: string;
  } | null;
  currentTeacherName?: string;
  isDeveloper: boolean;
  isSupervisor: boolean;
  activeComplex: QuranComplex | null;
  activeHalaqahId: string;
  students: Student[];
  halaqahs: Halaqah[];
  allHalaqahs?: Halaqah[];
  complexes?: QuranComplex[];
  violations?: any[];
  teachers?: any[];
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  submissions?: any[];
  libraryDocs?: any[];
  leaderboardSettings?: any;
  onAddStudent: (studentData: Partial<Student>) => Promise<boolean>;
  onDeleteStudent?: (studentId: string) => Promise<boolean>;
  onTransferStudent?: (studentId: string, targetHalaqahId: string, targetHalaqahName: string) => Promise<void>;
  onSaveAttendance?: (records: AttendanceRecord[]) => Promise<void>;
  onSaveHalaqah?: (halaqah: Halaqah) => Promise<void>;
  onDeleteHalaqah?: (halaqahId: string) => Promise<void>;
  onDeleteTeacher?: (teacherId: string) => Promise<void>;
  onSaveViolation?: (violation: any) => Promise<void>;
  onNavigateTab?: (tab: string, meta?: any) => void;
  onSaveLibraryDoc?: (doc: LibraryDocument) => Promise<void>;
  onOpenThemeCustomizer?: (complexId?: string) => void;
  certificates?: IssuedCertificate[];
  onSaveCertificate?: (cert: IssuedCertificate) => Promise<void>;
  onSaveCertificates?: (certs: IssuedCertificate[]) => Promise<void>;
  recordings?: SurahRecording[];
  listeningLogs?: StudentListeningLog[];
  onSaveEvaluation?: (
    evaluation: StudentEvaluation,
    newAssignment?: any,
    updatedPosition?: { surahNumber: number; surahName: string; ayah: number },
    listeningAssignment?: any
  ) => Promise<void>;
  onSaveComplex?: (complex: QuranComplex) => Promise<void>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: {
    type:
      | 'SHOW_REGISTRATION_SURVEY'
      | 'REGISTER_STUDENT'
      | 'SHOW_CHART'
      | 'ATTENDANCE_MESSAGE'
      | 'NAVIGATE'
      | 'SHOW_DATA_TABLE'
      | 'CONFIRM_DELETE_STUDENT'
      | 'CONFIRM_ADD_HALAQAH'
      | 'CONFIRM_DELETE_HALAQAH'
      | 'CONFIRM_DELETE_TEACHER'
      | 'CONFIRM_TRANSFER_STUDENT'
      | 'CONFIRM_RECORD_ATTENDANCE'
      | 'CONFIRM_RECORD_VIOLATION'
      | 'NAVIGATE_TO_THEME'
      | 'NAVIGATE_TO_DELETE_ITEM'
      | 'SHOW_STUDENT_POINTS'
      | 'SHOW_STUDENT_RECITATION_HISTORY'
      | 'GENERATE_CERTIFICATES'
      | 'CREATE_CERTIFICATE_TEMPLATE'
      | 'SHOW_STUDENT_EVALUATION'
      | 'SHOW_STUDENT_ATTENDANCE'
      | 'SHOW_STUDENT_REPORT'
      | 'SHOW_MULTI_STUDENT_REPORT';
    title?: string;
    data?: any;
    chartType?: string;
    tableType?:
      | 'attendance'
      | 'memorization'
      | 'general'
      | 'points'
      | 'top_points'
      | 'low_points'
      | 'violations'
      | 'recitation_archive'
      | 'custom_students_progress'
      | 'students_comparison'
      | 'teachers';
  };
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

// Arabic normalization helper
function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .toLowerCase();
}

export const QuranAIAssistant: React.FC<QuranAIAssistantProps> = ({
  currentUser,
  currentTeacherName,
  isDeveloper,
  isSupervisor,
  activeComplex,
  activeHalaqahId,
  students,
  halaqahs,
  allHalaqahs = [],
  complexes = [],
  violations = [],
  teachers = [],
  attendance,
  evaluations,
  submissions = [],
  libraryDocs = [],
  leaderboardSettings,
  onAddStudent,
  onDeleteStudent,
  onTransferStudent,
  onSaveAttendance,
  onSaveHalaqah,
  onDeleteHalaqah,
  onDeleteTeacher,
  onSaveViolation,
  onNavigateTab,
  onSaveLibraryDoc,
  onOpenThemeCustomizer,
  certificates = [],
  onSaveCertificate,
  onSaveCertificates,
  recordings = [],
  listeningLogs = [],
  onSaveEvaluation,
  onSaveComplex,
}) => {
  // 1. Accessibility Guard: Available for Developer, Supervisor, and Teacher
  const canAccess = isDeveloper || isSupervisor || currentUser?.role === 'admin' || Boolean(currentTeacherName);
  if (!canAccess) return null;

  // Active user identity & first name
  const effectiveName = currentTeacherName || currentUser?.username || 'المستخدم الكريم';
  const roleType = isDeveloper ? 'developer' : isSupervisor ? 'supervisor' : 'teacher';

  const userFirstName = useMemo(() => {
    let clean = effectiveName.replace(/^(الشيخ|الأستاذ|الأخ|المعلم|المشرف|الدكتور|المربي|القارئ)\s+/gi, '').trim();
    const parts = clean.split(/\s+/);
    return parts[0] || effectiveName.trim();
  }, [effectiveName]);

  // Developer Platform-Wide / Complex Scope Selection
  const [developerScopeComplexId, setDeveloperScopeComplexId] = useState<string>('all');

  // Multi-style Chart view tabs per message: 'circle' | 'bars' | 'tracking' | 'diagnostic'
  const [chartActiveTabs, setChartActiveTabs] = useState<Record<string, 'circle' | 'bars' | 'tracking' | 'diagnostic'>>({});

  // Certificate Generator States
  const [certSelectedStudents, setCertSelectedStudents] = useState<Record<string, Student[]>>({});
  const [certTemplateSelection, setCertTemplateSelection] = useState<Record<string, string>>({});
  const [certOccasionSelection, setCertOccasionSelection] = useState<Record<string, string>>({});
  const [certOccasionCustomText, setCertOccasionCustomText] = useState<Record<string, string>>({});
  const [addingStudentsForCertMsgId, setAddingStudentsForCertMsgId] = useState<string | null>(null);
  const [studentPickerSearch, setStudentPickerSearch] = useState<string>('');
  const [isExportingCertificates, setIsExportingCertificates] = useState<boolean>(false);

  // Recitation Evaluation Quick Edit Modal States
  const [editingEvalStudent, setEditingEvalStudent] = useState<Student | null>(null);
  const [evalEditFormData, setEvalEditFormData] = useState({
    newMemorization: '',
    review: '',
    teacherNotes: '',
    tomorrowNew: '',
    tomorrowReview: '',
    tomorrowNote: '',
  });
  const [isPlayingAudioUrl, setIsPlayingAudioUrl] = useState<string | null>(null);

  // Complex Theme Colors strictly mapped to platform theme
  const theme = activeComplex?.theme;
  const primaryColor = theme?.primaryColor || '#022c22';
  const secondaryColor = theme?.secondaryColor || '#064e3b';
  const accentColor = theme?.accentColor || '#fbbf24';
  const backgroundColor = theme?.backgroundColor || '#022c22';
  const cardColor = theme?.cardColor || '#064e3b';

  // ----------------------------------------------------
  // Floating Circular Button Position & Dragging
  // ----------------------------------------------------
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('omran_ai_bubble_pos_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return { x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 88 : 600 };
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDraggingBubble, setIsDraggingBubble] = useState(false);
  const [bubbleDragOffset, setBubbleDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasBubbleMoved, setHasBubbleMoved] = useState(false);

  // ----------------------------------------------------
  // Floating Draggable Chat Window Position & Dragging
  // ----------------------------------------------------
  const [chatPosition, setChatPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('omran_ai_chat_window_pos_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return { x: 24, y: 80 };
  });

  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [chatDragOffset, setChatDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Saved reports library set
  const [savedLibraryReports, setSavedLibraryReports] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('omran_saved_reports_library');
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed.map((r: any) => r.id));
      }
    } catch (e) {}
    return new Set();
  });

  // Table vs Chart view toggle for interactive data table cards
  const [tableViewModes, setTableViewModes] = useState<Record<string, 'table' | 'chart'>>({});
  // Transfer target halaqah overrides for interactive transfer cards
  const [transferTargetOverrides, setTransferTargetOverrides] = useState<Record<string, string>>({});

  // Clamp bubble & chat positions inside viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setBubblePosition(prev => ({
        x: Math.max(16, Math.min(window.innerWidth - 76, prev.x)),
        y: Math.max(16, Math.min(window.innerHeight - 76, prev.y)),
      }));

      const chatW = window.innerWidth < 640 ? window.innerWidth - 24 : 500;
      const chatH = 630;
      setChatPosition(prev => ({
        x: Math.max(12, Math.min(window.innerWidth - chatW - 12, prev.x)),
        y: Math.max(12, Math.min(window.innerHeight - chatH - 12, prev.y)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save bubble position
  useEffect(() => {
    try {
      localStorage.setItem('omran_ai_bubble_pos_v4', JSON.stringify(bubblePosition));
    } catch (e) {}
  }, [bubblePosition]);

  // Save chat window position
  useEffect(() => {
    try {
      localStorage.setItem('omran_ai_chat_window_pos_v4', JSON.stringify(chatPosition));
    } catch (e) {}
  }, [chatPosition]);

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isActualDragRef = useRef<boolean>(false);
  const dragDistRef = useRef<number>(0);

  const handleToggleOpen = () => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const chatW = isMobile ? window.innerWidth - 20 : 520;
        const chatH = typeof window !== 'undefined' ? Math.min(650, window.innerHeight - 70) : 600;
        let targetX = bubblePosition.x;
        if (typeof window !== 'undefined' && targetX + chatW > window.innerWidth) {
          targetX = window.innerWidth - chatW - 16;
        }
        let targetY = bubblePosition.y - 440;
        if (targetY < 20) targetY = 24;
        if (typeof window !== 'undefined' && targetY + chatH > window.innerHeight) {
          targetY = window.innerHeight - chatH - 24;
        }
        setChatPosition({
          x: Math.max(10, Math.min((typeof window !== 'undefined' ? window.innerWidth : 800) - chatW - 10, targetX)),
          y: Math.max(10, Math.min((typeof window !== 'undefined' ? window.innerHeight : 600) - chatH - 10, targetY)),
        });
      }
      return next;
    });
  };

  // Listen for global open/toggle events
  useEffect(() => {
    const handleGlobalOpen = () => {
      setIsOpen(true);
    };
    const handleGlobalToggle = () => {
      handleToggleOpen();
    };
    window.addEventListener('omran:open_ai_assistant', handleGlobalOpen);
    window.addEventListener('omran:toggle_ai_assistant', handleGlobalToggle);
    return () => {
      window.removeEventListener('omran:open_ai_assistant', handleGlobalOpen);
      window.removeEventListener('omran:toggle_ai_assistant', handleGlobalToggle);
    };
  }, [bubblePosition]);

  // Handle Bubble Dragging
  const handleBubblePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    dragDistRef.current = 0;
    isActualDragRef.current = false;
    setBubbleDragOffset({
      x: e.clientX - bubblePosition.x,
      y: e.clientY - bubblePosition.y,
    });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handleBubblePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dist = Math.hypot(e.clientX - pointerStartRef.current.x, e.clientY - pointerStartRef.current.y);
    dragDistRef.current = dist;
    if (dist > 8) {
      isActualDragRef.current = true;
      setIsDraggingBubble(true);
      const newX = e.clientX - bubbleDragOffset.x;
      const newY = e.clientY - bubbleDragOffset.y;

      const clampedX = Math.max(12, Math.min((typeof window !== 'undefined' ? window.innerWidth : 800) - 76, newX));
      const clampedY = Math.max(12, Math.min((typeof window !== 'undefined' ? window.innerHeight : 600) - 76, newY));
      setBubblePosition({ x: clampedX, y: clampedY });
    }
  };

  const handleBubblePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}
    pointerStartRef.current = null;
    setIsDraggingBubble(false);
    // Note: Do not toggle open here, onClick will cleanly handle single-click opening
  };

  // Handle Chat Window Header Dragging
  const handleChatHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isExpanded) return;
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDraggingChat(true);
    setChatDragOffset({
      x: e.clientX - chatPosition.x,
      y: e.clientY - chatPosition.y,
    });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleChatHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingChat || isExpanded) return;
    const newX = e.clientX - chatDragOffset.x;
    const newY = e.clientY - chatDragOffset.y;

    const chatW = window.innerWidth < 640 ? window.innerWidth - 24 : 500;
    const chatH = 630;
    const clampedX = Math.max(12, Math.min(window.innerWidth - chatW - 12, newX));
    const clampedY = Math.max(12, Math.min(window.innerHeight - chatH - 12, newY));
    setChatPosition({ x: clampedX, y: clampedY });
  };

  const handleChatHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingChat) return;
    setIsDraggingChat(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}
  };

  // ----------------------------------------------------
  // Chat Sessions & History Management
  // ----------------------------------------------------
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem('omran_ai_chat_sessions_v4');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return `session_${Date.now()}`;
  });

  const getInitialWelcomeMessage = (): ChatMessage => ({
    id: `welcome_${Date.now()}`,
    sender: 'assistant',
    text: `السلام عليكم ورحمة الله وبركاته يا أخي ${userFirstName} 🌿\n\nأهلاً بك في منصة عُمْرَان المباركة! أنا مساعدك القرآني الذكي، مربوط مباشرة ببيانات مجمعك وحلقتك الحية ولديك تحكم كامل بالمنصة.\n\nيسعدني خدمتك في أي شيء:\n• 📋 كشف الطلاب الحاضرين والغائبين بجدول منظم مع استخراج PDF أو Google Sheets\n• 📖 كشف حفظ الطلاب ومستوياتهم وإحصائيات التسميع\n• 📲 تجهيز رسالة تقرير الحضور والغياب اليومية للواتساب فوراً\n• ➕ تسجيل طالب جديد باسمه الرباعي وحلقته بدقة متناهية\n• 🗑️ إدارة وحذف الطلاب والحلقات بالتأكيد المباشر التفاعلي\n\nكيف يمكنني التيسير عليك اليوم؟`,
    timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [getInitialWelcomeMessage()];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showCurrentChatClearConfirm, setShowCurrentChatClearConfirm] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3000);
  };

  // Auto-scroll chat box to bottom
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Persist messages of the active session
  const saveSessionMessages = (newMessages: ChatMessage[], sessionId: string) => {
    const hasUserMessage = newMessages.some(m => m.sender === 'user');
    if (!hasUserMessage) return;

    setSessions(prev => {
      const firstUserMsg = newMessages.find(m => m.sender === 'user')?.text;
      const title = firstUserMsg
        ? (firstUserMsg.length > 32 ? firstUserMsg.substring(0, 32) + '...' : firstUserMsg)
        : 'محادثة قرآنية';

      const existingIndex = prev.findIndex(s => s.id === sessionId);
      const updatedSession: ChatSession = {
        id: sessionId,
        title,
        updatedAt: new Date().toISOString(),
        messages: newMessages,
      };

      let nextSessions: ChatSession[];
      if (existingIndex >= 0) {
        nextSessions = [...prev];
        nextSessions[existingIndex] = updatedSession;
      } else {
        nextSessions = [updatedSession, ...prev];
      }

      try {
        localStorage.setItem('omran_ai_chat_sessions_v4', JSON.stringify(nextSessions.slice(0, 30)));
      } catch (err) {}
      return nextSessions;
    });
  };

  const handleStartNewChat = () => {
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([getInitialWelcomeMessage()]);
    setIsHistoryOpen(false);
    setShowCurrentChatClearConfirm(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages.length > 0 ? session.messages : [getInitialWelcomeMessage()]);
    setIsHistoryOpen(false);
    setShowCurrentChatClearConfirm(false);
  };

  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      try {
        localStorage.setItem('omran_ai_chat_sessions_v4', JSON.stringify(filtered));
      } catch (err) {}
      return filtered;
    });

    if (activeSessionId === sessionId) {
      const newId = `session_${Date.now()}`;
      setActiveSessionId(newId);
      setMessages([getInitialWelcomeMessage()]);
    }

    showToast('تم حذف المحادثة بنجاح ✓');
  };

  const handleClearCurrentChat = () => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== activeSessionId);
      try {
        localStorage.setItem('omran_ai_chat_sessions_v4', JSON.stringify(filtered));
      } catch (err) {}
      return filtered;
    });

    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([getInitialWelcomeMessage()]);
    setShowCurrentChatClearConfirm(false);
    showToast('تم مسح المحادثة وبدء محادثة جديدة ✓');
  };

  const handleConfirmClearAllSessions = () => {
    setSessions([]);
    try {
      localStorage.removeItem('omran_ai_chat_sessions_v4');
    } catch (err) {}
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([getInitialWelcomeMessage()]);
    setShowClearAllConfirm(false);
    setIsHistoryOpen(false);
    showToast('تم مسح جميع المحادثات السابقة بنجاح ✓');
  };

  // ----------------------------------------------------
  // Live Metrics & Real Platform Calculations
  // ----------------------------------------------------
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const scopedStudents = useMemo(() => {
    // For developer: AI is NOT restricted to a single complex! Open to all complexes!
    if (isDeveloper) {
      return students;
    }
    if (activeHalaqahId && activeHalaqahId !== 'all') {
      return students.filter(s => s.halaqahId === activeHalaqahId);
    }
    if (activeComplex?.id) {
      return students.filter(s => !s.complexId || s.complexId === activeComplex.id);
    }
    return students;
  }, [isDeveloper, students, activeHalaqahId, activeComplex]);

  // Comprehensive halaqahs across all complexes to guarantee AI assistant understands any halaqah queried
  const effectiveHalaqahs = useMemo(() => {
    if (allHalaqahs && allHalaqahs.length > 0) return allHalaqahs;
    return halaqahs;
  }, [allHalaqahs, halaqahs]);

  const platformMetrics = useMemo(() => {
    const todayAttendance = attendance.filter(a => a.date === todayStr);
    const presentStudents: string[] = [];
    const absentStudents: string[] = [];
    const excusedStudents: string[] = [];
    let lateCount = 0;

    scopedStudents.forEach(st => {
      const rec = todayAttendance.find(a => a.studentId === st.id);
      if (rec) {
        if (rec.status === 'حاضر') presentStudents.push(st.name);
        else if (rec.status === 'غائب') absentStudents.push(st.name);
        else if (rec.status === 'معتذر') excusedStudents.push(st.name);
        else if (rec.status === 'متأخر') {
          presentStudents.push(st.name);
          lateCount++;
        }
      }
    });

    const todayEvals = evaluations.filter(e => e.date === todayStr);
    let totalNewPages = 0;
    let totalReviewPages = 0;

    todayEvals.forEach(ev => {
      const det = ev.recitationDetails;
      if (det) {
        if (Array.isArray(det.pagesCompletedToday) && det.pagesCompletedToday.length > 0) {
          totalNewPages += det.pagesCompletedToday.length;
        } else if (det.todayNewItem && !det.todayNewItem.didNotRecite) {
          totalNewPages += 1;
        }

        if (Array.isArray(det.todayReviewItems)) {
          totalReviewPages += det.todayReviewItems.filter(i => !i?.didNotRecite).length;
        } else if (det.reviewAchieved && det.reviewAchieved.trim()) {
          totalReviewPages += 1;
        }
      }
    });

    const totalRecitedPages = totalNewPages + totalReviewPages;
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const registeredThisMonth = scopedStudents.filter(
      s => s.createdAt && s.createdAt.startsWith(currentMonthPrefix)
    );

    let targetSum = 0;
    scopedStudents.forEach(s => {
      const t = s.dailyNewTarget || 'نصف وجه';
      if (t.includes('وجهين') || t.includes('2')) targetSum += 2;
      else if (t.includes('وجه') && !t.includes('نصف') && !t.includes('ربع')) targetSum += 1;
      else if (t.includes('نصف')) targetSum += 0.5;
      else if (t.includes('ربع')) targetSum += 0.25;
      else targetSum += 0.5;
    });
    const avgTarget = scopedStudents.length > 0 ? (targetSum / scopedStudents.length).toFixed(1) : '0.5';

    return {
      totalStudents: scopedStudents.length,
      presentCount: presentStudents.length,
      absentCount: absentStudents.length,
      excusedCount: excusedStudents.length,
      lateCount,
      presentStudents,
      absentStudents,
      excusedStudents,
      totalNewPagesToday: totalNewPages,
      totalReviewPagesToday: totalReviewPages,
      totalRecitedPagesToday: totalRecitedPages,
      avgDailyNewTarget: `${avgTarget} وجه`,
      registeredThisMonthCount: registeredThisMonth.length,
      registeredThisMonthStudents: registeredThisMonth.map(s => s.name),
    };
  }, [scopedStudents, attendance, evaluations, todayStr]);

  // ----------------------------------------------------
  // Send Message & AI Processing
  // ----------------------------------------------------
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    saveSessionMessages(updatedWithUser, activeSessionId);
    setIsLoading(true);

    try {
      const activeHalaqah = halaqahs.find(h => h.id === activeHalaqahId) || {
        id: 'all',
        name: 'كافة الحلقات',
      };

      // Compute exact leaderboard points and breakdown matching LeaderboardTab for every student
      const computeExactStudentPoints = (st: any) => {
        const stSubmissions = (submissions || []).filter((sub: any) => sub.studentId === st.id);
        const examPoints = stSubmissions.reduce(
          (sum: number, s: any) => sum + (Number(s.pointsGrantedForLeaderboard) || 0),
          0
        );
        const stEvaluations = (evaluations || []).filter((ev: any) => ev.studentId === st.id);
        const evalPoints = stEvaluations.reduce((sum: number, ev: any) => {
          const criteriaPts = Number(ev.recitationDetails?.criteriaPointsEarnedToday) || 0;
          const pagePts = Number(ev.recitationDetails?.pagesPointsEarnedToday) || 0;
          const attPts = Number(ev.recitationDetails?.attendancePointsEarnedToday) || 0;
          const pts = ev.recitationDetails?.pointsEarnedToday;
          const recitationOnly = criteriaPts + pagePts;
          const dailyTotal = recitationOnly > 0 
            ? recitationOnly 
            : (pts !== undefined && pts !== null ? Math.max(0, pts - attPts) : 0);
          return sum + dailyTotal;
        }, 0);
        const storedRecitationPoints = (Number(st.criteriaPoints) || 0) + (Number(st.totalPagePoints) || 0);
        const finalEvalPoints = Math.max(evalPoints, storedRecitationPoints);
        const stLogs = (listeningLogs || []).filter((l: any) => l.studentId === st.id && l.isFullyCompleted);
        const logsListeningPoints = stLogs.length * 5;
        const finalListeningPoints = Math.max(logsListeningPoints, Number(st.listeningPoints) || 0);
        const stAttRecords = (attendance || []).filter((a: any) => a.studentId === st.id);
        const presentCount = stAttRecords.filter((a: any) => a.status === 'حاضر').length;
        const absentCount = stAttRecords.filter((a: any) => a.status === 'غائب').length;
        const attendancePoints = (presentCount * 1) - (absentCount * 1);
        const computedTotal = examPoints + finalEvalPoints + finalListeningPoints + attendancePoints;
        const totalPoints = typeof st.points === 'number' && st.points > 0
          ? st.points
          : Math.max(0, computedTotal + (Number(st.bonusPoints) || 0));
        return {
          totalPoints,
          examPoints,
          evalPoints: finalEvalPoints,
          listeningPoints: finalListeningPoints,
          attendancePoints,
          bonusPoints: Number(st.bonusPoints) || 0,
        };
      };

      // Extract students discussed in recent messages or action payloads
      const recentReferencedStudents: { id: string; name: string }[] = [];
      const seenRecentStudentIds = new Set<string>();

      for (const m of messages.slice(-8)) {
        if (m.action?.data) {
          const actData = m.action.data;
          if (actData.student?.id && !seenRecentStudentIds.has(actData.student.id)) {
            seenRecentStudentIds.add(actData.student.id);
            recentReferencedStudents.push({ id: actData.student.id, name: actData.student.name || '' });
          }
          if (actData.studentId && !seenRecentStudentIds.has(actData.studentId)) {
            seenRecentStudentIds.add(actData.studentId);
            recentReferencedStudents.push({ id: actData.studentId, name: actData.studentName || '' });
          }
          if (Array.isArray(actData.students)) {
            actData.students.forEach((st: any) => {
              const sid = st.id || st.studentId;
              if (sid && !seenRecentStudentIds.has(sid)) {
                seenRecentStudentIds.add(sid);
                recentReferencedStudents.push({ id: sid, name: st.name || st.studentName || '' });
              }
            });
          }
        }
        for (const st of (students && students.length > 0 ? students : scopedStudents)) {
          if (st?.name && m.text.includes(st.name) && !seenRecentStudentIds.has(st.id)) {
            seenRecentStudentIds.add(st.id);
            recentReferencedStudents.push({ id: st.id, name: st.name });
          }
        }
      }

      const payload = {
        message: textToSend,
        history: messages.slice(-16).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
        recentReferencedStudents,
        user: {
          name: effectiveName,
          username: currentUser?.username,
          role: roleType,
          firstName: userFirstName,
        },
        complex: {
          id: isDeveloper ? 'all' : (activeComplex?.id || 'default'),
          name: isDeveloper
            ? 'كافة مجمعات وحلقات المنظومة (صلاحية المبرمج والمطور العام)'
            : (activeComplex?.name || 'مجمع النور القرآني'),
        },
        activeHalaqah,
        dataContext: {
          complexes: complexes.map(c => ({ id: c.id, name: c.name })),
          violations: violations.map(v => ({
            id: v.id,
            studentId: v.studentId,
            studentName: v.studentName,
            halaqahName: v.halaqahName,
            type: v.type,
            violationType: v.violationType || v.type,
            title: v.title,
            actionTaken: v.actionTaken || v.action,
            pointsDeducted: v.pointsDeducted,
            date: v.date,
            notes: v.notes,
          })),
          students: (students && students.length > 0 ? students : scopedStudents).map(s => {
            const ptsData = computeExactStudentPoints(s);
            return {
              id: s.id,
              name: s.name,
              halaqahId: s.halaqahId,
              halaqahName: s.halaqahName,
              complexId: s.complexId,
              complexName: s.complexName,
              level: s.level,
              dailyNewTarget: s.dailyNewTarget,
              currentSurahName: s.currentSurahName,
              totalPoints: ptsData.totalPoints,
              points: ptsData.totalPoints,
              examPoints: ptsData.examPoints,
              evalPoints: ptsData.evalPoints,
              listeningPoints: ptsData.listeningPoints,
              attendancePoints: ptsData.attendancePoints,
              bonusPoints: ptsData.bonusPoints,
              phone: s.phone,
              parentPhone: s.parentPhone,
            };
          }),
          scopedStudents: scopedStudents.map(s => {
            const ptsData = computeExactStudentPoints(s);
            return {
              id: s.id,
              name: s.name,
              halaqahId: s.halaqahId,
              halaqahName: s.halaqahName,
              complexId: s.complexId,
              complexName: s.complexName,
              level: s.level,
              dailyNewTarget: s.dailyNewTarget,
              currentSurahName: s.currentSurahName,
              totalPoints: ptsData.totalPoints,
              points: ptsData.totalPoints,
              examPoints: ptsData.examPoints,
              evalPoints: ptsData.evalPoints,
              listeningPoints: ptsData.listeningPoints,
              attendancePoints: ptsData.attendancePoints,
              bonusPoints: ptsData.bonusPoints,
            };
          }),
          halaqahs: effectiveHalaqahs.map(h => ({
            id: h.id,
            name: h.name,
            complexId: h.complexId,
            complexName: h.complexName,
            teacherName: h.primaryTeacherName || h.teacherName,
          })),
          teachers: (teachers || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            role: t.role,
          })),
          libraryDocs: (libraryDocs || []).map((d: any) => ({
            id: d.id,
            title: d.title,
            type: d.type,
            date: d.date,
            halaqahName: d.halaqahName,
            createdByName: d.createdByName,
            description: d.description,
          })),
          submissions: (submissions || []).map((sub: any) => ({
            id: sub.id,
            studentId: sub.studentId,
            examTitle: sub.examTitle,
            percentage: sub.percentage,
            pointsGrantedForLeaderboard: sub.pointsGrantedForLeaderboard,
          })),
          evaluations: (evaluations || []).map(e => ({
            id: e.id,
            studentId: e.studentId,
            studentName: e.studentName,
            date: e.date,
            attendanceStatus: e.attendanceStatus,
            pointsAwarded: e.pointsAwarded,
            generalNotes: e.generalNotes,
            recitationDetails: e.recitationDetails,
          })),
          recordings: (recordings || []).map(r => ({
            id: r.id,
            studentId: r.studentId,
            studentName: r.studentName,
            surahName: r.surahName,
            surahNumber: r.surahNumber,
            fromAyah: r.fromAyah,
            toAyah: r.toAyah,
            audioDataUrl: r.audioDataUrl || r.url,
            url: r.url || r.audioDataUrl,
            createdAt: r.createdAt,
            notes: r.notes,
            teacherEvaluation: r.teacherEvaluation,
          })),
          listeningLogs: (listeningLogs || []).map(l => ({
            id: l.id,
            studentId: l.studentId,
            studentName: l.studentName,
            surahNumber: l.surahNumber,
            surahName: l.surahName,
            fromAyah: l.fromAyah,
            toAyah: l.toAyah,
            date: l.date,
            audioUrl: l.audioUrl,
            notes: l.notes,
          })),
          certificates: (certificates || []).map(c => ({
            id: c.id,
            studentId: c.studentId,
            studentName: c.studentName,
            certificateTitle: c.certificateTitle,
            occasion: c.occasion,
            occasionText: c.occasionText,
            issueDate: c.issueDate || (c as any).dateGregorian,
            templateId: c.templateId,
            complexId: c.complexId,
            complexName: c.complexName,
          })),
          customTemplates: (activeComplex?.customCertificateTemplates || []).map(t => ({
            id: t.id,
            name: t.name,
            title: t.title,
            occasionText: t.occasionText,
            bgStyle: t.bgStyle,
            isPlatformAiTemplate: t.isPlatformAiTemplate,
          })),
          attendance: (attendance || []).map(a => ({
            id: a.id,
            studentId: a.studentId,
            date: a.date,
            status: a.status,
            time: a.time,
            notes: a.notes,
          })),
          metrics: platformMetrics,
        },
      };

      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('تعذر معالجة الطلب');
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'أهلاً بك يا أخي، تم استلام طلبك.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        action: data.action || undefined,
      };

      const finalMessages = [...updatedWithUser, assistantMsg];
      setMessages(finalMessages);
      saveSessionMessages(finalMessages, activeSessionId);
    } catch (err: any) {
      console.error('AI assistant error:', err);
      const fallbackMsg: ChatMessage = {
        id: `ai_fallback_${Date.now()}`,
        sender: 'assistant',
        text:
          messages.length > 1
            ? `معذرة يا أخي ${userFirstName}، حدث تعذر لحظي في معالجة الرد. تفضل بتأكيد ما ترغب به وسأواصل معك فوراً.`
            : `أهلاً بك يا أخي ${userFirstName} في منصة عُمْرَان. أنا في خدمتك، كيف يمكنني مساعدتك؟`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      const finalMessages = [...updatedWithUser, fallbackMsg];
      setMessages(finalMessages);
      saveSessionMessages(finalMessages, activeSessionId);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // Interactive Survey Form: In-Chat Student Registration (With Quadripartite & Duplicate Check)
  // ----------------------------------------------------
  const [surveyFormData, setSurveyFormData] = useState<{
    [msgId: string]: {
      name: string;
      password: string;
      halaqahId: string;
      level: 'مبتدئ' | 'متوسط' | 'متقدم' | 'خاتم';
      dailyTarget: string;
      validationError?: string;
      isSubmitting: boolean;
      isSuccess: boolean;
    };
  }>({});

  const initSurveyForm = (msgId: string, initialData?: any) => {
    if (!surveyFormData[msgId]) {
      // Find halaqah accurately by ID, name, or active halaqah
      let defaultHalaqahId = halaqahs[0]?.id || '';
      if (initialData?.suggestedHalaqahId) {
        const found = halaqahs.find(h => h.id === initialData.suggestedHalaqahId);
        if (found) defaultHalaqahId = found.id;
      }
      if (!defaultHalaqahId || defaultHalaqahId === halaqahs[0]?.id) {
        if (initialData?.suggestedHalaqahName) {
          const normSuggested = normalizeArabic(initialData.suggestedHalaqahName);
          const cleanSug = normSuggested.replace(/^(?:حلقه|الحلقه|احلققه|احلققة|احلقه|احلقة|مجموعه|المجموعه)\s+/, '').trim();
          const found = halaqahs.find(h => {
            const normH = normalizeArabic(h.name);
            const cleanH = normH.replace(/^(?:حلقه|الحلقه|احلققه|احلققة|احلقه|احلقة|مجموعه|المجموعه)\s+/, '').trim();
            return normH.includes(normSuggested) || normSuggested.includes(normH) ||
                   (cleanH.length >= 3 && cleanSug.includes(cleanH)) ||
                   (cleanSug.length >= 3 && cleanH.includes(cleanSug));
          });
          if (found) defaultHalaqahId = found.id;
        }
      }
      if (!defaultHalaqahId && activeHalaqahId && activeHalaqahId !== 'all') {
        const found = halaqahs.find(h => h.id === activeHalaqahId);
        if (found) defaultHalaqahId = found.id;
      }

      // Clean candidate initial student name without leftover prepositions or halaqah clauses
      let cleanInitName = (initialData?.studentName || '').trim().replace(/\s+/g, ' ');
      cleanInitName = cleanInitName
        .replace(/^(?:طالب|طالبا|طالباً|الطالب|الطلالب|الطلاب|طالبنا|الطلبة|جديد|جديداً|المدعو|واسمه|اسمه|هو)\s+/gi, '')
        .replace(/\s+(?:في|الي|إلى|مع|ب)\s+(?:حلقة|احلققة|احلققه|احلقة|احلقه|مجموعة|مجموعه).*$/gi, '')
        .trim();

      setSurveyFormData(prev => ({
        ...prev,
        [msgId]: {
          name: cleanInitName,
          password: initialData?.defaultPassword || '123',
          halaqahId: defaultHalaqahId,
          level: 'متوسط',
          dailyTarget: 'نصف وجه',
          isSubmitting: false,
          isSuccess: false,
        },
      }));
    }
  };

  const handleSurveySubmit = async (msgId: string) => {
    const form = surveyFormData[msgId];
    if (!form || form.isSubmitting) return;

    const cleanTrimmedName = form.name.trim().replace(/\s+/g, ' ');

    // 1. Quadripartite Validation (الاسم رباعي)
    const nameParts = cleanTrimmedName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 4) {
      setSurveyFormData(prev => ({
        ...prev,
        [msgId]: {
          ...prev[msgId],
          validationError: '⚠️ يجب أن يكون اسم الطالب رباعياً (مثال: محمد أحمد علي القرشي) لضمان عدم تشابه الأسماء وتفادي الخلط.',
        },
      }));
      return;
    }

    // 2. Duplicate Validation Across Entire Platform
    const normCleanName = normalizeArabic(cleanTrimmedName);
    const existingMatch = students.find(s => normalizeArabic(s.name) === normCleanName);
    if (existingMatch) {
      setSurveyFormData(prev => ({
        ...prev,
        [msgId]: {
          ...prev[msgId],
          validationError: `🚫 عذراً، هذا الاسم (${cleanTrimmedName}) مسجل مسبقاً في المنظومة (في حلقة: ${existingMatch.halaqahName || 'أخرى'}). يرجى تمييز الاسم الرباعي بدقة لمنع التكرار.`,
        },
      }));
      return;
    }

    const existingTeacher = teachers.find(t => normalizeArabic(t.name) === normCleanName);
    if (existingTeacher) {
      setSurveyFormData(prev => ({
        ...prev,
        [msgId]: {
          ...prev[msgId],
          validationError: `🚫 عذراً، هذا الاسم (${cleanTrimmedName}) مسجل مسبقاً كمعلم أو مشرف في المنظومة. يرجى تمييز الاسم لمنع التكرار.`,
        },
      }));
      return;
    }

    // Clear error
    setSurveyFormData(prev => ({
      ...prev,
      [msgId]: { ...prev[msgId], validationError: undefined, isSubmitting: true },
    }));

    try {
      const selectedHalaqah = halaqahs.find(h => h.id === form.halaqahId);
      const success = await onAddStudent({
        name: cleanTrimmedName,
        username: `student_${Date.now().toString().slice(-4)}`,
        password: form.password.trim() || '123',
        halaqahId: form.halaqahId,
        halaqahName: selectedHalaqah?.name || 'الحلقة القرآنية',
        complexId: activeComplex?.id,
        level: form.level,
        dailyNewTarget: form.dailyTarget,
        role: 'student',
        currentSurahNumber: 1,
        currentSurahName: 'الفاتحة',
        currentAyahNumber: 1,
        totalPoints: 50,
      });

      if (success) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });

        setSurveyFormData(prev => ({
          ...prev,
          [msgId]: { ...prev[msgId], isSubmitting: false, isSuccess: true, validationError: undefined },
        }));

        const confirmationMsg: ChatMessage = {
          id: `ai_confirm_${Date.now()}`,
          sender: 'assistant',
          text: `🎉 ما شاء الله تبارك الله! تم بنجاح تسجيل الطالب **${cleanTrimmedName}** في **${selectedHalaqah?.name || 'الحلقة'}** بكلمة المرور الافتراضية (${form.password || '123'}). بارك الله في جهودكم يا ${userFirstName}!`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => {
          const next = [...prev, confirmationMsg];
          saveSessionMessages(next, activeSessionId);
          return next;
        });

        showToast('تم تسجيل الطالب بنجاح في المنظومة 🎉');
      } else {
        setSurveyFormData(prev => ({
          ...prev,
          [msgId]: { ...prev[msgId], isSubmitting: false, validationError: 'تعذر حفظ الطالب في قاعدة البيانات، يرجى إعادة المحاولة.' },
        }));
      }
    } catch (e: any) {
      setSurveyFormData(prev => ({
        ...prev,
        [msgId]: { ...prev[msgId], isSubmitting: false, validationError: e?.message || 'حدث خطأ أثناء التسجيل.' },
      }));
    }
  };

  // ----------------------------------------------------
  // Interactive Action Handlers: Delete Student & Halaqah Management
  // ----------------------------------------------------
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleExecuteDeleteStudent = async (studentId: string, studentName: string) => {
    if (!onDeleteStudent) return;
    setActionInProgress(studentId);
    try {
      const ok = await onDeleteStudent(studentId);
      if (ok) {
        showToast(`تم حذف الطالب ${studentName} بنجاح ✓`);
        const confirmMsg: ChatMessage = {
          id: `ai_del_${Date.now()}`,
          sender: 'assistant',
          text: `تم بنجاح حذف الطالب **${studentName}** من المنظومة بناءً على تأكيدكم.`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => {
          const next = [...prev, confirmMsg];
          saveSessionMessages(next, activeSessionId);
          return next;
        });
      }
    } catch (err: any) {
      showToast('تعذر حذف الطالب: ' + (err?.message || ''));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteAddHalaqah = async (name: string, teacherId?: string) => {
    if (!onSaveHalaqah) return;
    if (!name.trim()) {
      showToast('يرجى تحديد اسم الحلقة');
      return;
    }
    setActionInProgress('add_halaqah');
    try {
      const assignedTeacher = teachers.find(t => t.id === teacherId);
      const newHalaqah: Halaqah = {
        id: `h_${Date.now()}`,
        name: name.trim(),
        complexId: activeComplex?.id || 'default',
        primaryTeacherId: assignedTeacher?.id,
        primaryTeacherName: assignedTeacher?.name || currentTeacherName,
        teacherIds: assignedTeacher?.id ? [assignedTeacher.id] : [],
        teacherNames: assignedTeacher?.name ? [assignedTeacher.name] : currentTeacherName ? [currentTeacherName] : [],
        createdAt: new Date().toISOString(),
      };
      await onSaveHalaqah(newHalaqah);
      confetti({ particleCount: 50, spread: 50 });
      showToast(`تم إنشاء ${name.trim()} بنجاح ✓`);
      const confirmMsg: ChatMessage = {
        id: `ai_add_h_${Date.now()}`,
        sender: 'assistant',
        text: `ما شاء الله! تم اعتماد وإنشاء **${name.trim()}** بنجاح، والمعلم المشرف عليها: ${assignedTeacher?.name || currentTeacherName || 'غير محدد'}.`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => {
        const next = [...prev, confirmMsg];
        saveSessionMessages(next, activeSessionId);
        return next;
      });
    } catch (err: any) {
      showToast('تعذر إنشاء الحلقة');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteDeleteHalaqah = async (halaqahId: string, halaqahName: string) => {
    if (!onDeleteHalaqah) return;
    setActionInProgress(halaqahId);
    try {
      await onDeleteHalaqah(halaqahId);
      showToast(`تم حذف ${halaqahName} بنجاح ✓`);
      const confirmMsg: ChatMessage = {
        id: `ai_del_h_${Date.now()}`,
        sender: 'assistant',
        text: `تم بنجاح حذف **${halaqahName}** من المنظومة بناءً على تأكيدكم.`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => {
        const next = [...prev, confirmMsg];
        saveSessionMessages(next, activeSessionId);
        return next;
      });
    } catch (err: any) {
      showToast('تعذر حذف الحلقة');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!onDeleteTeacher) return;
    setActionInProgress(teacherId);
    try {
      await onDeleteTeacher(teacherId);
      showToast(`تم حذف حساب المعلم ${teacherName} بنجاح ✓`);
      const confirmMsg: ChatMessage = {
        id: `ai_del_t_${Date.now()}`,
        sender: 'assistant',
        text: `تم بنجاح حذف حساب المعلم **${teacherName}** من المنظومة بناءً على تأكيدكم.`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => {
        const next = [...prev, confirmMsg];
        saveSessionMessages(next, activeSessionId);
        return next;
      });
    } catch (err: any) {
      showToast(err?.message || 'تعذر حذف المعلم');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteTransferStudent = async (
    studentId: string,
    targetHalaqahId: string,
    targetHalaqahName: string,
    studentName: string
  ) => {
    if (!onTransferStudent) return;
    setActionInProgress(studentId);
    try {
      await onTransferStudent(studentId, targetHalaqahId, targetHalaqahName);
      confetti({ particleCount: 40, spread: 40 });
      showToast(`تم نقل الطالب ${studentName} إلى ${targetHalaqahName} بنجاح ✓`);
      const confirmMsg: ChatMessage = {
        id: `ai_trans_${Date.now()}`,
        sender: 'assistant',
        text: `تم بنجاح نقل الطالب **${studentName}** إلى **${targetHalaqahName}** بناءً على تأكيدكم.`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => {
        const next = [...prev, confirmMsg];
        saveSessionMessages(next, activeSessionId);
        return next;
      });
    } catch (err: any) {
      showToast('تعذر نقل الطالب: ' + (err?.message || ''));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteRecordAttendance = async (
    studentId: string,
    status: 'حاضر' | 'غائب' | 'معتذر' | 'متأخر',
    studentName: string
  ) => {
    if (!onSaveAttendance) return;
    setActionInProgress(studentId);
    try {
      const today = new Date().toISOString().split('T')[0];
      const newRec: AttendanceRecord = {
        id: `att_${Date.now()}_${studentId}`,
        studentId,
        date: today,
        status,
        savedAt: new Date().toISOString(),
      };
      await onSaveAttendance([newRec]);
      confetti({ particleCount: 40, spread: 40 });
      showToast(`تم تسجيل (${status}) للطالب ${studentName} بنجاح ✓`);
      const confirmMsg: ChatMessage = {
        id: `ai_att_${Date.now()}`,
        sender: 'assistant',
        text: `تم رصد وتسجيل حالة **${status}** للطالب **${studentName}** في سجل تحضير اليوم بنجاح ✓.`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => {
        const next = [...prev, confirmMsg];
        saveSessionMessages(next, activeSessionId);
        return next;
      });
    } catch (err: any) {
      showToast('تعذر تسجيل الحضور: ' + (err?.message || ''));
    } finally {
      setActionInProgress(null);
    }
  };

  // ----------------------------------------------------
  // Export & Library Handlers (PDF, Google Sheets / CSV, Library)
  // ----------------------------------------------------
  const handleExportPDF = (title: string, tableType: string, rows: any[]) => {
    try {
      const now = new Date().toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const complexTitle = isDeveloper
        ? 'منظومة عُمْرَان - كشف شامل لكافة المجمعات'
        : (activeComplex?.name || 'مجمع حلقات القرآن الكريم');

      let tableHtml = '';
      if (tableType === 'attendance') {
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>اسم الطالب</th>
                <th>الحلقة</th>
                <th style="width: 100px; text-align: center;">حالة الحضور اليوم</th>
                <th>السورة الحالية</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; color: #065f46; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: 700;">${r.name || ''}</td>
                  <td>${r.halaqahName || ''}</td>
                  <td style="text-align: center;">
                    <span class="status-badge status-${r.status === 'حاضر' ? 'present' : r.status === 'غائب' ? 'absent' : r.status === 'معتذر' ? 'excused' : 'other'}">
                      ${r.status || 'لم يُسجل'}
                    </span>
                  </td>
                  <td>${r.currentSurah || '-'}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else if (tableType === 'recitation_archive') {
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>اسم الطالب</th>
                <th>الحلقة</th>
                <th>ما سمعه (حفظ جديد)</th>
                <th style="width: 90px; text-align: center;">الأوجه المسمعة</th>
                <th>المراجعة والتثبيت</th>
                <th>ملاحظات المعلم</th>
                <th style="width: 60px; text-align: center;">النقاط</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; color: #065f46; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: 700;">${r.studentName || r.name || ''}</td>
                  <td>${r.halaqahName || ''}</td>
                  <td style="color: #047857; font-weight: 600;">${r.newMemorization || '-'}</td>
                  <td style="text-align: center; font-weight: bold;"><span class="level-badge">${r.facesLabel || `${r.facesCount || 0} وجه`}</span></td>
                  <td style="color: #0369a1;">${r.reviewAchieved || '-'}</td>
                  <td style="color: #475569; font-size: 11px;">${r.teacherNotes || '-'}</td>
                  <td style="text-align: center; font-weight: bold; color: #b45309;">+${r.pointsEarned ?? r.totalPoints ?? 0}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else if (tableType === 'violations') {
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>اسم الطالب</th>
                <th>الحلقة</th>
                <th style="text-align: center;">نوع التنبيه / الملاحظة</th>
                <th>الإجراء المتخذ</th>
                <th style="text-align: center;">التاريخ</th>
                <th style="text-align: center;">خصم النقاط</th>
                <th>ملاحظات وتوجيهات</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; color: #065f46; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: 700;">${r.name || ''}</td>
                  <td>${r.halaqahName || ''}</td>
                  <td style="text-align: center;">
                    <span class="status-badge status-absent">
                      ${r.violationType || 'تنبيه سلوكي'}
                    </span>
                  </td>
                  <td>${r.actionTaken || '-'}</td>
                  <td style="text-align: center;">${r.date || '-'}</td>
                  <td style="text-align: center; font-weight: bold; color: #dc2626;">${r.pointsDeducted ? `-${r.pointsDeducted}` : '0'}</td>
                  <td>${r.notes || '-'}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else if (tableType === 'teachers') {
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>اسم المعلم / الشيخ</th>
                <th>الحلقة المسندة</th>
                <th>المسمى والصفة</th>
                <th style="width: 120px; text-align: center;">رقم الهاتف</th>
                <th style="width: 90px; text-align: center;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; color: #065f46; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: 700;">${r.name || r.teacherName || ''}</td>
                  <td>${r.halaqahName || ''}</td>
                  <td style="color: #047857; font-weight: 600;">${r.title || r.role || 'معلم ومحفظ'}</td>
                  <td style="text-align: center; direction: ltr; font-family: monospace;">${r.phone || '-'}</td>
                  <td style="text-align: center;"><span class="status-badge status-present">نشط ومفعل</span></td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else if (tableType === 'top_points' || tableType === 'low_points' || tableType === 'points') {
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">المركز</th>
                <th>اسم الطالب</th>
                <th>الحلقة</th>
                <th style="text-align: center;">المستوى</th>
                <th>السورة الحالية</th>
                <th>الورد اليومي</th>
                <th style="text-align: center;">إجمالي النقاط</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; color: #065f46; font-weight: 800;">
                    ${r.rank ? `${r.rank === 1 ? '🥇 1' : r.rank === 2 ? '🥈 2' : r.rank === 3 ? '🥉 3' : r.rank}` : idx + 1}
                  </td>
                  <td style="font-weight: 700;">${r.name || ''}</td>
                  <td>${r.halaqahName || ''}</td>
                  <td style="text-align: center;"><span class="level-badge">${r.level || 'متوسط'}</span></td>
                  <td>${r.currentSurah || '-'}</td>
                  <td>${r.dailyTarget || 'نصف وجه'}</td>
                  <td style="text-align: center; font-weight: bold; color: #b45309; font-size: 13px;">${r.totalPoints || 0}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else {
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>اسم الطالب</th>
                <th>الحلقة</th>
                <th style="text-align: center;">المستوى</th>
                <th>السورة الحالية</th>
                <th>الورد اليومي</th>
                <th style="text-align: center;">النقاط</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; color: #065f46; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: 700;">${r.name || ''}</td>
                  <td>${r.halaqahName || ''}</td>
                  <td style="text-align: center;"><span class="level-badge">${r.level || 'متوسط'}</span></td>
                  <td>${r.currentSurah || '-'}</td>
                  <td>${r.dailyTarget || 'نصف وجه'}</td>
                  <td style="text-align: center; font-weight: bold; color: #b45309;">${r.totalPoints || 0}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        `;
      }

      const printableHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>${title} - ${complexTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&display=swap');
    @page { size: A4 portrait; margin: 12mm; }
    body {
      font-family: 'Cairo', 'Amiri', Tahoma, sans-serif;
      margin: 0;
      padding: 16px;
      color: #064e3b;
      background: #ffffff;
      direction: rtl;
    }
    .header-box {
      border: 2px double #047857;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      background: #f0fdf4;
      text-align: center;
    }
    .bismillah {
      font-family: 'Amiri', serif;
      font-size: 16px;
      color: #065f46;
      margin-bottom: 6px;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      color: #064e3b;
      margin: 4px 0;
    }
    .meta {
      font-size: 12px;
      color: #047857;
      margin-top: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 11.5px;
    }
    th {
      background-color: #064e3b;
      color: #ffffff;
      padding: 8px 10px;
      border: 1px solid #065f46;
      text-align: right;
      font-weight: 700;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #d1fae5;
      color: #1f2937;
    }
    tr:nth-child(even) td { background-color: #f9fafb; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: bold;
    }
    .status-present { background-color: #d1fae5; color: #065f46; border: 1px solid #34d399; }
    .status-absent { background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .status-excused { background-color: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
    .status-other { background-color: #e5e7eb; color: #374151; }
    .level-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #d1fae5;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #065f46;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
    <div class="title">${title}</div>
    <div class="meta">${complexTitle}  •  تاريخ التقرير: ${now}  •  عدد السجلات: ${rows.length}</div>
  </div>
  ${tableHtml}
  <div class="footer">
    <span>منصة عُمْرَان لإدارة المجمعات والحلقات القرآنية</span>
    <span>تقرير رسمي صادر عبر المساعد القرآني الذكي</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printableHtml);
        doc.close();
      }

      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }, 50000);

      showToast('جارٍ استخراج ملف PDF الجميل والطباعة 🖨️✓');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('تعذر استخراج ملف PDF');
    }
  };

  const handleExportGoogleSheets = (title: string, tableType: string, rows: any[]) => {
    try {
      let csv = '';
      if (tableType === 'attendance') {
        csv = 'الرقم,اسم الطالب,الحلقة,حالة الحضور والغياب اليوم,السورة الحالية\n';
        rows.forEach((r, idx) => {
          csv += `"${idx + 1}","${r.name || ''}","${r.halaqahName || ''}","${r.status || ''}","${r.currentSurah || ''}"\n`;
        });
      } else if (tableType === 'recitation_archive') {
        csv = 'الرقم,اسم الطالب,الحلقة,ما سمعه (حفظ جديد),الأوجه المسمعة,المراجعة والتثبيت,ملاحظات المعلم,النقاط\n';
        rows.forEach((r, idx) => {
          csv += `"${idx + 1}","${r.studentName || r.name || ''}","${r.halaqahName || ''}","${r.newMemorization || ''}","${r.facesLabel || `${r.facesCount || 0} وجه`}","${r.reviewAchieved || ''}","${r.teacherNotes || ''}","${r.pointsEarned ?? r.totalPoints ?? 0}"\n`;
        });
      } else if (tableType === 'violations') {
        csv = 'الرقم,اسم الطالب,الحلقة,نوع التنبيه أو المخالفة,الإجراء المتخذ,التاريخ,النقاط المخصومة,الملاحظات\n';
        rows.forEach((r, idx) => {
          csv += `"${idx + 1}","${r.name || ''}","${r.halaqahName || ''}","${r.violationType || ''}","${r.actionTaken || ''}","${r.date || ''}","${r.pointsDeducted || 0}","${r.notes || ''}"\n`;
        });
      } else if (tableType === 'teachers') {
        csv = 'الرقم,اسم المعلم,الحلقة المسندة,المسمى الوظيفي والصفة,رقم الهاتف,الحالة\n';
        rows.forEach((r, idx) => {
          csv += `"${idx + 1}","${r.name || r.teacherName || ''}","${r.halaqahName || ''}","${r.title || r.role || 'معلم ومحفظ'}","${r.phone || ''}","نشط ومفعل"\n`;
        });
      } else if (tableType === 'top_points' || tableType === 'low_points' || tableType === 'points') {
        csv = 'المركز,اسم الطالب,الحلقة,المستوى,السورة الحالية,الورد اليومي,إجمالي النقاط\n';
        rows.forEach((r, idx) => {
          csv += `"${r.rank || idx + 1}","${r.name || ''}","${r.halaqahName || ''}","${r.level || ''}","${r.currentSurah || ''}","${r.dailyTarget || ''}","${r.totalPoints || 0}"\n`;
        });
      } else {
        csv = 'الرقم,اسم الطالب,الحلقة,المستوى,السورة الحالية,الورد اليومي,إجمالي النقاط\n';
        rows.forEach((r, idx) => {
          csv += `"${idx + 1}","${r.name || ''}","${r.halaqahName || ''}","${r.level || ''}","${r.currentSurah || ''}","${r.dailyTarget || ''}","${r.totalPoints || 0}"\n`;
        });
      }

      // Add UTF-8 BOM so Excel & Google Sheets display Arabic seamlessly
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tableType === 'attendance' ? 'تقرير_الحضور' : tableType === 'violations' ? 'كشف_التنبيهات' : 'كشف_النقاط'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('تم استخراج ملف Google Sheets / Excel بنجاح 📊✓');
    } catch (e) {
      showToast('تعذر تصدير الملف');
    }
  };

  const handleSaveToLibrary = async (title: string, tableType: string, rows: any[], msgId?: string) => {
    try {
      const now = new Date().toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const complexTitle = isDeveloper ? 'كافة مجمعات المنظومة' : (activeComplex?.name || 'مجمع النور القرآني');

      let tableRowsHtml = '';
      if (tableType === 'attendance') {
        tableRowsHtml = rows
          .map(
            (r, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; text-align: center; color: #047857; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 8px 12px; font-weight: 700; color: #064e3b;">${r.name || ''}</td>
            <td style="padding: 8px 12px; color: #334155;">${r.halaqahName || ''}</td>
            <td style="padding: 8px 12px; text-align: center;">
              <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: ${
                r.status === 'حاضر' ? '#dcfce7; color: #15803d;' : r.status === 'غائب' ? '#fee2e2; color: #b91c1c;' : '#fef3c7; color: #b45309;'
              }">
                ${r.status || 'لم يُسجل'}
              </span>
            </td>
            <td style="padding: 8px 12px; color: #0f766e;">${r.currentSurah || '-'}</td>
          </tr>`
          )
          .join('');
      } else if (tableType === 'recitation_archive') {
        tableRowsHtml = rows
          .map(
            (r, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; text-align: center; color: #047857; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 8px 12px; font-weight: 700; color: #064e3b;">${r.studentName || r.name || ''}</td>
            <td style="padding: 8px 12px; color: #334155;">${r.halaqahName || ''}</td>
            <td style="padding: 8px 12px; color: #047857; font-weight: 600;">${r.newMemorization || '-'}</td>
            <td style="padding: 8px 12px; text-align: center;">${r.facesLabel || `${r.facesCount || 0} وجه`}</td>
            <td style="padding: 8px 12px; color: #0369a1;">${r.reviewAchieved || '-'}</td>
            <td style="padding: 8px 12px; color: #64748b;">${r.teacherNotes || '-'}</td>
            <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: #b45309;">+${r.pointsEarned ?? r.totalPoints ?? 0}</td>
          </tr>`
          )
          .join('');
      } else if (tableType === 'violations') {
        tableRowsHtml = rows
          .map(
            (r, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; text-align: center; color: #047857; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 8px 12px; font-weight: 700; color: #064e3b;">${r.name || ''}</td>
            <td style="padding: 8px 12px; color: #334155;">${r.halaqahName || ''}</td>
            <td style="padding: 8px 12px; text-align: center; color: #b91c1c; font-weight: bold;">${r.violationType || 'تنبيه'}</td>
            <td style="padding: 8px 12px; color: #047857;">${r.actionTaken || '-'}</td>
            <td style="padding: 8px 12px; text-align: center; color: #64748b;">${r.date || '-'}</td>
            <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: #dc2626;">${r.pointsDeducted ? `-${r.pointsDeducted}` : '0'}</td>
          </tr>`
          )
          .join('');
      } else {
        tableRowsHtml = rows
          .map(
            (r, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; text-align: center; color: #047857; font-weight: bold;">${r.rank || idx + 1}</td>
            <td style="padding: 8px 12px; font-weight: 700; color: #064e3b;">${r.name || ''}</td>
            <td style="padding: 8px 12px; color: #334155;">${r.halaqahName || ''}</td>
            <td style="padding: 8px 12px; text-align: center; color: #047857;">${r.level || 'متوسط'}</td>
            <td style="padding: 8px 12px; color: #0f766e;">${r.currentSurah || '-'}</td>
            <td style="padding: 8px 12px; color: #334155;">${r.dailyTarget || 'نصف وجه'}</td>
            <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: #b45309;">${r.totalPoints || 0}</td>
          </tr>`
          )
          .join('');
      }

      const styledReportHtml = `
<div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 20px; background: #ffffff; color: #064e3b; border-radius: 12px; border: 2px solid #047857;">
  <div style="text-align: center; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #064e3b; font-size: 22px; font-weight: 800;">${title}</h2>
    <p style="margin: 6px 0 0; color: #047857; font-size: 13px;">${complexTitle}  |  التاريخ: ${now}  |  عدد السجلات: ${rows.length}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: right;">
    <thead>
      <tr style="background: #064e3b; color: #ffffff;">
        <th style="padding: 10px; width: 40px; text-align: center;">#</th>
        <th style="padding: 10px;">اسم الطالب</th>
        <th style="padding: 10px;">الحلقة</th>
        ${tableType === 'attendance' ? '<th style="padding: 10px; text-align: center;">حالة الحضور</th><th style="padding: 10px;">السورة</th>' : tableType === 'violations' ? '<th style="padding: 10px; text-align: center;">نوع التنبيه</th><th style="padding: 10px;">الإجراء</th><th style="padding: 10px; text-align: center;">التاريخ</th><th style="padding: 10px; text-align: center;">الخصم</th>' : '<th style="padding: 10px; text-align: center;">المستوى</th><th style="padding: 10px;">السورة</th><th style="padding: 10px;">الورد</th><th style="padding: 10px; text-align: center;">النقاط</th>'}
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
  <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
    تم التوليد والحفظ تلقائياً عبر المساعد القرآني الذكي - منصة عُمْرَان
  </div>
</div>`;

      const libDoc: LibraryDocument = {
        id: `lib_rep_${Date.now()}`,
        title,
        type: tableType === 'attendance' ? 'attendance_sheet' : 'pdf_report',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdByName: effectiveName,
        htmlContent: styledReportHtml,
        complexId: activeComplex?.id,
        complexName: activeComplex?.name || 'مجمع النور',
        fileSize: `${rows.length} سجل`,
        tags: [tableType, 'المساعد_الذكي', 'تقرير'],
      };

      if (onSaveLibraryDoc) {
        await onSaveLibraryDoc(libDoc);
      } else {
        await OmranDataService.saveLibraryDocument(libDoc);
      }

      setSavedLibraryReports(prev => new Set([...prev, `lib_${msgId}`]));
      showToast('تم حفظ التقرير بنجاح في مكتبة المنصة 📚✓');
    } catch (e: any) {
      console.error('Save to library error:', e);
      showToast('تعذر حفظ التقرير في المكتبة');
    }
  };

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    showToast('تم نسخ النص بنجاح ✓');
    setTimeout(() => setCopiedMessageId(null), 2500);
  };

  // Audio playback handler
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const handleToggleAudio = (url: string) => {
    if (isPlayingAudioUrl === url) {
      audioPlayerRef.current?.pause();
      setIsPlayingAudioUrl(null);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(url);
        audioPlayerRef.current.onended = () => setIsPlayingAudioUrl(null);
      } else {
        audioPlayerRef.current.src = url;
      }
      audioPlayerRef.current.play().then(() => {
        setIsPlayingAudioUrl(url);
      }).catch(() => {
        setIsPlayingAudioUrl(null);
        showToast('تعذر تشغيل الملف الصوتي');
      });
    }
  };

  // Certificate Canvas Renderer for Assistant
  const renderCertificateCanvasForStudent = async (
    studentName: string,
    title: string,
    occasionText: string,
    templateId: string,
    targetComplexName: string,
    targetHalaqahName?: string
  ): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 840;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // 1. Draw Background based on templateId
    if (templateId === 'platform_golden_honor') {
      const grad = ctx.createLinearGradient(0, 0, 1200, 840);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(0.5, '#292524');
      grad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 840);

      // Gold Borders
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, 1140, 780);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 50, 1100, 740);
    } else if (templateId === 'platform_islamic_classic') {
      const grad = ctx.createLinearGradient(0, 0, 1200, 840);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#042f2e');
      grad.addColorStop(1, '#022c22');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 840);

      // Islamic ornate border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 16;
      ctx.strokeRect(28, 28, 1144, 784);
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 4;
      ctx.strokeRect(52, 52, 1096, 736);
    } else if (templateId === 'platform_blue_modern') {
      const grad = ctx.createLinearGradient(0, 0, 1200, 840);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 840);

      // Blue & Cyan borders
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 12;
      ctx.strokeRect(30, 30, 1140, 780);
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, 1104, 744);
    } else {
      // Default: Royal Emerald (القالب الملكي الزمردي)
      const grad = ctx.createRadialGradient(600, 420, 50, 600, 420, 700);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.6, '#022c22');
      grad.addColorStop(1, '#011c15');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 840);

      // Rich Emerald & Gold Border
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 12;
      ctx.strokeRect(28, 28, 1144, 784);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, 1104, 744);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(58, 58, 1084, 724);
    }

    // Header: Complex Name
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 24px Cairo, Amiri, sans-serif';
    ctx.fillText(targetComplexName || 'مجمع حلقات القرآن الكريم', 600, 110);

    // Calligraphy / Bismillah subtitle
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '19px Amiri, Cairo, sans-serif';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 600, 150);

    // Certificate Title (e.g. شكر وتقدير)
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 48px Cairo, Amiri, sans-serif';
    ctx.fillText(title || 'شكر وتقدير وتميز', 600, 230);

    // Subtitle / Intro phrase
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px Cairo, sans-serif';
    ctx.fillText('يَسرّ إدارة المجمع والحلقات القرآنية أن تمنح هذه الشهادة المباركة للطالب:', 600, 310);

    // Student Name (Prominent Gold Banner)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px Cairo, Amiri, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(studentName, 600, 400);
    ctx.shadowBlur = 0;

    // Halaqah name
    if (targetHalaqahName) {
      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 20px Cairo, sans-serif';
      ctx.fillText(`من ${targetHalaqahName}`, 600, 450);
    }

    // Occasion Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '22px Cairo, sans-serif';
    const maxTextWidth = 860;
    const words = (occasionText || 'تقديراً لجهوده المباركة وتفوقه في حفظ وتلاوة كتاب الله الكريم').split(' ');
    let currentLine = '';
    let lineY = 510;
    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(testLine).width > maxTextWidth) {
        ctx.fillText(currentLine, 600, lineY);
        currentLine = w;
        lineY += 36;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      ctx.fillText(currentLine, 600, lineY);
    }

    // Dua / Closing verse
    ctx.fillStyle = '#fcd34d';
    ctx.font = 'italic bold 21px Amiri, Cairo, sans-serif';
    ctx.fillText('﴿وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ﴾', 600, lineY + 60);

    // Signatures / Footer
    const todayHijri = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 18px Cairo, sans-serif';

    // Right: Date
    ctx.textAlign = 'right';
    ctx.fillText(`التاريخ: ${todayHijri}`, 1040, 740);

    // Left: Supervisor / Teacher signature
    ctx.textAlign = 'left';
    ctx.fillText(`المشرف العام: ${effectiveName}`, 160, 740);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px Cairo, sans-serif';
    ctx.fillText('الختم والاعتماد الرسمي', 160, 768);

    return canvas;
  };

  // Export Separate Certificates (one PDF per student named by student)
  const handlePrintSeparateCertificates = async (
    msgId: string,
    studentsToPrint: Student[],
    title: string,
    occasionText: string,
    templateId: string
  ) => {
    if (!studentsToPrint || studentsToPrint.length === 0) {
      showToast('يرجى تحديد طالب واحد على الأقل لإصدار الشهادة');
      return;
    }
    setIsExportingCertificates(true);
    showToast(`جاري إنشاء وتحميل ${studentsToPrint.length} شهادة منفصلة...`);

    const issuedList: IssuedCertificate[] = [];
    const compName = activeComplex?.name || 'المجمع القرآني';

    try {
      for (let i = 0; i < studentsToPrint.length; i++) {
        const st = studentsToPrint[i];
        const canvas = await renderCertificateCanvasForStudent(
          st.name,
          title,
          occasionText,
          templateId,
          compName,
          st.halaqahName
        );

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

        const fileName = `شهادة_${st.name.replace(/\s+/g, '_')}.pdf`;
        pdf.save(fileName);

        const certItem: IssuedCertificate = {
          id: `cert_${Date.now()}_${st.id}`,
          studentId: st.id,
          studentName: st.name,
          halaqahId: st.halaqahId,
          halaqahName: st.halaqahName,
          complexId: activeComplex?.id,
          complexName: compName,
          occasion: 'شكر وتقدير وتميز',
          occasionText,
          certificateTitle: title,
          templateId,
          templateName: templateId === 'platform_golden_honor' ? 'وسام الشرف الذهبي' : templateId === 'platform_islamic_classic' ? 'الزخرفة الإسلامية' : 'القالب الزمردي الملكي',
          templateType: 'ready',
          signatureMode: 'auto',
          teacherName: effectiveName,
          supervisorName: activeComplex?.supervisorTeacherName || effectiveName,
          dateArabic: new Date().toLocaleDateString('ar-SA'),
          dateGregorian: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          createdByName: effectiveName,
        };
        issuedList.push(certItem);

        if (studentsToPrint.length > 1 && i < studentsToPrint.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      if (onSaveCertificates && issuedList.length > 0) {
        await onSaveCertificates(issuedList);
      } else if (onSaveCertificate && issuedList.length > 0) {
        for (const c of issuedList) {
          await onSaveCertificate(c);
        }
      }

      confetti({ particleCount: 70, spread: 60 });
      showToast(`تم بنجاح تحميل ${studentsToPrint.length} شهادة منفصلة وحفظها بالأرشيف! 🎉`);
    } catch (err: any) {
      console.error('Error exporting separate certificates:', err);
      showToast('تعذر تصدير الشهادات: ' + (err?.message || ''));
    } finally {
      setIsExportingCertificates(false);
    }
  };

  // Export Merged Certificates (all certificates in one PDF file)
  const handlePrintMergedCertificates = async (
    msgId: string,
    studentsToPrint: Student[],
    title: string,
    occasionText: string,
    templateId: string
  ) => {
    if (!studentsToPrint || studentsToPrint.length === 0) {
      showToast('يرجى تحديد طالب واحد على الأقل لإصدار الشهادة');
      return;
    }
    setIsExportingCertificates(true);
    showToast(`جاري دمج وتصدير ${studentsToPrint.length} شهادة في ملف PDF واحد...`);

    const issuedList: IssuedCertificate[] = [];
    const compName = activeComplex?.name || 'المجمع القرآني';

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < studentsToPrint.length; i++) {
        const st = studentsToPrint[i];
        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }
        const canvas = await renderCertificateCanvasForStudent(
          st.name,
          title,
          occasionText,
          templateId,
          compName,
          st.halaqahName
        );
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

        issuedList.push({
          id: `cert_${Date.now()}_${st.id}`,
          studentId: st.id,
          studentName: st.name,
          halaqahId: st.halaqahId,
          halaqahName: st.halaqahName,
          complexId: activeComplex?.id,
          complexName: compName,
          occasion: 'شكر وتقدير وتميز',
          occasionText,
          certificateTitle: title,
          templateId,
          templateName: 'شهادات مجمعة',
          templateType: 'ready',
          signatureMode: 'auto',
          teacherName: effectiveName,
          supervisorName: activeComplex?.supervisorTeacherName || effectiveName,
          dateArabic: new Date().toLocaleDateString('ar-SA'),
          dateGregorian: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          createdByName: effectiveName,
        });
      }

      pdf.save(`شهادات_مجمعة_${compName.replace(/\s+/g, '_')}_${studentsToPrint.length}.pdf`);

      if (onSaveCertificates && issuedList.length > 0) {
        await onSaveCertificates(issuedList);
      } else if (onSaveCertificate && issuedList.length > 0) {
        for (const c of issuedList) {
          await onSaveCertificate(c);
        }
      }

      confetti({ particleCount: 70, spread: 60 });
      showToast(`تم بنجاح تصدير الملف المجمع (${studentsToPrint.length} شهادة) وحفظها بالأرشيف! 🎉`);
    } catch (err: any) {
      console.error('Error exporting merged certificates:', err);
      showToast('تعذر دمج وتصدير الشهادات: ' + (err?.message || ''));
    } finally {
      setIsExportingCertificates(false);
    }
  };

  // Save Custom AI Certificate Template (Not counted towards 5 templates quota)
  const handleSaveCustomAiTemplate = async (
    msgId: string,
    name: string,
    title: string,
    occasionText: string,
    bgStyle: 'royal_emerald' | 'golden_honor' | 'islamic_classic' | 'blue_modern'
  ) => {
    if (!name.trim()) {
      showToast('يرجى كتابة اسم النموذج');
      return;
    }
    try {
      const compName = activeComplex?.name || 'المجمع القرآني';
      const canvas = await renderCertificateCanvasForStudent(
        'اسم الطالب المكرّم',
        title,
        occasionText,
        bgStyle === 'golden_honor' ? 'platform_golden_honor' : bgStyle === 'islamic_classic' ? 'platform_islamic_classic' : bgStyle === 'blue_modern' ? 'platform_blue_modern' : 'platform_emerald_royal',
        compName,
        'الحلقة النموذجية'
      );
      const imageUrl = canvas.toDataURL('image/jpeg', 0.85);

      const newTemplate: CustomCertificateTemplate = {
        id: `tpl_ai_${Date.now()}`,
        complexId: activeComplex?.id,
        name: name.trim(),
        title: title.trim(),
        occasionText: occasionText.trim(),
        bgStyle,
        isPlatformAiTemplate: true, // EXEMPT FROM 5 QUOTA!
        imageUrl,
        studentNamePosition: {
          x: 50,
          y: 48,
          fontSize: 32,
          fontFamily: 'Cairo',
          color: '#fbbf24',
          textAlign: 'center',
          fontWeight: 'bold',
          maxWidth: 80,
        },
        showDate: true,
        datePosition: {
          x: 82,
          y: 88,
          fontSize: 14,
          fontFamily: 'Cairo',
          color: '#cbd5e1',
          textAlign: 'right',
        },
        createdByTeacherName: effectiveName,
        createdAt: new Date().toISOString(),
      };

      if (activeComplex) {
        const existingCustom = activeComplex.customCertificateTemplates || [];
        const updatedComplex: QuranComplex = {
          ...activeComplex,
          customCertificateTemplates: [newTemplate, ...existingCustom.filter(t => t.id !== newTemplate.id)],
        };

        if (onSaveComplex) {
          await onSaveComplex(updatedComplex);
        } else {
          await OmranDataService.saveComplex(updatedComplex);
        }
      }

      try {
        const storedLocal = localStorage.getItem('omran_certificates_templates');
        const list = storedLocal ? JSON.parse(storedLocal) : [];
        const mergedLocal = [newTemplate, ...list.filter((t: any) => t.id !== newTemplate.id)];
        localStorage.setItem('omran_certificates_templates', JSON.stringify(mergedLocal));
      } catch {}

      confetti({ particleCount: 60, spread: 50 });
      showToast(`تم بنجاح اعتماد قالب (${name.trim()}) لمجمعكم دون احتسابه من الـ 5 نماذج! 🎨`);

      const confirmMsg: ChatMessage = {
        id: `ai_tpl_confirm_${Date.now()}`,
        sender: 'assistant',
        text: `🎨 تم بنجاح حفظ واعتماد **${name.trim()}** ضمن قوالب مجمعكم الخاصة! هذا القالب محمي ومخصص لمجمعك فقط ولا يُحتسب ضمن النماذج الـ 5 المرفوعة، ويمكنك استخدامه فوراً في صنع الشهادات.`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => {
        const next = [...prev, confirmMsg];
        saveSessionMessages(next, activeSessionId);
        return next;
      });
    } catch (err: any) {
      console.error('Failed to save AI certificate template:', err);
      showToast('تعذر حفظ القالب: ' + (err?.message || ''));
    }
  };

  // Quick Save Recitation Evaluation
  const handleSaveEvaluationEdit = async (
    student: Student,
    newMem: string,
    rev: string,
    notes: string,
    tomNew: string,
    tomRev: string,
    tomNote: string
  ) => {
    if (!onSaveEvaluation) {
      showToast('دالة حفظ التقييم غير متاحة');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedEval: StudentEvaluation = {
        id: `eval_${Date.now()}_${student.id}`,
        studentId: student.id,
        studentName: student.name,
        date: today,
        attendanceStatus: 'حاضر',
        pointsAwarded: 15,
        criteriaScores: {},
        generalNotes: notes,
        recitationDetails: {
          newMemorizationAchieved: newMem,
          reviewAchieved: rev,
          teacherNotes: notes,
          tomorrowNewItem: tomNew ? {
            id: `rec-new-${Date.now()}`,
            type: 'new' as const,
            surahNumber: (student as any).currentSurahNumber || 1,
            surahName: tomNew,
            fromAyah: 1,
            toAyah: 10,
          } : undefined,
          tomorrowReviewItem: tomRev ? {
            id: `rec-rev-${Date.now()}`,
            type: 'review' as const,
            surahNumber: 1,
            surahName: tomRev,
            fromAyah: 1,
            toAyah: 10,
          } : undefined,
          tomorrowDailyNote: tomNote,
        },
      };

      await onSaveEvaluation(updatedEval);
      confetti({ particleCount: 50, spread: 50 });
      showToast(`تم تحديث وحفظ تقييم الطالب ${student.name} بنجاح ✓`);
      setEditingEvalStudent(null);

      const confirmMsg: ChatMessage = {
        id: `ai_eval_saved_${Date.now()}`,
        sender: 'assistant',
        text: `تم بنجاح تحديث واعتماد سجل تسميع وتقييم الطالب **${student.name}** لليوم، وتثبيت مقرر الغد (${tomNew || 'حسب الورد المعتمد'}).`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => {
        const next = [...prev, confirmMsg];
        saveSessionMessages(next, activeSessionId);
        return next;
      });
    } catch (err: any) {
      console.error('Error saving evaluation edit:', err);
      showToast('تعذر حفظ التقييم: ' + (err?.message || ''));
    }
  };

  // Quick Action Buttons
  const quickActions = [
    { label: '📜 صنع شهادات تكريم', query: 'اعملي شهادة تكريم للمتفوقين' },
    { label: '📊 رسم وتشخيص بياني', query: 'اعرض لي رسم بياني وتشخيص بياني شامل للمجمع' },
    { label: '🎨 إنشاء قالب شهادة', query: 'اعملي قالب جديد للشهادات واكتب فيه شكر وتقدير' },
    { label: '🎧 تقييم وتسميع اليوم', query: 'ماذا سمع الطلاب اليوم وما هو مقرر الغد؟' },
    { label: '🥇 كشف أول 5 بالنقاط', query: 'اعمل لي كشف لأول خمس طلاب في النقاط' },
    { label: '⚠️ كشف الطلاب الأقل نقاطاً', query: 'اعمل لي كشف أسوأ الطلاب في النقاط الأكثر حاجة للمتابعة' },
    { label: '🚨 كشف التنبيهات والمخالفات', query: 'اعمل لي كشف الطلاب اللي عليهم تنبيهات ومخالفات' },
    { label: '📋 كشف الحضور والغياب', query: 'اعرض لي كشف الحضور والغياب اليومي' },
    { label: '📖 وين وصلوا في الحفظ؟', query: 'وين وصلوا في الحفظ؟ اعطني كشف مستويات حفظ الطلاب' },
    { label: '➕ تسجيل طالب جديد', query: 'أريد تسجيل طالب جديد' },
  ];

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* 1. Floating Circular Button: Circular Mushaf Design  */}
      {/* ---------------------------------------------------- */}
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          left: `${bubblePosition.x}px`,
          top: `${bubblePosition.y}px`,
          zIndex: 99999,
          touchAction: isDraggingBubble ? 'none' : 'auto',
        }}
        className="select-none"
      >
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onPointerDown={handleBubblePointerDown}
          onPointerMove={handleBubblePointerMove}
          onPointerUp={handleBubblePointerUp}
          onClick={(e) => {
            e.stopPropagation();
            if (dragDistRef.current <= 8 && !isActualDragRef.current) {
              handleToggleOpen();
            }
            dragDistRef.current = 0;
            isActualDragRef.current = false;
          }}
          style={{
            background: `radial-gradient(circle at 30% 30%, ${accentColor} 0%, ${secondaryColor} 65%, ${primaryColor} 100%)`,
            boxShadow: `0 10px 30px -4px rgba(0, 0, 0, 0.7), 0 0 22px 3px ${accentColor}50`,
            border: `2.5px solid ${accentColor}`,
          }}
          className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow ${
            isDraggingBubble ? 'scale-110 shadow-2xl' : ''
          }`}
          title="المساعد القرآني الذكي (AI) - اسحب للتحريك أو انقر للفتح"
        >
          {/* Subtle Outer Glowing Spinner Ring */}
          <div
            style={{ borderColor: accentColor }}
            className="absolute inset-[-4px] rounded-full border border-dashed opacity-75 animate-[spin_20s_linear_infinite] pointer-events-none"
          />

          {/* Intricate Quran Mushaf Emblem */}
          <div className="relative flex flex-col items-center justify-center text-white pointer-events-none">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-amber-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
          </div>

          {/* Button label is purely "AI" without any extra text */}
          <div
            style={{
              backgroundColor: primaryColor,
              color: accentColor,
              borderColor: accentColor,
            }}
            className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg flex items-center gap-0.5 pointer-events-none"
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            <span>AI</span>
          </div>

          {/* Subtle Drag Handle Dot Indicator */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-60 group-hover:opacity-100 pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-amber-200" />
            <div className="w-1 h-1 rounded-full bg-amber-200" />
          </div>
        </motion.div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Floating & Draggable Chat Window With Spring Animation */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="quran-ai-floating-window"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 25 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            dir="rtl"
            style={{
              position: 'fixed',
              left: isExpanded ? '0' : (typeof window !== 'undefined' && window.innerWidth < 640 ? '10px' : `${chatPosition.x}px`),
              top: isExpanded ? '0' : (typeof window !== 'undefined' && window.innerWidth < 640 ? '16px' : `${chatPosition.y}px`),
              zIndex: 100000,
              touchAction: isDraggingChat ? 'none' : 'auto',
            }}
            className={`select-text ${
              isExpanded ? 'w-screen h-screen' : 'w-[95vw] sm:w-[520px] h-[85vh] sm:h-[640px] max-h-[95vh]'
            }`}
          >
            {/* Animated Card Container strictly styled in platform theme */}
            <div
              style={{
                backgroundColor: backgroundColor,
                borderColor: `${accentColor}80`,
                boxShadow: `0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 30px 2px ${accentColor}25`,
              }}
              className={`w-full h-full flex flex-col border-2 overflow-hidden ${
                isExpanded ? 'rounded-none' : 'rounded-3xl'
              }`}
            >
              {/* Draggable Header */}
              <div
                onPointerDown={handleChatHeaderPointerDown}
                onPointerMove={handleChatHeaderPointerMove}
                onPointerUp={handleChatHeaderPointerUp}
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  borderBottomColor: `${accentColor}50`,
                }}
                className={`p-3.5 sm:p-4 border-b flex items-center justify-between gap-2 shrink-0 select-none ${
                  isExpanded ? '' : 'cursor-grab active:cursor-grabbing'
                }`}
                title={isExpanded ? '' : 'اسحب من هنا لتحريك نافذة الشات في أي مكان بالصفحة'}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      backgroundColor: `${accentColor}25`,
                      borderColor: accentColor,
                    }}
                    className="w-10 h-10 rounded-full border flex items-center justify-center shadow-inner shrink-0"
                  >
                    <BookOpen className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-amber-100 flex items-center gap-1.5 truncate">
                        <span>المساعد القرآني الذكي</span>
                        <span
                          style={{
                            backgroundColor: `${accentColor}30`,
                            color: accentColor,
                            borderColor: `${accentColor}80`,
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded-md border font-black uppercase"
                        >
                          AI
                        </span>
                      </h3>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 flex items-center gap-1 truncate">
                      <span>حياك الله يا {userFirstName}</span>
                      <span className="text-amber-300 font-bold truncate">
                        ({isDeveloper ? 'المبرمج والمشرف العام' : isSupervisor ? 'مشرف المجمع' : 'معلم الحلقة'})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons & Drag Indicator */}
                <div className="flex items-center gap-1 shrink-0">
                  {!isExpanded && (
                    <div
                      className="hidden sm:flex items-center text-amber-200/60 hover:text-amber-200 px-1"
                      title="اسحب النافذة"
                    >
                      <GripHorizontal className="w-4 h-4" />
                    </div>
                  )}

                  {/* Clear/Delete Current Chat Button */}
                  <button
                    onClick={() => setShowCurrentChatClearConfirm(prev => !prev)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-red-300/80 hover:text-red-200 border border-transparent transition-all cursor-pointer"
                    title="مسح المحادثة الحالية والبدء من جديد"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* History Drawer Toggle */}
                  <button
                    onClick={() => setIsHistoryOpen(prev => !prev)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isHistoryOpen
                        ? 'bg-amber-400/25 text-amber-300 border-amber-400'
                        : 'hover:bg-white/10 text-emerald-200 border-transparent'
                    }`}
                    title="سجل المحادثات السابقة"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* New Chat Button */}
                  <button
                    onClick={handleStartNewChat}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-200 border border-transparent transition-all cursor-pointer"
                    title="بدء محادثة جديدة"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Expand / Minimize Window */}
                  <button
                    onClick={() => setIsExpanded(prev => !prev)}
                    className="hidden sm:inline-flex p-1.5 rounded-lg hover:bg-white/10 text-emerald-200 border border-transparent transition-all cursor-pointer"
                    title={isExpanded ? 'تصغير النافذة' : 'تكبير النافذة'}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-red-500/25 text-red-300 border border-transparent transition-all cursor-pointer"
                    title="إغلاق النافذة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* In-UI Confirmation: Clear Current Chat */}
              {showCurrentChatClearConfirm && (
                <div className="bg-red-950/95 border-b border-red-800 p-2.5 flex items-center justify-between text-xs text-red-100">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>هل تريد مسح هذه المحادثة الحالية؟</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleClearCurrentChat}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold cursor-pointer"
                    >
                      نعم، امسحها
                    </button>
                    <button
                      onClick={() => setShowCurrentChatClearConfirm(false)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Notification Toast */}
              {notificationToast && (
                <div
                  style={{
                    backgroundColor: accentColor,
                    color: primaryColor,
                  }}
                  className="py-1 px-4 text-xs font-bold text-center shadow"
                >
                  {notificationToast}
                </div>
              )}

              {/* Main Content Area */}
              <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden bg-black/25">
                {/* History Drawer Overlay */}
                {isHistoryOpen && (
                  <div
                    style={{ backgroundColor: `${primaryColor}F8` }}
                    className="absolute inset-0 z-30 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80 mb-3">
                      <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        المحادثات السابقة ({sessions.length})
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {sessions.length > 0 && !showClearAllConfirm && (
                          <button
                            onClick={() => setShowClearAllConfirm(true)}
                            className="text-[11px] text-red-300 hover:text-red-100 px-2.5 py-1 rounded bg-red-950/80 border border-red-800/80 cursor-pointer transition-colors"
                            title="حذف جميع المحادثات نهائياً"
                          >
                            مسح الكل
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setIsHistoryOpen(false);
                            setShowClearAllConfirm(false);
                          }}
                          className="text-xs text-emerald-300 hover:text-white px-2 py-0.5 rounded bg-white/10 cursor-pointer"
                        >
                          إغلاق
                        </button>
                      </div>
                    </div>

                    {showClearAllConfirm && (
                      <div className="mb-3 p-2.5 rounded-xl bg-red-950/90 border border-red-700 text-xs text-red-100 flex items-center justify-between gap-2">
                        <span>تأكيد مسح كافة المحادثات السابقة؟</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleConfirmClearAllSessions}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold cursor-pointer"
                          >
                            نعم، احذف الكل
                          </button>
                          <button
                            onClick={() => setShowClearAllConfirm(false)}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer"
                          >
                            تراجع
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {sessions.length === 0 ? (
                        <div className="text-center py-14 text-emerald-400/60 text-xs space-y-1">
                          <p className="font-semibold text-emerald-300/80">لا توجد محادثات سابقة محفوظة</p>
                          <p>كل محادثة تجريها مع المساعد ستُحفظ هنا تلقائياً لترجع إليها متى شئت.</p>
                        </div>
                      ) : (
                        sessions.map(s => (
                          <div
                            key={s.id}
                            onClick={() => handleSelectSession(s)}
                            style={{
                              borderColor: s.id === activeSessionId ? accentColor : `${accentColor}30`,
                              backgroundColor: s.id === activeSessionId ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
                            }}
                            className="p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all hover:bg-white/10"
                          >
                            <div className="truncate flex-1">
                              <p className="font-semibold text-emerald-100 truncate">{s.title || 'محادثة سابقة'}</p>
                              <span className="text-[10px] text-emerald-400/70">
                                {new Date(s.updatedAt).toLocaleDateString('ar-SA')} • {s.messages.length} رسائل
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={e => handleDeleteSession(s.id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-500/25 text-red-300/80 hover:text-red-200 transition-colors cursor-pointer"
                              title="حذف هذه المحادثة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={handleStartNewChat}
                      style={{ backgroundColor: accentColor, color: primaryColor }}
                      className="mt-3 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:brightness-110 active:scale-98 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      بدء محادثة جديدة
                    </button>
                  </div>
                )}

                {/* Messages Scroll View */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}
                    >
                      {/* Message Bubble Styled Strictly In Platform Theme */}
                      <div
                        style={{
                          backgroundColor:
                            msg.sender === 'user'
                              ? `${secondaryColor}`
                              : `${cardColor}`,
                          borderColor:
                            msg.sender === 'user'
                              ? `${accentColor}60`
                              : `${accentColor}70`,
                          boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4)`,
                        }}
                        className={`max-w-[92%] sm:max-w-[88%] p-3.5 rounded-2xl border text-xs sm:text-sm text-emerald-50 leading-relaxed whitespace-pre-wrap ${
                          msg.sender === 'user'
                            ? 'rounded-tr-xs'
                            : 'rounded-tl-xs'
                        }`}
                      >
                        {/* Bubble Header */}
                        <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-white/10 text-[11px] font-bold">
                          {msg.sender === 'user' ? (
                            <span className="flex items-center gap-1" style={{ color: accentColor }}>
                              <User className="w-3.5 h-3.5" />
                              <span>{userFirstName}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5" style={{ color: accentColor }}>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>المساعد القرآني الذكي</span>
                            </span>
                          )}
                          <span className="text-[10px] text-emerald-200/60 font-normal">
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Text Body */}
                        <div className="text-white/95 leading-normal">{msg.text}</div>

                        {/* ---------------------------------------------------- */}
                        {/* 1. Interactive Student Registration Survey Card      */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_REGISTRATION_SURVEY' && (
                          <div
                            ref={() => initSurveyForm(msg.id, msg.action?.data)}
                            style={{
                              backgroundColor: `${primaryColor}F0`,
                              borderColor: accentColor,
                            }}
                            className="mt-3 p-3 rounded-xl border border-dashed text-xs text-emerald-100 space-y-2.5"
                          >
                            <div className="flex items-center gap-1.5 font-bold border-b border-emerald-800 pb-1.5" style={{ color: accentColor }}>
                              <Users className="w-4 h-4" />
                              <span>استبيان تسجيل طالب جديد في المنظومة</span>
                            </div>

                            {surveyFormData[msg.id]?.isSuccess ? (
                              <div className="bg-emerald-950/90 p-2.5 rounded-lg border border-emerald-500/60 text-emerald-200 text-center font-bold flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                تم تسجيل الطالب بنجاح!
                              </div>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-[11px] text-emerald-300 mb-1">
                                    اسم الطالب الرباعي (إلزامي):
                                  </label>
                                  <input
                                    type="text"
                                    value={surveyFormData[msg.id]?.name || ''}
                                    onChange={e =>
                                      setSurveyFormData(prev => ({
                                        ...prev,
                                        [msg.id]: { ...prev[msg.id], name: e.target.value, validationError: undefined },
                                      }))
                                    }
                                    placeholder="مثال: محمد أحمد علي القرشي"
                                    className="w-full bg-black/45 border border-emerald-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-emerald-600 focus:outline-none"
                                    style={{ borderColor: `${accentColor}50` }}
                                  />
                                  <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
                                    * يُشترط أن يكون الاسم رباعياً وغير متكرر في المنظومة.
                                  </span>
                                </div>

                                {surveyFormData[msg.id]?.validationError && (
                                  <div className="p-2 rounded-lg bg-red-950/90 border border-red-700 text-red-200 text-[11px] leading-tight">
                                    {surveyFormData[msg.id].validationError}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[11px] text-emerald-300 mb-1">
                                      كلمة المرور:
                                    </label>
                                    <input
                                      type="text"
                                      value={surveyFormData[msg.id]?.password || '123'}
                                      onChange={e =>
                                        setSurveyFormData(prev => ({
                                          ...prev,
                                          [msg.id]: { ...prev[msg.id], password: e.target.value },
                                        }))
                                      }
                                      className="w-full bg-black/45 border rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none"
                                      style={{ borderColor: `${accentColor}50` }}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] text-emerald-300 mb-1">
                                      المستوى:
                                    </label>
                                    <select
                                      value={surveyFormData[msg.id]?.level || 'متوسط'}
                                      onChange={e =>
                                        setSurveyFormData(prev => ({
                                          ...prev,
                                          [msg.id]: {
                                            ...prev[msg.id],
                                            level: e.target.value as any,
                                          },
                                        }))
                                      }
                                      className="w-full bg-black/45 border border-emerald-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                    >
                                      <option value="مبتدئ">مبتدئ</option>
                                      <option value="متوسط">متوسط</option>
                                      <option value="متقدم">متقدم</option>
                                      <option value="خاتم">خاتم</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] text-emerald-300 mb-1">
                                    الحلقة المراد إلحاقه بها:
                                  </label>
                                  <select
                                    value={surveyFormData[msg.id]?.halaqahId || (halaqahs[0]?.id || '')}
                                    onChange={e =>
                                      setSurveyFormData(prev => ({
                                        ...prev,
                                        [msg.id]: {
                                          ...prev[msg.id],
                                          halaqahId: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-black/45 border border-emerald-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                  >
                                    {halaqahs.map(h => (
                                      <option key={h.id} value={h.id}>
                                        {h.name} {h.teacherName ? `(المعلم: ${h.teacherName})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    !surveyFormData[msg.id]?.name?.trim() ||
                                    surveyFormData[msg.id]?.isSubmitting
                                  }
                                  onClick={() => handleSurveySubmit(msg.id)}
                                  style={{
                                    backgroundColor: accentColor,
                                    color: primaryColor,
                                  }}
                                  className="w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow hover:brightness-110 disabled:opacity-50 transition-all"
                                >
                                  {surveyFormData[msg.id]?.isSubmitting ? (
                                    <span>جارٍ التحقق والاعتماد...</span>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>اعتماد وإضافة الطالب للمنظومة الآن</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 2. Organized Data Table (With PDF, Sheets, Library & Charts) */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_DATA_TABLE' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}FA`,
                              borderColor: `${accentColor}80`,
                            }}
                            className="mt-3 rounded-xl border text-xs text-emerald-100 overflow-hidden shadow-lg"
                          >
                            {/* Table Action Toolbar */}
                            <div className="p-2.5 bg-black/50 border-b border-emerald-800 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold flex items-center gap-1.5 text-amber-200">
                                  <TableIcon className="w-4 h-4 text-amber-300" />
                                  <span>{msg.action.title || 'كشف البيانات المنظم'}</span>
                                </span>

                                {/* Mode Switcher (Table vs Chart) */}
                                <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-emerald-800/80">
                                  <button
                                    type="button"
                                    onClick={() => setTableViewModes(prev => ({ ...prev, [msg.id]: 'table' }))}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                      (tableViewModes[msg.id] || 'table') === 'table'
                                        ? 'bg-amber-400/25 text-amber-300 border border-amber-400/60 shadow-sm'
                                        : 'text-emerald-300/70 hover:text-emerald-200'
                                    }`}
                                    title="عرض كجدول منظم"
                                  >
                                    <TableIcon className="w-3 h-3" />
                                    <span>الجدول</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTableViewModes(prev => ({ ...prev, [msg.id]: 'chart' }))}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                      tableViewModes[msg.id] === 'chart'
                                        ? 'bg-amber-400/25 text-amber-300 border border-amber-400/60 shadow-sm'
                                        : 'text-emerald-300/70 hover:text-emerald-200'
                                    }`}
                                    title="عرض الرسوم البيانية والإحصائية"
                                  >
                                    <BarChart3 className="w-3 h-3" />
                                    <span>رسم بياني</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Export PDF */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleExportPDF(
                                      msg.action?.title || 'تقرير',
                                      msg.action?.tableType || 'general',
                                      msg.action?.data?.students || msg.action?.data?.rows || []
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-red-950/90 hover:bg-red-900 border border-red-600/80 text-red-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                                  title="استخراج وطباعة كـ PDF جميل"
                                >
                                  <FileText className="w-3.5 h-3.5 text-red-300" />
                                  <span>استخراج كـ PDF</span>
                                </button>

                                {/* Export Google Sheets / CSV */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleExportGoogleSheets(
                                      msg.action?.title || 'تقرير',
                                      msg.action?.tableType || 'general',
                                      msg.action?.data?.students || msg.action?.data?.rows || []
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/80 text-emerald-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                                  title="استخراج كـ Google Sheets أو Excel"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>جوجل شيت / Excel</span>
                                </button>

                                {/* Save in Library */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveToLibrary(
                                      msg.action?.title || 'تقرير',
                                      msg.action?.tableType || 'general',
                                      msg.action?.data?.students || msg.action?.data?.rows || [],
                                      msg.id
                                    )
                                  }
                                  style={{
                                    backgroundColor: savedLibraryReports.has(`lib_${msg.id}`) ? `${accentColor}30` : 'rgba(255,255,255,0.08)',
                                    borderColor: accentColor,
                                    color: accentColor,
                                  }}
                                  className="px-2.5 py-1 rounded border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                                  title="حفظ التقرير في مكتبة المنصة"
                                >
                                  {savedLibraryReports.has(`lib_${msg.id}`) ? (
                                    <>
                                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-300" />
                                      <span>محفوظ بالمكتبة ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="w-3.5 h-3.5 text-amber-300" />
                                      <span>حفظ في المكتبة</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Summary strip */}
                            {msg.action.tableType === 'attendance' ? (
                              <div className="px-3 py-1.5 bg-black/35 border-b border-emerald-900/60 flex flex-wrap items-center justify-between text-[11px] text-emerald-200">
                                <span>الحلقة: <strong className="text-amber-200">{msg.action.data?.halaqahName || 'كافة الحلقات'}</strong></span>
                                <div className="flex items-center gap-2.5 font-bold">
                                  <span className="text-emerald-300">🟢 {msg.action.data?.presentCount || 0} حاضر</span>
                                  <span className="text-red-300">🔴 {msg.action.data?.absentCount || 0} غائب</span>
                                  <span className="text-amber-300">🟡 {msg.action.data?.excusedCount || 0} معتذر</span>
                                  {(msg.action.data?.lateCount || 0) > 0 && <span className="text-blue-300">🔵 {msg.action.data.lateCount} متأخر</span>}
                                </div>
                              </div>
                            ) : (
                              <div className="px-3 py-1.5 bg-black/35 border-b border-emerald-900/60 flex flex-wrap items-center justify-between text-[11px] text-emerald-200">
                                <span>المجمع: <strong className="text-amber-200">{msg.action.data?.complexName || 'مجمع النور'}</strong></span>
                                <span className="font-bold text-amber-300">إجمالي طلاب الكشف: {msg.action.data?.totalStudents || (msg.action.data?.students?.length || 0)} طالب</span>
                              </div>
                            )}

                            {/* 1. Table View */}
                            {(tableViewModes[msg.id] || 'table') === 'table' ? (
                              <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-right border-collapse text-[11px]">
                                  <thead>
                                    <tr className="bg-black/60 text-amber-200 border-b border-emerald-800 sticky top-0 z-10">
                                      {msg.action.tableType === 'violations' ? (
                                        <>
                                          <th className="p-2">#</th>
                                          <th className="p-2">اسم الطالب</th>
                                          <th className="p-2">الحلقة</th>
                                          <th className="p-2">نوع التنبيه / المخالفة</th>
                                          <th className="p-2">الإجراء المتخذ</th>
                                          <th className="p-2 text-center">التاريخ</th>
                                          <th className="p-2 text-center">الخصم</th>
                                          <th className="p-2">ملاحظات</th>
                                        </>
                                      ) : msg.action.tableType === 'recitation_archive' ? (
                                        <>
                                          <th className="p-2 text-center">#</th>
                                          <th className="p-2">اسم الطالب</th>
                                          <th className="p-2">الحلقة</th>
                                          <th className="p-2">ما سمعه (حفظ جديد)</th>
                                          <th className="p-2 text-center">الأوجه المسمعة</th>
                                          <th className="p-2">المراجعة والتثبيت</th>
                                          <th className="p-2">ملاحظات المعلم</th>
                                          <th className="p-2 text-center">النقاط</th>
                                        </>
                                      ) : msg.action.tableType === 'custom_students_progress' || msg.action.tableType === 'students_comparison' ? (
                                        <>
                                          <th className="p-2 text-center">#</th>
                                          <th className="p-2">اسم الطالب</th>
                                          <th className="p-2">الحلقة</th>
                                          <th className="p-2">موضع الحفظ الحالي</th>
                                          <th className="p-2 text-center">الأوجه المسمعة</th>
                                          <th className="p-2 text-center">نسبة الحضور</th>
                                          <th className="p-2 text-center">أيام الحضور / الغياب</th>
                                          <th className="p-2 text-center">النقاط</th>
                                        </>
                                      ) : msg.action.tableType === 'teachers' ? (
                                        <>
                                          <th className="p-2 text-center">#</th>
                                          <th className="p-2">اسم المعلم / الشيخ</th>
                                          <th className="p-2">الحلقة المسندة</th>
                                          <th className="p-2">المسمى والصفة</th>
                                          <th className="p-2 text-center">رقم الهاتف</th>
                                          <th className="p-2 text-center">الحالة</th>
                                        </>
                                      ) : msg.action.tableType === 'attendance' ? (
                                        <>
                                          <th className="p-2">#</th>
                                          <th className="p-2">اسم الطالب</th>
                                          <th className="p-2">الحلقة</th>
                                          <th className="p-2 text-center">حالة الحضور</th>
                                          <th className="p-2">السورة الحالية</th>
                                        </>
                                      ) : msg.action.tableType === 'top_points' || msg.action.tableType === 'low_points' || msg.action.tableType === 'points' ? (
                                        <>
                                          <th className="p-2 text-center">المركز</th>
                                          <th className="p-2">اسم الطالب</th>
                                          <th className="p-2">الحلقة</th>
                                          <th className="p-2 text-center">المستوى</th>
                                          <th className="p-2">السورة الحالية</th>
                                          <th className="p-2">الورد اليومي</th>
                                          <th className="p-2 text-center">النقاط</th>
                                        </>
                                      ) : (
                                        <>
                                          <th className="p-2">#</th>
                                          <th className="p-2">اسم الطالب</th>
                                          <th className="p-2">الحلقة</th>
                                          <th className="p-2 text-center">المستوى</th>
                                          <th className="p-2">السورة الحالية</th>
                                          <th className="p-2">الورد اليومي</th>
                                          <th className="p-2 text-center">النقاط</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(msg.action.data?.students || msg.action.data?.rows || []).map((s: any, idx: number) => (
                                      <tr
                                        key={s.id || idx}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                      >
                                        {msg.action?.tableType === 'violations' ? (
                                          <>
                                            <td className="p-2 text-emerald-400/80 font-bold">{idx + 1}</td>
                                            <td className="p-2 font-bold text-white">{s.name}</td>
                                            <td className="p-2 text-emerald-200/90">{s.halaqahName}</td>
                                            <td className="p-2">
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-600/60">
                                                {s.violationType || 'تنبيه'}
                                              </span>
                                            </td>
                                            <td className="p-2 text-emerald-300">{s.actionTaken || '-'}</td>
                                            <td className="p-2 text-center text-slate-300">{s.date || '-'}</td>
                                            <td className="p-2 text-center font-bold text-red-300">
                                              {s.pointsDeducted ? `-${s.pointsDeducted}` : '0'}
                                            </td>
                                            <td className="p-2 text-slate-300 truncate max-w-[120px]">{s.notes || '-'}</td>
                                          </>
                                        ) : msg.action?.tableType === 'recitation_archive' ? (
                                          <>
                                            <td className="p-2 text-emerald-400 font-bold text-center">{idx + 1}</td>
                                            <td className="p-2 font-bold text-white">{s.studentName || s.name}</td>
                                            <td className="p-2 text-emerald-200/90">{s.halaqahName}</td>
                                            <td className="p-2 text-white font-medium">{s.newMemorization || '-'}</td>
                                            <td className="p-2 text-center">
                                              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] border border-amber-400/40">
                                                {s.facesLabel || `${s.facesCount || 0} وجه`}
                                              </span>
                                            </td>
                                            <td className="p-2 text-emerald-300/90 truncate max-w-[130px]">{s.reviewAchieved || '-'}</td>
                                            <td className="p-2 text-slate-300 truncate max-w-[130px]">{s.teacherNotes || '-'}</td>
                                            <td className="p-2 text-center font-bold text-amber-300 font-mono">+{s.pointsEarned ?? s.totalPoints ?? 0}</td>
                                          </>
                                        ) : msg.action?.tableType === 'custom_students_progress' || msg.action?.tableType === 'students_comparison' ? (
                                          <>
                                            <td className="p-2 text-emerald-400 font-bold text-center">{idx + 1}</td>
                                            <td className="p-2 font-bold text-white">{s.name || s.studentName}</td>
                                            <td className="p-2 text-emerald-200/90">{s.halaqahName}</td>
                                            <td className="p-2 text-amber-200">{s.currentPosition || s.currentSurah || '-'}</td>
                                            <td className="p-2 text-center">
                                              <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 font-bold text-[10px] border border-emerald-600/50">
                                                {s.facesLabel || `${s.totalFaces ?? s.facesCount ?? 0} وجه`}
                                              </span>
                                            </td>
                                            <td className="p-2 text-center font-bold text-emerald-300">{s.attendanceRate || '100%'}</td>
                                            <td className="p-2 text-center text-[10px]">
                                              <span className="text-emerald-300 font-bold">🟢 {s.presentDays ?? '-'}</span> / <span className="text-red-300 font-bold">🔴 {s.absentDays ?? '-'}</span>
                                            </td>
                                            <td className="p-2 text-center font-bold text-amber-300 font-mono">{s.totalPoints ?? s.points ?? 0}</td>
                                          </>
                                        ) : msg.action?.tableType === 'attendance' ? (
                                          <>
                                            <td className="p-2 text-emerald-400/80 font-bold">{idx + 1}</td>
                                            <td className="p-2 font-bold text-white">{s.name}</td>
                                            <td className="p-2 text-emerald-200/90">{s.halaqahName}</td>
                                            <td className="p-2 text-center">
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                  s.status === 'حاضر'
                                                    ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/60'
                                                    : s.status === 'غائب'
                                                    ? 'bg-red-950/80 text-red-300 border border-red-600/60'
                                                    : s.status === 'معتذر'
                                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
                                                    : 'bg-gray-800 text-gray-300'
                                                }`}
                                              >
                                                {s.status}
                                              </span>
                                            </td>
                                            <td className="p-2 text-emerald-300">{s.currentSurah || '-'}</td>
                                          </>
                                        ) : msg.action?.tableType === 'top_points' || msg.action?.tableType === 'low_points' || msg.action?.tableType === 'points' ? (
                                          <>
                                            <td className="p-2 text-center font-black">
                                              {s.rank === 1 ? (
                                                <span className="text-amber-300 text-xs">🥇 1</span>
                                              ) : s.rank === 2 ? (
                                                <span className="text-slate-200 text-xs">🥈 2</span>
                                              ) : s.rank === 3 ? (
                                                <span className="text-amber-600 text-xs">🥉 3</span>
                                              ) : (
                                                <span className="text-emerald-400/90 font-mono">#{s.rank || idx + 1}</span>
                                              )}
                                            </td>
                                            <td className="p-2 font-bold text-white">{s.name}</td>
                                            <td className="p-2 text-emerald-200/90">{s.halaqahName}</td>
                                            <td className="p-2 text-center">
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-amber-300 border border-emerald-700/60 text-[10px] font-bold">
                                                {s.level || 'متوسط'}
                                              </span>
                                            </td>
                                            <td className="p-2 text-white font-medium">{s.currentSurah || '-'}</td>
                                            <td className="p-2 text-emerald-300">{s.dailyTarget || 'نصف وجه'}</td>
                                            <td className="p-2 text-center font-bold text-amber-300 font-mono">
                                              {s.totalPoints || 0}
                                            </td>
                                          </>
                                        ) : msg.action?.tableType === 'teachers' ? (
                                          <>
                                            <td className="p-2 text-emerald-400 font-bold text-center">{idx + 1}</td>
                                            <td className="p-2 font-bold text-white flex items-center gap-1.5">
                                              <span>👳‍♂️</span>
                                              <span>{s.name || s.teacherName}</span>
                                            </td>
                                            <td className="p-2 text-emerald-200/90">{s.halaqahName || 'الحلقة القرآنية'}</td>
                                            <td className="p-2 text-amber-200 text-xs">{s.title || s.role || 'معلم ومحفظ'}</td>
                                            <td className="p-2 text-center text-slate-300 font-mono text-xs">{s.phone || '-'}</td>
                                            <td className="p-2 text-center">
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                                                نشط ومفعل
                                              </span>
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="p-2 text-emerald-400/80 font-bold">{idx + 1}</td>
                                            <td className="p-2 font-bold text-white">{s.name}</td>
                                            <td className="p-2 text-emerald-200/90">{s.halaqahName}</td>
                                            <td className="p-2 text-center">
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-amber-300 border border-emerald-700/60 text-[10px] font-bold">
                                                {s.level || 'متوسط'}
                                              </span>
                                            </td>
                                            <td className="p-2 text-white font-medium">{s.currentSurah || '-'}</td>
                                            <td className="p-2 text-emerald-300">{s.dailyTarget || 'نصف وجه'}</td>
                                            <td className="p-2 text-center font-bold text-amber-300">{s.totalPoints || 0}</td>
                                          </>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* 2. Visual Graphical Charts View */
                              <div className="p-3 space-y-3 bg-black/25">
                                {msg.action.tableType === 'attendance' ? (
                                  <>
                                    {/* Attendance Percentage & Proportional Stacked Bar */}
                                    <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-800/80 space-y-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-amber-200 flex items-center gap-1.5">
                                          <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                                          <span>نسبة الحضور والالتزام اليومي</span>
                                        </span>
                                        <span className="font-black text-amber-300 text-sm">
                                          {(msg.action.data?.totalStudents || (msg.action.data?.students?.length || 0)) > 0
                                            ? Math.round(((msg.action.data?.presentCount || 0) / (msg.action.data?.totalStudents || msg.action.data?.students?.length || 1)) * 100)
                                            : 0}%
                                        </span>
                                      </div>

                                      {/* Stacked Proportional Bar Chart */}
                                      <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden flex shadow-inner">
                                        {(() => {
                                          const total = msg.action.data?.totalStudents || (msg.action.data?.students?.length || 1);
                                          const pPct = ((msg.action.data?.presentCount || 0) / total) * 100;
                                          const aPct = ((msg.action.data?.absentCount || 0) / total) * 100;
                                          const ePct = ((msg.action.data?.excusedCount || 0) / total) * 100;
                                          const lPct = ((msg.action.data?.lateCount || 0) / total) * 100;
                                          return (
                                            <>
                                              <div style={{ width: `${pPct}%` }} className="bg-emerald-500 h-full" title={`حاضر: ${msg.action.data?.presentCount || 0}`} />
                                              <div style={{ width: `${aPct}%` }} className="bg-red-500 h-full" title={`غائب: ${msg.action.data?.absentCount || 0}`} />
                                              <div style={{ width: `${ePct}%` }} className="bg-amber-500 h-full" title={`معتذر: ${msg.action.data?.excusedCount || 0}`} />
                                              <div style={{ width: `${lPct}%` }} className="bg-blue-500 h-full" title={`متأخر: ${msg.action.data?.lateCount || 0}`} />
                                            </>
                                          );
                                        })()}
                                      </div>

                                      {/* Legend */}
                                      <div className="flex flex-wrap items-center justify-between text-[10px] text-emerald-200/90 pt-1">
                                        <span className="flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                          حاضر ({msg.action.data?.presentCount || 0})
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-red-500" />
                                          غائب ({msg.action.data?.absentCount || 0})
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                                          معتذر ({msg.action.data?.excusedCount || 0})
                                        </span>
                                        {(msg.action.data?.lateCount || 0) > 0 && (
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            متأخر ({msg.action.data?.lateCount})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Cards breakdown */}
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-center">
                                        <span className="text-[10px] text-emerald-300 block">الحاضرون</span>
                                        <span className="text-base font-black text-emerald-100">{msg.action.data?.presentCount || 0}</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-red-950/80 border border-red-700/60 text-center">
                                        <span className="text-[10px] text-red-300 block">الغائبون</span>
                                        <span className="text-base font-black text-red-100">{msg.action.data?.absentCount || 0}</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-700/60 text-center">
                                        <span className="text-[10px] text-amber-300 block">المعتذرون</span>
                                        <span className="text-base font-black text-amber-100">{msg.action.data?.excusedCount || 0}</span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Memorization Progress & Level Breakdown Charts */}
                                    {(() => {
                                      const stList: any[] = msg.action.data?.students || [];
                                      const levelsCount: Record<string, number> = {
                                        خاتم: 0,
                                        متقدم: 0,
                                        متوسط: 0,
                                        مبتدئ: 0,
                                      };
                                      stList.forEach(s => {
                                        const lvl = s.level || 'متوسط';
                                        if (levelsCount[lvl] !== undefined) levelsCount[lvl]++;
                                        else levelsCount['متوسط']++;
                                      });
                                      const totalSt = stList.length || 1;

                                      // Top students by points
                                      const topSt = [...stList].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 3);

                                      return (
                                        <div className="space-y-2.5">
                                          {/* Level distribution horizontal bars */}
                                          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-800/80 space-y-2">
                                            <span className="font-bold text-amber-200 text-xs flex items-center gap-1.5">
                                              <PieChart className="w-3.5 h-3.5 text-amber-300" />
                                              <span>توزيع مستويات حفظ الطلاب</span>
                                            </span>
                                            {Object.entries(levelsCount).map(([lvl, count]) => {
                                              const pct = Math.round((count / totalSt) * 100);
                                              return (
                                                <div key={lvl} className="space-y-0.5">
                                                  <div className="flex justify-between text-[10px]">
                                                    <span className="text-emerald-200">{lvl}</span>
                                                    <span className="font-bold text-amber-300">{count} طلاب ({pct}%)</span>
                                                  </div>
                                                  <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden">
                                                    <div
                                                      style={{
                                                        width: `${pct}%`,
                                                        backgroundColor:
                                                          lvl === 'خاتم' ? '#fbbf24' : lvl === 'متقدم' ? '#34d399' : lvl === 'متوسط' ? '#60a5fa' : '#a78bfa',
                                                      }}
                                                      className="h-full rounded-full transition-all duration-500"
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Top Students Leaderboard */}
                                          {topSt.length > 0 && (
                                            <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-800/80 space-y-1.5">
                                              <span className="font-bold text-amber-200 text-xs flex items-center gap-1.5">
                                                <Award className="w-3.5 h-3.5 text-amber-300" />
                                                <span>أوائل الطلاب في النقاط والإنجاز</span>
                                              </span>
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                                {topSt.map((s, i) => (
                                                  <div key={s.id || i} className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/50 flex items-center justify-between text-[11px]">
                                                    <span className="font-bold text-white flex items-center gap-1">
                                                      <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                                      <span className="truncate max-w-[90px]">{s.name}</span>
                                                    </span>
                                                    <span className="font-mono font-bold text-amber-300">{s.totalPoints || 0} ن</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 3. Delete Student Confirmation Card                 */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'CONFIRM_DELETE_STUDENT' && (
                          <div className="mt-3 p-3 rounded-xl bg-red-950/90 border border-red-700 text-xs text-red-100 space-y-2.5 shadow-lg">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300 border-b border-red-800 pb-1.5">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>تأكيد طلب حذف طالب من المنظومة</span>
                            </div>
                            <p className="text-white text-[12px] leading-relaxed">
                              هل تؤكد حذف الطالب: <strong className="text-amber-300">{msg.action.data?.studentName}</strong> من حلقة ({msg.action.data?.halaqahName})؟
                            </p>
                            <p className="text-[11px] text-red-300/80">
                              * سيتم حذف كافة سجلات الطالب وتقييماته نهائياً من المنظومة.
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                disabled={actionInProgress === msg.action.data?.studentId}
                                onClick={() =>
                                  handleExecuteDeleteStudent(
                                    msg.action?.data?.studentId,
                                    msg.action?.data?.studentName
                                  )
                                }
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>نعم، احذف الطالب نهائياً</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessages(prev => [
                                    ...prev,
                                    {
                                      id: `ai_cancel_${Date.now()}`,
                                      sender: 'assistant',
                                      text: 'تم إلغاء إجراء الحذف بناءً على رغبتكم.',
                                      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                                    },
                                  ]);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>

                            {/* Role-specific Navigation Button to take user directly to exact student location */}
                            <div className="pt-1">
                              {isDeveloper ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onNavigateTab) {
                                      onNavigateTab('accounts', {
                                        studentId: msg.action.data?.studentId,
                                        subTab: 'students',
                                        searchQuery: msg.action.data?.studentName
                                      });
                                    }
                                    setIsOpen(false);
                                    setTimeout(() => {
                                      triggerComplexThemePulse(msg.action.data?.studentId);
                                    }, 120);
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>الانتقال لملف الطالب في قسم الحسابات وحذفه هناك ⚙️</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onNavigateTab) {
                                      onNavigateTab('students', {
                                        studentId: msg.action.data?.studentId,
                                        searchQuery: msg.action.data?.studentName
                                      });
                                    }
                                    setIsOpen(false);
                                    setTimeout(() => {
                                      triggerComplexThemePulse(msg.action.data?.studentId);
                                    }, 120);
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>الانتقال لتسجيل الطلاب وظهور نافذة الحذف والتأكيد مباشرة 📋</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 3. Direct Platform Navigation & Location Card       */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'NAVIGATE' && msg.action.data && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}`,
                            }}
                            className="mt-3 p-4 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl animate-fade-in"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                                  <ExternalLink className="w-4 h-4 text-amber-300" />
                                </div>
                                <div>
                                  <span className="font-bold text-amber-300 text-sm block">
                                    {msg.action.title || `الانتقال إلى ${msg.action.data?.tabName || 'القسم'}`}
                                  </span>
                                  <span className="text-[11px] text-emerald-300">
                                    رابط اختصار مباشر وموقع الشاشة بالمنظومة
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 text-[10px] font-bold border border-emerald-600/50">
                                موقع معتمد 📍
                              </span>
                            </div>

                            <p className="text-[11.5px] text-emerald-200 leading-relaxed">
                              {msg.action.data?.description || `يمكنك الانتقال فوراً إلى ${msg.action.data?.tabName || 'هذا القسم'} بنقرة واحدة أدناه:`}
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateTab && msg.action?.data?.tab) {
                                  onNavigateTab(msg.action.data.tab, msg.action.data.meta);
                                  setIsOpen(false);
                                }
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>الانتقال فوراً إلى {msg.action.data?.tabName || 'القسم'} 🚀</span>
                            </button>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 3.1 Universal Deletion Navigation & 3-Pulse Card    */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'NAVIGATE_TO_DELETE_ITEM' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}`,
                            }}
                            className="mt-3 p-4 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl animate-fade-in"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                                  <Trash2 className="w-4 h-4 text-amber-300" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-sm block text-white">
                                    {msg.action.title || 'الانتقال المباشر وتحديد العنصر للحذف'}
                                  </span>
                                  <span className="text-[10px] text-amber-300/90">
                                    {msg.action.data?.itemName} • قسم {msg.action.data?.tab === 'students' ? 'الطلاب' : msg.action.data?.tab === 'settings' ? 'الإعدادات والحلقات' : msg.action.data?.tab === 'library' ? 'المكتبة' : msg.action.data?.tab === 'certificates' ? 'الشهادات' : msg.action.data?.tab === 'teacher_attendance' ? 'حضور المعلمين' : msg.action.data?.tab === 'behavior' ? 'السلوك والمخالفات' : 'المنظومة'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                                اختصار مباشر
                              </span>
                            </div>

                            <p className="text-white text-[12px] leading-relaxed">
                              صيانةً لكتاب الله وبيانات حلقاته المباركة من أي محو عارض، تفضل بالانتقال المباشر لمراجعة وتأكيد حذف: <strong className="text-amber-300 font-bold">{msg.action.data?.itemName}</strong>.
                            </p>

                            <div className="p-2.5 rounded-xl bg-black/40 border border-amber-400/30 text-[11px] text-amber-200 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>
                                فور الضغط على الزر أدناه، <strong>سيُغلق الشات بهدوء ويومض العنصر 3 ومضات بألوان ثيم المجمع</strong> أمام عينيك مباشرة للتأكد من تحديده بدقة، ثم يهدأ الوميض.
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const targetTab = msg.action?.data?.tab || 'students';
                                const targetId = msg.action?.data?.highlightId || msg.action?.data?.itemId || msg.action?.data?.studentId;
                                if (onNavigateTab) {
                                  onNavigateTab(targetTab, {
                                    studentId: msg.action?.data?.studentId || targetId,
                                    initialStudentToDeleteId: targetId,
                                    highlightId: targetId,
                                    itemId: targetId,
                                    searchQuery: msg.action?.data?.searchQuery || msg.action?.data?.studentName,
                                    subTab: msg.action?.data?.subTab,
                                    action: 'delete'
                                  });
                                }
                                // Close the chat smoothly so the user sees the element right in front of their eyes!
                                setIsOpen(false);
                                setTimeout(() => {
                                  dispatchHighlightItem(targetId, msg.action?.data?.itemType);
                                  triggerComplexThemePulse(targetId);
                                }, 120);
                              }}
                              style={{
                                backgroundColor: accentColor,
                                color: primaryColor,
                              }}
                              className="w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>الانتقال لموضع العنصر الآن (ومضات بثيم المجمع) 🎯</span>
                            </button>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 3.2 Exact Student Points & Leaderboard Card         */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_STUDENT_POINTS' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}`,
                            }}
                            className="mt-3 p-4 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl animate-fade-in"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                                  <Award className="w-4 h-4 text-amber-300" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-sm block text-white">
                                    {msg.action.data?.studentName}
                                  </span>
                                  <span className="text-[10px] text-emerald-300/80">
                                    حلقة: {msg.action.data?.halaqahName} • رصيد لوحة الشرف المعتمد
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 font-black border border-amber-400/40">
                                لوحة الشرف
                              </span>
                            </div>

                            {/* Big Center Points Display */}
                            <div className="p-3.5 rounded-2xl bg-black/45 border border-amber-400/40 text-center space-y-1">
                              <span className="text-[11px] text-amber-200 font-bold block">إجمالي النقاط المعتمد الفعلي</span>
                              <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                                {msg.action.data?.points ?? 0} <span className="text-base font-sans font-bold text-emerald-200">نقطة</span>
                              </div>
                              <p className="text-[10px] text-emerald-200/80">
                                مطابق تماماً لما هو ظاهر في لوحة الشرف والصدارة دون أي زيادة أو تخمين
                              </p>
                            </div>

                            {/* Breakdown Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                              <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-700/50">
                                <span className="text-amber-300 font-black text-sm font-mono block">+{msg.action.data?.examPoints ?? 0}</span>
                                <span className="text-[10px] text-emerald-200">نقاط الاختبارات</span>
                              </div>
                              <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-700/50">
                                <span className="text-cyan-300 font-black text-sm font-mono block">+{msg.action.data?.evalPoints ?? 0}</span>
                                <span className="text-[10px] text-emerald-200">التسميع والمعايير</span>
                              </div>
                              <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-700/50">
                                <span className="text-teal-300 font-black text-sm font-mono block">+{msg.action.data?.listeningPoints ?? 0}</span>
                                <span className="text-[10px] text-emerald-200">جلسات الاستماع</span>
                              </div>
                              <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-700/50">
                                <span className={`font-black text-sm font-mono block ${(msg.action.data?.attendancePoints ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                  {(msg.action.data?.attendancePoints ?? 0) >= 0 ? `+${msg.action.data?.attendancePoints ?? 0}` : msg.action.data?.attendancePoints}
                                </span>
                                <span className="text-[10px] text-emerald-200">حضور وانضباط</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateTab) {
                                  onNavigateTab('leaderboard', {
                                    studentId: msg.action.data?.studentId,
                                    searchQuery: msg.action.data?.studentName,
                                    highlightId: msg.action.data?.studentId
                                  });
                                }
                                setIsOpen(false);
                                setTimeout(() => {
                                  triggerComplexThemePulse(msg.action.data?.studentId);
                                }, 120);
                              }}
                              style={{
                                backgroundColor: accentColor,
                                color: primaryColor,
                              }}
                              className="w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                            >
                              <Award className="w-4 h-4" />
                              <span>الانتقال إلى لوحة الشرف والصدارة وترتيب الطالب 🏆</span>
                            </button>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 3.3 Lifetime Recitation Journey & Best Month Card   */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_STUDENT_RECITATION_HISTORY' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}`,
                            }}
                            className="mt-3 p-4 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl animate-fade-in"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
                                  <BookOpen className="w-4 h-4 text-amber-300" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-sm block text-white">
                                    {msg.action.data?.studentName}
                                  </span>
                                  <span className="text-[10px] text-emerald-300/80">
                                    حلقة: {msg.action.data?.halaqahName} • السجل القرآني ومسيرة الحفظ
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 font-extrabold border border-emerald-400/30">
                                مسيرة التسميع الشاملة
                              </span>
                            </div>

                            {/* Big Lifetime Total Faces Metric */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                              <div className="p-3 rounded-xl bg-black/45 border border-amber-400/50 space-y-1 sm:col-span-1">
                                <span className="text-[10px] text-amber-200 font-bold block">إجمالي ما سمّعه طوال مسيرته</span>
                                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                                  {msg.action.data?.lifetimeTotalFaces ?? 0}
                                </div>
                                <span className="text-[10px] text-emerald-200 block">وجهاً معتمداً</span>
                              </div>

                              <div className="p-3 rounded-xl bg-black/40 border border-emerald-700/60 space-y-1 sm:col-span-2 grid grid-cols-3 gap-1 items-center">
                                <div>
                                  <span className="text-[10px] text-emerald-300 font-bold block">حفظ جديد</span>
                                  <div className="text-lg font-black text-white font-mono">{msg.action.data?.lifetimeNewFaces ?? 0}</div>
                                  <span className="text-[9px] text-slate-300">وجه</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-cyan-300 font-bold block">مراجعة وتثبيت</span>
                                  <div className="text-lg font-black text-white font-mono">{msg.action.data?.lifetimeReviewFaces ?? 0}</div>
                                  <span className="text-[9px] text-slate-300">وجه</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-amber-300 font-bold block">جلسات التسميع</span>
                                  <div className="text-lg font-black text-white font-mono">{msg.action.data?.lifetimeDaysCount ?? 0}</div>
                                  <span className="text-[9px] text-slate-300">يوماً</span>
                                </div>
                              </div>
                            </div>

                            {/* Best Month Display */}
                            {msg.action.data?.bestMonth && (
                              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-400/40 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                                  <div>
                                    <span className="font-bold text-amber-300 text-xs block">
                                      أعلى شهر سمّع فيه طوال مسيرته: {msg.action.data.bestMonth.monthName}
                                    </span>
                                    <span className="text-[10px] text-emerald-200">
                                      حفظ جديد: {msg.action.data.bestMonth.newFaces} وجه • مراجعة: {msg.action.data.bestMonth.reviewFaces} وجه ({msg.action.data.bestMonth.count} جلسة)
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-base font-black text-amber-300 font-mono">
                                    {msg.action.data.bestMonth.totalFaces}
                                  </span>
                                  <span className="text-[10px] text-amber-200 block">وجه</span>
                                </div>
                              </div>
                            )}

                            {/* Queried Specific Date Details if requested */}
                            {msg.action.data?.queriedDate && (
                              <div className="p-3 rounded-xl bg-black/40 border border-cyan-800/80 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>سجل تسميع يوم ({msg.action.data.queriedDateLabel || msg.action.data.queriedDate}):</span>
                                  </span>
                                  {msg.action.data?.queriedDateDetails && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/40">
                                      {msg.action.data.queriedDateDetails.dayTotal} وجه مسمع
                                    </span>
                                  )}
                                </div>
                                {msg.action.data?.queriedDateDetails ? (
                                  <div className="text-[11px] space-y-1 text-emerald-100">
                                    <p>• <strong>الحفظ الجديد:</strong> {msg.action.data.queriedDateDetails.newAchieved} ({msg.action.data.queriedDateDetails.dayNewFaces} وجه)</p>
                                    <p>• <strong>المراجعة والتثبيت:</strong> {msg.action.data.queriedDateDetails.reviewAchieved} ({msg.action.data.queriedDateDetails.dayReviewFaces} وجه)</p>
                                    {msg.action.data.queriedDateDetails.teacherNotes && (
                                      <p className="text-slate-300">✍️ <strong>ملاحظات المعلم:</strong> {msg.action.data.queriedDateDetails.teacherNotes}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-300">
                                    لم يُسجل تسميع في هذا التاريخ تحديداً (قد يكون إجازة أو لم يحضر فيه).
                                  </p>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateTab) {
                                  onNavigateTab('evaluation', {
                                    studentId: msg.action.data?.studentId,
                                    searchQuery: msg.action.data?.studentName
                                  });
                                }
                                setIsOpen(false);
                              }}
                              style={{
                                backgroundColor: accentColor,
                                color: primaryColor,
                              }}
                              className="w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span>الانتقال لبطاقة تقييم وتسميع الطالب الآن 📖</span>
                            </button>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 4. Add Halaqah Card                                  */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'CONFIRM_ADD_HALAQAH' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}FA`,
                              borderColor: accentColor,
                            }}
                            className="mt-3 p-3 rounded-xl border text-xs text-emerald-100 space-y-2.5 shadow-lg"
                          >
                            <div className="flex items-center gap-1.5 font-bold border-b border-emerald-800 pb-1.5" style={{ color: accentColor }}>
                              <FolderPlus className="w-4 h-4" />
                              <span>إنشاء حلقة / مجموعة قرآنية جديدة</span>
                            </div>
                            <p className="text-white text-[12px]">
                              الاسم المقترح: <strong className="text-amber-300 font-bold">{msg.action.data?.suggestedName}</strong>
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                disabled={actionInProgress === 'add_halaqah'}
                                onClick={() =>
                                  handleExecuteAddHalaqah(msg.action?.data?.suggestedName || 'حلقة جديدة')
                                }
                                style={{ backgroundColor: accentColor, color: primaryColor }}
                                className="flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>اعتماد وإنشاء الحلقة الآن</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessages(prev => [
                                    ...prev,
                                    {
                                      id: `ai_cancel_${Date.now()}`,
                                      sender: 'assistant',
                                      text: 'تم إلغاء إنشاء الحلقة بناءً على رغبتكم.',
                                      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                                    },
                                  ]);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 4.9 Delete Teacher Confirmation Card                 */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'CONFIRM_DELETE_TEACHER' && (
                          <div className="mt-3 p-3.5 rounded-xl bg-red-950/90 border border-red-700 text-xs text-red-100 space-y-2.5 shadow-xl">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300 border-b border-red-800 pb-1.5">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>تأكيد طلب حذف حساب المعلم</span>
                            </div>
                            <p className="text-white text-[12px] leading-relaxed">
                              هل تؤكد حذف حساب المعلم: <strong className="text-amber-300">{msg.action.data?.teacherName}</strong>؟
                            </p>
                            <p className="text-[11px] text-red-300/80">
                              * سيتم حذف حساب المعلم من المنظومة، وستبقى بيانات الحلقات محفوظة بأمان.
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                disabled={actionInProgress === msg.action.data?.teacherId}
                                onClick={() =>
                                  handleExecuteDeleteTeacher(
                                    msg.action?.data?.teacherId,
                                    msg.action?.data?.teacherName
                                  )
                                }
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>نعم، تأكيد حذف المعلم نهائياً 🗑️</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessages(prev => [
                                    ...prev,
                                    {
                                      id: `ai_cancel_${Date.now()}`,
                                      sender: 'assistant',
                                      text: 'تم إلغاء إجراء حذف المعلم بناءً على رغبتكم.',
                                      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                                    },
                                  ]);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateTab) {
                                  onNavigateTab(isDeveloper ? 'accounts' : 'settings', {
                                    teacherId: msg.action.data?.teacherId,
                                    subTab: 'teachers',
                                    highlightId: msg.action.data?.teacherId,
                                    action: 'delete'
                                  });
                                }
                                setIsOpen(false);
                                setTimeout(() => {
                                  triggerComplexThemePulse(msg.action.data?.teacherId);
                                }, 120);
                              }}
                              className="w-full py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>الانتقال لقسم إدارة المعلمين في الإعدادات ⚙️</span>
                            </button>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 5. Delete Halaqah Confirmation Card                 */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'CONFIRM_DELETE_HALAQAH' && (
                          <div className="mt-3 p-3 rounded-xl bg-red-950/90 border border-red-700 text-xs text-red-100 space-y-2.5 shadow-lg">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300 border-b border-red-800 pb-1.5">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>تأكيد طلب حذف حلقة / مجموعة</span>
                            </div>
                            <p className="text-white text-[12px]">
                              هل تؤكد حذف الحلقة: <strong className="text-amber-300">{msg.action.data?.halaqahName}</strong>؟
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                disabled={actionInProgress === msg.action.data?.halaqahId}
                                onClick={() =>
                                  handleExecuteDeleteHalaqah(
                                    msg.action?.data?.halaqahId,
                                    msg.action?.data?.halaqahName
                                  )
                                }
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>نعم، احذف الحلقة نهائياً</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessages(prev => [
                                    ...prev,
                                    {
                                      id: `ai_cancel_${Date.now()}`,
                                      sender: 'assistant',
                                      text: 'تم إلغاء إجراء حذف الحلقة بناءً على رغبتكم.',
                                      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                                    },
                                  ]);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateTab) {
                                  onNavigateTab('settings', {
                                    halaqahId: msg.action.data?.halaqahId,
                                    subTab: 'halaqahs',
                                    highlightId: msg.action.data?.halaqahId,
                                    action: 'delete'
                                  });
                                }
                                setIsOpen(false);
                                setTimeout(() => {
                                  triggerComplexThemePulse(msg.action.data?.halaqahId);
                                }, 120);
                              }}
                              className="w-full py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>الانتقال لقسم الحلقات في الإعدادات ⚙️</span>
                            </button>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 5.1 Transfer Student Confirmation Card              */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'CONFIRM_TRANSFER_STUDENT' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}FA`,
                              borderColor: accentColor,
                            }}
                            className="mt-3 p-3 rounded-xl border text-xs text-emerald-100 space-y-2.5 shadow-lg"
                          >
                            <div className="flex items-center gap-1.5 font-bold border-b border-emerald-800 pb-1.5" style={{ color: accentColor }}>
                              <Users className="w-4 h-4" />
                              <span>تأكيد نقل طالب بين الحلقات</span>
                            </div>
                            {(() => {
                              const availHalaqahs = isDeveloper && allHalaqahs && allHalaqahs.length > 0 ? allHalaqahs : effectiveHalaqahs;
                              const chosenTargetId = transferTargetOverrides[msg.id] || msg.action?.data?.targetHalaqahId || availHalaqahs[0]?.id || '';
                              const chosenTargetObj = availHalaqahs.find(h => h.id === chosenTargetId) || { id: chosenTargetId, name: msg.action?.data?.targetHalaqahName || 'الحلقة المختارة' };

                              return (
                                <>
                                  <p className="text-white text-[12px] leading-relaxed">
                                    هل تؤكد نقل الطالب <strong className="text-amber-300 font-bold">{msg.action.data?.studentName}</strong> من ({msg.action.data?.currentHalaqahName}) إلى:
                                  </p>
                                  <div className="bg-black/40 p-2.5 rounded-xl border border-emerald-800/80 space-y-1.5">
                                    <label className="text-[11px] text-emerald-300 font-bold block">
                                      الحلقة القرآنية المستهدفة (يمكنك اختيار أي حلقة أدناه):
                                    </label>
                                    <select
                                      value={chosenTargetId}
                                      onChange={e => setTransferTargetOverrides(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                      className="w-full bg-[#022c22] border border-[#065f46] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold outline-none cursor-pointer focus:border-amber-400"
                                    >
                                      {availHalaqahs.map(h => (
                                        <option key={h.id} value={h.id} className="bg-[#064e3b] text-white">
                                          {h.name} {h.complexName ? `(${h.complexName})` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      disabled={actionInProgress === msg.action.data?.studentId}
                                      onClick={() =>
                                        handleExecuteTransferStudent(
                                          msg.action?.data?.studentId,
                                          chosenTargetId,
                                          chosenTargetObj.name,
                                          msg.action?.data?.studentName
                                        )
                                      }
                                      style={{ backgroundColor: accentColor, color: primaryColor }}
                                      className="flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>تأكيد نقل الطالب الآن</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMessages(prev => [
                                          ...prev,
                                          {
                                            id: `ai_cancel_${Date.now()}`,
                                            sender: 'assistant',
                                            text: 'تم إلغاء نقل الطالب بناءً على رغبتكم.',
                                            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                                          },
                                        ]);
                                      }}
                                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 5.2 Record Attendance Confirmation Card             */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'CONFIRM_RECORD_ATTENDANCE' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}FA`,
                              borderColor: accentColor,
                            }}
                            className="mt-3 p-3 rounded-xl border text-xs text-emerald-100 space-y-2.5 shadow-lg"
                          >
                            <div className="flex items-center gap-1.5 font-bold border-b border-emerald-800 pb-1.5" style={{ color: accentColor }}>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>تأكيد رصد التحضير الفوري لطالب</span>
                            </div>
                            <p className="text-white text-[12px]">
                              هل تؤكد رصد حالة <strong className="text-amber-300 font-bold font-mono">({msg.action.data?.status})</strong> للطالب <strong className="text-white font-bold">{msg.action.data?.studentName}</strong> في {msg.action.data?.halaqahName}؟
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                disabled={actionInProgress === msg.action.data?.studentId}
                                onClick={() =>
                                  handleExecuteRecordAttendance(
                                    msg.action?.data?.studentId,
                                    msg.action?.data?.status || 'حاضر',
                                    msg.action?.data?.studentName
                                  )
                                }
                                style={{ backgroundColor: accentColor, color: primaryColor }}
                                className="flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>تأكيد رصد التحضير الآن</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessages(prev => [
                                    ...prev,
                                    {
                                      id: `ai_cancel_${Date.now()}`,
                                      sender: 'assistant',
                                      text: 'تم إلغاء رصد التحضير بناءً على رغبتكم.',
                                      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                                    },
                                  ]);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 6. Attendance WhatsApp Message Card                 */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'ATTENDANCE_MESSAGE' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F5`,
                              borderColor: `${accentColor}80`,
                            }}
                            className="mt-3 p-3 rounded-xl border text-xs text-emerald-100 space-y-2.5"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800 pb-1.5">
                              <span className="font-bold flex items-center gap-1" style={{ color: accentColor }}>
                                <Share2 className="w-3.5 h-3.5" />
                                رسالة الحضور للواتساب جاهزة
                              </span>
                              <span className="text-[10px] text-emerald-400">
                                {msg.action.data?.metrics?.presentCount || 0} حاضر / {msg.action.data?.metrics?.absentCount || 0} غائب
                              </span>
                            </div>

                            <div className="bg-black/40 p-2.5 rounded-lg font-mono text-[11px] leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap text-emerald-200/90 border border-emerald-900/60">
                              {msg.action.data?.messageText}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCopyText(msg.action?.data?.messageText, msg.id)}
                                style={{
                                  backgroundColor: accentColor,
                                  color: primaryColor,
                                }}
                                className="flex-1 py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow cursor-pointer hover:brightness-110 active:scale-98 transition-all"
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تم النسخ!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ التقرير</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(msg.action?.data?.messageText || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow cursor-pointer transition-all"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>فتح واتساب</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 7. Visual Multi-Style Statistics & Diagnostic Charts */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_CHART' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}80`,
                            }}
                            className="mt-3 p-3.5 rounded-2xl border text-xs text-emerald-100 space-y-3 shadow-xl"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/80 pb-2">
                              <span className="font-bold flex items-center gap-1.5" style={{ color: accentColor }}>
                                <BarChart3 className="w-4 h-4" />
                                <span>{msg.action.title || 'التشخيص البياني والإحصائي المباشر'}</span>
                              </span>

                              {/* Smart Automatic Chart Badge - No manual clicking required */}
                              {(() => {
                                const activeStyle = msg.action?.chartType || 'circle';
                                const badgeLabel =
                                  activeStyle === 'bars'
                                    ? '📊 أعمدة بيانية (مقارنة الإنجاز والنقاط)'
                                    : activeStyle === 'tracking'
                                    ? '📈 مسار تتبع الانضباط والتقدم'
                                    : activeStyle === 'diagnostic'
                                    ? '⚡ مؤشر التشخيص الحيوي للمجمع'
                                    : '🍩 مخطط بياني دائري (توزيع النسب)';
                                return (
                                  <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-emerald-700/60 text-[10px] font-bold text-amber-300 shadow-sm">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>{badgeLabel}</span>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* 1. Circle / Donut Style View */}
                            {((msg.action?.chartType === 'circle' || msg.action?.chartType === 'attendance_breakdown' || msg.action?.chartType === 'recitation_breakdown' || !msg.action?.chartType || (chartActiveTabs[msg.id] === 'circle' && !msg.action?.chartType))) && (
                              <div className="space-y-3 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {/* Attendance Donut */}
                                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/70 flex flex-col items-center">
                                    <div className="text-[11px] font-bold text-amber-300 mb-2">معدل الحضور والغياب اليومي</div>
                                    <div className="relative w-28 h-28 flex items-center justify-center">
                                      {(() => {
                                        const tot = Math.max(1, (msg.action.data?.attendance?.total || platformMetrics.totalStudents || 1));
                                        const p = (msg.action.data?.attendance?.present || platformMetrics.presentCount || 0);
                                        const a = (msg.action.data?.attendance?.absent || platformMetrics.absentCount || 0);
                                        const e = (msg.action.data?.attendance?.excused || platformMetrics.excusedCount || 0);
                                        const pPct = Math.round((p / tot) * 100);
                                        const aPct = Math.round((a / tot) * 100);
                                        return (
                                          <>
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                              <path
                                                className="text-emerald-950/80"
                                                strokeWidth="4"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              />
                                              <path
                                                className="text-emerald-400"
                                                strokeDasharray={`${pPct}, 100`}
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              />
                                              {aPct > 0 && (
                                                <path
                                                  className="text-red-500"
                                                  strokeDasharray={`${aPct}, 100`}
                                                  strokeDashoffset={`-${pPct}`}
                                                  strokeWidth="4"
                                                  strokeLinecap="round"
                                                  stroke="currentColor"
                                                  fill="none"
                                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                              )}
                                            </svg>
                                            <div className="absolute flex flex-col items-center">
                                              <span className="text-base font-black text-amber-300 font-mono">{pPct}%</span>
                                              <span className="text-[9px] text-emerald-200">حاضرون</span>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex gap-2 text-[10px] mt-2">
                                      <span className="text-emerald-300 flex items-center gap-1">🟢 {msg.action.data?.attendance?.present || platformMetrics.presentCount} حاضر</span>
                                      <span className="text-red-300 flex items-center gap-1">🔴 {msg.action.data?.attendance?.absent || platformMetrics.absentCount} غائب</span>
                                      <span className="text-amber-300 flex items-center gap-1">🟡 {msg.action.data?.attendance?.excused || platformMetrics.excusedCount} عذر</span>
                                    </div>
                                  </div>

                                  {/* Recitation Breakdown Donut */}
                                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/70 flex flex-col items-center">
                                    <div className="text-[11px] font-bold text-emerald-300 mb-2">توزيع الأوجه (حفظ ومراجعة)</div>
                                    <div className="relative w-28 h-28 flex items-center justify-center">
                                      {(() => {
                                        const tot = Math.max(1, (msg.action.data?.recitation?.totalPages || platformMetrics.totalRecitedPagesToday || 1));
                                        const n = (msg.action.data?.recitation?.newPages || platformMetrics.totalNewPagesToday || 0);
                                        const r = (msg.action.data?.recitation?.reviewPages || platformMetrics.totalReviewPagesToday || 0);
                                        const nPct = Math.round((n / tot) * 100);
                                        return (
                                          <>
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                              <path
                                                className="text-emerald-950/80"
                                                strokeWidth="4"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              />
                                              <path
                                                className="text-amber-400"
                                                strokeDasharray={`${nPct}, 100`}
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              />
                                              <path
                                                className="text-cyan-400"
                                                strokeDasharray={`${100 - nPct}, 100`}
                                                strokeDashoffset={`-${nPct}`}
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              />
                                            </svg>
                                            <div className="absolute flex flex-col items-center">
                                              <span className="text-base font-black text-amber-200 font-mono">{tot}</span>
                                              <span className="text-[9px] text-emerald-200">وجه مسمع</span>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex gap-2 text-[10px] mt-2">
                                      <span className="text-amber-300">🟡 حفظ جديد: {msg.action.data?.recitation?.newPages || platformMetrics.totalNewPagesToday}</span>
                                      <span className="text-cyan-300">🔵 مراجعة: {msg.action.data?.recitation?.reviewPages || platformMetrics.totalReviewPagesToday}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 2. Bars Style View */}
                            {((msg.action?.chartType === 'bars' || chartActiveTabs[msg.id] === 'bars')) && (
                              <div className="space-y-2.5 pt-1">
                                <div className="text-[11px] font-bold text-amber-300">
                                  {msg.action.data?.studentsComparison ? 'مقارنة إنجاز الطلاب المحددين (أعمدة بيانية):' : 'أعلى الطلاب في إجمالي النقاط (أعمدة بيانية):'}
                                </div>
                                <div className="space-y-1.5">
                                  {(msg.action.data?.studentsComparison && msg.action.data.studentsComparison.length > 0
                                    ? msg.action.data.studentsComparison.map((s: any) => ({
                                        name: s.name,
                                        points: s.totalPoints ?? s.points ?? 0,
                                        halaqahName: s.halaqahName || 'الحلقة',
                                        extraLabel: s.facesLabel
                                      }))
                                    : msg.action.data?.topPoints && msg.action.data.topPoints.length > 0
                                    ? msg.action.data.topPoints
                                    : scopedStudents.slice(0, 5).map(s => ({ name: s.name, points: s.totalPoints || 0, halaqahName: s.halaqahName }))
                                  ).map((item: any, idx: number) => {
                                    const allItems = msg.action.data?.studentsComparison || msg.action.data?.topPoints || scopedStudents.slice(0, 5);
                                    const maxP = Math.max(1, ...allItems.map((x: any) => Number(x.points ?? x.totalPoints) || 0));
                                    const pct = Math.min(100, Math.round(((Number(item.points) || 0) / maxP) * 100));
                                    return (
                                      <div key={idx} className="space-y-0.5">
                                        <div className="flex justify-between text-[11px]">
                                          <span className="font-bold flex items-center gap-1 text-emerald-100">
                                            <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'}</span>
                                            <span>{item.name}</span>
                                            <span className="text-[9px] text-emerald-400">({item.halaqahName || 'الحلقة'})</span>
                                            {item.extraLabel && (
                                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-normal">
                                                {item.extraLabel}
                                              </span>
                                            )}
                                          </span>
                                          <span className="font-black text-amber-300 font-mono">{item.points} نقطة</span>
                                        </div>
                                        <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-emerald-900/60">
                                          <div
                                            style={{
                                              width: `${pct}%`,
                                              background: idx === 0 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #10b981, #34d399)',
                                            }}
                                            className="h-full rounded-full transition-all duration-700"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 3. Tracking Style View */}
                            {((chartActiveTabs[msg.id] || msg.action?.chartType) === 'tracking') && (
                              <div className="space-y-2.5 pt-1">
                                <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/80 space-y-2">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="font-bold text-amber-200">مسار انضباط حضور الطلاب:</span>
                                    <span className="font-bold text-emerald-300">
                                      {platformMetrics.totalStudents > 0
                                        ? Math.round((platformMetrics.presentCount / platformMetrics.totalStudents) * 100)
                                        : 100}% مكتمل
                                    </span>
                                  </div>
                                  <div className="w-full bg-emerald-950 h-3 rounded-full overflow-hidden border border-emerald-800">
                                    <div
                                      style={{
                                        width: `${platformMetrics.totalStudents > 0 ? (platformMetrics.presentCount / platformMetrics.totalStudents) * 100 : 100}%`,
                                        backgroundColor: accentColor,
                                      }}
                                      className="h-full rounded-full transition-all duration-700"
                                    />
                                  </div>
                                </div>

                                <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/80 space-y-2">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="font-bold text-cyan-200">متوسط الإنجاز اليومي للورد:</span>
                                    <span className="font-bold text-cyan-300">{platformMetrics.avgDailyNewTarget}</span>
                                  </div>
                                  <div className="w-full bg-cyan-950 h-3 rounded-full overflow-hidden border border-cyan-800">
                                    <div className="h-full bg-cyan-400 rounded-full w-4/5" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 4. Diagnostic Style View */}
                            {((chartActiveTabs[msg.id] || msg.action?.chartType) === 'diagnostic') && (
                              <div className="space-y-2.5 pt-1">
                                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/80 flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-bold text-amber-300">مؤشر الحيوية القرآنية للمجمع</div>
                                    <div className="text-[10px] text-emerald-200 mt-0.5">بناءً على قياس الحضور والتسميع والنقاط الحية</div>
                                  </div>
                                  <div className="text-xl font-black text-amber-300 font-mono bg-black/40 px-3 py-1 rounded-xl border border-amber-400/30">
                                    96%
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div className="p-2 rounded-lg bg-black/30 border border-emerald-800/60">
                                    <span className="text-amber-300 font-bold block mb-1">🌟 نقاط القوة:</span>
                                    <span>مواظبة عالية على المراجعة والتثبيت وتنافس مميز بين الطلاب.</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-black/30 border border-emerald-800/60">
                                    <span className="text-cyan-300 font-bold block mb-1">🎯 توجيه تربوي:</span>
                                    <span>متابعة الغائبين بالرسائل اليومية لتحفيزهم على الحضور غداً.</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 8. Generate Certificates With Live Preview & Export */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'GENERATE_CERTIFICATES' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}80`,
                            }}
                            className="mt-3 p-3.5 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
                              <span className="font-bold flex items-center gap-1.5 text-sm" style={{ color: accentColor }}>
                                <Award className="w-5 h-5 text-amber-300" />
                                <span>صنع وإصدار الشهادات التقديرية</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                                {((certSelectedStudents[msg.id] || msg.action.data?.students || []).length)} طالب محدد
                              </span>
                            </div>

                            {/* Candidate Students List With Add/Remove */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-amber-300">الطلاب المستحقون للشهادة:</label>
                                <button
                                  type="button"
                                  onClick={() => setAddingStudentsForCertMsgId(prev => (prev === msg.id ? null : msg.id))}
                                  className="text-[10px] font-bold text-emerald-300 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>أضف المزيد من الطلاب</span>
                                </button>
                              </div>

                              {/* Search & Add Students Picker */}
                              {addingStudentsForCertMsgId === msg.id && (
                                <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-700/80 space-y-2 animate-fadeIn">
                                  <input
                                    type="text"
                                    value={studentPickerSearch}
                                    onChange={e => setStudentPickerSearch(e.target.value)}
                                    placeholder="ابحث عن اسم طالب لإضافته للشهادات..."
                                    className="w-full bg-[#022c22] border border-emerald-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-emerald-400/50 outline-none"
                                  />
                                  <div className="max-h-28 overflow-y-auto space-y-1">
                                    {scopedStudents
                                      .filter(s => {
                                        const currentIds = (certSelectedStudents[msg.id] || msg.action.data?.students || []).map((x: any) => x.id);
                                        if (currentIds.includes(s.id)) return false;
                                        if (!studentPickerSearch.trim()) return true;
                                        return s.name.toLowerCase().includes(studentPickerSearch.toLowerCase().trim());
                                      })
                                      .slice(0, 10)
                                      .map(s => (
                                        <div
                                          key={s.id}
                                          onClick={() => {
                                            const current = certSelectedStudents[msg.id] || msg.action.data?.students || [];
                                            setCertSelectedStudents(prev => ({
                                              ...prev,
                                              [msg.id]: [...current, s],
                                            }));
                                            showToast(`تمت إضافة الطالب ${s.name} للشهادات ✓`);
                                          }}
                                          className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 flex items-center justify-between text-[11px] cursor-pointer transition-colors"
                                        >
                                          <span className="font-bold text-white">{s.name}</span>
                                          <span className="text-[10px] text-amber-300">{s.halaqahName || 'الحلقة'} • {s.totalPoints || 0} نقطة ➕</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Selected Student Chips */}
                              <div className="flex flex-wrap gap-1.5">
                                {(certSelectedStudents[msg.id] || msg.action.data?.students || []).map((s: any, idx: number) => (
                                  <span
                                    key={s.id || idx}
                                    className="px-2.5 py-1 rounded-full bg-emerald-900/90 text-amber-200 border border-emerald-600 text-[11px] flex items-center gap-1.5 shadow"
                                  >
                                    <span className="font-bold">{s.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = certSelectedStudents[msg.id] || msg.action.data?.students || [];
                                        setCertSelectedStudents(prev => ({
                                          ...prev,
                                          [msg.id]: current.filter((x: any) => x.id !== s.id),
                                        }));
                                      }}
                                      className="text-red-300 hover:text-red-100 cursor-pointer"
                                      title="حذف الطالب من هذه الشهادة"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Certificate Customization: Title, Occasion, and Template */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-amber-300 mb-1">عنوان الشهادة:</label>
                                <input
                                  type="text"
                                  value={certOccasionSelection[msg.id] !== undefined ? certOccasionSelection[msg.id] : (msg.action.data?.certificateTitle || 'شكر وتقدير')}
                                  onChange={e => setCertOccasionSelection(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                  className="w-full bg-black/40 border border-emerald-700/80 rounded-xl px-2.5 py-1.5 text-xs text-amber-200 font-bold outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-amber-300 mb-1">اختر قالب الشهادة:</label>
                                <select
                                  value={certTemplateSelection[msg.id] || msg.action.data?.templateId || 'platform_emerald_royal'}
                                  onChange={e => setCertTemplateSelection(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                  className="w-full bg-black/40 border border-emerald-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                                >
                                  <optgroup label="قوالب المنصة المعتمدة">
                                    <option value="platform_emerald_royal">👑 القالب الملكي الزمردي</option>
                                    <option value="platform_golden_honor">🎖️ وسام الشرف الذهبي</option>
                                    <option value="platform_islamic_classic">🕌 الزخرفة الإسلامية الكلاسيكية</option>
                                    <option value="platform_blue_modern">💎 الأزرق القرآني الحديث</option>
                                  </optgroup>
                                  {(activeComplex?.customCertificateTemplates && activeComplex.customCertificateTemplates.length > 0) && (
                                    <optgroup label="قوالب المجمع المخصصة">
                                      {activeComplex.customCertificateTemplates.map(tpl => (
                                        <option key={tpl.id} value={tpl.id}>
                                          ✨ {tpl.name} {tpl.isPlatformAiTemplate ? '(قالب المنصة للمجمع)' : ''}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* Occasion / Praise Text */}
                            <div>
                              <label className="block text-[11px] font-bold text-amber-300 mb-1">نص التكريم والثناء:</label>
                              <textarea
                                rows={2}
                                value={certOccasionCustomText[msg.id] !== undefined ? certOccasionCustomText[msg.id] : (msg.action.data?.occasionText || 'تقديراً لجهوده المباركة وتفوقه في حفظ وتلاوة كتاب الله الكريم وسلوكه المتميز في الحلقة القرآنية')}
                                onChange={e => setCertOccasionCustomText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                className="w-full bg-black/40 border border-emerald-700/80 rounded-xl p-2 text-xs text-emerald-100 outline-none"
                              />
                            </div>

                            {/* Live Interactive Preview Box */}
                            <div className="p-3 rounded-2xl bg-black/50 border border-amber-400/40 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>معاينة حية للشهادة الصادرة</span>
                                </span>
                                <span className="text-[10px] text-emerald-300">
                                  الطالب الأول: {((certSelectedStudents[msg.id] || msg.action.data?.students || [])[0]?.name || 'محمد أحمد القرشي')}
                                </span>
                              </div>

                              <div className="p-4 rounded-xl bg-gradient-to-r from-[#022c22] via-[#064e3b] to-[#022c22] border-2 border-amber-400/60 text-center space-y-1.5 shadow-inner">
                                <div className="text-[10px] font-bold text-amber-200">{activeComplex?.name || 'مجمع حلقات القرآن الكريم'}</div>
                                <div className="text-base font-black text-amber-400">
                                  {certOccasionSelection[msg.id] !== undefined ? certOccasionSelection[msg.id] : (msg.action.data?.certificateTitle || 'شكر وتقدير')}
                                </div>
                                <div className="text-[11px] text-emerald-200">تُمنح هذه الشهادة للطالب المبارك:</div>
                                <div className="text-base font-black text-white bg-black/40 py-1 px-3 rounded-lg inline-block border border-amber-400/30">
                                  {((certSelectedStudents[msg.id] || msg.action.data?.students || [])[0]?.name || 'اسم الطالب المكرّم')}
                                </div>
                                <div className="text-[10px] text-slate-200 max-w-sm mx-auto line-clamp-2">
                                  {certOccasionCustomText[msg.id] !== undefined ? certOccasionCustomText[msg.id] : (msg.action.data?.occasionText || 'تقديراً لجهوده المباركة وتفوقه في حفظ وتلاوة كتاب الله الكريم')}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Separate PDFs vs Merged PDF */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isExportingCertificates}
                                onClick={() => {
                                  const list = certSelectedStudents[msg.id] || msg.action.data?.students || [];
                                  const title = certOccasionSelection[msg.id] !== undefined ? certOccasionSelection[msg.id] : (msg.action.data?.certificateTitle || 'شكر وتقدير');
                                  const text = certOccasionCustomText[msg.id] !== undefined ? certOccasionCustomText[msg.id] : (msg.action.data?.occasionText || 'تقديراً لجهوده المباركة وتفوقه في حفظ وتلاوة كتاب الله الكريم');
                                  const tpl = certTemplateSelection[msg.id] || msg.action.data?.templateId || 'platform_emerald_royal';
                                  handlePrintSeparateCertificates(msg.id, list, title, text, tpl);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>طباعة ملفات منفصلة (PDF لكل طالب)</span>
                              </button>

                              <button
                                type="button"
                                disabled={isExportingCertificates}
                                onClick={() => {
                                  const list = certSelectedStudents[msg.id] || msg.action.data?.students || [];
                                  const title = certOccasionSelection[msg.id] !== undefined ? certOccasionSelection[msg.id] : (msg.action.data?.certificateTitle || 'شكر وتقدير');
                                  const text = certOccasionCustomText[msg.id] !== undefined ? certOccasionCustomText[msg.id] : (msg.action.data?.occasionText || 'تقديراً لجهوده المباركة وتفوقه في حفظ وتلاوة كتاب الله الكريم');
                                  const tpl = certTemplateSelection[msg.id] || msg.action.data?.templateId || 'platform_emerald_royal';
                                  handlePrintMergedCertificates(msg.id, list, title, text, tpl);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة مجمعة في ملف واحد</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 9. Create Custom Certificate Template For Complex    */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'CREATE_CERTIFICATE_TEMPLATE' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}80`,
                            }}
                            className="mt-3 p-3.5 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
                              <span className="font-bold flex items-center gap-1.5 text-sm" style={{ color: accentColor }}>
                                <Palette className="w-5 h-5 text-amber-300" />
                                <span>{msg.action.title || 'تصميم واعتماد قالب شهادة جديد'}</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                                مخصص للمجمع 🛡️
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block text-[11px] font-bold text-amber-300 mb-1">اسم القالب:</label>
                                <input
                                  type="text"
                                  defaultValue={msg.action.data?.name || 'قالب شكر وتقدير القرآني'}
                                  id={`tpl_name_${msg.id}`}
                                  className="w-full bg-black/40 border border-emerald-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-bold text-amber-300 mb-1">عنوان الشهادة العلوي:</label>
                                  <input
                                    type="text"
                                    defaultValue={msg.action.data?.title || 'شكر وتقدير'}
                                    id={`tpl_title_${msg.id}`}
                                    className="w-full bg-black/40 border border-emerald-700/80 rounded-xl px-2.5 py-1.5 text-xs text-amber-200 font-bold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-amber-300 mb-1">النمط الجمالي:</label>
                                  <select
                                    defaultValue={msg.action.data?.bgStyle || 'royal_emerald'}
                                    id={`tpl_bg_${msg.id}`}
                                    className="w-full bg-black/40 border border-emerald-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                                  >
                                    <option value="royal_emerald">👑 النمط الملكي الزمردي</option>
                                    <option value="golden_honor">🎖️ وسام الشرف الذهبي</option>
                                    <option value="islamic_classic">🕌 الزخرفة الإسلامية الكلاسيكية</option>
                                    <option value="blue_modern">💎 الأزرق القرآني الحديث</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-amber-300 mb-1">نص المناسبة والثناء:</label>
                                <textarea
                                  rows={2}
                                  defaultValue={msg.action.data?.occasionText || 'شهادة شكر وتقدير وثناء عاطر على التميز والمواظبة في حفظ كتاب الله الكريم'}
                                  id={`tpl_text_${msg.id}`}
                                  className="w-full bg-black/40 border border-emerald-700/80 rounded-xl p-2 text-xs text-emerald-100 outline-none"
                                />
                              </div>
                            </div>

                            {/* Notice: Exempt from 5 Quota */}
                            <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-200 flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <span>
                                هذا القالب محفوظ حصرياً لمجمعكم، ومصنف كـ <strong>قالب منصة مخصص</strong> بحيث لا يُحتسب ضمن حد الـ 5 نماذج المرفوعة ويبقى دائماً في قسم الشهادات.
                              </span>
                            </div>

                            {/* Save Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const nameInput = (document.getElementById(`tpl_name_${msg.id}`) as HTMLInputElement)?.value;
                                const titleInput = (document.getElementById(`tpl_title_${msg.id}`) as HTMLInputElement)?.value;
                                const textInput = (document.getElementById(`tpl_text_${msg.id}`) as HTMLTextAreaElement)?.value;
                                const bgSelect = (document.getElementById(`tpl_bg_${msg.id}`) as HTMLSelectElement)?.value as any;
                                handleSaveCustomAiTemplate(
                                  msg.id,
                                  nameInput || 'قالب شكر وتقدير',
                                  titleInput || 'شكر وتقدير',
                                  textInput || 'شهادة شكر وتقدير',
                                  bgSelect || 'royal_emerald'
                                );
                              }}
                              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer active:scale-98 transition-all"
                            >
                              <BookmarkCheck className="w-4 h-4" />
                              <span>حفظ واعتماد القالب في مجمعنا الآن</span>
                            </button>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 10. Recitation Evaluation & Listening Inquiry Card    */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_STUDENT_EVALUATION' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}80`,
                            }}
                            className="mt-3 p-3.5 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
                              <span className="font-bold flex items-center gap-1.5 text-sm" style={{ color: accentColor }}>
                                <BookOpen className="w-5 h-5 text-amber-300" />
                                <span>{msg.action.title || 'سجل تقييم وتسميع الطالب'}</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                                {msg.action.data?.student?.level || 'متوسط'} • {msg.action.data?.student?.totalPoints || 0} نقطة
                              </span>
                            </div>

                            {/* Section 1: Today's Recitation */}
                            <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/80 space-y-2">
                              <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                                <span>📖 إنجاز وتسميع اليوم:</span>
                                {msg.action.data?.hasRecitedToday ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">تم التسميع اليوم ✓</span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal">في انتظار التسميع</span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/50">
                                  <span className="text-amber-200 font-bold block mb-0.5">الحفظ الجديد:</span>
                                  <span className="text-white">{msg.action.data?.recitationDetails?.newMemorizationAchieved || 'متابعة الورد المعتمد'}</span>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/50">
                                  <span className="text-cyan-200 font-bold block mb-0.5">المراجعة والتثبيت:</span>
                                  <span className="text-white">{msg.action.data?.recitationDetails?.reviewAchieved || 'لا يوجد مراجعة مسجلة'}</span>
                                </div>
                              </div>
                              {msg.action.data?.recitationDetails?.teacherNotes && (
                                <div className="text-[11px] text-slate-300 p-2 rounded-lg bg-black/30 border border-emerald-900/50">
                                  <strong className="text-amber-300">ملاحظات المعلم: </strong>
                                  {msg.action.data.recitationDetails.teacherNotes}
                                </div>
                              )}
                            </div>

                            {/* Section 2: Audio Recording Player If Available */}
                            {msg.action.data?.hasRecording && msg.action.data?.recording && (
                              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-teal-500/50 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                                    <Volume2 className="w-4 h-4 text-amber-300" />
                                    <span>تسجيل صوتي لتلاوة الطالب 🎙️</span>
                                  </span>
                                  <span className="text-[10px] text-slate-300">{msg.action.data.recording.surahName || 'تلاوة اليوم'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAudio(msg.action.data.recording.audioDataUrl || msg.action.data.recording.url)}
                                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow"
                                  >
                                    {isPlayingAudioUrl === (msg.action.data.recording.audioDataUrl || msg.action.data.recording.url) ? (
                                      <span>إيقاف المؤقت ⏸️</span>
                                    ) : (
                                      <span>استمع لتلاوة الطالب ▶️</span>
                                    )}
                                  </button>
                                  <span className="text-[10px] text-emerald-200">
                                    التاريخ: {msg.action.data.recording.createdAt ? msg.action.data.recording.createdAt.split('T')[0] : 'اليوم'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Section 3: Tomorrow's Recitation Assignment */}
                            <div className="p-3 rounded-xl bg-black/40 border border-cyan-800/80 space-y-2">
                              <div className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                                <span>🔮 مقرر وتسميع الغد (ماذا سيسمّع بكرة):</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/50">
                                  <span className="text-amber-200 font-bold block mb-0.5">حفظ الغد الجديد:</span>
                                  <span className="text-white">
                                    {msg.action.data?.tomorrowAssignment?.tomorrowNewItem
                                      ? `${msg.action.data.tomorrowAssignment.tomorrowNewItem.surahName} (آيات ${msg.action.data.tomorrowAssignment.tomorrowNewItem.fromAyah}-${msg.action.data.tomorrowAssignment.tomorrowNewItem.toAyah})`
                                      : 'متابعة حفظ الآيات التالية'}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/50">
                                  <span className="text-cyan-200 font-bold block mb-0.5">مراجعة الغد:</span>
                                  <span className="text-white">
                                    {msg.action.data?.tomorrowAssignment?.tomorrowReviewItem
                                      ? `${msg.action.data.tomorrowAssignment.tomorrowReviewItem.surahName}`
                                      : 'مراجعة الجزء السابق'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Section 4: Quick Edit Evaluation Modal / Button */}
                            <div>
                              {editingEvalStudent?.id === msg.action.data?.student?.id ? (
                                <div className="p-3 rounded-xl bg-black/60 border border-amber-400 space-y-2.5 animate-fadeIn">
                                  <div className="font-bold text-amber-300 text-xs">تعديل سجل تسميع اليوم والغد:</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-emerald-200 block mb-0.5">تسميع اليوم الجديد:</label>
                                      <input
                                        type="text"
                                        value={evalEditFormData.newMemorization}
                                        onChange={e => setEvalEditFormData(prev => ({ ...prev, newMemorization: e.target.value }))}
                                        className="w-full bg-[#022c22] border border-emerald-700 rounded-lg p-1.5 text-xs text-white outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-emerald-200 block mb-0.5">مراجعة اليوم:</label>
                                      <input
                                        type="text"
                                        value={evalEditFormData.review}
                                        onChange={e => setEvalEditFormData(prev => ({ ...prev, review: e.target.value }))}
                                        className="w-full bg-[#022c22] border border-emerald-700 rounded-lg p-1.5 text-xs text-white outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-cyan-200 block mb-0.5">مقرر حفظ الغد:</label>
                                      <input
                                        type="text"
                                        value={evalEditFormData.tomorrowNew}
                                        onChange={e => setEvalEditFormData(prev => ({ ...prev, tomorrowNew: e.target.value }))}
                                        className="w-full bg-[#022c22] border border-cyan-700 rounded-lg p-1.5 text-xs text-white outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-cyan-200 block mb-0.5">مقرر مراجعة الغد:</label>
                                      <input
                                        type="text"
                                        value={evalEditFormData.tomorrowReview}
                                        onChange={e => setEvalEditFormData(prev => ({ ...prev, tomorrowReview: e.target.value }))}
                                        className="w-full bg-[#022c22] border border-cyan-700 rounded-lg p-1.5 text-xs text-white outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-amber-200 block mb-0.5">ملاحظات المعلم:</label>
                                    <input
                                      type="text"
                                      value={evalEditFormData.teacherNotes}
                                      onChange={e => setEvalEditFormData(prev => ({ ...prev, teacherNotes: e.target.value }))}
                                      className="w-full bg-[#022c22] border border-emerald-700 rounded-lg p-1.5 text-xs text-white outline-none"
                                    />
                                  </div>

                                  <div className="flex gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const targetSt = scopedStudents.find(s => s.id === msg.action.data.student.id) || msg.action.data.student;
                                        handleSaveEvaluationEdit(
                                          targetSt,
                                          evalEditFormData.newMemorization,
                                          evalEditFormData.review,
                                          evalEditFormData.teacherNotes,
                                          evalEditFormData.tomorrowNew,
                                          evalEditFormData.tomorrowReview,
                                          evalEditFormData.tomorrowNote
                                        );
                                      }}
                                      className="flex-1 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs cursor-pointer shadow"
                                    >
                                      حفظ التعديلات في المنظومة ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingEvalStudent(null)}
                                      className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 text-xs cursor-pointer"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEvalStudent(msg.action.data?.student);
                                      setEvalEditFormData({
                                        newMemorization: msg.action.data?.recitationDetails?.newMemorizationAchieved || '',
                                        review: msg.action.data?.recitationDetails?.reviewAchieved || '',
                                        teacherNotes: msg.action.data?.recitationDetails?.teacherNotes || '',
                                        tomorrowNew: msg.action.data?.tomorrowAssignment?.tomorrowNewItem?.surahName || '',
                                        tomorrowReview: msg.action.data?.tomorrowAssignment?.tomorrowReviewItem?.surahName || '',
                                        tomorrowNote: msg.action.data?.tomorrowAssignment?.tomorrowDailyNote || '',
                                      });
                                    }}
                                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-400/30 cursor-pointer transition-all"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>تعديل سريع لسجل التسميع ومقرر الغد هنا</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onNavigateTab) {
                                        onNavigateTab('evaluation', {
                                          studentId: msg.action.data?.student?.id,
                                          searchQuery: msg.action.data?.student?.name,
                                        });
                                      }
                                      setIsOpen(false);
                                    }}
                                    className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>الانتقال لقسم تقييم التسميع لهذا الطالب 📖</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 11. Specific Student Attendance Inquiry Card         */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_STUDENT_ATTENDANCE' && msg.action.data && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: `${accentColor}80`,
                            }}
                            className="mt-3 p-4 rounded-2xl border text-xs text-emerald-100 space-y-3.5 shadow-2xl animate-fade-in"
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-sm block text-white">
                                    {msg.action.data?.student?.name}
                                  </span>
                                  <span className="text-[10px] text-emerald-300/80">
                                    الحلقة: {msg.action.data?.student?.halaqahName} • {msg.action.data?.student?.complexName}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 font-extrabold border border-emerald-400/30">
                                حالة اليوم: {msg.action.data?.todayStatus}
                              </span>
                            </div>

                            {/* Big Metric: Weekly Attendance Rate vs Overall */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/40 space-y-1">
                                <span className="text-[10px] text-amber-200 font-bold block">نسبة الحضور هذا الأسبوع</span>
                                <div className="text-2xl font-black text-amber-300 font-mono">
                                  {msg.action.data?.weekPct}%
                                </div>
                                <div className="w-full bg-emerald-950 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, msg.action.data?.weekPct || 0))}%` }}
                                  />
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-black/40 border border-emerald-800/60 space-y-1">
                                <span className="text-[10px] text-emerald-300 font-bold block">نسبة الحضور التراكمية</span>
                                <div className="text-2xl font-black text-emerald-200 font-mono">
                                  {msg.action.data?.overallPct}%
                                </div>
                                <div className="w-full bg-emerald-950 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, msg.action.data?.overallPct || 0))}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Breakdown Grid */}
                            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                              <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-700/50">
                                <span className="text-emerald-300 font-bold block text-sm">{msg.action.data?.presentWeek || 0}</span>
                                <span className="text-[10px] text-emerald-200">أيام الحضور (أسبوعي)</span>
                              </div>
                              <div className="p-2 rounded-lg bg-red-950/70 border border-red-700/50">
                                <span className="text-red-300 font-bold block text-sm">{msg.action.data?.absentWeek || 0}</span>
                                <span className="text-[10px] text-red-200">أيام الغياب</span>
                              </div>
                              <div className="p-2 rounded-lg bg-amber-950/70 border border-amber-700/50">
                                <span className="text-amber-300 font-bold block text-sm">{msg.action.data?.excusedWeek || 0}</span>
                                <span className="text-[10px] text-amber-200">أيام الاستئذان</span>
                              </div>
                            </div>

                            {/* Cumulative Stats Footer */}
                            <div className="p-2.5 rounded-xl bg-black/30 border border-emerald-900/60 text-[11px] flex items-center justify-between text-slate-300">
                              <span>إجمالي الجلسات المسجلة: <strong className="text-white font-mono">{msg.action.data?.totalRecords || 0}</strong></span>
                              <span>إجمالي الحضور: <strong className="text-emerald-300 font-mono">{msg.action.data?.presentTotal || 0}</strong></span>
                              <span>إجمالي الغياب: <strong className="text-red-300 font-mono">{msg.action.data?.absentTotal || 0}</strong></span>
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 12. Formal Student Quranic Comprehensive Report Card */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_STUDENT_REPORT' && msg.action.data && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}FA`,
                              borderColor: `${accentColor}90`,
                            }}
                            className="mt-3 p-4 sm:p-5 rounded-2xl border-2 text-xs text-emerald-100 space-y-4 shadow-2xl animate-fade-in"
                          >
                            {/* Official Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-700/80 pb-3 gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shadow-md shrink-0">
                                  <Award className="w-6 h-6 text-emerald-900" />
                                </div>
                                <div>
                                  <span className="font-black text-sm sm:text-base text-amber-300 block">
                                    {msg.action.title || `التقرير القرآني الشامل: ${msg.action.data?.student?.name}`}
                                  </span>
                                  <span className="text-[11px] text-emerald-200">
                                    {msg.action.data?.student?.complexName} • حلقة: {msg.action.data?.student?.halaqahName}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const printContent = `
                                      <div dir="rtl" style="font-family: Cairo, Tahoma, sans-serif; padding: 25px; border: 3px double #064e3b; border-radius: 15px; color: #022c22;">
                                        <h2 style="text-align: center; color: #064e3b; margin-bottom: 5px;">🌿 منصة عُمْرَان لإدارة الحلقات القرآنية 🌿</h2>
                                        <h3 style="text-align: center; color: #b45309; margin-top: 0;">تقرير أداء ومستوى قرآني شامل للطالب</h3>
                                        <hr style="border: 1px solid #065f46; margin: 15px 0;" />
                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                                          <tr><td style="padding: 6px; font-weight: bold;">اسم الطالب:</td><td>${msg.action.data?.student?.name}</td><td style="padding: 6px; font-weight: bold;">الحلقة:</td><td>${msg.action.data?.student?.halaqahName}</td></tr>
                                          <tr><td style="padding: 6px; font-weight: bold;">المجمع:</td><td>${msg.action.data?.student?.complexName}</td><td style="padding: 6px; font-weight: bold;">المستوى:</td><td>${msg.action.data?.student?.level}</td></tr>
                                          <tr><td style="padding: 6px; font-weight: bold;">السورة الحالية:</td><td>${msg.action.data?.student?.currentSurahName}</td><td style="padding: 6px; font-weight: bold;">المعدل اليومي:</td><td>${msg.action.data?.student?.dailyNewTarget}</td></tr>
                                          <tr><td style="padding: 6px; font-weight: bold;">نسبة الحضور أسبوعياً:</td><td>${msg.action.data?.weekPct}%</td><td style="padding: 6px; font-weight: bold;">نسبة الحضور الإجمالية:</td><td>${msg.action.data?.overallPct}%</td></tr>
                                          <tr><td style="padding: 6px; font-weight: bold;">رصيد النقاط:</td><td>${msg.action.data?.student?.totalPoints} نقطة</td><td style="padding: 6px; font-weight: bold;">التاريخ:</td><td>${msg.action.data?.generatedDate}</td></tr>
                                        </table>
                                        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 12px; margin-bottom: 15px;">
                                          <strong>ملاحظات وتوجيهات المعلم:</strong>
                                          <p style="margin: 5px 0 0 0;">${msg.action.data?.recitationDetails?.teacherNotes || 'طالب ملتزم ومثابر ومستمر في حفظ كتاب الله الكريم.'}</p>
                                        </div>
                                        <div style="text-align: left; margin-top: 30px; font-size: 13px;">
                                          <span>ختم وإدارة المجمع القرآني</span>
                                        </div>
                                      </div>
                                    `;
                                    const win = window.open('', '_blank');
                                    if (win) {
                                      const titleText = msg.action.data?.student?.name ? `تقرير الطالب ${msg.action.data.student.name}` : 'تقرير الطالب القرآني';
                                      win.document.write('<html><head><title>' + titleText + '</title></head><body>' + printContent + '</body></html>');
                                      win.document.close();
                                      win.focus();
                                      win.print();
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة التقرير</span>
                                </button>
                              </div>
                            </div>

                            {/* 4 Performance Indicators */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-700/60">
                                <span className="text-[10px] text-amber-200 block mb-0.5">المستوى القرآني</span>
                                <span className="text-sm font-black text-white">{msg.action.data?.student?.level || 'متوسط'}</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-700/60">
                                <span className="text-[10px] text-cyan-200 block mb-0.5">السورة الحالية</span>
                                <span className="text-sm font-black text-cyan-300">{msg.action.data?.student?.currentSurahName || 'الفاتحة'}</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-700/60">
                                <span className="text-[10px] text-emerald-200 block mb-0.5">نسبة الحضور</span>
                                <span className="text-sm font-black text-emerald-300 font-mono">{msg.action.data?.weekPct}%</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-700/60">
                                <span className="text-[10px] text-amber-200 block mb-0.5">رصيد النقاط</span>
                                <span className="text-sm font-black text-amber-400 font-mono">{msg.action.data?.student?.totalPoints || 0} ⭐</span>
                              </div>
                            </div>

                            {/* Recitation and Review Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 space-y-1">
                                <span className="text-amber-300 font-bold block">📖 الحفظ الجديد:</span>
                                <p className="text-white">{msg.action.data?.recitationDetails?.newMemorizationAchieved || 'متابعة الورد المعتمد'}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 space-y-1">
                                <span className="text-cyan-300 font-bold block">🔄 المراجعة والتثبيت:</span>
                                <p className="text-white">{msg.action.data?.recitationDetails?.reviewAchieved || 'مراجعة وتثبيت مستمر'}</p>
                              </div>
                            </div>

                            {/* Teacher Notes & Educational Recommendations */}
                            <div className="p-3 rounded-xl bg-black/40 border border-amber-400/40 text-[11px] space-y-1">
                              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>توجيهات المعلم والتوصيات التربوية:</span>
                              </span>
                              <p className="text-emerald-100 leading-relaxed">
                                {msg.action.data?.recitationDetails?.teacherNotes || 'طالب ملتزم بالآداب القرآنية ومواظب على الحضور، يُوصى بالاستمرار في المراجعة اليومية المنتظمة لضمان رسوخ المحفوظ.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 12.1 Multi-Student Quranic Comprehensive Report Card */}
                        {/* (تقرير أربع طلاب، كشف التسميع، تقرير قابل للاستخراج) */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'SHOW_MULTI_STUDENT_REPORT' && msg.action.data && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}FA`,
                              borderColor: `${accentColor}90`,
                            }}
                            className="mt-3 p-4 sm:p-5 rounded-2xl border-2 text-xs text-emerald-100 space-y-4 shadow-2xl animate-fade-in"
                          >
                            {/* Official Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-700/80 pb-3 gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shadow-md shrink-0">
                                  <BookOpen className="w-6 h-6 text-emerald-900" />
                                </div>
                                <div>
                                  <span className="font-black text-sm sm:text-base text-amber-300 block">
                                    {msg.action.title || (msg.action.data?.isCardsRequest ? 'البطاقات التعريفية ومسار الطلاب' : 'التقرير القرآني الشامل للطلاب')}
                                  </span>
                                  <span className="text-[11px] text-emerald-200">
                                    {msg.action.data?.complexName || 'منصة عُمْرَان'} • تاريخ التقرير: {msg.action.data?.dateLabel || msg.action.data?.date || 'معتمد'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                                <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                                  {msg.action.data?.isCardsRequest ? 'بطاقات تعريفية معتمدة' : 'تقرير رسمي معتمد'} ({((msg.action.data?.students || msg.action.data?.rows || []) as any[]).length} طلاب)
                                </span>
                              </div>
                            </div>

                            {/* Direct Export Action Toolbar */}
                            <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-700/50 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-amber-200 text-[11px]">
                                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>تقرير شامل وقابل للاستخراج والطباعة الفورية (مفتوح لأي عدد):</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Print Full Official Report Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const studentsList = ((msg.action?.data?.students || msg.action?.data?.rows || []) as any[]);
                                    const printContent = `
                                      <div dir="rtl" style="font-family: Cairo, Tahoma, sans-serif; padding: 25px; border: 3px double #064e3b; border-radius: 15px; color: #022c22;">
                                        <div style="text-align: center; margin-bottom: 20px;">
                                          <h2 style="color: #064e3b; margin: 0 0 5px 0;">🌿 منصة عُمْرَان لإدارة الحلقات القرآنية 🌿</h2>
                                          <h3 style="color: #b45309; margin: 0 0 5px 0;">${msg.action?.title || 'التقرير القرآني الشامل لأداء الطلاب'}</h3>
                                          <p style="margin: 0; color: #065f46; font-size: 13px;">${msg.action?.data?.complexName || 'المجمع القرآني'} • التاريخ: ${msg.action?.data?.dateLabel || msg.action?.data?.date || ''}</p>
                                        </div>
                                        <hr style="border: 1px solid #065f46; margin: 15px 0;" />
                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                                          <thead>
                                            <tr style="background-color: #064e3b; color: white;">
                                              <th style="padding: 8px; border: 1px solid #065f46; text-align: center;">#</th>
                                              <th style="padding: 8px; border: 1px solid #065f46;">اسم الطالب</th>
                                              <th style="padding: 8px; border: 1px solid #065f46;">الحلقة</th>
                                              <th style="padding: 8px; border: 1px solid #065f46;">المستوى</th>
                                              <th style="padding: 8px; border: 1px solid #065f46;">ما سمّعه (حفظ جديد)</th>
                                              <th style="padding: 8px; border: 1px solid #065f46; text-align: center;">الأوجه</th>
                                              <th style="padding: 8px; border: 1px solid #065f46;">المراجعة والتثبيت</th>
                                              <th style="padding: 8px; border: 1px solid #065f46; text-align: center;">الحضور</th>
                                              <th style="padding: 8px; border: 1px solid #065f46; text-align: center;">النقاط</th>
                                              <th style="padding: 8px; border: 1px solid #065f46;">توجيهات المعلم</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            ${studentsList.map((s, idx) => `
                                              <tr style="background-color: ${idx % 2 === 0 ? '#f0fdf4' : '#ffffff'};">
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #065f46;">${idx + 1}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${s.studentName || s.name || ''}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1;">${s.halaqahName || ''}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1;">${s.level || 'متوسط'}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; color: #047857; font-weight: 600;">${s.newMemorization || '-'}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${s.facesLabel || `${s.facesCount || 0} وجه`}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; color: #0369a1;">${s.reviewAchieved || '-'}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${s.attendanceStatus === 'غائب' ? '#dc2626' : s.attendanceStatus === 'معتذر' ? '#d97706' : '#16a34a'};">${s.attendanceStatus || 'حاضر'}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #b45309;">+${s.pointsEarned ?? s.totalPoints ?? 10}</td>
                                                <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">${s.teacherNotes || 'طالب متميز ومواظب'}</td>
                                              </tr>
                                            `).join('')}
                                          </tbody>
                                        </table>
                                        <div style="display: flex; justify-content: space-between; margin-top: 35px; font-size: 13px;">
                                          <div style="text-align: center;">
                                            <span>توقيع معلم الحلقة: ________________</span>
                                          </div>
                                          <div style="text-align: center;">
                                            <span>ختم وإدارة المجمع القرآني 🌿</span>
                                          </div>
                                        </div>
                                      </div>
                                    `;
                                    const iframe = document.createElement('iframe');
                                    iframe.style.position = 'fixed';
                                    iframe.style.right = '0';
                                    iframe.style.bottom = '0';
                                    iframe.style.width = '0';
                                    iframe.style.height = '0';
                                    iframe.style.border = '0';
                                    document.body.appendChild(iframe);
                                    const doc = iframe.contentWindow?.document || iframe.contentDocument;
                                    if (doc) {
                                      doc.open();
                                      doc.write('<!DOCTYPE html><html dir="rtl"><head><title>' + (msg.action?.title || 'تقرير الطلاب القرآني') + '</title></head><body>' + printContent + '</body></html>');
                                      doc.close();
                                      setTimeout(() => {
                                        iframe.contentWindow?.focus();
                                        iframe.contentWindow?.print();
                                        setTimeout(() => {
                                          if (document.body.contains(iframe)) document.body.removeChild(iframe);
                                        }, 3000);
                                      }, 300);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer transition-all"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة الكشف الشامل 🖨️</span>
                                </button>

                                {/* Export to PDF Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleExportPDF(
                                      msg.action?.title || 'التقرير القرآني الشامل للطلاب',
                                      'recitation_archive',
                                      ((msg.action?.data?.students || msg.action?.data?.rows || []) as any[])
                                    );
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer transition-all"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>تصدير كـ PDF رسمي 📄</span>
                                </button>

                                {/* Export to Excel / Sheets Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleExportGoogleSheets(
                                      msg.action?.title || 'التقرير القرآني الشامل للطلاب',
                                      'recitation_archive',
                                      ((msg.action?.data?.students || msg.action?.data?.rows || []) as any[])
                                    );
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer transition-all"
                                >
                                  <Table2 className="w-3.5 h-3.5" />
                                  <span>تصدير Excel / Sheets 📊</span>
                                </button>

                                {/* Save to Library Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSaveToLibrary(
                                      msg.action?.title || 'التقرير القرآني الشامل للطلاب',
                                      'recitation_archive',
                                      ((msg.action?.data?.students || msg.action?.data?.rows || []) as any[]),
                                      msg.id
                                    );
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer transition-all"
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                  <span>حفظ بالمكتبة 💾</span>
                                </button>
                              </div>
                            </div>

                            {/* Cards for ALL Requested Students (Open Cohort, Any Number) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                              {(((msg.action.data?.students || msg.action.data?.rows || []) as any[])).map((st: any, idx: number) => (
                                <div
                                  key={st.id || st.studentId || idx}
                                  className="p-3.5 rounded-xl bg-black/40 border border-emerald-700/60 space-y-2.5 shadow-lg relative overflow-hidden flex flex-col justify-between"
                                >
                                  <div className="space-y-2.5">
                                    {/* Student Header */}
                                    <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 font-black text-xs flex items-center justify-center shrink-0">
                                          {idx + 1}
                                        </span>
                                        <div>
                                          <span className="font-bold text-white text-xs block">
                                            {st.studentName || st.name}
                                          </span>
                                          <span className="text-[10px] text-emerald-300">
                                            {st.halaqahName} • {st.level || 'متوسط'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                          st.attendanceStatus === 'غائب'
                                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                            : st.attendanceStatus === 'معتذر'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        }`}>
                                          {st.attendanceStatus || 'حاضر'}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                          +{st.pointsEarned ?? st.totalPoints ?? 10} ⭐
                                        </span>
                                      </div>
                                    </div>

                                    {/* Student Quranic Position & Daily Pace */}
                                    <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-200">
                                      <span>📖 السورة الحالية: {st.currentSurah || 'الفاتحة'}</span>
                                      <span className="text-amber-300 font-bold">المعدل: {st.dailyNewTarget || 'نصف وجه'}</span>
                                    </div>

                                    {/* Recitation & Review */}
                                    <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                                      <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-start justify-between gap-2">
                                        <div>
                                          <span className="text-amber-300 font-bold block mb-0.5">📖 ما سمّعه (حفظ جديد):</span>
                                          <span className="text-white font-medium">{st.newMemorization || 'متابعة الورد المقرر'}</span>
                                        </div>
                                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] border border-amber-400/40">
                                          {st.facesLabel || `${st.facesCount || 0} وجه`}
                                        </span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-800/60">
                                        <span className="text-cyan-300 font-bold block mb-0.5">🔄 المراجعة والتثبيت:</span>
                                        <span className="text-white">{st.reviewAchieved || 'مراجعة وتثبيت المحفوظ'}</span>
                                      </div>
                                    </div>

                                    {/* Teacher Notes */}
                                    <div className="p-2 rounded-lg bg-black/50 border border-emerald-800/40 text-[10px] text-emerald-200">
                                      <span className="text-amber-200/90 font-bold block mb-0.5">✍️ توجيهات وملاحظات المعلم:</span>
                                      <span>{st.teacherNotes || 'طالب متميز ومواظب في الحلقة القرآنية.'}</span>
                                    </div>
                                  </div>

                                  {/* Individual Student ID Card Print Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const singleCardContent = `
                                        <div dir="rtl" style="font-family: Cairo, Tahoma, sans-serif; padding: 25px; border: 3px double #064e3b; border-radius: 15px; color: #022c22; max-width: 520px; margin: 0 auto; background: #fff;">
                                          <div style="text-align: center; margin-bottom: 15px;">
                                            <h2 style="color: #064e3b; margin: 0 0 5px 0; font-size: 18px;">🌿 منصة عُمْرَان لإدارة الحلقات القرآنية 🌿</h2>
                                            <h3 style="color: #b45309; margin: 0 0 5px 0; font-size: 15px;">بطاقة الهوية والمسار القرآني للطالب</h3>
                                            <p style="margin: 0; color: #065f46; font-size: 12px;">${msg.action?.data?.complexName || 'المجمع القرآني'}</p>
                                          </div>
                                          <hr style="border: 1px solid #065f46; margin: 10px 0 15px 0;" />
                                          <div style="font-size: 12px; line-height: 1.8;">
                                            <p style="margin: 4px 0;"><strong>اسم الطالب:</strong> ${st.studentName || st.name}</p>
                                            <p style="margin: 4px 0;"><strong>الحلقة القرآنية:</strong> ${st.halaqahName || ''} • <strong>المستوى:</strong> ${st.level || 'متوسط'}</p>
                                            <p style="margin: 4px 0;"><strong>السورة الحالية:</strong> سورة ${st.currentSurah || 'الفاتحة'} • <strong>المعدل اليومي:</strong> ${st.dailyNewTarget || 'نصف وجه'}</p>
                                            <p style="margin: 4px 0;"><strong>ما سمّعه (حفظ جديد):</strong> ${st.newMemorization || 'متابعة الورد المقرر'} (${st.facesLabel || `${st.facesCount || 0} وجه`})</p>
                                            <p style="margin: 4px 0;"><strong>المراجعة والتثبيت:</strong> ${st.reviewAchieved || 'مراجعة وتثبيت المحفوظ'}</p>
                                            <p style="margin: 4px 0;"><strong>رصيد النقاط والتميز:</strong> ${st.pointsEarned ?? st.totalPoints ?? 10} نقطة ⭐</p>
                                            <p style="margin: 4px 0;"><strong>حالة الانضباط والحضور:</strong> ${st.attendanceStatus || 'حاضر'}</p>
                                            <p style="margin: 4px 0;"><strong>توجيهات المعلم:</strong> ${st.teacherNotes || 'طالب متميز ومواظب في الحلقة'}</p>
                                          </div>
                                          <hr style="border: 1px dashed #cbd5e1; margin: 15px 0;" />
                                          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 15px;">
                                            <span>توقيع المعلم: ________________</span>
                                            <span>ختم وإدارة المجمع 🌿</span>
                                          </div>
                                        </div>
                                      `;
                                      const iframe = document.createElement('iframe');
                                      iframe.style.position = 'fixed';
                                      iframe.style.right = '0';
                                      iframe.style.bottom = '0';
                                      iframe.style.width = '0';
                                      iframe.style.height = '0';
                                      iframe.style.border = '0';
                                      document.body.appendChild(iframe);
                                      const doc = iframe.contentWindow?.document || iframe.contentDocument;
                                      if (doc) {
                                        doc.open();
                                        doc.write('<!DOCTYPE html><html dir="rtl"><head><title>بطاقة الطالب: ' + (st.studentName || st.name) + '</title></head><body>' + singleCardContent + '</body></html>');
                                        doc.close();
                                        setTimeout(() => {
                                          iframe.contentWindow?.focus();
                                          iframe.contentWindow?.print();
                                          setTimeout(() => {
                                            if (document.body.contains(iframe)) document.body.removeChild(iframe);
                                          }, 3000);
                                        }, 300);
                                      }
                                    }}
                                    className="w-full mt-2 py-1 px-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-emerald-700/50"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>طباعة البطاقة التعريفية للطالب 🖨️</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ---------------------------------------------------- */}
                        {/* 12. Complex Theme Customizer Navigation Card         */}
                        {/* ---------------------------------------------------- */}
                        {msg.action?.type === 'NAVIGATE_TO_THEME' && (
                          <div
                            style={{
                              backgroundColor: `${primaryColor}F8`,
                              borderColor: accentColor,
                            }}
                            className="mt-3 p-3.5 rounded-2xl border text-xs text-emerald-100 space-y-3 shadow-xl animate-fade-in"
                          >
                            <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                              <span className="font-bold flex items-center gap-1.5" style={{ color: accentColor }}>
                                <Palette className="w-4 h-4 text-amber-300" />
                                <span>تخصيص ثيم وهوية مجمع ({activeComplex?.name || 'القرآني'})</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                هوية بصرية
                              </span>
                            </div>

                            <p className="text-white text-[12px] leading-relaxed">
                              بإمكانك بصفتك المشرف تخصيص ألوان المنصة، واختيار الباقات الإسلامية والملكية، وضبط الشعار والألوان الأساسية لمجمعك من لوحة إعدادات المجمع مباشرة.
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenThemeCustomizer) {
                                  onOpenThemeCustomizer(activeComplex);
                                } else if (onNavigateTab) {
                                  onNavigateTab('settings');
                                }
                                setIsOpen(false);
                              }}
                              style={{
                                backgroundColor: accentColor,
                                color: primaryColor,
                              }}
                              className="w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-98 transition-all"
                            >
                              <Palette className="w-4 h-4" />
                              <span>تغيير ثيم المجمع الآن (فتح نافذة الألوان والهوية مباشرة) 🎨</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex flex-col items-end">
                      <div
                        style={{
                          backgroundColor: cardColor,
                          borderColor: `${accentColor}40`,
                        }}
                        className="p-3 rounded-2xl rounded-tl-xs border text-xs text-amber-200/90 flex items-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-300" />
                        <span>جاري التفكير والتواصل مع الذكاء الاصطناعي القرآني...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Suggestion Chips Bar */}
                <div className="p-2 border-t border-white/10 bg-black/35 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(action.query)}
                      style={{
                        borderColor: `${accentColor}40`,
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-white/5 hover:bg-white/15 text-emerald-100 hover:text-white border shrink-0 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* Message Input Form */}
                <div
                  style={{
                    backgroundColor: `${primaryColor}F0`,
                    borderTopColor: `${accentColor}40`,
                  }}
                  className="p-3 border-t shrink-0"
                >
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSendMessage(inputMessage);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      placeholder="اسأل المساعد، اطلب كشف الطلاب أو الحضور، أو احذف أو سجّل..."
                      disabled={isLoading}
                      className="flex-1 bg-black/40 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-emerald-400/50 focus:outline-none transition-colors"
                      style={{
                        borderColor: `${accentColor}50`,
                      }}
                    />

                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      style={{
                        backgroundColor: accentColor,
                        color: primaryColor,
                      }}
                      className="p-2.5 rounded-xl font-bold flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                      title="إرسال"
                    >
                      <Send className="w-4 h-4 -rotate-90" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
