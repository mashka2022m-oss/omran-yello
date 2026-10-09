import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  UserCheck,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Navigation,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  Check,
  X,
  Building2,
  Users,
  Compass,
  AlertCircle,
  UserPlus,
  Eye
} from 'lucide-react';
import { MosqueLocationMapModal } from '../MosqueLocationMapModal';
import {
  TeacherAccount,
  TeacherShift,
  MosqueItem,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  calculateHaversineDistanceMeters,
  QuranComplex
} from '../../types';
import { OmranDataService } from '../../lib/firebase';
import { triggerComplexThemePulse } from '../../utils/highlightHelper';

interface TeacherAttendanceTabProps {
  teachers: TeacherAccount[];
  currentTeacher?: TeacherAccount;
  currentUserName?: string;
  isSupervisor?: boolean;
  isDeveloper?: boolean;
  activeComplex?: QuranComplex | null;
  initialHighlightId?: string;
}

export const TeacherAttendanceTab: React.FC<TeacherAttendanceTabProps> = ({
  teachers = [],
  currentTeacher,
  currentUserName,
  isSupervisor = false,
  isDeveloper = false,
  activeComplex,
  initialHighlightId
}) => {
  const isSupervisorOrDev = isSupervisor || isDeveloper;
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (initialHighlightId) {
      setTimeout(() => {
        triggerComplexThemePulse(initialHighlightId);
      }, 350);
    }
  }, [initialHighlightId]);

  // Selected date for supervisor attendance records (default: today)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active view mode: 'records' | 'shifts' | 'mosques' | 'self'
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'shifts' | 'mosques' | 'self'>(
    isSupervisorOrDev ? 'records' : 'self'
  );
  const isSupervisorSelfMode = activeSubTab === 'self';

  // Quick Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Mosques List State (قائمة الجوامع والمساجد المضافة)
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [isLoadingMosques, setIsLoadingMosques] = useState(true);
  const [isMosqueModalOpen, setIsMosqueModalOpen] = useState(false);
  const [editingMosqueId, setEditingMosqueId] = useState<string | null>(null);
  const [mosqueNameInput, setMosqueNameInput] = useState('');
  const [mosqueNeighborhoodInput, setMosqueNeighborhoodInput] = useState('');
  const [mosqueRadiusInput, setMosqueRadiusInput] = useState<string>('100');
  const [capturedMosqueLocation, setCapturedMosqueLocation] = useState<{ lat?: number; lng?: number } | null>(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [gpsCaptureMsg, setGpsCaptureMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Google Maps Interactive Modal State (اطلاع / تحديد وتعديل)
  const [mapModalMosque, setMapModalMosque] = useState<MosqueItem | null>(null);
  const [mapModalMode, setMapModalMode] = useState<'view' | 'picker'>('view');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const handleOpenMosqueMap = (mosque: MosqueItem, mode: 'view' | 'picker' = 'view') => {
    setMapModalMosque(mosque);
    setMapModalMode(mode);
    setIsMapModalOpen(true);
  };

  const handleSaveMosqueLocationFromMap = async (mosqueId: string, lat: number, lng: number, radiusMeters?: number) => {
    const target = mosques.find(m => m.id === mosqueId);
    if (!target) return;
    const finalRadius = radiusMeters ?? target.allowedRadiusMeters ?? 100;
    const updated: MosqueItem = {
      ...target,
      latitude: lat,
      longitude: lng,
      allowedRadiusMeters: finalRadius,
      isLocationSet: true
    };
    setMosques(prev => prev.map(m => (m.id === mosqueId ? updated : m)));
    setCapturedMosqueLocation({ lat, lng });
    setMosqueRadiusInput(String(finalRadius));
    try {
      await OmranDataService.saveMosque(updated);
    } catch (e) {
      console.warn('Error saving mosque location:', e);
    }
    showToast(`تم تثبيت موقع (${updated.name}) بنطاق ${finalRadius} متر على الخريطة بنجاح!`);
  };

  // 2. Shifts State (فترات ومناوبات الدوام)
  const [shifts, setShifts] = useState<TeacherShift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [isAddingNewMosqueInShift, setIsAddingNewMosqueInShift] = useState(false);
  const [newMosqueNameInShift, setNewMosqueNameInShift] = useState('');
  const [shiftForm, setShiftForm] = useState<{
    name: string;
    mosqueId: string;
    checkInStart: string;
    checkInEnd: string;
    checkOutStart: string;
    checkOutEnd: string;
    assignedTeacherIds: string[];
  }>({
    name: 'الفترة العصرية',
    mosqueId: '',
    checkInStart: '15:30',
    checkInEnd: '16:00',
    checkOutStart: '17:30',
    checkOutEnd: '18:00',
    assignedTeacherIds: []
  });

  // 3. Attendance Records State
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);

  // Teacher check-in loading & error feedback
  const [isPerformingCheckIn, setIsPerformingCheckIn] = useState(false);
  const [isPerformingCheckOut, setIsPerformingCheckOut] = useState(false);
  const [checkInFeedback, setCheckInFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Supervisor Manual Action Modal
  const [actionTeacherModal, setActionTeacherModal] = useState<{
    teacher: TeacherAccount;
    shift: TeacherShift;
    actionType: 'check_in' | 'check_out' | 'excuse' | 'absent' | 'late';
  } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [customTime, setCustomTime] = useState('');

  // Search in records
  const [searchTeacherQuery, setSearchTeacherQuery] = useState('');

  // Dedicated Quick-Assign Teachers Modal State
  const [assignTeachersModalShift, setAssignTeachersModalShift] = useState<TeacherShift | null>(null);
  const [assignTeachersSearch, setAssignTeachersSearch] = useState('');
  const [selectedAssignedTeacherIds, setSelectedAssignedTeacherIds] = useState<string[]>([]);

  // Helper for Arabic Time format (e.g. 03:45 م)
  const formatCurrentArabicTime = (dateObj: Date = new Date()) => {
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const isPM = hours >= 12;
    hours = hours % 12 || 12;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)} ${isPM ? 'م' : 'ص'}`;
  };

  // Helper for parsing time string "HH:mm" to minutes from midnight
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };

  // Initial Data Load
  useEffect(() => {
    let isMounted = true;

    async function loadAll() {
      setIsLoadingMosques(true);
      setIsLoadingShifts(true);
      setIsLoadingAttendance(true);
      try {
        const complexId = activeComplex?.id;
        const [loadedMosques, loadedShifts, loadedAtt] = await Promise.all([
          OmranDataService.loadMosques(complexId),
          OmranDataService.loadTeacherShifts(complexId),
          OmranDataService.loadTeacherAttendance(selectedDate, complexId)
        ]);

        if (!isMounted) return;

        // Initialize default mosque if none exist (100 meters default radius)
        let finalMosques = loadedMosques;
        if (loadedMosques.length === 0) {
          const defaultMosque: MosqueItem = {
            id: `mosque_${Date.now()}`,
            name: activeComplex?.name || 'جامع المجمع الرئيسي',
            neighborhood: 'مقر الحلقات',
            complexId: activeComplex?.id,
            latitude: 24.7136,
            longitude: 46.6753,
            allowedRadiusMeters: 100,
            isLocationSet: false,
            createdAt: new Date().toISOString()
          };
          await OmranDataService.saveMosque(defaultMosque);
          finalMosques = [defaultMosque];
        }
        setMosques(finalMosques);

        // Initialize default shift if none exist
        let finalShifts = loadedShifts;
        if (loadedShifts.length === 0) {
          const defaultShift: TeacherShift = {
            id: `shift_${Date.now()}`,
            name: 'الفترة العصرية الرسمية',
            complexId: activeComplex?.id,
            mosqueId: finalMosques[0]?.id || '',
            mosqueName: finalMosques[0]?.name || 'جامع المجمع الرئيسي',
            checkInStart: '15:30',
            checkInEnd: '16:00',
            checkOutStart: '17:30',
            checkOutEnd: '18:00',
            assignedTeacherIds: teachers.map(t => t.id),
            createdAt: new Date().toISOString()
          };
          await OmranDataService.saveTeacherShift(defaultShift);
          finalShifts = [defaultShift];
        }
        setShifts(finalShifts);

        setAttendanceRecords(loadedAtt);
      } catch (e) {
        // Fallback gracefully without console noise
      } finally {
        if (isMounted) {
          setIsLoadingMosques(false);
          setIsLoadingShifts(false);
          setIsLoadingAttendance(false);
        }
      }
    }

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, activeComplex?.id, teachers.length]);

  // =========================================================================
  // 1. Mosques Management Handlers
  // =========================================================================
  const handleOpenAddMosqueModal = () => {
    setEditingMosqueId(null);
    setMosqueNameInput('');
    setMosqueNeighborhoodInput('');
    setMosqueRadiusInput('100');
    setCapturedMosqueLocation(null);
    setGpsCaptureMsg(null);
    setIsMosqueModalOpen(true);
  };

  const handleOpenEditMosqueModal = (mosque: MosqueItem) => {
    setEditingMosqueId(mosque.id);
    setMosqueNameInput(mosque.name);
    setMosqueNeighborhoodInput(mosque.neighborhood || '');
    setMosqueRadiusInput(String(mosque.allowedRadiusMeters || 100));
    setCapturedMosqueLocation(
      mosque.isLocationSet && mosque.latitude && mosque.longitude
        ? { lat: mosque.latitude, lng: mosque.longitude }
        : null
    );
    setGpsCaptureMsg(
      mosque.isLocationSet
        ? { type: 'success', text: 'الموقع الجغرافي لهذا الجامع محدد مسبقاً بنجاح' }
        : null
    );
    setIsMosqueModalOpen(true);
  };

  // Simple one-click GPS capture without exposing numbers/coordinates to the user
  const handleCaptureCurrentLocationForMosque = () => {
    setIsCapturingGPS(true);
    setGpsCaptureMsg(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsCaptureMsg({
        type: 'error',
        text: 'متصفحك لا يدعم تحديد الموقع الجغرافي (GPS).'
      });
      setIsCapturingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setCapturedMosqueLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsCaptureMsg({
          type: 'success',
          text: 'تم التقاط موقع الجامع الحالي بنجاح بنقرة واحدة!'
        });
        setIsCapturingGPS(false);
      },
      err => {
        setIsCapturingGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsCaptureMsg({
            type: 'error',
            text: 'يرجى السماح بإذن الوصول إلى الموقع في المتصفح للالتقاط.'
          });
        } else {
          setGpsCaptureMsg({
            type: 'error',
            text: 'تعذر التقاط الموقع حالياً، يرجى التأكد من تشغيل الـ GPS.'
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveMosque = async () => {
    const trimmed = mosqueNameInput.trim();
    if (!trimmed) {
      showToast('يرجى إدخال اسم الجامع أو المسجد', 'error');
      return;
    }

    const mosqueId = editingMosqueId || `mosque_${Date.now()}`;
    const existing = mosques.find(m => m.id === mosqueId);
    const complexId = activeComplex?.id || 'default_complex';

    const parsedRadius = parseInt(mosqueRadiusInput, 10);
    const finalRadius = !isNaN(parsedRadius) && parsedRadius > 0 ? parsedRadius : 100;

    const newMosque: MosqueItem = {
      id: mosqueId,
      name: trimmed,
      neighborhood: mosqueNeighborhoodInput.trim() || undefined,
      complexId,
      latitude: capturedMosqueLocation?.lat ?? existing?.latitude,
      longitude: capturedMosqueLocation?.lng ?? existing?.longitude,
      allowedRadiusMeters: finalRadius,
      isLocationSet: Boolean(capturedMosqueLocation?.lat || (existing?.isLocationSet && existing?.latitude)),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    setMosques(prev => [...prev.filter(m => m.id !== newMosque.id), newMosque]);
    setIsMosqueModalOpen(false);

    try {
      await OmranDataService.saveMosque(newMosque);
    } catch (e) {
      // quiet fallback
    }

    showToast(editingMosqueId ? 'تم تحديث بيانات الجامع بنجاح!' : 'تم حفظ الجامع الجديد بنجاح!');
  };

  const handleDeleteMosque = async (mosqueId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجامع؟')) return;
    setMosques(prev => prev.filter(m => m.id !== mosqueId));
    try {
      await OmranDataService.deleteMosque(mosqueId);
    } catch (e) {
      // quiet fallback
    }
    showToast('تم حذف الجامع بنجاح');
  };

  // =========================================================================
  // 2. Shifts Management Handlers
  // =========================================================================
  const handleOpenAssignTeachersModal = (shift: TeacherShift) => {
    setAssignTeachersModalShift(shift);
    setSelectedAssignedTeacherIds(shift.assignedTeacherIds || []);
    setAssignTeachersSearch('');
  };

  const handleSaveAssignedTeachers = async () => {
    if (!assignTeachersModalShift) return;
    const shiftId = assignTeachersModalShift.id;
    const updatedShift: TeacherShift = {
      ...assignTeachersModalShift,
      assignedTeacherIds: selectedAssignedTeacherIds
    };

    setShifts(prev => prev.map(s => (s.id === shiftId ? updatedShift : s)));
    setAssignTeachersModalShift(null);

    try {
      await OmranDataService.saveTeacherShift(updatedShift);
      showToast('تم تعيين وتكليف المعلمين في فترة الدوام بنجاح!');
      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      } catch {
        // ignore
      }
    } catch (e) {
      showToast('تم حفظ التعيين بنجاح!');
    }
  };

  const handleOpenAddShiftModal = () => {
    setEditingShiftId(null);
    setIsAddingNewMosqueInShift(mosques.length === 0);
    setNewMosqueNameInShift('');
    setShiftForm({
      name: 'الفترة العصرية',
      mosqueId: mosques[0]?.id || '',
      checkInStart: '15:30',
      checkInEnd: '16:00',
      checkOutStart: '17:30',
      checkOutEnd: '18:00',
      assignedTeacherIds: teachers.map(t => t.id)
    });
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShiftModal = (shift: TeacherShift) => {
    setEditingShiftId(shift.id);
    setIsAddingNewMosqueInShift(false);
    setNewMosqueNameInShift('');
    setShiftForm({
      name: shift.name,
      mosqueId: shift.mosqueId || mosques[0]?.id || '',
      checkInStart: shift.checkInStart,
      checkInEnd: shift.checkInEnd,
      checkOutStart: shift.checkOutStart,
      checkOutEnd: shift.checkOutEnd,
      assignedTeacherIds: shift.assignedTeacherIds || []
    });
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async () => {
    const shiftNameTrimmed = shiftForm.name.trim();
    if (!shiftNameTrimmed) {
      showToast('يرجى إدخال اسم فترة الدوام', 'error');
      return;
    }

    const shiftId = editingShiftId || `shift_${Date.now()}`;
    const complexId = activeComplex?.id || 'default_complex';

    let selectedMosqueId = shiftForm.mosqueId;
    let selectedMosqueName = '';

    // If user typed a new mosque name inline inside the shift modal
    if (newMosqueNameInShift.trim()) {
      const newMName = newMosqueNameInShift.trim();
      const newMId = `mosque_${Date.now()}`;
      const createdMosque: MosqueItem = {
        id: newMId,
        name: newMName,
        complexId,
        neighborhood: 'مسجد الدوام',
        allowedRadiusMeters: 100,
        isLocationSet: false,
        createdAt: new Date().toISOString()
      };
      setMosques(prev => [...prev.filter(m => m.id !== newMId), createdMosque]);
      try {
        await OmranDataService.saveMosque(createdMosque);
      } catch (e) {
        // quiet fallback
      }
      selectedMosqueId = newMId;
      selectedMosqueName = newMName;
      setNewMosqueNameInShift('');
      setIsAddingNewMosqueInShift(false);
    } else {
      const matchM = mosques.find(m => m.id === selectedMosqueId) || mosques[0];
      selectedMosqueId = matchM?.id || '';
      selectedMosqueName = matchM?.name || activeComplex?.name || 'جامع الحلقات';
    }

    const shift: TeacherShift = {
      id: shiftId,
      name: shiftNameTrimmed,
      complexId,
      mosqueId: selectedMosqueId,
      mosqueName: selectedMosqueName,
      checkInStart: shiftForm.checkInStart || '15:30',
      checkInEnd: shiftForm.checkInEnd || '16:00',
      checkOutStart: shiftForm.checkOutStart || '17:30',
      checkOutEnd: shiftForm.checkOutEnd || '18:00',
      assignedTeacherIds: shiftForm.assignedTeacherIds || [],
      createdAt: new Date().toISOString()
    };

    // Instant optimistic update with zero lag
    setShifts(prev => [...prev.filter(s => s.id !== shift.id), shift]);
    setIsShiftModalOpen(false);

    try {
      await OmranDataService.saveTeacherShift(shift);
    } catch (e) {
      // quiet fallback
    }

    try {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
    } catch {
      // ignore
    }
    showToast(editingShiftId ? 'تم تحديث وتعيين فترة الدوام بنجاح!' : 'تم إنشاء وتعيين فترة الدوام بنجاح!');
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف فترة الدوام هذه؟')) return;
    setShifts(prev => prev.filter(s => s.id !== shiftId));
    try {
      await OmranDataService.deleteTeacherShift(shiftId);
    } catch (e) {
      // quiet fallback
    }
    showToast('تم حذف فترة الدوام بنجاح');
  };

  // =========================================================================
  // 3. Dynamic Status Calculation Helper (Absence after departure, 'لم ينصرف')
  // =========================================================================
  const getTeacherShiftDynamicStatus = (
    shift: TeacherShift,
    record?: TeacherAttendanceRecord,
    recordDate: string = selectedDate
  ) => {
    // If supervisor manually set excuse or absent or explicit record
    if (record?.status === 'معتذر') {
      return { status: 'معتذر', displayStatus: 'معتذر', isPendingCheckout: false, didNotCheckOut: false };
    }
    if (record?.status === 'غائب') {
      return { status: 'غائب', displayStatus: 'غائب', isPendingCheckout: false, didNotCheckOut: false };
    }

    const isToday = recordDate === todayStr;
    const isPastDate = recordDate < todayStr;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const checkInStartMin = parseTimeToMinutes(shift.checkInStart);
    const checkInEndMin = parseTimeToMinutes(shift.checkInEnd || shift.checkInStart);
    const checkOutStartMin = parseTimeToMinutes(shift.checkOutStart);
    const checkOutEndMin = parseTimeToMinutes(shift.checkOutEnd || shift.checkOutStart);

    const hasCheckedIn = Boolean(record?.checkInTime);
    const hasCheckedOut = Boolean(record?.checkOutTime);

    // 1. If teacher checked in:
    if (hasCheckedIn) {
      const baseStatus = record?.status || 'حاضر';
      // Check if departure time has ended without checkout
      const checkOutEnded = isPastDate || (isToday && checkOutEndMin > 0 && currentMinutes > checkOutEndMin);
      if (!hasCheckedOut && checkOutEnded) {
        return {
          status: baseStatus,
          displayStatus: `${baseStatus} (لم ينصرف)`,
          isPendingCheckout: true,
          didNotCheckOut: true
        };
      }
      return {
        status: baseStatus,
        displayStatus: hasCheckedOut ? `${baseStatus} (تم الانصراف)` : baseStatus,
        isPendingCheckout: false,
        didNotCheckOut: false
      };
    }

    // 2. If teacher has NOT checked in:
    // If departure time arrived (or past date), teacher is immediately marked as غائب
    const departureArrived = isPastDate || (isToday && checkOutStartMin > 0 && currentMinutes >= checkOutStartMin);
    if (departureArrived) {
      return {
        status: 'غائب',
        displayStatus: 'غائب',
        isPendingCheckout: false,
        didNotCheckOut: false
      };
    }

    // If before departure time:
    if (isToday) {
      if (checkInStartMin > 0 && currentMinutes < checkInStartMin) {
        return { status: 'في انتظار التحضير', displayStatus: 'في انتظار التحضير', isPendingCheckout: false, didNotCheckOut: false };
      }
      if (checkInEndMin > 0 && currentMinutes > checkInEndMin) {
        return { status: 'متأخر (لم يحضر)', displayStatus: 'متأخر (لم يحضر)', isPendingCheckout: false, didNotCheckOut: false };
      }
      return { status: 'في انتظار التحضير', displayStatus: 'وقت التحضير متاح', isPendingCheckout: false, didNotCheckOut: false };
    }

    return { status: 'غائب', displayStatus: 'غائب', isPendingCheckout: false, didNotCheckOut: false };
  };

  // =========================================================================
  // 3. Teacher Self-Attendance Check-In / Check-Out
  // =========================================================================
  const handleTeacherCheckIn = async (targetShift: TeacherShift) => {
    const teacherId = currentTeacher?.id || (isSupervisorOrDev ? 'supervisor-self' : '');
    const teacherName = currentTeacher?.name || currentUserName || 'المعلم';
    if (!teacherId) return;

    setIsPerformingCheckIn(true);
    setCheckInFeedback(null);

    // Rule 1: Timing validation - Cannot check in before start of check-in time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const checkInStartMin = parseTimeToMinutes(targetShift.checkInStart);
    const checkInEndMin = parseTimeToMinutes(targetShift.checkInEnd || targetShift.checkInStart);

    if (checkInStartMin > 0 && currentMinutes < checkInStartMin) {
      setCheckInFeedback({
        type: 'error',
        text: `عذراً، لا يمكنك تسجيل الحضور قبل موعد بداية التحضير (${targetShift.checkInStart})! يبدأ التحضير في الوقت المحدد، يرجى الانتظار.`
      });
      setIsPerformingCheckIn(false);
      return;
    }

    // Determine status: "حاضر" if on-time (<= checkInEnd), or "متأخر" if late (> checkInEnd)
    const isLate = checkInEndMin > 0 && currentMinutes > checkInEndMin;
    const determinedStatus: TeacherAttendanceStatus = isLate ? 'متأخر' : 'حاضر';

    // Identify target mosque for this shift
    const targetMosque = mosques.find(m => m.id === targetShift.mosqueId) || mosques[0];

    if (!navigator.geolocation) {
      setCheckInFeedback({
        type: 'error',
        text: 'متصفحك لا يدعم تحديد الموقع الجغرافي (GPS).'
      });
      setIsPerformingCheckIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          // Verify mosque has configured location
          if (!targetMosque || !targetMosque.isLocationSet || !targetMosque.latitude || !targetMosque.longitude) {
            setCheckInFeedback({
              type: 'error',
              text: `عذراً، لم يتم ضبط الموقع الجغرافي لجامع (${targetMosque?.name || targetShift.name}) بعد على الخريطة من قِبل المشرف. يلزم ضبط موقع الجامع أولاً للتحقق من النطاق المسموح.`
            });
            setIsPerformingCheckIn(false);
            return;
          }

          // Check mosque radius (default 100 meters, or supervisor configured)
          const distance = calculateHaversineDistanceMeters(
            userLat,
            userLng,
            targetMosque.latitude,
            targetMosque.longitude
          );
          const allowedRadius = targetMosque.allowedRadiusMeters || 100;

          if (distance > allowedRadius) {
            const distDisplay = distance >= 1000 ? `${(distance / 1000).toFixed(2)} كم (${Math.round(distance)} متر)` : `${Math.round(distance)} متر`;
            const allowedDisplay = allowedRadius >= 1000 ? `${(allowedRadius / 1000).toFixed(2)} كم (${allowedRadius} متر)` : `${allowedRadius} متر`;
            setCheckInFeedback({
              type: 'error',
              text: `عذراً، أنت خارج نطاق (${targetMosque.name})! المسافة الحالية تقريباً ${distDisplay}، والمدى المسموح للتحضير هو ${allowedDisplay} فقط.`
            });
            setIsPerformingCheckIn(false);
            return;
          }

          // Within range! Record check-in
          const timeStr = formatCurrentArabicTime();
          const recId = `tatt_${selectedDate}_${targetShift.id}_${teacherId}`;
          const existing = attendanceRecords.find(r => r.id === recId);

          const record: TeacherAttendanceRecord = {
            id: recId,
            date: selectedDate,
            shiftId: targetShift.id,
            shiftName: targetShift.name,
            teacherId,
            teacherName,
            complexId: activeComplex?.id,
            mosqueId: targetMosque?.id,
            mosqueName: targetMosque?.name,
            status: determinedStatus,
            checkInTime: timeStr,
            checkInTimestamp: new Date().toISOString(),
            checkInLatitude: userLat,
            checkInLongitude: userLng,
            checkInDistanceMeters: Math.round(distance),
            checkOutTime: existing?.checkOutTime,
            checkOutTimestamp: existing?.checkOutTimestamp,
            recordedBy: 'self',
            createdAt: existing?.createdAt || new Date().toISOString()
          };

          await OmranDataService.saveTeacherAttendanceRecord(record);
          setAttendanceRecords(prev => [...prev.filter(r => r.id !== record.id), record]);

          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 }
          });

          setCheckInFeedback({
            type: 'success',
            text: isLate
              ? `تم تسجيل حضورك (متأخر) في (${targetMosque?.name || targetShift.name}) في تمام الساعة ${timeStr}!`
              : `تم تسجيل حضورك بنجاح في (${targetMosque?.name || targetShift.name}) في تمام الساعة ${timeStr}!`
          });
        } catch (e) {
          setCheckInFeedback({
            type: 'error',
            text: 'حدث خطأ أثناء حفظ التحضير. يرجى إعادة المحاولة.'
          });
        } finally {
          setIsPerformingCheckIn(false);
        }
      },
      err => {
        setIsPerformingCheckIn(false);
        setCheckInFeedback({
          type: 'error',
          text: err.code === err.PERMISSION_DENIED
            ? 'تم رفض إذن الوصول إلى الموقع. يرجى تفعيل الـ GPS في متصفحك أو هاتفك.'
            : 'تعذر تحديد موقعك الحالي. يرجى التأكد من تشغيل الـ GPS.'
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleTeacherCheckOut = async (targetShift: TeacherShift) => {
    const teacherId = currentTeacher?.id || (isSupervisorOrDev ? 'supervisor-self' : '');
    const teacherName = currentTeacher?.name || currentUserName || 'المعلم';
    if (!teacherId) return;

    setIsPerformingCheckOut(true);
    setCheckInFeedback(null);

    // Rule 1: Teacher must have recorded check-in first
    const recId = `tatt_${selectedDate}_${targetShift.id}_${teacherId}`;
    const existing = attendanceRecords.find(r => r.id === recId);
    if (!existing || !existing.checkInTime) {
      setCheckInFeedback({
        type: 'error',
        text: 'يرجى تسجيل الحضور أولاً قبل تسجيل الانصراف.'
      });
      setIsPerformingCheckOut(false);
      return;
    }

    // Rule 2: Timing validation - Cannot check out before check-out start!
    // "واي انصراف بعد الوقت عادي لكن قبل الوقت لا يمكنه الانصراف"
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const checkOutStartMin = parseTimeToMinutes(targetShift.checkOutStart);

    if (checkOutStartMin > 0 && currentMinutes < checkOutStartMin) {
      setCheckInFeedback({
        type: 'error',
        text: `عذراً، لا يمكنك تسجيل الانصراف قبل وقت الانصراف المحدد (${targetShift.checkOutStart})! يرجى إكمال فترة الدوام حتى حلول موعد الانصراف.`
      });
      setIsPerformingCheckOut(false);
      return;
    }

    const targetMosque = mosques.find(m => m.id === targetShift.mosqueId) || mosques[0];

    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          // Verify mosque has configured location
          if (!targetMosque || !targetMosque.isLocationSet || !targetMosque.latitude || !targetMosque.longitude) {
            setCheckInFeedback({
              type: 'error',
              text: `عذراً، لم يتم ضبط الموقع الجغرافي لجامع (${targetMosque?.name || targetShift.name}) بعد على الخريطة من قِبل المشرف. يلزم ضبط موقع الجامع أولاً لتسجيل الانصراف.`
            });
            setIsPerformingCheckOut(false);
            return;
          }

          // Check mosque radius (default 100 meters, or supervisor configured)
          const distance = calculateHaversineDistanceMeters(
            userLat,
            userLng,
            targetMosque.latitude,
            targetMosque.longitude
          );
          const allowedRadius = targetMosque.allowedRadiusMeters || 100;

          if (distance > allowedRadius) {
            const distDisplay = distance >= 1000 ? `${(distance / 1000).toFixed(2)} كم (${Math.round(distance)} متر)` : `${Math.round(distance)} متر`;
            const allowedDisplay = allowedRadius >= 1000 ? `${(allowedRadius / 1000).toFixed(2)} كم (${allowedRadius} متر)` : `${allowedRadius} متر`;
            setCheckInFeedback({
              type: 'error',
              text: `عذراً، أنت خارج نطاق (${targetMosque.name}) لتسجيل الانصراف! المسافة تقريباً ${distDisplay}، والمدى المسموح هو ${allowedDisplay} فقط.`
            });
            setIsPerformingCheckOut(false);
            return;
          }

          // Any check-out after checkOutStart is completely allowed and normal!
          const timeStr = formatCurrentArabicTime();

          const record: TeacherAttendanceRecord = {
            id: recId,
            date: selectedDate,
            shiftId: targetShift.id,
            shiftName: targetShift.name,
            teacherId,
            teacherName,
            complexId: activeComplex?.id,
            mosqueId: targetMosque?.id,
            mosqueName: targetMosque?.name,
            status: existing?.status || 'حاضر',
            checkInTime: existing?.checkInTime || timeStr,
            checkInTimestamp: existing?.checkInTimestamp || new Date().toISOString(),
            checkOutTime: timeStr,
            checkOutTimestamp: new Date().toISOString(),
            checkOutDistanceMeters: Math.round(distance),
            recordedBy: 'self',
            createdAt: existing?.createdAt || new Date().toISOString()
          };

          await OmranDataService.saveTeacherAttendanceRecord(record);
          setAttendanceRecords(prev => [...prev.filter(r => r.id !== record.id), record]);

          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.6 }
          });

          setCheckInFeedback({
            type: 'success',
            text: `تم تسجيل انصرافك بنجاح في تمام الساعة ${timeStr}!`
          });
        } catch (e) {
          setCheckInFeedback({
            type: 'error',
            text: 'حدث خطأ أثناء تسجيل الانصراف.'
          });
        } finally {
          setIsPerformingCheckOut(false);
        }
      },
      () => {
        setIsPerformingCheckOut(false);
        setCheckInFeedback({
          type: 'error',
          text: 'تعذر التحقق من الموقع لتسجيل الانصراف. يرجى تفعيل الـ GPS.'
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // =========================================================================
  // 4. Supervisor Fast Actions (Manual Check-in, Out, Excuse, Absent, Reset)
  // =========================================================================
  const handleApplySupervisorAction = async () => {
    if (!actionTeacherModal) return;
    const { teacher, shift, actionType } = actionTeacherModal;

    const targetMosque = mosques.find(m => m.id === shift.mosqueId) || mosques[0];
    const recId = `tatt_${selectedDate}_${shift.id}_${teacher.id}`;
    const existing = attendanceRecords.find(r => r.id === recId);
    const chosenTime = customTime.trim() || formatCurrentArabicTime();

    let newStatus: TeacherAttendanceStatus = 'حاضر';
    let newCheckIn = existing?.checkInTime;
    let newCheckOut = existing?.checkOutTime;

    if (actionType === 'check_in') {
      newStatus = 'حاضر';
      newCheckIn = chosenTime;
    } else if (actionType === 'late') {
      newStatus = 'متأخر';
      newCheckIn = chosenTime;
    } else if (actionType === 'check_out') {
      newStatus = existing?.status || 'حاضر';
      newCheckOut = chosenTime;
    } else if (actionType === 'excuse') {
      newStatus = 'معتذر';
    } else if (actionType === 'absent') {
      newStatus = 'غائب';
    }

    const record: TeacherAttendanceRecord = {
      id: recId,
      date: selectedDate,
      shiftId: shift.id,
      shiftName: shift.name,
      teacherId: teacher.id,
      teacherName: teacher.name,
      complexId: activeComplex?.id,
      mosqueId: targetMosque?.id,
      mosqueName: targetMosque?.name,
      status: newStatus,
      checkInTime: newCheckIn,
      checkInTimestamp: existing?.checkInTimestamp || (actionType === 'check_in' ? new Date().toISOString() : undefined),
      checkOutTime: newCheckOut,
      checkOutTimestamp: actionType === 'check_out' ? new Date().toISOString() : existing?.checkOutTimestamp,
      note: actionNote.trim() || existing?.note,
      recordedBy: 'supervisor',
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    await OmranDataService.saveTeacherAttendanceRecord(record);
    setAttendanceRecords(prev => [...prev.filter(r => r.id !== record.id), record]);
    setActionTeacherModal(null);
    setActionNote('');
    setCustomTime('');
  };

  const handleResetRecord = async (shift: TeacherShift, teacherId: string) => {
    if (!window.confirm('هل تريد إلغاء التحضير وإعادة الضبط لهذا المعلم؟')) return;
    const recId = `tatt_${selectedDate}_${shift.id}_${teacherId}`;
    await OmranDataService.deleteTeacherAttendanceRecord(recId, selectedDate);
    setAttendanceRecords(prev => prev.filter(r => r.id !== recId));
  };

  // Teacher's assigned shifts today
  const myAssignedShifts = useMemo(() => {
    const tId = currentTeacher?.id;
    if (!tId) return shifts;
    const explicitlyAssigned = shifts.filter(s => (s.assignedTeacherIds || []).includes(tId));
    if (explicitlyAssigned.length > 0) return explicitlyAssigned;
    // If supervisor or developer, allow them to check in into any of the complex's shifts
    if (isSupervisorOrDev) return shifts;
    return [];
  }, [shifts, currentTeacher, isSupervisorOrDev]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Floating / Top Toast Message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xl border ${
              toastMessage.type === 'success'
                ? 'bg-amber-400 text-[#064e3b] border-amber-300'
                : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Mode Toggle */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] p-5 sm:p-6 rounded-[32px] border border-[#065f46] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-[#064e3b] flex items-center justify-center font-black text-xl shadow-lg shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white font-heading">
                نظام تحضير المعلمين الذكي
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                {mosques.length} {mosques.length === 1 ? 'جامع مسجل' : 'جوامع مسجلة'}
              </span>
              {activeComplex?.name && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#022c22] text-[#86efac] font-bold border border-[#065f46] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-amber-400" />
                  <span>{activeComplex.name}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-300/80 mt-1">
              إدارة فترات الدوام والمناوبات، وتعيين الجوامع والمعلمين، والتحضير السلس بضغطة زر
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-[#022c22] p-1.5 rounded-2xl border border-[#065f46] flex-wrap">
          {isSupervisorOrDev && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('records')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'records'
                    ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
                    : 'text-emerald-200 hover:text-white hover:bg-[#064e3b]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>سجل التحضير</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('shifts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'shifts'
                    ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
                    : 'text-emerald-200 hover:text-white hover:bg-[#064e3b]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>فترات الدوام وتعيينها ({shifts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('mosques')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'mosques'
                    ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
                    : 'text-emerald-200 hover:text-white hover:bg-[#064e3b]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>الجوامع ({mosques.length})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('self')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'self' || !isSupervisorOrDev
                ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
                : 'text-emerald-200 hover:text-white hover:bg-[#064e3b]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>تسجيل حضوري</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: TEACHER SELF ATTENDANCE (واجهة المعلم للتحضير الذاتي)        */}
      {/* ===================================================================== */}
      {(activeSubTab === 'self' || !isSupervisorOrDev) && (
        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
          <div className="border-b border-[#065f46] pb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-heading flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#fbbf24]" />
                <span>تحضير الحضور والانصراف اليومي</span>
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                تاريخ اليوم: {todayStr} • المعلم: <strong className="text-amber-300">{currentTeacher?.name || currentUserName || 'المعلم'}</strong>
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50">
              النطاق المسموح: 1 كم من الجامع
            </span>
          </div>

          {/* Feedback Banner */}
          {checkInFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn ${
                checkInFeedback.type === 'success'
                  ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300'
                  : 'bg-red-500/20 border border-red-500/50 text-red-200'
              }`}
            >
              {checkInFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-300 shrink-0" />
              )}
              <span>{checkInFeedback.text}</span>
            </div>
          )}

          {myAssignedShifts.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-300/80 border border-dashed border-[#065f46] rounded-3xl space-y-4 bg-[#022c22]/40">
              <p className="text-sm font-bold text-white">لا توجد فترات دوام مسندة إليك حالياً في هذا المجمع ({activeComplex?.name || 'المجمع'}).</p>
              {isSupervisorOrDev ? (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {shifts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenAssignTeachersModal(shifts[0])}
                      className="px-5 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs inline-flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>تعيين فترتي وإدراج اسمي الآن</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenAddShiftModal}
                    className="px-5 py-2.5 rounded-2xl bg-[#064e3b] hover:bg-[#064e3b]/80 border border-amber-400/50 text-amber-300 font-black text-xs inline-flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء فترة دوام جديدة</span>
                  </button>
                </div>
              ) : (
                <p className="text-emerald-400">يرجى التواصل مع المشرف لتعيين فترتك وجامعك في هذا المجمع.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myAssignedShifts.map(shift => {
                const shiftMosque = mosques.find(m => m.id === shift.mosqueId) || mosques[0];
                const myRecordId = `tatt_${todayStr}_${shift.id}_${currentTeacher?.id || (isSupervisorOrDev ? 'supervisor-self' : '')}`;
                const record = attendanceRecords.find(r => r.id === myRecordId);

                const hasCheckedIn = Boolean(record?.checkInTime);
                const hasCheckedOut = Boolean(record?.checkOutTime);

                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const checkInStartMin = parseTimeToMinutes(shift.checkInStart);
                const checkInEndMin = parseTimeToMinutes(shift.checkInEnd || shift.checkInStart);
                const checkOutStartMin = parseTimeToMinutes(shift.checkOutStart);

                const isBeforeCheckIn = checkInStartMin > 0 && currentMinutes < checkInStartMin;
                const isLateCheckIn = checkInEndMin > 0 && currentMinutes > checkInEndMin;
                const isBeforeCheckOut = checkOutStartMin > 0 && currentMinutes < checkOutStartMin;

                return (
                  <div
                    key={shift.id}
                    className="bg-[#022c22] border-2 border-[#065f46] hover:border-amber-400/50 transition-all rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-white font-heading">
                          {shift.name}
                        </span>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                            hasCheckedOut
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : hasCheckedIn
                              ? record?.status === 'متأخر'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isBeforeCheckIn
                              ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                              : isLateCheckIn
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                          }`}
                        >
                          {hasCheckedOut
                            ? 'تم الانصراف'
                            : hasCheckedIn
                            ? record?.status === 'متأخر'
                              ? 'حاضر (متأخر)'
                              : 'تم الحضور'
                            : isBeforeCheckIn
                            ? `التحضير يبدأ (${shift.checkInStart})`
                            : isLateCheckIn
                            ? 'التحضير متأخر'
                            : 'في انتظار التحضير'}
                        </span>
                      </div>

                      {/* Linked Mosque Badge */}
                      <div className="p-3 rounded-2xl bg-[#064e3b]/50 border border-[#065f46] space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold flex-wrap">
                            <Building2 className="w-4 h-4 text-amber-400" />
                            <span>الجامع: {shiftMosque?.name || shift.mosqueName || 'جامع الحلقات'}</span>
                            <span className="text-[10px] text-emerald-200 bg-[#022c22] px-1.5 py-0.5 rounded-md border border-[#065f46]">
                              النطاق: {shiftMosque?.allowedRadiusMeters || 100} متر
                            </span>
                          </div>
                          {shiftMosque && (
                            <button
                              type="button"
                              onClick={() => handleOpenMosqueMap(shiftMosque, 'view')}
                              className="px-2 py-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-emerald-600/40"
                              title={`اطلاع على موقع الجامع وحدود الـ ${shiftMosque.allowedRadiusMeters || 100} متر على الخريطة`}
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-300" />
                              <span>خريطة الجامع</span>
                            </button>
                          )}
                        </div>
                        {shiftMosque?.neighborhood && (
                          <span className="text-[11px] text-emerald-300/80 block pr-5">
                            الموقع: {shiftMosque.neighborhood}
                          </span>
                        )}
                        {!shiftMosque?.isLocationSet && (
                          <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>تنبيه: لم يحدد المشرف موقع هذا الجامع على الخريطة بعد.</span>
                          </div>
                        )}
                      </div>

                      {/* Timetable Times */}
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-[#064e3b]/30 border border-[#065f46]">
                          <span className="text-[10px] text-emerald-300 block">نافذة الحضور:</span>
                          <strong className="text-white font-mono">{shift.checkInStart} - {shift.checkInEnd}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-[#064e3b]/30 border border-[#065f46]">
                          <span className="text-[10px] text-emerald-300 block">نافذة الانصراف:</span>
                          <strong className="text-white font-mono">{shift.checkOutStart} - {shift.checkOutEnd}</strong>
                        </div>
                      </div>

                      {/* Real-time Attendance Timing Notice */}
                      {!hasCheckedIn && (
                        <div className="pt-1">
                          {isBeforeCheckIn ? (
                            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>لا يمكن التحضير قبل الموعد • يبدأ التحضير في تمام الساعة {shift.checkInStart}</span>
                            </div>
                          ) : isLateCheckIn ? (
                            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>تنبيه: انتهى وقت التحضير في الموعد • سيُسجَّل حضورك (متأخر)</span>
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>وقت التحضير متاح الآن حتى الساعة {shift.checkInEnd}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {hasCheckedIn && !hasCheckedOut && (
                        <div className="pt-1">
                          {isBeforeCheckOut ? (
                            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>لا يمكن الانصراف قبل حلول الموعد ({shift.checkOutStart})</span>
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>موعد الانصراف متاح الآن (تسجيل الانصراف مسموح)</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recorded Times */}
                      {record && (
                        <div className="p-3 rounded-2xl bg-[#011a14] border border-[#065f46] space-y-1 text-xs">
                          {record.checkInTime && (
                            <div className="flex items-center justify-between text-emerald-300">
                              <span>ساعة الحضور المسجلة:</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  record.status === 'متأخر' ? 'bg-orange-500/20 text-orange-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {record.status}
                                </span>
                                <strong className="font-mono text-white font-bold">{record.checkInTime}</strong>
                              </div>
                            </div>
                          )}
                          {record.checkOutTime && (
                            <div className="flex items-center justify-between text-blue-300">
                              <span>ساعة الانصراف المسجلة:</span>
                              <strong className="font-mono text-white font-bold">{record.checkOutTime}</strong>
                            </div>
                          )}
                          {record.note && (
                            <div className="text-amber-200/90 text-[11px] pt-1 border-t border-[#065f46]">
                              ملاحظة: {record.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#065f46]">
                      <button
                        type="button"
                        disabled={hasCheckedIn || isPerformingCheckIn}
                        onClick={() => handleTeacherCheckIn(shift)}
                        className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          hasCheckedIn
                            ? 'bg-emerald-900/60 text-emerald-200'
                            : isBeforeCheckIn
                            ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40'
                            : isLateCheckIn
                            ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-white'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-white'
                        }`}
                      >
                        {isPerformingCheckIn ? (
                          <span>جارٍ التحقق...</span>
                        ) : hasCheckedIn ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-200" />
                            <span>{record?.status === 'متأخر' ? 'حاضر (متأخر)' : 'تم الحضور'}</span>
                          </>
                        ) : isBeforeCheckIn ? (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>التحضير يبدأ ({shift.checkInStart})</span>
                          </>
                        ) : isLateCheckIn ? (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            <span>تسجيل الحضور (متأخر)</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-4 h-4" />
                            <span>تسجيل الحضور</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={!hasCheckedIn || hasCheckedOut || isPerformingCheckOut}
                        onClick={() => handleTeacherCheckOut(shift)}
                        className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          hasCheckedOut
                            ? 'bg-blue-900/60 text-blue-200'
                            : !hasCheckedIn
                            ? 'bg-gray-800 text-gray-400'
                            : isBeforeCheckOut
                            ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:brightness-110 text-white'
                        }`}
                      >
                        {isPerformingCheckOut ? (
                          <span>جارٍ التحقق...</span>
                        ) : hasCheckedOut ? (
                          <>
                            <Check className="w-4 h-4 text-blue-200" />
                            <span>تم الانصراف</span>
                          </>
                        ) : isBeforeCheckOut ? (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>الانصراف متاح ({shift.checkOutStart})</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>تسجيل الانصراف</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: SUPERVISOR ATTENDANCE RECORDS (سجل الحضور اليومي للمشرف)      */}
      {/* ===================================================================== */}
      {isSupervisorOrDev && activeSubTab === 'records' && (
        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
          {/* Header & Date Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#065f46] pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-heading flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#fbbf24]" />
                <span>سجل تحضير وانصراف المعلمين</span>
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                يمكنك الرجوع لأي تاريخ سابق للاطلاع على سجلات التحضير أو التعديل عليها
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-emerald-200 font-bold">التاريخ المحدد:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] text-[#fbbf24] font-bold rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1.5 rounded-xl bg-[#064e3b] text-emerald-200 hover:text-white border border-[#065f46] text-xs font-bold transition-colors cursor-pointer"
              >
                اليوم
              </button>
            </div>
          </div>

          {/* Shifts Accordion / List */}
          {shifts.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-300/70 border border-dashed border-[#065f46] rounded-3xl">
              لا توجد فترات دوام منشأة بعد. اضغط على تبويب "فترات الدوام" لإضافة فترة جديدة.
            </div>
          ) : (
            <div className="space-y-6">
              {shifts.map(shift => {
                const shiftMosque = mosques.find(m => m.id === shift.mosqueId) || mosques[0];
                const assignedTeachersList = teachers.filter(t => (shift.assignedTeacherIds || []).includes(t.id));

                return (
                  <div
                    key={shift.id}
                    className="bg-[#022c22] border border-[#065f46] rounded-3xl p-5 space-y-4 shadow-lg"
                  >
                    {/* Shift Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#065f46]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-[#fbbf24] border border-amber-400/30 flex items-center justify-center font-bold">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-white font-heading">
                              {shift.name}
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#064e3b] text-amber-300 font-bold border border-[#065f46] flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-amber-400" />
                              <span>{shiftMosque?.name || shift.mosqueName || 'جامع الحلقات'}</span>
                            </span>
                          </div>
                          <span className="text-xs text-emerald-300/80">
                            الحضور: ({shift.checkInStart} - {shift.checkInEnd}) • الانصراف: ({shift.checkOutStart} - {shift.checkOutEnd})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignTeachersModal(shift)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-[#064e3b] border border-amber-400/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>تعيين وتكليف المعلمين ({assignedTeachersList.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Teachers Table for this shift */}
                    {assignedTeachersList.length === 0 ? (
                      <div className="text-center py-5 space-y-2 bg-[#064e3b]/20 rounded-2xl border border-dashed border-amber-400/30 p-4">
                        <p className="text-xs text-amber-300/90 font-bold">
                          لم يتم تعيين أي معلمين في هذه الفترة بعد.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignTeachersModal(shift)}
                          className="px-4 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>تعيين وتكليف المعلمين لهذه الفترة الآن</span>
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="border-b border-[#065f46] text-[#86efac]">
                              <th className="p-2.5 font-bold">المعلم</th>
                              <th className="p-2.5 font-bold text-center">الحالة</th>
                              <th className="p-2.5 font-bold text-center">ساعة الحضور</th>
                              <th className="p-2.5 font-bold text-center">ساعة الانصراف</th>
                              <th className="p-2.5 font-bold">ملاحظات</th>
                              <th className="p-2.5 font-bold text-left">إجراءات المشرف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#065f46]/40">
                            {assignedTeachersList.map(teacher => {
                              const recId = `tatt_${selectedDate}_${shift.id}_${teacher.id}`;
                              const record = attendanceRecords.find(r => r.id === recId);
                              const dynamicInfo = getTeacherShiftDynamicStatus(shift, record, selectedDate);
                              const status = dynamicInfo.status;
                              const displayStatus = dynamicInfo.displayStatus;

                              return (
                                <tr
                                  key={teacher.id}
                                  id={`teacher-att-item-${teacher.id}`}
                                  data-item-id={teacher.id}
                                  className="hover:bg-[#064e3b]/30 transition-colors"
                                >
                                  <td className="p-2.5 font-bold text-white">
                                    {teacher.name}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                        status === 'حاضر'
                                          ? dynamicInfo.didNotCheckOut
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                          : status === 'متأخر'
                                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                          : status === 'معتذر'
                                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                          : status === 'غائب'
                                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                          : 'bg-gray-800 text-gray-300'
                                      }`}
                                    >
                                      {displayStatus}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold text-amber-300">
                                    {record?.checkInTime || '-'}
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold">
                                    {record?.checkOutTime ? (
                                      <span className="text-blue-300">{record.checkOutTime}</span>
                                    ) : dynamicInfo.didNotCheckOut ? (
                                      <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30">
                                        لم ينصرف
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-emerald-200/80 text-[11px]">
                                    {record?.note || '-'}
                                  </td>
                                  <td className="p-2.5 text-left">
                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                      {/* Quick Check-in */}
                                      <button
                                        type="button"
                                        title="تحضير يدوي"
                                        onClick={() => {
                                          setActionTeacherModal({
                                            teacher,
                                            shift,
                                            actionType: 'check_in'
                                          });
                                          setCustomTime(formatCurrentArabicTime());
                                          setActionNote('');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-700/60 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                                      >
                                        تحضير
                                      </button>

                                      {/* Quick Late */}
                                      <button
                                        type="button"
                                        title="تسجيل متأخر"
                                        onClick={() => {
                                          setActionTeacherModal({
                                            teacher,
                                            shift,
                                            actionType: 'late'
                                          });
                                          setCustomTime(formatCurrentArabicTime());
                                          setActionNote('حضور متأخر');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-orange-700/60 hover:bg-orange-700 text-white text-[10px] font-bold cursor-pointer"
                                      >
                                        متأخر
                                      </button>

                                      {/* Quick Check-out */}
                                      <button
                                        type="button"
                                        title="تسجيل انصراف"
                                        onClick={() => {
                                          setActionTeacherModal({
                                            teacher,
                                            shift,
                                            actionType: 'check_out'
                                          });
                                          setCustomTime(formatCurrentArabicTime());
                                          setActionNote('');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-blue-700/60 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                                      >
                                        انصراف
                                      </button>

                                      {/* Quick Excuse */}
                                      <button
                                        type="button"
                                        title="تسجيل عذر"
                                        onClick={() => {
                                          setActionTeacherModal({
                                            teacher,
                                            shift,
                                            actionType: 'excuse'
                                          });
                                          setCustomTime('');
                                          setActionNote('عذر مسبق معتمد من الإدارة');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-amber-600/50 hover:bg-amber-600 text-amber-200 text-[10px] font-bold cursor-pointer"
                                      >
                                        عذر
                                      </button>

                                      {/* Quick Absent */}
                                      <button
                                        type="button"
                                        title="تسجيل غياب"
                                        onClick={() => {
                                          setActionTeacherModal({
                                            teacher,
                                            shift,
                                            actionType: 'absent'
                                          });
                                          setCustomTime('');
                                          setActionNote('غياب دون إشعار');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-red-800/50 hover:bg-red-800 text-red-200 text-[10px] font-bold cursor-pointer"
                                      >
                                        غياب
                                      </button>

                                      {/* Reset */}
                                      {record && (
                                        <button
                                          type="button"
                                          title="إلغاء التحضير / إعادة تعيين"
                                          onClick={() => handleResetRecord(shift, teacher.id)}
                                          className="p-1 rounded-lg text-gray-400 hover:text-red-400 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: MOSQUES MANAGEMENT (إدارة الجوامع والمساجد المضافة)            */}
      {/* ===================================================================== */}
      {isSupervisorOrDev && activeSubTab === 'mosques' && (
        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#065f46] flex-wrap">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-heading flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#fbbf24]" />
                <span>إدارة الجوامع والمساجد</span>
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                يمكنك كتابة اسم الجامع وحفظه، وإضافة أكثر من جامع للمجمع بسهولة تامة
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddMosqueModal}
              className="px-4 py-2 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة جامع جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mosques.map(mosque => {
              const linkedShiftsCount = shifts.filter(s => s.mosqueId === mosque.id).length;

              return (
                <div
                  key={mosque.id}
                  className="bg-[#022c22] border-2 border-[#065f46] hover:border-amber-400/40 rounded-3xl p-5 space-y-3 shadow-lg flex flex-col justify-between transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-[#fbbf24] flex items-center justify-center font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white font-heading">{mosque.name}</h4>
                          <span className="text-[11px] text-emerald-300/80 block">
                            {mosque.neighborhood || 'جامع تابع للمجمع'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          mosque.isLocationSet
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        }`}
                      >
                        {mosque.isLocationSet ? 'الموقع ملتقط' : 'لم يحدد الموقع'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#064e3b]/30 border border-[#065f46] text-xs text-emerald-200/90 flex items-center justify-between">
                      <span>الفترات المربوطة بهذا الجامع:</span>
                      <strong className="text-amber-300 font-bold">{linkedShiftsCount} فترات</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#011a14] border border-[#065f46] text-xs text-emerald-200/90 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>مدى التحضير المسموح:</span>
                      </span>
                      <strong className="text-white font-mono font-bold">
                        {mosque.allowedRadiusMeters || 100} متر {((mosque.allowedRadiusMeters || 100) >= 1000) ? `(${((mosque.allowedRadiusMeters || 100) / 1000).toFixed(1)} كم)` : ''}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#065f46] flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {mosque.isLocationSet && (
                        <button
                          type="button"
                          onClick={() => handleOpenMosqueMap(mosque, 'view')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title={`اطلاع على موقع الجامع وحدود الـ ${mosque.allowedRadiusMeters || 100} متر على الخريطة`}
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>اطلاع</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenMosqueMap(mosque, 'picker')}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="تحديد أو تعديل الموقع على خريطة Google التفاعلية"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{mosque.isLocationSet ? 'تعديل على الخريطة' : 'تحديد على الخريطة'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMosqueModal(mosque)}
                        className="px-3 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#064e3b]/80 text-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      {mosques.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMosque(mosque.id)}
                          className="p-1.5 rounded-xl bg-red-900/30 hover:bg-red-900/60 text-red-300 cursor-pointer transition-colors"
                          title="حذف الجامع"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 4: SHIFTS MANAGEMENT (إدارة فترات ومناوبات الدوام)                 */}
      {/* ===================================================================== */}
      {isSupervisorOrDev && activeSubTab === 'shifts' && (
        <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#065f46] flex-wrap">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-heading flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#fbbf24]" />
                <span>فترات ومناوبات دوام المعلمين</span>
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                تحديد مواعيد الحضور والانصراف، وربط كل فترة بجامع مخصص وقائمة المعلمين المناوبين
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddShiftModal}
              className="px-4 py-2 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فترة دوام</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.map(shift => {
              const shiftMosque = mosques.find(m => m.id === shift.mosqueId) || mosques[0];
              const assignedTeachers = teachers.filter(t => (shift.assignedTeacherIds || []).includes(t.id));

              return (
                <div
                  key={shift.id}
                  className="bg-[#022c22] border-2 border-[#065f46] rounded-3xl p-5 space-y-4 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-black text-white font-heading">{shift.name}</h4>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                        {assignedTeachers.length} معلمين مناوبين
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#064e3b]/40 border border-[#065f46] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span>الجامع المخصص: {shiftMosque?.name || shift.mosqueName || 'جامع الحلقات'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-[#064e3b]/30 border border-[#065f46]">
                        <span className="text-[10px] text-emerald-300 block">موعد الحضور:</span>
                        <strong className="text-white font-mono">{shift.checkInStart} - {shift.checkInEnd}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#064e3b]/30 border border-[#065f46]">
                        <span className="text-[10px] text-emerald-300 block">موعد الانصراف:</span>
                        <strong className="text-white font-mono">{shift.checkOutStart} - {shift.checkOutEnd}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-emerald-300 font-bold block">المعلمون المكلفون ({assignedTeachers.length}):</span>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignTeachersModal(shift)}
                          className="text-[11px] text-amber-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>تعديل المكلفين</span>
                        </button>
                      </div>
                      {assignedTeachers.length === 0 ? (
                        <div
                          onClick={() => handleOpenAssignTeachersModal(shift)}
                          className="p-2.5 rounded-xl bg-amber-400/10 border border-dashed border-amber-400/30 text-center cursor-pointer hover:bg-amber-400/20 transition-colors"
                        >
                          <span className="text-xs text-amber-300 font-bold">لم يُعيّن معلمين بعد — اضغط هنا لتعيين المعلمين</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignedTeachers.map(t => (
                            <span
                              key={t.id}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-[#064e3b] text-emerald-100 border border-[#065f46]"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#065f46] flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenAssignTeachersModal(shift)}
                      className="px-3.5 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>تعيين المعلمين ({assignedTeachers.length})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditShiftModal(shift)}
                        className="px-3 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#064e3b]/80 text-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل المواعيد</span>
                      </button>
                      {shifts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(shift.id)}
                          className="p-1.5 rounded-xl bg-red-900/30 hover:bg-red-900/60 text-red-300 cursor-pointer transition-colors"
                          title="حذف الفترة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT MOSQUE (إضافة / تعديل جامع بدون تعقيدات)          */}
      {/* ===================================================================== */}
      {isMosqueModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border-2 border-amber-400 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5 text-right relative">
            <button
              onClick={() => setIsMosqueModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-emerald-800 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-[#fbbf24] flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-heading">
                  {editingMosqueId ? 'تعديل بيانات الجامع' : 'إضافة جامع جديد'}
                </h3>
                <p className="text-xs text-emerald-300/80">
                  اكتب اسم الجامع بكل سهولة واحفظه لربط فترات الدوام به
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Mosque Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-200 block">
                  اسم الجامع أو المسجد: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={mosqueNameInput}
                  onChange={e => setMosqueNameInput(e.target.value)}
                  placeholder="مثال: جامع الراجحي، جامع الفرقان، مسجد بلال بن رباح..."
                  className="w-full py-2.5 px-3.5 bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl text-xs sm:text-sm text-white font-bold outline-none"
                  autoFocus
                />
              </div>

              {/* Neighborhood / Location label */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-200 block">
                  الحي أو المنطقة (اختياري):
                </label>
                <input
                  type="text"
                  value={mosqueNeighborhoodInput}
                  onChange={e => setMosqueNeighborhoodInput(e.target.value)}
                  placeholder="مثال: حي الروضة، الشارع العام..."
                  className="w-full py-2 px-3.5 bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl text-xs text-white outline-none"
                />
              </div>

              {/* Mosque Range Setting (مدى المسجد للتحضير بالأمتار) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#011a14] border border-[#065f46]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-200">
                    مدى المسجد المسموح للتحضير (بالمتر):
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                    {mosqueRadiusInput || 100} متر {Number(mosqueRadiusInput) >= 1000 ? `(${(Number(mosqueRadiusInput) / 1000).toFixed(1)} كم)` : ''}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  المسافة المحيطة بالمسجد التي يُسمح للمعلم بالتحضير والانصراف داخلها (الافتراضي 100 متر، ويمكنك كتابة أي رقم تريده كـ 100 أو 500 أو 1000 متر أو غيرها).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    step="10"
                    value={mosqueRadiusInput}
                    onChange={e => setMosqueRadiusInput(e.target.value)}
                    placeholder="100"
                    className="w-full py-2 px-3 bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-xl text-xs sm:text-sm text-white font-mono font-bold outline-none"
                  />
                  <span className="text-xs text-emerald-300 font-bold shrink-0">متر</span>
                </div>
                {/* Quick preset chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[
                    { label: '100 م (الافتراضي)', val: 100 },
                    { label: '200 م', val: 200 },
                    { label: '500 م', val: 500 },
                    { label: '1000 م (1 كم)', val: 1000 },
                    { label: '2000 م (2 كم)', val: 2000 }
                  ].map(preset => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setMosqueRadiusInput(String(preset.val))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        Number(mosqueRadiusInput) === preset.val
                          ? 'bg-amber-400 text-[#064e3b]'
                          : 'bg-[#064e3b] text-emerald-200 hover:text-white border border-[#065f46]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple One-Click GPS Capture (بدون خطوط طول وعرض) */}
              <div className="p-4 rounded-2xl bg-[#011a14] border border-[#065f46] space-y-2.5">
                <span className="text-xs font-bold text-amber-300 block">
                  📍 تحديد الموقع للتحضير الذكي (Google Maps أو بنقرة واحدة):
                </span>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  يمكنك فتح الخريطة التفاعلية والتحريك وسحب الدبوس حتى تصل للجامع، أو الضغط على التقاط موقعك الحالي مباشرة.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const tempMosque: MosqueItem = {
                        id: editingMosqueId || `mosque_${Date.now()}`,
                        name: mosqueNameInput.trim() || 'الجامع',
                        neighborhood: mosqueNeighborhoodInput.trim(),
                        latitude: capturedMosqueLocation?.lat,
                        longitude: capturedMosqueLocation?.lng,
                        isLocationSet: Boolean(capturedMosqueLocation?.lat),
                        allowedRadiusMeters: parseInt(mosqueRadiusInput, 10) || 100,
                        createdAt: new Date().toISOString()
                      };
                      handleOpenMosqueMap(tempMosque, 'picker');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>تحديد بالخريطة التفاعلية</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCapturingGPS}
                    onClick={handleCaptureCurrentLocationForMosque}
                    className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm disabled:opacity-50"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{isCapturingGPS ? 'جارٍ الالتقاط...' : 'التقاط موقعي الحالي (GPS)'}</span>
                  </button>
                </div>

                {gpsCaptureMsg && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      gpsCaptureMsg.type === 'success'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {gpsCaptureMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>{gpsCaptureMsg.text}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-800">
              <button
                type="button"
                onClick={() => setIsMosqueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!mosqueNameInput.trim()}
                onClick={handleSaveMosque}
                className="px-6 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                حفظ الجامع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: ADD / EDIT SHIFT (ربط الفترة بالجامع والمعلمين)                */}
      {/* ===================================================================== */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border-2 border-amber-400 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-7 shadow-2xl space-y-5 text-right relative">
            <button
              onClick={() => setIsShiftModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-emerald-800 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-[#fbbf24] flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-heading">
                  {editingShiftId ? 'تعديل فترة الدوام' : 'إنشاء فترة دوام جديدة'}
                </h3>
                <p className="text-xs text-emerald-300/80">
                  حدد الجامع ومواعيد الحضور والانصراف والمعلمين المناوبين
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Shift Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-200 block">
                  اسم الفترة:
                </label>
                <input
                  type="text"
                  value={shiftForm.name}
                  onChange={e => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: الفترة العصرية، الفترة المسائية، حلقة الفجر..."
                  className="w-full py-2.5 px-3.5 bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl text-xs sm:text-sm text-white font-bold outline-none"
                />
              </div>

              {/* MOSQUE SELECTOR (يحدد الجامع وقت عمل الفترة) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-300 block flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>الجامع المخصص لهذه الفترة: <span className="text-red-400">*</span></span>
                </label>
                <select
                  value={shiftForm.mosqueId}
                  onChange={e => setShiftForm(prev => ({ ...prev, mosqueId: e.target.value }))}
                  className="w-full py-2.5 px-3.5 bg-[#064e3b] border-2 border-amber-400/40 focus:border-[#fbbf24] rounded-2xl text-xs sm:text-sm text-amber-300 font-bold outline-none cursor-pointer"
                >
                  {mosques.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#022c22] text-white">
                      {m.name} {m.neighborhood ? `(${m.neighborhood})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-300/80">
                  عند تحضير المعلم، سيتحقق النظام من تواجده في هذا الجامع المحدد.
                </p>
              </div>

              {/* Check-in Times */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-200 block">
                  موعد الحضور (من - إلى):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-emerald-300 block mb-0.5">يبدأ الحضور من:</span>
                    <input
                      type="time"
                      value={shiftForm.checkInStart}
                      onChange={e => setShiftForm(prev => ({ ...prev, checkInStart: e.target.value }))}
                      className="w-full py-2 px-3 bg-[#064e3b] border border-[#065f46] rounded-xl text-xs text-white font-mono text-center outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300 block mb-0.5">ينتهي الحضور في:</span>
                    <input
                      type="time"
                      value={shiftForm.checkInEnd}
                      onChange={e => setShiftForm(prev => ({ ...prev, checkInEnd: e.target.value }))}
                      className="w-full py-2 px-3 bg-[#064e3b] border border-[#065f46] rounded-xl text-xs text-white font-mono text-center outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Check-out Times */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-200 block">
                  موعد الانصراف (من - إلى):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-emerald-300 block mb-0.5">يبدأ الانصراف من:</span>
                    <input
                      type="time"
                      value={shiftForm.checkOutStart}
                      onChange={e => setShiftForm(prev => ({ ...prev, checkOutStart: e.target.value }))}
                      className="w-full py-2 px-3 bg-[#064e3b] border border-[#065f46] rounded-xl text-xs text-white font-mono text-center outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300 block mb-0.5">ينتهي الانصراف في:</span>
                    <input
                      type="time"
                      value={shiftForm.checkOutEnd}
                      onChange={e => setShiftForm(prev => ({ ...prev, checkOutEnd: e.target.value }))}
                      className="w-full py-2 px-3 bg-[#064e3b] border border-[#065f46] rounded-xl text-xs text-white font-mono text-center outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Assign Teachers Checkboxes */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-200">
                    المعلمون المناوبون في هذه الفترة ({shiftForm.assignedTeacherIds.length}):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (shiftForm.assignedTeacherIds.length === teachers.length) {
                        setShiftForm(prev => ({ ...prev, assignedTeacherIds: [] }));
                      } else {
                        setShiftForm(prev => ({ ...prev, assignedTeacherIds: teachers.map(t => t.id) }));
                      }
                    }}
                    className="text-[11px] text-amber-300 hover:underline cursor-pointer"
                  >
                    {shiftForm.assignedTeacherIds.length === teachers.length ? 'إلغاء تحديد الكل' : 'تحديد جميع المعلمين'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-[#011a14] border border-[#065f46]">
                  {teachers.map(t => {
                    const isChecked = shiftForm.assignedTeacherIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-[#064e3b]/50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setShiftForm(prev => ({
                                ...prev,
                                assignedTeacherIds: [...prev.assignedTeacherIds, t.id]
                              }));
                            } else {
                              setShiftForm(prev => ({
                                ...prev,
                                assignedTeacherIds: prev.assignedTeacherIds.filter(id => id !== t.id)
                              }));
                            }
                          }}
                          className="rounded border-[#065f46] text-[#fbbf24] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-white font-bold">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-800">
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!shiftForm.name.trim()}
                onClick={handleSaveShift}
                className="px-6 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                حفظ الفترة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: SUPERVISOR MANUAL RECORD ACTION (تحضير / انصراف / عذر / غياب) */}
      {/* ===================================================================== */}
      {actionTeacherModal && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border-2 border-amber-400 rounded-3xl w-full max-w-md p-6 space-y-4 text-right relative">
            <button
              onClick={() => setActionTeacherModal(null)}
              className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-emerald-800 pb-3">
              <h3 className="text-base font-black text-white font-heading">
                {actionTeacherModal.actionType === 'check_in' && 'تسجيل حضور يدوي (في الوقت)'}
                {actionTeacherModal.actionType === 'late' && 'تسجيل حضور متأخر'}
                {actionTeacherModal.actionType === 'check_out' && 'تسجيل انصراف يدوي'}
                {actionTeacherModal.actionType === 'excuse' && 'تسجيل عذر للمعلم'}
                {actionTeacherModal.actionType === 'absent' && 'تسجيل غياب للمعلم'}
              </h3>
              <p className="text-xs text-amber-300 font-bold mt-0.5">
                المعلم: {actionTeacherModal.teacher.name} • {actionTeacherModal.shift.name}
              </p>
            </div>

            <div className="space-y-3">
              {(actionTeacherModal.actionType === 'check_in' || actionTeacherModal.actionType === 'late' || actionTeacherModal.actionType === 'check_out') && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-200 block">
                    الوقت المسجل:
                  </label>
                  <input
                    type="text"
                    value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    placeholder="مثال: 03:45 م"
                    className="w-full py-2 px-3 bg-[#064e3b] border border-[#065f46] rounded-xl text-xs font-mono font-bold text-white outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-200 block">
                  ملاحظة المشرف / سبب العذر:
                </label>
                <textarea
                  rows={2}
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  placeholder="اكتب ملاحظة أو سبب العذر إن وجد..."
                  className="w-full py-2 px-3 bg-[#064e3b] border border-[#065f46] rounded-xl text-xs text-white outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-800">
              <button
                type="button"
                onClick={() => setActionTeacherModal(null)}
                className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApplySupervisorAction}
                className="px-6 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs shadow-md cursor-pointer transition-all"
              >
                تأكيد وحفظ
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================================== */}
      {/* MODAL 4: QUICK ASSIGN TEACHERS TO SHIFT (تعيين المعلمين في الفترة)     */}
      {/* ===================================================================== */}
      {assignTeachersModalShift && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border-2 border-amber-400 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-7 shadow-2xl space-y-5 text-right relative">
            <button
              onClick={() => setAssignTeachersModalShift(null)}
              className="absolute top-4 left-4 p-2 text-emerald-300 hover:text-white rounded-xl bg-emerald-950/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-emerald-800 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-[#fbbf24] flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-heading">
                  تعيين وتكليف المعلمين في فترة ({assignTeachersModalShift.name})
                </h3>
                <p className="text-xs text-emerald-300/80">
                  المجمع: {activeComplex?.name || 'المجمع الحالي'} • اختر المعلمين المناوبين المكلفين بالحضور
                </p>
              </div>
            </div>

            {/* Search Box & Quick Select Buttons */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignTeachersSearch}
                  onChange={e => setAssignTeachersSearch(e.target.value)}
                  placeholder="بحث عن اسم المعلم..."
                  className="w-full py-2.5 pr-10 pl-3.5 bg-[#064e3b] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl text-xs sm:text-sm text-white font-bold outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-amber-300 font-bold">
                  المحدد: {selectedAssignedTeacherIds.length} من أصل {teachers.length} معلم
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAssignedTeacherIds(teachers.map(t => t.id))}
                    className="text-[11px] text-emerald-300 hover:text-white font-bold hover:underline cursor-pointer"
                  >
                    تحديد جميع المعلمين
                  </button>
                  <span className="text-emerald-600">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignedTeacherIds([])}
                    className="text-[11px] text-red-300 hover:text-white font-bold hover:underline cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Teachers Checkbox List */}
              <div className="max-h-60 overflow-y-auto space-y-2 p-2 rounded-2xl bg-[#011a14] border border-[#065f46]">
                {teachers.length === 0 ? (
                  <p className="text-xs text-emerald-300/60 text-center py-4">
                    لا يوجد معلمين مسجلين في هذا المجمع بعد.
                  </p>
                ) : (
                  teachers
                    .filter(t => !assignTeachersSearch.trim() || t.name.toLowerCase().includes(assignTeachersSearch.toLowerCase()) || t.username.toLowerCase().includes(assignTeachersSearch.toLowerCase()))
                    .map(t => {
                      const isSelected = selectedAssignedTeacherIds.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400/10 border-amber-400/50 text-white'
                              : 'bg-[#064e3b]/30 border-[#065f46] hover:bg-[#064e3b]/60 text-emerald-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedAssignedTeacherIds(prev => [...prev, t.id]);
                                } else {
                                  setSelectedAssignedTeacherIds(prev => prev.filter(id => id !== t.id));
                                }
                              }}
                              className="rounded border-[#065f46] text-[#fbbf24] focus:ring-0 cursor-pointer w-4 h-4"
                            />
                            <div>
                              <span className="text-sm font-bold text-white block">{t.name}</span>
                              <span className="text-[11px] text-emerald-300/70 block">
                                اسم المستخدم: {t.username} {t.role === 'supervisor' ? '• (معلم مشرف)' : ''}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isSelected
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-emerald-950 text-emerald-400'
                          }`}>
                            {isSelected ? 'مكلف بالمناوبة' : 'غير مكلف'}
                          </span>
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-800">
              <button
                type="button"
                onClick={() => setAssignTeachersModalShift(null)}
                className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveAssignedTeachers}
                className="px-6 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs shadow-md cursor-pointer transition-all"
              >
                حفظ التعيين وتأكيد المناوبة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: GOOGLE MAPS MOSQUE LOCATION (اطلاع / تحديد وتعديل بالخريطة)  */}
      {/* ===================================================================== */}
      {mapModalMosque && (
        <MosqueLocationMapModal
          isOpen={isMapModalOpen}
          onClose={() => {
            setIsMapModalOpen(false);
            setMapModalMosque(null);
          }}
          mosque={mapModalMosque}
          mode={mapModalMode}
          onSaveLocation={handleSaveMosqueLocationFromMap}
        />
      )}
    </div>
  );
};
