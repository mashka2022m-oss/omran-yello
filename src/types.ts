export type UserRole = 'admin' | 'student';

export interface ComplexThemeConfig {
  primaryColor: string; // اللون الأساسي (e.g. #022c22)
  secondaryColor: string; // اللون الثانوي (e.g. #064e3b)
  accentColor: string; // لون التمييز والذهب (e.g. #fbbf24)
  backgroundColor: string; // لون الخلفية الرئيسي (e.g. #022c22)
  surfaceColor?: string; // لون بطاقات ولوحات المحتوى
  cardColor?: string;
  textColor?: string; // لون النصوص الأساسية
}

export interface QuranComplex {
  id: string;
  name: string; // e.g. "مجمع النور القرآني"
  description?: string;
  supervisorTeacherId?: string; // ID of the supervisor teacher assigned to this complex
  supervisorTeacherName?: string; // Display name of supervisor teacher
  logoUrl?: string; // شعار المجمع (صورة لا تتجاوز 5 ميجا) - أيقونة التبويب وشعار المنصة
  stampUrl?: string; // ختم المجمع (صورة لا تتجاوز 5 ميجا) - ختم الشهادات والتقارير الرسمية
  theme?: ComplexThemeConfig; // ألوان وهوية وثيم المنصة الخاصة بالمجمع
  createdAt: string;
  updatedAt?: string;
  databaseConfig?: {
    isCustom?: boolean;
    isIsolated?: boolean;
    projectId?: string;
    apiKey?: string;
    authDomain?: string;
    storageBucket?: string;
    appId?: string;
    enabledAt?: string;
    connectedEmail?: string;
    databaseId?: string;
    migratedAt?: string;
    migrationStats?: {
      studentsCount: number;
      halaqahsCount: number;
      attendanceCount: number;
      evaluationsCount: number;
      examsCount: number;
      violationsCount: number;
      certificatesCount: number;
      totalRecords: number;
    };
  };
  // Independent Firebase database config if separated
  customFirebaseConfig?: {
    isEnabled: boolean;
    projectId: string;
    apiKey: string;
    firestoreDatabaseId?: string;
    storageBucket?: string;
    authDomain?: string;
    connectedAt?: string;
  };
}

export interface Halaqah {
  id: string;
  name: string; // e.g. "حلقة القرآن الكريم"
  description?: string;
  complexId?: string; // ID of the complex this halaqah belongs to
  complexName?: string; // Cached display name of the complex
  primaryTeacherId?: string; // ID of the primary teacher
  primaryTeacherName?: string;
  teacherIds?: string[]; // Teacher IDs linked to this halaqah
  teacherNames?: string[]; // Cached teacher names
  createdAt: string;
  isDefault?: boolean;
}

export interface TeacherAccount {
  id: string;
  name: string; // e.g. "المشرف العام", "الشيخ عبد الله بن فهد"
  username: string; // username used to log in
  password?: string; // password used to log in
  phone: string; // teacher's phone number
  teacherCode?: string; // رمز فريد مكون من ٦ أرقام لإلحاق المعلم بالحلقات والمجمعات بسهولة
  title?: string; // e.g. "مشرف ومطور المنظومة", "المعلم المشرف", "معلم ومحفظ"
  isPrimary?: boolean;
  role?: 'teacher' | 'supervisor' | 'developer'; // رتبة المعلم: معلم عادي، مشرف، أو مبرمج ومطور
  complexId?: string; // Complex supervised by this teacher if applicable
  complexName?: string;
  supervisedComplexId?: string; // ID of the specific complex this teacher supervises if supervisor
  complexIds?: string[]; // All complexes this teacher is linked to
  complexNames?: string[]; // Display names of those complexes
  halaqahId?: string; // Legacy single halaqah id
  halaqahName?: string; // Legacy single halaqah name
  halaqahIds?: string[]; // All halaqahs this teacher teaches (supports multiple halaqahs)
  halaqahNames?: string[]; // Display names of those halaqahs
  googleEmail?: string | null; // بريد حساب Google المرتبط بالمعلم
  googleUid?: string | null; // معرف Google UID
  googleName?: string | null; // اسم الحساب في Google
  googlePhotoUrl?: string | null; // صورة الحساب في Google
  isGoogleLinked?: boolean; // هل حساب المعلم موثق ومربوط بـ Google للتسجيل السريع
  createdAt: string;
}

/**
 * Generate a unique 6-digit numeric teacher code (e.g. "849201")
 */
export const generateTeacherCode = (existingList?: (string | TeacherAccount)[]): string => {
  const existingSet = new Set<string>();
  if (existingList) {
    existingList.forEach(item => {
      if (typeof item === 'string') {
        existingSet.add(item.trim());
      } else if (item && item.teacherCode) {
        existingSet.add(item.teacherCode.trim());
      }
    });
  }

  let code = '';
  let attempts = 0;
  while (attempts < 1000) {
    const num = Math.floor(100000 + Math.random() * 900000);
    code = String(num);
    if (!existingSet.has(code)) {
      return code;
    }
    attempts++;
  }
  return String(Math.floor(100000 + Math.random() * 900000));
};

/**
 * Normalizes Arabic-Indic and Eastern Arabic-Indic digits to standard English ASCII digits.
 */
export const normalizeArabicDigits = (str?: string | null): string => {
  if (!str) return '';
  return String(str)
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .trim();
};

/**
 * Get or guarantee 6-digit teacher code from teacher object or ID hash
 */
