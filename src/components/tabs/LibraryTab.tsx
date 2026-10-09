import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  Layers,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Share2,
  Send,
  Sparkles,
  FileCheck,
  FolderArchive,
  X
} from 'lucide-react';
import {
  LibraryDocument,
  LibraryDocumentType,
  Student,
  Halaqah,
  Exam,
  AttendanceRecord,
  StudentEvaluation,
  QuranComplex
} from '../../types';
import { GoogleWorkspaceService } from '../../lib/googleWorkspace';
import { triggerComplexThemePulse } from '../../utils/highlightHelper';

interface LibraryTabProps {
  libraryDocs: LibraryDocument[];
  students: Student[];
  halaqahs: Halaqah[];
  teacherHalaqahs?: Halaqah[];
  exams: Exam[];
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  currentUserName: string;
  isSupervisor: boolean;
  isDeveloper?: boolean;
  activeComplex?: QuranComplex | null;
  onSaveDocument: (doc: LibraryDocument) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  initialHighlightId?: string;
  initialSearchQuery?: string;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  libraryDocs = [],
  students = [],
  halaqahs = [],
  teacherHalaqahs = [],
  exams = [],
  attendance = [],
  evaluations = [],
  currentUserName,
  isSupervisor = false,
  isDeveloper = false,
  activeComplex,
  onSaveDocument,
  onDeleteDocument,
  initialHighlightId,
  initialSearchQuery
}) => {
  const [activeFilterType, setActiveFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>('all');

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
    if (initialHighlightId) {
      setTimeout(() => {
        triggerComplexThemePulse(initialHighlightId);
      }, 350);
    }
  }, [initialHighlightId, initialSearchQuery]);

  // Teacher specific halaqahs
  const effectiveTeacherHalaqahs = useMemo(() => {
    if (isSupervisor || isDeveloper) return halaqahs;
    return teacherHalaqahs && teacherHalaqahs.length > 0 ? teacherHalaqahs : halaqahs;
  }, [isSupervisor, isDeveloper, teacherHalaqahs, halaqahs]);

  const teacherHalaqahIds = useMemo(() => {
    return new Set(effectiveTeacherHalaqahs.map(h => h.id));
  }, [effectiveTeacherHalaqahs]);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);

  // New Document Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<LibraryDocumentType>('pdf_report');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docHalaqahId, setDocHalaqahId] = useState(() => {
    if (!isSupervisor && !isDeveloper && effectiveTeacherHalaqahs.length > 0) {
      return effectiveTeacherHalaqahs[0].id;
    }
    return '';
  });
  const [docGoogleUrl, setDocGoogleUrl] = useState('');
  const [docDescription, setDocDescription] = useState('');

  // Syncing state
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<LibraryDocument | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered list strictly isolated for teachers to their own halaqahs
  const filteredDocs = useMemo(() => {
    return libraryDocs.filter(d => {
      // If user is a regular teacher (not supervisor and not developer):
      // They can ONLY see documents belonging to their assigned halaqah(s) or created by them!
      if (!isSupervisor && !isDeveloper) {
        const isMyHalaqah = d.halaqahId && teacherHalaqahIds.has(d.halaqahId);
        const isMyDoc = d.createdByName && currentUserName && (
          d.createdByName.trim() === currentUserName.trim() ||
          d.createdByName.toLowerCase().includes(currentUserName.toLowerCase()) ||
          currentUserName.toLowerCase().includes(d.createdByName.toLowerCase())
        );
        if (!isMyHalaqah && !isMyDoc) {
          return false;
        }
      }

      const matchesType = activeFilterType === 'all' || d.type === activeFilterType;
      const matchesDate = !selectedDateFilter || d.date === selectedDateFilter;
      const matchesHalaqah = selectedHalaqahFilter === 'all' || d.halaqahId === selectedHalaqahFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        d.title.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query)) ||
        (d.halaqahName && d.halaqahName.toLowerCase().includes(query)) ||
        (d.createdByName && d.createdByName.toLowerCase().includes(query));

      return matchesType && matchesDate && matchesHalaqah && matchesSearch;
    });
  }, [libraryDocs, activeFilterType, selectedDateFilter, selectedHalaqahFilter, searchQuery, isSupervisor, isDeveloper, teacherHalaqahIds, currentUserName]);

  // Statistics
  const pdfCount = libraryDocs.filter(d => d.type === 'pdf_report' || d.type === 'attendance_sheet').length;
  const sheetsCount = libraryDocs.filter(d => d.type === 'google_sheet' || d.type === 'exam_results').length;
  const formsCount = libraryDocs.filter(d => d.type === 'google_form').length;

  // Handle Syncing Google Sheet / Form linked doc
  const handleSyncLinkedDoc = async (docItem: LibraryDocument) => {
    setSyncingDocId(docItem.id);
    setStatusMessage(null);
    try {
      const token = await GoogleWorkspaceService.getValidAccessToken();
      if (!token) {
        throw new Error('يرجى تسجيل الدخول أو ربط حساب Google لتحديث ورقة البيانات.');
      }

      if (docItem.googleSpreadsheetId) {
        // Find matching exam submissions if applicable
        const relevantSubmissions = docItem.halaqahId
          ? evaluations.map(e => ({ studentName: e.studentName }))
          : [];

        await GoogleWorkspaceService.syncSubmissionsToSheet(docItem.googleSpreadsheetId, relevantSubmissions as any, token);
      }

      setStatusMessage({
        type: 'success',
        text: `تم تحديث ومزامنة "${docItem.title}" مع Google Sheets بنجاح دون الحاجة لإنشاء ملف جديد!`
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: e.message || 'حدث خطأ أثناء تحديث المستند.'
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSyncingDocId(null);
    }
  };

  // Add Document Submission
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى كتابة عنوان التقرير أو المستند.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenHalaqah = halaqahs.find(h => h.id === docHalaqahId);
      const newDoc: LibraryDocument = {
        id: `lib-doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: docTitle.trim(),
        type: docType,
        date: docDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdByName: currentUserName || 'المعلم / المشرف',
        complexId: activeComplex?.id,
        complexName: activeComplex?.name,
        halaqahId: docHalaqahId || undefined,
        halaqahName: chosenHalaqah?.name,
        googleUrl: docGoogleUrl.trim() || undefined,
        description: docDescription.trim() || undefined
      };

      await onSaveDocument(newDoc);
      setStatusMessage({ type: 'success', text: `تم حفظ وأرشفة "${docTitle}" في المكتبة بنجاح!` });
      setIsAddModalOpen(false);
      setDocTitle('');
      setDocDescription('');
      setDocGoogleUrl('');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'حدث خطأ أثناء الحفظ.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await onDeleteDocument(docToDelete.id);
      setStatusMessage({ type: 'success', text: `تم حذف "${docToDelete.title}" من أرشيف المكتبة.` });
      setDocToDelete(null);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'فشل حذف المستند.' });
    }
  };

  const getDocTypeBadge = (type: LibraryDocumentType) => {
    switch (type) {
      case 'pdf_report':
        return { label: 'تقرير PDF معتمد', icon: FileText, bg: 'bg-rose-950/80 text-rose-300 border-rose-600/40' };
      case 'google_sheet':
      case 'exam_results':
        return { label: 'جدول Google Sheets', icon: FileSpreadsheet, bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' };
      case 'google_form':
        return { label: 'نموذج Google Forms', icon: FileCheck, bg: 'bg-blue-950/80 text-blue-300 border-blue-500/40' };
      case 'attendance_sheet':
        return { label: 'سجل حضور رسمي', icon: Calendar, bg: 'bg-amber-950/80 text-amber-300 border-amber-500/40' };
      case 'certificate_batch':
        return { label: 'دفعة شهادات', icon: Sparkles, bg: 'bg-purple-950/80 text-purple-300 border-purple-500/40' };
      default:
        return { label: 'مستند سحابي', icon: FileText, bg: 'bg-slate-900 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#064e3b] border border-[#fbbf24]/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-[#064e3b] flex items-center justify-center font-black shadow-lg shrink-0">
              <FolderArchive className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black font-heading text-[#fbbf24] flex items-center gap-2">
                <span>المكتبة والأرشيف السحابي الشامل</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#064e3b] text-emerald-200 border border-[#065f46] font-mono font-bold">
                  {libraryDocs.length} مستند
                </span>
              </h2>
              <p className="text-xs text-[#86efac] mt-0.5">
                أرشيف مركزي دائم لتقارير الحلقات، ملفات الـ PDF، جداول Google Sheets، ونماذج الاختبارات مع إمكانية التحديث المباشر للملفات القائمة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs sm:text-sm font-black shadow-lg cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>أرشفة تقرير / ملف جديد</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#065f46]">
          <div className="bg-[#022c22]/70 p-3 rounded-xl border border-[#065f46]">
            <span className="text-[11px] text-[#86efac]/80 block">تقارير PDF محفوظة:</span>
            <span className="text-base font-black text-white font-mono">{pdfCount}</span>
          </div>
          <div className="bg-[#022c22]/70 p-3 rounded-xl border border-[#065f46]">
            <span className="text-[11px] text-[#86efac]/80 block">جداول Google Sheets:</span>
            <span className="text-base font-black text-emerald-300 font-mono">{sheetsCount}</span>
          </div>
          <div className="bg-[#022c22]/70 p-3 rounded-xl border border-[#065f46]">
            <span className="text-[11px] text-[#86efac]/80 block">نماذج Google Forms:</span>
            <span className="text-base font-black text-blue-300 font-mono">{formsCount}</span>
          </div>
          <div className="bg-[#022c22]/70 p-3 rounded-xl border border-[#065f46]">
            <span className="text-[11px] text-[#86efac]/80 block">المجمع الحالي:</span>
            <span className="text-xs font-bold text-amber-300 truncate block">{activeComplex?.name || 'الرئيسي'}</span>
          </div>
        </div>

        {/* Toast Notification */}
        {statusMessage && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-[#86efac]'
                : 'bg-red-950/90 border-red-500/50 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#022c22]/90 border border-[#065f46] p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilterType === 'all'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-sm'
                : 'bg-[#064e3b] text-[#86efac] hover:bg-[#065f46]'
            }`}
          >
            الكل ({libraryDocs.length})
          </button>
          <button
            onClick={() => setActiveFilterType('pdf_report')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilterType === 'pdf_report'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-sm'
                : 'bg-[#064e3b] text-[#86efac] hover:bg-[#065f46]'
            }`}
          >
            تقارير PDF
          </button>
          <button
            onClick={() => setActiveFilterType('google_sheet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilterType === 'google_sheet'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-sm'
                : 'bg-[#064e3b] text-[#86efac] hover:bg-[#065f46]'
            }`}
          >
            جداول Sheets
          </button>
          <button
            onClick={() => setActiveFilterType('google_form')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilterType === 'google_form'
                ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-sm'
                : 'bg-[#064e3b] text-[#86efac] hover:bg-[#065f46]'
            }`}
          >
            نماذج Forms
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Date Picker Filter */}
          <div className="flex items-center gap-1.5 bg-[#064e3b]/80 px-2.5 py-1.5 rounded-xl border border-[#065f46]">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="date"
              value={selectedDateFilter}
              onChange={e => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              title="تصفية حسب تاريخ التقرير"
            />
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter('')}
                className="text-[10px] text-red-300 hover:text-white"
                title="إلغاء تصفية التاريخ"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#86efac] absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث في الأرشيف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-[#064e3b]/80 border border-[#065f46] rounded-xl text-xs text-white placeholder-[#86efac]/50 focus:border-[#fbbf24] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Documents Grid / List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#022c22]/60 border border-[#065f46] space-y-3">
          <BookOpen className="w-12 h-12 text-[#86efac]/40 mx-auto" />
          <h3 className="text-base font-bold text-white">لا توجد ملفات أو تقارير في هذا القسم</h3>
          <p className="text-xs text-[#86efac]/70 max-w-sm mx-auto">
            عندما تقوم باستخراج تقارير الطلاب الدورية أو تصدير جداول الاختبارات، ستُحفظ تلقائياً في هذا الأرشيف لسهولة الوصول إليها وطباعتها وتحديثها.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#fbbf24] text-[#064e3b] text-xs font-black shadow-md cursor-pointer hover:bg-amber-300 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مستند أو تقرير للأرشيف</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(docItem => {
            const badge = getDocTypeBadge(docItem.type);
            const BadgeIcon = badge.icon;
            const isSyncing = syncingDocId === docItem.id;

            return (
              <div
                key={docItem.id}
                id={`library-item-${docItem.id}`}
                data-item-id={docItem.id}
                className="bg-[#022c22]/90 border border-[#065f46] hover:border-amber-400/50 rounded-2xl p-4.5 flex flex-col justify-between gap-4 shadow-lg transition-all group"
              >
                <div className="space-y-3">
                  {/* Top Badge and Date */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-bold ${badge.bg}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>

                    <span className="text-[11px] font-mono text-[#86efac]/80 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>{docItem.date}</span>
                    </span>
                  </div>

                  {/* Document Title & Description */}
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base group-hover:text-amber-300 transition-colors line-clamp-2">
                      {docItem.title}
                    </h3>
                    {docItem.description && (
                      <p className="text-xs text-[#86efac]/70 mt-1 line-clamp-2">
                        {docItem.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata: Author & Halaqah */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#065f46]/60 text-[11px] text-emerald-200/80">
                    <span>المصدر: {docItem.createdByName}</span>
                    {docItem.halaqahName && (
                      <>
                        <span>•</span>
                        <span className="text-amber-300">{docItem.halaqahName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="pt-3 border-t border-[#065f46] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Preview / View */}
                    <button
                      onClick={() => setPreviewDoc(docItem)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-[#86efac] hover:text-white border border-[#065f46] text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                      title="معاينة وقراءة المستند"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>معاينة</span>
                    </button>

                    {/* Google Link or External Sheet */}
                    {docItem.googleUrl && (
                      <a
                        href={docItem.googleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1 transition shadow-sm"
                        title="فتح في Google Drive / Sheets"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح الرابط</span>
                      </a>
                    )}

                    {/* One-Click Sync for Google Docs */}
                    {(docItem.googleSpreadsheetId || docItem.googleFormId || docItem.type === 'google_sheet') && (
                      <button
                        onClick={() => handleSyncLinkedDoc(docItem)}
                        disabled={isSyncing}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                        title="تحديث ورقة البيانات القائمة ومزامنة السجلات فورياً"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#fbbf24] ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'جارٍ التحديث...' : 'تحديث البيانات'}</span>
                      </button>
                    )}
                  </div>

                  {/* Delete Button */}
                  {(isSupervisor || isDeveloper || (docItem.halaqahId && teacherHalaqahIds.has(docItem.halaqahId)) || (docItem.createdByName === currentUserName)) && (
                    <button
                      onClick={() => setDocToDelete(docItem)}
                      className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-950/60 transition cursor-pointer"
                      title="حذف هذا المستند من الأرشيف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / ARCHIVE DOCUMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain">
          <div className="relative w-full max-w-2xl bg-[#064e3b] border border-[#fbbf24]/50 rounded-3xl shadow-2xl shadow-emerald-950/80 flex flex-col max-h-[90vh] my-auto overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#065f46] shrink-0 bg-[#022c22]/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 flex items-center justify-center text-[#fbbf24]">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-heading text-white">
                    أرشفة تقرير أو مستند جديد
                  </h3>
                  <p className="text-xs text-[#86efac]/90 mt-0.5">
                    إضافة تقرير PDF أو رابط Google Sheets/Forms إلى أرشيف المكتبة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-[#86efac] hover:text-white rounded-xl cursor-pointer hover:bg-[#064e3b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateDocument} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-right">
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  عنوان التقرير أو المستند <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="مثال: تقرير التسميع والحضور الفصلي - جمادى الأولى"
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-xl p-3 text-xs sm:text-sm text-white outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-200 mb-1">
                    نوع المستند:
                  </label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as LibraryDocumentType)}
                    className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none cursor-pointer"
                  >
                    <option value="pdf_report">تقرير PDF معتمد</option>
                    <option value="google_sheet">جدول بيانات Google Sheets</option>
                    <option value="google_form">نموذج Google Forms</option>
                    <option value="attendance_sheet">سجل حضور رسمي</option>
                    <option value="exam_results">نتائج اختبارات</option>
                    <option value="certificate_batch">دفعة شهادات معتمدة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-200 mb-1">
                    تاريخ التقرير / الأرشفة:
                  </label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={e => setDocDate(e.target.value)}
                    className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  الحلقة المخصصة {(!isSupervisor && !isDeveloper) ? <span className="text-amber-400">* (حساب المعلم مقيد بحلقته)</span> : '(اختياري)'}:
                </label>
                <select
                  value={docHalaqahId}
                  onChange={e => setDocHalaqahId(e.target.value)}
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none cursor-pointer"
                  required={!isSupervisor && !isDeveloper}
                >
                  {(isSupervisor || isDeveloper) && (
                    <option value="">-- عام لكافة الحلقات --</option>
                  )}
                  {effectiveTeacherHalaqahs.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.primaryTeacherName ? `(${h.primaryTeacherName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  رابط Google Drive / Sheets / Forms (اختياري):
                </label>
                <input
                  type="url"
                  value={docGoogleUrl}
                  onChange={e => setDocGoogleUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  ملاحظات أو وصف إضافي:
                </label>
                <textarea
                  rows={2}
                  value={docDescription}
                  onChange={e => setDocDescription(e.target.value)}
                  placeholder="وصف مختصر لمحتوى التقرير أو الإحصائيات المشمولة..."
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-xl p-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#065f46]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#86efac] hover:text-white hover:bg-[#064e3b] text-xs font-bold cursor-pointer transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs sm:text-sm shadow-md cursor-pointer transition"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ في الأرشيف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain">
          <div className="relative w-full max-w-3xl bg-[#064e3b] border border-emerald-400/50 rounded-3xl shadow-2xl shadow-emerald-950/90 flex flex-col max-h-[90vh] my-auto overflow-hidden animate-fadeIn text-[#f0f9f6]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#065f46] shrink-0 bg-[#022c22]/95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-heading text-white">
                    {previewDoc.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#86efac]/90 mt-0.5">
                    <span>التاريخ: {previewDoc.date}</span>
                    <span>•</span>
                    <span>المصدر: {previewDoc.createdByName}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-[#86efac] hover:text-white rounded-xl cursor-pointer hover:bg-[#064e3b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-right">
              <div className="bg-[#022c22]/80 p-5 rounded-2xl border border-[#065f46] space-y-3">
                <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>تفاصيل المستند والأرشيف</span>
                </h4>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                  {previewDoc.description || 'مستند رسمي مؤرشف في منظومة عُمْرَان لإدارة الحلقات والمجمعات القرآنية.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#065f46]/60 text-xs">
                  <div>
                    <span className="text-[#86efac]/80 block">المجمع القرآني:</span>
                    <strong className="text-white">{previewDoc.complexName || activeComplex?.name || 'المجمع الرئيسي'}</strong>
                  </div>
                  <div>
                    <span className="text-[#86efac]/80 block">الحلقة:</span>
                    <strong className="text-white">{previewDoc.halaqahName || 'كافة الحلقات'}</strong>
                  </div>
                </div>
              </div>

              {/* Live Styled Quranic Report Document Embed */}
              {previewDoc.fileUrl && previewDoc.fileUrl.startsWith('data:text/html') && (
                <div className="rounded-2xl border-2 border-[#065f46] overflow-hidden bg-white shadow-xl">
                  <div className="bg-[#022c22] p-2.5 px-4 flex items-center justify-between border-b border-[#065f46]">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>المعاينة الحية للتقرير القرآني الموثق بأعلى جودة</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const rawHtml = decodeURIComponent(previewDoc.fileUrl!.replace(/^data:text\/html[^,]*,/, ''));
                          const win = window.open('', '_blank');
                          if (win) {
                            win.document.open();
                            win.document.write(rawHtml);
                            win.document.close();
                          }
                        } catch (e) {
                          console.warn('Open doc window notice:', e);
                        }
                      }}
                      className="px-3 py-1 bg-[#064e3b] text-emerald-200 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-500/30 cursor-pointer"
                    >
                      <span>فتح في صفحة مستقلة</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <iframe
                    src={previewDoc.fileUrl}
                    title={previewDoc.title}
                    className="w-full h-[460px] border-0 bg-slate-50"
                  />
                </div>
              )}

              {previewDoc.googleUrl && (
                <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-500/40 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-blue-200 block">رابط الملف السحابي المتزامن:</span>
                    <span className="text-[11px] font-mono text-blue-300/80 truncate block max-w-sm" dir="ltr">
                      {previewDoc.googleUrl}
                    </span>
                  </div>
                  <a
                    href={previewDoc.googleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح الملف</span>
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-t border-[#065f46] shrink-0 bg-[#022c22]/95">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#022c22] text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-6 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black cursor-pointer shadow-md"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {docToDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#022c22] border border-rose-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">تأكيد حذف المستند من الأرشيف</h3>
            <p className="text-xs text-rose-200/80">
              هل أنت متأكد من رغبتك في حذف "{docToDelete.title}" من مكتبة وأرشيف المنظومة؟
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#064e3b] text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
