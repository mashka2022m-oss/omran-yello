import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db, OmranDataService, DEFAULT_HALAQAHS } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Exam, ExamQuestion, ExamSubmission, ExamSubmissionAnswer, GoogleOAuthConfig, FullBackupData, Student, TeacherAccount, AttendanceRecord, StudentEvaluation, Halaqah } from '../types';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export class UnauthorizedDomainError extends Error {
  isUnauthorizedDomain = true;
  domain: string;
  projectId: string;
  firebaseConsoleUrl: string;

  constructor(domain: string, projectId: string) {
    const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
    super(
      `نطاق المنصة الحالي (${domain}) يحتاج إلى إضافة في قائمة النطاقات المصرح بها (Authorized Domains)، أو يمكنك استخدام رابط Google Form مباشرة دون الحاجة للربط.`
    );
    this.name = 'UnauthorizedDomainError';
    this.domain = domain;
    this.projectId = projectId;
    this.firebaseConsoleUrl = consoleUrl;
  }
}

export class PopupClosedByUserError extends Error {
  isPopupClosed = true;
  constructor() {
    super(
      'تم إغلاق نافذة تسجيل الدخول من Google قبل استكمال التفويض. يرجى إعادة المحاولة مع إبقاء النافذة مفتوحة لاختيار حسابك والموافقة على الأذونات.'
    );
    this.name = 'PopupClosedByUserError';
  }
}

export class PopupBlockedError extends Error {
  isPopupBlocked = true;
  constructor() {
    super(
      'قام المتصفح بحظر نافذة تسجيل الدخول المنبثقة. يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع من إعدادات المتصفح، أو فتح المنصة في تبويب جديد.'
    );
    this.name = 'PopupBlockedError';
  }
}

export class UnregisteredGoogleAccountError extends Error {
  isUnregistered = true;
  email: string;
  constructor(email: string) {
    super(
      `أنت غير مسجل في المنظومة. الرجاء التسجيل أولاً أو التواصل مع المشرف العام.`
    );
    this.name = 'UnregisteredGoogleAccountError';
    this.email = email;
  }
}

// Normalize Arabic text for robust student name comparisons (hamzas, ta marbuta, spaces, tashkeel)
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic diacritics
    .replace(/\s+/g, ' ');
}

function loadGoogleGISScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve) => {
    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      if (window.google?.accounts?.oauth2) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function requestAccessTokenViaGIS(
  clientId: string,
  scopes: string[]
): Promise<{ email: string; displayName?: string; photoURL?: string | null; accessToken: string }> {
  return new Promise((resolve, reject) => {
    try {
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services library is not loaded');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes.join(' '),
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('لم يتم استلام رمز تفويض Google.'));
            return;
          }

          const accessToken = response.access_token;
          let email = 'حساب Google المتصل';
          let displayName = '';
          let photoURL: string | null = null;
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userInfoRes.ok) {
              const uData = await userInfoRes.json();
              if (uData.email) email = uData.email;
              if (uData.name) displayName = uData.name;
              if (uData.picture) photoURL = uData.picture;
            }
          } catch {
            // Ignore userInfo error
          }

          resolve({ email, displayName, photoURL, accessToken });
        },
        error_callback: (err) => {
          reject(err);
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}

function silentRefreshTokenViaGIS(
  clientId: string,
  scopes: string[],
  loginHint?: string
): Promise<{ email?: string; accessToken: string } | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
        resolve(null);
        return;
      }

      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 7000);

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes.join(' '),
        callback: async (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          if (response.access_token) {
            resolve({ accessToken: response.access_token, email: loginHint });
          } else {
            resolve(null);
          }
        },
        error_callback: () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });

      // Passing prompt: '' enables silent renewal if user is signed in to Google in browser
      client.requestAccessToken({ prompt: '', ...(loginHint ? { hint: loginHint } : {}) } as any);
    } catch {
      resolve(null);
    }
  });
}

const LOCAL_STORAGE_OAUTH_KEY = 'omran_google_oauth_v2';
let inMemoryGoogleAccessToken: string | null = null;
let inMemoryGoogleAuthConfig: GoogleOAuthConfig | null = null;

export class GoogleWorkspaceService {
  static getCachedAccessToken(): string | null {
    return inMemoryGoogleAccessToken;
  }

  static setCachedAccessToken(token: string | null) {
    inMemoryGoogleAccessToken = token;
    if (inMemoryGoogleAuthConfig) {
      inMemoryGoogleAuthConfig.accessToken = token || undefined;
    }
  }