export const getTeacherSixDigitCode = (teacher?: TeacherAccount | null): string => {
  if (!teacher) return '100001';
  const rawCode = normalizeArabicDigits(teacher.teacherCode);
  const clean = rawCode.replace(/\D/g, '');
  if (/^\d{6}$/.test(clean)) {
    return clean;
  }
  // Deterministic 6-digit code based on ID/username if not set
  let hash = 0;
  const str = `${teacher.id || ''}_${teacher.username || ''}_omran`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash) % 900000 + 100000;
  return String(code);
};

/**
 * Check if user or teacher has developer / system administrator privileges.
 */
export const isTeacherDeveloper = (
  teacher?: TeacherAccount | null,
  userObj?: { username?: string; role?: string } | null
): boolean => {
  if (teacher) {
    if (teacher.role === 'developer' || teacher.id === 'teacher-1') return true;
    const cleanUser = (teacher.username || '').trim().toLowerCase();
    const cleanName = (teacher.name || '').trim().toLowerCase();
    if (
      cleanUser === 'admin' ||
      cleanUser === 'developer' ||
      cleanUser === 'montaser' ||
      cleanUser.includes('منتصر') ||
      cleanName.includes('منتصر') ||
      cleanUser.includes('مبرمج') ||
      cleanName.includes('مبرمج') ||
      cleanUser.includes('مطور') ||
      cleanName.includes('مطور')
    ) {
      return true;
    }
  }
  if (userObj) {
    const cleanUser = (userObj.username || '').trim().toLowerCase();
    if (
      cleanUser === 'admin' ||
      cleanUser === 'developer' ||
      cleanUser === 'montaser' ||
      cleanUser.includes('منتصر') ||
      cleanUser.includes('مبرمج') ||
      cleanUser.includes('مطور') ||
      userObj.role === 'developer'
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Standard utility to determine if a teacher account has supervisor rank and permissions.
 * If explicitly marked as 'developer', they have all supervisor permissions + developer features.
 * If explicitly marked as 'supervisor', they supervise their assigned complex and halaqahs.
 * If explicitly marked as 'teacher', they are strictly a regular teacher (not supervisor).
 */
export const isTeacherSupervisor = (teacher?: TeacherAccount | null): boolean => {
  if (!teacher) return false;
  const cleanUser = (teacher.username || '').trim().toLowerCase();

  // Developer has full supervisor permissions
  if (teacher.role === 'developer') {
    return true;
  }

  // Admin user is supervisor and developer
  if (cleanUser === 'admin' || cleanUser === 'developer') {
    return true;
  }

  // Explicit teacher role = regular teacher (NOT supervisor)
  if (teacher.role === 'teacher') {
    return false;
  }

  // Explicit supervisor role
  if (teacher.role === 'supervisor') {
    return true;
  }

  // Legacy isPrimary fallback
  return Boolean(teacher.isPrimary);
};

/**
 * Normalizes text for resilient comparisons (trim, lowercasing, Arabic letter normalizations, diacritics/spacing tolerance).
 */
export const normalizeTeacherText = (text?: string | null): string => {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics
    .replace(/^(الشيخ|المعلم|أستاذ|الاستاذ|أ|د)\s+/g, '') // strip common honorific prefixes for resilient matching
    .replace(/\s+/g, ' ');
};

export const normalizeArabicText = normalizeTeacherText;

/**
 * Checks if two teacher references match (by ID, full name, username, or phone).
 */
export const isSameTeacher = (
  teacher?: { id?: string; name?: string; username?: string; phone?: string } | null,
  target?: { id?: string; name?: string; username?: string; phone?: string } | null
): boolean => {
  if (!teacher || !target) return false;
  if (teacher.id && target.id && teacher.id === target.id) return true;

  const tName = normalizeTeacherText(teacher.name);
  const targetName = normalizeTeacherText(target.name);
  if (tName && targetName && tName === targetName) return true;

  const tUser = normalizeTeacherText(teacher.username);
  const targetUser = normalizeTeacherText(target.username);
  if (tUser && targetUser && tUser === targetUser) return true;

  if (teacher.phone && target.phone && teacher.phone.trim().replace(/\D/g, '') === target.phone.trim().replace(/\D/g, '') && teacher.phone.trim().length >= 7) return true;

  return false;
};

/**
 * Resolves QuranComplexes for a teacher/user.
 * - Developer / Programmer: has access to ALL complexes and can freely navigate between them.
 * - Teacher / Supervisor: If assigned to multiple complexes (or halaqahs in different complexes),
 *   they can seamlessly switch between their assigned complexes and halaqahs.
 */
export const getTeacherAllComplexes = (
  teacher?: TeacherAccount | null,
  allTeachers: TeacherAccount[] = [],
  complexes: QuranComplex[] = [],
  halaqahs: Halaqah[] = [],
  isDev: boolean = false
): QuranComplex[] => {
  if (complexes.length === 0) return [];

  // ONLY Developer / Programmer has unrestricted access to all complexes
  if (isDev || isTeacherDeveloper(teacher)) {
    return complexes;
  }

  if (!teacher) {
    return [complexes[0]];
  }

  const matchedComplexIds = new Set<string>();

  // 1. Explicit multi-complex IDs array
  if (teacher.complexIds && Array.isArray(teacher.complexIds)) {
    teacher.complexIds.forEach(id => {
      if (id && complexes.some(c => c.id === id)) {
        matchedComplexIds.add(id);
      }
    });
  }

  // 1.5. Explicit multi-complex names array
  if (teacher.complexNames && Array.isArray(teacher.complexNames)) {
    teacher.complexNames.forEach(cName => {
      if (cName && typeof cName === 'string') {
        const norm = normalizeTeacherText(cName);
        const found = complexes.find(c => normalizeTeacherText(c.name) === norm);
        if (found) {
          matchedComplexIds.add(found.id);
        }
      }
    });
  }

  // 2. Direct primary complexId
  if (teacher.complexId && complexes.some(c => c.id === teacher.complexId)) {
    matchedComplexIds.add(teacher.complexId);
  }

  // 2.5 Direct primary complexName
  if (teacher.complexName && typeof teacher.complexName === 'string') {
    const norm = normalizeTeacherText(teacher.complexName);
    const found = complexes.find(c => normalizeTeacherText(c.name) === norm);
    if (found) {
      matchedComplexIds.add(found.id);
    }
  }

  // 3. Complexes where this teacher is assigned as supervisor (by ID or verified name)
  const teacherNameNorm = normalizeTeacherText(teacher.name);
  const teacherUserNorm = normalizeTeacherText(teacher.username);
  complexes.forEach(c => {
    if (c.supervisorTeacherId && c.supervisorTeacherId === teacher.id) {
      matchedComplexIds.add(c.id);
    } else if (
      c.supervisorTeacherName &&
      c.supervisorTeacherName.trim().length > 3 &&
      (normalizeTeacherText(c.supervisorTeacherName) === teacherNameNorm ||
       normalizeTeacherText(c.supervisorTeacherName) === teacherUserNorm)
    ) {
      matchedComplexIds.add(c.id);
    }
  });

  // 4. Complexes containing halaqahs assigned to or taught by this teacher
  const tHalaqahIds = new Set(teacher.halaqahIds || (teacher.halaqahId ? [teacher.halaqahId] : []));
  halaqahs.forEach(h => {
    const isTaught =
      tHalaqahIds.has(h.id) ||
      h.primaryTeacherId === teacher.id ||
      (h.teacherIds && h.teacherIds.includes(teacher.id)) ||
      (h.primaryTeacherName && normalizeTeacherText(h.primaryTeacherName) === teacherNameNorm);

    if (isTaught && h.complexId && complexes.some(c => c.id === h.complexId)) {
      matchedComplexIds.add(h.complexId);
    }
  });

  const matched = complexes.filter(c => matchedComplexIds.has(c.id));
  if (matched.length > 0) {
    return matched;
  }

  return [complexes[0]];
};

/**
 * Resolves the specific QuranComplex that a teacher supervises or belongs to (primary).
 */
export const getTeacherComplex = (
  teacher?: TeacherAccount | null,
  complexes: QuranComplex[] = [],
  halaqahs: Halaqah[] = [],
  allTeachers: TeacherAccount[] = []
): QuranComplex | null => {
  const all = getTeacherAllComplexes(teacher, allTeachers, complexes, halaqahs);
  return all.length > 0 ? all[0] : null;
};

/**
 * Bulletproof helper to check if a halaqah belongs to a given QuranComplex.
 * Handles ID match, exact name match, partial name match, keyword overlap, student links, and teacher links.
 */
export const isHalaqahInComplex = (
  h?: Halaqah | null,
  complex?: QuranComplex | null,
  allComplexes: QuranComplex[] = [],
  students: Student[] = [],
  teachers: TeacherAccount[] = []
): boolean => {
  if (!h || !complex) return false;

  const cId = (complex.id || '').trim();
  const cName = (complex.name || '').trim();
  const normC = normalizeTeacherText(cName);
  const normCId = normalizeTeacherText(cId);

  // Read complexId from multiple possible field formats
  const rawHCId = (h.complexId || (h as any).complex_id || (h as any).parentComplexId || '').toString().trim();
  const rawHCName = (h.complexName || (h as any).complex_name || (h as any).parentComplexName || '').toString().trim();

  // 1. AUTHORITATIVE: If halaqah has an explicit complexId, strict check against this complex
  if (rawHCId) {
    if (rawHCId === cId) return true;
    if (cName && rawHCId === cName) return true;
    if (normCId && normalizeTeacherText(rawHCId) === normCId) return true;
    if (normC && normalizeTeacherText(rawHCId) === normC) return true;

    // Strict isolation: An explicit complexId that does not match this complex CANNOT belong here!
    return false;
  }

  // 2. AUTHORITATIVE: If halaqah has a designated complexName
  if (rawHCName) {
    const normH = normalizeTeacherText(rawHCName);
    if (normH === normC || normH === normCId) return true;

    // Strict isolation: An explicit complexName that does not match this complex CANNOT belong here!
    return false;
  }

  // 3. ONLY if rawHCId and rawHCName are completely unassigned/empty, use teacher links or default:
  if (!rawHCId && !rawHCName) {
    // 3.1 Linked via teacher account assigned ONLY to this complex
    if (teachers && teachers.length > 0) {
      const isTeacherExclusivelyInThisComplex = teachers.some(t => {
        const inThis = t.complexId === complex.id || (t.complexIds && t.complexIds.length === 1 && t.complexIds[0] === complex.id);
        if (!inThis) return false;
        return (
          t.halaqahId === h.id ||
          (t.halaqahIds && t.halaqahIds.includes(h.id)) ||
          (h.primaryTeacherId && h.primaryTeacherId === t.id) ||
          (h.primaryTeacherName && t.name && normalizeTeacherText(h.primaryTeacherName) === normalizeTeacherText(t.name))
        );
      });
      if (isTeacherExclusivelyInThisComplex) return true;
    }

    // 3.2 Default fallback for legacy unassigned halaqahs: assign strictly to the primary complex
    const primaryId = allComplexes[0]?.id || 'complex-main';
    if (complex.id === primaryId || allComplexes.length <= 1) return true;
  }

  return false;
};

/**
 * Resolves halaqahs belonging to a teacher inside a specific complex.
 */
export const getTeacherHalaqahsInComplex = (
  teacher: TeacherAccount | null | undefined,
  complexId: string,
  halaqahs: Halaqah[],
  allTeachers: TeacherAccount[] = [],
  isSupervisorOfThisComplex: boolean = false,
  allComplexes: QuranComplex[] = [],
  students: Student[] = []
): Halaqah[] => {
  const targetComplex = allComplexes.find(c => c.id === complexId || c.name === complexId) || { id: complexId, name: complexId } as QuranComplex;
  const complexHalaqahs = halaqahs.filter(h => isHalaqahInComplex(h, targetComplex, allComplexes, students, allTeachers));

  if (isSupervisorOfThisComplex || !teacher) {
    return complexHalaqahs;
  }

  const teacherNameNorm = normalizeTeacherText(teacher.name);
  const teacherUserNorm = normalizeTeacherText(teacher.username);
  const matchingAccounts = allTeachers.filter(t => isSameTeacher(teacher, t));
  const matchingIds = new Set<string>(matchingAccounts.map(t => t.id));
  matchingIds.add(teacher.id);

  const teacherHalaqahIds = new Set<string>([
    ...(teacher.halaqahIds || []),
    ...(teacher.halaqahId ? [teacher.halaqahId] : []),
    ...matchingAccounts.flatMap(a => [...(a.halaqahIds || []), ...(a.halaqahId ? [a.halaqahId] : [])])
  ]);

  return complexHalaqahs.filter(h => {
    // 1. Direct assignment via halaqah ID on teacher account
    if (teacherHalaqahIds.has(h.id)) return true;
    // 2. Direct primaryTeacherId match
    if (h.primaryTeacherId && matchingIds.has(h.primaryTeacherId)) return true;
    // 3. Multi-teacher ID list match
    if (h.teacherIds && h.teacherIds.some(id => matchingIds.has(id))) return true;
    // 4. Primary teacher name match
    if (h.primaryTeacherName) {
      const primNorm = normalizeTeacherText(h.primaryTeacherName);
      if (primNorm === teacherNameNorm || primNorm === teacherUserNorm) return true;
    }
    // 5. Teacher names array match
    if (h.teacherNames && h.teacherNames.some(tn => {
      const norm = normalizeTeacherText(tn);
      return norm === teacherNameNorm || norm === teacherUserNorm;
    })) {
      return true;
    }
    return false;
  });
};

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  studentId?: string;
  phone: string;
  createdAt: string;
}

export type StudentLevel = 'ضعيف' | 'متوسط' | 'قوي';

export interface QuranRecitationItem {
  id?: string;
  type?: string; // e.g. "حفظ جديد" | "مراجعة صغرى" | "مراجعة كبرى" | "مراجعة تراكمية" | "تثبيت مصحف" | "اختبار مرحلي" | "سورة مخصصة"
  surahNumber: number; // Start surah number (1-114)
  surahName: string;   // Start surah name
  fromAyah: number;    // Start ayah
  toSurahNumber?: number; // End surah number (1-114) - if reciting across multiple surahs
  toSurahName?: string;   // End surah name
  toAyah: number;      // End ayah
  isFullSurah?: boolean;
  formattedText?: string;
  pagesCount?: number;
  totalAyahs?: number;
  notes?: string;
  didNotRecite?: boolean; // خيار لم يُسمّع
  didNotReciteReason?: string; // سبب عدم التسميع (لم يحفظ، غياب، أو سبب مخصص من المعلم)
}

export interface DailyAssignment {
  newMemorization: string; // الحفظ الجديد المقرر
  review: string; // ورد المراجعة المقرر
  suggestedSheikh: string; // الشيخ المقترح للاستماع
  tajweedFocus?: string; // تركيز التجويد
  dailyNote: string; // توجيه المعلم المنزلي
  targetRepetitions?: number; // عدد مرات التكرار المطلوبة للاستماع (1-20)
  // Detailed items
  newItem?: QuranRecitationItem;
  reviewItem?: QuranRecitationItem;
  reviewItems?: QuranRecitationItem[];
}

export interface StudentAIPlan {
  roadmapSummary: string;
  currentDailyAssignment: DailyAssignment;
  difficultyAdjustment: string;
  estimatedDaysToFinishJuz: number;
  lastUpdated: string;
}

export interface Student {
  id: string;
  name: string;
  password: string;
  phone: string;
  age: number;
  parentName: string;
  parentPhones: string[];
  parentPhone?: string; // Optional convenience singular parent phone
  currentSurah: number; // 1 - 114
  currentSurahName: string;
  currentAyah: number;
  dailyNewTarget: string;
  dailyReviewTarget: string;
  level: StudentLevel;
  aiPlan?: StudentAIPlan;
  persistentReviewItems?: QuranRecitationItem[]; // بنود المراجعة والتراكمي والاختبار المحفوظة دائماً للطالب
  notes?: string;
  complexId?: string; // ID of the complex this student belongs to
  complexName?: string; // Cached display name of the complex
  halaqahId?: string; // ID of the halaqah this student belongs to
  halaqahName?: string; // Cached display name of halaqah
  googleEmail?: string | null; // بريد حساب Google المرتبط بالطالب
  googleUid?: string | null; // معرف Google UID المرتبط
  googleName?: string | null; // اسم الحساب في Google
  googlePhotoUrl?: string | null; // صورة الحساب في Google
  isGoogleLinked?: boolean; // هل حساب الطالب موثق ومربوط بـ Google
  completedNewPages?: number[]; // الأوجه المكتملة في الحفظ الجديد (5 نقاط لكل وجه)
  completedReviewPages?: number[]; // الأوجه المكتملة في المراجعة (نقطة واحدة لكل وجه)
  totalPagePoints?: number; // إجمالي نقاط الأوجه المكتملة
  listeningPoints?: number; // نقاط إتمام واجبات الاستماع
  listenedAyahsCount?: number; // إجمالي عدد الآيات المسموعة
  dailyListeningCompletedDate?: string; // تاريخ آخر إنجاز استماع يومي
  activeListeningAssignment?: {
    surahNumber: number;
    surahName: string;
    fromAyah: number;
    toAyah: number;
    sheikhName: string;
    requiredRepetitions: number;
    assignedDate: string;
    completedRepetitions?: number;
    isCompleted?: boolean;
  };
  criteriaPoints?: number; // نقاط المعايير المكتسبة
  bonusPoints?: number; // نقاط إضافية وتشجيعية ممنوحة من المعلم أو المشرف في لوحة الشرف
  points?: number; // إجمالي النقاط الكلي للطالب
  createdAt: string;
}

export type AttendanceStatus = 'حاضر' | 'غائب' | 'متأخر' | 'معتذر';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  savedAt: string;
}

export type CriteriaType = 'stars' | 'score' | 'options' | 'text';

export interface EvaluationCriteria {
  id: string;
  name: string; // e.g. "حفظ", "مراجعة", "تجويد", "أخلاق وسلوك"
  type: CriteriaType;
  maxScore?: number;
  options?: string[];
  isDefault?: boolean;
  complexId?: string; // المجمع القرآني الخاص بهذا المعيار
  pointsWeight?: number; // أقصى نقاط يحصل عليها الطالب عند الدرجة الكاملة أو 5 نجوم (مثلاً: 10 نقاط)
  hasPoints?: boolean; // هل هذا المعيار يتضمن نقاط أم معيار وصفي بدون نقاط
}

export interface StudentEvaluation {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName?: string;
  attendanceStatus?: string;
  pointsAwarded?: number;
  generalNotes?: string;
  criteriaScores?: Record<string, any>;
  criteriaValues?: Record<string, any>;
  recitationDetails: {
    // Today's recitation (ما تم تسميعه اليوم)
    newMemorizationAchieved: string;
    reviewAchieved: string;
    teacherNotes: string;
    todayNewItem?: QuranRecitationItem;
    todayReviewItems?: QuranRecitationItem[];
    // Tomorrow's required assignment (مقرر الغد الذي حدده المعلم)
    tomorrowNewItem?: QuranRecitationItem;
    tomorrowReviewItem?: QuranRecitationItem;
    tomorrowReviewItems?: QuranRecitationItem[];
    tomorrowSuggestedSheikh?: string;
    tomorrowDailyNote?: string;
    tomorrowTargetRepetitions?: number;
    tomorrowListeningAssignment?: {
      surahNumber: number;
      surahName: string;
      requiredListeningCount: number;
      youtubeUrl?: string;
      youtubeVideoId?: string;
    };
    pagesCompletedToday?: number[];
    pointsEarnedToday?: number;
    pagesPointsEarnedToday?: number;
    criteriaPointsEarnedToday?: number;
    attendancePointsEarnedToday?: number;
  };
  aiFeedback?: {
    studentProgressStatus: 'متقدم' | 'منتظم' | 'متأخر' | 'يحتاج مساعدة';
    analysis: string;
    nextDayPlan: DailyAssignment;
    reasoning: string;
  };
  evaluatedAt?: string;
}

export interface AbsenceMessageTemplate {
  id: string;
  title: string;
  template: string; // e.g. "السلام عليكم ورحمة الله وبركاته، علومك شيخنا بشرنا عنك وعن {اسم_الولد} استغربنا غيابه اليوم بشر عساه بخير"
  createdAt: string;
}

export interface AttendancePointsSettings {
  presentPoints: number; // e.g. +1 (نقاط الحضور)
  latePoints: number; // e.g. 0 or -1 (نقاط التأخر)
  excusedPoints: number; // e.g. 0 (نقاط الاستئذان/الاعتذار)
  absentPointsDeduction: number; // e.g. 1 (نقاط خصم الغياب)
  enableAttendancePoints: boolean; // تفعيل احتساب نقاط الحضور والغياب في رصيد الطالب
}

export interface AppSettings {
  allowStudentRegistration: boolean;
  workDaysPerWeek: number;
  workDaysNames: string[];
  halaqahName: string;
  teacherName: string;
  complexName?: string;
  themeLogoUrl?: string; // شعار المجمع العام
  themeStampUrl?: string; // ختم المجمع العام
  newPagePoints?: number; // نقاط كل وجه جديد
  reviewPagePoints?: number; // نقاط كل وجه مراجعة
  dailyListeningPoints?: number; // نقاط إنجاز الاستماع اليومي
  attendancePointsSettings?: AttendancePointsSettings; // إعدادات نقاط الحضور والغياب والخصومات
  absenceMessageTemplates?: AbsenceMessageTemplate[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionTaken?: string;
}

export type ViolationSeverity = 'تنبيه' | 'بسيطة' | 'متوسطة' | 'جسيمة';

export interface BehaviorViolation {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  time?: string;
  violationType: string;
  severity: ViolationSeverity;
  description: string;
  actionTaken: string;
  pointsDeducted?: number;
  status: 'تم الإشعار' | 'قيد المتابعة' | 'تم التوجيه والمعالجة';
  parentNotified: boolean;
  parentNotificationDate?: string;
  parentNotificationPhone?: string;
  messageText?: string;
  teacherName?: string;
  showInPortal?: boolean;
  createdAt: string;
}

export interface FullBackupData {
  version: string;
  exportDate: string;
  complexes?: QuranComplex[];
  students: Student[];
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  evaluationCriteria: EvaluationCriteria[];
  settings: AppSettings;
  chatMessages: ChatMessage[];
  userAccounts: UserAccount[];
  teachers?: TeacherAccount[];
  halaqahs?: Halaqah[];
  violations?: BehaviorViolation[];
  exams?: Exam[];
  submissions?: ExamSubmission[];
  leaderboardSettings?: LeaderboardSettings;
  googleOAuth?: GoogleOAuthConfig;
  recordings?: SurahRecording[];
  recordingsConfig?: RecordingsConfig;
  listeningLogs?: StudentListeningLog[];
  certificates?: IssuedCertificate[];
}

export interface ComplexBackupData {
  version: string;
  exportDate: string;
  complex: QuranComplex;
  halaqahs: Halaqah[];
  students: Student[];
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  violations?: BehaviorViolation[];
  exams?: Exam[];
  certificates?: IssuedCertificate[];
}

export interface ComplexMigrationProgress {
  step: number;
  totalSteps: number;
  percent: number;
  title: string;
  detail: string;
  currentEntity?: string;
  entityCount?: number;
  logs: string[];
}

export interface ComplexMigrationResult {
  success: boolean;
  complexId: string;
  complexName: string;
  targetGoogleEmail: string;
  targetProjectId: string;
  targetDatabaseId: string;
  targetApiKey?: string;
  firebaseConsoleUrl?: string;
  migratedAt: string;
  purgedFromCentral: boolean;
  stats: {
    studentsCount: number;
    halaqahsCount: number;
    attendanceCount: number;
    evaluationsCount: number;
    examsCount: number;
    violationsCount: number;
    certificatesCount: number;
    totalRecords: number;
  };
}

export type ExamQuestionType = 'multiple_choice' | 'true_false' | 'essay' | 'short_answer';

export interface ExamQuestion {
  id: string;
  title: string; // نص السؤال
  type: ExamQuestionType;
  options?: string[]; // خيارات الإجابة
  correctAnswer?: string | number; // الإجابة الصحيحة للتقييم التلقائي
  points: number; // درجة / نقاط السؤال
  explanation?: string; // توضيح أو إجابة نموذجية
  timeLimitSeconds?: number; // وقت السؤال المخصص بالثواني (اختياري)
}

export type ExamScheduleType = 'now' | 'scheduled';
export type ExamGradeVisibility = 'immediate' | 'after_deadline' | 'manual';
export type ExamTimeLimitMode = 'none' | 'total' | 'per_question';
export type ExamDeliveryMode = 'platform' | 'google_form';

export interface Exam {
  id: string;
  title: string; // اسم الاختبار (إلزامي)
  description?: string; // وصف أو تعليمات الاختبار
  deliveryMode?: ExamDeliveryMode; // 'platform' (داخل المنصة) | 'google_form' (عبر نموذج Google Forms)
  autoCreateGoogleForm?: boolean; // هل يتم إنشاء وتوليد نموذج جوجل فورم وجدول الشيت تلقائياً عند الحفظ
  scheduleType: ExamScheduleType; // فوري أو مجدول
  startDate?: string; // تاريخ ووقت الظهور
  hasDeadline: boolean; // هل له موعد انتهاء أم للأبد
  deadlineDate?: string; // موعد الانتهاء
  attemptLimitType: 'unlimited' | 'limited'; // عدد المحاولات
  maxAttempts?: number; // عدد المحاولات المسموحة (إذا كانت محددة)
  timeLimitMode?: ExamTimeLimitMode; // نمط المؤقت الزمني: بدون / وقت كلي للاختبار / وقت مخصص لكل سؤال
  totalTimeMinutes?: number; // إجمالي وقت الاختبار بالدقائق (إذا تم اختيار وقت كلي)
  questionTimeSeconds?: number; // الوقت الافتراضي لكل سؤال بالثواني (إذا تم اختيار وقت لكل سؤال)
  gradeVisibility: ExamGradeVisibility; // ظهور النتيجة: فوري / بعد انتهاء الموعد / بعد تصحيح المعلم
  grantsLeaderboardPoints: boolean; // هل يمنح نقاطاً للوحة الشرف
  totalPoints: number; // إجمالي نقاط ودرجات الاختبار
  targetHalaqat: string[]; // ['all'] أو مصفوفة معرفات الحلقات المستهدفة
  questions: ExamQuestion[]; // قائمة الأسئلة
  googleFormId?: string; // معرف Google Form المرتبط
  googleFormUrl?: string; // رابط النموذج للتعديل
  googleFormResponderUrl?: string; // رابط النموذج للطلاب
  googleSpreadsheetId?: string; // معرف Google Sheets المرتبط
  googleSpreadsheetUrl?: string; // رابط جدول الردود
  googleFormNameEntryId?: string; // معرف حقل اسم الطالب في Google Form لتعبئته تلقائياً
  complexId?: string; // معرف المجمع القرآني الذي ينتمي إليه الاختبار حصرياً
  complexName?: string; // اسم المجمع القرآني
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExamSubmissionAnswer {
  questionId: string;
  questionTitle: string;
  questionType: ExamQuestionType;
  studentAnswer: string;
  isAutoGraded: boolean;
  isCorrect?: boolean;
  pointsEarned: number;
  maxPoints: number;
  teacherFeedback?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentGoogleEmail?: string;
  googleEmail?: string;
  googleUid?: string;
  halaqahId: string;
  halaqahName: string;
  complexId?: string; // معرف المجمع القرآني
  complexName?: string; // اسم المجمع القرآني
  attemptNumber: number; // رقم المحاولة
  answers: ExamSubmissionAnswer[];
  totalScoreEarned: number;
  maxPossibleScore: number;
  percentage: number;
  pointsGrantedForLeaderboard: number;
  status: 'completed' | 'needs_grading'; // needs_grading if essay questions are pending
  submittedAt: string;
  gradedAt?: string;
  gradedByTeacherName?: string;
  teacherGeneralFeedback?: string;
}

export type LeaderboardScope = 'per_halaqah' | 'all_unified' | 'custom_groups';

export interface LeaderboardGroup {
  id: string;
  name: string;
  halaqahIds: string[];
}

export interface LeaderboardSettings {
  scope: LeaderboardScope;
  customGroups?: LeaderboardGroup[];
  includeExamPoints: boolean;
  includeEvaluationScores: boolean;
  updatedAt: string;
}

export interface GoogleOAuthConfig {
  connectedEmail?: string;
  displayName?: string;
  photoURL?: string | null;
  connectedAt?: string;
  isLinked: boolean;
  lastSyncAt?: string;
  accessToken?: string;
  savedInCloud?: boolean;
  expiresAt?: number;
}

export interface SurahRecordingSegment {
  ayahNumber: number;
  ayahText?: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  formattedStart?: string;
  formattedEnd?: string;
}

export interface SurahRecording {
  id: string;
  surahNumber: number;
  surahName: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title?: string;
  reciterName?: string;
  status: 'processing' | 'ready';
  segments: SurahRecordingSegment[];
  defaultListeningCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecordingsConfig {
  isPublishedToStudents: boolean;
  dailyRepetitionTarget?: number;
  listeningPointsReward?: number; // نقاط إتمام الاستماع (المبرمج والمعلم المشرف)
  updatedAt: string;
}

/**
 * Returns clean singular phone number for a student's parent.
 */
export function getStudentParentPhone(student?: Student | null): string {
  if (!student) return '';
  if (student.parentPhone && student.parentPhone.trim()) {
    return student.parentPhone.trim();
  }
  if (Array.isArray(student.parentPhones) && student.parentPhones.length > 0) {
    const valid = student.parentPhones.find(p => p && p.trim().length > 0);
    if (valid) return valid.trim();
  }
  if (student.phone && student.phone.trim()) {
    return student.phone.trim();
  }
  return '';
}

export interface StudentListeningLog {
  id: string;
  studentId: string;
  studentName: string;
  halaqahId?: string;
  surahNumber: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  targetCount: number;
  completedCount: number;
  isFullyCompleted: boolean;
  date: string; // YYYY-MM-DD
  timestamp: string;
}

/**
 * التحقق الصارم من الاسم الثلاثي (الاسم الأول واسم الأب واسم الجد/العائلة)
 * إلزامي لجميع الطلاب والمعلمين والمشرفين
 */
export function getThreePartNameValidation(
  rawName?: string | null,
  roleLabel: 'طالب' | 'معلم' | 'مشرف' | 'شخص' = 'شخص'
): { isValid: boolean; partsCount: number; message?: string } {
  if (!rawName) {
    return {
      isValid: false,
      partsCount: 0,
      message: `اسم ال${roleLabel} إلزامي ولا يمكن تركه فارغاً.`
    };
  }

  // Strip invisible unicode/Bidi/zero-width characters and normalize
  const cleaned = rawName
    .replace(/[\u200B-\u200F\uFEFF\u202A-\u202E\u00A0\t]/g, ' ')
    .replace(/\u0640/g, '') // remove tatweel
    .replace(/[^\p{L}\p{M}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return {
      isValid: false,
      partsCount: 0,
      message: `اسم ال${roleLabel} إلزامي ولا يمكن تركه فارغاً.`
    };
  }

  // Split by whitespace
  const rawTokens = cleaned.split(/\s+/).filter(Boolean);

  if (rawTokens.length < 2) {
    return {
      isValid: false,
      partsCount: rawTokens.length,
      message: `يرجى إدخال اسم ال${roleLabel} كاملاً (مقطعين على الأقل: الاسم واسم الأب أو العائلة).`
    };
  }

  return { isValid: true, partsCount: rawTokens.length };
}

export function isValidThreePartName(
  rawName?: string | null,
  roleLabel: 'طالب' | 'معلم' | 'مشرف' | 'شخص' = 'شخص'
): boolean {
  return getThreePartNameValidation(rawName, roleLabel).isValid;
}

/**
 * Validates that an Arabic name has at least 4 meaningful components (الاسم الرباعي: الاسم الأول، واسم الأب، واسم الجد، واللقب أو اسم العائلة).
 */
export function getFourPartNameValidation(
  fullName: string | null | undefined,
  roleLabel: 'طالب' | 'معلم' | 'مشرف' | 'شخص' = 'شخص'
): { isValid: boolean; message?: string; partsCount: number } {
  const threePartRes = getThreePartNameValidation(fullName, roleLabel);
  if (!threePartRes.isValid) {
    return threePartRes;
  }

  if (threePartRes.partsCount < 4) {
    return {
      isValid: false,
      partsCount: threePartRes.partsCount,
      message: `الاسم المدخل ثلاثي فقط. يلزم كتابة الاسم الرباعي كاملاً (الاسم، اسم الأب، اسم الجد، واسم العائلة) لتجنب تشابه الأسماء.`
    };
  }

  return { isValid: true, partsCount: threePartRes.partsCount };
}

// =========================================================================
// Certificate System Types & Custom Complex Templates
// =========================================================================
export interface CustomCertificateTemplate {
  id: string;
  complexId?: string;
  halaqahId?: string;
  name: string; // اسم النموذج
  title?: string; // عنوان الشهادة مثل: شكر وتقدير
  occasionText?: string; // نص التكريم والثناء
  bgStyle?: string; // نمط الخلفية (royal_emerald, golden_honor, islamic_classic, blue_modern, custom)
  isPlatformAiTemplate?: boolean; // قوالب المنصة والذكاء الاصطناعي - لا تُحسب ضمن حد الـ 5 نماذج المرفوعة
  imageUrl: string; // Base64 / URL image data (under 5MB)
  studentNamePosition: {
    x: number; // percentage from left (0 to 100)
    y: number; // percentage from top (0 to 100)
    fontSize: number; // font size in px (16 - 72)
    fontFamily: string; // Arabic font name
    color: string; // CSS color string (e.g. #064e3b, #d97706)
    textAlign: 'center' | 'right' | 'left';
    fontWeight?: 'normal' | 'bold' | '900';
    maxWidth?: number; // max width percentage
  };
  showDate?: boolean;
  datePosition?: {
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    textAlign: 'center' | 'right' | 'left';
  };
  createdByTeacherName?: string;
  createdAt: string;
}

export type CertificateOccasion =
  | 'شكر وتقدير وتميز'
  | 'أدب وحسن خُلق'
  | 'إتمام جزء من القرآن الكريم'
  | 'إتمام سورة من القرآن الكريم'
  | 'اجتياز اختبار قرآني'
  | 'مواظبة وانضباط قرآني'
  | 'مناسبة مخصصة';

export interface IssuedCertificate {
  id: string;
  studentId: string;
  studentName: string;
  halaqahId?: string;
  halaqahName?: string;
  complexId?: string;
  complexName?: string;
  occasion: CertificateOccasion | string;
  occasionText: string;
  certificateTitle?: string; // عنوان الشهادة المخصص (مثلاً: شكر وتقدير، إتمام متن، إلخ)
  templateId: string;
  templateName: string;
  templateType: 'ready' | 'custom';
  customTemplateImageUrl?: string;
  signatureMode: 'auto' | 'custom' | 'none';
  teacherName?: string;
  supervisorName?: string;
  dateArabic: string;
  dateGregorian: string;
  createdAt: string;
  createdByName?: string;
}

// =========================================================================
// Teacher Attendance & Shifts Types (نظام تحضير المعلمين الذكي بنطاق المسجد)
// =========================================================================
export type TeacherAttendanceStatus = 'حاضر' | 'غائب' | 'معتذر' | 'متأخر';

export interface MosqueItem {
  id: string;
  name: string; // اسم الجامع (يكتبه المشرف ويحفظه)
  neighborhood?: string; // الحي أو الموقع التوضيحي
  complexId?: string;
  latitude?: number;
  longitude?: number;
  allowedRadiusMeters?: number; // default: 100 (100 meters, configurable by supervisor)
  isLocationSet: boolean;
  createdAt: string;
}

export interface TeacherShift {
  id: string;
  name: string; // e.g. "الفترة العصرية", "الفترة المسائية", "حلقة الفجر"
  complexId?: string;
  mosqueId?: string; // الجامع المحدد لهذه الفترة
  mosqueName?: string; // اسم الجامع
  checkInStart: string; // "15:30"
  checkInEnd: string;   // "16:00"
  checkOutStart: string; // "17:30"
  checkOutEnd: string;   // "18:00"
  assignedTeacherIds: string[]; // IDs of teachers on duty
  createdAt: string;
}

export interface MosqueLocationConfig {
  complexId?: string;
  mosqueName: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number; // default: 100 (100 meters, configurable by supervisor)
  updatedAt?: string;
}

export interface TeacherAttendanceRecord {
  id: string; // e.g. "tatt_{date}_{shiftId}_{teacherId}"
  date: string; // YYYY-MM-DD
  shiftId: string;
  shiftName: string;
  teacherId: string;
  teacherName: string;
  complexId?: string;
  mosqueId?: string;
  mosqueName?: string;
  status: TeacherAttendanceStatus;
  checkInTime?: string; // "03:45 م"
  checkInTimestamp?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInDistanceMeters?: number;
  checkOutTime?: string;
  checkOutTimestamp?: string;
  checkOutDistanceMeters?: number;
  note?: string; // عذر أو ملاحظة
  recordedBy: 'self' | 'supervisor' | 'manual';
  createdAt: string;
}

/**
 * Computes Haversine distance in meters between two GPS coordinates
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export type LibraryDocumentType =
  | 'pdf_report'
  | 'exam_results'
  | 'attendance_sheet'
  | 'certificate_batch'
  | 'google_form'
  | 'google_sheet'
  | 'custom_file';

export interface LibraryDocument {
  id: string;
  title: string;
  type: LibraryDocumentType;
  date: string; // YYYY-MM-DD
  createdAt: string;
  createdByName: string;
  complexId?: string;
  complexName?: string;
  halaqahId?: string;
  halaqahName?: string;
  fileUrl?: string; // Data URL or Blob URL or External Link
  googleUrl?: string;
  htmlContent?: string; // Rich printable HTML representation for instant in-app previews
  googleSpreadsheetId?: string;
  googleFormId?: string;
  fileSize?: string;
  pageCount?: number;
  description?: string;
  tags?: string[];
}



