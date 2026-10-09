import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Users,
  UserCheck,
  BookOpen,
  MessageCircle,
  Award,
  Sparkles,
  Database,
  Sliders,
  LogOut,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
  Layers,
  FileText,
  Headphones,
  UserCog,
  Building2,
  ClipboardList,
  Trophy,
  Clock,
  FolderArchive
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  StudentEvaluation,
  EvaluationCriteria,
  AppSettings,
  ChatMessage,
  UserRole,
  TeacherAccount,
  BehaviorViolation,
  Halaqah,
  Exam,
  ExamSubmission,
  LeaderboardSettings,
  GoogleOAuthConfig,
  SurahRecording,
  RecordingsConfig,
  isTeacherSupervisor,
  isTeacherDeveloper,
  getTeacherComplex,
  getTeacherAllComplexes,
  getTeacherHalaqahsInComplex,
  normalizeTeacherText,
  QuranComplex,
  isHalaqahInComplex,
  getThreePartNameValidation,
  IssuedCertificate,
  StudentListeningLog,
  LibraryDocument
} from './types';
import {
  OmranDataService,
  DEFAULT_CRITERIA,
  DEFAULT_SETTINGS,
  DEFAULT_HALAQAHS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_ATTENDANCE,
  INITIAL_EVALUATIONS,
  DEFAULT_RECORDINGS_CONFIG,
  DEFAULT_COMPLEXES,
  INITIAL_VIOLATIONS,
  INITIAL_EXAMS,
  DEFAULT_LEADERBOARD_SETTINGS,
  OMRAN_CACHE_KEYS,
  getLocalCache,
  getDeletedExamIds
} from './lib/firebase';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Navbar } from './components/Navbar';
import { GoogleWorkspaceService, normalizeArabicText } from './lib/googleWorkspace';
import { LoginModal } from './components/LoginModal';
import { PublicLandingPage } from './components/PublicLandingPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import {
  TopProgressBar,
  LiveSyncButton,
  TabSkeleton,
  GenericTabSkeleton
} from './components/loading/ModernLoadingSuite';
import { ParentPortalView } from './components/ParentPortalView';
import { TeacherManagementModal } from './components/TeacherManagementModal';
import { SettingsModal } from './components/SettingsModal';
import { ComplexManagementModal } from './components/ComplexManagementModal';
import { TeacherMultiComplexModal } from './components/TeacherMultiComplexModal';
import { UnassignedTeacherView } from './components/UnassignedTeacherView';
import { UnassignedStudentView } from './components/UnassignedStudentView';
import { getSurahInfo } from './data/quranData';
import { HomeTab } from './components/tabs/HomeTab';
import { StudentsTab } from './components/tabs/StudentsTab';
import { AttendanceTab } from './components/tabs/AttendanceTab';
import { EvaluationTab } from './components/tabs/EvaluationTab';
import { BehaviorTab } from './components/tabs/BehaviorTab';
import { ParentsWhatsAppTab } from './components/tabs/ParentsWhatsAppTab';
import { ReportsTab } from './components/tabs/ReportsTab';
import { DataBackupTab } from './components/tabs/DataBackupTab';
import { ExamsTab } from './components/tabs/ExamsTab';
import { AccountsTab } from './components/tabs/AccountsTab';
import { CertificatesTab } from './components/tabs/CertificatesTab';
import { LeaderboardTab } from './components/tabs/LeaderboardTab';
import { TeacherAttendanceTab } from './components/tabs/TeacherAttendanceTab';
import { LibraryTab } from './components/tabs/LibraryTab';
import { EditAccountModal } from './components/EditAccountModal';
import { applyComplexThemeToDOM } from './lib/themeUtils';
import { QuranAIAssistant } from './components/assistant/QuranAIAssistant';
import { triggerComplexThemePulse, dispatchHighlightItem } from './utils/highlightHelper';

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    role: UserRole;
    studentId?: string;
    teacherId?: string;
    complexId?: string;
  } | null>(() => {
    const saved = localStorage.getItem('omran_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Public Route State ('landing' | 'login' | 'privacy')
  const [publicRoute, setPublicRoute] = useState<'landing' | 'login' | 'privacy'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const s = window.location.search.toLowerCase();
      const h = window.location.hash.toLowerCase();
      if (p.includes('/privacy') || s.includes('privacy') || h.includes('privacy')) {
        return 'privacy';
      }
      if (p.includes('/login') || s.includes('login') || h.includes('login')) {
        return 'login';
      }
    }
    return 'landing';
  });

  // Keep publicRoute in sync with browser forward/back buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      const s = window.location.search.toLowerCase();
      const h = window.location.hash.toLowerCase();
      if (p.includes('/privacy') || s.includes('privacy') || h.includes('privacy')) {
        setPublicRoute('privacy');
      } else if (p.includes('/login') || s.includes('login') || h.includes('login')) {
        setPublicRoute('login');
      } else {
        setPublicRoute('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigatePublic = (route: 'landing' | 'login' | 'privacy') => {
    setPublicRoute(route);
    if (typeof window !== 'undefined') {
      const target = route === 'privacy' ? '/privacy' : route === 'login' ? '/login' : '/';
      if (window.location.pathname !== target) {
        window.history.pushState(null, '', target);
      }
    }
  };

  // Check URL portal query param for direct parent portal link (?portal=std-1 or ?id=std-1)
  const [portalStudentId, setPortalStudentId] = useState<string | null>(null);
  const [directPortalStudent, setDirectPortalStudent] = useState<Student | null>(null);

  // Active Tab for Admin
  const [activeTab, setActiveTab] = useState<string>('home');
  const [targetStudentForEval, setTargetStudentForEval] = useState<string | undefined>();
  const [targetStudentForWhatsApp, setTargetStudentForWhatsApp] = useState<string | undefined>();
  const [targetStudentForBehavior, setTargetStudentForBehavior] = useState<string | undefined>();

  // Teachers State & Modal
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => {
    try {
      const deleted = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_TEACHERS, []);
      const delSet = new Set(Array.isArray(deleted) ? deleted : []);
      const cached = getLocalCache<TeacherAccount[]>(OMRAN_CACHE_KEYS.TEACHERS, INITIAL_TEACHERS);
      return Array.isArray(cached) ? cached.filter(t => t?.id && !delSet.has(t.id)) : [];
    } catch {
      return INITIAL_TEACHERS;
    }
  });
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  // Halaqahs State & Settings Modal
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>(() => {
    try {
      const deleted = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, []);
      const delSet = new Set(Array.isArray(deleted) ? deleted : []);
      const cached = getLocalCache<Halaqah[]>(OMRAN_CACHE_KEYS.HALAQAHS, DEFAULT_HALAQAHS);
      return Array.isArray(cached) ? cached.filter(h => h?.id && !delSet.has(h.id)) : [];
    } catch {
      return DEFAULT_HALAQAHS;
    }
  });
  const [activeHalaqahId, setActiveHalaqahId] = useState<string>('all');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Complexes State & Complex Management Modal (المجمعات القرآنية)
  const [complexes, setComplexes] = useState<QuranComplex[]>(() => {
    try {
      const deleted = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, []);
      const delSet = new Set(Array.isArray(deleted) ? deleted : []);
      const cached = getLocalCache<QuranComplex[]>(OMRAN_CACHE_KEYS.COMPLEXES, DEFAULT_COMPLEXES);
      return Array.isArray(cached) ? cached.filter(c => c?.id && !delSet.has(c.id)) : [];
    } catch {
      return DEFAULT_COMPLEXES;
    }
  });
  const [isComplexModalOpen, setIsComplexModalOpen] = useState(false);
  const [selectedComplexId, setSelectedComplexId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('omran_selected_complex_id');
      if (saved) return saved;
      const session = localStorage.getItem('omran_session');
      if (session) {
        const u = JSON.parse(session);
        if (u?.complexId) return u.complexId;
      }
      return '';
    } catch {
      return '';
    }
  });
  const [isMultiComplexModalOpen, setIsMultiComplexModalOpen] = useState(false);
  const [newlyAddedComplexName, setNewlyAddedComplexName] = useState<string | null>(null);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);

  // Main Data States with instantaneous LocalCache hydration
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const deleted = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_STUDENTS, []);
      const delSet = new Set(Array.isArray(deleted) ? deleted : []);
      const cached = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, INITIAL_STUDENTS);
      return Array.isArray(cached) ? cached.filter(s => s?.id && !delSet.has(s.id)) : [];
    } catch {
      return [];
    }
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE)
  );
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.EVALUATIONS, INITIAL_EVALUATIONS)
  );
  const [violations, setViolations] = useState<BehaviorViolation[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.VIOLATIONS, INITIAL_VIOLATIONS)
  );
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.CRITERIA, DEFAULT_CRITERIA)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [exams, setExams] = useState<Exam[]>(() => {
    const deleted = getDeletedExamIds();
    const hasInit = typeof localStorage !== 'undefined' && localStorage.getItem('omran_exams_initialized') === 'true';
    const fallback = hasInit ? [] : INITIAL_EXAMS;
    return getLocalCache<Exam[]>(OMRAN_CACHE_KEYS.EXAMS, fallback).filter(e => !deleted.has(e.id));
  });
  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.SUBMISSIONS, [])
  );
  const [leaderboardSettings, setLeaderboardSettings] = useState<LeaderboardSettings | null>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.LEADERBOARD, DEFAULT_LEADERBOARD_SETTINGS)
  );
  const [googleAuthConfig, setGoogleAuthConfig] = useState<GoogleOAuthConfig>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.GOOGLE_AUTH, { isLinked: false })
  );
  const [recordings, setRecordings] = useState<SurahRecording[]>([]);
  const [recordingsConfig, setRecordingsConfig] = useState<RecordingsConfig>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.RECORDINGS_CONFIG, DEFAULT_RECORDINGS_CONFIG)
  );
  const [certificates, setCertificates] = useState<IssuedCertificate[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, [])
  );
  const [listeningLogs, setListeningLogs] = useState<StudentListeningLog[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.LISTENING_LOGS, [])
  );
  const [libraryDocs, setLibraryDocs] = useState<LibraryDocument[]>(() =>
    getLocalCache(OMRAN_CACHE_KEYS.LIBRARY_DOCS, [])
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('مُحدّث سحابياً');

  // Parse URL on initial load and handle direct login links
  useEffect(() => {
    const parseUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      let portalId =
        urlParams.get('portal') ||
        urlParams.get('id') ||
        urlParams.get('student') ||
        urlParams.get('studentId');

      let directUser =
        urlParams.get('u') ||
        urlParams.get('user') ||
        urlParams.get('teacher') ||
        urlParams.get('teacherId');

      if (!portalId && !directUser && window.location.hash) {
        const hash = window.location.hash.replace(/^#\/?/, '');
        const hashParams = new URLSearchParams(hash);
        portalId =
          hashParams.get('portal') ||
          hashParams.get('id') ||
          hashParams.get('student') ||
          (hash.startsWith('portal=') ? hash.split('portal=')[1] : null) ||
          (hash.startsWith('id=') ? hash.split('id=')[1] : null);
        directUser =
          hashParams.get('u') ||
          hashParams.get('user') ||
          hashParams.get('teacher') ||
          (hash.startsWith('u=') ? hash.split('u=')[1] : null);
      }

      if (directUser) {
        const cleanUser = decodeURIComponent(directUser).trim();
        const normUser = normalizeArabicText(cleanUser);

        // 1. Check if matches a teacher (direct teacher login)
        const tList = teachers.length > 0 ? teachers : getLocalCache<TeacherAccount[]>(OMRAN_CACHE_KEYS.TEACHERS, INITIAL_TEACHERS);
        const cleanPhone = cleanUser.replace(/\D/g, '');
        const matchTeacher = tList.find(
          t =>
            t.id === cleanUser ||
            t.id.toLowerCase() === cleanUser.toLowerCase() ||
            t.username.trim().toLowerCase() === cleanUser.toLowerCase() ||
            t.name.trim().toLowerCase() === cleanUser.toLowerCase() ||
            normalizeArabicText(t.name) === normUser ||
            normalizeArabicText(t.username) === normUser ||
            (cleanPhone.length >= 7 && (t.phone || '').replace(/\D/g, '') === cleanPhone)
        );

        if (matchTeacher) {
          const safeUser = {
            username: matchTeacher.name || matchTeacher.username,
            role: 'admin' as const,
            teacherId: matchTeacher.id,
            complexId: matchTeacher.complexId
          };
          setCurrentUser(safeUser);
          localStorage.setItem('omran_session', JSON.stringify(safeUser));
          if (matchTeacher.complexId) {
            setSelectedComplexId(matchTeacher.complexId);
            try { localStorage.setItem('omran_selected_complex_id', matchTeacher.complexId); } catch {}
          }
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        // 2. Check if matches a student
        const sList = students.length > 0 ? students : getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, INITIAL_STUDENTS);
        const matchStudent = sList.find(
          s =>
            s.id === cleanUser ||
            s.id.toLowerCase() === cleanUser.toLowerCase() ||
            s.name.trim() === cleanUser ||
            normalizeArabicText(s.name) === normUser
        );

        if (matchStudent) {
          const safeUser = {
            username: matchStudent.name,
            role: 'student' as const,
            studentId: matchStudent.id
          };
          setCurrentUser(safeUser);
          setPortalStudentId(matchStudent.id);
          localStorage.setItem('omran_session', JSON.stringify(safeUser));
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        // Fallback: try portal lookup
        setPortalStudentId(cleanUser);
      } else if (portalId) {
        setPortalStudentId(decodeURIComponent(portalId));
      }
    };

    parseUrlParams();
    window.addEventListener('popstate', parseUrlParams);
    window.addEventListener('hashchange', parseUrlParams);
    return () => {
      window.removeEventListener('popstate', parseUrlParams);
      window.removeEventListener('hashchange', parseUrlParams);
    };
  }, [teachers, students]);

  // Dedicated effect to resolve portal student directly from storage/firestore if needed
  useEffect(() => {
    if (!portalStudentId) {
      setDirectPortalStudent(null);
      return;
    }

    const resolvePortalStudent = async () => {
      const clean = decodeURIComponent(portalStudentId).trim();
      const match = students.find(
        s =>
          s.id === clean ||
          s.id.toLowerCase() === clean.toLowerCase() ||
          s.name.trim() === clean ||
          s.name.replace(/\s+/g, '') === clean.replace(/\s+/g, '') ||
          s.phone.replace(/\D/g, '') === clean.replace(/\D/g, '') ||
          (s.parentPhones && s.parentPhones.some(p => p.replace(/\D/g, '') === clean.replace(/\D/g, '')))
      );
      if (match) {
        setDirectPortalStudent(match);
        return;
      }

      const fetched = await OmranDataService.findStudentByIdOrQuery(portalStudentId);
      if (fetched) {
        setDirectPortalStudent(fetched);
        setStudents(prev => (prev.some(s => s.id === fetched.id) ? prev : [...prev, fetched]));
      }
    };

    resolvePortalStudent();
  }, [portalStudentId, students]);

  // Load all data from Firestore / LocalCache with non-blocking live sync
  const loadAllData = async (isManualSync = false) => {
    setIsSyncing(true);
    // Safety auto-dismiss: ensure loading state never hangs
    const safetyTimer = setTimeout(() => {
      setIsSyncing(false);
      setIsLoadingData(false);
    }, 1800);

    try {
      if (isManualSync) {
        // Auto-reconcile in background only on explicit manual sync
        OmranDataService.reconcileAndSyncStudentsWithHalaqahs().catch(() => {});
      }

      const [
        loadedStudents,
        loadedAttendance,
        loadedEvaluations,
        loadedCriteria,
        loadedSettings,
        loadedChats,
        loadedTeachers,
        loadedViolations,
        loadedHalaqahs,
        loadedExams,
        loadedSubmissions,
        loadedLeaderboard,
        loadedGoogleOAuth,
        loadedRecordings,
        loadedRecordingsConfig,
        loadedComplexes,
        loadedCertificates,
        loadedListeningLogs,
        loadedLibraryDocs
      ] = await Promise.all([
        OmranDataService.loadStudents(),
        OmranDataService.loadAttendance(),
        OmranDataService.loadEvaluations(),
        OmranDataService.loadCriteria(),
        OmranDataService.loadSettings(),
        OmranDataService.loadChats(),
        OmranDataService.loadTeachers(),
        OmranDataService.loadViolations(),
        OmranDataService.loadHalaqahs(),
        OmranDataService.loadExams(),
        OmranDataService.loadSubmissions(),
        OmranDataService.loadLeaderboardSettings(),
        OmranDataService.loadGoogleOAuthConfig(),
        OmranDataService.loadRecordings(),
        OmranDataService.loadRecordingsConfig(),
        OmranDataService.loadComplexes(),
        OmranDataService.loadCertificates(),
        OmranDataService.loadListeningLogs(),
        OmranDataService.loadLibraryDocuments()
      ]);

      setStudents(loadedStudents);
      setAttendance(loadedAttendance);
      setEvaluations(loadedEvaluations);
      setCriteria(loadedCriteria);
      setSettings(loadedSettings);
      setChatHistory(loadedChats);
      setTeachers(loadedTeachers);
      setViolations(loadedViolations);
      setHalaqahs(loadedHalaqahs);
      setExams(loadedExams);
      setSubmissions(loadedSubmissions);
      setLeaderboardSettings(loadedLeaderboard);
      setGoogleAuthConfig(loadedGoogleOAuth);
      setRecordings(loadedRecordings);
      setRecordingsConfig(loadedRecordingsConfig);
      setComplexes(loadedComplexes);
      setCertificates(loadedCertificates);
      setListeningLogs(loadedListeningLogs);
      setLibraryDocs(loadedLibraryDocs);

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setLastSyncedTime(`مُحدّث (${timeStr})`);
    } catch (e) {
      console.warn('Initial data load notice:', e);
    } finally {
      clearTimeout(safetyTimer);
      setIsLoadingData(false);
      setIsSyncing(false);
    }
  };

  // Identify Teacher and Supervisor Roles (MUST run before any conditional returns)
  const currentTeacher = useMemo(() => {
    if (!currentUser || currentUser.role !== 'admin') return null;
    const cleanUser = currentUser.username.trim().toLowerCase();
    const tid = currentUser.teacherId;
    if (tid) {
      const matchById = teachers.find(t => t.id === tid);
      if (matchById) return matchById;
    }
    return teachers.find(
      t =>
        t.username.trim().toLowerCase() === cleanUser ||
        t.name.trim().toLowerCase() === cleanUser ||
        normalizeArabicText(t.name) === normalizeArabicText(currentUser.username)
    ) || null;
  }, [currentUser, teachers]);

  // Check Developer / System Administrator
  const isDeveloper = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role !== 'admin' && (currentUser.role as string) !== 'developer') return false;
    if (currentTeacher) {
      if (isTeacherDeveloper(currentTeacher, currentUser)) return true;
    }
    const cleanUser = (currentUser.username || '').trim().toLowerCase();
    return (
      cleanUser === 'admin' ||
      cleanUser === 'developer' ||
      cleanUser === 'montaser' ||
      cleanUser.includes('منتصر') ||
      cleanUser.includes('مبرمج') ||
      cleanUser.includes('مطور') ||
      currentUser.teacherId === 'teacher-1' ||
      currentUser.teacherId === 'dev-1'
    );
  }, [currentUser, currentTeacher]);

  // STRICT IMMUNITY: Protect teachers and supervisors from demotion, without hijacking other teachers' accounts
  useEffect(() => {
    if (!currentUser) return;
    const cleanUser = currentUser.username.trim().toLowerCase();
    const isMontaserOrDev =
      cleanUser === 'admin' ||
      cleanUser === 'developer' ||
      cleanUser === 'montaser' ||
      cleanUser.includes('منتصر');

    // 1. Resolve the specific teacher account belonging to the active session
    let matchedTeacher: TeacherAccount | undefined;
    if (currentUser.teacherId) {
      matchedTeacher = teachers.find(t => t.id === currentUser.teacherId);
    }
    if (!matchedTeacher) {
      matchedTeacher = teachers.find(
        t =>
          t.username.trim().toLowerCase() === cleanUser ||
          t.name.trim().toLowerCase() === cleanUser ||
          normalizeArabicText(t.name) === normalizeArabicText(currentUser.username)
      );
    }

    // 2. Only if the logged in user is explicitly developer/Montaser and no other teacher was matched
    if (!matchedTeacher && isMontaserOrDev) {
      matchedTeacher = teachers.find(t => t.role === 'developer' || t.id === 'teacher-1');
    }

    // 3. If a valid teacher account is matched, preserve their role as admin and ensure no demotion to student
    if (matchedTeacher) {
      const needsUpdate =
        currentUser.role !== 'admin' ||
        Boolean(currentUser.studentId) ||
        currentUser.teacherId !== matchedTeacher.id ||
        (matchedTeacher.complexId && currentUser.complexId !== matchedTeacher.complexId);

      if (needsUpdate) {
        console.warn('Preserving exact teacher account session integrity for:', matchedTeacher.name);
        const safeUser = {
          username: matchedTeacher.name || matchedTeacher.username,
          role: 'admin' as const,
          teacherId: matchedTeacher.id,
          complexId: matchedTeacher.complexId
        };
        setCurrentUser(safeUser);
        localStorage.setItem('omran_session', JSON.stringify(safeUser));
        if (matchedTeacher.complexId) {
          setSelectedComplexId(matchedTeacher.complexId);
          try {
            localStorage.setItem('omran_selected_complex_id', matchedTeacher.complexId);
          } catch {}
        }
      }
    }
  }, [currentUser, teachers]);

  // 1. Resolve active student for parent/student portal if active
  const activePortalStudent = useMemo<Student | null>(() => {
    if (portalStudentId) {
      return (
        directPortalStudent ||
        students.find(
          s =>
            s.id === portalStudentId ||
            s.id.toLowerCase() === portalStudentId.toLowerCase() ||
            s.name.trim() === portalStudentId.trim() ||
            s.name.replace(/\s+/g, '') === portalStudentId.replace(/\s+/g, '') ||
            s.phone.replace(/\D/g, '') === portalStudentId.replace(/\D/g, '') ||
            (s.parentPhones && s.parentPhones.some(p => p.replace(/\D/g, '') === portalStudentId.replace(/\D/g, '')))
        ) ||
        null
      );
    }
    if (currentUser?.role === 'student') {
      return (
        students.find(
          s =>
            (currentUser.studentId && s.id === currentUser.studentId) ||
            (currentUser.studentId && s.id.toLowerCase() === currentUser.studentId.toLowerCase()) ||
            s.name.trim() === currentUser.username.trim() ||
            normalizeArabicText(s.name) === normalizeArabicText(currentUser.username)
        ) || null
      );
    }
    return null;
  }, [portalStudentId, directPortalStudent, students, currentUser]);

  // 1. Determine if current user is supervisor or higher (developer has full rights, supervisor manages their complex)
  const isSupervisor = useMemo(() => {
    if (!currentUser || currentUser.role !== 'admin') return false;
    if (isDeveloper) return true;
    if (currentTeacher) {
      // STRICT: If role is explicitly teacher, they are strictly a regular teacher, NEVER supervisor
      if (currentTeacher.role === 'teacher') return false;
      if (currentTeacher.role === 'supervisor') return true;
      if (currentTeacher.supervisedComplexId) return true;
      if (complexes.some(c =>
        (c.supervisorTeacherId && c.supervisorTeacherId === currentTeacher.id) ||
        (c.supervisorTeacherName && currentTeacher.name && normalizeTeacherText(c.supervisorTeacherName) === normalizeTeacherText(currentTeacher.name))
      )) return true;
      return isTeacherSupervisor(currentTeacher);
    }
    const cleanUser = currentUser.username.trim().toLowerCase();
    return (
      cleanUser === 'admin' ||
      cleanUser === 'developer' ||
      cleanUser === 'المشرف العام'
    );
  }, [currentUser, isDeveloper, currentTeacher, complexes]);

  // 2. All complexes associated with current teacher (or all complexes if developer)
  const availableTeacherComplexes = useMemo(() => {
    if (!currentUser || currentUser.role !== 'admin') return complexes;
    return getTeacherAllComplexes(currentTeacher, teachers, complexes, halaqahs, isDeveloper);
  }, [currentUser, currentTeacher, teachers, complexes, halaqahs, isDeveloper]);

  // 3. Raw halaqahs directly assigned to teacher across all complexes
  const rawTeacherAssignedHalaqahs = useMemo(() => {
    if (!currentTeacher) return [];
    const teacherId = currentTeacher.id;
    const cleanTeacherName = normalizeTeacherText(currentTeacher.name || '');
    const cleanTeacherUser = normalizeTeacherText(currentTeacher.username || '');

    const result: Halaqah[] = [];
    halaqahs.forEach(h => {
      const hTeacherName = normalizeTeacherText(h.primaryTeacherName || '');
      const isPrimary =
        h.primaryTeacherId === teacherId ||
        (h.teacherIds && h.teacherIds.includes(teacherId)) ||
        (hTeacherName && (hTeacherName === cleanTeacherName || hTeacherName === cleanTeacherUser)) ||
        (h.teacherNames && h.teacherNames.some(tn => {
          const norm = normalizeTeacherText(tn);
          return norm === cleanTeacherName || norm === cleanTeacherUser;
        }));

      const isAssigned =
        currentTeacher.halaqahId === h.id ||
        (currentTeacher.halaqahIds && currentTeacher.halaqahIds.includes(h.id)) ||
        (currentTeacher.halaqahName && normalizeTeacherText(currentTeacher.halaqahName) === normalizeTeacherText(h.name)) ||
        (currentTeacher.halaqahNames && currentTeacher.halaqahNames.some(hn => normalizeTeacherText(hn) === normalizeTeacherText(h.name)));

      if (isPrimary || isAssigned) {
        const parentComplex = complexes.find(c => c.id === h.complexId);
        result.push({
          ...h,
          complexName: parentComplex?.name || h.complexName || 'المجمع'
        });
      }
    });
    return result;
  }, [currentTeacher, halaqahs, complexes]);

  // 4. Active Complex:
  // 1. If portal student or direct student logged in: resolved strictly to student's complex
  // 2. If developer or supervisor: specifically selected complex (or first complex)
  // 3. For regular teacher: aligned with their active halaqah's complex or assigned complex
  const activeComplex = useMemo<QuranComplex | null>(() => {
    if (complexes.length === 0) return null;
    if (activePortalStudent) {
      if (activePortalStudent.complexId) {
        const match = complexes.find(c => c.id === activePortalStudent.complexId);
        if (match) return match;
      }
      if (activePortalStudent.halaqahId) {
        const hMatch = halaqahs.find(h => h.id === activePortalStudent.halaqahId);
        if (hMatch?.complexId) {
          const cMatch = complexes.find(c => c.id === hMatch.complexId);
          if (cMatch) return cMatch;
        }
      }
    }

    // If teacher has an active halaqah selected, strictly align with that halaqah's complex
    if (currentTeacher && !isDeveloper && activeHalaqahId && activeHalaqahId !== 'all') {
      const activeH = halaqahs.find(h => h.id === activeHalaqahId);
      if (activeH?.complexId) {
        const cMatch = complexes.find(c => c.id === activeH.complexId);
        if (cMatch) return cMatch;
      }
    }

    // Developer can switch to any complex freely
    if (isDeveloper) {
      if (selectedComplexId && selectedComplexId !== 'all') {
        const match = complexes.find(c => c.id === selectedComplexId);
        if (match) return match;
      }
      return complexes[0] || null;
    }

    // Supervisor: allow switching to complexes they supervise or manage
    if (isSupervisor && selectedComplexId && selectedComplexId !== 'all') {
      const match = complexes.find(c => c.id === selectedComplexId);
      if (match) return match;
    }

    // Teacher with assigned halaqahs: prioritize complex of assigned halaqahs
    if (rawTeacherAssignedHalaqahs.length > 0) {
      const firstH = rawTeacherAssignedHalaqahs[0];
      if (firstH.complexId) {
        const cMatch = complexes.find(c => c.id === firstH.complexId);
        if (cMatch) return cMatch;
      }
    }

    if (currentTeacher?.supervisedComplexId) {
      const cMatch = complexes.find(c => c.id === currentTeacher.supervisedComplexId);
      if (cMatch) return cMatch;
    }

    if (currentTeacher?.complexId) {
      const cMatch = complexes.find(c => c.id === currentTeacher.complexId);
      if (cMatch) return cMatch;
    }

    if (currentUser?.complexId) {
      const cMatch = complexes.find(c => c.id === currentUser.complexId);
      if (cMatch) return cMatch;
    }

    return availableTeacherComplexes[0] || complexes[0] || null;
  }, [
    complexes,
    activePortalStudent,
    selectedComplexId,
    isDeveloper,
    isSupervisor,
    currentUser,
    currentTeacher,
    availableTeacherComplexes,
    rawTeacherAssignedHalaqahs,
    activeHalaqahId,
    halaqahs
  ]);

  // Complex scope resolution for teacher/supervisor:
  const supervisedComplex = activeComplex;

  const targetHalaqahIdRef = useRef<string | null>(null);

  // Safety watchdog: ensure syncing state never hangs
  useEffect(() => {
    if (isSyncing) {
      const t = setTimeout(() => setIsSyncing(false), 1600);
      return () => clearTimeout(t);
    }
  }, [isSyncing]);

  // Synchronize OmranDataService active database whenever activeComplex changes,
  // and bind real-time subscriptions to the active database instance!
  useEffect(() => {
    let isMounted = true;

    // 1. Tell OmranDataService to set active complex and resolve its Firestore instance
    OmranDataService.setActiveComplex(activeComplex);

    // 2. Perform connection check & seed if empty for this database
    OmranDataService.testConnection().catch(() => {});

    // 3. Load all data from the active database
    loadAllData();

    // 4. Attach Firestore real-time subscriptions for the active database
    const unsubStudents = OmranDataService.subscribeStudents(newStudents => {
      if (isMounted) setStudents(newStudents);
    });
    const unsubAttendance = OmranDataService.subscribeAttendance(newAtt => {
      if (isMounted) setAttendance(newAtt);
    });
    const unsubEvaluations = OmranDataService.subscribeEvaluations(newEvals => {
      if (isMounted) setEvaluations(newEvals);
    });
    const unsubCriteria = OmranDataService.subscribeCriteria(newCrit => {
      if (isMounted) setCriteria(newCrit);
    });
    const unsubSettings = OmranDataService.subscribeSettings(newSet => {
      if (isMounted) setSettings(newSet);
    });
    const unsubTeachers = OmranDataService.subscribeTeachers(newTeach => {
      if (isMounted) setTeachers(newTeach);
    });
    const unsubViolations = OmranDataService.subscribeViolations(newViolations => {
      if (isMounted) setViolations(newViolations);
    });
    const unsubHalaqahs = OmranDataService.subscribeHalaqahs(newHalaqahs => {
      if (isMounted) setHalaqahs(newHalaqahs);
    });
    // complexes subscription always listens to Central DB
    const unsubComplexes = OmranDataService.subscribeComplexes(newComplexes => {
      if (isMounted) setComplexes(newComplexes);
    });
    const unsubExams = OmranDataService.subscribeExams(newExams => {
      if (isMounted) setExams(newExams);
    });
    const unsubSubmissions = OmranDataService.subscribeSubmissions(newSubs => {
      if (isMounted) setSubmissions(newSubs);
    });
    const unsubLeaderboard = OmranDataService.subscribeLeaderboardSettings(newLead => {
      if (isMounted) setLeaderboardSettings(newLead);
    });
    const unsubGoogle = OmranDataService.subscribeGoogleOAuthConfig(newGoogle => {
      if (isMounted) setGoogleAuthConfig(newGoogle);
    });
    const unsubRecordings = OmranDataService.subscribeRecordings(newRecordings => {
      if (isMounted) setRecordings(newRecordings);
    });
    const unsubRecordingsConfig = OmranDataService.subscribeRecordingsConfig(newConfig => {
      if (isMounted) setRecordingsConfig(newConfig);
    });
    const unsubCertificates = OmranDataService.subscribeCertificates(newCerts => {
      if (isMounted) setCertificates(newCerts);
    });
    const unsubListeningLogs = OmranDataService.subscribeListeningLogs(newLogs => {
      if (isMounted) setListeningLogs(newLogs);
    });
    const unsubLibraryDocs = OmranDataService.subscribeLibraryDocuments(newDocs => {
      if (isMounted) setLibraryDocs(newDocs);
    });
    const unsubTombstones = OmranDataService.subscribeTombstones(tombstones => {
      if (!isMounted) return;
      setStudents(prev => prev.filter(s => s?.id && !tombstones.deletedStudents.has(s.id)));
      setTeachers(prev => prev.filter(t => t?.id && !tombstones.deletedTeachers.has(t.id)));
      setHalaqahs(prev => prev.filter(h => h?.id && !tombstones.deletedHalaqahs.has(h.id)));
      setComplexes(prev => prev.filter(c => c?.id && !tombstones.deletedComplexes.has(c.id)));
      if (currentTeacher && tombstones.deletedTeachers.has(currentTeacher.id)) {
        handleLogout();
      }
    });

    const handleBroadcastUpdate = (e: any) => {
      const type = e.detail?.type;
      const payload = e.detail?.payload;
      if (!isMounted || !type) return;

      if (type === 'library' && payload) {
        setLibraryDocs(prev => [payload, ...prev.filter(d => d.id !== payload.id)]);
      } else if (type === 'library-deleted' && payload) {
        setLibraryDocs(prev => prev.filter(d => d.id !== payload));
      } else if (type === 'certificate' && payload) {
        setCertificates(prev => [payload, ...prev.filter(c => c.id !== payload.id)]);
      } else if (type === 'certificates-batch' && Array.isArray(payload)) {
        setCertificates(prev => {
          const map = new Map<string, IssuedCertificate>();
          for (const c of payload) map.set(c.id, c);
          for (const c of prev) if (!map.has(c.id)) map.set(c.id, c);
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      } else if (type === 'certificate-deleted' && payload) {
        setCertificates(prev => prev.filter(c => c.id !== payload));
      } else if (type === 'exam' && payload) {
        setExams(prev => [payload, ...prev.filter(x => x.id !== payload.id)]);
      } else if (type === 'exam-deleted' && payload) {
        setExams(prev => prev.filter(x => x.id !== payload));
      } else if (type === 'complex' && payload) {
        setComplexes(prev => {
          const idx = prev.findIndex(c => c.id === payload.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = payload;
            return next;
          }
          return [payload, ...prev];
        });
      } else if (type === 'complex-deleted' && payload) {
        setComplexes(prev => prev.filter(c => c.id !== payload));
      } else if (type === 'settings' && payload) {
        setSettings(prev => ({ ...prev, ...payload }));
      } else if ((type === 'attendance-records' || type === 'attendance') && Array.isArray(payload)) {
        setAttendance(prev => {
          const map = new Map<string, AttendanceRecord>();
          for (const a of prev) if (a?.id) map.set(a.id, a);
          for (const a of payload) if (a?.id) map.set(a.id, a);
          return Array.from(map.values());
        });
      } else if (type === 'library' && payload) {
        setLibraryDocs(prev => [payload, ...prev.filter(d => d.id !== payload.id)]);
      } else if (type === 'library-deleted' && payload) {
        setLibraryDocs(prev => prev.filter(d => d.id !== payload));
      } else if (type === 'certificate' && payload) {
        setCertificates(prev => [payload, ...prev.filter(c => c.id !== payload.id)]);
      } else if (type === 'student' && payload) {
        setStudents(prev => [payload, ...prev.filter(s => s.id !== payload.id)]);
      } else if (type === 'student-deleted' && payload) {
        setStudents(prev => prev.filter(s => s.id !== payload));
      } else if (type === 'halaqah' && payload) {
        setHalaqahs(prev => [payload, ...prev.filter(h => h.id !== payload.id)]);
      } else if (type === 'exam' && payload) {
        setExams(prev => [payload, ...prev.filter(e => e.id !== payload.id)]);
      } else if (type === 'exam-deleted' && payload) {
        setExams(prev => prev.filter(e => e.id !== payload));
      } else if (type === 'evaluation' && payload) {
        setEvaluations(prev => [payload, ...prev.filter(ev => ev.id !== payload.id)]);
      }
    };

    window.addEventListener('omran:data-updated', handleBroadcastUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('omran:data-updated', handleBroadcastUpdate);
      unsubStudents();
      unsubAttendance();
      unsubEvaluations();
      unsubCriteria();
      unsubSettings();
      unsubTeachers();
      unsubViolations();
      unsubHalaqahs();
      unsubComplexes();
      unsubExams();
      unsubSubmissions();
      unsubLeaderboard();
      unsubGoogle();
      unsubRecordings();
      unsubRecordingsConfig();
      unsubCertificates();
      unsubListeningLogs();
      unsubLibraryDocs();
      unsubTombstones();
    };
  }, [activeComplex?.id, activeComplex?.databaseConfig?.projectId, activeComplex?.databaseConfig?.databaseId]);

  // Real-time synchronization of Browser Tab Title, Favicon, and Complex Theme
  useEffect(() => {
    // 1. Dynamic Browser Tab Title (عنوان تبويب المتصفح على اسم المجمع)
    const complexDisplayName = activeComplex?.name || settings.complexName || 'مجمع تحفيظ القرآن الكريم';
    document.title = complexDisplayName;

    // 2. Dynamic Browser Tab Favicon (شعار المجمع كأيقونة تبويب المتصفح)
    let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    if (activeComplex?.logoUrl) {
      faviconLink.href = activeComplex.logoUrl;
    } else {
      faviconLink.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fbbf24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`;
    }

    // 3. Dynamic Complex Theme Colors on Document Root & Body
    // Strictly: Only apply complex theme if inside a complex (logged-in user or active portal student).
    // Outside the complex (landing page, login modal, privacy), strictly resets to natural platform colors (#022c22 & #fbbf24)!
    const isInsideComplex = Boolean(currentUser || activePortalStudent);
    applyComplexThemeToDOM(activeComplex?.theme, isInsideComplex);
  }, [activeComplex, settings.complexName, currentUser, activePortalStudent]);

  // Permission to switch complexes:
  // Developers and supervisors can switch between complexes freely to manage them.
  const canSwitchComplex = useMemo(() => {
    if (isDeveloper) return true;
    if (isSupervisor) return complexes.length > 1;
    if (currentTeacher && (currentTeacher.role === 'supervisor' || isTeacherSupervisor(currentTeacher))) return complexes.length > 1;
    return availableTeacherComplexes.length > 1;
  }, [isDeveloper, isSupervisor, currentTeacher, availableTeacherComplexes, complexes.length]);

  // Scoped complexes: Programmer & Supervisor see all complexes to switch between them freely; teacher sees their assigned complexes
  const scopedComplexes = useMemo(() => {
    if (isDeveloper || isSupervisor) return complexes;
    return availableTeacherComplexes.length > 0 ? availableTeacherComplexes : (activeComplex ? [activeComplex] : complexes);
  }, [isDeveloper, isSupervisor, complexes, activeComplex, availableTeacherComplexes]);

  // Scoped halaqahs: Strictly sees halaqahs of their ACTIVE QuranComplex!
  // ONLY if developer explicitly chose the 'all' view across complexes does it see ALL halaqahs!
  const scopedHalaqahs = useMemo(() => {
    if (!activeComplex) return halaqahs;
    if (isDeveloper && selectedComplexId === 'all') return halaqahs;

    return halaqahs.filter(h => isHalaqahInComplex(h, activeComplex, complexes, students, teachers));
  }, [activeComplex, halaqahs, complexes, isDeveloper, selectedComplexId, students, teachers]);

  const scopedHalaqahIds = useMemo(() => {
    return new Set(scopedHalaqahs.map(h => h.id));
  }, [scopedHalaqahs]);

  // Assigned halaqahs for current user:
  // If teacher has assigned halaqahs across one or more complexes, ALWAYS include them with complexName attached.
  const assignedHalaqahs = useMemo(() => {
    if (isDeveloper) {
      return scopedHalaqahs;
    }
    if (!currentTeacher) {
      return [];
    }
    if (rawTeacherAssignedHalaqahs.length > 0) {
      return rawTeacherAssignedHalaqahs;
    }
    if (isSupervisor) {
      return scopedHalaqahs;
    }
    if (scopedHalaqahs.length === 1) {
      return scopedHalaqahs;
    }
    return [];
  }, [isDeveloper, isSupervisor, scopedHalaqahs, currentTeacher, rawTeacherAssignedHalaqahs]);

  // Scoped students: If programmer and 'all' chosen, sees all students.
  // Otherwise, STRICTLY isolated to the active complex's halaqahs and students!
  const scopedStudents = useMemo(() => {
    if (!activeComplex) return students;
    if (isDeveloper && selectedComplexId === 'all') return students;

    const halaqahMap = new Map<string, Halaqah>(halaqahs.map(h => [h.id, h]));
    const activeH = halaqahs.find(h => h.id === activeHalaqahId);

    return students.filter(s => {
      // 0. Guaranteed visibility: If teacher is viewing, NEVER hide students belonging to their active or assigned halaqahs!
      if (currentTeacher && !isDeveloper) {
        if (activeHalaqahId && activeHalaqahId !== 'all') {
          if (s.halaqahId === activeHalaqahId) return true;
          if (activeH && s.halaqahName && normalizeTeacherText(s.halaqahName) === normalizeTeacherText(activeH.name)) return true;
        }
        const isInAssigned = assignedHalaqahs.some(h =>
          h.id === s.halaqahId ||
          (s.halaqahName && normalizeTeacherText(h.name) === normalizeTeacherText(s.halaqahName))
        );
        if (isInAssigned) return true;
      }

      // 1. Authoritative: If student belongs to a halaqah, that halaqah's complex strictly decides where the student appears!
      if (s.halaqahId && s.halaqahId !== 'all' && s.halaqahId !== 'unassigned') {
        const studentHalaqah = halaqahMap.get(s.halaqahId);
        if (studentHalaqah) {
          return isHalaqahInComplex(studentHalaqah, activeComplex, complexes, students, teachers);
        }
      }

      // 1.5 Student matches halaqah by name
      if (s.halaqahName && s.halaqahName.trim() !== '') {
        const normStHal = normalizeTeacherText(s.halaqahName);
        const matchingH = halaqahs.find(h => normalizeTeacherText(h.name) === normStHal);
        if (matchingH) {
          return isHalaqahInComplex(matchingH, activeComplex, complexes, students, teachers);
        }
      }

      // 2. Direct assignment to a complex (for students with unassigned halaqah)
      if (s.complexId) {
        return s.complexId === activeComplex.id || (s.complexName && normalizeTeacherText(s.complexName) === normalizeTeacherText(activeComplex.name));
      }

      // 3. Fallback: only primary complex
      return complexes[0]?.id === activeComplex.id;
    });
  }, [isDeveloper, selectedComplexId, students, halaqahs, activeComplex, complexes, teachers, currentTeacher, activeHalaqahId, assignedHalaqahs]);

  const scopedStudentIds = useMemo(() => {
    return new Set(scopedStudents.map(s => s.id));
  }, [scopedStudents]);

  // Scoped teachers: Teachers belonging strictly to the active complex
  // STRICT RULE: Supervisor CANNOT see the Programmer in the complex teachers list!
  const scopedTeachers = useMemo(() => {
    if (!supervisedComplex) {
      return isDeveloper ? teachers : teachers.filter(t => !isTeacherDeveloper(t));
    }
    if (isDeveloper && selectedComplexId === 'all') return teachers;
    const matched = teachers.filter(t => {
      // If current user is supervisor (NOT developer), programmer is NEVER visible in complex teachers list!
      if (!isDeveloper && isTeacherDeveloper(t)) {
        return false;
      }
      if (currentTeacher && t.id === currentTeacher.id) return true;
      if (t.complexId === supervisedComplex.id) return true;
      if (t.complexIds && t.complexIds.includes(supervisedComplex.id)) return true;
      if (t.halaqahId && scopedHalaqahIds.has(t.halaqahId)) return true;
      if (t.halaqahIds && t.halaqahIds.some(hid => scopedHalaqahIds.has(hid))) return true;
      return false;
    });
    if (matched.length === 0 && isDeveloper) return teachers;
    return matched;
  }, [isDeveloper, selectedComplexId, teachers, supervisedComplex, currentTeacher, scopedHalaqahIds]);

  // Handle switching halaqahs: If teacher selects a halaqah belonging to another complex, automatically switch active complex too!
  const handleSwitchHalaqah = (newHalaqahId: string) => {
    targetHalaqahIdRef.current = newHalaqahId;
    setActiveHalaqahId(newHalaqahId);
    if (newHalaqahId !== 'all') {
      const targetH = halaqahs.find(h => h.id === newHalaqahId);
      if (targetH && targetH.complexId && targetH.complexId !== activeComplex?.id) {
        setSelectedComplexId(targetH.complexId);
        try {
          localStorage.setItem('omran_selected_complex_id', targetH.complexId);
        } catch (e) {}
      }
    }
  };

  // Switch between complexes seamlessly
  const handleSwitchComplex = (newComplexId: string) => {
    // Only permitted if developer, or teacher linked to multiple complexes
    if (!canSwitchComplex) return;

    setSelectedComplexId(newComplexId);
    try {
      localStorage.setItem('omran_selected_complex_id', newComplexId);
    } catch (e) {
      // ignore
    }
    const targetComplex = complexes.find(c => c.id === newComplexId);
    if (targetComplex) {
      const assignedInTarget = getTeacherHalaqahsInComplex(currentTeacher, targetComplex.id, halaqahs, teachers, isSupervisor, complexes, students);
      if (isSupervisor || assignedInTarget.length === 0) {
        setActiveHalaqahId('all');
      } else {
        setActiveHalaqahId(assignedInTarget[0].id);
      }
    }
  };

  // Multi-complex detection & welcome alert when teacher is added to another complex or enters
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!canSwitchComplex || availableTeacherComplexes.length <= 1) return;
    if (isDeveloper) return; // Developers don't need intrusive popups for complex list

    const teacherKey = currentTeacher?.id || currentTeacher?.username || currentUser.username;
    const storageKeyKnown = `omran_known_complexes_${teacherKey}`;
    const storageKeySkip = `omran_skip_complex_welcome_${teacherKey}`;

    let knownIds: string[] = [];
    try {
      const stored = localStorage.getItem(storageKeyKnown);
      if (stored) knownIds = JSON.parse(stored);
    } catch (e) {
      knownIds = [];
    }

    const currentIds = availableTeacherComplexes.map(c => c.id);
    const newlyAdded = availableTeacherComplexes.find(c => !knownIds.includes(c.id));
    const skipWelcome = localStorage.getItem(storageKeySkip) === 'true';

    if (newlyAdded && knownIds.length > 0) {
      setNewlyAddedComplexName(newlyAdded.name);
      setIsMultiComplexModalOpen(true);
      try {
        localStorage.setItem(storageKeyKnown, JSON.stringify(currentIds));
      } catch (e) {}
    } else if (!skipWelcome && knownIds.length === 0) {
      setIsMultiComplexModalOpen(true);
      try {
        localStorage.setItem(storageKeyKnown, JSON.stringify(currentIds));
      } catch (e) {}
    } else {
      try {
        localStorage.setItem(storageKeyKnown, JSON.stringify(currentIds));
      } catch (e) {}
    }
  }, [currentUser, currentTeacher, availableTeacherComplexes]);

  // Scoped settings for the active complex:
  // If user belongs to a separate complex, ensures halaqahName and teacherName strictly
  // reflect their complex and active halaqah/teacher — with ZERO mention of Zubair or Mohamed Montaser.
  const scopedSettings = useMemo<AppSettings>(() => {
    if (isDeveloper) {
      return settings;
    }
    if (supervisedComplex) {
      const activeHalaqah = activeHalaqahId && activeHalaqahId !== 'all'
        ? scopedHalaqahs.find(h => h.id === activeHalaqahId)
        : (assignedHalaqahs[0] || scopedHalaqahs[0]);

      const currentTeacherName = currentTeacher?.name || supervisedComplex.supervisorTeacherName || currentUser?.username || 'المعلم المشرف';
      const resolvedHalaqahName = activeHalaqah?.name || supervisedComplex.name || 'الحلقة القرآنية';

      return {
        ...settings,
        halaqahName: resolvedHalaqahName,
        teacherName: currentTeacherName
      };
    }
    return settings;
  }, [settings, isDeveloper, supervisedComplex, scopedHalaqahs, activeHalaqahId, assignedHalaqahs, currentTeacher, currentUser]);

  // Scoped criteria: Specific to active complex if set
  const scopedCriteria = useMemo(() => {
    const complexId = activeComplex?.id;
    if (!complexId) return criteria;

    const matched = criteria.filter(c => c.complexId === complexId);
    if (matched.length > 0) return matched;

    return criteria.filter(c => !c.complexId);
  }, [criteria, activeComplex]);

  // Auto-switch to assigned halaqah for teacher or valid complex halaqah for supervisor
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    // If teacher is currently switching to a specific target halaqah, preserve it!
    if (targetHalaqahIdRef.current && activeHalaqahId === targetHalaqahIdRef.current) {
      return;
    }

    // If teacher already has an active halaqah in their assigned list, PRESERVE IT unconditionally!
    if (assignedHalaqahs.length > 0 && activeHalaqahId && assignedHalaqahs.some(h => h.id === activeHalaqahId)) {
      return;
    }

    if (isSupervisor) {
      if (activeHalaqahId && activeHalaqahId !== 'all') {
        const isValid = scopedHalaqahIds.has(activeHalaqahId) || assignedHalaqahs.some(h => h.id === activeHalaqahId);
        if (!isValid) {
          if (assignedHalaqahs.length > 0 && assignedHalaqahs.length !== scopedHalaqahs.length) {
            setActiveHalaqahId(assignedHalaqahs[0].id);
          } else {
            setActiveHalaqahId('all');
          }
        }
      } else if (assignedHalaqahs.length > 0 && assignedHalaqahs.length !== scopedHalaqahs.length && (!activeHalaqahId || activeHalaqahId === 'all')) {
        // Teacher supervisor who also teaches a specific halaqah: default to their halaqah
        setActiveHalaqahId(assignedHalaqahs[0].id);
      }
    } else {
      if (assignedHalaqahs.length > 0) {
        if (!activeHalaqahId || activeHalaqahId === 'all' || !assignedHalaqahs.some(h => h.id === activeHalaqahId)) {
          setActiveHalaqahId(assignedHalaqahs[0].id);
        }
      }
    }
  }, [currentUser, isSupervisor, assignedHalaqahs, activeHalaqahId, scopedHalaqahIds, scopedHalaqahs.length]);

  // Guard programmer-only tabs: accounts/ranks and database backup are strictly for Programmer (Mohamed Montaser)
  useEffect(() => {
    if (!isDeveloper && (activeTab === 'accounts' || activeTab === 'backup')) {
      setActiveTab('home');
    }
    if (activeTab === 'recordings') {
      setActiveTab('home');
    }
  }, [isDeveloper, isSupervisor, activeTab]);

  // Helper to check whether a student has an assigned halaqah
  const isStudentAssigned = (s: Student) => {
    return Boolean(
      s.halaqahId &&
      s.halaqahId.trim() !== '' &&
      s.halaqahId !== 'unassigned' &&
      s.halaqahId !== 'none'
    );
  };

  // Filter students based on active halaqah selection (or show all for supervisor within their complex)
  // Teachers and complex supervisors MUST only see students assigned to their complex, but can always see unassigned students in queue!
  const displayedStudents = useMemo(() => {
    const activeH = halaqahs.find(h => h.id === activeHalaqahId);

    const matchesActiveHalaqah = (s: Student) => {
      if (!activeHalaqahId || activeHalaqahId === 'all') return true;
      if (s.halaqahId === activeHalaqahId) return true;
      if (activeH && s.halaqahName && normalizeTeacherText(s.halaqahName) === normalizeTeacherText(activeH.name)) return true;
      return false;
    };

    if (isSupervisor) {
      if (activeHalaqahId && activeHalaqahId !== 'all') {
        return scopedStudents.filter(s => matchesActiveHalaqah(s) || !s.halaqahId || s.halaqahId === 'unassigned');
      }
      return scopedStudents;
    }

    // Teacher view: only students assigned to teacher's halaqah, plus unassigned students so they can manage/view them
    if (activeHalaqahId && activeHalaqahId !== 'all') {
      return scopedStudents.filter(s => matchesActiveHalaqah(s) || !s.halaqahId || s.halaqahId === 'unassigned');
    }
    if (assignedHalaqahs.length > 0) {
      const allowedIds = new Set(assignedHalaqahs.map(h => h.id));
      const allowedNames = new Set(assignedHalaqahs.map(h => normalizeTeacherText(h.name)));
      return scopedStudents.filter(s =>
        !s.halaqahId ||
        s.halaqahId === 'unassigned' ||
        allowedIds.has(s.halaqahId) ||
        (s.halaqahName && allowedNames.has(normalizeTeacherText(s.halaqahName)))
      );
    }
    return scopedStudents;
  }, [scopedStudents, isSupervisor, activeHalaqahId, assignedHalaqahs, halaqahs]);

  // Students for attendance, evaluations, behavior, reports, and WhatsApp:
  // Must only include assigned students within displayedStudents
  const assignedDisplayedStudents = useMemo(() => {
    return displayedStudents.filter(isStudentAssigned);
  }, [displayedStudents]);

  // Scope attendance, evaluations, and violations based on displayed students
  const displayedStudentIds = useMemo(() => {
    return new Set(displayedStudents.map(s => s.id));
  }, [displayedStudents]);

  const displayedAttendance = useMemo(() => {
    if (activeHalaqahId === 'all' && isSupervisor) {
      return attendance.filter(a => scopedStudentIds.has(a.studentId));
    }
    return attendance.filter(a => displayedStudentIds.has(a.studentId));
  }, [activeHalaqahId, isSupervisor, attendance, scopedStudentIds, displayedStudentIds]);

  const displayedEvaluations = useMemo(() => {
    if (activeHalaqahId === 'all' && isSupervisor) {
      return evaluations.filter(e => scopedStudentIds.has(e.studentId));
    }
    return evaluations.filter(e => displayedStudentIds.has(e.studentId));
  }, [activeHalaqahId, isSupervisor, evaluations, scopedStudentIds, displayedStudentIds]);

  const displayedViolations = useMemo(() => {
    if (activeHalaqahId === 'all' && isSupervisor) {
      return violations.filter(v => scopedStudentIds.has(v.studentId));
    }
    return violations.filter(v => displayedStudentIds.has(v.studentId));
  }, [activeHalaqahId, isSupervisor, violations, scopedStudentIds, displayedStudentIds]);

  // Scoped exams & submissions strictly restricted to the Quran complex:
  // Each complex has its own isolated exams. Teachers and supervisors cannot see exams from other complexes.
  const scopedExams = useMemo(() => {
    if (isDeveloper) return exams;
    if (!activeComplex) return [];

    const activeComplexId = activeComplex.id;
    const teacherIdSet = new Set(scopedTeachers.map(t => t.id));

    return exams.filter(e => {
      // 1. If exam has explicit complexId, it MUST match the active complex
      if (e.complexId) {
        return e.complexId === activeComplexId;
      }

      // 2. If legacy exam without complexId:
      // If targets specific halaqat, all targeted halaqat must belong to the active complex
      const targetsSpecificHalaqahs = e.targetHalaqat && e.targetHalaqat.length > 0 && !e.targetHalaqat.includes('all');
      if (targetsSpecificHalaqahs) {
        return e.targetHalaqat.some(hid => scopedHalaqahIds.has(hid));
      }

      // If created by a teacher in this complex
      if (e.createdById && teacherIdSet.has(e.createdById)) {
        return true;
      }

      // If legacy sample exam without complexId, assign to first complex only
      const defaultComplexId = complexes[0]?.id;
      if (defaultComplexId && activeComplexId === defaultComplexId) {
        return true;
      }

      return false;
    });
  }, [isDeveloper, exams, activeComplex, scopedTeachers, scopedHalaqahIds, complexes]);

  const scopedSubmissions = useMemo(() => {
    if (isDeveloper) return submissions;
    return submissions.filter(sub => scopedStudentIds.has(sub.studentId));
  }, [isDeveloper, submissions, scopedStudentIds]);

  const scopedEvaluations = useMemo(() => {
    if (isDeveloper) return evaluations;
    return evaluations.filter(e => scopedStudentIds.has(e.studentId));
  }, [isDeveloper, evaluations, scopedStudentIds]);

  // Save session on login
  const handleLoginSuccess = (user: { username: string; role: UserRole; studentId?: string; teacherId?: string; complexId?: string }) => {
    setCurrentUser(user);
    if (user.complexId) {
      setSelectedComplexId(user.complexId);
      try {
        localStorage.setItem('omran_selected_complex_id', user.complexId);
      } catch {}
    }
    localStorage.setItem('omran_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('omran_session');
    setPortalStudentId(null);
    navigatePublic('landing');
  };

  // Teacher Google Account Linking Handlers
  const [isLinkingGoogleTeacher, setIsLinkingGoogleTeacher] = useState(false);

  const handleLinkGoogleTeacher = async () => {
    if (!currentTeacher) {
      return;
    }
    setIsLinkingGoogleTeacher(true);
    try {
      const updatedTeacher = await GoogleWorkspaceService.linkTeacherGoogleAccount(currentTeacher);
      setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    } catch (err: any) {
      console.warn('Teacher Google linking warning:', err);
    } finally {
      setIsLinkingGoogleTeacher(false);
    }
  };

  const handleUnlinkGoogleTeacher = async () => {
    if (!currentTeacher) return;
    try {
      const updatedTeacher = await GoogleWorkspaceService.unlinkTeacherGoogleAccount(currentTeacher);
      setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    } catch (err: any) {
      console.warn('Teacher Google unlinking warning:', err);
    }
  };

  // Multi-Teacher Handlers
  const handleSaveTeacher = async (teacher: TeacherAccount) => {
    // STRICT PROTECTION: Supervisor CANNOT edit or modify the Programmer account
    const existing = teachers.find(t => t.id === teacher.id);
    if (!isDeveloper && (isTeacherDeveloper(teacher) || (existing && isTeacherDeveloper(existing)))) {
      throw new Error('عذراً، لا يمكن للمشرف تعديل أو تغيير بيانات حساب مبرمج ومطور المنظومة.');
    }

    const isSup = isTeacherSupervisor(teacher);
    const val = getThreePartNameValidation(teacher.name, isSup ? 'مشرف' : 'معلم');
    if (!val.isValid) {
      throw new Error(val.message || 'الاسم الثلاثي إلزامي.');
    }

    const cleanTeacherName = (teacher.name || '').trim();
    const normTeacherName = normalizeArabicText(cleanTeacherName);

    // Duplicate name check against other teachers
    const duplicateTeacher = teachers.find(
      t => t.id !== teacher.id && normalizeArabicText(t.name) === normTeacherName
    );
    if (duplicateTeacher) {
      throw new Error(`عذراً، هذا الاسم (${cleanTeacherName}) مسجل مسبقاً لمعلم أو مشرف آخر في المنظومة! يرجى كتابة الاسم الرباعي أو إضافة اسم العائلة والجد لتجنب تطابق الأسماء.`);
    }

    // Duplicate name check against students
    const duplicateStudent = students.find(
      s => normalizeArabicText(s.name) === normTeacherName
    );
    if (duplicateStudent) {
      throw new Error(`عذراً، هذا الاسم (${cleanTeacherName}) مسجل مسبقاً كطالب في المنظومة! يرجى كتابة الاسم الرباعي لتمييز المعلم/المشرف وتجنب تطابق الأسماء.`);
    }

    await OmranDataService.saveTeacher(teacher);
    const updated = await OmranDataService.loadTeachers();
    setTeachers(updated);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    // STRICT PROTECTION: Supervisor CANNOT delete the Programmer account
    const existing = teachers.find(t => t.id === teacherId);
    if (!isDeveloper && existing && isTeacherDeveloper(existing)) {
      throw new Error('عذراً، لا يمكن للمشرف حذف حساب مبرمج ومطور المنظومة.');
    }

    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    await OmranDataService.deleteTeacher(teacherId);
    const updatedTeachers = await OmranDataService.loadTeachers();
    setTeachers(updatedTeachers);
    const updatedHalaqahs = await OmranDataService.loadHalaqahs();
    setHalaqahs(updatedHalaqahs);
    const updatedComplexes = await OmranDataService.loadComplexes();
    setComplexes(updatedComplexes);
  };

  // Halaqah Management Handlers
  const handleSaveHalaqah = async (halaqah: Halaqah) => {
    await OmranDataService.saveHalaqah(halaqah);
    const updated = await OmranDataService.loadHalaqahs();
    setHalaqahs(updated);
  };

  const handleDeleteHalaqah = async (halaqahId: string) => {
    await OmranDataService.deleteHalaqah(halaqahId);
    const updated = await OmranDataService.loadHalaqahs();
    setHalaqahs(updated);
    if (activeHalaqahId === halaqahId) {
      setActiveHalaqahId('all');
    }
  };

  // Student Transfer Handler (Preserves full student history & evaluation records)
  const handleTransferStudent = async (studentId: string, targetHalaqahId: string, targetHalaqahName: string) => {
    await OmranDataService.transferStudentToHalaqah(studentId, targetHalaqahId, targetHalaqahName);
    const updated = await OmranDataService.loadStudents();
    setStudents(updated);
  };

  // Batch Student Transfer Handler (Transfers multiple students in one operation to Firestore)
  const handleBatchTransferStudents = async (studentIds: string[], targetHalaqahId: string, targetHalaqahName: string) => {
    await OmranDataService.transferMultipleStudentsToHalaqah(studentIds, targetHalaqahId, targetHalaqahName);
    const updated = await OmranDataService.loadStudents();
    setStudents(updated);
  };

  // 1. Student Registration / Addition
  const handleAddStudent = async (studentData: Partial<Student>): Promise<boolean> => {
    const nameVal = getThreePartNameValidation(studentData.name, 'طالب');
    if (!nameVal.isValid) {
      throw new Error(nameVal.message || 'الاسم الثلاثي إلزامي للطالب.');
    }

    const cleanStudentName = (studentData.name || '').trim();
    const normStudentName = normalizeArabicText(cleanStudentName);

    // Duplicate name check against students
    const duplicateStudent = students.find(
      s => normalizeArabicText(s.name) === normStudentName
    );
    if (duplicateStudent) {
      throw new Error(`عذراً، هذا الاسم (${cleanStudentName}) مسجل مسبقاً في المنظومة! يرجى كتابة الاسم الرباعي أو إضافة اسم العائلة والجد لتجنب تطابق الأسماء.`);
    }

    // Duplicate name check against teachers
    const duplicateTeacher = teachers.find(
      t => normalizeArabicText(t.name) === normStudentName
    );
    if (duplicateTeacher) {
      throw new Error(`عذراً، هذا الاسم (${cleanStudentName}) مسجل مسبقاً كمعلم أو مشرف في المنظومة! يرجى كتابة الاسم الرباعي لتمييز الطالب وتجنب تطابق الأسماء.`);
    }

    let chosenHalaqahId = studentData.halaqahId !== undefined ? studentData.halaqahId : '';
    let chosenHalaqahName = studentData.halaqahName || '';

    if (chosenHalaqahId) {
      const match = halaqahs.find(h => h.id === chosenHalaqahId) || scopedHalaqahs.find(h => h.id === chosenHalaqahId);
      if (match) {
        chosenHalaqahName = match.name;
      }
    } else if (studentData.halaqahId === undefined && activeHalaqahId && activeHalaqahId !== 'all') {
      const match = halaqahs.find(h => h.id === activeHalaqahId) || scopedHalaqahs.find(h => h.id === activeHalaqahId);
      if (match) {
        chosenHalaqahId = match.id;
        chosenHalaqahName = match.name;
      }
    }

    const newStudent: Student = {
      id: `std_${Date.now()}`,
      name: (studentData.name || 'طالب جديد').trim(),
      password: studentData.password || '123',
      phone: studentData.phone || '',
      age: studentData.age || 10,
      parentName: studentData.parentName || `ولي أمر ${studentData.name}`,
      parentPhones: studentData.parentPhones || [studentData.phone || ''],
      currentSurah: studentData.currentSurah || 78,
      currentSurahName: studentData.currentSurahName || 'النبأ',
      currentAyah: studentData.currentAyah || 1,
      dailyNewTarget: studentData.dailyNewTarget || 'نصف وجه',
      dailyReviewTarget: studentData.dailyReviewTarget || 'وجه واحد',
      level: studentData.level || 'متوسط',
      complexId: activeComplex?.id,
      halaqahId: chosenHalaqahId,
      halaqahName: chosenHalaqahName,
      notes: studentData.notes || '',
      createdAt: new Date().toISOString()
    };

    // Optimistically add to state and dual persistence immediately
    setStudents(prev => [newStudent, ...prev.filter(s => s.id !== newStudent.id)]);
    await OmranDataService.saveStudent(newStudent);

    // Asynchronously trigger Gemini AI plan in background without blocking addition
    fetch('/api/gemini/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student: newStudent })
    })
      .then(res => res.json())
      .then(data => {
        if (data?.plan) {
          const withPlan = {
            ...newStudent,
            aiPlan: {
              ...data.plan,
              lastUpdated: new Date().toISOString()
            }
          };
          setStudents(prev => prev.map(s => (s.id === newStudent.id ? withPlan : s)));
          OmranDataService.saveStudent(withPlan).catch(() => {});
        }
      })
      .catch(e => {
        console.warn('AI Plan background generation notice:', e);
      });

    return true;
  };

  // 2. Update Student
  const handleUpdateStudent = async (student: Student): Promise<boolean> => {
    const nameVal = getThreePartNameValidation(student.name, 'طالب');
    if (!nameVal.isValid) {
      throw new Error(nameVal.message || 'الاسم الثلاثي إلزامي للطالب.');
    }
    await OmranDataService.saveStudent(student);
    const updated = await OmranDataService.loadStudents();
    setStudents(updated);
    return true;
  };

  // 3. Delete Student
  const handleDeleteStudent = async (studentId: string): Promise<boolean> => {
    // 1. Optimistic instant UI update
    setStudents(prev => prev.filter(s => s.id !== studentId));
    // 2. Persist to Firestore and storage
    await OmranDataService.deleteStudent(studentId);
    const updatedSeq = await OmranDataService.loadStudents();
    setStudents(updatedSeq);
    return true;
  };

  // 3.1 Batch Delete Students
  const handleBatchDeleteStudents = async (studentIds: string[]): Promise<boolean> => {
    if (!studentIds || studentIds.length === 0) return true;
    const idSet = new Set(studentIds);
    setStudents(prev => prev.filter(s => !idSet.has(s.id)));
    if ((OmranDataService as any).deleteStudentsBatch) {
      await (OmranDataService as any).deleteStudentsBatch(studentIds);
    } else {
      await Promise.all(studentIds.map(id => OmranDataService.deleteStudent(id)));
    }
    const updatedSeq = await OmranDataService.loadStudents();
    setStudents(updatedSeq);
    return true;
  };

  // 4. Toggle Student Registration
  const handleToggleRegistration = async () => {
    const newSettings: AppSettings = {
      ...settings,
      allowStudentRegistration: !settings.allowStudentRegistration
    };
    setSettings(newSettings);
    await OmranDataService.saveSettings(newSettings);
  };

  // 5. Trigger AI Plan for specific student
  const handleTriggerAIPlan = async (student: Student) => {
    try {
      const res = await fetch('/api/gemini/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student })
      });
      const data = await res.json();
      if (data?.plan) {
        const updatedStudent: Student = {
          ...student,
          aiPlan: {
            ...data.plan,
            lastUpdated: new Date().toISOString()
          }
        };
        await OmranDataService.saveStudent(updatedStudent);
        const list = await OmranDataService.loadStudents();
        setStudents(list);
      }
    } catch (e) {
      console.error('Trigger AI plan error:', e);
    }
  };

  // 6. Save Attendance (Optimistic instant update + persistent cloud write)
  const handleSaveAttendance = async (records: AttendanceRecord[]) => {
    // 1. Immediately reflect in memory so the table updates with zero lag
    setAttendance(prev => {
      const map = new Map<string, AttendanceRecord>();
      for (const a of prev) if (a?.id) map.set(a.id, a);
      for (const r of records) if (r?.id) map.set(r.id, r);
      return Array.from(map.values());
    });
    // 2. Persist to cloud & dual cache
    await OmranDataService.saveAttendanceRecords(records);
  };

  // 7. Save Evaluation & dynamically update student's current position and adjust points by delta
  const handleSaveEvaluation = async (
    evaluation: StudentEvaluation,
    newAssignment?: any,
    updatedPosition?: { surahNumber: number; surahName: string; ayah: number },
    listeningAssignment?: any
  ) => {
    // Check if there was an earlier evaluation for this student on this date to compute exact delta
    const previousEval = evaluations.find(
      e => e.id === evaluation.id || (e.studentId === evaluation.studentId && e.date === evaluation.date)
    );
    const prevCriteriaPts = previousEval?.recitationDetails?.criteriaPointsEarnedToday || 0;
    const prevPagePts = previousEval?.recitationDetails?.pagesPointsEarnedToday || 0;
    const prevAttendancePts = previousEval?.recitationDetails?.attendancePointsEarnedToday || 0;
    const prevTotalEarned = typeof previousEval?.recitationDetails?.pointsEarnedToday === 'number'
      ? previousEval.recitationDetails.pointsEarnedToday
      : (prevCriteriaPts + prevPagePts + prevAttendancePts);

    const newCriteriaPts = evaluation.recitationDetails?.criteriaPointsEarnedToday || 0;
    const newPagePts = evaluation.recitationDetails?.pagesPointsEarnedToday || 0;
    const newAttendancePts = evaluation.recitationDetails?.attendancePointsEarnedToday || 0;
    const newTotalEarned = typeof evaluation.recitationDetails?.pointsEarnedToday === 'number'
      ? evaluation.recitationDetails.pointsEarnedToday
      : (newCriteriaPts + newPagePts + newAttendancePts);

    const deltaCriteria = newCriteriaPts - prevCriteriaPts;
    const deltaPage = newPagePts - prevPagePts;
    const deltaTotal = newTotalEarned - prevTotalEarned;

    await OmranDataService.saveEvaluation(evaluation);
    const list = await OmranDataService.loadEvaluations();
    setEvaluations(list);

    // Update the student's position, assignment, and adjust points by delta
    setStudents(prev => {
      const targetStudent = prev.find(s => s.id === evaluation.studentId);
      if (!targetStudent) return prev;

      const todayNew = evaluation.recitationDetails?.todayNewItem;

      let finalSurahNum = updatedPosition?.surahNumber ?? targetStudent.currentSurah;
      let finalSurahName = updatedPosition?.surahName ?? targetStudent.currentSurahName;
      let finalAyah = updatedPosition?.ayah ?? targetStudent.currentAyah;

      if (!updatedPosition && todayNew && todayNew.surahNumber && !todayNew.didNotRecite) {
        finalSurahNum = todayNew.toSurahNumber || todayNew.surahNumber;
        finalSurahName = todayNew.toSurahName || todayNew.surahName || getSurahInfo(finalSurahNum).name;
        finalAyah = todayNew.toAyah || todayNew.fromAyah || 1;
      }

      const updatedStudent: Student = {
        ...targetStudent,
        currentSurah: finalSurahNum,
        currentSurahName: finalSurahName,
        currentAyah: finalAyah,
        criteriaPoints: Math.max(0, (targetStudent.criteriaPoints || 0) + deltaCriteria),
        totalPagePoints: Math.max(0, (targetStudent.totalPagePoints || 0) + deltaPage),
        points: Math.max(0, (targetStudent.points || 0) + deltaTotal),
        persistentReviewItems: newAssignment?.reviewItems || targetStudent.persistentReviewItems,
        activeListeningAssignment: listeningAssignment || targetStudent.activeListeningAssignment,
        aiPlan: newAssignment ? {
          roadmapSummary: targetStudent.aiPlan?.roadmapSummary || 'خطة الحفظ والمراجعة التراكمية',
          difficultyAdjustment: targetStudent.aiPlan?.difficultyAdjustment || 'وتيرة متوازنة',
          estimatedDaysToFinishJuz: targetStudent.aiPlan?.estimatedDaysToFinishJuz || 30,
          currentDailyAssignment: newAssignment,
          lastUpdated: new Date().toISOString()
        } : targetStudent.aiPlan
      };

      OmranDataService.saveStudent(updatedStudent).catch(err => {
        console.warn('Student save warning in evaluation:', err);
      });

      return prev.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    });
  };

  // 8. Update Criteria (scoped to active complex)
  const handleSaveCriteria = async (list: EvaluationCriteria[]) => {
    const complexId = activeComplex?.id || 'default-complex';
    const taggedList = list.map(c => ({
      ...c,
      complexId: c.complexId || complexId
    }));

    const otherComplexCriteria = criteria.filter(c => c.complexId && c.complexId !== complexId);
    const fullList = [...otherComplexCriteria, ...taggedList];

    setCriteria(fullList);
    await OmranDataService.saveCriteriaList(fullList);
  };

  const handleDeleteCriteria = async (id: string) => {
    await OmranDataService.deleteCriteria(id);
    const list = await OmranDataService.loadCriteria();
    setCriteria(list);
  };

  // Handler for current teacher/supervisor/developer editing their own account credentials
  const handleSaveCurrentTeacherAccount = async (updatedTeacher: TeacherAccount) => {
    await OmranDataService.saveTeacher(updatedTeacher);
    const updatedList = await OmranDataService.loadTeachers();
    setTeachers(updatedList);

    // Sync session user
    if (currentUser) {
      setCurrentUser(prev => prev ? {
        ...prev,
        username: updatedTeacher.name || updatedTeacher.username
      } : null);
      try {
        const stored = sessionStorage.getItem('omran_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.username = updatedTeacher.name || updatedTeacher.username;
          sessionStorage.setItem('omran_auth_user', JSON.stringify(parsed));
        }
      } catch (e) {
        // ignore
      }
    }
  };

  // 9. Update Student AI Plan Assignment & Position
  const handleUpdateStudentAIPlan = async (
    studentId: string,
    newAssignment: any,
    updatedPosition?: { surahNumber: number; surahName: string; ayah: number },
    listeningAssignment?: any
  ) => {
    setStudents(prev => {
      const student = prev.find(s => s.id === studentId);
      if (!student) return prev;

      const updatedStudent: Student = {
        ...student,
        currentSurah: updatedPosition?.surahNumber ?? student.currentSurah,
        currentSurahName: updatedPosition?.surahName ?? student.currentSurahName,
        currentAyah: updatedPosition?.ayah ?? student.currentAyah,
        persistentReviewItems: newAssignment?.reviewItems || student.persistentReviewItems,
        activeListeningAssignment: listeningAssignment || student.activeListeningAssignment,
        aiPlan: {
          roadmapSummary: student.aiPlan?.roadmapSummary || 'خطة الحفظ والمراجعة التراكمية',
          difficultyAdjustment: student.aiPlan?.difficultyAdjustment || 'وتيرة متوازنة',
          estimatedDaysToFinishJuz: student.aiPlan?.estimatedDaysToFinishJuz || 30,
          currentDailyAssignment: newAssignment,
          lastUpdated: new Date().toISOString()
        }
      };

      OmranDataService.saveStudent(updatedStudent).catch(e => console.warn('Save student AI plan notice:', e));
      return prev.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    });
  };

  // Award / Deduct Bonus Points for Student directly from Leaderboard
  const handleAwardBonusPoints = async (studentId: string, pointsDelta: number, reason: string) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) return;

    // Use current recorded points or fallback to existing criteria + page points
    const currentPoints = typeof targetStudent.points === 'number'
      ? targetStudent.points
      : (targetStudent.criteriaPoints || 0) + (targetStudent.totalPagePoints || 0);

    const newPoints = Math.max(0, currentPoints + pointsDelta);
    const newBonusPoints = (targetStudent.bonusPoints || 0) + pointsDelta;

    const updatedStudent: Student = {
      ...targetStudent,
      points: newPoints,
      bonusPoints: newBonusPoints
    };

    // 1. Immediately update state in memory for snappy, responsive UI
    setStudents(prev => prev.map(s => (s.id === studentId ? updatedStudent : s)));

    // 2. Persist to Firestore directly
    await OmranDataService.saveStudent(updatedStudent);
  };

  // 10. Update Settings (Instant local application + resilient Firestore persistence)
  const handleUpdateSettings = async (newSettings: Partial<AppSettings> | AppSettings) => {
    const merged: AppSettings = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      await OmranDataService.saveSettings(merged);
    } catch (err) {
      console.warn('Settings saved locally, remote sync error:', err);
    }
  };

  // 11. Send Chat
  const handleSendChatMessage = async (msg: ChatMessage) => {
    await OmranDataService.saveChatMessage(msg);
    const list = await OmranDataService.loadChats();
    setChatHistory(list);
  };

  const handleClearChat = async () => {
    await OmranDataService.clearChats();
    setChatHistory([]);
  };

  // 12. Violation Handlers (Supports automatic point deduction on students)
  const handleSaveViolation = async (violation: BehaviorViolation) => {
    const existingViolation = violations.find(v => v.id === violation.id);
    const prevPointsDeducted = Number(existingViolation?.pointsDeducted) || 0;
    const newPointsDeducted = Number(violation.pointsDeducted) || 0;
    const deltaDeduction = newPointsDeducted - prevPointsDeducted;

    setViolations(prev => {
      const idx = prev.findIndex(v => v.id === violation.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = violation;
        return copy;
      }
      return [violation, ...prev];
    });
    await OmranDataService.saveViolation(violation);

    // Apply points deduction delta directly to the student's total score
    if (deltaDeduction !== 0) {
      setStudents(prev => {
        const targetStudent = prev.find(s => s.id === violation.studentId);
        if (!targetStudent) return prev;
        const currentPoints = typeof targetStudent.points === 'number'
          ? targetStudent.points
          : (targetStudent.criteriaPoints || 0) + (targetStudent.totalPagePoints || 0);

        const updatedStudent: Student = {
          ...targetStudent,
          points: Math.max(0, currentPoints - deltaDeduction)
        };
        OmranDataService.saveStudent(updatedStudent).catch(err => {
          console.warn('Student save warning on violation points deduction:', err);
        });
        return prev.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      });
    }
  };

  const handleDeleteViolation = async (id: string) => {
    const targetViolation = violations.find(v => v.id === id);
    const restoredPoints = Number(targetViolation?.pointsDeducted) || 0;

    setViolations(prev => prev.filter(v => v.id !== id));
    await OmranDataService.deleteViolation(id);

    // If the violation had deducted points, restore them to the student upon deletion
    if (restoredPoints > 0 && targetViolation?.studentId) {
      setStudents(prev => {
        const targetStudent = prev.find(s => s.id === targetViolation.studentId);
        if (!targetStudent) return prev;
        const currentPoints = typeof targetStudent.points === 'number'
          ? targetStudent.points
          : (targetStudent.criteriaPoints || 0) + (targetStudent.totalPagePoints || 0);

        const updatedStudent: Student = {
          ...targetStudent,
          points: currentPoints + restoredPoints
        };
        OmranDataService.saveStudent(updatedStudent).catch(err => {
          console.warn('Student save warning on violation deletion restore:', err);
        });
        return prev.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      });
    }
  };

  // 13. Exam Handlers
  const handleSaveExam = async (exam: Exam) => {
    // Ensure exam is strictly linked to current active complex if not already set
    const enrichedExam: Exam = {
      ...exam,
      complexId: exam.complexId || activeComplex?.id,
      complexName: exam.complexName || activeComplex?.name
    };
    setExams(prev => {
      const idx = prev.findIndex(e => e.id === enrichedExam.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = enrichedExam;
        return copy;
      }
      return [enrichedExam, ...prev];
    });
    await OmranDataService.saveExam(enrichedExam);
  };

  const handleDeleteExam = async (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    await OmranDataService.deleteExam(id);
  };

  const handleSaveSubmission = async (sub: ExamSubmission) => {
    // Enrich submission with complex info based on halaqah / active complex
    const studentHalaqah = halaqahs.find(h => h.id === sub.halaqahId);
    const subComplexId = sub.complexId || studentHalaqah?.complexId || activeComplex?.id;
    const subComplex = subComplexId ? complexes.find(c => c.id === subComplexId) : null;
    const enrichedSub: ExamSubmission = {
      ...sub,
      complexId: subComplexId,
      complexName: sub.complexName || subComplex?.name || activeComplex?.name
    };

    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === enrichedSub.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = enrichedSub;
        return copy;
      }
      return [enrichedSub, ...prev];
    });
    await OmranDataService.saveSubmission(enrichedSub);
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    await OmranDataService.deleteSubmission(submissionId);
  };

  // Recordings Handlers
  const handleSaveRecording = async (rec: SurahRecording) => {
    setRecordings(prev => {
      const idx = prev.findIndex(r => r.id === rec.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = rec;
        return copy;
      }
      return [rec, ...prev];
    });
    await OmranDataService.saveRecording(rec);
  };

  const handleDeleteRecording = async (recId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recId));
    await OmranDataService.deleteRecording(recId);
  };

  const handleSaveRecordingsConfig = async (cfg: RecordingsConfig) => {
    setRecordingsConfig(cfg);
    await OmranDataService.saveRecordingsConfig(cfg);
  };

  const handleSaveLeaderboardSettings = async (settings: LeaderboardSettings) => {
    setLeaderboardSettings(settings);
    await OmranDataService.saveLeaderboardSettings(settings);
  };

  const handleRefreshGoogleAuth = async () => {
    const cfg = await OmranDataService.loadGoogleOAuthConfig();
    setGoogleAuthConfig(cfg);
  };

  // Certificate Handlers
  const handleSaveCertificate = async (cert: IssuedCertificate) => {
    setCertificates(prev => [cert, ...prev.filter(c => c.id !== cert.id)]);
    try {
      await OmranDataService.saveCertificate(cert);
    } catch (e) {
      console.warn('Save certificate notice:', e);
    }
  };

  const handleSaveCertificates = async (newCerts: IssuedCertificate[]) => {
    setCertificates(prev => {
      const map = new Map<string, IssuedCertificate>();
      for (const c of newCerts) map.set(c.id, c);
      for (const c of prev) if (!map.has(c.id)) map.set(c.id, c);
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    try {
      await OmranDataService.saveCertificates(newCerts);
    } catch (e) {
      console.warn('Save certificates notice:', e);
    }
  };

  const handleDeleteCertificate = async (certId: string) => {
    setCertificates(prev => prev.filter(c => c.id !== certId));
    try {
      await OmranDataService.deleteCertificate(certId);
    } catch (e) {
      console.warn('Delete certificate notice:', e);
    }
  };

  // Library Handlers (المكتبة والأرشيف السحابي)
  const handleSaveLibraryDoc = async (docItem: LibraryDocument) => {
    setLibraryDocs(prev => [docItem, ...prev.filter(d => d.id !== docItem.id)]);
    try {
      await OmranDataService.saveLibraryDocument(docItem);
    } catch (e) {
      console.warn('Save library document notice:', e);
    }
  };

  const handleDeleteLibraryDoc = async (docId: string) => {
    setLibraryDocs(prev => prev.filter(d => d.id !== docId));
    try {
      await OmranDataService.deleteLibraryDocument(docId);
    } catch (e) {
      console.warn('Delete library document notice:', e);
    }
  };

  // Batch Add Students Handler (إضافة الطلاب دفعة واحدة)
  const handleBatchAddStudents = async (studentsToAdd: Student[]): Promise<boolean> => {
    try {
      setStudents(prev => [...studentsToAdd, ...prev]);
      return await OmranDataService.batchCreateStudents(studentsToAdd);
    } catch (e) {
      console.error('Batch add students error:', e);
      return false;
    }
  };

  // 14. Complexes Handlers (المجمعات القرآنية)
  const handleSaveComplex = async (complex: QuranComplex) => {
    await OmranDataService.saveComplex(complex);
    const list = await OmranDataService.loadComplexes();
    setComplexes(list);
  };

  const handleDeleteComplex = async (complexId: string) => {
    await OmranDataService.deleteComplex(complexId);
    if (selectedComplexId === complexId) {
      setSelectedComplexId('');
      localStorage.removeItem('omran_selected_complex_id');
    }
    const list = await OmranDataService.loadComplexes();
    setComplexes(list);
    const hList = await OmranDataService.loadHalaqahs();
    setHalaqahs(hList);
    const sList = await OmranDataService.loadStudents();
    setStudents(sList);
    const tList = await OmranDataService.loadTeachers();
    setTeachers(tList);
  };

  // Navigation metadata for deep linking (e.g. from Quran AI Assistant)
  const [navMeta, setNavMeta] = useState<any>(null);
  const [complexToEditForTheme, setComplexToEditForTheme] = useState<QuranComplex | null>(null);

  // 15. Navigation Handlers with Smooth Contextual Loading
  const handleNavigateTab = (tab: string, meta?: any) => {
    setNavMeta(meta || null);
    if (tab === 'settings') {
      setIsSettingsModalOpen(true);
    }
    if (meta?.highlightId || meta?.itemId || meta?.studentId) {
      const targetId = meta.highlightId || meta.itemId || meta.studentId;
      setTimeout(() => {
        triggerComplexThemePulse(targetId);
      }, 300);
      setTimeout(() => {
        triggerComplexThemePulse(targetId);
      }, 700);
    }
    if (tab === activeTab) {
      setIsTabLoading(true);
      setTimeout(() => setIsTabLoading(false), 200);
      return;
    }
    setIsTabLoading(true);
    setActiveTab(tab);
    setTimeout(() => setIsTabLoading(false), 220);
  };

  const handleOpenThemeCustomizer = (targetComplex?: any) => {
    const comp = targetComplex || activeComplex || complexes[0] || null;
    setComplexToEditForTheme(comp);
    setIsComplexModalOpen(true);
  };

  const handleRefreshViolations = async () => {
    try {
      const v = await OmranDataService.loadViolations();
      setViolations(v);
    } catch (e) {
      console.error('Failed to load violations', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'behavior') {
      handleRefreshViolations();
    }
  }, [activeTab]);

  const handleSelectStudentForEval = (studentId: string) => {
    setTargetStudentForEval(studentId);
    setActiveTab('evaluation');
  };

  const handleNavigateToWhatsApp = (studentId: string) => {
    setTargetStudentForWhatsApp(studentId);
    setActiveTab('parents');
  };

  const handleNavigateToBehavior = (studentId: string) => {
    setTargetStudentForBehavior(studentId);
    setActiveTab('behavior');
  };

  // Scoped settings for students / parent portal
  const portalSettings = useMemo<AppSettings>(() => {
    if (!activePortalStudent) return scopedSettings;
    const sHalaqah = halaqahs.find(h => h.id === activePortalStudent.halaqahId);
    const sComplex = sHalaqah?.complexId ? complexes.find(c => c.id === sHalaqah.complexId) : null;
    return {
      ...settings,
      halaqahName: activePortalStudent.halaqahName || sHalaqah?.name || 'الحلقة القرآنية',
      teacherName: sHalaqah?.primaryTeacherName || sComplex?.supervisorTeacherName || 'معلم ومحفظ الحلقة'
    };
  }, [settings, scopedSettings, activePortalStudent, halaqahs, complexes]);

  // 1. Strict Student Portal Handling: If user is authenticated as STUDENT, MUST NEVER leak to admin dashboard
  if (currentUser?.role === 'student') {
    if (isLoadingData && !activePortalStudent) {
      return (
        <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b]" dir="rtl">
          <TopProgressBar isLoading={true} />
          <AnimatedBackground />
          <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
            <GenericTabSkeleton title="جارٍ مزامنة سجل الطالب وبوابة الحفظ سحابياً..." />
          </div>
        </div>
      );
    }

    if (activePortalStudent) {
      if (!isStudentAssigned(activePortalStudent)) {
        return (
          <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b]" dir="rtl">
            <AnimatedBackground />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <UnassignedStudentView
                studentName={activePortalStudent.name}
                studentPhone={activePortalStudent.phone}
                onRefresh={loadAllData}
                onLogout={handleLogout}
                settings={portalSettings}
              />
            </motion.div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b]" dir="rtl">
          <AnimatedBackground />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <ParentPortalView
              student={activePortalStudent}
              attendance={attendance}
              evaluations={evaluations}
              settings={portalSettings}
              violations={violations}
              exams={exams}
              submissions={submissions}
              students={students}
              halaqahs={halaqahs}
              leaderboardSettings={leaderboardSettings || undefined}
              recordings={recordings}
              recordingsConfig={recordingsConfig}
              certificates={certificates}
              listeningLogs={listeningLogs}
              activeComplex={activeComplex}
              complexes={complexes}
              isLoggedInStudent={true}
              onLogout={handleLogout}
              onSaveSubmission={handleSaveSubmission}
              onUpdateStudent={handleUpdateStudent}
            />
          </motion.div>
        </div>
      );
    }

    // If logged in as student but activePortalStudent could not be found in memory:
    return (
      <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans flex flex-col items-center justify-center p-6" dir="rtl">
        <AnimatedBackground />
        <div className="relative z-10 text-center space-y-5 max-w-md bg-[#064e3b]/90 border border-amber-500/40 p-8 rounded-[32px] backdrop-blur-md shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-[#fbbf24] flex items-center justify-center mx-auto border border-amber-500/30">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading text-white">لم يتم العثور على سجل الطالب</h2>
            <p className="text-xs text-[#86efac]/90 mt-2 leading-relaxed">
              تعذر العثور على سجل الطالب ({currentUser.username}). قد يكون تم تعديل الاسم أو نقله لحلقة أخرى.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleLogout}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#fbbf24] text-[#064e3b] font-black text-xs hover:bg-[#f59e0b] shadow-lg cursor-pointer transition-all"
            >
              تسجيل الخروج والعودة
            </button>
            <button
              onClick={() => loadAllData()}
              className="py-3 px-4 rounded-2xl bg-[#022c22] text-[#86efac] font-bold text-xs border border-[#065f46] hover:text-white cursor-pointer"
            >
              إعادة التحميل
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Direct Portal URL link view (when not logged in as student, e.g. via parent WhatsApp link ?portal=std-1)
  if (activePortalStudent) {
    if (!isStudentAssigned(activePortalStudent)) {
      return (
        <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b]" dir="rtl">
          <AnimatedBackground />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <UnassignedStudentView
              studentName={activePortalStudent.name}
              studentPhone={activePortalStudent.phone}
              onRefresh={loadAllData}
              onLogout={handleLogout}
              settings={portalSettings}
            />
          </motion.div>
        </div>
      );
    }

    return (
      <div
        data-complex-themed={activeComplex?.theme ? "true" : undefined}
        className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b] transition-colors duration-300"
        style={activeComplex?.theme ? {
          backgroundColor: activeComplex.theme.backgroundColor || '#022c22',
          color: activeComplex.theme.textColor || '#f0f9f6'
        } : undefined}
        dir="rtl"
      >
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <ParentPortalView
            student={activePortalStudent}
            attendance={attendance}
            evaluations={evaluations}
            settings={portalSettings}
            violations={violations}
            exams={exams}
            submissions={submissions}
            students={students}
            halaqahs={halaqahs}
            leaderboardSettings={leaderboardSettings || undefined}
            recordings={recordings}
            recordingsConfig={recordingsConfig}
            certificates={certificates}
            listeningLogs={listeningLogs}
            activeComplex={activeComplex}
            complexes={complexes}
            isLoggedInStudent={!!currentUser}
            onLogout={handleLogout}
            onSaveSubmission={handleSaveSubmission}
            onUpdateStudent={handleUpdateStudent}
          />
        </motion.div>
      </div>
    );
  }

  // 2. Direct Portal URL link view (when not logged in as student, e.g. via parent WhatsApp link ?portal=std-1)
  if (portalStudentId && isLoadingData && !activePortalStudent) {
    return (
      <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b]" dir="rtl">
        <TopProgressBar isLoading={true} />
        <AnimatedBackground />
        <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
          <GenericTabSkeleton title="جارٍ استرجاع سجل الطالب وبوابة ولي الأمر سحابياً..." />
        </div>
      </div>
    );
  }

  // 3. If Portal Link was invalid / not found after data loaded
  if (portalStudentId && !isLoadingData && !activePortalStudent) {
    return (
      <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans flex flex-col items-center justify-center p-6" dir="rtl">
        <AnimatedBackground />
        <div className="relative z-10 text-center space-y-5 max-w-md bg-[#064e3b]/90 border border-amber-500/40 p-8 rounded-[32px] backdrop-blur-md shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-[#fbbf24] flex items-center justify-center mx-auto border border-amber-500/30">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading text-white">لم يتم العثور على ملف الطالب</h2>
            <p className="text-xs text-[#86efac]/90 mt-2 leading-relaxed">
              تعذر العثور على سجل الطالب بالمعرّف المرفق. قد يكون تم تحديث السجل أو تعديل بيانات الحلقة.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                setPortalStudentId(null);
                window.history.replaceState({}, '', window.location.pathname);
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#fbbf24] text-[#064e3b] font-black text-xs hover:bg-[#f59e0b] shadow-lg cursor-pointer transition-all"
            >
              الذهاب إلى البوابة الرئيسية
            </button>
            <button
              onClick={() => loadAllData()}
              className="py-3 px-4 rounded-2xl bg-[#022c22] text-[#86efac] font-bold text-xs border border-[#065f46] hover:text-white cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Priority 1: If user navigated to /privacy or clicked Privacy Policy link
  if (publicRoute === 'privacy') {
    return (
      <PrivacyPolicyPage
        onBackToHome={() => navigatePublic('landing')}
        onGoToLogin={!currentUser ? () => navigatePublic('login') : undefined}
      />
    );
  }

  // Priority 2: If not logged in, render Public Landing Page or Login Modal
  if (!currentUser) {
    if (publicRoute === 'login') {
      return (
        <div className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b]" dir="rtl">
          <AnimatedBackground />
          <LoginModal
            onLoginSuccess={handleLoginSuccess}
            onRegisterStudent={handleAddStudent}
            students={students}
            teachers={teachers}
            settings={settings}
            onBackToLanding={() => navigatePublic('landing')}
            onOpenPrivacyPolicy={() => navigatePublic('privacy')}
          />
        </div>
      );
    }

    // Default Public Landing Page (accessible to Google App Reviewer and public visitors)
    return (
      <PublicLandingPage
        onOpenLogin={() => navigatePublic('login')}
        onOpenPrivacyPolicy={() => navigatePublic('privacy')}
        onOpenParentPortal={() => {
          navigatePublic('login');
        }}
        appName={settings.complexName || 'منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية'}
      />
    );
  }

  // If user is a teacher with no assigned halaqah yet (only checked after data finishes loading):
  const hasNoAssignedHalaqah =
    currentUser?.role === 'admin' &&
    !isSupervisor &&
    assignedHalaqahs.length === 0 &&
    !isLoadingData &&
    !currentTeacher?.halaqahId &&
    scopedHalaqahs.length > 1;

  if (hasNoAssignedHalaqah) {
    return (
      <div
        data-complex-themed={activeComplex?.theme ? "true" : undefined}
        className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b] transition-colors duration-300"
        style={activeComplex?.theme ? {
          backgroundColor: activeComplex.theme.backgroundColor || '#022c22',
          color: activeComplex.theme.textColor || '#f0f9f6'
        } : undefined}
        dir="rtl"
      >
        <AnimatedBackground />
        <Navbar
          currentUser={currentUser}
          currentTeacher={currentTeacher}
          onLinkGoogleTeacher={handleLinkGoogleTeacher}
          onUnlinkGoogleTeacher={handleUnlinkGoogleTeacher}
          isLinkingGoogleTeacher={isLinkingGoogleTeacher}
          onLogout={handleLogout}
          settings={scopedSettings}
          studentsCount={0}
          teachersCount={scopedTeachers.length}
          complexesCount={isDeveloper ? complexes.length : 1}
          complexName={supervisedComplex?.name}
          availableComplexes={scopedComplexes}
          activeComplexId={activeComplex?.id}
          activeComplex={activeComplex}
          onSwitchComplex={handleSwitchComplex}
          onOpenMultiComplexModal={() => setIsMultiComplexModalOpen(true)}
          halaqahs={scopedHalaqahs}
          assignedHalaqahs={[]}
          isSupervisor={false}
          isDeveloper={isDeveloper}
          activeHalaqahId=""
          onSwitchHalaqah={() => {}}
          onOpenTeacherManagement={() => setIsSettingsModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenPrivacyPolicy={() => navigatePublic('privacy')}
        />
        <main className="max-w-4xl mx-auto px-4 py-8 relative">
          <UnassignedTeacherView
            teacherName={currentTeacher?.name || currentUser.username}
            onRefresh={loadAllData}
            onLogout={handleLogout}
            settings={scopedSettings}
          />
        </main>
      </div>
    );
  }

  // Navigation Items for Admin/Teacher
  // Recordings, Accounts/Ranks Management, and Backup are strictly restricted to Programmer (Mohamed Montaser)
  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'students', label: 'الطلاب والتسجيل', icon: Users, badge: displayedStudents.length },
    { id: 'attendance', label: 'حضور الطلاب', icon: UserCheck },
    { id: 'teacher_attendance', label: 'تحضير المعلمين', icon: Clock },
    { id: 'evaluation', label: 'تقييم التسميع', icon: BookOpen },
    { id: 'exams', label: 'قسم الاختبارات', icon: FileText, badge: scopedExams.length > 0 ? scopedExams.length : undefined },
    { id: 'certificates', label: 'قسم الشهادات', icon: Award },
    { id: 'leaderboard', label: 'لوحة الشرف', icon: Trophy },
    ...(isDeveloper ? [
      { id: 'accounts', label: 'إدارة الحسابات والرتب', icon: UserCog, badge: teachers.length }
    ] : []),
    { id: 'behavior', label: 'المخالفات السلوكية', icon: ShieldAlert, badge: displayedViolations.length > 0 ? displayedViolations.length : undefined },
    { id: 'parents', label: 'رسائل الواتساب', icon: MessageCircle },
    { id: 'reports', label: 'التقارير الدورية', icon: ClipboardList },
    { id: 'library', label: 'المكتبة والأرشيف', icon: FolderArchive, badge: libraryDocs.length > 0 ? libraryDocs.length : undefined },
    ...(isDeveloper ? [
      { id: 'backup', label: 'النسخ الاحتياطي', icon: Database }
    ] : [])
  ];

  return (
    <div
      data-complex-themed={activeComplex?.theme ? "true" : undefined}
      className="min-h-screen bg-[#022c22] text-[#f0f9f6] font-sans selection:bg-[#fbbf24] selection:text-[#064e3b] pb-12 transition-colors duration-300 w-full max-w-full overflow-x-hidden"
      style={activeComplex?.theme ? {
        backgroundColor: activeComplex.theme.backgroundColor || '#022c22',
        color: activeComplex.theme.textColor || '#f0f9f6'
      } : undefined}
      dir="rtl"
    >
      <AnimatedBackground />

      {/* Modern Global Non-Intrusive Top Progress Bar (مثل المنصات العالمية) */}
      <TopProgressBar isLoading={isLoadingData || isTabLoading || isSyncing} />

      {/* Main Navbar with Settings Button & Halaqah Selector */}
      <Navbar
        currentUser={currentUser}
        currentTeacher={currentTeacher}
        onLinkGoogleTeacher={handleLinkGoogleTeacher}
        onUnlinkGoogleTeacher={handleUnlinkGoogleTeacher}
        isLinkingGoogleTeacher={isLinkingGoogleTeacher}
        onLogout={handleLogout}
        settings={scopedSettings}
        studentsCount={displayedStudents.length}
        teachersCount={scopedTeachers.length}
        complexesCount={isDeveloper ? complexes.length : 1}
        complexName={supervisedComplex?.name}
        availableComplexes={scopedComplexes}
        activeComplexId={activeComplex?.id}
        activeComplex={activeComplex}
        onSwitchComplex={canSwitchComplex ? handleSwitchComplex : undefined}
        onOpenMultiComplexModal={canSwitchComplex ? () => setIsMultiComplexModalOpen(true) : undefined}
        canSwitchComplex={canSwitchComplex}
        halaqahs={scopedHalaqahs}
        assignedHalaqahs={assignedHalaqahs}
        isSupervisor={isSupervisor}
        isDeveloper={isDeveloper}
        activeHalaqahId={activeHalaqahId}
        onSwitchHalaqah={handleSwitchHalaqah}
        onOpenTeacherManagement={() => setIsSettingsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenComplexManagement={isDeveloper ? () => setIsComplexModalOpen(true) : undefined}
        onOpenPrivacyPolicy={() => navigatePublic('privacy')}
        onOpenEditAccount={() => setIsEditAccountModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-4 sm:pt-6 relative space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Active Halaqah Header & Switcher Banner with smooth motion.div workspace transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeHalaqahId || 'default'}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="p-3.5 sm:p-4 rounded-2xl border shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden transition-all w-full max-w-full"
            style={activeComplex?.theme ? {
              background: `linear-gradient(to right, ${activeComplex.theme.secondaryColor}, ${activeComplex.theme.primaryColor}, ${activeComplex.theme.secondaryColor})`,
              borderColor: activeComplex.theme.primaryColor
            } : {
              background: 'linear-gradient(to right, #064e3b, #022c22, #064e3b)',
              borderColor: '#065f46'
            }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-10 h-10 rounded-xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center shrink-0 shadow-sm"
                style={activeComplex?.theme?.accentColor ? {
                  color: activeComplex.theme.accentColor,
                  borderColor: `${activeComplex.theme.accentColor}66`
                } : undefined}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#86efac] font-bold shrink-0">الحلقة الحالية:</span>
                  <span className="text-sm sm:text-base font-extrabold text-white font-heading truncate">
                    {activeHalaqahId === 'all'
                      ? (isDeveloper
                          ? `جميع الحلقات لكافة المجمعات (${displayedStudents.length} طالباً)`
                          : `جميع حلقات ${supervisedComplex?.name || 'المجمع'} (${displayedStudents.length} طالباً)`)
                      : (() => {
                          const activeHItem = halaqahs.find(h => h.id === activeHalaqahId);
                          const parentC = complexes.find(c => c.id === activeHItem?.complexId);
                          const compName = parentC?.name || activeHItem?.complexName || activeComplex?.name;
                          return activeHItem
                            ? `${activeHItem.name}${compName ? ` (${compName})` : ''}`
                            : (scopedHalaqahs.find(h => h.id === activeHalaqahId)?.name || 'الحلقة المختارة');
                        })()}
                  </span>
                  {activeHalaqahId !== 'all' && (
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-bold shrink-0"
                      style={activeComplex?.theme?.accentColor ? {
                        backgroundColor: `${activeComplex.theme.accentColor}22`,
                        color: activeComplex.theme.accentColor,
                        borderColor: `${activeComplex.theme.accentColor}44`
                      } : {
                        backgroundColor: 'rgba(251, 191, 36, 0.15)',
                        color: '#fbbf24'
                      }}
                    >
                      {displayedStudents.length} طلاب
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {isDeveloper
                    ? 'أنت في وضع المشرف العام والمبرمج: يمكنك الإشراف على كافة المجمعات والحلقات وإدارتها بالكامل.'
                    : isSupervisor
                    ? `أنت في وضع مشرف المجمع (${supervisedComplex?.name || 'المجمع'}): يمكنك التصفح بين حلقات مجمعك وإدارتها بالكامل دون الاطلاع على المجمعات الأخرى.`
                    : `أنت في وضع المعلم: يتم عرض طلاب وسجلات الحلقة المحددة فقط.`}
                </p>
              </div>
            </div>

            {/* Quick Switching Buttons & Live Cloud Sync */}
            <div className="flex items-center gap-1.5 flex-wrap self-stretch sm:self-auto justify-end shrink-0 max-w-full overflow-x-auto scrollbar-none slider-horizontal">
              <LiveSyncButton
                isSyncing={isSyncing}
                onRefresh={() => loadAllData(true)}
                lastSyncedText={lastSyncedTime}
                label="تحديث مباشر"
                compact={true}
              />

              {canSwitchComplex && scopedComplexes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsMultiComplexModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
                  title="عرض بطاقات المجمعات والحلقات التابعة لك"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#fbbf24]" />
                  <span>مجمعاتي ({scopedComplexes.length})</span>
                  <Sparkles className="w-3 h-3 text-[#fbbf24]" />
                </button>
              )}

              {isSupervisor ? (
                <div className="flex items-center gap-1 bg-[#022c22] p-1 rounded-xl border border-[#065f46] overflow-x-auto scrollbar-none slider-horizontal shrink-0 max-w-full">
                  <button
                    onClick={() => handleSwitchHalaqah('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      activeHalaqahId === 'all'
                        ? 'bg-[#fbbf24] text-[#064e3b] shadow-sm font-black'
                        : 'text-[#86efac] hover:text-white'
                    }`}
                    style={activeHalaqahId === 'all' && activeComplex?.theme ? {
                      backgroundColor: activeComplex.theme.accentColor,
                      color: activeComplex.theme.primaryColor
                    } : undefined}
                  >
                    الكل
                  </button>
                  {scopedHalaqahs.map(h => (
                    <button
                      key={h.id}
                      onClick={() => handleSwitchHalaqah(h.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        activeHalaqahId === h.id
                          ? 'bg-[#fbbf24] text-[#064e3b] shadow-sm font-black'
                          : 'text-[#86efac] hover:text-white'
                      }`}
                      style={activeHalaqahId === h.id && activeComplex?.theme ? {
                        backgroundColor: activeComplex.theme.accentColor,
                        color: activeComplex.theme.primaryColor
                      } : undefined}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              ) : (
                assignedHalaqahs.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-[#022c22] p-1 rounded-xl border border-[#065f46] overflow-x-auto scrollbar-none slider-horizontal shrink-0 max-w-full">
                    <span className="text-[10px] text-amber-300 font-bold px-1.5 shrink-0">تنقل بين حلقاتك:</span>
                    {assignedHalaqahs.map(h => (
                      <button
                        key={h.id}
                        onClick={() => handleSwitchHalaqah(h.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          activeHalaqahId === h.id
                            ? 'bg-[#fbbf24] text-[#064e3b] shadow-sm font-black'
                            : 'text-[#86efac] hover:text-white'
                        }`}
                        style={activeHalaqahId === h.id && activeComplex?.theme ? {
                          backgroundColor: activeComplex.theme.accentColor,
                          color: activeComplex.theme.primaryColor
                        } : undefined}
                        title={`الانتقال إلى ${h.name} (${h.complexName || 'المجمع'})`}
                      >
                        {h.name} {h.complexName ? `(${h.complexName})` : ''}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Tabs Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none slider-horizontal p-1.5 rounded-2xl border backdrop-blur-md shadow-lg relative transition-all w-full max-w-full touch-pan-x"
          style={activeComplex?.theme ? {
            backgroundColor: activeComplex.theme.secondaryColor ? `${activeComplex.theme.secondaryColor}e6` : 'rgba(6, 78, 59, 0.8)',
            borderColor: activeComplex.theme.primaryColor || '#065f46'
          } : {
            backgroundColor: 'rgba(6, 78, 59, 0.8)',
            borderColor: '#065f46'
          }}
        >
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigateTab(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer select-none ${
                  isActive
                    ? 'text-[#064e3b] font-black'
                    : 'text-[#86efac]/80 hover:text-white hover:bg-[#022c22]/60'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#fbbf24] rounded-xl shadow-lg shadow-amber-950/40 z-0"
                    style={activeComplex?.theme?.accentColor ? {
                      backgroundColor: activeComplex.theme.accentColor
                    } : undefined}
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span
                  className="relative z-10 flex items-center gap-2"
                  style={isActive && activeComplex?.theme?.primaryColor ? {
                    color: activeComplex.theme.primaryColor
                  } : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#064e3b]' : 'text-[#86efac]'}`} style={isActive && activeComplex?.theme?.primaryColor ? { color: activeComplex.theme.primaryColor } : undefined} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isActive ? 'bg-[#064e3b]/20 text-[#064e3b] font-black' : 'bg-[#022c22] text-[#86efac]'
                      }`}
                      style={isActive && activeComplex?.theme?.primaryColor ? {
                        backgroundColor: `${activeComplex.theme.primaryColor}22`,
                        color: activeComplex.theme.primaryColor
                      } : undefined}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Tab Views with Buttery Smooth Animated Transitions (مثل المنصات العالمية) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (isTabLoading || isLoadingData ? '_loading' : '_ready')}
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full space-y-6"
          >
            {isTabLoading || isLoadingData ? (
              <TabSkeleton activeTab={activeTab} />
            ) : (
              <>
                {activeTab === 'home' && (
                  <HomeTab
                    students={displayedStudents}
                    attendance={displayedAttendance}
                    evaluations={displayedEvaluations}
                    settings={scopedSettings}
                    teachers={scopedTeachers}
                    currentUserName={currentUser?.username || scopedSettings.teacherName}
                    isSupervisor={isSupervisor}
                    isDeveloper={isDeveloper}
                    activeComplex={activeComplex}
                    onNavigateTab={handleNavigateTab}
                    onSelectStudentForEval={handleSelectStudentForEval}
                    onOpenTeacherManagement={() => setIsSettingsModalOpen(true)}
                  />
                )}

            {activeTab === 'students' && (
              <StudentsTab
                students={displayedStudents}
                settings={scopedSettings}
                halaqahs={scopedHalaqahs}
                activeHalaqahId={activeHalaqahId}
                isSupervisor={isSupervisor}
                isDeveloper={isDeveloper}
                onAddStudent={handleAddStudent}
                onBatchAddStudents={handleBatchAddStudents}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onBatchDeleteStudents={handleBatchDeleteStudents}
                onToggleRegistration={handleToggleRegistration}
                onTriggerAIPlan={handleTriggerAIPlan}
                onTransferStudent={handleTransferStudent}
                onBatchTransferStudents={handleBatchTransferStudents}
                initialStudentToDeleteId={navMeta?.studentId}
                initialSearchQuery={navMeta?.searchQuery || navMeta?.studentName}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceTab
                students={assignedDisplayedStudents}
                attendanceRecords={displayedAttendance}
                onSaveAttendance={handleSaveAttendance}
                settings={scopedSettings}
                teacherName={currentTeacher?.name || currentUser?.username || scopedSettings.teacherName}
                isDeveloper={isDeveloper}
                onUpdateSettings={handleUpdateSettings}
                complexName={activeComplex?.name || scopedSettings.complexName}
                activeComplex={activeComplex}
                halaqahName={halaqahs.find(h => h.id === activeHalaqahId)?.name || scopedSettings.halaqahName}
                isSyncing={isSyncing}
                onRefreshData={() => loadAllData(true)}
              />
            )}

            {activeTab === 'evaluation' && (
              <EvaluationTab
                students={assignedDisplayedStudents}
                attendance={displayedAttendance}
                evaluations={displayedEvaluations}
                criteria={scopedCriteria}
                isSupervisor={isSupervisor || isDeveloper}
                activeComplexId={activeComplex?.id || 'default-complex'}
                selectedStudentId={targetStudentForEval}
                onSaveEvaluation={handleSaveEvaluation}
                onSaveCriteria={handleSaveCriteria}
                onDeleteCriteria={handleDeleteCriteria}
                onUpdateStudentAIPlan={handleUpdateStudentAIPlan}
                onNavigateToWhatsApp={handleNavigateToWhatsApp}
                onNavigateToBehavior={handleNavigateToBehavior}
              />
            )}

            {activeTab === 'exams' && (
              <ExamsTab
                exams={scopedExams}
                submissions={scopedSubmissions}
                students={scopedStudents}
                halaqahs={scopedHalaqahs}
                currentUserId={currentUser?.teacherId || currentUser?.studentId || 'admin'}
                currentUserName={currentUser?.username || scopedSettings.teacherName}
                isSupervisor={isSupervisor}
                googleAuthConfig={googleAuthConfig}
                leaderboardSettings={leaderboardSettings || undefined}
                activeComplex={activeComplex}
                onSaveExam={handleSaveExam}
                onDeleteExam={handleDeleteExam}
                onSaveSubmission={handleSaveSubmission}
                onDeleteSubmission={handleDeleteSubmission}
                onSaveLeaderboardSettings={handleSaveLeaderboardSettings}
                onRefreshGoogleAuth={handleRefreshGoogleAuth}
                onSaveCertificate={handleSaveCertificate}
              />
            )}

            {activeTab === 'certificates' && (
              <CertificatesTab
                students={assignedDisplayedStudents}
                halaqahs={scopedHalaqahs}
                settings={scopedSettings}
                currentUserName={currentTeacher?.name || currentUser?.username || scopedSettings.teacherName}
                isSupervisor={isSupervisor}
                isDeveloper={isDeveloper}
                activeHalaqahId={activeHalaqahId}
                onUpdateSettings={handleUpdateSettings}
                certificates={certificates}
                onSaveCertificate={handleSaveCertificate}
                onSaveCertificates={handleSaveCertificates}
                onDeleteCertificate={handleDeleteCertificate}
                selectedComplexId={selectedComplexId}
                activeComplexName={activeComplex?.name || scopedSettings.complexName}
                activeComplex={activeComplex}
                submissions={scopedSubmissions}
                initialHighlightId={navMeta?.highlightId || navMeta?.itemId}
              />
            )}

            {activeTab === 'teacher_attendance' && (
              <TeacherAttendanceTab
                teachers={scopedTeachers}
                currentTeacher={currentTeacher}
                currentUserName={currentTeacher?.name || currentUser?.username || scopedSettings.teacherName}
                isSupervisor={isSupervisor}
                isDeveloper={isDeveloper}
                activeComplex={activeComplex}
                initialHighlightId={navMeta?.highlightId || navMeta?.itemId}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardTab
                students={scopedStudents}
                halaqahs={scopedHalaqahs}
                attendance={displayedAttendance}
                evaluations={scopedEvaluations}
                submissions={scopedSubmissions}
                listeningLogs={listeningLogs}
                leaderboardSettings={leaderboardSettings || undefined}
                isSupervisor={isSupervisor}
                isDeveloper={isDeveloper}
                activeHalaqahId={activeHalaqahId}
                currentUserName={currentTeacher?.name || currentUser?.username || scopedSettings.teacherName}
                onSaveLeaderboardSettings={handleSaveLeaderboardSettings}
                onAwardBonusPoints={handleAwardBonusPoints}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountsTab
                teachers={teachers}
                students={students}
                halaqahs={halaqahs}
                complexes={complexes}
                isDeveloper={isDeveloper}
                onSaveTeacher={handleSaveTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                initialStudentToDeleteId={navMeta?.studentId}
                initialSearchQuery={navMeta?.searchQuery || navMeta?.studentName}
                initialSubTab={navMeta?.subTab || (navMeta?.studentId ? 'students' : undefined)}
              />
            )}

            {activeTab === 'behavior' && (
              <BehaviorTab
                students={assignedDisplayedStudents}
                violations={displayedViolations}
                settings={scopedSettings}
                teacherName={currentUser?.username || scopedSettings.teacherName}
                onSaveViolation={handleSaveViolation}
                onDeleteViolation={handleDeleteViolation}
                preselectedStudentId={targetStudentForBehavior || navMeta?.studentId}
                onRefreshViolations={handleRefreshViolations}
                initialHighlightId={navMeta?.highlightId || navMeta?.itemId}
              />
            )}

            {activeTab === 'parents' && (
              <ParentsWhatsAppTab
                students={assignedDisplayedStudents}
                attendance={displayedAttendance}
                evaluations={displayedEvaluations}
                settings={scopedSettings}
                preselectedStudentId={targetStudentForWhatsApp}
                senderAccountName={currentTeacher?.name || currentUser?.username || scopedSettings.teacherName}
                currentUserName={currentUser?.username}
                activeComplex={activeComplex}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsTab
                students={assignedDisplayedStudents}
                attendance={displayedAttendance}
                evaluations={displayedEvaluations}
                settings={scopedSettings}
                onUpdateSettings={handleUpdateSettings}
                teacherName={currentTeacher?.name || currentUser?.username || scopedSettings.teacherName}
                certificates={certificates}
                activeComplex={activeComplex}
                onSaveLibraryDoc={handleSaveLibraryDoc}
              />
            )}

            {activeTab === 'library' && (
              <LibraryTab
                libraryDocs={libraryDocs}
                students={scopedStudents}
                halaqahs={scopedHalaqahs}
                teacherHalaqahs={assignedHalaqahs}
                exams={scopedExams}
                attendance={displayedAttendance}
                evaluations={displayedEvaluations}
                currentUserName={currentTeacher?.name || currentUser?.username || scopedSettings.teacherName}
                isSupervisor={isSupervisor}
                isDeveloper={isDeveloper}
                activeComplex={activeComplex}
                onSaveDocument={handleSaveLibraryDoc}
                onDeleteDocument={handleDeleteLibraryDoc}
                initialHighlightId={navMeta?.highlightId || navMeta?.itemId}
                initialSearchQuery={navMeta?.searchQuery}
              />
            )}

            {activeTab === 'backup' && isDeveloper && (
              <DataBackupTab
                onRefreshAllData={loadAllData}
                googleAuthConfig={googleAuthConfig}
                onRefreshGoogleAuth={handleRefreshGoogleAuth}
                isSupervisor={isSupervisor}
                isDeveloper={isDeveloper}
                complexes={complexes}
                onSaveComplex={handleSaveComplex}
                halaqahs={halaqahs}
                students={students}
              />
            )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Platform Global Footer */}
      <footer className="max-w-7xl mx-auto px-4 mt-12 pt-6 border-t border-[#065f46]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#86efac]/70">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#fbbf24]" />
          <span className="font-bold text-white">{activeComplex?.name || settings.complexName || 'مجمع تحفيظ القرآن الكريم'}</span>
        </div>
        <div className="flex items-center gap-2 text-center text-xs text-[#fbbf24] font-bold bg-[#064e3b]/80 px-3.5 py-1.5 rounded-full border border-amber-400/30 shadow-sm">
          <span>مشغل بواسطة منصة عمران</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigatePublic('privacy')}
            className="hover:text-amber-300 transition-colors font-medium underline cursor-pointer"
          >
            وثيقة سياسة الخصوصية (Privacy Policy)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => navigatePublic('landing')}
            className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
          >
            الصفحة التعريفية للمنظومة
          </button>
        </div>
      </footer>

      {/* Comprehensive Settings Modal (Teachers, Halaqahs, Student Transfer) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        teachers={scopedTeachers}
        allTeachers={teachers}
        halaqahs={scopedHalaqahs}
        students={scopedStudents}
        settings={scopedSettings}
        complexes={scopedComplexes}
        activeComplex={activeComplex}
        isDeveloper={isDeveloper}
        complexName={activeComplex?.name || supervisedComplex?.name}
        activeHalaqahId={activeHalaqahId}
        onSaveTeacher={handleSaveTeacher}
        onDeleteTeacher={handleDeleteTeacher}
        onSaveHalaqah={handleSaveHalaqah}
        onDeleteHalaqah={handleDeleteHalaqah}
        onTransferStudent={handleTransferStudent}
        onBatchTransferStudents={handleBatchTransferStudents}
        onSwitchActiveHalaqah={setActiveHalaqahId}
        onSaveComplex={handleSaveComplex}
        onUpdateSettings={handleUpdateSettings}
        initialTab={navMeta?.subTab || (navMeta?.type === 'halaqah' ? 'halaqahs' : undefined)}
        initialHighlightId={navMeta?.highlightId || navMeta?.itemId}
      />

      {/* Complex Management Modal (إدارة المجمعات القرآنية) - متاح للمطور والمشرف */}
      {(isDeveloper || isSupervisor) && (
        <ComplexManagementModal
          isOpen={isComplexModalOpen}
          onClose={() => {
            setIsComplexModalOpen(false);
            setComplexToEditForTheme(null);
          }}
          complexes={complexes}
          halaqahs={halaqahs}
          teachers={teachers}
          students={students}
          onSaveComplex={handleSaveComplex}
          onDeleteComplex={handleDeleteComplex}
          onSaveHalaqah={handleSaveHalaqah}
          onDeleteHalaqah={handleDeleteHalaqah}
          onSaveTeacher={handleSaveTeacher}
          onStudentsUpdated={setStudents}
          onHalaqahsUpdated={setHalaqahs}
          isSupervisor={isSupervisor}
          isDeveloper={isDeveloper}
          initialComplexToEdit={complexToEditForTheme}
        />
      )}

      {/* Teacher Multi-Complex Modal (عرض المجمعات والحلقات والانتقال بينها) */}
      <TeacherMultiComplexModal
        isOpen={isMultiComplexModalOpen && canSwitchComplex && scopedComplexes.length > 1}
        onClose={() => {
          setIsMultiComplexModalOpen(false);
          setNewlyAddedComplexName(null);
        }}
        teacher={currentTeacher}
        teacherName={currentTeacher?.name || currentUser?.username || 'المعلم'}
        complexes={scopedComplexes}
        activeComplexId={activeComplex?.id || ''}
        onSelectComplex={handleSwitchComplex}
        halaqahs={halaqahs}
        allTeachers={teachers}
        students={students}
        isNewlyAdded={Boolean(newlyAddedComplexName)}
        newlyAddedComplexName={newlyAddedComplexName}
      />

      {/* Edit Account Modal (for Teacher, Supervisor, and Developer) */}
      {isEditAccountModalOpen && currentTeacher && (
        <EditAccountModal
          isOpen={isEditAccountModalOpen}
          onClose={() => setIsEditAccountModalOpen(false)}
          currentTeacher={currentTeacher}
          allTeachers={teachers}
          allStudents={students}
          onSaveTeacherAccount={handleSaveCurrentTeacherAccount}
        />
      )}

      {/* Floating Quranic AI Assistant (متاح للمبرمج والمشرف والمعلم) */}
      <QuranAIAssistant
        currentUser={currentUser}
        currentTeacherName={currentTeacher?.name || currentUser?.username}
        isDeveloper={isDeveloper}
        isSupervisor={isSupervisor}
        activeComplex={activeComplex}
        activeHalaqahId={activeHalaqahId}
        students={students}
        halaqahs={scopedHalaqahs}
        teachers={teachers}
        attendance={attendance}
        evaluations={evaluations}
        violations={violations}
        complexes={complexes}
        allHalaqahs={halaqahs}
        onAddStudent={handleAddStudent}
        onDeleteStudent={handleDeleteStudent}
        onTransferStudent={handleTransferStudent}
        onSaveAttendance={handleSaveAttendance}
        onSaveHalaqah={handleSaveHalaqah}
        onDeleteHalaqah={handleDeleteHalaqah}
        onDeleteTeacher={handleDeleteTeacher}
        onSaveViolation={handleSaveViolation}
        onNavigateTab={handleNavigateTab}
        onSaveLibraryDoc={handleSaveLibraryDoc}
        onOpenThemeCustomizer={handleOpenThemeCustomizer}
        certificates={certificates}
        onSaveCertificate={handleSaveCertificate}
        onSaveCertificates={handleSaveCertificates}
        recordings={recordings}
        listeningLogs={listeningLogs}
        submissions={submissions}
        libraryDocs={libraryDocs}
        leaderboardSettings={leaderboardSettings}
        onSaveEvaluation={handleSaveEvaluation}
        onSaveComplex={handleSaveComplex}
      />
    </div>
  );
}

export default App;