  // Load persistent Google Account status & token from Firestore cloud database + localStorage cache
  static async loadGoogleAuthConfig(): Promise<GoogleOAuthConfig> {
    // 1. Check in-memory cache
    if (inMemoryGoogleAuthConfig && inMemoryGoogleAuthConfig.isLinked) {
      return inMemoryGoogleAuthConfig;
    }

    // 2. Check localStorage cache for instant availability
    let localConfig: GoogleOAuthConfig | null = null;
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_STORAGE_OAUTH_KEY);
        if (stored) {
          localConfig = JSON.parse(stored) as GoogleOAuthConfig;
          if (localConfig?.accessToken && !inMemoryGoogleAccessToken) {
            inMemoryGoogleAccessToken = localConfig.accessToken;
            inMemoryGoogleAuthConfig = localConfig;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read google auth from localStorage:', e);
    }

    // 3. Check Firestore cloud database (Source of Truth)
    try {
      const snap = await getDoc(doc(db, 'settings', 'google_oauth'));
      if (snap.exists()) {
        const cloudData = snap.data() as GoogleOAuthConfig;
        if (cloudData.isLinked) {
          if (cloudData.accessToken) {
            inMemoryGoogleAccessToken = cloudData.accessToken;
          }
          inMemoryGoogleAuthConfig = cloudData;
          // Sync to localStorage
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(LOCAL_STORAGE_OAUTH_KEY, JSON.stringify(cloudData));
            }
          } catch {
            // Ignore local storage error
          }
          return cloudData;
        }
      }
    } catch (e) {
      console.warn('Could not load google auth config from Firestore:', e);
    }

    if (localConfig && localConfig.isLinked) {
      return localConfig;
    }

    return { isLinked: false };
  }

  // Save persistent Google Account status & token to Firestore cloud database forever + localStorage
  static async saveGoogleAuthConfig(config: GoogleOAuthConfig): Promise<void> {
    const configToSave: GoogleOAuthConfig = {
      ...config,
      savedInCloud: true,
      lastSyncAt: new Date().toISOString(),
      expiresAt: config.expiresAt || (Date.now() + 3500 * 1000)
    };

    inMemoryGoogleAuthConfig = configToSave;
    if (configToSave.accessToken) {
      inMemoryGoogleAccessToken = configToSave.accessToken;
    }

    // Save to localStorage immediately
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_OAUTH_KEY, JSON.stringify(configToSave));
      }
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    // Save to Firestore cloud database forever
    try {
      await setDoc(doc(db, 'settings', 'google_oauth'), {
        ...configToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Error saving google auth config to Firestore:', e);
    }
  }

  // Silent Background Token Refresh (keeps Google Sheets connection active forever without showing popups)
  static async silentRefreshToken(): Promise<string | null> {
    if (typeof window === 'undefined' || !firebaseConfig.oAuthClientId) return null;
    const config = await this.loadGoogleAuthConfig();
    if (!config.isLinked || !config.connectedEmail) return null;

    try {
      await loadGoogleGISScript();
      if (!window.google?.accounts?.oauth2) return null;

      const refreshRes = await silentRefreshTokenViaGIS(
        firebaseConfig.oAuthClientId,
        GOOGLE_SCOPES,
        config.connectedEmail
      );

      if (refreshRes?.accessToken) {
        inMemoryGoogleAccessToken = refreshRes.accessToken;
        const updatedConfig: GoogleOAuthConfig = {
          ...config,
          accessToken: refreshRes.accessToken,
          lastSyncAt: new Date().toISOString(),
          savedInCloud: true,
          expiresAt: Date.now() + 3500 * 1000
        };
        await this.saveGoogleAuthConfig(updatedConfig);
        return refreshRes.accessToken;
      }
    } catch (err) {
      console.warn('Silent refresh attempt notice:', err);
    }
    return null;
  }

  // Retrieve valid access token from memory or persistent Firestore + silent auto-refresh if close to expiry
  static async getValidAccessToken(): Promise<string | null> {
    const config = await this.loadGoogleAuthConfig();

    // If we have an access token and it's not expired yet, return it
    if (inMemoryGoogleAccessToken) {
      const isExpired = config.expiresAt ? Date.now() >= config.expiresAt : false;
      if (!isExpired) {
        return inMemoryGoogleAccessToken;
      }
    }

    // If config has token and not expired
    if (config.isLinked && config.accessToken) {
      const isExpired = config.expiresAt ? Date.now() >= config.expiresAt : false;
      if (!isExpired) {
        inMemoryGoogleAccessToken = config.accessToken;
        return config.accessToken;
      }
    }

    // Token is missing or expired, attempt silent background refresh using Google GIS
    if (config.isLinked && config.connectedEmail) {
      const silentToken = await this.silentRefreshToken();
      if (silentToken) {
        return silentToken;
      }
    }

    // If silent refresh failed but we still have the stored token, return it as fallback
    if (config.accessToken) {
      inMemoryGoogleAccessToken = config.accessToken;
      return config.accessToken;
    }

    return null;
  }

  // Save manual access token entered by user
  static async setManualAccessToken(token: string, email = 'حساب Google اليدوي'): Promise<void> {
    const cleanToken = token.trim();
    if (!cleanToken) throw new Error('يرجى إدخال رمز التفويض.');
    inMemoryGoogleAccessToken = cleanToken;
    const config: GoogleOAuthConfig = {
      connectedEmail: email,
      connectedAt: new Date().toISOString(),
      isLinked: true,
      lastSyncAt: new Date().toISOString(),
      accessToken: cleanToken,
      savedInCloud: true,
      expiresAt: Date.now() + 3500 * 1000
    };
    await this.saveGoogleAuthConfig(config);
  }

  // -------------------------------------------------------------
  // STUDENT GOOGLE AUTHENTICATION & AUTOMATIC GRADE LOOKUP
  // -------------------------------------------------------------

  // Student Sign-in with Google: seamlessly links or registers student profile with their Google account
  static async signInStudentWithGoogle(
    existingStudents: Student[]
  ): Promise<{
    student: Student;
    user: { email: string; displayName: string; uid: string; photoURL?: string | null };
    isNew: boolean;
  }> {
    let googleUser: { email: string; displayName: string; uid: string; photoURL?: string | null } | null = null;

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        googleUser = {
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          uid: result.user.uid,
          photoURL: result.user.photoURL || null
        };
      }
    } catch (popupErr: any) {
      if (popupErr.code === 'auth/popup-closed-by-user') {
        throw new PopupClosedByUserError();
      }
      if (popupErr.code === 'auth/popup-blocked') {
        throw new PopupBlockedError();
      }

      // Fallback via GIS if available
      if (typeof window !== 'undefined' && firebaseConfig.oAuthClientId) {
        try {
          await loadGoogleGISScript();
          if (window.google?.accounts?.oauth2) {
            const gisRes = await requestAccessTokenViaGIS(firebaseConfig.oAuthClientId, ['email', 'profile']);
            if (gisRes?.email) {
              googleUser = {
                email: gisRes.email,
                displayName: gisRes.displayName || gisRes.email.split('@')[0],
                uid: `gis_${Date.now()}`,
                photoURL: gisRes.photoURL || null
              };
            }
          }
        } catch {
          // ignore GIS error
        }
      }

      if (!googleUser) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : '';
        if (popupErr.code === 'auth/unauthorized-domain') {
          throw new UnauthorizedDomainError(domain, firebaseConfig.projectId);
        }
        throw popupErr;
      }
    }

    if (!googleUser || !googleUser.email) {
      throw new Error('تعذر استلام بيانات حساب Google.');
    }

    const cleanEmail = googleUser.email.trim().toLowerCase();
    const cleanName = googleUser.displayName ? googleUser.displayName.trim() : '';

    // 1. Search for an existing student with this Google email or Google UID
    let matchedStudent = existingStudents.find(
      s => (s.googleEmail && s.googleEmail.trim().toLowerCase() === cleanEmail) ||
           (s.googleUid && s.googleUid === googleUser!.uid)
    );

    // 2. If not matched by email, try matching by name using normalized Arabic
    if (!matchedStudent && cleanName) {
      const normGoogleName = normalizeArabicText(cleanName);
      matchedStudent = existingStudents.find(s => {
        const normS = normalizeArabicText(s.name);
        return normS === normGoogleName ||
               (normGoogleName.length >= 6 && normS.includes(normGoogleName)) ||
               (normS.length >= 6 && normGoogleName.includes(normS));
      });
    }

    if (matchedStudent) {
      // Update student profile in Firestore with Google linking
      const updatedStudent: Student = {
        ...matchedStudent,
        googleEmail: cleanEmail,
        googleUid: googleUser.uid,
        googleName: cleanName || matchedStudent.name,
        googlePhotoUrl: googleUser.photoURL || matchedStudent.googlePhotoUrl || null,
        isGoogleLinked: true
      };
      await OmranDataService.saveStudent(updatedStudent);
      return { student: updatedStudent, user: googleUser, isNew: false };
    }

    // 3. New student onboarding: create student profile in Firestore directly
    const newStudentId = `std_g_${Date.now()}`;
    const newStudentName = cleanName || cleanEmail.split('@')[0];
    const newStudent: Student = {
      id: newStudentId,
      name: newStudentName,
      password: '123',
      phone: '',
      age: 12,
      parentName: `ولي أمر ${newStudentName}`,
      parentPhones: [],
      currentSurah: 78,
      currentSurahName: 'النبأ',
      currentAyah: 1,
      dailyNewTarget: 'نصف وجه',
      dailyReviewTarget: 'وجه واحد',
      level: 'متوسط',
      halaqahId: DEFAULT_HALAQAHS[0]?.id || '',
      halaqahName: DEFAULT_HALAQAHS[0]?.name || '',
      googleEmail: cleanEmail,
      googleUid: googleUser.uid,
      googleName: cleanName || newStudentName,
      googlePhotoUrl: googleUser.photoURL || null,
      isGoogleLinked: true,
      createdAt: new Date().toISOString()
    };

    await OmranDataService.saveStudent(newStudent);
    return { student: newStudent, user: googleUser, isNew: true };
  }

  // Link Google Account to an already logged-in student
  static async linkStudentGoogleAccount(student: Student): Promise<Student> {
    let googleUser: { email: string; displayName: string; uid: string; photoURL?: string | null } | null = null;

    // 1. Try Google Identity Services (GIS) first if oAuthClientId is configured
    if (typeof window !== 'undefined' && firebaseConfig.oAuthClientId) {
      try {
        await loadGoogleGISScript();
        if (window.google?.accounts?.oauth2) {
          const gisRes = await requestAccessTokenViaGIS(firebaseConfig.oAuthClientId, ['email', 'profile']);
          if (gisRes?.email) {
            googleUser = {
              email: gisRes.email,
              displayName: gisRes.displayName || gisRes.email.split('@')[0],
              uid: `gis_${Date.now()}`,
              photoURL: gisRes.photoURL || null
            };
          }
        }
      } catch (gisErr) {
        console.warn('GIS Token client student notice:', gisErr);
      }
    }

    // 2. Fallback via Firebase Auth popup
    if (!googleUser) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          googleUser = {
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            uid: result.user.uid,
            photoURL: result.user.photoURL || null
          };
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (err?.code === 'auth/unauthorized-domain' || errMsg.includes('auth/unauthorized-domain')) {
          const domain = typeof window !== 'undefined' ? window.location.hostname : '';
          throw new UnauthorizedDomainError(domain, firebaseConfig.projectId);
        }
        if (err?.code === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed')) {
          throw new PopupClosedByUserError();
        }
        if (err?.code === 'auth/popup-blocked' || errMsg.includes('popup-blocked')) {
          throw new PopupBlockedError();
        }
        throw err;
      }
    }

    if (!googleUser || !googleUser.email) {
      throw new Error('تعذر استلام بيانات حساب Google.');
    }

    const targetEmail = googleUser.email.trim().toLowerCase();

    // Check if this Google account is already linked to another student or teacher
    try {
      const allStudents = await OmranDataService.getStudents();
      const duplicateStudent = allStudents.find(
        s => s.id !== student.id && s.isGoogleLinked && s.googleEmail?.trim().toLowerCase() === targetEmail
      );
      if (duplicateStudent) {
        throw new Error('هذا الحساب مربوط بالفعل');
      }

      const allTeachers = await OmranDataService.getTeachers();
      const duplicateTeacher = allTeachers.find(
        t => t.isGoogleLinked && t.googleEmail?.trim().toLowerCase() === targetEmail
      );
      if (duplicateTeacher) {
        throw new Error('هذا الحساب مربوط بالفعل');
      }
    } catch (checkErr: any) {
      if (checkErr.message === 'هذا الحساب مربوط بالفعل') {
        throw checkErr;
      }
      console.warn('Account duplication check warning:', checkErr);
    }

    const updatedStudent: Student = {
      ...student,
      googleEmail: targetEmail,
      googleUid: googleUser.uid,
      googleName: googleUser.displayName || student.name,
      googlePhotoUrl: googleUser.photoURL || student.googlePhotoUrl || null,
      isGoogleLinked: true
    };

    await OmranDataService.saveStudent(updatedStudent);
    return updatedStudent;
  }

  // Direct email verification & linking for students (bypasses domain restrictions smoothly)
  static async linkStudentGoogleDirect(student: Student, email: string): Promise<Student> {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw new Error('يرجى إدخال بريد إلكتروني صحيح (مثال: student@gmail.com).');
    }

    // Check if this Google account is already linked to another student or teacher
    try {
      const allStudents = await OmranDataService.getStudents();
      const duplicateStudent = allStudents.find(
        s => s.id !== student.id && s.isGoogleLinked && s.googleEmail?.trim().toLowerCase() === cleanEmail
      );
      if (duplicateStudent) {
        throw new Error('هذا الحساب مربوط بالفعل');
      }

      const allTeachers = await OmranDataService.getTeachers();
      const duplicateTeacher = allTeachers.find(
        t => t.isGoogleLinked && t.googleEmail?.trim().toLowerCase() === cleanEmail
      );
      if (duplicateTeacher) {
        throw new Error('هذا الحساب مربوط بالفعل');
      }
    } catch (checkErr: any) {
      if (checkErr.message === 'هذا الحساب مربوط بالفعل') {
        throw checkErr;
      }
      console.warn('Account duplication check warning:', checkErr);
    }

    const updatedStudent: Student = {
      ...student,
      googleEmail: cleanEmail,
      googleUid: student.googleUid || `direct_${Date.now()}`,
      googleName: student.googleName || student.name,
      isGoogleLinked: true
    };

    await OmranDataService.saveStudent(updatedStudent);
    return updatedStudent;
  }

  // Unlink Google Account from a Student
  static async unlinkStudentGoogleAccount(student: Student): Promise<Student> {
    const updatedStudent: Student = {
      ...student,
      googleEmail: null,
      googleUid: null,
      googleName: null,
      googlePhotoUrl: null,
      isGoogleLinked: false
    };

    await OmranDataService.saveStudent(updatedStudent);
    return updatedStudent;
  }

  // Direct login for student by their registered Google email (fallback when popup domain is unauthorized)
  static async signInStudentWithGoogleDirect(
    existingStudents: Student[],
    email: string
  ): Promise<{ student: Student; isNew: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw new Error('يرجى إدخال بريد إلكتروني صحيح (مثال: student@gmail.com).');
    }

    let matchedStudent = existingStudents.find(
      s => s.googleEmail && s.googleEmail.trim().toLowerCase() === cleanEmail
    );

    if (matchedStudent) {
      if (!matchedStudent.isGoogleLinked) {
        matchedStudent = { ...matchedStudent, isGoogleLinked: true };
        await OmranDataService.saveStudent(matchedStudent);
      }
      return { student: matchedStudent, isNew: false };
    }

    // Attempt matching local name before @
    const localPart = cleanEmail.split('@')[0];
    const normLocal = normalizeArabicText(localPart);
    if (normLocal.length >= 3) {
      matchedStudent = existingStudents.find(s => {
        const normS = normalizeArabicText(s.name);
        return normS.includes(normLocal) || normLocal.includes(normS);
      });
      if (matchedStudent) {
        const updated: Student = {
          ...matchedStudent,
          googleEmail: cleanEmail,
          isGoogleLinked: true
        };
        await OmranDataService.saveStudent(updated);
        return { student: updated, isNew: false };
      }
    }

    // Create new student
    const newStudentId = `std_g_${Date.now()}`;
    const newStudentName = cleanEmail.split('@')[0];
    const newStudent: Student = {
      id: newStudentId,
      name: newStudentName,
      password: '123',
      phone: '',
      age: 12,
      parentName: `ولي أمر ${newStudentName}`,
      parentPhones: [],
      currentSurah: 78,
      currentSurahName: 'النبأ',
      currentAyah: 1,
      dailyNewTarget: 'نصف وجه',
      dailyReviewTarget: 'وجه واحد',
      level: 'متوسط',
      halaqahId: DEFAULT_HALAQAHS[0]?.id || '',
      halaqahName: DEFAULT_HALAQAHS[0]?.name || '',
      googleEmail: cleanEmail,
      googleUid: `direct_${Date.now()}`,
      googleName: newStudentName,
      isGoogleLinked: true,
      createdAt: new Date().toISOString()
    };

    await OmranDataService.saveStudent(newStudent);
    return { student: newStudent, isNew: true };
  }

  // Link Google Account to a Teacher/Supervisor
  static async linkTeacherGoogleAccount(teacher: TeacherAccount): Promise<TeacherAccount> {
    let googleUser: { email: string; displayName: string; uid: string; photoURL?: string | null } | null = null;

    // 1. Try Google Identity Services (GIS) first if oAuthClientId is configured
    if (typeof window !== 'undefined' && firebaseConfig.oAuthClientId) {
      try {
        await loadGoogleGISScript();
        if (window.google?.accounts?.oauth2) {
          const gisRes = await requestAccessTokenViaGIS(firebaseConfig.oAuthClientId, ['email', 'profile']);
          if (gisRes?.email) {
            googleUser = {
              email: gisRes.email,
              displayName: gisRes.displayName || gisRes.email.split('@')[0],
              uid: `gis_${Date.now()}`,
              photoURL: gisRes.photoURL || null
            };
          }
        }
      } catch (gisErr) {
        console.warn('GIS Token client teacher notice:', gisErr);
      }
    }

    // 2. Fallback via Firebase Auth popup
    if (!googleUser) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          googleUser = {
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            uid: result.user.uid,
            photoURL: result.user.photoURL || null
          };
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (err?.code === 'auth/unauthorized-domain' || errMsg.includes('auth/unauthorized-domain')) {
          const domain = typeof window !== 'undefined' ? window.location.hostname : '';
          throw new UnauthorizedDomainError(domain, firebaseConfig.projectId);
        }
        if (err?.code === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed')) {
          throw new PopupClosedByUserError();
        }
        if (err?.code === 'auth/popup-blocked' || errMsg.includes('popup-blocked')) {
          throw new PopupBlockedError();
        }
        throw err;
      }
    }

    if (!googleUser || !googleUser.email) {
      throw new Error('تعذر استلام بيانات حساب Google.');
    }

    const targetEmail = googleUser.email.trim().toLowerCase();

    // Check if this Google account is already linked to another teacher or student
    try {
      const allTeachers = await OmranDataService.getTeachers();
      const duplicateTeacher = allTeachers.find(
        t => t.id !== teacher.id && t.isGoogleLinked && t.googleEmail?.trim().toLowerCase() === targetEmail
      );
      if (duplicateTeacher) {
        throw new Error('هذا الحساب مربوط بالفعل');
      }

      const allStudents = await OmranDataService.getStudents();
      const duplicateStudent = allStudents.find(
        s => s.isGoogleLinked && s.googleEmail?.trim().toLowerCase() === targetEmail
      );
      if (duplicateStudent) {
        throw new Error('هذا الحساب مربوط بالفعل');
      }
    } catch (checkErr: any) {
      if (checkErr.message === 'هذا الحساب مربوط بالفعل') {
        throw checkErr;
      }
      console.warn('Teacher duplicate account check warning:', checkErr);
    }

    const updatedTeacher: TeacherAccount = {
      ...teacher,
      googleEmail: targetEmail,
      googleUid: googleUser.uid,
      googleName: googleUser.displayName || teacher.name,
      googlePhotoUrl: googleUser.photoURL || teacher.googlePhotoUrl || null,
      isGoogleLinked: true
    };

    await OmranDataService.saveTeacher(updatedTeacher);
    return updatedTeacher;
  }

  // Unlink Google Account from a Teacher/Supervisor
  static async unlinkTeacherGoogleAccount(teacher: TeacherAccount): Promise<TeacherAccount> {
    const updatedTeacher: TeacherAccount = {
      ...teacher,
      googleEmail: null,
      googleUid: null,
      googleName: null,
      googlePhotoUrl: null,
      isGoogleLinked: false
    };

    await OmranDataService.saveTeacher(updatedTeacher);
    return updatedTeacher;
  }

  // Universal Sign-in with Google for Teachers, Supervisors, and Students
  static async signInUniversalWithGoogle(
    existingStudents: Student[],
    existingTeachers: TeacherAccount[]
  ): Promise<{
    userType: 'teacher' | 'student';
    role: 'admin' | 'student';
    teacher?: TeacherAccount;
    student?: Student;
    username: string;
    isNewStudent?: boolean;
  }> {
    let googleUser: { email: string; displayName: string; uid: string; photoURL?: string | null } | null = null;

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        googleUser = {
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          uid: result.user.uid,
          photoURL: result.user.photoURL || null
        };
      }
    } catch (popupErr: any) {
      if (popupErr.code === 'auth/popup-closed-by-user') {
        throw new PopupClosedByUserError();
      }
      if (popupErr.code === 'auth/popup-blocked') {
        throw new PopupBlockedError();
      }

      if (typeof window !== 'undefined' && firebaseConfig.oAuthClientId) {
        try {
          await loadGoogleGISScript();
          if (window.google?.accounts?.oauth2) {
            const gisRes = await requestAccessTokenViaGIS(firebaseConfig.oAuthClientId, ['email', 'profile']);
            if (gisRes?.email) {
              googleUser = {
                email: gisRes.email,
                displayName: gisRes.displayName || gisRes.email.split('@')[0],
                uid: `gis_${Date.now()}`,
                photoURL: gisRes.photoURL || null
              };
            }
          }
        } catch {
          // ignore GIS
        }
      }

      if (!googleUser) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : '';
        if (popupErr.code === 'auth/unauthorized-domain') {
          throw new UnauthorizedDomainError(domain, firebaseConfig.projectId);
        }
        throw popupErr;
      }
    }

    if (!googleUser || !googleUser.email) {
      throw new Error('تعذر استلام بيانات حساب Google.');
    }

    const cleanEmail = googleUser.email.trim().toLowerCase();
    const cleanName = googleUser.displayName ? googleUser.displayName.trim() : '';

    // 1. Check if matches any teacher / supervisor / developer by linked Google Email, UID, or developer account
    let matchedTeacher = existingTeachers.find(
      t => (t.googleEmail && t.googleEmail.trim().toLowerCase() === cleanEmail) ||
           (t.googleUid && t.googleUid === googleUser!.uid)
    );

    // Developer / Primary supervisor account detection (fds421885@gmail.com, admin, Mohamed Montaser)
    if (!matchedTeacher && (cleanEmail === 'fds421885@gmail.com' || cleanEmail.includes('admin') || cleanEmail.includes('supervisor') || cleanEmail.includes('montaser'))) {
      matchedTeacher = existingTeachers.find(t => t.role === 'developer' || t.id === 'teacher-1' || t.isPrimary);
    }

    if (!matchedTeacher && cleanName) {
      const normGoogleName = normalizeArabicText(cleanName);
      if (normGoogleName.includes('محمد منتصر') || normGoogleName.includes('منتصر')) {
        matchedTeacher = existingTeachers.find(t => t.role === 'developer' || t.id === 'teacher-1' || t.name.includes('منتصر'));
      }
    }

    if (matchedTeacher) {
      // Auto-link Google email if not already linked
      if (!matchedTeacher.isGoogleLinked || matchedTeacher.googleEmail !== cleanEmail) {
        const updatedTeacher: TeacherAccount = {
          ...matchedTeacher,
          googleEmail: cleanEmail,
          googleUid: googleUser.uid,
          googleName: cleanName || matchedTeacher.name,
          googlePhotoUrl: googleUser.photoURL || matchedTeacher.googlePhotoUrl || null,
          isGoogleLinked: true
        };
        await OmranDataService.saveTeacher(updatedTeacher);
        matchedTeacher = updatedTeacher;
      }

      return {
        userType: 'teacher',
        role: 'admin',
        teacher: matchedTeacher,
        username: matchedTeacher.name || matchedTeacher.username
      };
    }

    // 2. Check if matches any student by LINKED Google Email or UID
    // STRICT: Only previously linked students are allowed to sign in with Google
    let matchedStudent = existingStudents.find(
      s => s.isGoogleLinked && (
        (s.googleEmail && s.googleEmail.trim().toLowerCase() === cleanEmail) ||
        (s.googleUid && s.googleUid === googleUser!.uid)
      )
    );

    if (matchedStudent) {
      // Ensure this student is NOT actually a teacher/supervisor or named Mohamed Montaser
      const actualTeacher = existingTeachers.find(
        t => t.id === matchedStudent!.id ||
             (t.googleEmail && t.googleEmail.trim().toLowerCase() === cleanEmail) ||
             normalizeArabicText(t.name) === normalizeArabicText(matchedStudent!.name)
      );
      if (actualTeacher) {
        return {
          userType: 'teacher',
          role: 'admin',
          teacher: actualTeacher,
          username: actualTeacher.name || actualTeacher.username
        };
      }
      if (matchedStudent.name.includes('منتصر') || cleanName.includes('منتصر')) {
        const devTeacher = existingTeachers.find(t => t.role === 'developer' || t.id === 'teacher-1') || existingTeachers[0];
        return {
          userType: 'teacher',
          role: 'admin',
          teacher: devTeacher,
          username: devTeacher.name || devTeacher.username
        };
      }

      return {
        userType: 'student',
        role: 'student',
        student: matchedStudent,
        username: matchedStudent.name,
        isNewStudent: false
      };
    }

    // 3. STRICT RULE: If Google account is NOT linked to any teacher or student in the system,
    // IMMEDIATELY delete the newly created Firebase Auth user (so no orphan account remains), sign out, and throw UnregisteredGoogleAccountError.
    try {
      if (auth?.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (delErr) {
          console.warn('Could not delete auth user directly, falling back to sign out:', delErr);
          await auth.signOut();
        }
      }
    } catch {
      // ignore auth deletion error
    }

    throw new UnregisteredGoogleAccountError(cleanEmail);
  }

  // Look up Google Form response for a student by their registered Google email/name and save score automatically
  static async fetchAndRecordStudentGoogleFormScore(
    exam: Exam,
    student: Student,
    existingSubmissions: ExamSubmission[] = []
  ): Promise<{
    found: boolean;
    submission?: ExamSubmission;
    message: string;
  }> {
    if (!exam.googleFormId) {
      return { found: false, message: 'هذا الاختبار غير مرتبط بنموذج Google Form بعد.' };
    }

    // Strict registration check: only linked, registered platform students can take exams and record scores
    if (!student.isGoogleLinked || !student.googleEmail) {
      return {
        found: false,
        message: 'لا يمكن احتساب النتيجة: يجب أن يكون حسابك مسجلاً ومربوطاً بحساب Google على المنصة. فقط طلاب المنصة المسجلين هم من يستطيعون أداء الاختبار.'
      };
    }

    const token = await this.getValidAccessToken();
    if (!token) {
      return {
        found: false,
        message: 'يتطلب فحص نتائج Google Forms سحابياً اتصال وتفويض حساب المعلم أو المشرف بـ Google Workspace.'
      };
    }

    try {
      // 1. Fetch form structure
      const formMetaRes = await fetch(`https://forms.googleapis.com/v1/forms/${exam.googleFormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!formMetaRes.ok) {
        throw new Error('تعذر الاتصال بخدمة Google Forms لجلب بيانات النموذج.');
      }
      const formMeta = await formMetaRes.json();
      const items: any[] = formMeta.items || [];

      // 2. Fetch responses
      const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${exam.googleFormId}/responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!responsesRes.ok) {
        throw new Error('تعذر استيراد الردود من Google Forms.');
      }
      const responsesData = await responsesRes.json();
      const responses: any[] = responsesData.responses || [];

      if (responses.length === 0) {
        return {
          found: false,
          message: 'لم يتم العثور على أي تسليمات مسجلة في نموذج Google حتى الآن. تأكد من إكمال النموذج والضغط على (إرسال / Submit).'
        };
      }

      const cleanStudentEmail = (student.googleEmail || '').trim().toLowerCase();
      const normStudentName = normalizeArabicText(student.name);

      // Map question IDs
      const questionMap: Record<string, ExamQuestion> = {};
      let studentNameQId: string | null = null;
      let emailQId: string | null = null;

      items.forEach(item => {
        const qId = item.questionItem?.question?.questionId;
        const title = item.title || '';
        if (!qId) return;
        if (title.includes('اسم')) {
          studentNameQId = qId;
        } else if (title.includes('بريد') || title.includes('إيميل') || title.toLowerCase().includes('email')) {
          emailQId = qId;
        } else {
          const matched = exam.questions.find(eq => title.includes(eq.title) || eq.title.includes(title));
          if (matched) questionMap[qId] = matched;
        }
      });

      // Find the student's response (newest first)
      const sortedResponses = [...responses].reverse();

      // 1. First priority: Match by authenticated Google email (whichever name was typed in form is linked directly to this student)
      let matchedResponse = sortedResponses.find(resp => {
        const respondentEmail = (resp.respondentEmail || '').trim().toLowerCase();
        if (cleanStudentEmail && respondentEmail && respondentEmail === cleanStudentEmail) {
          return true;
        }

        const answersObj = resp.answers || {};
        if (emailQId && answersObj[emailQId]) {
          const val = answersObj[emailQId].textAnswers?.answers?.[0]?.value?.trim().toLowerCase();
          if (val && cleanStudentEmail && val === cleanStudentEmail) {
            return true;
          }
        }
        return false;
      });

      // 2. Secondary fallback (only if Google Forms settings did not record respondent email):
      if (!matchedResponse && normStudentName) {
        matchedResponse = sortedResponses.find(resp => {
          const answersObj = resp.answers || {};
          let respName = '';
          if (studentNameQId && answersObj[studentNameQId]) {
            respName = answersObj[studentNameQId].textAnswers?.answers?.[0]?.value?.trim() || '';
          }
          if (!respName) {
            for (const qId of Object.keys(answersObj)) {
              const it = items.find(i => i.questionItem?.question?.questionId === qId);
              if (it?.title?.includes('اسم')) {
                respName = answersObj[qId].textAnswers?.answers?.[0]?.value?.trim() || '';
                break;
              }
            }
          }

          if (respName) {
            const normRespName = normalizeArabicText(respName);
            return normRespName === normStudentName || normRespName.includes(normStudentName) || normStudentName.includes(normRespName);
          }
          return false;
        });
      }

      if (!matchedResponse) {
        return {
          found: false,
          message: `لم يتم العثور على تسليم مسجل بحساب Google الخاص بك (${cleanStudentEmail}). يرجى التأكد من تسليم النموذج من نفس حساب Google المسجل في المنصة والضغط على زر الإرسال (Submit).`
        };
      }

      // Calculate score
      const answersObj = matchedResponse.answers || {};
      const answers: ExamSubmissionAnswer[] = [];
      let totalScore = 0;
      let hasPendingEssay = false;

      if (typeof matchedResponse.totalSubmittedGrade === 'number') {
        totalScore = matchedResponse.totalSubmittedGrade;
      }

      exam.questions.forEach(q => {
        let studentAnsText = '';
        for (const [formQId, examQ] of Object.entries(questionMap)) {
          if (examQ.id === q.id && answersObj[formQId]) {
            const txt = answersObj[formQId].textAnswers?.answers || [];
            studentAnsText = txt.map((a: any) => a.value).join(', ');
            break;
          }
        }

        const isAuto = q.type === 'multiple_choice' || q.type === 'true_false';
        let isCorrect = false;
        let points = 0;

        if (isAuto && q.correctAnswer !== undefined) {
          if (studentAnsText.toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
            isCorrect = true;
            points = q.points;
          }
        } else if (!isAuto) {
          hasPendingEssay = true;
        }

        if (typeof matchedResponse.totalSubmittedGrade !== 'number' && isCorrect) {
          totalScore += points;
        }

        answers.push({
          questionId: q.id,
          questionTitle: q.title,
          questionType: q.type,
          studentAnswer: studentAnsText || 'تمت الإجابة في Google Forms',
          isAutoGraded: isAuto,
          isCorrect: isAuto ? isCorrect : undefined,
          pointsEarned: points,
          maxPoints: q.points
        });
      });

      const maxPossibleScore = exam.totalPoints || exam.questions.reduce((s, q) => s + q.points, 0) || 100;
      const percentage = Math.round((totalScore / maxPossibleScore) * 100);

      const previousAttempts = existingSubmissions.filter(s => s.examId === exam.id && s.studentId === student.id);
      const attemptNumber = previousAttempts.length + 1;

      const submission: ExamSubmission = {
        id: `sub-${exam.id}-${student.id}-${Date.now()}`,
        examId: exam.id,
        examTitle: exam.title,
        studentId: student.id,
        studentName: student.name,
        studentGoogleEmail: cleanStudentEmail,
        halaqahId: student.halaqahId || '',
        halaqahName: student.halaqahName || 'الحلقة',
        attemptNumber,
        answers,
        totalScoreEarned: totalScore,
        maxPossibleScore,
        percentage,
        pointsGrantedForLeaderboard: exam.grantsLeaderboardPoints ? totalScore : 0,
        status: hasPendingEssay ? 'needs_grading' : 'completed',
        submittedAt: matchedResponse.lastSubmittedTime || matchedResponse.createTime || new Date().toISOString()
      };

      // Save submission directly to Firestore
      await OmranDataService.saveSubmission(submission);

      return {
        found: true,
        submission,
        message: `تم العثور على إجاباتك بحسابك Google بنجاح! درجتك المحصلة: ${totalScore} من ${maxPossibleScore} (${percentage}%) وتم قيدها في سجلك ولوحة الشرف فوراً!`
      };
    } catch (err: any) {
      console.error('Error fetching Google Form score for student:', err);
      return {
        found: false,
        message: `حدث خطأ أثناء فحص النتيجة من Google Forms: ${err?.message || 'يرجى المحاولة مجدداً.'}`
      };
    }
  }

  // Link Supervisor Google Account with Google Forms and Sheets permissions
  static async linkGoogleAccount(): Promise<{ email: string; accessToken: string }> {
    // 1. Try Google Identity Services (GIS) first if oAuthClientId is present
    if (typeof window !== 'undefined' && firebaseConfig.oAuthClientId) {
      try {
        await loadGoogleGISScript();
        if (window.google?.accounts?.oauth2) {
          const gisRes = await requestAccessTokenViaGIS(firebaseConfig.oAuthClientId, GOOGLE_SCOPES);
          if (gisRes?.accessToken) {
            inMemoryGoogleAccessToken = gisRes.accessToken;
            const config: GoogleOAuthConfig = {
              connectedEmail: gisRes.email,
              connectedAt: new Date().toISOString(),
              isLinked: true,
              lastSyncAt: new Date().toISOString(),
              accessToken: gisRes.accessToken,
              savedInCloud: true
            };
            await this.saveGoogleAuthConfig(config);
            return gisRes;
          }
        }
      } catch (gisErr: any) {
        console.warn('GIS Token client attempt notice:', gisErr?.message || gisErr);
      }
    }

    // 2. Firebase Auth popup fallback
    try {
      const provider = new GoogleAuthProvider();
      GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error('لم نتمكن من الحصول على رمز تفويض حساب Google.');
      }

      inMemoryGoogleAccessToken = accessToken;
      const email = result.user.email || 'حساب Google المتصل';

      const config: GoogleOAuthConfig = {
        connectedEmail: email,
        connectedAt: new Date().toISOString(),
        isLinked: true,
        lastSyncAt: new Date().toISOString(),
        accessToken: accessToken,
        savedInCloud: true
      };

      await this.saveGoogleAuthConfig(config);
      return { email, accessToken };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (err?.code === 'auth/unauthorized-domain' || errMsg.includes('auth/unauthorized-domain')) {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'النطاق الحالي';
        console.warn(`[Firebase Auth Notice] Unauthorized domain detected: ${currentDomain}`);
        throw new UnauthorizedDomainError(currentDomain, firebaseConfig.projectId);
      }
      if (err?.code === 'auth/popup-closed-by-user' || errMsg.includes('auth/popup-closed-by-user')) {
        console.warn('[Firebase Auth Notice] Popup closed by user or environment before sign-in completed.');
        throw new PopupClosedByUserError();
      }
      if (err?.code === 'auth/popup-blocked' || errMsg.includes('auth/popup-blocked')) {
        console.warn('[Firebase Auth Notice] Popup blocked by browser.');
        throw new PopupBlockedError();
      }
      if (err?.code === 'auth/cancelled-popup-request' || errMsg.includes('auth/cancelled-popup-request')) {
        throw new Error('تم إلغاء طلب تسجيل الدخول نظراً لفتح نافذة جديدة. يرجى المحاولة مجدداً.');
      }
      throw err;
    }
  }

  // Disconnect Google Account from Firestore
  static async disconnectGoogleAccount(): Promise<void> {
    inMemoryGoogleAccessToken = null;
    const config: GoogleOAuthConfig = {
      isLinked: false,
      connectedEmail: undefined,
      accessToken: undefined,
      lastSyncAt: new Date().toISOString(),
      savedInCloud: true
    };
    await this.saveGoogleAuthConfig(config);
  }

  // Developer Feature: Select or switch to ANY Google Account for Complex Database Migration
  // Forces Google to show the account picker ('prompt: select_account') so the developer can choose
  // any of their Google accounts or click 'Use another account' to log in with the client's/complex's Google account!
  static async selectAnyGoogleAccountForMigration(): Promise<{
    email: string;
    displayName?: string;
    photoURL?: string | null;
    accessToken?: string;
  }> {
    // 1. Try Google Identity Services (GIS) if oAuthClientId is configured
    if (typeof window !== 'undefined' && firebaseConfig.oAuthClientId) {
      try {
        await loadGoogleGISScript();
        if (window.google?.accounts?.oauth2) {
          const gisRes = await requestAccessTokenViaGIS(firebaseConfig.oAuthClientId, ['email', 'profile']);
          if (gisRes?.email) {
            return {
              email: gisRes.email,
              displayName: gisRes.displayName,
              photoURL: gisRes.photoURL,
              accessToken: gisRes.accessToken
            };
          }
        }
      } catch (gisErr: any) {
        console.warn('GIS Token client migration chooser notice:', gisErr?.message || gisErr);
      }
    }

    // 2. Firebase Auth popup fallback with explicit prompt: select_account
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      const email = result.user.email || '';
      if (!email) {
        throw new Error('لم يتم استلام بريد حساب Google.');
      }

      return {
        email,
        displayName: result.user.displayName || undefined,
        photoURL: result.user.photoURL || undefined,
        accessToken
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (err?.code === 'auth/unauthorized-domain' || errMsg.includes('auth/unauthorized-domain')) {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'النطاق الحالي';
        throw new UnauthorizedDomainError(currentDomain, firebaseConfig.projectId);
      }
      if (err?.code === 'auth/popup-closed-by-user' || errMsg.includes('auth/popup-closed-by-user')) {
        throw new PopupClosedByUserError();
      }
      if (err?.code === 'auth/popup-blocked' || errMsg.includes('auth/popup-blocked')) {
        throw new PopupBlockedError();
      }
      throw err;
    }
  }

  // Create Google Form and linked Google Sheet for an Exam
  static async createGoogleFormAndSheet(exam: Exam, tokenOverride?: string): Promise<{
    formId: string;
    formEditUrl: string;
    responderUrl: string;
    spreadsheetId?: string;
    spreadsheetUrl?: string;
  }> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      throw new Error('يرجى ربط حساب Google أولاً لإنشاء نموذج Google Form وجدول Google Sheets.');
    }

    // 1. Create the Form
    const omranFormTitle = `﷽ ${exam.title} - منصة عُمْرَان القرآنية`;
    const createFormRes = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        info: {
          title: exam.title,
          documentTitle: omranFormTitle
        }
      })
    });

    if (!createFormRes.ok) {
      const errText = await createFormRes.text();
      throw new Error(`تعذر إنشاء نموذج Google Forms: ${errText}`);
    }

    const formData = await createFormRes.json();
    const formId = formData.formId;
    const formEditUrl = `https://docs.google.com/forms/d/${formId}/edit`;
    const responderUrl = formData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;

    const descriptionText = [
      '۞ مَنَصَّةُ عُمْرَانَ لِحِلَقِ القُرْآنِ الكَرِيمِ ۞',
      '═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═',
      `• عنوان الاختبار: ${exam.title}`,
      `• إجمالي درجات الاختبار: ${exam.totalPoints} درجات`,
      exam.description ? `• إرشادات وتوجيهات المعلم: ${exam.description}` : '',
      '═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═',
      '【تعليمات هامة للطالب الكريم】:',
      '1. اكتب اسمك الرباعي الكامل المسجل في منصة عمران بدقة لاحتساب درجاتك تلقائياً في لوحة الشرف.',
      '2. أجب عن كافة الأسئلة ثم اضغط زر (إرسال / Submit).',
      '3. ستنتقل درجاتك فوراً إلى سجلك في لوحة شرف المنصة بعد المزامنة.'
    ].filter(Boolean).join('\n');

    // 2. Prepare items for Google Form batchUpdate
    const requests: any[] = [
      {
        updateFormInfo: {
          info: {
            title: omranFormTitle,
            description: descriptionText
          },
          updateMask: 'title,description'
        }
      },
      {
        createItem: {
          item: {
            title: 'اسم الطالب الثلاثي الكامل (كما هو مسجل في منصة عُمْرَان)',
            description: 'يرجى كتابة اسمك الثلاثي بدقة لاحتساب نتيجتك ونقاطك في لوحة شرف المنصة تلقائياً',
            questionItem: {
              question: {
                required: true,
                textQuestion: {
                  paragraph: false
                }
              }
            }
          },
          location: {
            index: 0
          }
        }
      }
    ];

    // Add each exam question to Google Form
    if (exam.questions && exam.questions.length > 0) {
      exam.questions.forEach((q, idx) => {
        const questionIndex = idx + 1;
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          const rawOptions = q.options && q.options.length > 0
            ? q.options
            : q.type === 'true_false'
            ? ['صح', 'خطأ']
            : ['الخيار 1', 'الخيار 2'];
          
          const cleanOptions = Array.from(new Set(rawOptions.map(o => String(o || '').trim()).filter(Boolean)));
          const finalOptions = cleanOptions.length > 0 ? cleanOptions : ['الخيار 1', 'الخيار 2'];

          requests.push({
            createItem: {
              item: {
                title: `${q.title} (${q.points} درجات)`,
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: 'RADIO',
                      options: finalOptions.map(opt => ({ value: opt })),
                      shuffle: false
                    }
                  }
                }
              },
              location: {
                index: questionIndex
              }
            }
          });
        } else {
          requests.push({
            createItem: {
              item: {
                title: `${q.title} (${q.points} درجات - سؤال كتابي)`,
                description: q.explanation ? `إرشاد: ${q.explanation}` : undefined,
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: {
                      paragraph: q.type === 'essay'
                    }
                  }
                }
              },
              location: {
                index: questionIndex
              }
            }
          });
        }
      });
    }

    try {
      const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (!updateRes.ok) {
        console.warn('Google Form batch update warning:', await updateRes.text());
      }
    } catch (updateErr) {
      console.warn('Batch update to Google Form encountered an issue:', updateErr);
    }

    // 3. Create linked Google Spreadsheet without unsupported locale
    let spreadsheetId: string | undefined;
    let spreadsheetUrl: string | undefined;

    try {
      const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `نتائج: ${exam.title} - منصة عُمْرَان القرآنية`
            // DO NOT include locale: 'ar_SA' (causes 400 INVALID_ARGUMENT)
          },
          sheets: [
            {
              properties: {
                title: 'التسليمات والدرجات',
                gridProperties: {
                  frozenRowCount: 1
                },
                rightToLeft: true
              }
            }
          ]
        })
      });

      if (createSheetRes.ok) {
        const sheetData = await createSheetRes.json();
        spreadsheetId = sheetData.spreadsheetId;
        spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

        // Write header row
        const headers = [
          'اسم الطالب',
          'الحلقة',
          'رقم المحاولة',
          'تاريخ ووقت التسليم',
          'الدرجة المحصلة',
          'الدرجة القصوى',
          'النسبة المئوية',
          'نقاط لوحة الشرف',
          'حالة التصحيح',
          'ملاحظات المعلم'
        ];

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:J1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'A1:J1',
            majorDimension: 'ROWS',
            values: [headers]
          })
        });
      }
    } catch (sheetErr) {
      console.warn('Could not create Google Sheet:', sheetErr);
    }

    return {
      formId,
      formEditUrl,
      responderUrl,
      spreadsheetId,
      spreadsheetUrl
    };
  }

  // Update an existing Google Form on Google's cloud with updated exam title, description, and questions
  static async updateGoogleForm(
    exam: Exam,
    tokenOverride?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!exam.googleFormId) {
      return { success: false, message: 'لا يوجد مُعرّف نموذج Google Form لهذا الاختبار.' };
    }

    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      return { success: false, message: 'يرجى ربط حساب Google أولاً لتحديث النموذج سحابياً.' };
    }

    try {
      // 1. Fetch current items from Google Forms API so we can replace them cleanly
      const formMetaRes = await fetch(`https://forms.googleapis.com/v1/forms/${exam.googleFormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!formMetaRes.ok) {
        const errText = await formMetaRes.text();
        return { success: false, message: `تعذر جلب تفاصيل النموذج من Google: ${errText}` };
      }

      const formMetaData = await formMetaRes.json();
      const existingItems: any[] = formMetaData.items || [];

      const omranFormTitle = `﷽ ${exam.title} - منصة عُمْرَان القرآنية`;
      const descriptionText = [
        '۞ مَنَصَّةُ عُمْرَانَ لِحِلَقِ القُرْآنِ الكَرِيمِ ۞',
        '═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═',
        `• عنوان الاختبار: ${exam.title}`,
        `• إجمالي درجات الاختبار: ${exam.totalPoints} درجات`,
        exam.description ? `• إرشادات وتوجيهات المعلم: ${exam.description}` : '',
        '═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═',
        '【تعليمات هامة للطالب الكريم】:',
        '1. اكتب اسمك الرباعي الكامل المسجل في منصة عمران بدقة لاحتساب درجاتك تلقائياً في لوحة الشرف.',
        '2. أجب عن كافة الأسئلة ثم اضغط زر (إرسال / Submit).',
        '3. ستنتقل درجاتك فوراً إلى سجلك في لوحة شرف المنصة بعد المزامنة.'
      ].filter(Boolean).join('\n');

      const requests: any[] = [
        {
          updateFormInfo: {
            info: {
              title: omranFormTitle,
              description: descriptionText
            },
            updateMask: 'title,description'
          }
        }
      ];

      // Delete old items in reverse order to keep indexes valid
      for (let i = existingItems.length - 1; i >= 0; i--) {
        requests.push({
          deleteItem: {
            location: { index: i }
          }
        });
      }

      // Re-create Student Name Item at index 0
      requests.push({
        createItem: {
          item: {
            title: 'اسم الطالب الثلاثي الكامل (كما هو مسجل في منصة عُمْرَان)',
            description: 'يرجى كتابة اسمك الثلاثي بدقة لاحتساب نتيجتك ونقاطك في لوحة شرف المنصة تلقائياً',
            questionItem: {
              question: {
                required: true,
                textQuestion: {
                  paragraph: false
                }
              }
            }
          },
          location: { index: 0 }
        }
      });

      // Add each updated question
      if (exam.questions && exam.questions.length > 0) {
        exam.questions.forEach((q, idx) => {
          const questionIndex = idx + 1;
          if (q.type === 'multiple_choice' || q.type === 'true_false') {
            const rawOptions = q.options && q.options.length > 0
              ? q.options
              : q.type === 'true_false'
              ? ['صح', 'خطأ']
              : ['الخيار 1', 'الخيار 2'];
            const cleanOptions = Array.from(new Set(rawOptions.map(o => String(o || '').trim()).filter(Boolean)));
            const finalOptions = cleanOptions.length > 0 ? cleanOptions : ['الخيار 1', 'الخيار 2'];

            requests.push({
              createItem: {
                item: {
                  title: `${q.title} (${q.points} درجات)`,
                  questionItem: {
                    question: {
                      required: true,
                      choiceQuestion: {
                        type: 'RADIO',
                        options: finalOptions.map(opt => ({ value: opt })),
                        shuffle: false
                      }
                    }
                  }
                },
                location: { index: questionIndex }
              }
            });
          } else {
            requests.push({
              createItem: {
                item: {
                  title: `${q.title} (${q.points} درجات - سؤال كتابي)`,
                  description: q.explanation ? `إرشاد: ${q.explanation}` : undefined,
                  questionItem: {
                    question: {
                      required: true,
                      textQuestion: {
                        paragraph: q.type === 'essay'
                      }
                    }
                  }
                },
                location: { index: questionIndex }
              }
            });
          }
        });
      }

      // Execute batchUpdate on Google Forms API
      const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${exam.googleFormId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        return { success: false, message: `تعذر إرسال التحديث لـ Google Forms: ${errText}` };
      }

      return { success: true, message: 'تم تحديث نموذج Google Forms سحابياً بنجاح.' };
    } catch (e: any) {
      console.error('Error updating Google Form:', e);
      return { success: false, message: e?.message || 'فشل الاتصال بـ Google Forms لتحديث الاختبار.' };
    }
  }

  // Sync Submissions to Google Sheet
  static async syncSubmissionsToSheet(
    spreadsheetId: string,
    submissions: ExamSubmission[],
    tokenOverride?: string
  ): Promise<boolean> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token || !spreadsheetId) return false;

    try {
      const rows = submissions.map(sub => [
        sub.studentName,
        sub.halaqahName || 'الحلقة',
        `المحاولة ${sub.attemptNumber}`,
        new Date(sub.submittedAt).toLocaleString('ar-SA'),
        sub.totalScoreEarned,
        sub.maxPossibleScore,
        `${sub.percentage}%`,
        sub.pointsGrantedForLeaderboard,
        sub.status === 'completed' ? 'تم التصحيح والاعتماد' : 'بانتظار تصحيح المقالي',
        sub.teacherGeneralFeedback || ''
      ]);

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'A2',
            majorDimension: 'ROWS',
            values: rows
          })
        }
      );

      return appendRes.ok;
    } catch (e) {
      console.error('Error syncing to Google Sheet:', e);
      return false;
    }
  }

  // Import / Sync Responses directly from Google Form API
  static async importResponsesFromGoogleForm(
    exam: Exam,
    allStudents: { id: string; name: string; halaqahId?: string }[],
    existingSubmissions: ExamSubmission[] = [],
    tokenOverride?: string
  ): Promise<{ newCount: number; updatedCount: number; importedSubmissions: ExamSubmission[] }> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      throw new Error('يرجى تسجيل الدخول بحساب Google أولاً لمزامنة إجابات Google Forms.');
    }
    if (!exam.googleFormId) {
      throw new Error('هذا الاختبار غير مرتبط بنموذج Google Forms بعد.');
    }

    // 1. Fetch form metadata to map item IDs to questions
    const formMetaRes = await fetch(`https://forms.googleapis.com/v1/forms/${exam.googleFormId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!formMetaRes.ok) {
      throw new Error(`تعذر قراءة بيانات النموذج: ${await formMetaRes.text()}`);
    }
    const formMeta = await formMetaRes.json();
    const items: any[] = formMeta.items || [];

    const questionMap: { [questionId: string]: { examQ: ExamQuestion; title: string } } = {};
    let studentNameQuestionId: string | null = null;

    items.forEach(item => {
      const qTitle = item.title || '';
      const qId = item.questionItem?.question?.questionId;
      if (!qId) return;

      if (qTitle.includes('اسم الطالب')) {
        studentNameQuestionId = qId;
      } else {
        const matched = exam.questions.find(
          eq => qTitle.includes(eq.title) || eq.title.includes(qTitle)
        );
        if (matched) {
          questionMap[qId] = { examQ: matched, title: qTitle };
        }
      }
    });

    // 2. Fetch responses
    const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${exam.googleFormId}/responses`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!responsesRes.ok) {
      throw new Error(`تعذر استيراد الردود من Google Forms: ${await responsesRes.text()}`);
    }
    const responsesData = await responsesRes.json();
    const responses: any[] = responsesData.responses || [];

    let newCount = 0;
    let updatedCount = 0;
    const importedSubmissions: ExamSubmission[] = [];

    for (const resp of responses) {
      const respId = resp.responseId;
      const submittedAt = resp.lastSubmittedTime || resp.createTime || new Date().toISOString();
      const answersObj = resp.answers || {};

      let studentName = '';
      if (studentNameQuestionId && answersObj[studentNameQuestionId]) {
        const textAnswers = answersObj[studentNameQuestionId].textAnswers?.answers || [];
        if (textAnswers.length > 0) {
          studentName = textAnswers[0].value?.trim() || '';
        }
      }

      if (!studentName) {
        for (const qId of Object.keys(answersObj)) {
          const item = items.find(it => it.questionItem?.question?.questionId === qId);
          if (item?.title?.includes('اسم')) {
            const val = answersObj[qId].textAnswers?.answers?.[0]?.value?.trim();
            if (val) {
              studentName = val;
              break;
            }
          }
        }
      }

      if (!studentName) {
        studentName = `طالب (${respId.slice(0, 6)})`;
      }

      const normInput = normalizeArabicText(studentName);
      const matchedStudent = allStudents.find(st => {
        const normSt = normalizeArabicText(st.name);
        return normSt === normInput ||
               normSt.includes(normInput) ||
               normInput.includes(normSt);
      });

      const studentId = matchedStudent?.id || `ext_${respId}`;
      const halaqahId = matchedStudent?.halaqahId || 'unassigned';
      const halaqahName = (matchedStudent as any)?.halaqahName || 'الحلقة المعتمدة';

      const submissionAnswers: any[] = [];
      let totalEarned = 0;
      let hasEssayPending = false;

      exam.questions.forEach(q => {
        let studentAnsText = '';
        for (const [formQId, qMeta] of Object.entries(questionMap)) {
          if (qMeta.examQ.id === q.id && answersObj[formQId]) {
            const txtAns = answersObj[formQId].textAnswers?.answers || [];
            studentAnsText = txtAns.map((a: any) => a.value).join(', ');
            break;
          }
        }

        const isAutoGraded = q.type === 'multiple_choice' || q.type === 'true_false';
        let isCorrect = false;
        let pointsEarned = 0;

        if (isAutoGraded && studentAnsText) {
          const expected = String(q.correctAnswer || '').trim().toLowerCase();
          const actual = studentAnsText.trim().toLowerCase();
          if (actual === expected) {
            isCorrect = true;
            pointsEarned = q.points;
          }
        } else if (q.type === 'essay') {
          hasEssayPending = true;
        }

        totalEarned += pointsEarned;

        submissionAnswers.push({
          questionId: q.id,
          questionTitle: q.title,
          questionType: q.type,
          studentAnswer: studentAnsText,
          isAutoGraded,
          isCorrect: isAutoGraded ? isCorrect : undefined,
          pointsEarned,
          maxPoints: q.points
        });
      });

      const maxPossibleScore = exam.totalPoints;
      const percentage = maxPossibleScore > 0 ? Math.round((totalEarned / maxPossibleScore) * 100) : 0;
      const pointsGrantedForLeaderboard = exam.grantsLeaderboardPoints ? totalEarned : 0;

      const existingIdx = existingSubmissions.findIndex(
        s => s.id === `gform_${respId}` || (s.studentId === studentId && s.examId === exam.id && s.submittedAt === submittedAt)
      );

      const submissionData: ExamSubmission = {
        id: `gform_${respId}`,
        examId: exam.id,
        examTitle: exam.title,
        studentId,
        studentName: matchedStudent?.name || studentName,
        halaqahId,
        halaqahName,
        attemptNumber: 1,
        answers: submissionAnswers,
        totalScoreEarned: totalEarned,
        maxPossibleScore,
        percentage,
        status: hasEssayPending ? 'needs_grading' : 'completed',
        pointsGrantedForLeaderboard,
        submittedAt
      };

      if (existingIdx >= 0) {
        updatedCount++;
      } else {
        newCount++;
      }
      importedSubmissions.push(submissionData);
    }

    for (const sub of importedSubmissions) {
      await setDoc(doc(db, 'exam_submissions', sub.id), JSON.parse(JSON.stringify(sub)));
    }

    return {
      newCount,
      updatedCount,
      importedSubmissions
    };
  }

  // Batch sync responses for ALL active Google Form exams at once
  static async syncAllGoogleFormExams(
    exams: Exam[],
    allStudents: { id: string; name: string; halaqahId?: string; halaqahName?: string }[],
    existingSubmissions: ExamSubmission[] = [],
    tokenOverride?: string
  ): Promise<{
    syncedExamsCount: number;
    totalNewCount: number;
    totalUpdatedCount: number;
    errors: string[];
  }> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      throw new Error('يرجى تسجيل الدخول بحساب Google أولاً لمزامنة إجابات Google Forms.');
    }

    const gformExams = exams.filter(
      ex => ex.deliveryMode === 'google_form' && Boolean(ex.googleFormId)
    );

    let totalNewCount = 0;
    let totalUpdatedCount = 0;
    let syncedExamsCount = 0;
    const errors: string[] = [];

    for (const ex of gformExams) {
      try {
        const res = await this.importResponsesFromGoogleForm(
          ex,
          allStudents,
          existingSubmissions,
          token
        );
        totalNewCount += res.newCount;
        totalUpdatedCount += res.updatedCount;
        syncedExamsCount++;
      } catch (err: any) {
        console.warn(`Could not sync Google Form responses for exam ${ex.title}:`, err);
        errors.push(`${ex.title}: ${err?.message || 'تعذر جلب الردود'}`);
      }
    }

    return {
      syncedExamsCount,
      totalNewCount,
      totalUpdatedCount,
      errors
    };
  }

  // Export any Exam results / Student Submissions directly to a brand new Google Spreadsheet
  static async exportExamResultsToGoogleSheet(
    title: string,
    submissions: ExamSubmission[],
    tokenOverride?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      throw new Error('يرجى ربط وتفويض حساب Google أولاً لتصدير النتائج إلى Google Sheets.');
    }

    const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `نتائج: ${title} - منصة عُمْرَان القرآنية`
          // DO NOT include locale: 'ar_SA' (causes 400 INVALID_ARGUMENT)
        },
        sheets: [
          {
            properties: {
              title: 'النتائج والتسليمات',
              gridProperties: {
                frozenRowCount: 1
              },
              rightToLeft: true
            }
          }
        ]
      })
    });

    if (!createSheetRes.ok) {
      const err = await createSheetRes.json().catch(() => ({}));
      const errMsg = err?.error?.message || (await createSheetRes.text().catch(() => ''));
      if (createSheetRes.status === 401) {
        throw new Error('انتهت صلاحية جلسة Google، يرجى إعادة ربط وتفويض الحساب مجدداً.');
      }
      throw new Error(`تعذر إنشاء جدول Google Sheets: ${errMsg || 'خطأ غير معروف'}`);
    }

    const sheetData = await createSheetRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const headers = [
      'اسم الطالب',
      'الحلقة',
      'عنوان الاختبار',
      'رقم المحاولة',
      'تاريخ ووقت التسليم',
      'الدرجة المحصلة',
      'الدرجة القصوى',
      'النسبة المئوية',
      'نقاط لوحة الشرف',
      'حالة التصحيح',
      'ملاحظات المعلم وتوجيهاته'
    ];

    const rows = submissions.map(sub => [
      sub.studentName,
      sub.halaqahName || 'الحلقة',
      sub.examTitle,
      `المحاولة ${sub.attemptNumber}`,
      new Date(sub.submittedAt).toLocaleString('ar-SA'),
      sub.totalScoreEarned,
      sub.maxPossibleScore,
      `${sub.percentage}%`,
      sub.pointsGrantedForLeaderboard,
      sub.status === 'completed' ? 'تم الاعتماد' : 'بانتظار التصحيح',
      sub.teacherGeneralFeedback || ''
    ]);

    const valuesToInsert = [headers, ...rows];

    const valuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:K${valuesToInsert.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `A1:K${valuesToInsert.length}`,
          majorDimension: 'ROWS',
          values: valuesToInsert
        })
      }
    );

    if (!valuesRes.ok) {
      console.warn('Values update response not ok:', await valuesRes.text());
    }

    return { spreadsheetId, spreadsheetUrl };
  }

  // Export Students Roster to a clean Google Spreadsheet
  static async exportStudentsToGoogleSheet(
    students: Student[],
    halaqahs: Halaqah[],
    tokenOverride?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      throw new Error('يرجى ربط وتفويض حساب Google أولاً لتصدير سجل الطلاب إلى Google Sheets.');
    }

    const halaqahMap = new Map<string, string>();
    halaqahs.forEach(h => halaqahMap.set(h.id, h.name));

    const dateStr = new Date().toLocaleDateString('ar-SA');
    const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `سجل طلاب منصة عُمْرَان القرآنية - ${dateStr}`
        },
        sheets: [
          {
            properties: {
              title: 'قائمة الطلاب',
              gridProperties: { frozenRowCount: 1 },
              rightToLeft: true
            }
          }
        ]
      })
    });

    if (!createSheetRes.ok) {
      const err = await createSheetRes.json().catch(() => ({}));
      const errMsg = err?.error?.message || (await createSheetRes.text().catch(() => ''));
      throw new Error(`تعذر إنشاء جدول الطلاب: ${errMsg || 'خطأ غير معروف'}`);
    }

    const sheetData = await createSheetRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const headers = [
      'اسم الطالب',
      'الحلقة القرآنية',
      'رقم هاتف الطالب',
      'هاتف ولي الأمر',
      'السورة الحالية',
      'الآية الحالية',
      'ورد الحفظ القادم',
      'مقرر المراجعة',
      'المستوى',
      'كلمة المرور'
    ];

    const rows = students.map(s => [
      s.name,
      halaqahMap.get(s.halaqahId || '') || s.halaqahName || 'حلقة غير محددة',
      s.phone || 'غير مسجل',
      s.parentPhones?.join(', ') || 'غير مسجل',
      s.currentSurahName || '',
      s.currentAyah || 1,
      s.dailyNewTarget || 'غير محدد',
      s.dailyReviewTarget || 'غير محدد',
      s.level || 'متوسط',
      s.password || '123'
    ]);

    const valuesToInsert = [headers, ...rows];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:L${valuesToInsert.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `A1:L${valuesToInsert.length}`,
          majorDimension: 'ROWS',
          values: valuesToInsert
        })
      }
    );

    return { spreadsheetId, spreadsheetUrl };
  }

  // Export Attendance Log to Google Sheets
  static async exportAttendanceToGoogleSheet(
    attendance: AttendanceRecord[],
    students: Student[],
    tokenOverride?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      throw new Error('يرجى ربط وتفويض حساب Google أولاً لتصدير سجل الحضور إلى Google Sheets.');
    }

    const studentMap = new Map<string, Student>();
    students.forEach(s => studentMap.set(s.id, s));

    const dateStr = new Date().toLocaleDateString('ar-SA');
    const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `سجل حضور وغياب منصة عُمْرَان القرآنية - ${dateStr}`
        },
        sheets: [
          {
            properties: {
              title: 'سجل الحضور والغياب',
              gridProperties: { frozenRowCount: 1 },
              rightToLeft: true
            }
          }
        ]
      })
    });

    if (!createSheetRes.ok) {
      const err = await createSheetRes.json().catch(() => ({}));
      const errMsg = err?.error?.message || (await createSheetRes.text().catch(() => ''));
      throw new Error(`تعذر إنشاء جدول الحضور: ${errMsg || 'خطأ غير معروف'}`);
    }

    const sheetData = await createSheetRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const headers = [
      'التاريخ',
      'اسم الطالب',
      'حالة الحضور',
      'ملاحظات الغياب أو التأخر'
    ];

    const rows = attendance.map(a => [
      a.date,
      studentMap.get(a.studentId)?.name || 'طالب غير محدد',
      a.status,
      a.note || ''
    ]);

    const valuesToInsert = [headers, ...rows];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:D${valuesToInsert.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `A1:D${valuesToInsert.length}`,
          majorDimension: 'ROWS',
          values: valuesToInsert
        })
      }
    );

    return { spreadsheetId, spreadsheetUrl };
  }

  // Export Complete Multi-Tab Platform Backup to Google Sheets
  static async exportFullPlatformBackupToGoogleSheet(
    backup: FullBackupData,
    tokenOverride?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const token = tokenOverride || (await this.getValidAccessToken());
    if (!token) {
      throw new Error('يرجى ربط وتفويض حساب Google أولاً لتصدير النسخة الاحتياطية إلى Google Sheets.');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `نسخة احتياطية شاملة - منصة عُمْرَان القرآنية (${dateStr})`
        },
        sheets: [
          {
            properties: {
              title: 'الطلاب',
              gridProperties: { frozenRowCount: 1 },
              rightToLeft: true
            }
          },
          {
            properties: {
              title: 'الحضور والغياب',
              gridProperties: { frozenRowCount: 1 },
              rightToLeft: true
            }
          },
          {
            properties: {
              title: 'التسميع والتقييمات',
              gridProperties: { frozenRowCount: 1 },
              rightToLeft: true
            }
          },
          {
            properties: {
              title: 'الاختبارات',
              gridProperties: { frozenRowCount: 1 },
              rightToLeft: true
            }
          },
          {
            properties: {
              title: 'تسليمات الاختبارات',
              gridProperties: { frozenRowCount: 1 },
              rightToLeft: true
            }
          }
        ]
      })
    });

    if (!createSheetRes.ok) {
      const err = await createSheetRes.json().catch(() => ({}));
      const errMsg = err?.error?.message || (await createSheetRes.text().catch(() => ''));
      throw new Error(`تعذر إنشاء جدول النسخة الاحتياطية: ${errMsg || 'خطأ غير معروف'}`);
    }

    const sheetData = await createSheetRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 1. Populate Students Sheet
    const studentHeaders = ['المعرف', 'الاسم', 'الحلقة', 'رقم الهاتف', 'هاتف ولي الأمر', 'المستوى'];
    const studentRows = (backup.students || []).map(s => [
      s.id,
      s.name,
      s.halaqahName || s.halaqahId || '',
      s.phone || '',
      s.parentPhones?.join(', ') || '',
      s.level || ''
    ]);
    const studentValues = [studentHeaders, ...studentRows];

    // 2. Populate Attendance Sheet
    const attHeaders = ['المعرف', 'التاريخ', 'معرف الطالب', 'الحالة', 'ملاحظات'];
    const attRows = (backup.attendance || []).map(a => [
      a.id,
      a.date,
      a.studentId,
      a.status,
      a.note || ''
    ]);
    const attValues = [attHeaders, ...attRows];

    // 3. Populate Evaluations Sheet
    const evalHeaders = ['المعرف', 'التاريخ', 'معرف الطالب', 'التسميع الجديد', 'المراجعة', 'ملاحظات المعلم'];
    const evalRows = (backup.evaluations || []).map(e => [
      e.id,
      e.date,
      e.studentId,
      e.recitationDetails?.newMemorizationAchieved || '',
      e.recitationDetails?.reviewAchieved || '',
      e.recitationDetails?.teacherNotes || ''
    ]);
    const evalValues = [evalHeaders, ...evalRows];

    // 4. Populate Exams Sheet
    const examHeaders = ['المعرف', 'عنوان الاختبار', 'النمط', 'إجمالي الدرجات', 'رابط Google Form', 'رابط Google Sheet'];
    const examRows = (backup.exams || []).map(ex => [
      ex.id,
      ex.title,
      ex.deliveryMode === 'google_form' ? 'Google Forms' : 'منصة عمران',
      ex.totalPoints,
      ex.googleFormResponderUrl || ex.googleFormUrl || '',
      ex.googleSpreadsheetUrl || ''
    ]);
    const examValues = [examHeaders, ...examRows];

    // 5. Populate Submissions Sheet
    const subHeaders = ['المعرف', 'عنوان الاختبار', 'اسم الطالب', 'المحاولة', 'الدرجة', 'النسبة', 'التاريخ'];
    const subRows = (backup.submissions || []).map(sub => [
      sub.id,
      sub.examTitle,
      sub.studentName,
      sub.attemptNumber,
      `${sub.totalScoreEarned} / ${sub.maxPossibleScore}`,
      `${sub.percentage}%`,
      sub.submittedAt
    ]);
    const subValues = [subHeaders, ...subRows];

    // Write all sheets in parallel
    await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'الطلاب'!A1:G${studentValues.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: `'الطلاب'!A1:G${studentValues.length}`, majorDimension: 'ROWS', values: studentValues })
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'الحضور والغياب'!A1:E${attValues.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: `'الحضور والغياب'!A1:E${attValues.length}`, majorDimension: 'ROWS', values: attValues })
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'التسميع والتقييمات'!A1:F${evalValues.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: `'التسميع والتقييمات'!A1:F${evalValues.length}`, majorDimension: 'ROWS', values: evalValues })
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'الاختبارات'!A1:F${examValues.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: `'الاختبارات'!A1:F${examValues.length}`, majorDimension: 'ROWS', values: examValues })
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'تسليمات الاختبارات'!A1:G${subValues.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: `'تسليمات الاختبارات'!A1:G${subValues.length}`, majorDimension: 'ROWS', values: subValues })
      })
    ]);

    return { spreadsheetId, spreadsheetUrl };
  }

  /**
   * Export JSON Backup directly into Google Drive in a dedicated timestamped file
   * (النسخ الاحتياطي في Google Drive مع التاريخ والساعة في مجلد مخصص)
   */
  static async exportBackupToGoogleDrive(
    backup: FullBackupData,
    authConfig?: GoogleOAuthConfig
  ): Promise<{ fileId: string; fileName: string; folderName: string; webViewLink: string }> {
    const token = await this.getValidAccessToken();
    if (!token) {
      throw new Error('حساب Google غير متصل أو انتهت صلاحية الجلسة. يرجى ربط حساب Google أولاً.');
    }

    const folderName = 'نسخ منصة عمران القرآنية الاحتياطية';

    // 1. Search for existing backup folder or create it
    let folderId: string | null = null;
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`)}&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
        }
      }
    } catch (e) {
      console.warn('Error searching for backup folder:', e);
    }

    if (!folderId) {
      const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'مجلد مخصص لحفظ النسخ الاحتياطية لمنصة عمران القرآنية'
        })
      });

      if (!createFolderRes.ok) {
        const err = await createFolderRes.json().catch(() => ({}));
        throw new Error(`تعذر إنشاء مجلد النسخ في Google Drive: ${err?.error?.message || createFolderRes.statusText}`);
      }
      const folderData = await createFolderRes.json();
      folderId = folderData.id;
    }

    // 2. Prepare timestamped file name
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const fileName = `omran_backup_${timeFormatted}.json`;

    // 3. Upload JSON file to Google Drive via multipart
    const metadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
      mimeType: 'application/json',
      description: `نسخة احتياطية كاملة لمنصة عمران القرآنية تم تصديرها بتاريخ ${now.toLocaleString('ar-SA')}`
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const jsonContent = JSON.stringify(backup, null, 2);

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(`فشل رفع النسخة الاحتياطية إلى Google Drive: ${err?.error?.message || uploadRes.statusText}`);
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.id;
    const webViewLink = uploadData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return {
      fileId,
      fileName,
      folderName,
      webViewLink
    };
  }

  /**
   * Upload PDF document or custom report directly to Google Drive
   */
  static async uploadPDFToDrive(
    pdfBlob: Blob,
    fileName: string,
    folderName: string = 'تقارير منصة عمران القرآنية'
  ): Promise<{ fileId: string; fileName: string; folderName: string; webViewLink: string }> {
    const token = await this.getValidAccessToken();
    if (!token) {
      throw new Error('حساب Google غير متصل أو انتهت صلاحية الجلسة. يرجى ربط حساب Google أولاً.');
    }

    // 1. Search for existing reports folder or create it
    let folderId: string | null = null;
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`)}&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
        }
      }
    } catch (e) {
      console.warn('Error searching for reports folder:', e);
    }

    if (!folderId) {
      const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'مجلد مخصص لحفظ وأرشفة تقارير وشهادات منصة عمران القرآنية'
        })
      });

      if (createFolderRes.ok) {
        const folderData = await createFolderRes.json();
        folderId = folderData.id;
      }
    }

    // 2. Upload file via multipart request
    const metadata = {
      name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
      parents: folderId ? [folderId] : [],
      mimeType: 'application/pdf',
      description: `تقرير قرآني صادر ومؤرشف من منصة عمران بتاريخ ${new Date().toLocaleString('ar-SA')}`
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = new Blob(
      [
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/pdf\r\n\r\n'
      ],
      { type: 'text/plain' }
    );

    const closePart = new Blob([closeDelimiter], { type: 'text/plain' });
    const fullBody = new Blob([metadataPart, pdfBlob, closePart], {
      type: `multipart/related; boundary=${boundary}`
    });

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fullBody
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(`فشل رفع التقرير إلى Google Drive: ${err?.error?.message || uploadRes.statusText}`);
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.id;
    const webViewLink = uploadData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return {
      fileId,
      fileName: metadata.name,
      folderName,
      webViewLink
    };
  }
}
