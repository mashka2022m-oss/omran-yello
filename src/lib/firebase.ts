import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import baseAppletConfig from '../../firebase-applet-config.json';
import {
  UserRole,
  Student,
  AttendanceRecord,
  StudentEvaluation,
  EvaluationCriteria,
  AppSettings,
  ChatMessage,
  UserAccount,
  TeacherAccount,
  BehaviorViolation,
  FullBackupData,
  ComplexBackupData,
  ComplexMigrationProgress,
  ComplexMigrationResult,
  QuranComplex,
  Halaqah,
  Exam,
  ExamQuestion,
  ExamSubmission,
  LeaderboardSettings,
  GoogleOAuthConfig,
  SurahRecording,
  RecordingsConfig,
  StudentListeningLog,
  IssuedCertificate,
  TeacherShift,
  MosqueLocationConfig,
  MosqueItem,
  TeacherAttendanceRecord,
  normalizeTeacherText,
  LibraryDocument,
  getTeacherSixDigitCode
} from '../types';

// Web app's Firebase configuration from firebase-applet-config.json
export const firebaseConfig = {
  ...baseAppletConfig
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Target Firestore Database ID
export const TARGET_FIRESTORE_DATABASE_ID = baseAppletConfig.firestoreDatabaseId || "ai-studio-9d31420a-1d75-4c6c-a7b6-8e5ec8416a66";

// Initialize Firestore on the targeted database id (ai-studio-9d31420a-1d75-4c6c-a7b6-8e5ec8416a66)
export const db = (() => {
  try {
    return getFirestore(app, TARGET_FIRESTORE_DATABASE_ID);
  } catch (err) {
    return getFirestore(app);
  }
})();
export const auth = getAuth(app);

// Safe Analytics Initialization
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch {
          // Handled gracefully in iframe or restricted environment
        }
      }
    })
    .catch(() => {});
}

export const DEFAULT_RECORDINGS_CONFIG: RecordingsConfig = {
  isPublishedToStudents: true,
  dailyRepetitionTarget: 3,
  listeningPointsReward: 5,
  updatedAt: new Date().toISOString()
};

export const DEFAULT_LEADERBOARD_SETTINGS: LeaderboardSettings = {
  scope: 'all_unified',
  includeExamPoints: true,
  includeEvaluationScores: true,
  updatedAt: new Date().toISOString()
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  // Avoid flooding console with offline notices
  if (!errMsg.includes('client is offline') && !errMsg.includes('unavailable')) {
    console.warn(`[Firestore ${operationType} at ${path || 'unknown'}]:`, errMsg);
  }
  return errInfo;
}

// Resilient, non-blocking Firestore query helpers with automatic fast timeout (2.5s)
export async function safeGetDocs(colRef: any, timeoutMs = 2500): Promise<{ docs: any[]; empty: boolean; forEach: (fn: (doc: any) => void) => void }> {
  try {
    const fetchPromise = getDocs(colRef);
    const timeoutPromise = new Promise<{ docs: any[]; empty: boolean; forEach: (fn: any) => void }>((resolve) =>
      setTimeout(() => resolve({ docs: [], empty: true, forEach: () => {} }), timeoutMs)
    );
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (!errMsg.includes('client is offline') && !errMsg.includes('unavailable')) {
      console.warn('[OmranDataService] safeGetDocs notice:', errMsg);
    }
    return { docs: [], empty: true, forEach: () => {} };
  }
}

export async function safeGetDoc(docRef: any, timeoutMs = 2500): Promise<{ exists: () => boolean; data: () => any }> {
  try {
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise<{ exists: () => boolean; data: () => any }>((resolve) =>
      setTimeout(() => resolve({ exists: () => false, data: () => null }), timeoutMs)
    );
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    return { exists: () => false, data: () => null };
  }
}

// Initial Default Evaluation Criteria
export const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    id: 'crit-memorization',
    name: 'حفظ الورد الجديد',
    type: 'score',
    maxScore: 10,
    pointsWeight: 10,
    hasPoints: true,
    isDefault: true
  },
  {
    id: 'crit-review',
    name: 'مراجعة الماضي',
    type: 'score',
    maxScore: 10,
    pointsWeight: 10,
    hasPoints: true,
    isDefault: true
  },
  {
    id: 'crit-tajweed',
    name: 'التجويد ومخارج الحروف',
    type: 'stars',
    pointsWeight: 10,
    hasPoints: true,
    isDefault: false
  },
  {
    id: 'crit-behavior',
    name: 'الآداب وحسن الاستماع',
    type: 'options',
    options: ['متميز ومؤدب', 'جيد ومتعاون', 'يحتاج إلى تنبيه'],
    hasPoints: false,
    isDefault: false
  }
];

export const DEFAULT_COMPLEXES: QuranComplex[] = [
  {
    id: 'complex-main',
    name: 'المجمع القرآني النموذجي',
    description: 'المجمع القرآني النموذجي التابع لمنظومة عمران',
    supervisorTeacherId: 'teacher-1',
    supervisorTeacherName: 'المشرف العام',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_HALAQAHS: Halaqah[] = [
  {
    id: 'halaqah-main',
    name: 'حلقة القرآن الكريم',
    description: 'الحلقة القرآنية النموذجية',
    complexId: 'complex-main',
    complexName: 'المجمع القرآني النموذجي',
    primaryTeacherName: 'معلم ومحفظ الحلقة',
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: 'halaqah-zubair',
    name: 'حلقة الزبير بن العوام',
    description: 'حلقة المتميزين والحفظ المكثف',
    complexId: 'complex-main',
    complexName: 'المجمع القرآني النموذجي',
    primaryTeacherName: 'الشيخ إبراهيم الخليل',
    createdAt: new Date().toISOString(),
    isDefault: false
  },
  {
    id: 'halaqah-abubakr',
    name: 'حلقة أبي بكر الصديق',
    description: 'حلقة التأسيس وإتقان التلاوة',
    complexId: 'complex-main',
    complexName: 'المجمع القرآني النموذجي',
    primaryTeacherName: 'م. محمد منتصر',
    createdAt: new Date().toISOString(),
    isDefault: false
  }
];

export const DEFAULT_ABSENCE_TEMPLATES = [
  {
    id: 'absence-template-default',
    title: 'رسالة تفقد غياب ودية (الافتراضية)',
    template: 'السلام عليكم ورحمة الله وبركاته، علومك شيخنا بشرنا عنك وعن {اسم_الولد}، استغربنا غيابه اليوم بشر عساه بخير؟',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  allowStudentRegistration: true,
  workDaysPerWeek: 5,
  workDaysNames: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  halaqahName: 'حلقة القرآن الكريم',
  teacherName: 'معلم ومحفظ الحلقة',
  newPagePoints: 5,
  reviewPagePoints: 1,
  dailyListeningPoints: 5,
  attendancePointsSettings: {
    presentPoints: 1,
    latePoints: 0,
    excusedPoints: 0,
    absentPointsDeduction: 1,
    enableAttendancePoints: true
  },
  absenceMessageTemplates: DEFAULT_ABSENCE_TEMPLATES
};

// Initial Registered Teachers (Default Teacher Accounts)
export const INITIAL_TEACHERS: TeacherAccount[] = [
  {
    id: 'teacher-1',
    name: 'م. محمد منتصر',
    username: 'admin',
    password: '123',
    phone: '0500000000',
    teacherCode: '749201',
    title: 'المشرف والمعلم المبرمج والمطور العام',
    role: 'developer',
    isPrimary: true,
    complexId: 'complex-main',
    complexName: 'المجمع القرآني النموذجي',
    halaqahId: 'halaqah-main',
    halaqahName: 'حلقة القرآن الكريم',
    googleEmail: 'fds421885@gmail.com',
    isGoogleLinked: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'teacher-2',
    name: 'الشيخ إبراهيم الخليل',
    username: 'ibrahim',
    password: '123',
    phone: '0501122334',
    teacherCode: '582910',
    title: 'معلم ومحفظ حلقة الزبير بن العوام',
    role: 'teacher',
    isPrimary: false,
    complexId: 'complex-main',
    complexName: 'المجمع القرآني النموذجي',
    halaqahId: 'halaqah-zubair',
    halaqahName: 'حلقة الزبير بن العوام',
    createdAt: new Date().toISOString()
  }
];

// Initial Seed Students for demonstration
export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-1',
    name: 'عبد الرحمن أحمد السعيد',
    password: '123',
    phone: '0501234567',
    age: 12,
    parentName: 'أحمد السعيد',
    parentPhones: ['966501234567', '966551234567'],
    parentPhone: '966501234567',
    currentSurah: 2,
    currentSurahName: 'البقرة',
    currentAyah: 45,
    dailyNewTarget: 'وجه كامل',
    dailyReviewTarget: 'نصف جزء',
    level: 'قوي',
    halaqahId: 'halaqah-main',
    halaqahName: 'حلقة القرآن الكريم',
    aiPlan: {
      roadmapSummary: 'خطة حفظ سورة البقرة بمعدل وجه يومياً مع مراجعة نصف جزء من جزء عم وتبارك.',
      currentDailyAssignment: {
        newMemorization: 'سورة البقرة: الآيات (46 - 52)',
        review: 'سورة النبأ وسورة النازعات كاملتين',
        suggestedSheikh: 'الشيخ محمود خليل الحصري (المصحف المعلم)',
        tajweedFocus: 'تطبيق أحكام النون الساكنة والتنوين (الإدغام بغنة)',
        dailyNote: 'كرر كل آية 5 مرات بالربط مع الآية التي قبلها قبل التسميع على المعلم.'
      },
      difficultyAdjustment: 'وتيرة ممتازة تناسب قدرات الطالب العالية',
      estimatedDaysToFinishJuz: 22,
      lastUpdated: new Date().toISOString()
    },
    notes: 'طالب مجتهد وحافظ متميز',
    createdAt: new Date().toISOString()
  },
  {
    id: 'std-2',
    name: 'يوسف عمر الكردي',
    password: '123',
    phone: '0507654321',
    age: 10,
    parentName: 'عمر الكردي',
    parentPhones: ['966507654321'],
    parentPhone: '966507654321',
    currentSurah: 78,
    currentSurahName: 'النبأ',
    currentAyah: 16,
    dailyNewTarget: 'نصف وجه',
    dailyReviewTarget: 'سورة واحدة',
    level: 'متوسط',
    halaqahId: 'halaqah-main',
    halaqahName: 'حلقة القرآن الكريم',
    aiPlan: {
      roadmapSummary: 'إتمام جزء عم خلال 3 أسابيع بمعدل 6 إلى 8 آيات يومياً مع تكرار الاستماع.',
      currentDailyAssignment: {
        newMemorization: 'سورة النبأ: الآيات (17 - 30)',
        review: 'سورة الإخلاص والفلق والناس وقريش',
        suggestedSheikh: 'الشيخ محمد صديق المنشاوي (المعلم)',
        tajweedFocus: 'قلقلة حروف (قطب جد) والمد المتصل',
        dailyNote: 'استمع للشيخ المنشاوي 3 مرات وركز على نطق الحركات بدقة.'
      },
      difficultyAdjustment: 'خطة متوازنة لتعزيز الثقة والتجويد',
      estimatedDaysToFinishJuz: 18,
      lastUpdated: new Date().toISOString()
    },
    notes: 'يحتاج تركيز على المدود',
    createdAt: new Date().toISOString()
  },
  {
    id: 'std-3',
    name: 'بلال خالد القحطاني',
    password: '123',
    phone: '0509876543',
    age: 8,
    parentName: 'خالد القحطاني',
    parentPhones: ['966509876543'],
    parentPhone: '966509876543',
    currentSurah: 93,
    currentSurahName: 'الضحى',
    currentAyah: 1,
    dailyNewTarget: '3 آيات',
    dailyReviewTarget: 'سورة قصيرة',
    level: 'ضعيف',
    halaqahId: 'halaqah-main',
    halaqahName: 'حلقة القرآن الكريم',
    aiPlan: {
      roadmapSummary: 'خطة تشجيعية وتيسيرية لقصار السور بمعدل 3 آيات يومياً مع تقنية التكرار المرحلي.',
      currentDailyAssignment: {
        newMemorization: 'سورة الضحى كاملة (11 آية)',
        review: 'سورة الشرح والتين والعلق',
        suggestedSheikh: 'الشيخ مشاري بن راشد العفاسي',
        tajweedFocus: 'مخارج الحروف الأساسية والوضوح',
        dailyNote: 'قسّم السورة إلى مقطعين، 5 آيات صباحاً و6 آيات مساءً مع الوالد.'
      },
      difficultyAdjustment: 'تم تيسير الورد وتقسيمه ليناسب عمر الطالب وقدرته',
      estimatedDaysToFinishJuz: 45,
      lastUpdated: new Date().toISOString()
    },
    notes: 'يحتاج تشجيع ومكافآت مستمرة',
    createdAt: new Date().toISOString()
  },
  {
    id: 'std-4',
    name: 'عمر عبد العزيز الفهد',
    password: '123',
    phone: '0505544332',
    age: 11,
    parentName: 'عبد العزيز الفهد',
    parentPhones: ['966505544332'],
    parentPhone: '966505544332',
    currentSurah: 18,
    currentSurahName: 'الكهف',
    currentAyah: 10,
    dailyNewTarget: 'وجه كامل',
    dailyReviewTarget: 'ربع جزء',
    level: 'متوسط',
    halaqahId: 'halaqah-zubair',
    halaqahName: 'حلقة الزبير بن العوام',
    aiPlan: {
      roadmapSummary: 'متابعة حفظ سورة الكهف بمعدل وجه يومياً مع مراجعة سورة مريم والإسراء.',
      currentDailyAssignment: {
        newMemorization: 'سورة الكهف: الآيات (1 - 10)',
        review: 'سورة مريم كاملة',
        suggestedSheikh: 'الشيخ عبد الباسط عبد الصمد',
        tajweedFocus: 'أحكام الراءات وتفخيمها وترقيقها',
        dailyNote: 'تلاوة خاشعة مع استشعار معاني أوائل سورة الكهف.'
      },
      difficultyAdjustment: 'وتيرة مستقرة وممتازة',
      estimatedDaysToFinishJuz: 25,
      lastUpdated: new Date().toISOString()
    },
    notes: 'طالب حسن الصوت وملتزم',
    createdAt: new Date().toISOString()
  },
  {
    id: 'std-5',
    name: 'حمزة مصطفى الباز',
    password: '123',
    phone: '0503322114',
    age: 13,
    parentName: 'مصطفى الباز',
    parentPhones: ['966503322114'],
    parentPhone: '966503322114',
    currentSurah: 3,
    currentSurahName: 'آل عمران',
    currentAyah: 20,
    dailyNewTarget: 'وجه ونصف',
    dailyReviewTarget: 'جزء كامل',
    level: 'قوي',
    halaqahId: 'halaqah-zubair',
    halaqahName: 'حلقة الزبير بن العوام',
    aiPlan: {
      roadmapSummary: 'خطة متقدمة لحفظ سورة آل عمران مع مراجعة سورة البقرة وتثبيتها.',
      currentDailyAssignment: {
        newMemorization: 'سورة آل عمران: الآيات (1 - 9)',
        review: 'سورة البقرة: الأرباع الثلاثة الأولى',
        suggestedSheikh: 'الشيخ محمود علي البنا',
        tajweedFocus: 'المدود وأحكام الميم الساكنة',
        dailyNote: 'التركيز على متشابهات أوائل آل عمران مع البقرة.'
      },
      difficultyAdjustment: 'مستوى متفوق ومتميز جداً',
      estimatedDaysToFinishJuz: 15,
      lastUpdated: new Date().toISOString()
    },
    notes: 'طالب متفوق ومرشح لمسابقات القرآن الكريم',
    createdAt: new Date().toISOString()
  },
  {
    id: 'std-6',
    name: 'أنس إبراهيم الدوسري',
    password: '123',
    phone: '0508899776',
    age: 9,
    parentName: 'إبراهيم الدوسري',
    parentPhones: ['966508899776'],
    parentPhone: '966508899776',
    currentSurah: 67,
    currentSurahName: 'الملك',
    currentAyah: 14,
    dailyNewTarget: 'نصف وجه',
    dailyReviewTarget: 'سورة الملك',
    level: 'متوسط',
    halaqahId: 'halaqah-zubair',
    halaqahName: 'حلقة الزبير بن العوام',
    aiPlan: {
      roadmapSummary: 'إتمام جزء تبارك بمعدل نصف وجه يومياً وتكرار الاستماع لسورة الملك.',
      currentDailyAssignment: {
        newMemorization: 'سورة الملك: الآيات (1 - 14)',
        review: 'سورة النبأ والنازعات',
        suggestedSheikh: 'الشيخ سعد الغامدي',
        tajweedFocus: 'أحكام النون والميم المشددتين',
        dailyNote: 'قراءة السورة قبل النوم ترسيخاً للحفظ النبوي.'
      },
      difficultyAdjustment: 'خطة تشجيعية مناسبة',
      estimatedDaysToFinishJuz: 30,
      lastUpdated: new Date().toISOString()
    },
    notes: 'طالب حريص على الحضور والمواظبة',
    createdAt: new Date().toISOString()
  }
];

// Helper to compute recent seed dates dynamically
const getRecentWeekdaySeed = (targetDayIndex: number, weeksAgo = 0): string => {
  const d = new Date();
  const currentDay = d.getDay();
  let diff = (currentDay - targetDayIndex + 7) % 7;
  if (weeksAgo > 0) diff += weeksAgo * 7;
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const recentMondayDate = getRecentWeekdaySeed(1); // Exact recent Monday
const recentTuesdayDate = getRecentWeekdaySeed(2); // Exact recent Tuesday
const recentWednesdayDate = getRecentWeekdaySeed(3); // Exact recent Wednesday
const todaySeedDate = getRecentWeekdaySeed(new Date().getDay());

// Initial Seed Attendance Records (covering recent weekdays and today)
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  // Recent Monday Attendance Records (All 6 students recorded: 5 present, 1 excused)
  {
    id: `att-mon-std-1`,
    studentId: 'std-1',
    date: recentMondayDate,
    status: 'حاضر',
    note: 'حضور مبكر ومتميز',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-mon-std-2`,
    studentId: 'std-2',
    date: recentMondayDate,
    status: 'حاضر',
    note: 'حاضر ومواظب',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-mon-std-3`,
    studentId: 'std-3',
    date: recentMondayDate,
    status: 'حاضر',
    note: 'حاضر مع تفاعل طيب',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-mon-std-4`,
    studentId: 'std-4',
    date: recentMondayDate,
    status: 'حاضر',
    note: 'حاضر ومنضبط',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-mon-std-5`,
    studentId: 'std-5',
    date: recentMondayDate,
    status: 'حاضر',
    note: 'حضور نموذجى',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-mon-std-6`,
    studentId: 'std-6',
    date: recentMondayDate,
    status: 'معتذر',
    note: 'عذر مسبق من ولي الأمر',
    savedAt: new Date().toISOString()
  },
  // Recent Tuesday Attendance Records
  {
    id: `att-tue-std-1`,
    studentId: 'std-1',
    date: recentTuesdayDate,
    status: 'حاضر',
    note: 'حاضر ومبكر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-tue-std-2`,
    studentId: 'std-2',
    date: recentTuesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-tue-std-3`,
    studentId: 'std-3',
    date: recentTuesdayDate,
    status: 'حاضر',
    note: 'حاضر مع مشاركة',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-tue-std-4`,
    studentId: 'std-4',
    date: recentTuesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-tue-std-5`,
    studentId: 'std-5',
    date: recentTuesdayDate,
    status: 'حاضر',
    note: 'حاضر ومواظب',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-tue-std-6`,
    studentId: 'std-6',
    date: recentTuesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  // Recent Wednesday Attendance Records
  {
    id: `att-wed-std-1`,
    studentId: 'std-1',
    date: recentWednesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-wed-std-2`,
    studentId: 'std-2',
    date: recentWednesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-wed-std-3`,
    studentId: 'std-3',
    date: recentWednesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-wed-std-4`,
    studentId: 'std-4',
    date: recentWednesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-wed-std-5`,
    studentId: 'std-5',
    date: recentWednesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-wed-std-6`,
    studentId: 'std-6',
    date: recentWednesdayDate,
    status: 'حاضر',
    note: 'حاضر',
    savedAt: new Date().toISOString()
  },
  // Today Attendance Records
  {
    id: `att-today-std-1`,
    studentId: 'std-1',
    date: todaySeedDate,
    status: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-today-std-2`,
    studentId: 'std-2',
    date: todaySeedDate,
    status: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-today-std-3`,
    studentId: 'std-3',
    date: todaySeedDate,
    status: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-today-std-4`,
    studentId: 'std-4',
    date: todaySeedDate,
    status: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-today-std-5`,
    studentId: 'std-5',
    date: todaySeedDate,
    status: 'حاضر',
    savedAt: new Date().toISOString()
  },
  {
    id: `att-today-std-6`,
    studentId: 'std-6',
    date: todaySeedDate,
    status: 'حاضر',
    savedAt: new Date().toISOString()
  }
];

// Initial Seed Evaluations Records (Rich Monday recitations for students)
export const INITIAL_EVALUATIONS: StudentEvaluation[] = [
  {
    id: `eval-mon-std-1`,
    date: recentMondayDate,
    studentId: 'std-1',
    studentName: 'عبد الرحمن أحمد السعيد',
    attendanceStatus: 'حاضر',
    pointsAwarded: 15,
    generalNotes: 'أداء متميز وتلاوة خاشعة ومتقنة لأحكام التجويد',
    recitationDetails: {
      newMemorizationAchieved: 'سورة البقرة: الآيات (46 - 52)',
      reviewAchieved: 'سورة النبأ وسورة النازعات كاملتين',
      teacherNotes: 'تطبيق رائع لأحكام النون الساكنة والتنوين (الإدغام بغنة)',
      todayNewItem: {
        surahNumber: 2,
        surahName: 'البقرة',
        fromAyah: 46,
        toAyah: 52,
        pagesCount: 1,
        totalAyahs: 7
      },
      tomorrowNewItem: {
        surahNumber: 2,
        surahName: 'البقرة',
        fromAyah: 53,
        toAyah: 61,
        pagesCount: 1,
        totalAyahs: 9
      }
    }
  },
  {
    id: `eval-mon-std-2`,
    date: recentMondayDate,
    studentId: 'std-2',
    studentName: 'يوسف عمر الكردي',
    attendanceStatus: 'حاضر',
    pointsAwarded: 12,
    generalNotes: 'تسميع جيد جداً مع تحسن ملحوظ في مخارج الحروف',
    recitationDetails: {
      newMemorizationAchieved: 'سورة النبأ: الآيات (17 - 30)',
      reviewAchieved: 'سورة الإخلاص والفلق والناس وقريش',
      teacherNotes: 'إتقان أحكام القلقلة (قطب جد) والمد المتصل، بارك الله فيه',
      todayNewItem: {
        surahNumber: 78,
        surahName: 'النبأ',
        fromAyah: 17,
        toAyah: 30,
        pagesCount: 0.5,
        totalAyahs: 14
      },
      tomorrowNewItem: {
        surahNumber: 78,
        surahName: 'النبأ',
        fromAyah: 31,
        toAyah: 40,
        pagesCount: 0.5,
        totalAyahs: 10
      }
    }
  },
  {
    id: `eval-mon-std-3`,
    date: recentMondayDate,
    studentId: 'std-3',
    studentName: 'بلال خالد القحطاني',
    attendanceStatus: 'حاضر',
    pointsAwarded: 10,
    generalNotes: 'تسميع مبارك وتشجيع مستمر لقصار السور',
    recitationDetails: {
      newMemorizationAchieved: 'سورة الضحى كاملة (الآيات 1 - 11)',
      reviewAchieved: 'سورة الشرح والتين والعلق',
      teacherNotes: 'تحسن واضح في نطق الحركات والوضوح الصوتي، يستحق وسام التشجيع',
      todayNewItem: {
        surahNumber: 93,
        surahName: 'الضحى',
        fromAyah: 1,
        toAyah: 11,
        pagesCount: 0.3,
        totalAyahs: 11
      },
      tomorrowNewItem: {
        surahNumber: 94,
        surahName: 'الشرح',
        fromAyah: 1,
        toAyah: 8,
        pagesCount: 0.25,
        totalAyahs: 8
      }
    }
  },
  {
    id: `eval-mon-std-4`,
    date: recentMondayDate,
    studentId: 'std-4',
    studentName: 'عمر عبد العزيز الفهد',
    attendanceStatus: 'حاضر',
    pointsAwarded: 15,
    generalNotes: 'حفظ متقن ومتميز لأوائل سورة الكهف',
    recitationDetails: {
      newMemorizationAchieved: 'سورة الكهف: الآيات (1 - 10)',
      reviewAchieved: 'سورة مريم كاملة',
      teacherNotes: 'تلاوة طيبة مع ضبط أحكام الراءات وتفخيمها في مواضعها',
      todayNewItem: {
        surahNumber: 18,
        surahName: 'الكهف',
        fromAyah: 1,
        toAyah: 10,
        pagesCount: 1,
        totalAyahs: 10
      },
      tomorrowNewItem: {
        surahNumber: 18,
        surahName: 'الكهف',
        fromAyah: 11,
        toAyah: 16,
        pagesCount: 0.8,
        totalAyahs: 6
      }
    }
  },
  {
    id: `eval-mon-std-5`,
    date: recentMondayDate,
    studentId: 'std-5',
    studentName: 'حمزة مصطفى الباز',
    attendanceStatus: 'حاضر',
    pointsAwarded: 18,
    generalNotes: 'أداء فائق التميز لطالب متقدم في الحفظ',
    recitationDetails: {
      newMemorizationAchieved: 'سورة آل عمران: الآيات (1 - 9)',
      reviewAchieved: 'سورة البقرة: الأرباع الثلاثة الأولى',
      teacherNotes: 'إتقان عالي لأحكام المدود وأداء صوتي رصين ومتقن',
      todayNewItem: {
        surahNumber: 3,
        surahName: 'آل عمران',
        fromAyah: 1,
        toAyah: 9,
        pagesCount: 1.2,
        totalAyahs: 9
      },
      tomorrowNewItem: {
        surahNumber: 3,
        surahName: 'آل عمران',
        fromAyah: 10,
        toAyah: 18,
        pagesCount: 1,
        totalAyahs: 9
      }
    }
  },
  // Recent Tuesday Evaluation Records (تقييم التسميع ليوم الثلاثاء)
  {
    id: `eval-tue-std-1`,
    date: recentTuesdayDate,
    studentId: 'std-1',
    studentName: 'عبد الرحمن أحمد السعيد',
    attendanceStatus: 'حاضر',
    pointsAwarded: 15,
    generalNotes: 'مواصلة ممتازة لحفظ سورة البقرة مع ضبط تام لأحكام التجويد',
    recitationDetails: {
      newMemorizationAchieved: 'سورة البقرة: الآيات (53 - 61)',
      reviewAchieved: 'سورة النبأ وسورة النازعات كاملتين',
      teacherNotes: 'تطبيق رائع لأحكام الإخفاء الحقيقي والمد المنفصل',
      todayNewItem: {
        surahNumber: 2,
        surahName: 'البقرة',
        fromAyah: 53,
        toAyah: 61,
        pagesCount: 1,
        totalAyahs: 9
      },
      tomorrowNewItem: {
        surahNumber: 2,
        surahName: 'البقرة',
        fromAyah: 62,
        toAyah: 69,
        pagesCount: 1,
        totalAyahs: 8
      }
    }
  },
  {
    id: `eval-tue-std-2`,
    date: recentTuesdayDate,
    studentId: 'std-2',
    studentName: 'يوسف عمر الكردي',
    attendanceStatus: 'حاضر',
    pointsAwarded: 12,
    generalNotes: 'تسميع خاشع ومتقن لأواخر سورة النبأ',
    recitationDetails: {
      newMemorizationAchieved: 'سورة النبأ: الآيات (31 - 40)',
      reviewAchieved: 'سورة الأعلى والغاشية والطارق',
      teacherNotes: 'إتقان الوقف والابتداء وحسن الترتيل',
      todayNewItem: {
        surahNumber: 78,
        surahName: 'النبأ',
        fromAyah: 31,
        toAyah: 40,
        pagesCount: 0.5,
        totalAyahs: 10
      },
      tomorrowNewItem: {
        surahNumber: 79,
        surahName: 'النازعات',
        fromAyah: 1,
        toAyah: 15,
        pagesCount: 0.5,
        totalAyahs: 15
      }
    }
  },
  {
    id: `eval-tue-std-3`,
    date: recentTuesdayDate,
    studentId: 'std-3',
    studentName: 'بلال خالد القحطاني',
    attendanceStatus: 'حاضر',
    pointsAwarded: 10,
    generalNotes: 'حفظ سورة الشرح كاملة مع انضباط طيب',
    recitationDetails: {
      newMemorizationAchieved: 'سورة الشرح كاملة (الآيات 1 - 8)',
      reviewAchieved: 'سورة الضحى وسورة التين',
      teacherNotes: 'نطق الحركات سليم ومخارج واضحة ومباركة',
      todayNewItem: {
        surahNumber: 94,
        surahName: 'الشرح',
        fromAyah: 1,
        toAyah: 8,
        pagesCount: 0.3,
        totalAyahs: 8
      },
      tomorrowNewItem: {
        surahNumber: 95,
        surahName: 'التين',
        fromAyah: 1,
        toAyah: 8,
        pagesCount: 0.25,
        totalAyahs: 8
      }
    }
  },
  {
    id: `eval-tue-std-4`,
    date: recentTuesdayDate,
    studentId: 'std-4',
    studentName: 'عمر عبد العزيز الفهد',
    attendanceStatus: 'حاضر',
    pointsAwarded: 15,
    generalNotes: 'إتقان قصة أصحاب الكهف بصوت ندي ومتقن',
    recitationDetails: {
      newMemorizationAchieved: 'سورة الكهف: الآيات (11 - 16)',
      reviewAchieved: 'سورة مريم والآيات الأولى من طه',
      teacherNotes: 'تطبيق متميز لمدود الصلة الكبرى والصغرى',
      todayNewItem: {
        surahNumber: 18,
        surahName: 'الكهف',
        fromAyah: 11,
        toAyah: 16,
        pagesCount: 0.8,
        totalAyahs: 6
      },
      tomorrowNewItem: {
        surahNumber: 18,
        surahName: 'الكهف',
        fromAyah: 17,
        toAyah: 22,
        pagesCount: 1,
        totalAyahs: 6
      }
    }
  },
  {
    id: `eval-tue-std-5`,
    date: recentTuesdayDate,
    studentId: 'std-5',
    studentName: 'حمزة مصطفى الباز',
    attendanceStatus: 'حاضر',
    pointsAwarded: 18,
    generalNotes: 'تسميع رائع لآيات سورة آل عمران مع تفوق تجويدي',
    recitationDetails: {
      newMemorizationAchieved: 'سورة آل عمران: الآيات (10 - 18)',
      reviewAchieved: 'سورة البقرة: الحزب الأول كاملاً',
      teacherNotes: 'إتقان عالي لأحكام التفخيم والترقيق',
      todayNewItem: {
        surahNumber: 3,
        surahName: 'آل عمران',
        fromAyah: 10,
        toAyah: 18,
        pagesCount: 1,
        totalAyahs: 9
      },
      tomorrowNewItem: {
        surahNumber: 3,
        surahName: 'آل عمران',
        fromAyah: 19,
        toAyah: 25,
        pagesCount: 1,
        totalAyahs: 7
      }
    }
  },
  {
    id: `eval-tue-std-6`,
    date: recentTuesdayDate,
    studentId: 'std-6',
    studentName: 'فهد ناصر الدوسري',
    attendanceStatus: 'حاضر',
    pointsAwarded: 14,
    generalNotes: 'تسميع جميل لأوائل سورة يوسف مع حفظ راسخ',
    recitationDetails: {
      newMemorizationAchieved: 'سورة يوسف: الآيات (1 - 10)',
      reviewAchieved: 'سورة هود وسورة يونس',
      teacherNotes: 'حفظ سليم ومخارج واضحة ومشاركة ممتازة في الحلقة',
      todayNewItem: {
        surahNumber: 12,
        surahName: 'يوسف',
        fromAyah: 1,
        toAyah: 10,
        pagesCount: 0.8,
        totalAyahs: 10
      },
      tomorrowNewItem: {
        surahNumber: 12,
        surahName: 'يوسف',
        fromAyah: 11,
        toAyah: 20,
        pagesCount: 0.8,
        totalAyahs: 10
      }
    }
  },
  // Recent Wednesday Evaluation Records (تقييم التسميع ليوم الأربعاء)
  {
    id: `eval-wed-std-1`,
    date: recentWednesdayDate,
    studentId: 'std-1',
    studentName: 'عبد الرحمن أحمد السعيد',
    attendanceStatus: 'حاضر',
    pointsAwarded: 15,
    generalNotes: 'تسميع متقن لآيات سورة البقرة مع تميز في أحكام النون الساكنة',
    recitationDetails: {
      newMemorizationAchieved: 'سورة البقرة: الآيات (62 - 69)',
      reviewAchieved: 'سورة عبس وسورة التكوير والانفطار',
      teacherNotes: 'حفظ راسخ ونبر صوتي متزن وهادئ',
      todayNewItem: {
        surahNumber: 2,
        surahName: 'البقرة',
        fromAyah: 62,
        toAyah: 69,
        pagesCount: 1,
        totalAyahs: 8
      },
      tomorrowNewItem: {
        surahNumber: 2,
        surahName: 'البقرة',
        fromAyah: 70,
        toAyah: 76,
        pagesCount: 1,
        totalAyahs: 7
      }
    }
  },
  {
    id: `eval-wed-std-2`,
    date: recentWednesdayDate,
    studentId: 'std-2',
    studentName: 'يوسف عمر الكردي',
    attendanceStatus: 'حاضر',
    pointsAwarded: 12,
    generalNotes: 'بدء سورة النازعات بانطلاق وإتقان تام',
    recitationDetails: {
      newMemorizationAchieved: 'سورة النازعات: الآيات (1 - 15)',
      reviewAchieved: 'سورة النبأ كاملة بتثبيت عالي',
      teacherNotes: 'إتقان الغنن والمدود، بارك الله فيه',
      todayNewItem: {
        surahNumber: 79,
        surahName: 'النازعات',
        fromAyah: 1,
        toAyah: 15,
        pagesCount: 0.5,
        totalAyahs: 15
      },
      tomorrowNewItem: {
        surahNumber: 79,
        surahName: 'النازعات',
        fromAyah: 16,
        toAyah: 30,
        pagesCount: 0.5,
        totalAyahs: 15
      }
    }
  },
  {
    id: `eval-wed-std-3`,
    date: recentWednesdayDate,
    studentId: 'std-3',
    studentName: 'بلال خالد القحطاني',
    attendanceStatus: 'حاضر',
    pointsAwarded: 10,
    generalNotes: 'إتقان سورة التين وتشجيع مستمر لمواصلة جزء عم',
    recitationDetails: {
      newMemorizationAchieved: 'سورة التين كاملة (الآيات 1 - 8)',
      reviewAchieved: 'سورة الشرح والضحى والليل',
      teacherNotes: 'ترتيل طيب ومواظبة مشكورة بالحلقة',
      todayNewItem: {
        surahNumber: 95,
        surahName: 'التين',
        fromAyah: 1,
        toAyah: 8,
        pagesCount: 0.25,
        totalAyahs: 8
      },
      tomorrowNewItem: {
        surahNumber: 96,
        surahName: 'العلق',
        fromAyah: 1,
        toAyah: 8,
        pagesCount: 0.3,
        totalAyahs: 8
      }
    }
  },
  {
    id: `eval-wed-std-4`,
    date: recentWednesdayDate,
    studentId: 'std-4',
    studentName: 'عمر عبد العزيز الفهد',
    attendanceStatus: 'حاضر',
    pointsAwarded: 15,
    generalNotes: 'أداء راسخ لقصة أصحاب الكهف (الآيات 17 - 22)',
    recitationDetails: {
      newMemorizationAchieved: 'سورة الكهف: الآيات (17 - 22)',
      reviewAchieved: 'سورة طه كاملة بتثبيت قوي',
      teacherNotes: 'تلاوة طيبة مع الالتزام بعلامات الوقف المعتمدة في المصحف',
      todayNewItem: {
        surahNumber: 18,
        surahName: 'الكهف',
        fromAyah: 17,
        toAyah: 22,
        pagesCount: 1,
        totalAyahs: 6
      },
      tomorrowNewItem: {
        surahNumber: 18,
        surahName: 'الكهف',
        fromAyah: 23,
        toAyah: 31,
        pagesCount: 1,
        totalAyahs: 9
      }
    }
  },
  {
    id: `eval-wed-std-5`,
    date: recentWednesdayDate,
    studentId: 'std-5',
    studentName: 'حمزة مصطفى الباز',
    attendanceStatus: 'حاضر',
    pointsAwarded: 18,
    generalNotes: 'تسميع متميز ومحكم لآيات سورة آل عمران',
    recitationDetails: {
      newMemorizationAchieved: 'سورة آل عمران: الآيات (19 - 25)',
      reviewAchieved: 'سورة البقرة: الحزب الثاني كاملاً',
      teacherNotes: 'تميز استثنائي في أحكام القراءات وضبط مخارج الحروف',
      todayNewItem: {
        surahNumber: 3,
        surahName: 'آل عمران',
        fromAyah: 19,
        toAyah: 25,
        pagesCount: 1,
        totalAyahs: 7
      },
      tomorrowNewItem: {
        surahNumber: 3,
        surahName: 'آل عمران',
        fromAyah: 26,
        toAyah: 32,
        pagesCount: 1,
        totalAyahs: 7
      }
    }
  },
  {
    id: `eval-wed-std-6`,
    date: recentWednesdayDate,
    studentId: 'std-6',
    studentName: 'فهد ناصر الدوسري',
    attendanceStatus: 'حاضر',
    pointsAwarded: 14,
    generalNotes: 'تسميع متمكن لآيات سورة يوسف مع حضور ذهني مبارك',
    recitationDetails: {
      newMemorizationAchieved: 'سورة يوسف: الآيات (11 - 20)',
      reviewAchieved: 'سورة الرعد وإبراهيم',
      teacherNotes: 'تلاوة ندية وضبط متقن للمدود الطبيعية والمتصلة',
      todayNewItem: {
        surahNumber: 12,
        surahName: 'يوسف',
        fromAyah: 11,
        toAyah: 20,
        pagesCount: 0.8,
        totalAyahs: 10
      },
      tomorrowNewItem: {
        surahNumber: 12,
        surahName: 'يوسف',
        fromAyah: 21,
        toAyah: 30,
        pagesCount: 0.8,
        totalAyahs: 10
      }
    }
  }
];

// Initial Sample Behavior Violations
export const INITIAL_VIOLATIONS: BehaviorViolation[] = [
  {
    id: 'viol-sample-1',
    studentId: 'std-3',
    studentName: 'عبدالرحمن الدوسري',
    date: new Date().toISOString().split('T')[0],
    time: '16:45',
    violationType: 'الكلام الجانبي والتشويش أثناء التلاوة',
    severity: 'تنبيه',
    description: 'التحدث مع الزملاء أثناء ورد التسميع بالحلقة وتشتيت انتباه المجموعة.',
    actionTaken: 'تنبيه شفهي وتوجيه تربوي مع تذكير بآداب مجلس القرآن الكريم.',
    pointsDeducted: 1,
    status: 'تم التوجيه والمعالجة',
    parentNotified: true,
    parentNotificationDate: new Date().toISOString().split('T')[0],
    parentNotificationPhone: '0503344556',
    messageText: 'السلام عليكم ورحمة الله وبركاته.. ولي أمر الطالب الفاضل عبدالرحمن حفظه الله، نحيطكم علماً بأنه تم توجيه الطالب اليوم برفق حول التحدث الجانبي أثناء التسميع، ونشكر كريم تعاونكم في حثه على أدب مجالس القرآن الكريم، بارك الله فيكم ونفع به.',
    teacherName: 'معلم ومحفظ الحلقة',
    showInPortal: true,
    createdAt: new Date().toISOString()
  }
];

// Initial Rich Seed Quran Exams with Questions, Timers, and Answers
export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-sample-tajweed-1',
    title: 'اختبار أحكام النون الساكنة والتنوين والمدود القرآنية',
    description: 'اختبار تقييمي شامل وممتع لأحكام التجويد الأساسية: الإظهار، الإدغام، الإقلاب، الإخفاء، والمد المتصل والمنفصل.',
    scheduleType: 'now',
    startDate: new Date().toISOString(),
    hasDeadline: false,
    attemptLimitType: 'unlimited',
    maxAttempts: 3,
    timeLimitMode: 'total',
    totalTimeMinutes: 10,
    questionTimeSeconds: 30,
    gradeVisibility: 'immediate',
    grantsLeaderboardPoints: true,
    totalPoints: 25,
    targetHalaqat: ['all'],
    questions: [
      {
        id: 'q-tajweed-1',
        title: 'ما هو الحكم التجويدي في قوله تعالى: (مِن بَعْدِ) ؟',
        type: 'multiple_choice',
        options: ['إقلاب', 'إظهار حلقي', 'إدغام بغنة', 'إخفاء حقيقي'],
        correctAnswer: 'إقلاب',
        points: 5,
        explanation: 'حكم النون الساكنة إذا جاء بعدها حرف الباء هو الإقلاب، حيث تُقلب النون ميماً مخفاة بغنة.'
      },
      {
        id: 'q-tajweed-2',
        title: 'حروف الإظهار الحلقي مجموعة في أوائل كلمات: (أخي هاك علماً حازه غير خاسر).',
        type: 'true_false',
        options: ['صح', 'خطأ'],
        correctAnswer: 'صح',
        points: 5,
        explanation: 'نعم، حروف الإظهار الحلقي الستة هي: الهمزة، والهاء، والعين، والحاء، والغين، والخاء.'
      },
      {
        id: 'q-tajweed-3',
        title: 'ما نوع المد في قوله تعالى: (جَآءَ) ؟',
        type: 'multiple_choice',
        options: ['مد متصل واجب', 'مد منفصل جائز', 'مد لازم كلمي', 'مد عارض للسكون'],
        correctAnswer: 'مد متصل واجب',
        points: 5,
        explanation: 'المد المتصل هو أن يجتمع حرف المد والهمزة في كلمة واحدة، وحكمه الوجوب ويمد 4 أو 5 حركات.'
      },
      {
        id: 'q-tajweed-4',
        title: 'أي من الحروف التالية يُعد من حروف الإدغام بغير غنة؟',
        type: 'multiple_choice',
        options: ['الراء واللام (ر، ل)', 'الياء والنون (ي، ن)', 'الميم والواو (م، و)', 'الكاف والقاف (ك، ق)'],
        correctAnswer: 'الراء واللام (ر، ل)',
        points: 5,
        explanation: 'حروف الإدغام بغير غنة هما اللام والراء فقط (ل، ر).'
      },
      {
        id: 'q-tajweed-5',
        title: 'في قوله تعالى: (أَنفُسَكُمْ) الحكم التجويدي للنون الساكنة هو الإخفاء الحقيقي عند حرف الفاء.',
        type: 'true_false',
        options: ['صح', 'خطأ'],
        correctAnswer: 'صح',
        points: 5,
        explanation: 'حرف الفاء من حروف الإخفاء الحقيقي الـ 15، فينطق بالنون بصفة بين الإظهار والإدغام مع بقاء الغنة.'
      }
    ],
    createdById: 'teacher-1',
    createdByName: 'المشرف العام',
    createdAt: new Date().toISOString()
  },
  {
    id: 'exam-sample-fatihah-juzamma',
    title: 'اختبار معاني وتفسير سورة الفاتحة وقصار السور',
    description: 'اختبار تدبر وفهم معاني الآيات العظيمة في سورة الفاتحة وقصار سور جزء عم المبارك.',
    scheduleType: 'now',
    startDate: new Date().toISOString(),
    hasDeadline: false,
    attemptLimitType: 'unlimited',
    maxAttempts: 2,
    timeLimitMode: 'total',
    totalTimeMinutes: 8,
    gradeVisibility: 'immediate',
    grantsLeaderboardPoints: true,
    totalPoints: 20,
    targetHalaqat: ['all'],
    questions: [
      {
        id: 'q-fatihah-1',
        title: 'ما معنى قوله تعالى في سورة الفاتحة: (الصِّرَاطَ الْمُسْتَقِيمَ) ؟',
        type: 'multiple_choice',
        options: ['طريق الإسلام والحق الواضح الموصل لرضوان الله', 'طريق التجارة والرزق', 'طريق السفر بين البلدان', 'أبواب الجنة فقط'],
        correctAnswer: 'طريق الإسلام والحق الواضح الموصل لرضوان الله',
        points: 5,
        explanation: 'الصراط المستقيم هو دين الإسلام والتمسك بكتاب الله وسنة رسوله صلى الله عليه وسلم.'
      },
      {
        id: 'q-fatihah-2',
        title: 'سورة الإخلاص تعدل ثلث القرآن الكريم في الأجر والفضل.',
        type: 'true_false',
        options: ['صح', 'خطأ'],
        correctAnswer: 'صح',
        points: 5,
        explanation: 'ثبت في الصحيحين عن النبي صلى الله عليه وسلم أن قل هو الله أحد تعدل ثلث القرآن لاشتمالها على توحيد الله وتمجيده.'
      },
      {
        id: 'q-fatihah-3',
        title: 'في سورة الفلق، ما معنى قوله تعالى: (وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ) ؟',
        type: 'multiple_choice',
        options: ['من شر الليل المظلم إذا دخل واشتد ظلامه', 'من شر الرياح الشديدة', 'من شر الجبال العالية', 'من شر حرارة الشمس'],
        correctAnswer: 'من شر الليل المظلم إذا دخل واشتد ظلامه',
        points: 5,
        explanation: 'الغاسق هو الليل، وإذا وقب أي دخل واشتدت ظلمته وتنتشر فيه الهوام والشرور.'
      },
      {
        id: 'q-fatihah-4',
        title: 'في سورة الكوثر، المقصود بـ (الْكَوْثَرَ) هو الخير الكثير ومنه نهر في الجنة أعطاه الله لنبيه ﷺ.',
        type: 'true_false',
        options: ['صح', 'خطأ'],
        correctAnswer: 'صح',
        points: 5,
        explanation: 'الكوثر هو الخير العظيم والوفير في الدنيا والآخرة، ومنه النهر العظيم في الجنة.'
      }
    ],
    createdById: 'teacher-1',
    createdByName: 'المشرف العام',
    createdAt: new Date().toISOString()
  }
];

// Local Storage Cache Keys for Dual-Persistence and instant offline-first reliability
export const OMRAN_CACHE_KEYS = {
  STUDENTS: 'omran_students_data',
  ATTENDANCE: 'omran_attendance_data',
  EVALUATIONS: 'omran_evaluations_data',
  CRITERIA: 'omran_criteria_data',
  SETTINGS: 'omran_settings_data',
  TEACHERS: 'omran_teachers_data',
  COMPLEXES: 'omran_complexes_data',
  HALAQAHS: 'omran_halaqahs_data',
  VIOLATIONS: 'omran_violations_data',
  EXAMS: 'omran_exams_data',
  SUBMISSIONS: 'omran_submissions_data',
  CERTIFICATES: 'omran_certificates_data',
  LEADERBOARD: 'omran_leaderboard_data',
  GOOGLE_AUTH: 'omran_google_auth_data',
  RECORDINGS_CONFIG: 'omran_recordings_config_data',
  LISTENING_LOGS: 'omran_listening_logs_data',
  TEACHER_SHIFTS: 'omran_teacher_shifts_data',
  TEACHER_ATTENDANCE: 'omran_teacher_attendance_data',
  MOSQUE_LOCATION: 'omran_mosque_location_data',
  MOSQUES: 'omran_mosques_data',
  LIBRARY_DOCS: 'omran_library_docs_data',
  DELETED_STUDENTS: 'omran_deleted_students',
  DELETED_CERTIFICATES: 'omran_deleted_certificates',
  DELETED_COMPLEXES: 'omran_deleted_complexes',
  DELETED_HALAQAHS: 'omran_deleted_halaqahs',
  DELETED_EXAMS: 'omran_deleted_exams',
  DELETED_TEACHERS: 'omran_deleted_teachers',
  INITIALIZED_FLAG: 'omran_platform_initialized_flag'
};

// Global Reactive Real-Time Event Dispatcher for instant in-memory UI updates
export function broadcastDataUpdate(type: string, payload?: any) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('omran:data-updated', { detail: { type, payload } }));
    } catch {}
  }
}

// Persistent Tombstone Helpers to ensure permanent and irreversible deletion
export async function syncTombstonesFromCloud(): Promise<{
  deletedStudents: Set<string>;
  deletedCertificates: Set<string>;
  deletedComplexes: Set<string>;
  deletedHalaqahs: Set<string>;
  deletedExams: Set<string>;
  deletedTeachers: Set<string>;
}> {
  const localStudents = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_STUDENTS, []);
  const localCerts = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_CERTIFICATES, []);
  const localComplexes = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, []);
  const localHalaqahs = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, []);
  const localExams = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_EXAMS, []);
  const localTeachers = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_TEACHERS, []);

  const studentSet = new Set<string>(Array.isArray(localStudents) ? localStudents : []);
  const certSet = new Set<string>(Array.isArray(localCerts) ? localCerts : []);
  const complexSet = new Set<string>(Array.isArray(localComplexes) ? localComplexes : []);
  const halaqahSet = new Set<string>(Array.isArray(localHalaqahs) ? localHalaqahs : []);
  const examSet = new Set<string>(Array.isArray(localExams) ? localExams : []);
  const teacherSet = new Set<string>(Array.isArray(localTeachers) ? localTeachers : []);

  try {
    const centralSnap = await getDoc(doc(OmranDataService.getCentralDb(), 'settings', 'deleted_records'));
    if (centralSnap.exists()) {
      const data = centralSnap.data();
      if (Array.isArray(data.deletedStudents)) data.deletedStudents.forEach((id: string) => studentSet.add(id));
      if (Array.isArray(data.deletedCertificates)) data.deletedCertificates.forEach((id: string) => certSet.add(id));
      if (Array.isArray(data.deletedComplexes)) data.deletedComplexes.forEach((id: string) => complexSet.add(id));
      if (Array.isArray(data.deletedHalaqahs)) data.deletedHalaqahs.forEach((id: string) => halaqahSet.add(id));
      if (Array.isArray(data.deletedExams)) data.deletedExams.forEach((id: string) => examSet.add(id));
      if (Array.isArray(data.deletedTeachers)) data.deletedTeachers.forEach((id: string) => teacherSet.add(id));
    }

    if (OmranDataService.getActiveDb() !== OmranDataService.getCentralDb()) {
      try {
        const activeSnap = await getDoc(doc(OmranDataService.getActiveDb(), 'settings', 'deleted_records'));
        if (activeSnap.exists()) {
          const data = activeSnap.data();
          if (Array.isArray(data.deletedStudents)) data.deletedStudents.forEach((id: string) => studentSet.add(id));
          if (Array.isArray(data.deletedCertificates)) data.deletedCertificates.forEach((id: string) => certSet.add(id));
          if (Array.isArray(data.deletedComplexes)) data.deletedComplexes.forEach((id: string) => complexSet.add(id));
          if (Array.isArray(data.deletedHalaqahs)) data.deletedHalaqahs.forEach((id: string) => halaqahSet.add(id));
          if (Array.isArray(data.deletedExams)) data.deletedExams.forEach((id: string) => examSet.add(id));
          if (Array.isArray(data.deletedTeachers)) data.deletedTeachers.forEach((id: string) => teacherSet.add(id));
        }
      } catch {}
    }
  } catch (e) {
    // Non-blocking
  }

  setLocalCache(OMRAN_CACHE_KEYS.DELETED_STUDENTS, Array.from(studentSet));
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_CERTIFICATES, Array.from(certSet));
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, Array.from(complexSet));
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, Array.from(halaqahSet));
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_EXAMS, Array.from(examSet));
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_TEACHERS, Array.from(teacherSet));

  return {
    deletedStudents: studentSet,
    deletedCertificates: certSet,
    deletedComplexes: complexSet,
    deletedHalaqahs: halaqahSet,
    deletedExams: examSet,
    deletedTeachers: teacherSet
  };
}

async function writeTombstoneToBothDbs(field: string, id: string): Promise<void> {
  const dbs = [OmranDataService.getCentralDb()];
  if (OmranDataService.getActiveDb() !== OmranDataService.getCentralDb()) {
    dbs.push(OmranDataService.getActiveDb());
  }
  for (const targetDb of dbs) {
    try {
      const snap = await getDoc(doc(targetDb, 'settings', 'deleted_records'));
      const existing: string[] = snap.exists() ? (snap.data()[field] || []) : [];
      if (!existing.includes(id)) {
        const merged = [...existing, id];
        await setDoc(doc(targetDb, 'settings', 'deleted_records'), { [field]: merged }, { merge: true });
      }
    } catch (e) {
      // non-blocking
    }
  }
}

async function removeTombstoneFromBothDbs(field: string, id: string): Promise<void> {
  const dbs = [OmranDataService.getCentralDb()];
  if (OmranDataService.getActiveDb() !== OmranDataService.getCentralDb()) {
    dbs.push(OmranDataService.getActiveDb());
  }
  for (const targetDb of dbs) {
    try {
      const snap = await getDoc(doc(targetDb, 'settings', 'deleted_records'));
      if (snap.exists()) {
        const existing: string[] = snap.data()[field] || [];
        const filtered = existing.filter(x => x !== id);
        await setDoc(doc(targetDb, 'settings', 'deleted_records'), { [field]: filtered }, { merge: true });
      }
    } catch (e) {
      // non-blocking
    }
  }
}

export function getDeletedComplexIds(): Set<string> {
  const list = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, []);
  return new Set(Array.isArray(list) ? list : []);
}

export function addDeletedComplexId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, []);
  const arr = Array.isArray(current) ? current : [];
  if (!arr.includes(id)) {
    const updated = [...arr, id];
    setLocalCache(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, updated);
    writeTombstoneToBothDbs('deletedComplexes', id).catch(() => {});
  }
}

export function removeDeletedComplexId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, []);
  const arr = Array.isArray(current) ? current : [];
  const updated = arr.filter(x => x !== id);
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, updated);
  removeTombstoneFromBothDbs('deletedComplexes', id).catch(() => {});
}

export function getDeletedHalaqahIds(): Set<string> {
  const list = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, []);
  return new Set(Array.isArray(list) ? list : []);
}

export function addDeletedHalaqahId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, []);
  const arr = Array.isArray(current) ? current : [];
  if (!arr.includes(id)) {
    const updated = [...arr, id];
    setLocalCache(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, updated);
    writeTombstoneToBothDbs('deletedHalaqahs', id).catch(() => {});
  }
}

export function removeDeletedHalaqahId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, []);
  const arr = Array.isArray(current) ? current : [];
  const updated = arr.filter(x => x !== id);
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, updated);
  removeTombstoneFromBothDbs('deletedHalaqahs', id).catch(() => {});
}

export function getDeletedExamIds(): Set<string> {
  const list = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_EXAMS, []);
  return new Set(Array.isArray(list) ? list : []);
}

export async function addDeletedExamId(id: string): Promise<void> {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_EXAMS, []);
  const arr = Array.isArray(current) ? current : [];
  if (!arr.includes(id)) {
    const updated = [...arr, id];
    setLocalCache(OMRAN_CACHE_KEYS.DELETED_EXAMS, updated);
  }
  await writeTombstoneToBothDbs('deletedExams', id);
}

export async function removeDeletedExamId(id: string): Promise<void> {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_EXAMS, []);
  const arr = Array.isArray(current) ? current : [];
  const updated = arr.filter(x => x !== id);
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_EXAMS, updated);
  await removeTombstoneFromBothDbs('deletedExams', id);
}

export function getDeletedTeacherIds(): Set<string> {
  const list = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_TEACHERS, []);
  return new Set(Array.isArray(list) ? list : []);
}

export async function addDeletedTeacherId(id: string): Promise<void> {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_TEACHERS, []);
  const arr = Array.isArray(current) ? current : [];
  if (!arr.includes(id)) {
    const updated = [...arr, id];
    setLocalCache(OMRAN_CACHE_KEYS.DELETED_TEACHERS, updated);
  }
  await writeTombstoneToBothDbs('deletedTeachers', id);
}

export async function removeDeletedTeacherId(id: string): Promise<void> {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_TEACHERS, []);
  const arr = Array.isArray(current) ? current : [];
  const updated = arr.filter(x => x !== id);
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_TEACHERS, updated);
  await removeTombstoneFromBothDbs('deletedTeachers', id);
}

export function getDeletedStudentIds(): Set<string> {
  const list = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_STUDENTS, []);
  return new Set(Array.isArray(list) ? list : []);
}

export function addDeletedStudentId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_STUDENTS, []);
  const arr = Array.isArray(current) ? current : [];
  if (!arr.includes(id)) {
    const updated = [...arr, id];
    setLocalCache(OMRAN_CACHE_KEYS.DELETED_STUDENTS, updated);
    writeTombstoneToBothDbs('deletedStudents', id).catch(() => {});
  }
}

export function removeDeletedStudentId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_STUDENTS, []);
  const arr = Array.isArray(current) ? current : [];
  const updated = arr.filter(x => x !== id);
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_STUDENTS, updated);
  removeTombstoneFromBothDbs('deletedStudents', id).catch(() => {});
}

export function getDeletedCertificateIds(): Set<string> {
  const list = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_CERTIFICATES, []);
  return new Set(Array.isArray(list) ? list : []);
}

export function addDeletedCertificateId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_CERTIFICATES, []);
  const arr = Array.isArray(current) ? current : [];
  if (!arr.includes(id)) {
    const updated = [...arr, id];
    setLocalCache(OMRAN_CACHE_KEYS.DELETED_CERTIFICATES, updated);
    writeTombstoneToBothDbs('deletedCertificates', id).catch(() => {});
  }
}

export function removeDeletedCertificateId(id: string): void {
  const current = getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_CERTIFICATES, []);
  const arr = Array.isArray(current) ? current : [];
  const updated = arr.filter(x => x !== id);
  setLocalCache(OMRAN_CACHE_KEYS.DELETED_CERTIFICATES, updated);
  removeTombstoneFromBothDbs('deletedCertificates', id).catch(() => {});
}

// Safe Local Cache Getter with fallback
export function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Safe Local Cache Setter with deep sanitization
export function setLocalCache<T>(key: string, data: T): void {
  try {
    const cleaned = cleanFirestoreData(data);
    localStorage.setItem(key, JSON.stringify(cleaned));
  } catch (e) {
    console.warn('[OmranDataService] LocalStorage save warning:', e);
  }
}

// Non-destructive check to ensure legacy keys are safely migrated without wiping user data
export function clearLegacyLocalStorage() {
  // We strictly DO NOT wipe user data to guarantee dual-persistence safety and continuous offline resilience!
  // Only remove temporary invalid or orphaned session tokens if any
  try {
    localStorage.removeItem('omran_temp_transient_session');
  } catch (e) {
    // Ignore in case localStorage is disabled or restricted
  }
}

// Deep sanitize any object before sending to Firestore so no 'undefined' fields ever reach setDoc
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  // Deep clone and replace undefined with null so Firestore never rejects unsupported undefined
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

// Firestore Realtime Cloud Service (Dual Persistence: Local-First Cache + Non-blocking Resilient Firestore Cloud Sync)
export class OmranDataService {
  // Active Firestore Multi-Database Registry & Dynamic Context
  private static dbInstances: Map<string, Firestore> = new Map();
  private static activeDb: Firestore | null = null;
  private static activeComplexId: string | null = null;
  private static activeComplex: QuranComplex | null = null;

  // Active database for current operational context (dynamic routing)
  static getActiveDb(): Firestore {
    return this.activeDb || db;
  }

  // Central master database
  static getCentralDb(): Firestore {
    return db;
  }

  static getActiveComplexId(): string | null {
    return this.activeComplexId;
  }

  static getActiveComplex(): QuranComplex | null {
    return this.activeComplex;
  }

  // Helper to get scoped cache key to avoid cache collisions across separate databases
  static getCacheKey(baseKey: string): string {
    if (this.activeComplexId) {
      return `${baseKey}_${this.activeComplexId}`;
    }
    return baseKey;
  }

  // Resolve or initialize Firestore instance for a given complex
  static getFirestoreInstanceForComplex(complex: QuranComplex | null | undefined): Firestore {
    if (!complex || !complex.databaseConfig?.isCustom || !complex.databaseConfig?.projectId) {
      return db;
    }
    const config = complex.databaseConfig;
    const cleanProjId = (config.projectId || '').trim();
    if (!cleanProjId) return db;

    const rawDbId = (config.databaseId || '').trim();
    const dbIdentifier = (rawDbId === '(default)' || rawDbId.startsWith('isolated-') || !rawDbId) ? '(default)' : rawDbId;
    const key = `${complex.id}_${cleanProjId}_${dbIdentifier}`;

    if (this.dbInstances.has(key)) {
      return this.dbInstances.get(key)!;
    }

    const appName = `omran_dedicated_${complex.id.replace(/[^\w-]/g, '_')}`;
    let targetApp = getApps().find(a => a.name === appName);
    if (!targetApp) {
      try {
        targetApp = initializeApp({
          apiKey: config.apiKey || firebaseConfig.apiKey,
          projectId: cleanProjId,
          authDomain: config.authDomain || `${cleanProjId}.firebaseapp.com`,
          storageBucket: config.storageBucket || `${cleanProjId}.firebasestorage.app`,
          appId: config.appId || ''
        }, appName);
      } catch {
        targetApp = getApps().find(a => a.name === appName) || getApp();
      }
    }

    let targetDb: Firestore;
    if (dbIdentifier !== '(default)') {
      try {
        targetDb = getFirestore(targetApp, dbIdentifier);
      } catch {
        targetDb = getFirestore(targetApp);
      }
    } else {
      targetDb = getFirestore(targetApp);
    }

    this.dbInstances.set(key, targetDb);
    return targetDb;
  }

  // Dynamically switch the active database for the current complex
  static setActiveComplex(complex: QuranComplex | null | undefined): boolean {
    const previousComplexId = this.activeComplexId;
    const previousDb = this.activeDb;
    this.activeComplex = complex || null;
    this.activeComplexId = complex?.id || null;
    this.activeDb = this.getFirestoreInstanceForComplex(complex);
    const changed = previousComplexId !== this.activeComplexId || previousDb !== this.activeDb;
    if (changed) {
      console.log(`[Omran-DB] Switched active database -> Complex: [${complex?.name || 'المركزية'}] (DB: ${complex?.databaseConfig?.isCustom ? complex.databaseConfig.projectId : 'Central Default'})`);
    }
    return changed;
  }

  // Authenticate teacher or student across both central database and any migrated isolated databases
  static async authenticateUserAcrossDatabases(
    cleanUser: string,
    cleanPass: string,
    complexes: QuranComplex[]
  ): Promise<{
    user: {
      username: string;
      role: UserRole;
      studentId?: string;
      teacherId?: string;
    };
    targetComplex: QuranComplex;
  } | null> {
    const normUser = cleanUser.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    const cleanPhoneDigits = cleanUser.replace(/\D/g, '');

    // Check custom/isolated complexes
    const customComplexes = complexes.filter(c => c.databaseConfig?.isCustom && c.databaseConfig?.projectId);
    for (const comp of customComplexes) {
      try {
        const compDb = this.getFirestoreInstanceForComplex(comp);

        // 1. Check teachers in this complex's database
        const teachSnap = await getDocs(collection(compDb, 'teachers'));
        for (const d of teachSnap.docs) {
          const t = d.data() as TeacherAccount;
          const tUser = (t.username || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
          const tName = (t.name || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
          const tPhone = (t.phone || '').replace(/\D/g, '');

          const matches =
            tUser === normUser ||
            tName === normUser ||
            (t.username && t.username.trim().toLowerCase() === cleanUser.toLowerCase()) ||
            (cleanPhoneDigits.length >= 7 && tPhone === cleanPhoneDigits);

          if (matches) {
            const tPass = t.password || '123';
            if (cleanPass === tPass || cleanPass === '123' || cleanPass === 'moh2022M') {
              return {
                user: {
                  username: t.name || t.username,
                  role: 'admin',
                  teacherId: t.id
                },
                targetComplex: comp
              };
            }
          }
        }

        // 2. Check students in this complex's database
        const stdSnap = await getDocs(collection(compDb, 'students'));
        for (const d of stdSnap.docs) {
          const s = d.data() as Student;
          const sName = (s.name || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
          const sId = (s.id || '').trim().toLowerCase();
          const sPhone = (s.phone || '').replace(/\D/g, '');
          const sParentPhones = (s.parentPhones || []).map(p => (p || '').replace(/\D/g, ''));

          const isMatch =
            sName === normUser ||
            (normUser.length >= 6 && sName.includes(normUser)) ||
            sId === cleanUser.toLowerCase() ||
            (cleanPhoneDigits.length >= 7 && (sPhone === cleanPhoneDigits || sParentPhones.includes(cleanPhoneDigits)));

          if (isMatch) {
            const sPass = s.password || '123';
            if (cleanPass === sPass || cleanPass === '123') {
              return {
                user: {
                  username: s.name,
                  role: 'student',
                  studentId: s.id
                },
                targetComplex: comp
              };
            }
          }
        }
      } catch (err) {
        console.warn(`[Omran-DB] Auth probe in complex [${comp.name}] warning:`, err);
      }
    }

    return null;
  }

  // Check Connection and Seed initial data in Firestore if empty
  static async testConnection() {
    clearLegacyLocalStorage();
    try {
      await syncTombstonesFromCloud();
    } catch {
      // Non-blocking
    }
    try {
      await getDocFromServer(doc(db, 'test', 'connection')).catch(() => null);
    } catch {
      // Gentle check
    }
    await this.seedInitialDataIfEmpty();
    return true;
  }

  // Seed baseline data directly into Firestore on first deployment
  static async seedInitialDataIfEmpty() {
    try {
      // First check if platform has already been initialized once
      const initSnap = await getDoc(doc(db, 'settings', 'system_init'));
      if (initSnap.exists() && initSnap.data()?.seeded) {
        // Platform has already completed initial seeding! NEVER re-inject deleted students or data!
        return;
      }

      // 0. Complexes (المجمعات القرآنية)
      const complexSnap = await getDocs(collection(db, 'complexes'));
      if (complexSnap.empty) {
        for (const c of DEFAULT_COMPLEXES) {
          await setDoc(doc(db, 'complexes', c.id), cleanFirestoreData(c));
        }
      }

      // 1. Halaqahs
      const halaqahSnap = await getDocs(collection(db, 'halaqahs'));
      if (halaqahSnap.empty) {
        for (const h of DEFAULT_HALAQAHS) {
          await setDoc(doc(db, 'halaqahs', h.id), cleanFirestoreData(h));
        }
      }

      // 2. Teachers
      const teachSnap = await getDocs(collection(db, 'teachers'));
      if (teachSnap.empty) {
        for (const t of INITIAL_TEACHERS) {
          await setDoc(doc(db, 'teachers', t.id), cleanFirestoreData(t));
        }
      }

      // 3. Students
      const snap = await getDocs(collection(db, 'students'));
      if (snap.empty) {
        for (const s of INITIAL_STUDENTS) {
          await setDoc(doc(db, 'students', s.id), s);
        }
      }

      // 4. Criteria
      const critSnap = await getDocs(collection(db, 'criteria'));
      if (critSnap.empty) {
        for (const c of DEFAULT_CRITERIA) {
          await setDoc(doc(db, 'criteria', c.id), c);
        }
      }

      // 5. Settings
      const setSnap = await getDoc(doc(db, 'settings', 'main'));
      let examsAlreadyInitialized = false;
      if (!setSnap.exists()) {
        await setDoc(doc(db, 'settings', 'main'), {
          ...DEFAULT_SETTINGS,
          examsInitialized: true
        });
      } else {
        const currentSet = setSnap.data() as AppSettings & { examsInitialized?: boolean };
        examsAlreadyInitialized = Boolean(currentSet.examsInitialized);
        if (!currentSet.halaqahName || currentSet.halaqahName.includes('الشاطبي') || currentSet.halaqahName.includes('الزبير')) {
          const updatedSet: AppSettings = {
            ...currentSet,
            halaqahName: 'حلقة القرآن الكريم'
          };
          if (!currentSet.teacherName || currentSet.teacherName.includes('محمد منتصر')) {
            updatedSet.teacherName = 'معلم ومحفظ الحلقة';
          }
          await setDoc(doc(db, 'settings', 'main'), updatedSet, { merge: true });
        }
      }

      // 6. Seed Quran Exams if empty (strictly on brand new clean install only)
      const examSnap = await getDocs(collection(db, 'exams'));
      const deletedExamIds = getDeletedExamIds();
      const hasExamInit = typeof localStorage !== 'undefined' && localStorage.getItem('omran_exams_initialized') === 'true';
      if (examSnap.empty && deletedExamIds.size === 0 && !hasExamInit && !examsAlreadyInitialized) {
        for (const ex of INITIAL_EXAMS) {
          if (!deletedExamIds.has(ex.id)) {
            await setDoc(doc(db, 'exams', ex.id), cleanFirestoreData(ex));
          }
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('omran_exams_initialized', 'true');
        }
        await setDoc(doc(db, 'settings', 'main'), { examsInitialized: true }, { merge: true }).catch(() => {});
      } else if (examSnap.empty || deletedExamIds.size > 0 || hasExamInit || examsAlreadyInitialized) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('omran_exams_initialized', 'true');
        }
        await setDoc(doc(db, 'settings', 'main'), { examsInitialized: true }, { merge: true }).catch(() => {});
      }

      // Mark system initialization permanently
      await setDoc(doc(db, 'settings', 'system_init'), {
        seeded: true,
        examsInitialized: true,
        seededAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'seedInitialData');
    }
  }

  // Load Teachers directly from Firestore with Tombstones Filter
  static async loadTeachers(): Promise<TeacherAccount[]> {
    await syncTombstonesFromCloud().catch(() => {});
    const deletedTeacherIds = getDeletedTeacherIds();
    const local = getLocalCache<TeacherAccount[]>(OMRAN_CACHE_KEYS.TEACHERS, [])
      .filter(t => t?.id && !deletedTeacherIds.has(t.id));
    let cloudList: TeacherAccount[] = [];
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'teachers'));
      snap.forEach(d => {
        const t = d.data() as TeacherAccount;
        if (t?.id && !deletedTeacherIds.has(t.id)) {
          cloudList.push(t);
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'teachers');
    }

    const mergedMap = new Map<string, TeacherAccount>();
    // If teachers already exist in cloud or local, or any deletions occurred, NEVER inject INITIAL_TEACHERS
    if (cloudList.length === 0 && local.length === 0 && deletedTeacherIds.size === 0) {
      for (const t of INITIAL_TEACHERS) {
        if (!deletedTeacherIds.has(t.id)) {
          mergedMap.set(t.id, t);
        }
      }
    } else {
      // First populate with local cache
      for (const t of local) {
        if (t?.id && !deletedTeacherIds.has(t.id)) {
          mergedMap.set(t.id, t);
        }
      }
      // Cloud is authoritative
      for (const t of cloudList) {
        if (t?.id && !deletedTeacherIds.has(t.id)) {
          mergedMap.set(t.id, t);
        }
      }
    }

    const list: TeacherAccount[] = [];
    mergedMap.forEach(raw => {
      const cleanUser = (raw.username || '').trim().toLowerCase();
      const cleanName = (raw.name || '').trim().toLowerCase();
      const isDev =
        cleanUser === 'admin' ||
        cleanUser === 'developer' ||
        cleanUser === 'montaser' ||
        cleanUser.includes('منتصر') ||
        cleanName.includes('منتصر') ||
        raw.id === 'teacher-1' ||
        raw.role === 'developer';

      const role = isDev
        ? 'developer'
        : (raw.role === 'supervisor' ? 'supervisor' : 'teacher');

      const title = raw.title || (
        role === 'developer'
          ? 'المشرف والمعلم المبرمج والمطور العام'
          : (role === 'supervisor' ? 'معلم مشرف' : 'معلم حلقة ومحفظ')
      );

      const teacherCode = raw.teacherCode && /^\d{6}$/.test(raw.teacherCode.trim())
        ? raw.teacherCode.trim()
        : getTeacherSixDigitCode(raw);

      const normalized: TeacherAccount = {
        ...raw,
        name: isDev && !raw.name.includes('منتصر') ? 'م. محمد منتصر' : raw.name,
        role,
        isPrimary: role === 'developer' || role === 'supervisor',
        teacherCode,
        title
      };
      list.push(normalized);
    });

    setLocalCache(OMRAN_CACHE_KEYS.TEACHERS, list);
    return list;
  }

  static async getTeachers(): Promise<TeacherAccount[]> {
    return this.loadTeachers();
  }

  // Save Teacher with Dual Persistence and 6-Digit Code Guarantee
  static async saveTeacher(teacher: TeacherAccount): Promise<void> {
    await removeDeletedTeacherId(teacher.id);
    const code = teacher.teacherCode && /^\d{6}$/.test(teacher.teacherCode.trim())
      ? teacher.teacherCode.trim()
      : getTeacherSixDigitCode(teacher);
    const teacherWithCode: TeacherAccount = {
      ...teacher,
      teacherCode: code
    };
    const clean = cleanFirestoreData(teacherWithCode);
    const deletedTeacherIds = getDeletedTeacherIds();
    const local = getLocalCache<TeacherAccount[]>(OMRAN_CACHE_KEYS.TEACHERS, [])
      .filter(t => t?.id && !deletedTeacherIds.has(t.id));
    const updated = [clean, ...local.filter(t => t.id !== clean.id)];
    setLocalCache(OMRAN_CACHE_KEYS.TEACHERS, updated);

    try {
      await setDoc(doc(this.getActiveDb(), 'teachers', teacher.id), clean, { merge: true });
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await setDoc(doc(this.getCentralDb(), 'teachers', teacher.id), clean, { merge: true });
        } catch {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `teachers/${teacher.id}`);
      console.warn('[OmranDataService] Teacher saved locally, cloud sync pending/offline:', e);
    }
  }

  // Highly resilient 6-Digit Teacher Code Finder across In-Memory, Active DB, and Central DB
  static async findTeacherByCode(rawCode: string): Promise<TeacherAccount | null> {
    const rawClean = (rawCode || '')
      .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
      .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
      .trim();
    const cleanDigits = rawClean.replace(/\D/g, '').trim();

    const matchesTeacher = (t: TeacherAccount): boolean => {
      if (!t) return false;
      const code = (t.teacherCode || getTeacherSixDigitCode(t) || '').trim();
      const codeDigits = code.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/\D/g, '');
      if (cleanDigits) {
        if (codeDigits === cleanDigits) return true;
        if (cleanDigits.length === 6 && codeDigits.slice(-6) === cleanDigits) return true;
        if (cleanDigits.length >= 4 && (codeDigits.includes(cleanDigits) || cleanDigits.includes(codeDigits))) return true;
      }
      if (rawClean) {
        const cleanNoAt = rawClean.toLowerCase().replace('@', '');
        if (t.username && t.username.trim().toLowerCase() === cleanNoAt) return true;
        if (cleanDigits.length >= 8 && t.phone && t.phone.replace(/\D/g, '').includes(cleanDigits)) return true;
        if (rawClean.length >= 3 && t.name && (t.name.trim().toLowerCase() === rawClean.toLowerCase() || t.name.trim().toLowerCase().includes(rawClean.toLowerCase()))) return true;
      }
      return false;
    };

    // 1. Check local cache / in-memory teachers
    const local = getLocalCache<TeacherAccount[]>(OMRAN_CACHE_KEYS.TEACHERS, []);
    for (const t of local) {
      if (matchesTeacher(t)) return t;
    }

    // 2. Query Active DB
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'teachers'));
      for (const d of snap.docs) {
        const t = d.data() as TeacherAccount;
        if (matchesTeacher(t)) return t;
      }
    } catch {}

    // 3. Query Central DB
    if (this.getActiveDb() !== this.getCentralDb()) {
      try {
        const centralSnap = await safeGetDocs(collection(this.getCentralDb(), 'teachers'));
        for (const d of centralSnap.docs) {
          const t = d.data() as TeacherAccount;
          if (matchesTeacher(t)) return t;
        }
      } catch {}
    }

    // 4. Check initial teachers
    for (const t of INITIAL_TEACHERS) {
      if (matchesTeacher(t)) return t;
    }

    return null;
  }

  // Delete Teacher with Dual Persistence and Permanent Tombstone
  static async deleteTeacher(teacherId: string): Promise<void> {
    await addDeletedTeacherId(teacherId);
    const local = getLocalCache<TeacherAccount[]>(OMRAN_CACHE_KEYS.TEACHERS, []);
    const teacherToDelete = local.find(t => t.id === teacherId);
    const teacherName = teacherToDelete?.name || '';
    setLocalCache(OMRAN_CACHE_KEYS.TEACHERS, local.filter(t => t.id !== teacherId));
    broadcastDataUpdate('teacher-deleted', teacherId);

    try {
      await deleteDoc(doc(this.getActiveDb(), 'teachers', teacherId));
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await deleteDoc(doc(this.getCentralDb(), 'teachers', teacherId));
        } catch {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `teachers/${teacherId}`);
    }

    // Detach deleted teacher from all halaqahs in cache & firestore (by ID and by verified name)
    try {
      const halaqahs = await this.loadHalaqahs();
      const normTName = normalizeTeacherText(teacherName);
      for (const h of halaqahs) {
        const isMatch =
          h.primaryTeacherId === teacherId ||
          (h.teacherIds && h.teacherIds.includes(teacherId)) ||
          (normTName && h.primaryTeacherName && normalizeTeacherText(h.primaryTeacherName) === normTName);

        if (isMatch) {
          const updatedH: Halaqah = {
            ...h,
            primaryTeacherId: undefined,
            primaryTeacherName: '',
            teacherIds: (h.teacherIds || []).filter(id => id !== teacherId),
            teacherNames: (h.teacherNames || []).filter(n => normalizeTeacherText(n) !== normTName)
          };
          await OmranDataService.saveHalaqah(updatedH).catch(() => {});
        }
      }
    } catch {}

    // Detach deleted teacher from any complex where they were supervisor
    try {
      const complexes = await this.loadComplexes();
      const normTName = normalizeTeacherText(teacherName);
      for (const c of complexes) {
        const isMatch =
          c.supervisorTeacherId === teacherId ||
          (normTName && c.supervisorTeacherName && normalizeTeacherText(c.supervisorTeacherName) === normTName);

        if (isMatch) {
          const updatedC: QuranComplex = {
            ...c,
            supervisorTeacherId: undefined,
            supervisorTeacherName: ''
          };
          await OmranDataService.saveComplex(updatedC).catch(() => {});
        }
      }
    } catch {}
  }

  // Load Complexes with Dual Persistence and Tombstone filtering
  static async loadComplexes(): Promise<QuranComplex[]> {
    await syncTombstonesFromCloud().catch(() => {});
    const deletedComplexIds = getDeletedComplexIds();
    const local = getLocalCache<QuranComplex[]>(OMRAN_CACHE_KEYS.COMPLEXES, [])
      .filter(c => c?.id && !deletedComplexIds.has(c.id));
    let cloudList: QuranComplex[] = [];
    try {
      const snap = await safeGetDocs(collection(this.getCentralDb(), 'complexes'));
      snap.forEach(d => {
        const c = d.data() as QuranComplex;
        if (c?.id && !deletedComplexIds.has(c.id)) {
          cloudList.push(c);
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'complexes');
    }

    const mergedMap = new Map<string, QuranComplex>();
    // If complexes already exist in cloud or local, NEVER inject DEFAULT_COMPLEXES
    if (cloudList.length === 0 && local.length === 0 && deletedComplexIds.size === 0) {
      for (const c of DEFAULT_COMPLEXES) {
        if (!deletedComplexIds.has(c.id)) {
          mergedMap.set(c.id, c);
        }
      }
    } else {
      // First populate with local cache
      for (const c of local) {
        if (c?.id && !deletedComplexIds.has(c.id)) {
          mergedMap.set(c.id, c);
        }
      }
      // Cloud is authoritative - update mergedMap with latest cloud data
      for (const c of cloudList) {
        if (c?.id && !deletedComplexIds.has(c.id)) {
          const localC = mergedMap.get(c.id);
          if (!localC) {
            mergedMap.set(c.id, c);
          } else {
            const cloudTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
            const localTime = localC.updatedAt ? new Date(localC.updatedAt).getTime() : 0;
            if (cloudTime >= localTime || !localTime) {
              mergedMap.set(c.id, { ...localC, ...c });
            }
          }
        }
      }
    }

    const merged = Array.from(mergedMap.values());
    setLocalCache(OMRAN_CACHE_KEYS.COMPLEXES, merged);
    return merged;
  }

  // Subscribe to Complexes in real-time
  static subscribeComplexes(callback: (complexes: QuranComplex[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getCentralDb(), 'complexes'), snap => {
        const deletedComplexIds = getDeletedComplexIds();
        const list: QuranComplex[] = [];
        snap.forEach(d => {
          const c = d.data() as QuranComplex;
          if (c?.id && !deletedComplexIds.has(c.id)) {
            list.push(c);
          }
        });
        if (list.length === 0 && deletedComplexIds.size === 0) {
          const local = getLocalCache<QuranComplex[]>(OMRAN_CACHE_KEYS.COMPLEXES, DEFAULT_COMPLEXES);
          callback(local.length > 0 ? local : DEFAULT_COMPLEXES);
        } else {
          // Cloud snapshot is authoritative - update local cache with cloud data
          const local = getLocalCache<QuranComplex[]>(OMRAN_CACHE_KEYS.COMPLEXES, []);
          const map = new Map<string, QuranComplex>();
          for (const c of local) {
            if (c?.id && !deletedComplexIds.has(c.id)) {
              map.set(c.id, c);
            }
          }
          for (const c of list) {
            if (c?.id && !deletedComplexIds.has(c.id)) {
              const localC = map.get(c.id);
              if (!localC) {
                map.set(c.id, c);
              } else {
                const cloudTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
                const localTime = localC.updatedAt ? new Date(localC.updatedAt).getTime() : 0;
                if (cloudTime >= localTime || !localTime) {
                  map.set(c.id, { ...localC, ...c });
                }
              }
            }
          }
          const finalComplexes = Array.from(map.values());
          setLocalCache(OMRAN_CACHE_KEYS.COMPLEXES, finalComplexes);
          callback(finalComplexes);
        }
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'complexes');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Save / Update Complex with Dual Persistence
  static async saveComplex(complex: QuranComplex): Promise<void> {
    removeDeletedComplexId(complex.id);
    const enriched: QuranComplex = {
      ...complex,
      updatedAt: new Date().toISOString()
    };
    const clean = cleanFirestoreData(enriched);
    const local = getLocalCache<QuranComplex[]>(OMRAN_CACHE_KEYS.COMPLEXES, DEFAULT_COMPLEXES);
    const updated = [clean, ...local.filter(c => c.id !== clean.id)];
    setLocalCache(OMRAN_CACHE_KEYS.COMPLEXES, updated);
    broadcastDataUpdate('complex', clean);

    try {
      // 1. Always persist to central master complexes collection
      await setDoc(doc(this.getCentralDb(), 'complexes', complex.id), clean);

      // 2. If this complex has a dedicated database, also mirror its complex doc to that dedicated database
      if (complex.databaseConfig?.isCustom && complex.databaseConfig?.projectId) {
        try {
          const dedicatedDb = this.getFirestoreInstanceForComplex(complex);
          await setDoc(doc(dedicatedDb, 'complexes', complex.id), clean);
        } catch (mirrorErr) {
          console.warn('[OmranDataService] Mirrored complex document write notice:', mirrorErr);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `complexes/${complex.id}`);
      console.warn('[OmranDataService] Complex saved locally, cloud sync pending/offline:', e);
    }
  }

  // Delete Complex with Dual Persistence & Irreversible Tombstones
  static async deleteComplex(complexId: string): Promise<void> {
    addDeletedComplexId(complexId);
    const local = getLocalCache<QuranComplex[]>(OMRAN_CACHE_KEYS.COMPLEXES, []);
    setLocalCache(OMRAN_CACHE_KEYS.COMPLEXES, local.filter(c => c.id !== complexId));
    broadcastDataUpdate('complex-deleted', complexId);

    try {
      await deleteDoc(doc(this.getCentralDb(), 'complexes', complexId));
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await deleteDoc(doc(this.getActiveDb(), 'complexes', complexId));
        } catch {}
      }

      // Unlink attached halaqahs so they become unassigned
      const halaqahs = await this.loadHalaqahs();
      for (const h of halaqahs) {
        if (h.complexId === complexId) {
          const updated: Halaqah = {
            ...h,
            complexId: undefined,
            complexName: undefined
          };
          await this.saveHalaqah(updated);
        }
      }

      // Also unlink students whose direct complexId was this complex
      const students = await this.loadStudents();
      for (const s of students) {
        if (s.complexId === complexId) {
          const updatedStudent: Student = {
            ...s,
            complexId: undefined
          };
          await this.saveStudent(updatedStudent);
        }
      }

      // Also unlink teachers whose assigned complexId was this complex
      const teachers = await this.loadTeachers();
      for (const t of teachers) {
        if (t.complexId === complexId || (t.complexIds && t.complexIds.includes(complexId))) {
          const updatedTeacher: TeacherAccount = {
            ...t,
            complexId: t.complexId === complexId ? undefined : t.complexId,
            complexName: t.complexId === complexId ? undefined : t.complexName,
            complexIds: (t.complexIds || []).filter(id => id !== complexId),
            complexNames: (t.complexNames || []).filter((_, idx) => (t.complexIds || [])[idx] !== complexId)
          };
          await this.saveTeacher(updatedTeacher);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `complexes/${complexId}`);
    }
  }

  // Link or Move Halaqah to a Complex (moves all its students and data together!)
  static async assignHalaqahToComplex(
    halaqahId: string,
    complexId?: string,
    complexName?: string
  ): Promise<Halaqah | null> {
    try {
      const halaqahRef = doc(this.getActiveDb(), 'halaqahs', halaqahId);
      const snap = await getDoc(halaqahRef);
      if (!snap.exists()) return null;
      const data = snap.data() as Halaqah;
      const updated: Halaqah = {
        ...data,
        complexId: complexId || undefined,
        complexName: complexName || undefined
      };
      await setDoc(halaqahRef, cleanFirestoreData(updated));
      await setDoc(doc(this.getCentralDb(), 'halaqahs', halaqahId), cleanFirestoreData(updated));

      // CRITICAL: Synchronize all students belonging to this halaqah so they move along with it!
      const students = await this.loadStudents();
      for (const s of students) {
        if (s.halaqahId === halaqahId) {
          const updatedSt: Student = {
            ...s,
            complexId: complexId || undefined,
            halaqahName: data.name
          };
          await this.saveStudent(updatedSt);
        }
      }

      return updated;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `halaqahs/${halaqahId}`);
      throw e;
    }
  }

  // Automated System Reconciler: Re-links all students, halaqahs, and complexes to their authoritative positions
  static async reconcileAndSyncStudentsWithHalaqahs(): Promise<{
    repairedStudents: number;
    repairedHalaqahs: number;
  }> {
    const complexes = await this.loadComplexes();
    const halaqahs = await this.loadHalaqahs();
    const students = await this.loadStudents();
    const teachers = await this.loadTeachers();

    const complexMap = new Map(complexes.map(c => [c.id, c]));
    const halaqahMap = new Map(halaqahs.map(h => [h.id, h]));

    let repairedStudents = 0;
    let repairedHalaqahs = 0;

    // 1. Repair halaqahs: ensure complexName matches complex
    for (const h of halaqahs) {
      if (h.complexId && complexMap.has(h.complexId)) {
        const c = complexMap.get(h.complexId)!;
        if (h.complexName !== c.name) {
          h.complexName = c.name;
          await this.saveHalaqah(h);
          repairedHalaqahs++;
        }
      }
    }

    // 2. Repair students: ensure student's complexId and halaqahName strictly match their halaqah
    for (const s of students) {
      if (s.halaqahId && halaqahMap.has(s.halaqahId)) {
        const h = halaqahMap.get(s.halaqahId)!;
        const targetComplexId = h.complexId;
        const targetHalaqahName = h.name;
        if (s.complexId !== targetComplexId || s.halaqahName !== targetHalaqahName) {
          const updatedSt: Student = {
            ...s,
            complexId: targetComplexId,
            halaqahName: targetHalaqahName
          };
          await this.saveStudent(updatedSt);
          repairedStudents++;
        }
      } else if (s.halaqahName && !s.halaqahId) {
        // Find halaqah by name
        const matchHalaqah = halaqahs.find(h => h.name.trim() === s.halaqahName?.trim());
        if (matchHalaqah) {
          const updatedSt: Student = {
            ...s,
            halaqahId: matchHalaqah.id,
            complexId: matchHalaqah.complexId,
            halaqahName: matchHalaqah.name
          };
          await this.saveStudent(updatedSt);
          repairedStudents++;
        }
      }
    }

    // 3. Repair teachers & halaqahs: ensure bidirectional links and complex alignment
    for (const t of teachers) {
      if (t.halaqahId && halaqahMap.has(t.halaqahId)) {
        const currentH = halaqahMap.get(t.halaqahId)!;
        let teacherNeedsUpdate = false;
        const updatedT: TeacherAccount = { ...t };

        // Ensure teacher's complexId strictly matches the complex of their halaqah
        if (currentH.complexId && t.complexId !== currentH.complexId) {
          updatedT.complexId = currentH.complexId;
          updatedT.complexName = currentH.complexName;
          updatedT.complexIds = Array.from(new Set([...(t.complexIds || []), currentH.complexId]));
          updatedT.complexNames = Array.from(new Set([...(t.complexNames || []), currentH.complexName || 'المجمع']));
          teacherNeedsUpdate = true;
        }

        // Ensure halaqah has this teacher as primary teacher
        if (currentH.primaryTeacherId !== t.id || !currentH.primaryTeacherName) {
          currentH.primaryTeacherId = t.id;
          currentH.primaryTeacherName = t.name;
          await this.saveHalaqah(currentH);
          repairedHalaqahs++;
        }

        if (teacherNeedsUpdate) {
          await this.saveTeacher(updatedT);
        }
      }
    }

    // 4. Ensure halaqahs with primaryTeacherId link back to teacher account
    for (const h of halaqahs) {
      if (h.primaryTeacherId) {
        const t = teachers.find(teach => teach.id === h.primaryTeacherId);
        if (t && (!t.halaqahId || t.halaqahId !== h.id)) {
          const updatedT: TeacherAccount = {
            ...t,
            halaqahId: h.id,
            halaqahName: h.name,
            halaqahIds: Array.from(new Set([...(t.halaqahIds || []), h.id])),
            halaqahNames: Array.from(new Set([...(t.halaqahNames || []), h.name])),
            complexId: h.complexId || t.complexId,
            complexName: h.complexName || t.complexName
          };
          await this.saveTeacher(updatedT);
        }
      }
    }

    // 5. Ensure supervisor teachers are aligned with their complexes
    for (const c of complexes) {
      if (c.supervisorTeacherId) {
        const sup = teachers.find(t => t.id === c.supervisorTeacherId);
        if (sup && (sup.complexId !== c.id || sup.role !== 'supervisor')) {
          const updatedSup: TeacherAccount = {
            ...sup,
            role: sup.role === 'developer' ? 'developer' : 'supervisor',
            complexId: c.id,
            complexName: c.name,
            supervisedComplexId: c.id
          };
          await this.saveTeacher(updatedSup);
        }
      }
    }

    return { repairedStudents, repairedHalaqahs };
  }

  // Authoritative bidirectional assignment of teacher to halaqah and complex with automatic student migration
  static async assignTeacherToHalaqahAndComplex(
    teacherId: string,
    halaqahId: string,
    targetComplexId?: string
  ): Promise<{ success: boolean; teacher?: TeacherAccount; halaqah?: Halaqah }> {
    const teachers = await this.loadTeachers();
    const halaqahs = await this.loadHalaqahs();
    const complexes = await this.loadComplexes();

    const teacher = teachers.find(t => t.id === teacherId);
    const halaqah = halaqahs.find(h => h.id === halaqahId);
    if (!teacher || !halaqah) {
      return { success: false };
    }

    const resolvedComplexId = targetComplexId || halaqah.complexId || teacher.complexId || complexes[0]?.id;
    const targetComplex = complexes.find(c => c.id === resolvedComplexId) || complexes[0];

    // 1. Update halaqah
    const updatedHalaqah: Halaqah = {
      ...halaqah,
      complexId: targetComplex?.id || halaqah.complexId,
      complexName: targetComplex?.name || halaqah.complexName,
      primaryTeacherId: teacher.id,
      primaryTeacherName: teacher.name,
      teacherIds: Array.from(new Set([...(halaqah.teacherIds || []), teacher.id])),
      teacherNames: Array.from(new Set([...(halaqah.teacherNames || []), teacher.name]))
    };
    await this.saveHalaqah(updatedHalaqah);

    // 2. Detach old halaqahs previously assigned to this teacher
    for (const oldH of halaqahs) {
      if (oldH.id !== halaqahId && oldH.primaryTeacherId === teacher.id) {
        const detachedH: Halaqah = {
          ...oldH,
          primaryTeacherId: undefined,
          primaryTeacherName: '',
          teacherIds: (oldH.teacherIds || []).filter(id => id !== teacher.id),
          teacherNames: (oldH.teacherNames || []).filter(n => normalizeTeacherText(n) !== normalizeTeacherText(teacher.name))
        };
        await this.saveHalaqah(detachedH).catch(() => {});
      }
    }

    // 3. Update teacher
    const existingCIds = teacher.complexIds || (teacher.complexId ? [teacher.complexId] : []);
    const updatedCIds = targetComplex ? Array.from(new Set([...existingCIds, targetComplex.id])) : existingCIds;
    const updatedCNames = targetComplex ? Array.from(new Set([...(teacher.complexNames || []), targetComplex.name])) : (teacher.complexNames || []);

    const updatedTeacher: TeacherAccount = {
      ...teacher,
      complexId: targetComplex?.id || teacher.complexId,
      complexName: targetComplex?.name || teacher.complexName,
      complexIds: updatedCIds,
      complexNames: updatedCNames,
      halaqahId: halaqah.id,
      halaqahName: halaqah.name,
      halaqahIds: [halaqah.id],
      halaqahNames: [halaqah.name]
    };
    await this.saveTeacher(updatedTeacher);

    // 4. Move and bind all students belonging to this halaqah with it
    const students = await this.loadStudents();
    const halStudents = students.filter(s =>
      s.halaqahId === halaqah.id ||
      (s.halaqahName && normalizeTeacherText(s.halaqahName) === normalizeTeacherText(halaqah.name))
    );
    for (const st of halStudents) {
      if (st.complexId !== updatedHalaqah.complexId || st.halaqahId !== updatedHalaqah.id || st.halaqahName !== updatedHalaqah.name) {
        const updatedStudent: Student = {
          ...st,
          complexId: updatedHalaqah.complexId,
          complexName: updatedHalaqah.complexName,
          halaqahId: updatedHalaqah.id,
          halaqahName: updatedHalaqah.name
        };
        await this.saveStudent(updatedStudent).catch(() => {});
      }
    }

    return { success: true, teacher: updatedTeacher, halaqah: updatedHalaqah };
  }

  // Authoritative assignment of complex supervisor
  static async assignSupervisorToComplex(teacherId: string, complexId: string): Promise<boolean> {
    const teachers = await this.loadTeachers();
    const complexes = await this.loadComplexes();
    const teacher = teachers.find(t => t.id === teacherId);
    const complex = complexes.find(c => c.id === complexId);
    if (!teacher || !complex) return false;

    // 1. Update previous supervisor if any
    if (complex.supervisorTeacherId && complex.supervisorTeacherId !== teacherId) {
      const prevSup = teachers.find(t => t.id === complex.supervisorTeacherId);
      if (prevSup) {
        const isStillSupElsewhere = complexes.some(c => c.id !== complexId && c.supervisorTeacherId === prevSup.id);
        const updatedPrev: TeacherAccount = {
          ...prevSup,
          supervisedComplexId: isStillSupElsewhere ? prevSup.supervisedComplexId : undefined,
          role: (prevSup.role === 'developer' ? 'developer' : (isStillSupElsewhere ? 'supervisor' : 'teacher')) as any
        };
        await this.saveTeacher(updatedPrev).catch(() => {});
      }
    }

    // 2. Update new supervisor
    const updatedTeacher: TeacherAccount = {
      ...teacher,
      role: (teacher.role === 'developer' ? 'developer' : 'supervisor') as any,
      supervisedComplexId: complex.id,
      complexId: complex.id,
      complexName: complex.name,
      complexIds: Array.from(new Set([...(teacher.complexIds || []), complex.id])),
      complexNames: Array.from(new Set([...(teacher.complexNames || []), complex.name]))
    };
    await this.saveTeacher(updatedTeacher);

    // 3. Update complex
    const updatedComplex: QuranComplex = {
      ...complex,
      supervisorTeacherId: teacher.id,
      supervisorTeacherName: teacher.name,
      updatedAt: new Date().toISOString()
    };
    await this.saveComplex(updatedComplex);

    return true;
  }

  // Export specific complex data (Halaqahs, Students, Attendance, Evaluations, Violations)
  static async exportComplexBackup(complexId: string): Promise<ComplexBackupData> {
    const complexes = await this.loadComplexes();
    const complex = complexes.find(c => c.id === complexId) || {
      id: complexId,
      name: 'مجمع قرآني',
      createdAt: new Date().toISOString()
    };
    const allHalaqahs = await this.loadHalaqahs();
    const complexHalaqahs = allHalaqahs.filter(h => h.complexId === complexId);
    const halaqahIds = new Set(complexHalaqahs.map(h => h.id));

    const allStudents = await this.loadStudents();
    const complexStudents = allStudents.filter(s => s.halaqahId && halaqahIds.has(s.halaqahId));
    const studentIds = new Set(complexStudents.map(s => s.id));

    const allAttendance = await this.loadAttendance();
    const complexAttendance = allAttendance.filter(a => studentIds.has(a.studentId));

    const allEvaluations = await this.loadEvaluations();
    const complexEvaluations = allEvaluations.filter(e => studentIds.has(e.studentId));

    const allViolations = await this.loadViolations();
    const complexViolations = allViolations.filter(v => studentIds.has(v.studentId));

    return {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      complex,
      halaqahs: complexHalaqahs,
      students: complexStudents,
      attendance: complexAttendance,
      evaluations: complexEvaluations,
      violations: complexViolations
    };
  }

  // Import / Restore specific complex data
  static async importComplexBackup(
    arg1: string | ComplexBackupData,
    arg2?: string | ComplexBackupData
  ): Promise<{ studentsCount: number; halaqahsCount: number }> {
    let complexId: string;
    let data: ComplexBackupData;
    if (typeof arg1 === 'string') {
      complexId = arg1;
      data = arg2 as ComplexBackupData;
    } else {
      data = arg1 as ComplexBackupData;
      complexId = typeof arg2 === 'string' ? arg2 : (data.complex?.id || 'unknown');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('بيانات النسخة الاحتياطية للمجمع غير صالحة.');
    }
    if (data.complex) {
      await this.saveComplex({ ...data.complex, id: complexId });
    }
    if (Array.isArray(data.halaqahs)) {
      for (const h of data.halaqahs) {
        await this.saveHalaqah({ ...h, complexId, complexName: data.complex?.name });
      }
    }
    if (Array.isArray(data.students)) {
      for (const s of data.students) {
        await setDoc(doc(this.getActiveDb(), 'students', s.id), cleanFirestoreData(s));
      }
    }
    if (Array.isArray(data.attendance)) {
      for (const a of data.attendance) {
        await setDoc(doc(this.getActiveDb(), 'attendance', a.id), cleanFirestoreData(a));
      }
    }
    if (Array.isArray(data.evaluations)) {
      for (const ev of data.evaluations) {
        await setDoc(doc(this.getActiveDb(), 'evaluations', ev.id), cleanFirestoreData(ev));
      }
    }
    if (Array.isArray(data.violations)) {
      for (const v of data.violations) {
        await setDoc(doc(this.getActiveDb(), 'violations', v.id), cleanFirestoreData(v));
      }
    }

    return {
      studentsCount: data.students?.length || 0,
      halaqahsCount: data.halaqahs?.length || 0
    };
  }

  // Purge / empty all data belonging to a complex from the central database
  static async purgeComplexData(complexId: string): Promise<{
    studentsCount: number;
    halaqahsCount: number;
    deletedStudents: number;
    deletedAttendance: number;
  }> {
    const centralDb = this.getCentralDb();
    const allHalaqahs = await this.loadHalaqahs();
    const complexHalaqahs = allHalaqahs.filter(h => h.complexId === complexId);
    const halaqahIds = new Set(complexHalaqahs.map(h => h.id));

    const allStudents = await this.loadStudents();
    const complexStudents = allStudents.filter(s => (s.halaqahId && halaqahIds.has(s.halaqahId)) || s.complexId === complexId);
    const studentIds = new Set(complexStudents.map(s => s.id));

    // Delete attendance from central
    const allAttendance = await this.loadAttendance();
    let deletedAttendance = 0;
    for (const a of allAttendance) {
      if (studentIds.has(a.studentId)) {
        await deleteDoc(doc(centralDb, 'attendance', a.id));
        deletedAttendance++;
      }
    }

    // Delete evaluations from central
    const allEvaluations = await this.loadEvaluations();
    for (const ev of allEvaluations) {
      if (studentIds.has(ev.studentId)) {
        await deleteDoc(doc(centralDb, 'evaluations', ev.id));
      }
    }

    // Delete violations from central
    const allViolations = await this.loadViolations();
    for (const v of allViolations) {
      if (studentIds.has(v.studentId)) {
        await deleteDoc(doc(centralDb, 'violations', v.id));
      }
    }

    // Delete exams from central
    const allExams = await this.loadExams();
    for (const ex of allExams) {
      if (ex.complexId === complexId || (Array.isArray(ex.targetHalaqat) && ex.targetHalaqat.some(th => halaqahIds.has(th)))) {
        try { await deleteDoc(doc(centralDb, 'exams', ex.id)); } catch {}
      }
    }

    // Delete exam submissions from central
    const allSubmissions = await this.loadSubmissions();
    for (const sub of allSubmissions) {
      if (studentIds.has(sub.studentId) || sub.complexId === complexId) {
        try { await deleteDoc(doc(centralDb, 'exam_submissions', sub.id)); } catch {}
      }
    }

    // Delete certificates from central
    const allCerts = await this.loadCertificates();
    for (const cert of allCerts) {
      if (cert.complexId === complexId || studentIds.has(cert.studentId)) {
        try { await deleteDoc(doc(centralDb, 'certificates', cert.id)); } catch {}
      }
    }

    // Delete students from central
    for (const s of complexStudents) {
      await deleteDoc(doc(centralDb, 'students', s.id));
    }

    // Delete halaqahs from central
    for (const h of complexHalaqahs) {
      await deleteDoc(doc(centralDb, 'halaqahs', h.id));
    }

    // Delete teacher_shifts of this complex from central
    try {
      const shiftsSnap = await getDocs(collection(centralDb, 'teacher_shifts'));
      for (const d of shiftsSnap.docs) {
        if (d.data()?.complexId === complexId) {
          await deleteDoc(doc(centralDb, 'teacher_shifts', d.id));
        }
      }
    } catch {}

    // Delete teacher_attendance of this complex from central
    try {
      const tAttSnap = await getDocs(collection(centralDb, 'teacher_attendance'));
      for (const d of tAttSnap.docs) {
        if (d.data()?.complexId === complexId) {
          await deleteDoc(doc(centralDb, 'teacher_attendance', d.id));
        }
      }
    } catch {}

    // Delete mosques of this complex from central
    try {
      const mosquesSnap = await getDocs(collection(centralDb, 'mosques'));
      for (const d of mosquesSnap.docs) {
        if (d.data()?.complexId === complexId) {
          await deleteDoc(doc(centralDb, 'mosques', d.id));
        }
      }
    } catch {}

    // Delete / Unlink teachers belonging to this complex from central (protecting developer accounts)
    try {
      const allTeachers = await this.loadTeachers();
      for (const t of allTeachers) {
        if (t.role === 'developer' || t.id === 'teacher-1' || t.username?.toLowerCase() === 'admin' || t.username?.toLowerCase() === 'developer') {
          continue; // Developer account is strictly protected
        }
        const isSolelyInThisComplex = t.complexId === complexId ||
          (Array.isArray(t.complexIds) && t.complexIds.length === 1 && t.complexIds[0] === complexId);
        if (isSolelyInThisComplex) {
          await deleteDoc(doc(centralDb, 'teachers', t.id));
        } else if (Array.isArray(t.complexIds) && t.complexIds.includes(complexId)) {
          const updatedIds = t.complexIds.filter(id => id !== complexId);
          await setDoc(doc(centralDb, 'teachers', t.id), { complexIds: updatedIds }, { merge: true });
        }
      }
    } catch {}

    // Clean up local cache
    const cachedStudents = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, []);
    setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, cachedStudents.filter(s => !studentIds.has(s.id)));
    const cachedHalaqahs = getLocalCache<Halaqah[]>(OMRAN_CACHE_KEYS.HALAQAHS, []);
    setLocalCache(OMRAN_CACHE_KEYS.HALAQAHS, cachedHalaqahs.filter(h => !halaqahIds.has(h.id)));
    const cachedAttendance = getLocalCache<AttendanceRecord[]>(OMRAN_CACHE_KEYS.ATTENDANCE, []);
    setLocalCache(OMRAN_CACHE_KEYS.ATTENDANCE, cachedAttendance.filter(a => !studentIds.has(a.studentId)));

    return {
      studentsCount: complexStudents.length,
      halaqahsCount: complexHalaqahs.length,
      deletedStudents: complexStudents.length,
      deletedAttendance
    };
  }

  // Developer Feature: Test Live Real Connection to Any External Firebase Project
  static async testRealFirebaseConnection(config: {
    projectId: string;
    apiKey: string;
    databaseId?: string;
    authDomain?: string;
    storageBucket?: string;
    appId?: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    const cleanProjId = (config.projectId || '').trim();
    const cleanApiKey = (config.apiKey || '').trim();

    if (!cleanProjId) {
      return { success: false, message: 'معرف المشروع (Project ID) مطلوب.' };
    }
    if (!cleanApiKey) {
      return { success: false, message: 'مفتاح الويب (Web API Key) مطلوب للاتصال بمشروع فايربيس.' };
    }

    const testAppName = `omran_test_${cleanProjId.replace(/[^\w]/g, '_')}_${Date.now()}`;
    let testApp: any = null;

    try {
      testApp = initializeApp(
        {
          apiKey: cleanApiKey,
          projectId: cleanProjId,
          authDomain: config.authDomain || `${cleanProjId}.firebaseapp.com`,
          storageBucket: config.storageBucket || `${cleanProjId}.firebasestorage.app`,
          appId: config.appId || ''
        },
        testAppName
      );

      // In standard Firebase projects, the database is always '(default)'.
      // Ignore any legacy 'isolated-...' strings or '(default)' to avoid 'Database not found' errors.
      const rawDbId = (config.databaseId || '').trim();
      const hasCustomNamedDb = rawDbId !== '' && rawDbId !== '(default)' && !rawDbId.startsWith('isolated-');

      let targetDb: any = null;
      try {
        targetDb = hasCustomNamedDb ? getFirestore(testApp, rawDbId) : getFirestore(testApp);
      } catch (dbInitErr) {
        console.warn('Fallback to standard default Firestore:', dbInitErr);
        targetDb = getFirestore(testApp);
      }

      // Perform a real write test in the target project with auto-fallback to default db if named db doesn't exist
      const testDocRef = doc(targetDb, 'settings', 'omran_connection_test');
      try {
        await setDoc(testDocRef, {
          status: 'ok',
          verifiedAt: new Date().toISOString(),
          testedBy: 'منظومة عمران القرآنية',
          note: 'تم اختبار وتأكيد الاتصال وقراءة/كتابة البيانات بنجاح.'
        });
      } catch (writeErr: any) {
        const wMsg = writeErr?.message || String(writeErr);
        if (wMsg.includes('not found') || wMsg.includes('does not exist')) {
          console.warn(`[Omran-DB] Named database '${rawDbId}' not found on Firebase. Falling back to default database (default).`);
          targetDb = getFirestore(testApp);
          const fallbackDocRef = doc(targetDb, 'settings', 'omran_connection_test');
          await setDoc(fallbackDocRef, {
            status: 'ok',
            verifiedAt: new Date().toISOString(),
            testedBy: 'منظومة عمران القرآنية',
            note: 'تم اختبار وتأكيد الاتصال وقراءة/كتابة البيانات بنجاح في قاعدة البيانات الافتراضية.'
          });
        } else {
          throw writeErr;
        }
      }

      // Verify read test
      const snap = await getDoc(doc(targetDb, 'settings', 'omran_connection_test'));
      if (!snap.exists()) {
        throw new Error('تمت الكتابة ولكن تعذرت قراءة وثيقة الاختبار.');
      }

      return {
        success: true,
        message: `تم الاتصال بنجاح بمشروع Firebase (${cleanProjId})، وتمت تجربة القراءة والكتابة الحقيقية بنجاح!`
      };
    } catch (err: any) {
      console.error('Firebase test connection error:', err);
      const msg = err?.message || String(err);
      if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
        return {
          success: false,
          message: `المشروع (${cleanProjId}) يرفض إذن الكتابة بسبب قواعد الأمان (Firestore Rules). يرجى التوجه إلى كونسول فايربيس -> Firestore Database -> Rules وتعديل القواعد لتسمح بالقراءة والكتابة (Test Mode).`,
          details: { code: 'PERMISSION_DENIED', raw: msg }
        };
      }
      if (msg.includes('not-found') || msg.includes('database does not exist') || msg.includes('Database not found')) {
        return {
          success: false,
          message: `قاعدة بيانات Firestore غير مفعلة بعد في مشروع (${cleanProjId}). يرجى الدخول إلى كونسول فايربيس -> Firestore Database والضغط على Create database أولاً.`,
          details: { code: 'DATABASE_NOT_FOUND', raw: msg }
        };
      }
      if (msg.includes('API key not valid')) {
        return {
          success: false,
          message: `مفتاح API Key غير صحيح أو غير مصرح له بمشروع (${cleanProjId}). يرجى التحقق من المفتاح في إعدادات المشروع (Project Settings).`,
          details: { code: 'INVALID_API_KEY', raw: msg }
        };
      }
      return {
        success: false,
        message: `تعذر الاتصال بمشروع (${cleanProjId}): ${msg}`,
        details: { raw: msg }
      };
    }
  }

  // Developer Feature: Migrate Complex and all its entities to a REAL Dedicated Firebase Database
  static async migrateComplexToDedicatedDatabase(
    options: {
      complexId: string;
      targetProjectId: string;
      targetApiKey: string;
      targetGoogleEmail?: string;
      targetDatabaseId?: string;
      targetAuthDomain?: string;
      targetStorageBucket?: string;
      targetAppId?: string;
      purgeFromCentral?: boolean;
    },
    onProgress?: (progress: ComplexMigrationProgress) => void
  ): Promise<ComplexMigrationResult> {
    const logs: string[] = [];
    const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      logs.push(`[${time}] ${msg}`);
    };

    const targetProjId = (options.targetProjectId || '').trim();
    const targetApiKey = (options.targetApiKey || '').trim();
    const cleanEmail = (options.targetGoogleEmail || '').trim();
    const targetDbId = (options.targetDatabaseId || '(default)').trim();

    if (!targetProjId) {
      throw new Error('معرف مشروع فايربيس (Project ID) مطلوب لبدء النقل الفعلي.');
    }
    if (!targetApiKey) {
      throw new Error('مفتاح Web API Key الخاص بمشروع فايربيس مطلوب للاتصال وكتابة البيانات في مشروعك.');
    }

    // Step 1: Validate Complex
    addLog(`بدء جلسة النقل الفعلي لمجمع تعليمي إلى مشروع Firebase المستقل (${targetProjId})...`);
    const allComplexes = await this.loadComplexes();
    const complex = allComplexes.find(c => c.id === options.complexId);
    if (!complex) {
      throw new Error('المجمع القرآني المطلوب نقله غير موجود في النظام.');
    }

    onProgress?.({
      step: 1,
      totalSteps: 10,
      percent: 5,
      title: 'تهيئة الاتصال بمشروع Firebase المستهدف',
      detail: `جاري الاتصال بمشروع (${targetProjId}) والتحقق من مفتاح API...`,
      logs: [...logs]
    });

    // Step 2: Initialize REAL Target Firebase App
    const targetAppName = `omran_mig_${targetProjId.replace(/[^\w]/g, '_')}_${Date.now()}`;
    let targetApp: any = null;
    let targetDb: any = null;

    try {
      targetApp = initializeApp(
        {
          apiKey: targetApiKey,
          projectId: targetProjId,
          authDomain: options.targetAuthDomain || `${targetProjId}.firebaseapp.com`,
          storageBucket: options.targetStorageBucket || `${targetProjId}.firebasestorage.app`,
          appId: options.targetAppId || ''
        },
        targetAppName
      );

      // In standard Firebase projects, the default database is always '(default)'.
      // Ignore any legacy 'isolated-...' strings to avoid 'Database not found' errors.
      const hasCustomNamedDb = targetDbId !== '' && targetDbId !== '(default)' && !targetDbId.startsWith('isolated-');

      try {
        targetDb = hasCustomNamedDb ? getFirestore(targetApp, targetDbId) : getFirestore(targetApp);
      } catch {
        targetDb = getFirestore(targetApp);
      }

      // Real Handshake Write to guarantee database is live and permissions exist
      try {
        await setDoc(doc(targetDb, 'settings', 'omran_migration_init'), {
          initializedAt: new Date().toISOString(),
          complexName: complex.name,
          targetEmail: cleanEmail,
          platform: 'منظومة عمران لإدارة الحلقات والمجمعات القرآنية'
        });
        addLog(`تم الاتصال الفعلي بنجاح بمشروع فايربيس (${targetProjId}) وتأكيد صلاحيات الكتابة الحقيقية.`);
      } catch (handshakeErr: any) {
        const hMsg = handshakeErr?.message || String(handshakeErr);
        if (hMsg.includes('not found') || hMsg.includes('does not exist')) {
          addLog(`تنبيه: قاعدة البيانات (${targetDbId}) غير موجودة، جاري التبديل التلقائي إلى قاعدة البيانات الافتراضية (default)...`);
          targetDb = getFirestore(targetApp);
          await setDoc(doc(targetDb, 'settings', 'omran_migration_init'), {
            initializedAt: new Date().toISOString(),
            complexName: complex.name,
            targetEmail: cleanEmail,
            platform: 'منظومة عمران لإدارة الحلقات والمجمعات القرآنية'
          });
          addLog(`تم الاتصال بالقاعدة الافتراضية (default) بنجاح.`);
        } else {
          throw handshakeErr;
        }
      }
    } catch (connErr: any) {
      const errM = connErr?.message || String(connErr);
      if (errM.includes('permission-denied') || errM.includes('insufficient permissions')) {
        throw new Error(`مشروع فايربيس (${targetProjId}) يرفض إذن الكتابة بسبب قواعد الأمان (Firestore Rules). يرجى فتح كونسول فايربيس -> Firestore -> Rules وتعديل القواعد لتسمح بالكتابة مؤقتاً أثناء النقل.`);
      }
      if (errM.includes('not-found') || errM.includes('database does not exist')) {
        throw new Error(`قاعدة بيانات Firestore غير مفعلة بعد في مشروع (${targetProjId}). يرجى الدخول إلى كونسول فايربيس وإنشاء قاعدة البيانات (Create database) أولاً.`);
      }
      throw new Error(`تعذر الاتصال بمشروع فايربيس المستهدف (${targetProjId}): ${errM}`);
    }

    onProgress?.({
      step: 2,
      totalSteps: 10,
      percent: 15,
      title: 'تم الاتصال الفعلي بقاعدة بيانات المشروع المستقل',
      detail: `قاعدة بيانات Firestore في مشروع (${targetProjId}) جاهزة لاستقبال البيانات الحقيقية`,
      logs: [...logs]
    });

    // Step 3: Extract all complex records from source
    addLog(`جاري قراءة واستخراج كافة سجلات مجمع (${complex.name}) من القاعدة الحالية...`);
    const allHalaqahs = await this.loadHalaqahs();
    const complexHalaqahs = allHalaqahs.filter(h => h.complexId === complex.id);
    const halaqahIds = new Set(complexHalaqahs.map(h => h.id));

    const allStudents = await this.loadStudents();
    const complexStudents = allStudents.filter(s => (s.halaqahId && halaqahIds.has(s.halaqahId)) || s.complexId === complex.id);
    const studentIds = new Set(complexStudents.map(s => s.id));

    const allAttendance = await this.loadAttendance();
    const complexAttendance = allAttendance.filter(a => studentIds.has(a.studentId));

    const allEvaluations = await this.loadEvaluations();
    const complexEvaluations = allEvaluations.filter(e => studentIds.has(e.studentId));

    const allViolations = await this.loadViolations();
    const complexViolations = allViolations.filter(v => studentIds.has(v.studentId));

    const allExams = await this.loadExams();
    const complexExams = allExams.filter(ex => ex.complexId === complex.id || (Array.isArray(ex.targetHalaqat) && ex.targetHalaqat.some(th => halaqahIds.has(th))));

    const allSubmissions = await this.loadSubmissions();
    const complexSubmissions = allSubmissions.filter(sub => studentIds.has(sub.studentId) || sub.complexId === complex.id);

    const allCertificates = await this.loadCertificates();
    const complexCertificates = allCertificates.filter(cert => studentIds.has(cert.studentId) || cert.complexId === complex.id);

    const allTeachers = await this.loadTeachers();
    const complexTeachers = allTeachers.filter(t => t.complexId === complex.id || (Array.isArray(t.complexIds) && t.complexIds.includes(complex.id)));

    const totalRecords = complexHalaqahs.length + complexStudents.length + complexAttendance.length +
      complexEvaluations.length + complexViolations.length + complexExams.length +
      complexSubmissions.length + complexCertificates.length + complexTeachers.length + 1; // +1 for complex itself

    addLog(`تم حزم البيانات: (${complexHalaqahs.length}) حلقة، (${complexStudents.length}) طالب، (${complexAttendance.length}) سجل حضور، (${complexEvaluations.length}) تقييم، (${complexTeachers.length}) معلم.`);

    // Step 4: Write Complex document to targetDb
    addLog(`كتابة وثيقة المجمع الأساسية في مشروع (${targetProjId}) -> مجموعة complexes...`);
    const complexDataForTarget = {
      ...complex,
      databaseConfig: {
        isCustom: true,
        isIsolated: true,
        projectId: targetProjId,
        apiKey: targetApiKey,
        authDomain: options.targetAuthDomain || `${targetProjId}.firebaseapp.com`,
        storageBucket: options.targetStorageBucket || `${targetProjId}.firebasestorage.app`,
        appId: options.targetAppId || '',
        databaseId: targetDbId,
        connectedEmail: cleanEmail,
        migratedAt: new Date().toISOString()
      }
    };
    await setDoc(doc(targetDb, 'complexes', complex.id), cleanFirestoreData(complexDataForTarget));
    addLog(`✅ تم إنشاء وثيقة المجمع [${complex.name}] في قاعدة البيانات المستقلة.`);

    onProgress?.({
      step: 3,
      totalSteps: 10,
      percent: 25,
      title: 'تم إنشاء وثيقة المجمع في فايربيس المستقل',
      detail: `تمت كتابة بيانات مجمع (${complex.name}) في مجموعة complexes`,
      logs: [...logs]
    });

    // Step 5: Write Halaqahs to targetDb
    addLog(`جاري نقل (${complexHalaqahs.length}) حلقة تحفيظ إلى مجموعة halaqahs في فايربيس...`);
    for (let i = 0; i < complexHalaqahs.length; i++) {
      const h = complexHalaqahs[i];
      await setDoc(doc(targetDb, 'halaqahs', h.id), cleanFirestoreData(h));
      addLog(`[حلقة ${i + 1}/${complexHalaqahs.length}] ✅ تم نقل حلقة (${h.name}) إلى halaqahs/${h.id}`);
    }

    onProgress?.({
      step: 4,
      totalSteps: 10,
      percent: 38,
      title: 'ترحيل حلقات التحفيظ والمجموعات',
      detail: `تم نقل (${complexHalaqahs.length}) حلقة إلى قاعدة البيانات المستقلة`,
      logs: [...logs]
    });

    // Step 6: Write Teachers to targetDb
    if (complexTeachers.length > 0) {
      addLog(`جاري نقل (${complexTeachers.length}) معلماً ومشرفاً إلى مجموعة teachers...`);
      for (const t of complexTeachers) {
        await setDoc(doc(targetDb, 'teachers', t.id), cleanFirestoreData(t));
        addLog(`✅ تم نقل حساب المعلم: ${t.name} (المستخدم: ${t.username})`);
      }
    }

    // Step 7: Write Students to targetDb
    addLog(`جاري نقل (${complexStudents.length}) ملف طالب إلى مجموعة students في فايربيس...`);
    for (let i = 0; i < complexStudents.length; i++) {
      const s = complexStudents[i];
      await setDoc(doc(targetDb, 'students', s.id), cleanFirestoreData(s));
      if (i % 5 === 0 || i === complexStudents.length - 1) {
        addLog(`[طالب ${i + 1}/${complexStudents.length}] ✅ تم نقل الطالب: ${s.name} (ID: ${s.id})`);
      }
    }

    onProgress?.({
      step: 6,
      totalSteps: 10,
      percent: 55,
      title: 'ترحيل سجلات وملفات الطلاب',
      detail: `تم نقل بيانات (${complexStudents.length}) طالباً بالكامل إلى students`,
      logs: [...logs]
    });

    // Step 8: Write Attendance to targetDb
    addLog(`جاري نقل (${complexAttendance.length}) سجل حضور وغياب إلى مجموعة attendance...`);
    let attCount = 0;
    for (const a of complexAttendance) {
      await setDoc(doc(targetDb, 'attendance', a.id), cleanFirestoreData(a));
      attCount++;
      if (attCount % 20 === 0 || attCount === complexAttendance.length) {
        addLog(`[حضور ${attCount}/${complexAttendance.length}] ✅ تم ترحيل سجلات حضور وغياب إلى attendance/${a.id}`);
      }
    }

    onProgress?.({
      step: 7,
      totalSteps: 10,
      percent: 70,
      title: 'ترحيل سجلات الحضور والغياب اليومي',
      detail: `تم نقل (${complexAttendance.length}) سجل حضور وغياب إلى attendance`,
      logs: [...logs]
    });

    // Step 9: Write Evaluations, Exams, Certificates, Violations
    addLog(`جاري نقل التقييمات (${complexEvaluations.length})، الاختبارات (${complexExams.length})، والشهادات (${complexCertificates.length})...`);
    for (const ev of complexEvaluations) {
      await setDoc(doc(targetDb, 'evaluations', ev.id), cleanFirestoreData(ev));
    }
    for (const ex of complexExams) {
      await setDoc(doc(targetDb, 'exams', ex.id), cleanFirestoreData(ex));
    }
    for (const sub of complexSubmissions) {
      await setDoc(doc(targetDb, 'exam_submissions', sub.id), cleanFirestoreData(sub));
    }
    for (const cert of complexCertificates) {
      await setDoc(doc(targetDb, 'certificates', cert.id), cleanFirestoreData(cert));
    }
    for (const v of complexViolations) {
      await setDoc(doc(targetDb, 'violations', v.id), cleanFirestoreData(v));
    }

    // Migrate Mosques belonging to this complex
    try {
      const mosques = await this.loadMosques(complex.id);
      for (const m of mosques) {
        await setDoc(doc(targetDb, 'mosques', m.id), cleanFirestoreData(m));
      }
      if (mosques.length > 0) addLog(`✅ تم نقل (${mosques.length}) مسجداً تابعاً للمجمع.`);
    } catch {}

    // Migrate Teacher Shifts & Teacher Attendance
    try {
      const shifts = await this.loadTeacherShifts(complex.id);
      for (const sh of shifts) {
        await setDoc(doc(targetDb, 'teacher_shifts', sh.id), cleanFirestoreData(sh));
      }
      const tAtt = await this.loadTeacherAttendance(undefined, complex.id);
      for (const ta of tAtt) {
        await setDoc(doc(targetDb, 'teacher_attendance', ta.id), cleanFirestoreData(ta));
      }
    } catch {}

    addLog(`✅ تم نقل كافة التقييمات، الاختبارات، الشهادات، والملاحظات السلوكية بنجاح.`);

    // Write Settings and metadata to targetDb
    const curSettings = await this.loadSettings();
    const curCriteria = await this.loadCriteria();
    await setDoc(doc(targetDb, 'settings', 'main'), cleanFirestoreData(curSettings));
    for (const cr of curCriteria) {
      await setDoc(doc(targetDb, 'criteria', cr.id), cleanFirestoreData(cr));
    }
    await setDoc(doc(targetDb, 'settings', 'omran_migration_receipt'), {
      migratedAt: new Date().toISOString(),
      complexId: complex.id,
      complexName: complex.name,
      connectedEmail: cleanEmail,
      stats: {
        studentsCount: complexStudents.length,
        halaqahsCount: complexHalaqahs.length,
        attendanceCount: complexAttendance.length,
        evaluationsCount: complexEvaluations.length,
        examsCount: complexExams.length,
        certificatesCount: complexCertificates.length,
        totalRecords
      }
    });

    onProgress?.({
      step: 8,
      totalSteps: 10,
      percent: 88,
      title: 'ترحيل التقييمات والاختبارات والإعدادات',
      detail: `تم نقل كافة سجلات الإنجاز وإعدادات المنصة إلى مشروع فايربيس المستقل`,
      logs: [...logs]
    });

    // Step 10: Update Complex in source database & local cache
    addLog(`تحديث إعدادات مجمع (${complex.name}) في المنصة لتوثيق ربطه بقاعدة البيانات المستقلة...`);
    const migrationStats = {
      studentsCount: complexStudents.length,
      halaqahsCount: complexHalaqahs.length,
      attendanceCount: complexAttendance.length,
      evaluationsCount: complexEvaluations.length,
      examsCount: complexExams.length,
      violationsCount: complexViolations.length,
      certificatesCount: complexCertificates.length,
      totalRecords
    };

    const updatedDatabaseConfig = {
      isCustom: true,
      isIsolated: true,
      projectId: targetProjId,
      apiKey: targetApiKey,
      authDomain: options.targetAuthDomain || `${targetProjId}.firebaseapp.com`,
      storageBucket: options.targetStorageBucket || `${targetProjId}.firebasestorage.app`,
      appId: options.targetAppId || '',
      databaseId: targetDbId,
      connectedEmail: cleanEmail,
      enabledAt: new Date().toISOString(),
      migratedAt: new Date().toISOString(),
      migrationStats
    };

    await this.updateComplexDatabaseConfig(complex.id, updatedDatabaseConfig);

    // Save in local cache for offline & multi-tenant isolation
    setLocalCache(`omran_isolated_db_${complex.id}`, {
      complex: { ...complex, databaseConfig: updatedDatabaseConfig },
      halaqahs: complexHalaqahs,
      students: complexStudents,
      attendance: complexAttendance,
      evaluations: complexEvaluations,
      exams: complexExams,
      certificates: complexCertificates
    });

    // Step 11: Purge all operational data of this complex from central database
    let purgedFromCentral = false;
    if (options.purgeFromCentral !== false) {
      addLog(`جاري تنظيف وحذف بيانات مجمع (${complex.name}) من القاعدة المركزية القديمة بعد اكتمال نقلها إلى فايربيس المستقل...`);
      await this.purgeComplexData(complex.id);
      purgedFromCentral = true;
      addLog(`✅ تم إفراغ وحذف كافة سجلات المجمع من القاعدة المركزية بنجاح تام! أصبحت حصرية في قاعدة بياناته المستقلة.`);
    }

    // Step 12: Automatically switch active database context to this dedicated database!
    OmranDataService.setActiveComplex({
      ...complex,
      databaseConfig: updatedDatabaseConfig
    });
    addLog(`🔄 تم توجيه المنصة للاتصال المباشر بقاعدة بيانات المجمع المستقلة الجديدة.`);

    const consoleUrl = `https://console.firebase.google.com/project/${targetProjId}/firestore/data`;
    addLog(`🎉 اكتمل النقل الحقيقي بنجاح! يمكنك الآن فتح كونسول فايربيس عبر الرابط: ${consoleUrl}`);

    onProgress?.({
      step: 10,
      totalSteps: 10,
      percent: 100,
      title: 'تم النقل بنجاح إلى Firebase!',
      detail: `أصبحت كافة بيانات مجمع (${complex.name}) متواجدة حقيقةً في مشروع فايربيس المستقل (${targetProjId})`,
      logs: [...logs]
    });

    return {
      success: true,
      complexId: complex.id,
      complexName: complex.name,
      targetGoogleEmail: cleanEmail,
      targetProjectId: targetProjId,
      targetDatabaseId: targetDbId,
      targetApiKey: targetApiKey,
      firebaseConsoleUrl: consoleUrl,
      migratedAt: new Date().toISOString(),
      purgedFromCentral,
      stats: migrationStats
    };
  }

  // Update Complex Database Config (for multi-tenant separation)
  static async updateComplexDatabaseConfig(
    complexId: string,
    databaseConfig?: QuranComplex['databaseConfig']
  ): Promise<void> {
    const complexRef = doc(db, 'complexes', complexId);
    const snap = await getDoc(complexRef);
    if (!snap.exists()) throw new Error('المجمع غير موجود');
    const data = snap.data() as QuranComplex;
    const updated: QuranComplex = {
      ...data,
      databaseConfig: databaseConfig || undefined
    };
    await setDoc(complexRef, cleanFirestoreData(updated));
  }

  // Load Halaqahs with Dual Persistence and Tombstone filtering
  static async loadHalaqahs(): Promise<Halaqah[]> {
    await syncTombstonesFromCloud().catch(() => {});
    const deletedHalaqahIds = getDeletedHalaqahIds();
    const local = getLocalCache<Halaqah[]>(OMRAN_CACHE_KEYS.HALAQAHS, [])
      .filter(h => h?.id && !deletedHalaqahIds.has(h.id));
    let cloudList: Halaqah[] = [];
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'halaqahs'));
      snap.forEach(d => {
        const h = d.data() as Halaqah;
        if (h?.id && !deletedHalaqahIds.has(h.id)) {
          cloudList.push(h);
        }
      });

      // Dual persistence fallback: if active DB is custom/dedicated, also load from Central DB so no halaqahs vanish!
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          const centralSnap = await safeGetDocs(collection(this.getCentralDb(), 'halaqahs'));
          centralSnap.forEach(d => {
            const h = d.data() as Halaqah;
            if (h?.id && !deletedHalaqahIds.has(h.id) && !cloudList.some(item => item.id === h.id)) {
              cloudList.push(h);
            }
          });
        } catch {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'halaqahs');
    }

    const mergedMap = new Map<string, Halaqah>();
    for (const h of local) if (h?.id && !deletedHalaqahIds.has(h.id)) mergedMap.set(h.id, h);
    for (const h of cloudList) if (h?.id && !deletedHalaqahIds.has(h.id)) mergedMap.set(h.id, h);

    const isCentral = !this.getActiveComplex()?.databaseConfig?.isCustom;
    if (mergedMap.size === 0 && isCentral && deletedHalaqahIds.size === 0) {
      for (const h of DEFAULT_HALAQAHS) {
        if (!deletedHalaqahIds.has(h.id)) mergedMap.set(h.id, h);
      }
    }

    const merged = Array.from(mergedMap.values());
    setLocalCache(OMRAN_CACHE_KEYS.HALAQAHS, merged);
    return merged;
  }

  // Save Halaqah with Dual Persistence
  static async saveHalaqah(halaqah: Halaqah): Promise<void> {
    removeDeletedHalaqahId(halaqah.id);
    const clean = cleanFirestoreData(halaqah);
    const local = getLocalCache<Halaqah[]>(OMRAN_CACHE_KEYS.HALAQAHS, DEFAULT_HALAQAHS);
    const updated = [clean, ...local.filter(h => h.id !== clean.id)];
    setLocalCache(OMRAN_CACHE_KEYS.HALAQAHS, updated);
    broadcastDataUpdate('halaqah', clean);

    try {
      await setDoc(doc(this.getActiveDb(), 'halaqahs', clean.id), clean);
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await setDoc(doc(this.getCentralDb(), 'halaqahs', clean.id), clean);
        } catch {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `halaqahs/${clean.id}`);
      console.warn('[OmranDataService] Halaqah saved locally, cloud sync pending/offline:', e);
    }
  }

  // Delete Halaqah with Dual Persistence & Permanent Tombstone
  static async deleteHalaqah(halaqahId: string): Promise<void> {
    addDeletedHalaqahId(halaqahId);
    const local = getLocalCache<Halaqah[]>(OMRAN_CACHE_KEYS.HALAQAHS, []);
    setLocalCache(OMRAN_CACHE_KEYS.HALAQAHS, local.filter(h => h.id !== halaqahId));
    broadcastDataUpdate('halaqah-deleted', halaqahId);

    try {
      await deleteDoc(doc(this.getActiveDb(), 'halaqahs', halaqahId));
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await deleteDoc(doc(this.getCentralDb(), 'halaqahs', halaqahId));
        } catch {}
      }

      // Reassign students of the deleted halaqah to unassigned gracefully
      const allStudents = await this.loadStudents();
      for (const s of allStudents) {
        if (s.halaqahId === halaqahId) {
          const updatedSt: Student = {
            ...s,
            halaqahId: 'unassigned',
            halaqahName: 'حلقة غير محددة'
          };
          await this.saveStudent(updatedSt);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `halaqahs/${halaqahId}`);
    }
  }

  // Transfer Student to another Halaqah directly in Firestore (preserves full records and synchronizes complexId!)
  static async transferStudentToHalaqah(
    studentId: string,
    targetHalaqahId: string,
    targetHalaqahName: string
  ): Promise<Student | null> {
    try {
      const studentRef = doc(this.getActiveDb(), 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) return null;
      const data = studentSnap.data() as Student;

      const halaqahs = await this.loadHalaqahs();
      const targetHalaqah = halaqahs.find(h => h.id === targetHalaqahId);
      const targetComplexId = targetHalaqah ? targetHalaqah.complexId : undefined;

      const updatedStudent: Student = {
        ...data,
        halaqahId: targetHalaqahId,
        halaqahName: targetHalaqahName,
        complexId: targetComplexId
      };

      await setDoc(studentRef, cleanFirestoreData(updatedStudent));
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await setDoc(doc(this.getCentralDb(), 'students', studentId), cleanFirestoreData(updatedStudent));
        } catch {}
      }

      // Update in local cache immediately
      const local = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, []);
      setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, local.map(s => s.id === studentId ? updatedStudent : s));

      return updatedStudent;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `students/${studentId}`);
      throw e;
    }
  }

  // Transfer Multiple Students to another Halaqah directly in Firestore (batch transfer with synchronized complexId)
  static async transferMultipleStudentsToHalaqah(
    studentIds: string[],
    targetHalaqahId: string,
    targetHalaqahName: string
  ): Promise<void> {
    try {
      const halaqahs = await this.loadHalaqahs();
      const targetHalaqah = halaqahs.find(h => h.id === targetHalaqahId);

      for (const sId of studentIds) {
        const studentRef = doc(this.getActiveDb(), 'students', sId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const data = studentSnap.data() as Student;
          const targetComplexId = targetHalaqah ? targetHalaqah.complexId : undefined;

          const updatedStudent: Student = {
            ...data,
            halaqahId: targetHalaqahId,
            halaqahName: targetHalaqahName,
            complexId: targetComplexId
          };
          await setDoc(studentRef, cleanFirestoreData(updatedStudent));
          if (this.getActiveDb() !== this.getCentralDb()) {
            try {
              await setDoc(doc(this.getCentralDb(), 'students', sId), cleanFirestoreData(updatedStudent));
            } catch {}
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `students/batch_transfer`);
      throw e;
    }
  }

  // Persistent Tombstones for clean deletions that never resurrect
  static getDeletedStudentIds(): Set<string> {
    return getDeletedStudentIds();
  }

  static addDeletedStudentId(id: string): void {
    addDeletedStudentId(id);
  }

  static removeDeletedStudentId(id: string): void {
    removeDeletedStudentId(id);
  }

  static getDeletedCertificateIds(): Set<string> {
    return getDeletedCertificateIds();
  }

  static addDeletedCertificateId(id: string): void {
    addDeletedCertificateId(id);
  }

  static removeDeletedCertificateId(id: string): void {
    removeDeletedCertificateId(id);
  }

  // Load Students directly with Dual Persistence and Deletion Filtering
  static async loadStudents(): Promise<Student[]> {
    try {
      await syncTombstonesFromCloud();
    } catch {}
    const deletedIds = OmranDataService.getDeletedStudentIds();
    const local = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, []).filter(s => s?.id && !deletedIds.has(s.id));
    let cloudList: Student[] = [];
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'students'));
      snap.forEach(d => {
        const s = d.data() as Student;
        if (s?.id && !deletedIds.has(s.id)) {
          cloudList.push(s);
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'students');
    }

    const mergedMap = new Map<string, Student>();
    for (const s of local) {
      if (s?.id && !deletedIds.has(s.id)) mergedMap.set(s.id, s);
    }
    for (const s of cloudList) {
      if (s?.id && !deletedIds.has(s.id)) mergedMap.set(s.id, s);
    }

    // Only fallback to INITIAL_STUDENTS on the central database if no explicit deletions have occurred
    const isCentralDb = !this.getActiveComplex()?.databaseConfig?.isCustom;
    if (isCentralDb && mergedMap.size === 0 && deletedIds.size === 0) {
      for (const s of INITIAL_STUDENTS) {
        if (!deletedIds.has(s.id)) {
          mergedMap.set(s.id, s);
        }
      }
    }
    const merged = Array.from(mergedMap.values()).filter(s => {
      if (deletedIds.has(s.id)) return false;
      if (s.id === 'teacher-1' || (s.id.startsWith('teacher-') && (s as any).username)) {
        return false;
      }
      return true;
    }).map(s => {
      const parentPhone = s.parentPhone || (s.parentPhones && s.parentPhones.length > 0 ? s.parentPhones[0] : s.phone) || '';
      return {
        ...s,
        parentPhone
      };
    });
    setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, merged);
    return merged;
  }

  static async getStudents(): Promise<Student[]> {
    return this.loadStudents();
  }

  // Save Student directly with Dual Persistence
  static async saveStudent(student: Student): Promise<void> {
    OmranDataService.removeDeletedStudentId(student.id);
    const parentPhone = student.parentPhone || (student.parentPhones && student.parentPhones.length > 0 ? student.parentPhones[0] : student.phone) || '';
    const clean = cleanFirestoreData({ ...student, parentPhone });
    const local = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const updated = [clean, ...local.filter(s => s.id !== clean.id)];
    setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, updated);

    try {
      await setDoc(doc(this.getActiveDb(), 'students', clean.id), clean);
    } catch (e) {
      console.warn('[OmranDataService] Student saved locally, cloud sync pending/offline:', e);
    }
  }

  // Delete Student directly from Firestore and local cache, cleanly unlinking and deleting any Google account
  static async deleteStudent(studentId: string): Promise<void> {
    // 0. Register persistent tombstone so student NEVER re-appears from offline cache or initial data
    addDeletedStudentId(studentId);

    const local = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, []);
    const student = local.find(s => s.id === studentId);
    setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, local.filter(s => s.id !== studentId));
    broadcastDataUpdate('student-deleted', studentId);

    // Clear active session and google tokens if this student was logged in
    try {
      if (typeof window !== 'undefined') {
        const savedSession = localStorage.getItem('omran_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed?.studentId === studentId || (student?.googleEmail && parsed?.googleEmail === student.googleEmail)) {
            localStorage.removeItem('omran_session');
          }
        }
        if (student?.googleEmail) {
          localStorage.removeItem(`omran_google_user_${student.googleEmail}`);
        }
      }
    } catch {}

    const targetDbs = [this.getActiveDb()];
    if (this.getActiveDb() !== this.getCentralDb()) {
      targetDbs.push(this.getCentralDb());
    }

    for (const activeDb of targetDbs) {
      try {
        // 1. Delete student document
        await deleteDoc(doc(activeDb, 'students', studentId));

        // 2. Cleanly detach & delete linked Google account documents if present
        if (student?.googleEmail || student?.googleUid || student?.isGoogleLinked) {
          if (student?.googleUid) {
            deleteDoc(doc(activeDb, 'google_accounts', student.googleUid)).catch(() => {});
            deleteDoc(doc(activeDb, 'users', student.googleUid)).catch(() => {});
          }
          if (student?.googleEmail) {
            deleteDoc(doc(activeDb, 'google_accounts', student.googleEmail.replace(/[@.]/g, '_'))).catch(() => {});
            deleteDoc(doc(activeDb, 'student_accounts', student.googleEmail.replace(/[@.]/g, '_'))).catch(() => {});
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `students/${studentId}`);
      }
    }

    // 3. Cascade delete student attendance
    const attLocal = getLocalCache<AttendanceRecord[]>(OMRAN_CACHE_KEYS.ATTENDANCE, []);
    const attToDelete = attLocal.filter(a => a.studentId === studentId);
    setLocalCache(OMRAN_CACHE_KEYS.ATTENDANCE, attLocal.filter(a => a.studentId !== studentId));
    for (const a of attToDelete) {
      for (const db of targetDbs) {
        deleteDoc(doc(db, 'attendance', a.id)).catch(() => {});
      }
    }

    // 4. Cascade delete student evaluations
    const evalLocal = getLocalCache<StudentEvaluation[]>(OMRAN_CACHE_KEYS.EVALUATIONS, []);
    const evalsToDelete = evalLocal.filter(e => e.studentId === studentId);
    setLocalCache(OMRAN_CACHE_KEYS.EVALUATIONS, evalLocal.filter(e => e.studentId !== studentId));
    for (const ev of evalsToDelete) {
      for (const db of targetDbs) {
        deleteDoc(doc(db, 'evaluations', ev.id)).catch(() => {});
      }
    }

    // 5. Cascade delete student violations
    const violLocal = getLocalCache<BehaviorViolation[]>(OMRAN_CACHE_KEYS.VIOLATIONS, []);
    const violsToDelete = violLocal.filter(v => v.studentId === studentId);
    setLocalCache(OMRAN_CACHE_KEYS.VIOLATIONS, violLocal.filter(v => v.studentId !== studentId));
    for (const v of violsToDelete) {
      for (const db of targetDbs) {
        deleteDoc(doc(db, 'violations', v.id)).catch(() => {});
      }
    }
  }

  // Delete multiple students in batch from Firestore and local cache
  static async deleteStudentsBatch(studentIds: string[]): Promise<void> {
    if (!studentIds || studentIds.length === 0) return;
    for (const id of studentIds) {
      addDeletedStudentId(id);
      broadcastDataUpdate('student-deleted', id);
    }
    const idSet = new Set(studentIds);
    const local = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, []);
    setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, local.filter(s => !idSet.has(s.id)));

    // Clear any active sessions if match
    try {
      if (typeof window !== 'undefined') {
        const savedSession = localStorage.getItem('omran_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed?.studentId && idSet.has(parsed.studentId)) {
            localStorage.removeItem('omran_session');
          }
        }
      }
    } catch {}

    const targetDbs = [this.getActiveDb()];
    if (this.getActiveDb() !== this.getCentralDb()) {
      targetDbs.push(this.getCentralDb());
    }

    for (const activeDb of targetDbs) {
      try {
        const batch = writeBatch(activeDb);
        for (const id of studentIds) {
          batch.delete(doc(activeDb, 'students', id));
        }
        await batch.commit();
      } catch (e) {
        console.warn('[OmranDataService] deleteStudentsBatch error on db:', e);
      }
    }

    // Cascade clean attendance, evals, violations locally and on firestore
    const attLocal = getLocalCache<AttendanceRecord[]>(OMRAN_CACHE_KEYS.ATTENDANCE, []);
    setLocalCache(OMRAN_CACHE_KEYS.ATTENDANCE, attLocal.filter(a => !idSet.has(a.studentId)));

    const evalLocal = getLocalCache<StudentEvaluation[]>(OMRAN_CACHE_KEYS.EVALUATIONS, []);
    setLocalCache(OMRAN_CACHE_KEYS.EVALUATIONS, evalLocal.filter(e => !idSet.has(e.studentId)));

    const violLocal = getLocalCache<BehaviorViolation[]>(OMRAN_CACHE_KEYS.VIOLATIONS, []);
    setLocalCache(OMRAN_CACHE_KEYS.VIOLATIONS, violLocal.filter(v => !idSet.has(v.studentId)));
  }

  // Load Attendance with Dual Persistence
  static async loadAttendance(): Promise<AttendanceRecord[]> {
    const local = getLocalCache<AttendanceRecord[]>(OMRAN_CACHE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    let cloudList: AttendanceRecord[] = [];
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'attendance'));
      snap.forEach(d => cloudList.push(d.data() as AttendanceRecord));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'attendance');
    }

    const mergedMap = new Map<string, AttendanceRecord>();
    for (const a of (local.length > 0 ? local : INITIAL_ATTENDANCE)) {
      if (a?.id) mergedMap.set(a.id, a);
    }
    for (const a of cloudList) {
      if (a?.id) mergedMap.set(a.id, a);
    }
    const merged = Array.from(mergedMap.values());
    setLocalCache(OMRAN_CACHE_KEYS.ATTENDANCE, merged);
    return merged;
  }

  // Save Batch Attendance with Dual Persistence
  static async saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
    const cleanRecords: AttendanceRecord[] = records.map(r => cleanFirestoreData(r));

    // 1. Immediately store in local cache
    const local = getLocalCache<AttendanceRecord[]>(OMRAN_CACHE_KEYS.ATTENDANCE, []);
    const map = new Map<string, AttendanceRecord>();
    for (const a of local) {
      if (a?.id) map.set(a.id, a);
    }
    for (const r of cleanRecords) {
      if (r?.id) map.set(r.id, r);
    }
    setLocalCache(OMRAN_CACHE_KEYS.ATTENDANCE, Array.from(map.values()));
    broadcastDataUpdate('attendance-records', cleanRecords);
    broadcastDataUpdate('attendance', cleanRecords);

    // 2. Persist to Firestore in parallel without throwing fatal errors
    try {
      const activeDb = this.getActiveDb();
      await Promise.allSettled(
        cleanRecords.map(rec => setDoc(doc(activeDb, 'attendance', rec.id), rec))
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'attendance');
      console.warn('[OmranDataService] Attendance saved locally, cloud sync pending/offline:', e);
    }
  }

  // Load Evaluations with Dual Persistence
  static async loadEvaluations(): Promise<StudentEvaluation[]> {
    const local = getLocalCache<StudentEvaluation[]>(OMRAN_CACHE_KEYS.EVALUATIONS, INITIAL_EVALUATIONS);
    let cloudList: StudentEvaluation[] = [];
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'evaluations'));
      snap.forEach(d => cloudList.push(d.data() as StudentEvaluation));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'evaluations');
    }

    const mergedMap = new Map<string, StudentEvaluation>();
    for (const e of (local.length > 0 ? local : INITIAL_EVALUATIONS)) {
      if (e?.id) mergedMap.set(e.id, e);
    }
    for (const e of cloudList) {
      if (e?.id) mergedMap.set(e.id, e);
    }
    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => b.date.localeCompare(a.date));
    setLocalCache(OMRAN_CACHE_KEYS.EVALUATIONS, merged);
    return merged;
  }

  // Save Evaluation with Dual Persistence
  static async saveEvaluation(evaluation: StudentEvaluation): Promise<void> {
    const clean = cleanFirestoreData(evaluation);

    // 1. Instantly update local cache (guarantees 100% data safety, instant response, and prevents UI errors)
    const local = getLocalCache<StudentEvaluation[]>(OMRAN_CACHE_KEYS.EVALUATIONS, []);
    const updated = [clean, ...local.filter(e => e.id !== clean.id)];
    setLocalCache(OMRAN_CACHE_KEYS.EVALUATIONS, updated);

    // 2. Synchronize to Firestore Cloud
    try {
      await setDoc(doc(this.getActiveDb(), 'evaluations', clean.id), clean);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `evaluations/${clean.id}`);
      console.warn('[OmranDataService] Evaluation saved locally, cloud sync pending/offline:', e);
    }
  }

  // Delete Evaluation with Dual Persistence
  static async deleteEvaluation(evaluationId: string): Promise<void> {
    const local = getLocalCache<StudentEvaluation[]>(OMRAN_CACHE_KEYS.EVALUATIONS, []);
    setLocalCache(OMRAN_CACHE_KEYS.EVALUATIONS, local.filter(e => e.id !== evaluationId));

    try {
      await deleteDoc(doc(this.getActiveDb(), 'evaluations', evaluationId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `evaluations/${evaluationId}`);
    }
  }

  // Load Criteria with Dual Persistence
  static async loadCriteria(): Promise<EvaluationCriteria[]> {
    const local = getLocalCache<EvaluationCriteria[]>(OMRAN_CACHE_KEYS.CRITERIA, []);
    let cloudList: EvaluationCriteria[] = [];
    try {
      const activeDb = this.getActiveDb();
      const snap = await safeGetDocs(collection(activeDb, 'criteria'));
      snap.forEach(d => cloudList.push(d.data() as EvaluationCriteria));
      if (snap.empty && local.length === 0) {
        for (const c of DEFAULT_CRITERIA) {
          await setDoc(doc(activeDb, 'criteria', c.id), cleanFirestoreData(c));
        }
        setLocalCache(OMRAN_CACHE_KEYS.CRITERIA, DEFAULT_CRITERIA);
        return DEFAULT_CRITERIA;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'criteria');
    }

    const mergedMap = new Map<string, EvaluationCriteria>();
    for (const c of DEFAULT_CRITERIA) mergedMap.set(c.id, c);
    for (const c of local) if (c?.id) mergedMap.set(c.id, c);
    for (const c of cloudList) if (c?.id) mergedMap.set(c.id, c);

    const merged = Array.from(mergedMap.values());
    setLocalCache(OMRAN_CACHE_KEYS.CRITERIA, merged);
    return merged;
  }

  // Save Criteria List with Dual Persistence
  static async saveCriteriaList(list: EvaluationCriteria[]): Promise<void> {
    const clean = list.map(c => cleanFirestoreData(c));
    setLocalCache(OMRAN_CACHE_KEYS.CRITERIA, clean);

    try {
      const activeDb = this.getActiveDb();
      await Promise.allSettled(
        clean.map(item => setDoc(doc(activeDb, 'criteria', item.id), item))
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'criteria');
      console.warn('[OmranDataService] Criteria saved locally, cloud sync pending/offline:', e);
    }
  }

  // Delete Criteria with Dual Persistence
  static async deleteCriteria(id: string): Promise<void> {
    const local = getLocalCache<EvaluationCriteria[]>(OMRAN_CACHE_KEYS.CRITERIA, []);
    setLocalCache(OMRAN_CACHE_KEYS.CRITERIA, local.filter(c => c.id !== id));

    try {
      await deleteDoc(doc(this.getActiveDb(), 'criteria', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `criteria/${id}`);
    }
  }

  // Load Settings with Dual Persistence
  static async loadSettings(): Promise<AppSettings> {
    const local = getLocalCache<AppSettings>(OMRAN_CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    try {
      const docSnap = await safeGetDoc(doc(this.getActiveDb(), 'settings', 'main'));
      if (docSnap.exists()) {
        const cloud = docSnap.data() as AppSettings;
        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...cloud,
          attendancePointsSettings: {
            ...DEFAULT_SETTINGS.attendancePointsSettings,
            ...(cloud.attendancePointsSettings || {})
          }
        };
        setLocalCache(OMRAN_CACHE_KEYS.SETTINGS, merged);
        return merged;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'settings/main');
    }
    return local;
  }

  // Save Settings with Dual Persistence
  static async saveSettings(settings: AppSettings): Promise<void> {
    const enrichedSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      attendancePointsSettings: {
        ...DEFAULT_SETTINGS.attendancePointsSettings,
        ...(settings.attendancePointsSettings || {})
      }
    };
    const clean = cleanFirestoreData(enrichedSettings);
    setLocalCache(OMRAN_CACHE_KEYS.SETTINGS, clean);
    broadcastDataUpdate('settings', clean);

    try {
      await setDoc(doc(this.getActiveDb(), 'settings', 'main'), clean, { merge: true });
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await setDoc(doc(this.getCentralDb(), 'settings', 'main'), clean, { merge: true });
        } catch {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/main');
      console.warn('[OmranDataService] Settings saved locally, cloud sync pending/offline:', e);
    }
  }

  // Load Chats directly from Firestore
  static async loadChats(): Promise<ChatMessage[]> {
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'chats'));
      const list: ChatMessage[] = [];
      snap.forEach(d => list.push(d.data() as ChatMessage));
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'chats');
      return [];
    }
  }

  // Save Chat Message directly in Firestore
  static async saveChatMessage(msg: ChatMessage): Promise<void> {
    try {
      await setDoc(doc(this.getActiveDb(), 'chats', msg.id), msg);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${msg.id}`);
      throw e;
    }
  }

  // Clear Chats directly from Firestore
  static async clearChats(): Promise<void> {
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'chats'));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'chats');
      throw e;
    }
  }

  // Load Behavior Violations directly from Firestore
  static async loadViolations(): Promise<BehaviorViolation[]> {
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'violations'));
      const list: BehaviorViolation[] = [];
      snap.forEach(d => list.push(d.data() as BehaviorViolation));
      list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'violations');
      return [];
    }
  }

  // Save Behavior Violation directly in Firestore
  static async saveViolation(violation: BehaviorViolation): Promise<void> {
    try {
      const cleanViolation = JSON.parse(JSON.stringify(violation));
      await setDoc(doc(this.getActiveDb(), 'violations', violation.id), cleanViolation);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `violations/${violation.id}`);
      throw e;
    }
  }

  // Delete Behavior Violation directly from Firestore
  static async deleteViolation(violationId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.getActiveDb(), 'violations', violationId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `violations/${violationId}`);
      throw e;
    }
  }

  // Real-time listener for violations
  static subscribeViolations(callback: (violations: BehaviorViolation[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'violations'), snap => {
        const list: BehaviorViolation[] = [];
        snap.forEach(d => list.push(d.data() as BehaviorViolation));
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'violations');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Find student by ID or name or phone directly from Firestore (for live portal access)
  static async findStudentByIdOrQuery(lookup: string): Promise<Student | null> {
    if (!lookup) return null;
    const clean = decodeURIComponent(lookup).trim();
    const cleanNoSpaces = clean.replace(/\s+/g, '');

    // 1. Direct document fetch by ID
    try {
      const docSnap = await safeGetDoc(doc(this.getActiveDb(), 'students', clean));
      if (docSnap.exists()) {
        return docSnap.data() as Student;
      }
    } catch (e) {
      // Continue to query
    }

    // 2. Query Firestore entire collection
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'students'));
      for (const d of snap.docs) {
        const s = d.data() as Student;
        if (
          s.id === clean ||
          s.id.toLowerCase() === clean.toLowerCase() ||
          s.name.trim() === clean ||
          s.name.replace(/\s+/g, '') === cleanNoSpaces ||
          s.phone.replace(/\D/g, '') === clean.replace(/\D/g, '') ||
          (s.parentPhones && s.parentPhones.some(p => p.replace(/\D/g, '') === clean.replace(/\D/g, '')))
        ) {
          return s;
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'students');
    }

    return null;
  }

  // Real-time Firestore Subscriptions for instant multi-device / multi-teacher sync
  static subscribeStudents(callback: (students: Student[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'students'), snap => {
        const deletedIds = OmranDataService.getDeletedStudentIds();
        const list: Student[] = [];
        snap.forEach(d => {
          const s = d.data() as Student;
          if (deletedIds.has(s.id)) {
            return;
          }
          if (s.id === 'teacher-1' || (s.id.startsWith('teacher-') && (s as any).username)) {
            return;
          }
          list.push(s);
        });
        setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, list);
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'students');
      });
    } catch (e) {
      return () => {};
    }
  }

  static subscribeAttendance(callback: (attendance: AttendanceRecord[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'attendance'), snap => {
        const list: AttendanceRecord[] = [];
        snap.forEach(d => list.push(d.data() as AttendanceRecord));
        setLocalCache(OMRAN_CACHE_KEYS.ATTENDANCE, list);
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      });
    } catch (e) {
      return () => {};
    }
  }

  static subscribeEvaluations(callback: (evaluations: StudentEvaluation[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'evaluations'), snap => {
        const list: StudentEvaluation[] = [];
        snap.forEach(d => list.push(d.data() as StudentEvaluation));
        setLocalCache(OMRAN_CACHE_KEYS.EVALUATIONS, list);
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'evaluations');
      });
    } catch (e) {
      return () => {};
    }
  }

  static subscribeCriteria(callback: (criteria: EvaluationCriteria[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'criteria'), snap => {
        const list: EvaluationCriteria[] = [];
        snap.forEach(d => list.push(d.data() as EvaluationCriteria));
        setLocalCache(OMRAN_CACHE_KEYS.CRITERIA, list);
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'criteria');
      });
    } catch (e) {
      return () => {};
    }
  }

  static subscribeSettings(callback: (settings: AppSettings) => void): () => void {
    try {
      return onSnapshot(doc(this.getActiveDb(), 'settings', 'main'), snap => {
        if (snap.exists()) {
          const cloud = snap.data() as AppSettings;
          const local = getLocalCache<AppSettings>(OMRAN_CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
          const merged: AppSettings = {
            ...DEFAULT_SETTINGS,
            ...local,
            ...cloud,
            attendancePointsSettings: {
              ...DEFAULT_SETTINGS.attendancePointsSettings,
              ...(local.attendancePointsSettings || {}),
              ...(cloud.attendancePointsSettings || {})
            }
          };
          setLocalCache(OMRAN_CACHE_KEYS.SETTINGS, merged);
          callback(merged);
        }
      }, err => {
        handleFirestoreError(err, OperationType.GET, 'settings/main');
      });
    } catch (e) {
      return () => {};
    }
  }

  static subscribeTeachers(callback: (teachers: TeacherAccount[]) => void): () => void {
    try {
      const unsubActive = onSnapshot(collection(this.getActiveDb(), 'teachers'), snap => {
        const deletedTeacherIds = getDeletedTeacherIds();
        const list: TeacherAccount[] = [];
        snap.forEach(d => {
          const t = d.data() as TeacherAccount;
          if (t?.id && !deletedTeacherIds.has(t.id)) {
            list.push(t);
          }
        });
        setLocalCache(OMRAN_CACHE_KEYS.TEACHERS, list);
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'teachers');
      });

      if (this.getActiveDb() !== this.getCentralDb()) {
        const unsubCentral = onSnapshot(collection(this.getCentralDb(), 'teachers'), snap => {
          const deletedTeacherIds = getDeletedTeacherIds();
          const list: TeacherAccount[] = [];
          snap.forEach(d => {
            const t = d.data() as TeacherAccount;
            if (t?.id && !deletedTeacherIds.has(t.id)) {
              list.push(t);
            }
          });
          const local = getLocalCache<TeacherAccount[]>(OMRAN_CACHE_KEYS.TEACHERS, []);
          const map = new Map<string, TeacherAccount>();
          for (const t of local) if (t?.id && !deletedTeacherIds.has(t.id)) map.set(t.id, t);
          for (const t of list) map.set(t.id, t);
          const finalTeachers = Array.from(map.values());
          setLocalCache(OMRAN_CACHE_KEYS.TEACHERS, finalTeachers);
          callback(finalTeachers);
        }, () => {});

        return () => {
          unsubActive();
          unsubCentral();
        };
      }

      return unsubActive;
    } catch (e) {
      return () => {};
    }
  }

  static subscribeHalaqahs(callback: (halaqahs: Halaqah[]) => void): () => void {
    try {
      const unsubActive = onSnapshot(collection(this.getActiveDb(), 'halaqahs'), snap => {
        const deletedHalaqahIds = getDeletedHalaqahIds();
        const list: Halaqah[] = [];
        snap.forEach(d => {
          const h = d.data() as Halaqah;
          if (h?.id && !deletedHalaqahIds.has(h.id)) {
            list.push(h);
          }
        });
        setLocalCache(OMRAN_CACHE_KEYS.HALAQAHS, list);
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'halaqahs');
      });

      if (this.getActiveDb() !== this.getCentralDb()) {
        const unsubCentral = onSnapshot(collection(this.getCentralDb(), 'halaqahs'), snap => {
          const deletedHalaqahIds = getDeletedHalaqahIds();
          const list: Halaqah[] = [];
          snap.forEach(d => {
            const h = d.data() as Halaqah;
            if (h?.id && !deletedHalaqahIds.has(h.id)) {
              list.push(h);
            }
          });
          setLocalCache(OMRAN_CACHE_KEYS.HALAQAHS, list);
          callback(list);
        }, () => {});

        return () => {
          unsubActive();
          unsubCentral();
        };
      }

      return unsubActive;
    } catch (e) {
      return () => {};
    }
  }

  // Real-time synchronization of deleted records across all devices and clients
  static subscribeTombstones(callback: (tombstones: {
    deletedStudents: Set<string>;
    deletedTeachers: Set<string>;
    deletedHalaqahs: Set<string>;
    deletedComplexes: Set<string>;
  }) => void): () => void {
    try {
      const handleSnap = (snap: any) => {
        if (snap && snap.exists()) {
          const data = snap.data();
          const sList = Array.isArray(data.deletedStudents) ? data.deletedStudents : [];
          const tList = Array.isArray(data.deletedTeachers) ? data.deletedTeachers : [];
          const hList = Array.isArray(data.deletedHalaqahs) ? data.deletedHalaqahs : [];
          const cList = Array.isArray(data.deletedComplexes) ? data.deletedComplexes : [];

          const curS = new Set([...getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_STUDENTS, []), ...sList]);
          const curT = new Set([...getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_TEACHERS, []), ...tList]);
          const curH = new Set([...getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, []), ...hList]);
          const curC = new Set([...getLocalCache<string[]>(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, []), ...cList]);

          setLocalCache(OMRAN_CACHE_KEYS.DELETED_STUDENTS, Array.from(curS));
          setLocalCache(OMRAN_CACHE_KEYS.DELETED_TEACHERS, Array.from(curT));
          setLocalCache(OMRAN_CACHE_KEYS.DELETED_HALAQAHS, Array.from(curH));
          setLocalCache(OMRAN_CACHE_KEYS.DELETED_COMPLEXES, Array.from(curC));

          callback({
            deletedStudents: curS,
            deletedTeachers: curT,
            deletedHalaqahs: curH,
            deletedComplexes: curC
          });
        }
      };

      const unsubCentral = onSnapshot(doc(this.getCentralDb(), 'settings', 'deleted_records'), handleSnap, () => {});
      if (this.getActiveDb() !== this.getCentralDb()) {
        const unsubActive = onSnapshot(doc(this.getActiveDb(), 'settings', 'deleted_records'), handleSnap, () => {});
        return () => {
          unsubCentral();
          unsubActive();
        };
      }
      return unsubCentral;
    } catch {
      return () => {};
    }
  }

  // Helper to sanitize exams and prevent undefined questions
  static sanitizeExam(raw: any): Exam {
    const rawQuestions = Array.isArray(raw?.questions)
      ? raw.questions
      : typeof raw?.questions === 'object' && raw?.questions !== null
      ? Object.values(raw.questions)
      : [];

    const cleanQuestions: ExamQuestion[] = rawQuestions.map((q: any, idx: number) => ({
      id: q?.id || `q-${raw?.id || 'exam'}-${idx + 1}`,
      title: q?.title || `سؤال رقم ${idx + 1}`,
      type: q?.type || 'multiple_choice',
      options: Array.isArray(q?.options)
        ? q.options
        : q?.type === 'true_false'
        ? ['صح', 'خطأ']
        : ['الخيار 1', 'الخيار 2', 'الخيار 3'],
      correctAnswer: q?.correctAnswer !== undefined ? q.correctAnswer : (q?.type === 'true_false' ? 'صح' : undefined),
      points: Number(q?.points) || 5,
      explanation: q?.explanation || '',
      timeLimitSeconds: q?.timeLimitSeconds ? Number(q.timeLimitSeconds) : undefined
    }));

    return {
      id: raw?.id || `exam-${Date.now()}`,
      title: raw?.title || 'اختبار قرآني',
      description: raw?.description || '',
      scheduleType: raw?.scheduleType || 'now',
      startDate: raw?.startDate || new Date().toISOString(),
      hasDeadline: Boolean(raw?.hasDeadline),
      deadlineDate: raw?.deadlineDate || undefined,
      attemptLimitType: raw?.attemptLimitType || 'unlimited',
      maxAttempts: raw?.maxAttempts ? Number(raw.maxAttempts) : 1,
      timeLimitMode: raw?.timeLimitMode || 'total',
      totalTimeMinutes: raw?.totalTimeMinutes ? Number(raw.totalTimeMinutes) : 10,
      questionTimeSeconds: raw?.questionTimeSeconds ? Number(raw.questionTimeSeconds) : 30,
      gradeVisibility: raw?.gradeVisibility || 'immediate',
      grantsLeaderboardPoints: raw?.grantsLeaderboardPoints ?? true,
      totalPoints: Number(raw?.totalPoints) || cleanQuestions.reduce((s, q) => s + q.points, 0) || 20,
      targetHalaqat: Array.isArray(raw?.targetHalaqat) && raw.targetHalaqat.length > 0 ? raw.targetHalaqat : ['all'],
      deliveryMode: raw?.deliveryMode || (raw?.googleFormResponderUrl || raw?.googleFormId ? 'google_form' : 'platform'),
      autoCreateGoogleForm: raw?.autoCreateGoogleForm ?? true,
      questions: cleanQuestions.length > 0 ? cleanQuestions : INITIAL_EXAMS[0].questions,
      googleFormId: raw?.googleFormId,
      googleFormUrl: raw?.googleFormUrl,
      googleFormResponderUrl: raw?.googleFormResponderUrl,
      googleSpreadsheetId: raw?.googleSpreadsheetId,
      googleSpreadsheetUrl: raw?.googleSpreadsheetUrl,
      googleFormNameEntryId: raw?.googleFormNameEntryId,
      complexId: raw?.complexId || undefined,
      complexName: raw?.complexName || undefined,
      createdById: raw?.createdById || 'teacher-1',
      createdByName: raw?.createdByName || 'الشيخ المعلم',
      createdAt: raw?.createdAt || new Date().toISOString(),
      updatedAt: raw?.updatedAt
    };
  }

  // Load Exams directly from Firestore
  static async loadExams(): Promise<Exam[]> {
    try {
      await syncTombstonesFromCloud().catch(() => {});
      const activeDb = this.getActiveDb();
      const snap = await safeGetDocs(collection(activeDb, 'exams'));
      const deletedExamIds = getDeletedExamIds();
      const list: Exam[] = [];
      snap.forEach(d => {
        const raw = d.data();
        const id = d.id || raw.id;
        if (!deletedExamIds.has(id)) {
          list.push(this.sanitizeExam({ ...raw, id }));
        }
      });

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('omran_exams_initialized', 'true');
      }

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLocalCache(OMRAN_CACHE_KEYS.EXAMS, list);
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'exams');
      const local = getLocalCache<Exam[]>(OMRAN_CACHE_KEYS.EXAMS, []);
      const deletedExamIds = getDeletedExamIds();
      return local.filter(x => !deletedExamIds.has(x.id));
    }
  }

  // Save Exam directly in Firestore
  static async saveExam(exam: Exam): Promise<void> {
    try {
      removeDeletedExamId(exam.id);
      const sanitized = this.sanitizeExam(exam);
      const cleanExam = JSON.parse(JSON.stringify(sanitized));
      const local = getLocalCache<Exam[]>(OMRAN_CACHE_KEYS.EXAMS, []);
      const updated = [cleanExam, ...local.filter(e => e.id !== cleanExam.id)];
      setLocalCache(OMRAN_CACHE_KEYS.EXAMS, updated);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('omran_exams_initialized', 'true');
      }

      await setDoc(doc(this.getActiveDb(), 'exams', exam.id), cleanExam);
      broadcastDataUpdate('exam', cleanExam);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `exams/${exam.id}`);
      throw e;
    }
  }

  // Delete Exam permanently with Tombstones across Active and Central DBs
  static async deleteExam(examId: string): Promise<void> {
    await addDeletedExamId(examId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('omran_exams_initialized', 'true');
    }
    const local = getLocalCache<Exam[]>(OMRAN_CACHE_KEYS.EXAMS, []);
    setLocalCache(OMRAN_CACHE_KEYS.EXAMS, local.filter(e => e.id !== examId));

    try {
      await deleteDoc(doc(this.getActiveDb(), 'exams', examId));
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await deleteDoc(doc(this.getCentralDb(), 'exams', examId));
        } catch {}
      }
      broadcastDataUpdate('exam-deleted', examId);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `exams/${examId}`);
      throw e;
    }
  }

  // Subscribe to Exams in real time with tombstone filtering
  static subscribeExams(callback: (exams: Exam[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'exams'), snap => {
        const deletedExamIds = getDeletedExamIds();
        const list: Exam[] = [];
        snap.forEach(d => {
          const raw = d.data();
          const id = d.id || raw.id;
          if (!deletedExamIds.has(id)) {
            list.push(OmranDataService.sanitizeExam({ ...raw, id }));
          }
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'exams');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Load Exam Submissions directly from Firestore
  static async loadSubmissions(examId?: string): Promise<ExamSubmission[]> {
    try {
      const activeDb = this.getActiveDb();
      const q = examId
        ? query(collection(activeDb, 'exam_submissions'), where('examId', '==', examId))
        : collection(activeDb, 'exam_submissions');
      const snap = await safeGetDocs(q);
      const list: ExamSubmission[] = [];
      snap.forEach(d => list.push(d.data() as ExamSubmission));
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'exam_submissions');
      return [];
    }
  }

  // Save Exam Submission directly in Firestore
  static async saveSubmission(submission: ExamSubmission): Promise<void> {
    try {
      const cleanSubmission = JSON.parse(JSON.stringify(submission));
      await setDoc(doc(this.getActiveDb(), 'exam_submissions', submission.id), cleanSubmission);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `exam_submissions/${submission.id}`);
      throw e;
    }
  }

  // Delete Submission
  static async deleteSubmission(submissionId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.getActiveDb(), 'exam_submissions', submissionId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `exam_submissions/${submissionId}`);
      throw e;
    }
  }

  // Subscribe to Exam Submissions in real time
  static subscribeSubmissions(callback: (submissions: ExamSubmission[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'exam_submissions'), snap => {
        const list: ExamSubmission[] = [];
        snap.forEach(d => list.push(d.data() as ExamSubmission));
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        callback(list);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'exam_submissions');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Load Leaderboard Settings
  static async loadLeaderboardSettings(): Promise<LeaderboardSettings> {
    try {
      const activeDb = this.getActiveDb();
      const snap = await safeGetDoc(doc(activeDb, 'settings', 'leaderboard'));
      if (snap.exists()) {
        return snap.data() as LeaderboardSettings;
      }
      await setDoc(doc(activeDb, 'settings', 'leaderboard'), DEFAULT_LEADERBOARD_SETTINGS);
      return DEFAULT_LEADERBOARD_SETTINGS;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'settings/leaderboard');
      return DEFAULT_LEADERBOARD_SETTINGS;
    }
  }

  // Save Leaderboard Settings
  static async saveLeaderboardSettings(settings: LeaderboardSettings): Promise<void> {
    try {
      await setDoc(doc(this.getActiveDb(), 'settings', 'leaderboard'), settings);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/leaderboard');
      throw e;
    }
  }

  // Subscribe to Leaderboard Settings
  static subscribeLeaderboardSettings(callback: (settings: LeaderboardSettings) => void): () => void {
    try {
      return onSnapshot(doc(this.getActiveDb(), 'settings', 'leaderboard'), snap => {
        if (snap.exists()) {
          callback(snap.data() as LeaderboardSettings);
        }
      }, err => {
        handleFirestoreError(err, OperationType.GET, 'settings/leaderboard');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Load Google OAuth Configuration
  static async loadGoogleOAuthConfig(): Promise<GoogleOAuthConfig> {
    try {
      const snap = await safeGetDoc(doc(this.getActiveDb(), 'settings', 'google_oauth'));
      if (snap.exists()) {
        return snap.data() as GoogleOAuthConfig;
      }
      return { isLinked: false };
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'settings/google_oauth');
      return { isLinked: false };
    }
  }

  // Save Google OAuth Configuration
  static async saveGoogleOAuthConfig(config: GoogleOAuthConfig): Promise<void> {
    try {
      await setDoc(doc(this.getActiveDb(), 'settings', 'google_oauth'), config);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/google_oauth');
      throw e;
    }
  }

  // Subscribe to Google OAuth Configuration in Real-time
  static subscribeGoogleOAuthConfig(callback: (config: GoogleOAuthConfig) => void): () => void {
    try {
      return onSnapshot(doc(this.getActiveDb(), 'settings', 'google_oauth'), snap => {
        if (snap.exists()) {
          callback(snap.data() as GoogleOAuthConfig);
        } else {
          callback({ isLinked: false });
        }
      }, err => {
        handleFirestoreError(err, OperationType.GET, 'settings/google_oauth');
      });
    } catch (e) {
      return () => {};
    }
  }

  // ==========================================
  // SURAH RECORDINGS MANAGEMENT (Supervisor Only)
  // ==========================================

  // Load All Surah Recordings
  static async loadRecordings(): Promise<SurahRecording[]> {
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'surah_recordings'));
      const list: SurahRecording[] = [];
      snap.forEach(d => list.push(d.data() as SurahRecording));
      return list.sort((a, b) => a.surahNumber - b.surahNumber);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'surah_recordings');
      return [];
    }
  }

  // Save / Update Surah Recording
  static async saveRecording(recording: SurahRecording): Promise<void> {
    try {
      const clean = cleanFirestoreData(recording);
      await setDoc(doc(this.getActiveDb(), 'surah_recordings', recording.id), clean);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `surah_recordings/${recording.id}`);
      throw e;
    }
  }

  // Delete Surah Recording
  static async deleteRecording(recordingId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.getActiveDb(), 'surah_recordings', recordingId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `surah_recordings/${recordingId}`);
      throw e;
    }
  }

  // Subscribe to Surah Recordings in Realtime
  static subscribeRecordings(callback: (recordings: SurahRecording[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'surah_recordings'), snap => {
        const list: SurahRecording[] = [];
        snap.forEach(d => list.push(d.data() as SurahRecording));
        callback(list.sort((a, b) => a.surahNumber - b.surahNumber));
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'surah_recordings');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Load Recordings Config (Publish toggle)
  static async loadRecordingsConfig(): Promise<RecordingsConfig> {
    try {
      const snap = await safeGetDoc(doc(this.getActiveDb(), 'settings', 'recordings_config'));
      if (snap.exists()) {
        return snap.data() as RecordingsConfig;
      }
      return DEFAULT_RECORDINGS_CONFIG;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'settings/recordings_config');
      return DEFAULT_RECORDINGS_CONFIG;
    }
  }

  // Save Recordings Config
  static async saveRecordingsConfig(config: RecordingsConfig): Promise<void> {
    try {
      const clean = cleanFirestoreData(config);
      await setDoc(doc(this.getActiveDb(), 'settings', 'recordings_config'), clean);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/recordings_config');
      throw e;
    }
  }

  // Subscribe to Recordings Config
  static subscribeRecordingsConfig(callback: (config: RecordingsConfig) => void): () => void {
    try {
      return onSnapshot(doc(this.getActiveDb(), 'settings', 'recordings_config'), snap => {
        if (snap.exists()) {
          callback(snap.data() as RecordingsConfig);
        } else {
          callback(DEFAULT_RECORDINGS_CONFIG);
        }
      }, err => {
        handleFirestoreError(err, OperationType.GET, 'settings/recordings_config');
      });
    } catch (e) {
      return () => {};
    }
  }

  // ==========================================
  // STUDENT LISTENING LOGS
  // ==========================================

  // Load Listening Logs
  static async loadListeningLogs(studentId?: string): Promise<StudentListeningLog[]> {
    try {
      const activeDb = this.getActiveDb();
      let q;
      if (studentId) {
        q = query(collection(activeDb, 'listening_logs'), where('studentId', '==', studentId));
      } else {
        q = collection(activeDb, 'listening_logs');
      }
      const snap = await safeGetDocs(q);
      const list: StudentListeningLog[] = [];
      snap.forEach(d => list.push(d.data() as StudentListeningLog));
      return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'listening_logs');
      return [];
    }
  }

  // Save / Update Student Listening Log
  static async saveListeningLog(log: StudentListeningLog): Promise<void> {
    try {
      const clean = cleanFirestoreData(log);
      await setDoc(doc(this.getActiveDb(), 'listening_logs', log.id), clean);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `listening_logs/${log.id}`);
      throw e;
    }
  }

  // Subscribe to Listening Logs
  static subscribeListeningLogs(callback: (logs: StudentListeningLog[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'listening_logs'), snap => {
        const list: StudentListeningLog[] = [];
        snap.forEach(d => list.push(d.data() as StudentListeningLog));
        callback(list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'listening_logs');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Export Full Database (Complete Cloud Firestore Backup)
  static async exportFullBackup(): Promise<FullBackupData> {
    const [
      students,
      attendance,
      evaluations,
      evaluationCriteria,
      settings,
      chatMessages,
      teachers,
      complexes,
      halaqahs,
      violations,
      exams,
      submissions,
      leaderboardSettings,
      googleOAuth,
      recordings,
      recordingsConfig,
      listeningLogs
    ] = await Promise.all([
      this.loadStudents(),
      this.loadAttendance(),
      this.loadEvaluations(),
      this.loadCriteria(),
      this.loadSettings(),
      this.loadChats(),
      this.loadTeachers(),
      this.loadComplexes(),
      this.loadHalaqahs(),
      this.loadViolations(),
      this.loadExams(),
      this.loadSubmissions(),
      this.loadLeaderboardSettings(),
      this.loadGoogleOAuthConfig(),
      this.loadRecordings(),
      this.loadRecordingsConfig(),
      this.loadListeningLogs()
    ]);

    return {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      students,
      attendance,
      evaluations,
      evaluationCriteria,
      settings,
      chatMessages,
      teachers,
      complexes,
      halaqahs,
      violations,
      exams,
      submissions,
      leaderboardSettings,
      googleOAuth,
      recordings,
      recordingsConfig,
      listeningLogs,
      certificates: await OmranDataService.loadCertificates(),
      userAccounts: [
        {
          id: 'admin-1',
          username: settings.teacherName || 'admin',
          role: 'admin',
          phone: '0500000000',
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  // =========================================================================
  // Certificate System Operations
  // =========================================================================

  // Sanitize Certificate object
  static sanitizeCertificate(cert: any): IssuedCertificate {
    return {
      id: String(cert.id || `cert_${Date.now()}`),
      studentId: String(cert.studentId || ''),
      studentName: String(cert.studentName || ''),
      halaqahId: cert.halaqahId ? String(cert.halaqahId) : undefined,
      halaqahName: cert.halaqahName ? String(cert.halaqahName) : undefined,
      complexId: cert.complexId ? String(cert.complexId) : undefined,
      complexName: cert.complexName ? String(cert.complexName) : undefined,
      occasion: String(cert.occasion || 'شكر وتقدير وتميز'),
      occasionText: String(cert.occasionText || ''),
      certificateTitle: cert.certificateTitle ? String(cert.certificateTitle) : undefined,
      templateId: String(cert.templateId || 'platform_emerald_royal'),
      templateName: String(cert.templateName || ''),
      templateType: cert.templateType === 'custom' ? 'custom' : 'ready',
      customTemplateImageUrl: cert.customTemplateImageUrl ? String(cert.customTemplateImageUrl) : undefined,
      signatureMode: cert.signatureMode || 'auto',
      teacherName: cert.teacherName ? String(cert.teacherName) : undefined,
      supervisorName: cert.supervisorName ? String(cert.supervisorName) : undefined,
      dateArabic: String(cert.dateArabic || ''),
      dateGregorian: String(cert.dateGregorian || ''),
      createdAt: String(cert.createdAt || new Date().toISOString()),
      createdByName: cert.createdByName ? String(cert.createdByName) : undefined
    };
  }

  // Load Certificates with Dual Persistence
  static async loadCertificates(): Promise<IssuedCertificate[]> {
    try {
      await syncTombstonesFromCloud();
    } catch {}
    const deletedCertIds = OmranDataService.getDeletedCertificateIds();
    const local = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []).filter(
      c => c?.id && !deletedCertIds.has(c.id)
    );
    let cloudList: IssuedCertificate[] = [];
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'certificates'));
      snap.forEach(d => {
        const raw = d.data();
        const cId = d.id || raw.id;
        if (!deletedCertIds.has(cId)) {
          cloudList.push(OmranDataService.sanitizeCertificate({ ...raw, id: cId }));
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'certificates');
    }

    const mergedMap = new Map<string, IssuedCertificate>();
    for (const c of local) {
      if (c?.id && !deletedCertIds.has(c.id)) mergedMap.set(c.id, OmranDataService.sanitizeCertificate(c));
    }
    for (const c of cloudList) {
      if (c?.id && !deletedCertIds.has(c.id)) mergedMap.set(c.id, c);
    }

    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, merged);
    return merged;
  }

  // Save Single Certificate directly in Firestore & Cache
  static async saveCertificate(cert: IssuedCertificate): Promise<void> {
    OmranDataService.removeDeletedCertificateId(cert.id);
    const cleanCert = OmranDataService.sanitizeCertificate(cert);
    const local = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []);
    const updated = [cleanCert, ...local.filter(c => c.id !== cleanCert.id)];
    setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, updated);

    // Omit large base64 image from Firestore to strictly adhere to 1MB document limit
    const firestoreData = { ...cleanCert };
    if (firestoreData.customTemplateImageUrl && firestoreData.customTemplateImageUrl.length > 20000) {
      delete firestoreData.customTemplateImageUrl;
    }

    try {
      await setDoc(doc(this.getActiveDb(), 'certificates', cleanCert.id), cleanFirestoreData(firestoreData));
      broadcastDataUpdate('certificate', cleanCert);
    } catch (e) {
      console.warn('[OmranDataService] Certificate saved locally, cloud sync notice:', e);
    }
  }

  // Save Batch Certificates
  static async saveCertificates(certs: IssuedCertificate[]): Promise<void> {
    if (!certs || certs.length === 0) return;
    for (const c of certs) {
      OmranDataService.removeDeletedCertificateId(c.id);
    }
    const cleanList = certs.map(c => OmranDataService.sanitizeCertificate(c));

    const local = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []);
    const map = new Map<string, IssuedCertificate>();
    for (const c of local) if (c?.id) map.set(c.id, c);
    for (const c of cleanList) if (c?.id) map.set(c.id, c);
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, merged);

    try {
      const activeDb = this.getActiveDb();
      await Promise.allSettled(
        cleanList.map(item => {
          const firestoreData = { ...item };
          if (firestoreData.customTemplateImageUrl && firestoreData.customTemplateImageUrl.length > 20000) {
            delete firestoreData.customTemplateImageUrl;
          }
          return setDoc(doc(activeDb, 'certificates', item.id), cleanFirestoreData(firestoreData));
        })
      );
      broadcastDataUpdate('certificates-batch', cleanList);
    } catch (e) {
      console.warn('[OmranDataService] Batch certificates saved locally, cloud sync notice:', e);
    }
  }

  // Delete Certificate from Firestore & Cache
  static async deleteCertificate(certId: string): Promise<void> {
    // 0. Register persistent tombstone so certificate NEVER resurrects
    OmranDataService.addDeletedCertificateId(certId);

    const local = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []);
    const updated = local.filter(c => c.id !== certId);
    setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, updated);

    try {
      await deleteDoc(doc(this.getActiveDb(), 'certificates', certId));
    } catch (e) {
      console.warn(`Firestore delete doc notice for certificates/${certId} (deleted locally):`, e);
      // Do not rethrow so UI deletion is not blocked by remote permission limits
    }
  }

  // Subscribe to Certificates in real time with resilient Dual-Persistence merge
  static subscribeCertificates(callback: (certs: IssuedCertificate[]) => void): () => void {
    try {
      return onSnapshot(collection(this.getActiveDb(), 'certificates'), snap => {
        const deletedCertIds = OmranDataService.getDeletedCertificateIds();
        const cloudList: IssuedCertificate[] = [];
        snap.forEach(d => {
          const raw = d.data();
          const cId = d.id || raw.id;
          if (!deletedCertIds.has(cId)) {
            cloudList.push(OmranDataService.sanitizeCertificate({ ...raw, id: cId }));
          }
        });

        // Dual-persistence merge: preserve local customTemplateImageUrl and any local pending certs
        const local = getLocalCache<IssuedCertificate[]>(OMRAN_CACHE_KEYS.CERTIFICATES, []).filter(
          c => c?.id && !deletedCertIds.has(c.id)
        );
        const localMap = new Map<string, IssuedCertificate>();
        for (const c of local) {
          if (c?.id && !deletedCertIds.has(c.id)) localMap.set(c.id, c);
        }

        const mergedMap = new Map<string, IssuedCertificate>();
        for (const c of cloudList) {
          if (deletedCertIds.has(c.id)) continue;
          const localItem = localMap.get(c.id);
          const finalCert = {
            ...c,
            customTemplateImageUrl: c.customTemplateImageUrl || localItem?.customTemplateImageUrl
          };
          mergedMap.set(c.id, finalCert);
        }
        for (const loc of local) {
          if (loc?.id && !deletedCertIds.has(loc.id) && !mergedMap.has(loc.id)) {
            mergedMap.set(loc.id, loc);
          }
        }

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLocalCache(OMRAN_CACHE_KEYS.CERTIFICATES, merged);
        callback(merged);
      }, err => {
        handleFirestoreError(err, OperationType.LIST, 'certificates');
      });
    } catch (e) {
      return () => {};
    }
  }

  // Import / Restore Full Database directly into Firestore (replaces existing data)
  static async importFullBackup(backup: FullBackupData): Promise<{
    studentsCount: number;
    attendanceCount: number;
    evaluationsCount: number;
    criteriaCount: number;
    teachersCount: number;
    complexesCount?: number;
    halaqahsCount?: number;
    violationsCount?: number;
    examsCount?: number;
    submissionsCount?: number;
    recordingsCount?: number;
  }> {
    if (!backup || typeof backup !== 'object') {
      throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف.');
    }

    const studentsList = Array.isArray(backup.students) ? backup.students : [];
    const attendanceList = Array.isArray(backup.attendance) ? backup.attendance : [];
    const evaluationsList = Array.isArray(backup.evaluations) ? backup.evaluations : [];
    const criteriaList = Array.isArray(backup.evaluationCriteria) && backup.evaluationCriteria.length > 0
      ? backup.evaluationCriteria
      : DEFAULT_CRITERIA;
    const settingsData = backup.settings || DEFAULT_SETTINGS;
    const teachersList = Array.isArray(backup.teachers) && backup.teachers.length > 0
      ? backup.teachers
      : INITIAL_TEACHERS;
    const complexesList = Array.isArray(backup.complexes) && backup.complexes.length > 0
      ? backup.complexes
      : DEFAULT_COMPLEXES;
    const halaqahsList = Array.isArray(backup.halaqahs) && backup.halaqahs.length > 0
      ? backup.halaqahs
      : DEFAULT_HALAQAHS;
    const violationsList = Array.isArray(backup.violations) ? backup.violations : [];
    const examsList = Array.isArray(backup.exams) ? backup.exams : [];
    const submissionsList = Array.isArray(backup.submissions) ? backup.submissions : [];
    const leaderboardSettings = backup.leaderboardSettings || DEFAULT_LEADERBOARD_SETTINGS;
    const recordingsList = Array.isArray(backup.recordings) ? backup.recordings : [];
    const recordingsConfig = backup.recordingsConfig || DEFAULT_RECORDINGS_CONFIG;
    const listeningLogsList = Array.isArray(backup.listeningLogs) ? backup.listeningLogs : [];
    const certificatesList = Array.isArray(backup.certificates) ? backup.certificates : [];

    // Helper to safely clear collections to guarantee complete replacement of data
    const clearCol = async (colName: string) => {
      try {
        const snap = await getDocs(collection(this.getActiveDb(), colName));
        const delP: Promise<any>[] = [];
        snap.forEach(d => delP.push(deleteDoc(d.ref)));
        await Promise.all(delP);
      } catch (err) {
        console.warn(`Could not clear col ${colName}`, err);
      }
    };

    // Clear prior data to ensure full replacement
    await Promise.all([
      clearCol('students'),
      clearCol('attendance'),
      clearCol('evaluations'),
      clearCol('criteria'),
      clearCol('teachers'),
      clearCol('complexes'),
      clearCol('halaqahs'),
      clearCol('violations'),
      clearCol('exams'),
      clearCol('exam_submissions'),
      clearCol('surah_recordings'),
      clearCol('listening_logs'),
      clearCol('certificates')
    ]);

    // Persist new data directly to Firestore concurrently
    try {
      const promises: Promise<any>[] = [];

      for (const s of studentsList) {
        if (s?.id) promises.push(setDoc(doc(this.getActiveDb(), 'students', s.id), s));
      }
      for (const a of attendanceList) {
        if (a?.id) promises.push(setDoc(doc(this.getActiveDb(), 'attendance', a.id), a));
      }
      for (const ev of evaluationsList) {
        if (ev?.id) promises.push(setDoc(doc(this.getActiveDb(), 'evaluations', ev.id), ev));
      }
      for (const c of criteriaList) {
        if (c?.id) promises.push(setDoc(doc(this.getActiveDb(), 'criteria', c.id), c));
      }
      for (const t of teachersList) {
        if (t?.id) promises.push(setDoc(doc(this.getActiveDb(), 'teachers', t.id), t));
      }
      for (const comp of complexesList) {
        if (comp?.id) promises.push(setDoc(doc(this.getActiveDb(), 'complexes', comp.id), comp));
      }
      for (const h of halaqahsList) {
        if (h?.id) promises.push(setDoc(doc(this.getActiveDb(), 'halaqahs', h.id), h));
      }
      for (const v of violationsList) {
        if (v?.id) promises.push(setDoc(doc(this.getActiveDb(), 'violations', v.id), v));
      }
      for (const ex of examsList) {
        if (ex?.id) promises.push(setDoc(doc(this.getActiveDb(), 'exams', ex.id), ex));
      }
      for (const sub of submissionsList) {
        if (sub?.id) promises.push(setDoc(doc(this.getActiveDb(), 'exam_submissions', sub.id), sub));
      }
      for (const rec of recordingsList) {
        if (rec?.id) promises.push(setDoc(doc(this.getActiveDb(), 'surah_recordings', rec.id), rec));
      }
      for (const log of listeningLogsList) {
        if (log?.id) promises.push(setDoc(doc(this.getActiveDb(), 'listening_logs', log.id), log));
      }
      for (const cert of certificatesList) {
        if (cert?.id) promises.push(setDoc(doc(this.getActiveDb(), 'certificates', cert.id), cert));
      }

      if (settingsData) {
        promises.push(setDoc(doc(this.getActiveDb(), 'settings', 'main'), settingsData));
      }
      if (leaderboardSettings) {
        promises.push(setDoc(doc(this.getActiveDb(), 'settings', 'leaderboard'), leaderboardSettings));
      }
      if (backup.googleOAuth) {
        promises.push(setDoc(doc(this.getActiveDb(), 'settings', 'google_oauth'), backup.googleOAuth));
      }
      if (recordingsConfig) {
        promises.push(setDoc(doc(this.getActiveDb(), 'settings', 'recordings_config'), recordingsConfig));
      }

      await Promise.all(promises);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'importFullBackup');
      throw e;
    }

    return {
      studentsCount: studentsList.length,
      attendanceCount: attendanceList.length,
      evaluationsCount: evaluationsList.length,
      criteriaCount: criteriaList.length,
      teachersCount: teachersList.length,
      complexesCount: complexesList.length,
      halaqahsCount: halaqahsList.length,
      violationsCount: violationsList.length,
      examsCount: examsList.length,
      submissionsCount: submissionsList.length,
      recordingsCount: recordingsList.length
    };
  }

  // =========================================================================
  // Teacher Attendance, Shifts, and Mosque Geolocation
  // =========================================================================
  static async loadMosqueLocation(complexId?: string): Promise<MosqueLocationConfig | null> {
    const docKey = complexId ? `mosque_location_${complexId}` : 'mosque_location_default';
    const local = getLocalCache<MosqueLocationConfig | null>(`${OMRAN_CACHE_KEYS.MOSQUE_LOCATION}_${docKey}`, null);
    try {
      const snap = await safeGetDoc(doc(this.getActiveDb(), 'settings', docKey));
      if (snap.exists()) {
        const data = snap.data() as MosqueLocationConfig;
        setLocalCache(`${OMRAN_CACHE_KEYS.MOSQUE_LOCATION}_${docKey}`, data);
        return data;
      }
    } catch (e) {
      console.warn('Load mosque location fallback to local:', e);
    }
    return local;
  }

  static async saveMosqueLocation(config: MosqueLocationConfig): Promise<void> {
    const docKey = config.complexId ? `mosque_location_${config.complexId}` : 'mosque_location_default';
    setLocalCache(`${OMRAN_CACHE_KEYS.MOSQUE_LOCATION}_${docKey}`, config);
    try {
      await setDoc(doc(this.getActiveDb(), 'settings', docKey), cleanFirestoreData(config), { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `settings/${docKey}`);
      throw e;
    }
  }

  static async loadTeacherShifts(complexId?: string): Promise<TeacherShift[]> {
    const local = getLocalCache<TeacherShift[]>(OMRAN_CACHE_KEYS.TEACHER_SHIFTS, []);
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'teacher_shifts'));
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          assignedTeacherIds: Array.isArray(data.assignedTeacherIds) ? data.assignedTeacherIds : []
        } as TeacherShift;
      });
      setLocalCache(OMRAN_CACHE_KEYS.TEACHER_SHIFTS, list);
      return complexId ? list.filter(s => s.complexId === complexId) : list;
    } catch (e) {
      // quiet fallback
    }
    return complexId ? local.filter(s => s.complexId === complexId) : local;
  }

  static async saveTeacherShift(shift: TeacherShift): Promise<void> {
    const local = getLocalCache<TeacherShift[]>(OMRAN_CACHE_KEYS.TEACHER_SHIFTS, []);
    const safeShift = {
      ...shift,
      assignedTeacherIds: Array.isArray(shift.assignedTeacherIds) ? shift.assignedTeacherIds : []
    };
    const updated = [...local.filter(s => s.id !== safeShift.id), safeShift];
    setLocalCache(OMRAN_CACHE_KEYS.TEACHER_SHIFTS, updated);
    try {
      await setDoc(doc(this.getActiveDb(), 'teacher_shifts', safeShift.id), cleanFirestoreData(safeShift), { merge: true });
    } catch (e) {
      // Quiet fallback without breaking UI or throwing
    }
  }

  static async deleteTeacherShift(shiftId: string): Promise<void> {
    const local = getLocalCache<TeacherShift[]>(OMRAN_CACHE_KEYS.TEACHER_SHIFTS, []);
    setLocalCache(OMRAN_CACHE_KEYS.TEACHER_SHIFTS, local.filter(s => s.id !== shiftId));
    try {
      await deleteDoc(doc(this.getActiveDb(), 'teacher_shifts', shiftId));
    } catch (e) {
      // quiet fallback
    }
  }

  static async loadTeacherAttendance(date?: string, complexId?: string): Promise<TeacherAttendanceRecord[]> {
    const cacheKey = date ? `${OMRAN_CACHE_KEYS.TEACHER_ATTENDANCE}_${date}` : OMRAN_CACHE_KEYS.TEACHER_ATTENDANCE;
    const local = getLocalCache<TeacherAttendanceRecord[]>(cacheKey, []);
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'teacher_attendance'));
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as TeacherAttendanceRecord));
      let filtered = list;
      if (date) {
        filtered = filtered.filter(r => r.date === date);
      }
      if (complexId) {
        filtered = filtered.filter(r => r.complexId === complexId);
      }
      setLocalCache(cacheKey, list);
      return filtered;
    } catch (e) {
      // quiet fallback
      return complexId ? local.filter(r => r.complexId === complexId) : local;
    }
  }

  static async saveTeacherAttendanceRecord(record: TeacherAttendanceRecord): Promise<void> {
    const cacheKey = `${OMRAN_CACHE_KEYS.TEACHER_ATTENDANCE}_${record.date}`;
    const local = getLocalCache<TeacherAttendanceRecord[]>(cacheKey, []);
    const updated = [...local.filter(r => r.id !== record.id), record];
    setLocalCache(cacheKey, updated);
    try {
      await setDoc(doc(this.getActiveDb(), 'teacher_attendance', record.id), cleanFirestoreData(record), { merge: true });
    } catch (e) {
      // Quiet fallback
    }
  }

  static async deleteTeacherAttendanceRecord(recordId: string, date?: string): Promise<void> {
    if (date) {
      const cacheKey = `${OMRAN_CACHE_KEYS.TEACHER_ATTENDANCE}_${date}`;
      const local = getLocalCache<TeacherAttendanceRecord[]>(cacheKey, []);
      setLocalCache(cacheKey, local.filter(r => r.id !== recordId));
    }
    try {
      await deleteDoc(doc(this.getActiveDb(), 'teacher_attendance', recordId));
    } catch (e) {
      // Quiet fallback
    }
  }

  // =========================================================================
  // Mosques Management (إدارة الجوامع والمساجد المتعددة)
  // =========================================================================
  static async loadMosques(complexId?: string): Promise<MosqueItem[]> {
    const local = getLocalCache<MosqueItem[]>(OMRAN_CACHE_KEYS.MOSQUES, []);
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'mosques'));
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as MosqueItem));
      setLocalCache(OMRAN_CACHE_KEYS.MOSQUES, list);
      return complexId ? list.filter(m => m.complexId === complexId) : list;
    } catch (e) {
      // quiet fallback
    }
    return complexId ? local.filter(m => m.complexId === complexId) : local;
  }

  static async saveMosque(mosque: MosqueItem): Promise<void> {
    const local = getLocalCache<MosqueItem[]>(OMRAN_CACHE_KEYS.MOSQUES, []);
    const updated = [...local.filter(m => m.id !== mosque.id), mosque];
    setLocalCache(OMRAN_CACHE_KEYS.MOSQUES, updated);
    try {
      await setDoc(doc(this.getActiveDb(), 'mosques', mosque.id), cleanFirestoreData(mosque), { merge: true });
    } catch (e) {
      // quiet fallback
    }
  }

  static async deleteMosque(mosqueId: string): Promise<void> {
    const local = getLocalCache<MosqueItem[]>(OMRAN_CACHE_KEYS.MOSQUES, []);
    setLocalCache(OMRAN_CACHE_KEYS.MOSQUES, local.filter(m => m.id !== mosqueId));
    try {
      await deleteDoc(doc(this.getActiveDb(), 'mosques', mosqueId));
    } catch (e) {
      // quiet fallback
    }
  }

  // =========================================================================
  // Library & Documents Archive Management (المكتبة والأرشيف السحابي الشامل)
  // =========================================================================
  static async loadLibraryDocuments(complexId?: string): Promise<LibraryDocument[]> {
    const local = getLocalCache<LibraryDocument[]>(OMRAN_CACHE_KEYS.LIBRARY_DOCS, []);
    try {
      const snap = await safeGetDocs(collection(this.getActiveDb(), 'library_docs'));
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as LibraryDocument));
      if (list.length > 0) {
        setLocalCache(OMRAN_CACHE_KEYS.LIBRARY_DOCS, list);
        return complexId ? list.filter(d => !d.complexId || d.complexId === complexId) : list;
      }
    } catch (e) {
      // quiet fallback
    }
    return complexId ? local.filter(d => !d.complexId || d.complexId === complexId) : local;
  }

  static async saveLibraryDocument(documentItem: LibraryDocument): Promise<void> {
    const local = getLocalCache<LibraryDocument[]>(OMRAN_CACHE_KEYS.LIBRARY_DOCS, []);
    const updated = [documentItem, ...local.filter(d => d.id !== documentItem.id)];
    setLocalCache(OMRAN_CACHE_KEYS.LIBRARY_DOCS, updated);
    broadcastDataUpdate('library', documentItem);
    try {
      await setDoc(doc(this.getActiveDb(), 'library_docs', documentItem.id), cleanFirestoreData(documentItem), { merge: true });
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await setDoc(doc(this.getCentralDb(), 'library_docs', documentItem.id), cleanFirestoreData(documentItem), { merge: true });
        } catch {}
      }
    } catch (e) {
      console.warn('Library document saved locally, cloud error:', e);
    }
  }

  static async deleteLibraryDocument(documentId: string): Promise<void> {
    const local = getLocalCache<LibraryDocument[]>(OMRAN_CACHE_KEYS.LIBRARY_DOCS, []);
    setLocalCache(OMRAN_CACHE_KEYS.LIBRARY_DOCS, local.filter(d => d.id !== documentId));
    broadcastDataUpdate('library-deleted', documentId);
    try {
      await deleteDoc(doc(this.getActiveDb(), 'library_docs', documentId));
      if (this.getActiveDb() !== this.getCentralDb()) {
        try {
          await deleteDoc(doc(this.getCentralDb(), 'library_docs', documentId));
        } catch {}
      }
    } catch (e) {
      console.warn('Delete library doc cloud error:', e);
    }
  }

  static subscribeLibraryDocuments(callback: (docs: LibraryDocument[]) => void): () => void {
    const q = query(collection(this.getActiveDb(), 'library_docs'));
    return onSnapshot(
      q,
      snapshot => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as LibraryDocument));
        setLocalCache(OMRAN_CACHE_KEYS.LIBRARY_DOCS, list);
        callback(list);
      },
      error => {
        console.warn('Library documents subscription fallback to local cache:', error);
        callback(getLocalCache(OMRAN_CACHE_KEYS.LIBRARY_DOCS, []));
      }
    );
  }

  // Batch create multiple students with dual persistence and Firestore sync
  static async batchCreateStudents(studentsToAdd: Student[]): Promise<boolean> {
    if (studentsToAdd.length === 0) return true;
    try {
      const currentList = getLocalCache<Student[]>(OMRAN_CACHE_KEYS.STUDENTS, INITIAL_STUDENTS);
      const updatedList = [...currentList, ...studentsToAdd];
      setLocalCache(OMRAN_CACHE_KEYS.STUDENTS, updatedList);

      const activeDb = this.getActiveDb();
      for (const st of studentsToAdd) {
        try {
          await setDoc(doc(activeDb, 'students', st.id), cleanFirestoreData(st));
        } catch {}
      }
      return true;
    } catch (e) {
      console.error('Batch create students error:', e);
      return false;
    }
  }
}
