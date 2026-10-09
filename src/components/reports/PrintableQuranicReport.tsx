import React, { useState } from 'react';
import {
  BookOpen,
  Award,
  CheckCircle2,
  Calendar,
  Phone,
  User,
  Clock,
  Printer,
  Sparkles,
  FileText,
  X,
  Check,
  TrendingUp,
  ShieldCheck,
  Download,
  Flame,
  Trophy,
  FolderArchive,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Student, AttendanceRecord, StudentEvaluation, AppSettings, getStudentParentPhone, QuranComplex, LibraryDocument } from '../../types';
import { getSurahInfo } from '../../data/quranData';
import { calculateStudentCompletedPages } from '../../data/quranPagesData';
import { hexToRgb } from '../../lib/themeUtils';
import { OmranDataService } from '../../lib/firebase';
import { GoogleWorkspaceService } from '../../lib/googleWorkspace';

export type ReportDocumentType = 'individual' | 'all_students' | 'attendance' | 'custom';

export interface CustomReportFields {
  includeAttendance: boolean;
  includeMemorization: boolean;
  includeEvaluations: boolean;
  includeParentPhone: boolean;
  includePagesAndVerses: boolean;
  includeTeacherNotes: boolean;
}

export function getQuranicReportStyles(
  docPrimary: string = '#064e3b',
  docAccent: string = '#b45309',
  docSecondary: string = '#065f46',
  docCardBg: string = 'rgba(6, 78, 59, 0.05)',
  docCardGold: string = 'rgba(180, 83, 9, 0.08)'
): string {
  return `
    @page {
      size: A4 portrait;
      margin: 6mm 6mm 6mm 6mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .omran-doc-outer {
      border: 2.5px solid ${docPrimary} !important;
      border-radius: 10px !important;
      padding: 10px !important;
      background: #ffffff !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2) !important;
      width: 100% !important;
      color: #0f172a !important;
      font-family: 'Cairo', 'Tajawal', sans-serif !important;
      direction: rtl !important;
      text-align: right !important;
    }
    .omran-doc-inner {
      border: 1.5px solid ${docAccent} !important;
      border-radius: 8px !important;
      padding: 14px !important;
      background: #ffffff !important;
      position: relative !important;
    }
    .corner-glyph {
      position: absolute !important;
      color: ${docAccent} !important;
      font-size: 14px !important;
      line-height: 1 !important;
      font-family: serif !important;
      user-select: none !important;
      z-index: 10 !important;
    }
    .corner-tr { top: 4px !important; right: 6px !important; }
    .corner-tl { top: 4px !important; left: 6px !important; }
    .corner-br { bottom: 4px !important; right: 6px !important; }
    .corner-bl { bottom: 4px !important; left: 6px !important; }
    .basmala-banner {
      text-align: center !important;
      margin: 0 0 6px 0 !important;
    }
    .basmala-text {
      font-size: 12pt !important;
      font-family: 'Amiri', serif !important;
      font-weight: bold !important;
      color: ${docPrimary} !important;
      letter-spacing: 0.5px !important;
      display: inline-block !important;
    }
    .header-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-bottom: 2px solid ${docPrimary} !important;
      padding-bottom: 8px !important;
      margin-bottom: 10px !important;
      gap: 12px !important;
    }
    .header-org {
      text-align: right !important;
      font-size: 8.5pt !important;
      line-height: 1.4 !important;
      flex: 1 1 0 !important;
    }
    .org-title {
      font-size: 10pt !important;
      font-weight: 900 !important;
      color: ${docPrimary} !important;
      display: block !important;
    }
    .org-sub {
      font-size: 8pt !important;
      color: #334155 !important;
    }
    .header-center {
      text-align: center !important;
      flex: 2 1 0 !important;
    }
    .report-title-badge {
      background-color: ${docPrimary} !important;
      color: ${docAccent} !important;
      border: 1.5px solid ${docAccent} !important;
      border-radius: 9999px !important;
      padding: 4px 16px !important;
      display: inline-block !important;
      margin-bottom: 3px !important;
    }
    .report-title-badge h1 {
      font-size: 11pt !important;
      font-weight: 900 !important;
      color: #fbbf24 !important;
      margin: 0 !important;
    }
    .quran-ayah-motto {
      font-size: 8pt !important;
      font-family: 'Amiri', serif !important;
      color: ${docAccent} !important;
      font-weight: bold !important;
      margin: 0 !important;
    }
    .header-meta {
      text-align: left !important;
      font-size: 8pt !important;
      line-height: 1.3 !important;
      flex: 1 1 0 !important;
    }
    .student-identity-box {
      background-color: ${docCardBg} !important;
      border: 1.5px solid ${docPrimary} !important;
      border-radius: 8px !important;
      padding: 8px 12px !important;
      margin-bottom: 10px !important;
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 8px !important;
    }
    .identity-col {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }
    .identity-lbl {
      font-size: 7.5pt !important;
      font-weight: 700 !important;
      color: #475569 !important;
    }
    .identity-val {
      font-size: 8.5pt !important;
      font-weight: 800 !important;
      color: ${docPrimary} !important;
    }
    .stats-grid-4 {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 8px !important;
      margin-bottom: 10px !important;
    }
    .stat-card-green {
      background-color: ${docCardBg} !important;
      border: 1.5px solid ${docPrimary} !important;
      border-radius: 8px !important;
      padding: 6px 8px !important;
      text-align: center !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .stat-card-gold {
      background-color: ${docCardGold} !important;
      border: 1.5px solid ${docAccent} !important;
      border-radius: 8px !important;
      padding: 6px 8px !important;
      text-align: center !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .stat-lbl {
      font-size: 7.5pt !important;
      font-weight: 700 !important;
      color: #475569 !important;
      margin-bottom: 2px !important;
    }
    .stat-num {
      font-size: 14pt !important;
      font-weight: 900 !important;
      font-family: 'Cairo', sans-serif !important;
      line-height: 1.1 !important;
    }
    .stat-sub {
      font-size: 6.5pt !important;
      color: #64748b !important;
      margin-top: 2px !important;
    }
    .section-heading {
      font-size: 9pt !important;
      font-weight: 800 !important;
      color: ${docPrimary} !important;
      margin: 8px 0 4px 0 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      border-bottom: 1px dashed ${docPrimary} !important;
      padding-bottom: 2px !important;
    }
    .omran-doc-inner table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-top: 4px !important;
      margin-bottom: 8px !important;
      font-size: 8pt !important;
    }
    .omran-doc-inner th {
      background-color: ${docPrimary} !important;
      color: #fbbf24 !important;
      font-weight: 800 !important;
      border: 1px solid ${docPrimary} !important;
      padding: 5px 8px !important;
      font-size: 8pt !important;
      text-align: right !important;
    }
    .omran-doc-inner td {
      border: 1px solid #cbd5e1 !important;
      padding: 4px 7px !important;
      font-size: 7.5pt !important;
      text-align: right !important;
      color: #0f172a !important;
      line-height: 1.3 !important;
    }
    .omran-doc-inner tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }
    .omran-doc-inner tr:nth-child(odd) td {
      background-color: #ffffff !important;
    }
    .badge-pill {
      display: inline-block !important;
      padding: 2px 8px !important;
      border-radius: 9999px !important;
      font-size: 7pt !important;
      font-weight: 800 !important;
    }
    .badge-green {
      background-color: #dcfce7 !important;
      color: #14532d !important;
      border: 1px solid #86efac !important;
    }
    .badge-amber {
      background-color: #fef3c7 !important;
      color: #78350f !important;
      border: 1px solid #fcd34d !important;
    }
    .badge-red {
      background-color: #fee2e2 !important;
      color: #7f1d1d !important;
      border: 1px solid #fca5a5 !important;
    }
    .advice-banner {
      background-color: ${docCardGold} !important;
      border: 1.2px solid ${docAccent} !important;
      border-radius: 6px !important;
      padding: 6px 10px !important;
      font-size: 8pt !important;
      color: #78350f !important;
      line-height: 1.4 !important;
      margin: 8px 0 !important;
    }
    .seal-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-top: 1.5px solid ${docPrimary} !important;
      padding-top: 8px !important;
      margin-top: 10px !important;
    }
    .seal-info {
      font-size: 8pt !important;
      color: #334155 !important;
      line-height: 1.4 !important;
    }
    .seal-badge {
      width: 52px !important;
      height: 52px !important;
      border-radius: 50% !important;
      border: 2px double ${docAccent} !important;
      background-color: ${docCardGold} !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      padding: 2px !important;
      flex-shrink: 0 !important;
    }
    .doc-footer {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-top: 1px solid #e2e8f0 !important;
      padding-top: 5px !important;
      margin-top: 8px !important;
      font-size: 7pt !important;
      color: #64748b !important;
    }
  `;
}

interface PrintableQuranicReportProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: ReportDocumentType;
  students: Student[];
  selectedStudent?: Student;
  selectedStudentIds?: string[];
  customFields?: CustomReportFields;
  attendance: AttendanceRecord[];
  evaluations: StudentEvaluation[];
  settings: AppSettings;
  teacherName: string;
  reportType?: 'weekly' | 'monthly' | 'comprehensive';
  selectedDate?: string;
  complex?: QuranComplex | null;
  onSaveDocument?: (doc: LibraryDocument) => Promise<void>;
  getStudentLatestRecitations?: (student: Student) => {
    name: string;
    parentPhone: string;
    latestNew: string;
    latestNewDate: string;
    latestReview: string;
    latestReviewDate: string;
  };
}

export const PrintableQuranicReport: React.FC<PrintableQuranicReportProps> = ({
  isOpen,
  onClose,
  documentType,
  students,
  selectedStudent,
  selectedStudentIds = [],
  customFields = {
    includeAttendance: true,
    includeMemorization: true,
    includeEvaluations: true,
    includeParentPhone: true,
    includePagesAndVerses: true,
    includeTeacherNotes: true
  },
  attendance,
  evaluations,
  settings,
  teacherName,
  reportType = 'comprehensive',
  selectedDate = new Date().toISOString().split('T')[0],
  complex,
  onSaveDocument,
  getStudentLatestRecitations
}) => {
  if (!isOpen) return null;

  const docPrimary = complex?.theme?.primaryColor || complex?.theme?.secondaryColor || '#064e3b';
  const docAccent = complex?.theme?.accentColor || '#b45309';
  const docSecondary = complex?.theme?.secondaryColor || complex?.theme?.cardColor || '#065f46';
  const docCardBg = `rgba(${hexToRgb(docPrimary)}, 0.05)`;
  const docCardGold = `rgba(${hexToRgb(docAccent)}, 0.08)`;
  const effectiveLogoUrl = (complex?.logoUrl || settings?.themeLogoUrl || '').trim();
  const effectiveStampUrl = (complex?.stampUrl || settings?.themeStampUrl || '').trim();
  const displayComplexName = complex?.name || settings?.complexName || 'مجمع تحفيظ القرآن الكريم';
  const complexInitial = displayComplexName.replace(/^(مجمع|مراكز|حلقات|جمعية)\s+/i, '').trim().charAt(0) || 'ق';
  const [logoFailed, setLogoFailed] = useState(false);
  const [stampFailed, setStampFailed] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [librarySaveNotice, setLibrarySaveNotice] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(null);

  React.useEffect(() => {
    setLogoFailed(false);
  }, [effectiveLogoUrl]);

  React.useEffect(() => {
    setStampFailed(false);
  }, [effectiveStampUrl]);

  const todayDateObj = new Date();
  const todayFormatted = todayDateObj.toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const todayGregorian = todayDateObj.toLocaleDateString('en-GB');

  // Save report directly into Omran Library and upload to Google Drive if authorized
  const handleSaveToLibraryAndDrive = async () => {
    setIsSavingToLibrary(true);
    setLibrarySaveNotice(null);
    try {
      const docTitle = documentType === 'custom'
        ? `تقرير متابعة مخصص (${targetStudents.length} طلاب)`
        : documentType === 'all_students'
        ? `كشف المتابعة الشامل لطلاب حلقة ${settings.halaqahName || 'القرآن'}`
        : documentType === 'attendance'
        ? `كشف رصد الحضور والمواظبة (${selectedDate})`
        : `تقرير إنجاز قرآني - ${selectedStudent?.name || student?.name || 'طالب'}`;

      const printEl = document.getElementById('printable-quranic-document');
      const docHtml = printEl ? printEl.outerHTML : '<div>تقرير قرآني</div>';
      const reportStyles = getQuranicReportStyles(docPrimary, docAccent, docSecondary, docCardBg, docCardGold);
      const fullStyledHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
  <style>
    ${reportStyles}
    body {
      background-color: #f1f5f9;
      display: flex;
      justify-content: center;
      padding: 16px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div style="width: 100%; max-width: 210mm; margin: 0 auto;">
    ${docHtml}
  </div>
</body>
</html>`;

      const blob = new Blob(
        [fullStyledHtml],
        { type: 'text/html;charset=utf-8' }
      );

      let driveLink = '';
      let driveFileId: string | undefined;

      // Try Google Drive upload if connected
      try {
        const token = await GoogleWorkspaceService.getValidAccessToken();
        if (token) {
          const driveRes = await GoogleWorkspaceService.uploadPDFToDrive(
            blob,
            `${docTitle.replace(/[\/\\]/g, '_')}_${Date.now()}`,
            'تقارير منصة عمران القرآنية'
          );
          driveLink = driveRes.webViewLink;
          driveFileId = driveRes.fileId;
        }
      } catch (driveErr) {
        console.warn('Drive upload warning:', driveErr);
      }

      const docId = `lib-rep-${Date.now()}`;
      const halaqahIdVal = selectedStudent?.halaqahId || (documentType === 'individual' ? student?.halaqahId : undefined);
      const halaqahNameVal = selectedStudent?.halaqahName || settings.halaqahName || 'الحلقة القرآنية';

      // Create a persistent data URI representation for instant offline previewing
      const fallbackDataUri = `data:text/html;charset=utf-8,${encodeURIComponent(fullStyledHtml)}`;

      const libraryDoc: LibraryDocument = {
        id: docId,
        title: docTitle,
        type: 'pdf_report',
        date: new Date().toISOString().split('T')[0],
        description: `تم استخراج هذا التقرير وأرشفته من قسم التقارير القرآنية بتاريخ ${todayFormatted}`,
        fileUrl: driveLink || fallbackDataUri,
        googleUrl: driveLink || undefined,
        halaqahId: halaqahIdVal,
        halaqahName: halaqahNameVal,
        complexId: complex?.id,
        complexName: complex?.name || settings.complexName,
        createdByName: teacherName || settings.teacherName || 'معلم الحلقة',
        createdAt: new Date().toISOString(),
        tags: ['تقرير', 'PDF', halaqahNameVal]
      };

      await OmranDataService.saveLibraryDocument(libraryDoc);
      if (onSaveDocument) {
        await onSaveDocument(libraryDoc);
      }

      setLibrarySaveNotice({
        type: 'success',
        text: driveLink
          ? 'تم حفظ التقرير في المكتبة وأرشفته بنجاح على Google Drive!'
          : 'تم حفظ التقرير في قسم المكتبة والأرشيف السحابي بنجاح!',
        url: driveLink || undefined
      });
    } catch (err: any) {
      console.error('Error saving report to library:', err);
      setLibrarySaveNotice({
        type: 'error',
        text: `حدث خطأ أثناء حفظ التقرير: ${err?.message || err}`
      });
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  // Trigger high-fidelity print with complex theme styling intact
  const handlePrint = () => {
    const printEl = document.getElementById('printable-quranic-document');
    if (!printEl) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    iframe.style.border = 'none';
    iframe.id = 'omran-print-frame';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Collect parent stylesheets to ensure any base classes are available
    const parentStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>وثيقة رسمية - ${complex?.name || 'المجمع القرآني'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
        ${parentStyles}
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 6mm 6mm 6mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: ${docPrimary} !important;
            font-family: 'Cairo', 'Amiri', -apple-system, BlinkMacSystemFont, sans-serif !important;
            direction: rtl !important;
            text-align: right !important;
            font-size: 9pt;
            line-height: 1.35;
          }
          .print-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          /* CRITICAL RESET: Headings, Paragraphs, SVGs */
          h1, h2, h3, h4, h5, h6 {
            margin: 0 !important;
            padding: 0 !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
          }
          p {
            margin: 0 !important;
            padding: 0 !important;
          }
          svg {
            width: 12px !important;
            height: 12px !important;
            max-width: 12px !important;
            max-height: 12px !important;
            display: inline-block !important;
            vertical-align: middle !important;
          }

          /* OUTER & INNER LUXURY ISLAMIC FRAMES */
          .omran-doc-outer {
            border: 2.5px solid ${docPrimary} !important;
            border-radius: 8px !important;
            padding: 2.5mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
            width: 100% !important;
          }
          .omran-doc-inner {
            border: 1.5px solid ${docAccent} !important;
            border-radius: 6px !important;
            padding: 3.5mm !important;
            background: #ffffff !important;
            position: relative !important;
          }

          /* CORNER ORNAMENTS: Absolute positioning so they NEVER push content down */
          .corner-glyph {
            position: absolute !important;
            color: ${docAccent} !important;
            font-size: 13px !important;
            line-height: 1 !important;
            font-family: serif !important;
            user-select: none !important;
            z-index: 10 !important;
          }
          .corner-tr { top: 3px !important; right: 4px !important; }
          .corner-tl { top: 3px !important; left: 4px !important; }
          .corner-br { bottom: 3px !important; right: 4px !important; }
          .corner-bl { bottom: 3px !important; left: 4px !important; }

          /* 1. TOP BASMALA */
          .basmala-banner {
            text-align: center !important;
            margin: 0 0 3px 0 !important;
            padding: 0 !important;
          }
          .basmala-text {
            font-size: 10pt !important;
            font-family: 'Amiri', serif !important;
            font-weight: bold !important;
            color: ${docPrimary} !important;
            letter-spacing: 0.5px !important;
            display: inline-block !important;
          }

          /* 2. OFFICIAL EMBLEM & REPORT HEADER */
          .header-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-bottom: 2px solid ${docPrimary} !important;
            padding-bottom: 5px !important;
            margin-bottom: 6px !important;
            gap: 8px !important;
          }
          .header-org {
            text-align: right !important;
            font-size: 8pt !important;
            line-height: 1.35 !important;
            flex: 1 1 0 !important;
          }
          .org-title {
            font-size: 9pt !important;
            font-weight: 900 !important;
            color: ${docPrimary} !important;
            display: block !important;
          }
          .org-sub {
            font-size: 7.5pt !important;
            color: #334155 !important;
            display: block !important;
          }
          .header-center {
            text-align: center !important;
            flex: 0 0 auto !important;
          }
          .report-title-badge {
            display: inline-block !important;
            background-color: ${docPrimary} !important;
            color: ${docAccent} !important;
            padding: 4px 12px !important;
            border-radius: 6px !important;
            border: 1.5px solid ${docAccent} !important;
          }
          .report-title-badge h1 {
            font-size: 10.5pt !important;
            font-weight: 900 !important;
            color: ${docAccent} !important;
            margin: 0 !important;
            letter-spacing: 0.2px !important;
          }
          .quran-ayah-motto {
            font-size: 7pt !important;
            color: ${docAccent} !important;
            font-weight: 700 !important;
            margin-top: 2px !important;
          }
          .header-meta {
            text-align: left !important;
            font-size: 7.5pt !important;
            line-height: 1.35 !important;
            color: #475569 !important;
            flex: 1 1 0 !important;
          }

          /* 3. STUDENT IDENTITY BOX */
          .student-identity-box {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6px !important;
            background-color: ${docCardBg} !important;
            border: 1.5px solid ${docPrimary} !important;
            border-radius: 6px !important;
            padding: 5px 8px !important;
            margin-bottom: 6px !important;
            font-size: 8pt !important;
          }
          .identity-col {
            text-align: right !important;
          }
          .identity-lbl {
            font-size: 6.5pt !important;
            color: #64748b !important;
            font-weight: 700 !important;
            display: block !important;
          }
          .identity-val {
            font-size: 8pt !important;
            font-weight: 900 !important;
            color: ${docPrimary} !important;
            display: block !important;
          }

          /* 4. HIGH IMPACT VISUAL STATS BADGES - STRICT 4 COLUMNS */
          .stats-grid-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 5px !important;
            margin-bottom: 6px !important;
          }
          .stat-card-green {
            background-color: ${docCardBg} !important;
            border: 1px solid ${docPrimary} !important;
            border-radius: 6px !important;
            padding: 4px !important;
            text-align: center !important;
          }
          .stat-card-gold {
            background-color: ${docCardGold} !important;
            border: 1px solid ${docAccent} !important;
            border-radius: 6px !important;
            padding: 4px !important;
            text-align: center !important;
          }
          .stat-num {
            font-size: 13pt !important;
            font-weight: 900 !important;
            font-family: monospace, sans-serif !important;
            line-height: 1.1 !important;
            display: block !important;
            margin: 1px 0 !important;
          }
          .stat-lbl {
            font-size: 7pt !important;
            font-weight: 700 !important;
            color: #475569 !important;
            display: block !important;
          }
          .stat-sub {
            font-size: 6.5pt !important;
            color: #64748b !important;
            display: block !important;
          }

          /* 5. DATA TABLES & HEADINGS */
          .section-heading {
            font-size: 8.5pt !important;
            font-weight: 800 !important;
            color: ${docPrimary} !important;
            margin-bottom: 4px !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 6px !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th {
            background-color: ${docPrimary} !important;
            color: ${docAccent} !important;
            font-weight: 800 !important;
            border: 1px solid ${docPrimary} !important;
            padding: 4px 6px !important;
            font-size: 8pt !important;
            text-align: right !important;
          }
          td {
            border: 1px solid #cbd5e1 !important;
            padding: 3.5px 5px !important;
            font-size: 7.5pt !important;
            text-align: right !important;
            color: #0f172a !important;
            line-height: 1.25 !important;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          tr:nth-child(odd) td {
            background-color: #ffffff !important;
          }
          .badge-pill {
            display: inline-block !important;
            padding: 1px 6px !important;
            border-radius: 9999px !important;
            font-size: 7pt !important;
            font-weight: 800 !important;
          }
          .badge-green {
            background-color: #dcfce7 !important;
            color: #14532d !important;
            border: 1px solid #86efac !important;
          }
          .badge-amber {
            background-color: #fef3c7 !important;
            color: #78350f !important;
            border: 1px solid #fcd34d !important;
          }
          .badge-red {
            background-color: #fee2e2 !important;
            color: #7f1d1d !important;
            border: 1px solid #fca5a5 !important;
          }

          /* 6. ADVICE / RECOMMENDATION BOX */
          .advice-banner {
            background-color: ${docCardGold} !important;
            border: 1.2px solid ${docAccent} !important;
            border-radius: 5px !important;
            padding: 4px 8px !important;
            font-size: 7.5pt !important;
            color: #78350f !important;
            line-height: 1.35 !important;
            margin-bottom: 6px !important;
            page-break-inside: avoid !important;
          }

          /* 7. OFFICIAL ACCREDITATION SEAL */
          .seal-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-top: 1.5px solid ${docPrimary} !important;
            padding-top: 4px !important;
            margin-top: 5px !important;
            page-break-inside: avoid !important;
          }
          .seal-info {
            font-size: 7.5pt !important;
            color: #334155 !important;
            line-height: 1.3 !important;
          }
          .seal-badge {
            width: 48px !important;
            height: 48px !important;
            border-radius: 50% !important;
            border: 1.5px double ${docAccent} !important;
            background-color: ${docCardGold} !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 2px !important;
            flex-shrink: 0 !important;
          }

          /* 8. FOOTER */
          .doc-footer {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-top: 1px solid #e2e8f0 !important;
            padding-top: 3px !important;
            margin-top: 4px !important;
            font-size: 6.5pt !important;
            color: #64748b !important;
            page-break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${printEl.outerHTML}
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print error, falling back:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 450);
  };

  // Student specific data for individual report
  const student = selectedStudent || students[0];
  const studentEvals = student
    ? evaluations
        .filter(e => e.studentId === student.id)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, reportType === 'monthly' ? 20 : reportType === 'weekly' ? 8 : 14)
    : [];

  const studentAttendance = student
    ? attendance.filter(a => a.studentId === student.id)
    : [];

  const presentsCount = studentAttendance.filter(a => a.status === 'حاضر').length;
  const absentsCount = studentAttendance.filter(a => a.status === 'غائب').length;
  const excusedsCount = studentAttendance.filter(a => a.status === 'معتذر').length;
  const totalDaysRecorded = presentsCount + absentsCount + excusedsCount;
  const attendanceRate = totalDaysRecorded > 0 ? Math.round((presentsCount / totalDaysRecorded) * 100) : 100;

  const studentSurah = student ? getSurahInfo(student.currentSurah || 78) : null;
  const surahProgressPct = student && studentSurah
    ? Math.min(100, Math.round(((student.currentAyah || 1) / (studentSurah.numberOfAyahs || 1)) * 100))
    : 0;

  // Total verses listened/recited by student
  const totalVersesHeard = student?.listenedAyahsCount || (student?.currentAyah || 1) * 3 + studentEvals.length * 10;
  const singleStudentPages = calculateStudentCompletedPages(student, evaluations);
  const totalPagesCompleted = singleStudentPages.totalPagesCount;

  // Filter students for custom or all students document
  const targetStudents = documentType === 'custom' && selectedStudentIds.length > 0
    ? students.filter(s => selectedStudentIds.includes(s.id))
    : students;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto no-print-overlay">
      <div className="bg-[#022c22] border-2 border-[#fbbf24]/50 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Modal Top Control Bar */}
        <div className="no-print bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] px-6 py-4 border-b border-[#065f46] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                معاينة الوثيقة القرآنية الفاخرة (PDF)
              </h3>
              <p className="text-[11px] text-[#86efac]">
                وثيقة قرآنية رسمية معتمدة للمجمع • جاهزة للطباعة بدقة عالية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Save to Library & Drive Button */}
            <button
              type="button"
              disabled={isSavingToLibrary}
              onClick={handleSaveToLibraryAndDrive}
              className="px-4 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#022c22] border border-[#fbbf24]/60 hover:border-[#fbbf24] text-[#fbbf24] font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="حفظ هذا التقرير في قسم المكتبة والأرشيف السحابي ومزامنته على Google Drive"
            >
              {isSavingToLibrary ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#fbbf24] animate-spin" />
                  <span>جارٍ الحفظ في المكتبة...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4 text-[#fbbf24]" />
                  <span>حفظ في المكتبة و Drive</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_18px_rgba(251,191,36,0.35)] transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / استخراج PDF فاخر</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#86efac] hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Save Notice Banner */}
        {librarySaveNotice && (
          <div
            className={`no-print px-6 py-2.5 text-xs font-bold flex items-center justify-between gap-3 border-b ${
              librarySaveNotice.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {librarySaveNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{librarySaveNotice.text}</span>
            </div>
            {librarySaveNotice.url && (
              <a
                href={librarySaveNotice.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg bg-[#fbbf24] text-[#064e3b] font-black text-[11px] flex items-center gap-1 shrink-0 hover:bg-[#f59e0b]"
              >
                <span>معاينة في Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Scrollable Document Preview Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-[#011a14] flex justify-center items-start">
          {/* Inject dynamic Islamic Quranic styles directly for the live preview */}
          <style dangerouslySetInnerHTML={{ __html: getQuranicReportStyles(docPrimary, docAccent, docSecondary, docCardBg, docCardGold) }} />

          {/* THE OFFICIAL PRINTABLE QURANIC DOCUMENT */}
          <div
            id="printable-quranic-document"
            className="omran-doc-outer bg-white w-full max-w-[210mm] p-2.5 sm:p-3 shadow-2xl relative font-sans rounded-xl"
            style={{ borderColor: docPrimary, color: docPrimary, border: `2.5px solid ${docPrimary}` }}
            dir="rtl"
          >
            {/* Islamic Gold Decorative Outer Frame */}
            <div
              className="omran-doc-inner p-3 sm:p-3.5 rounded-lg relative bg-white"
              style={{ border: `1.5px solid ${docAccent}` }}
            >
              {/* Ornate Corner Motif Glyphs */}
              <div className="corner-glyph corner-tr select-none" style={{ color: docAccent }}>❖</div>
              <div className="corner-glyph corner-tl select-none" style={{ color: docAccent }}>❖</div>
              <div className="corner-glyph corner-br select-none" style={{ color: docAccent }}>❖</div>
              <div className="corner-glyph corner-bl select-none" style={{ color: docAccent }}>❖</div>

              {/* 1. TOP BASMALA */}
              <div className="basmala-banner text-center mb-1">
                <span className="basmala-text font-serif font-bold" style={{ color: docPrimary }}>
                  ۩ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۩
                </span>
              </div>

              {/* 2. OFFICIAL EMBLEM & REPORT HEADER */}
              <div
                className="header-row flex items-center justify-between pb-2 mb-2 gap-3"
                style={{ borderBottom: `2px solid ${docPrimary}` }}
              >
                {/* Right: Complex & Halaqah */}
                <div className="header-org text-right space-y-0.5">
                  <div className="flex items-center gap-2">
                    {effectiveLogoUrl && !logoFailed ? (
                      <img
                        src={effectiveLogoUrl}
                        alt={displayComplexName}
                        onError={() => setLogoFailed(true)}
                        style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px', border: `1px solid ${docAccent}` }}
                      />
                    ) : (
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-sm border"
                        style={{
                          backgroundColor: docPrimary,
                          color: docAccent,
                          borderColor: docAccent
                        }}
                      >
                        {complexInitial}
                      </span>
                    )}
                    <div>
                      <strong className="org-title font-heading" style={{ color: docPrimary }}>
                        {displayComplexName}
                      </strong>
                    </div>
                  </div>
                  <p className="org-sub font-bold text-slate-800">
                    حلقة: <span className="font-black" style={{ color: docPrimary }}>{settings.halaqahName || 'الحلقة القرآنية'}</span>
                  </p>
                  <p className="org-sub text-slate-700">
                    المعلم المشرف: فضيلة الشيخ / <span className="font-bold" style={{ color: docPrimary }}>{teacherName || settings.teacherName}</span>
                  </p>
                </div>

                {/* Center: Main Title Ribbon */}
                <div className="header-center text-center">
                  <div
                    className="report-title-badge shadow-sm"
                    style={{ backgroundColor: docPrimary, color: docAccent, borderColor: docAccent, border: `1.5px solid ${docAccent}` }}
                  >
                    <h1 className="font-heading" style={{ color: docAccent }}>
                      {documentType === 'custom'
                        ? 'تقرير المتابعة المخصص لطلاب الحلقة القرآنية'
                        : documentType === 'all_students'
                        ? 'كشف المتابعة الشامل لطلاب الحلقة القرآنية'
                        : documentType === 'attendance'
                        ? 'كشف رصد الحضور والمواظبة اليومي'
                        : reportType === 'monthly'
                        ? 'تقرير التقييم والإنجاز القرآني الشهري'
                        : reportType === 'weekly'
                        ? 'تقرير التقييم والإنجاز القرآني الأسبوعي'
                        : 'سجل التقييم والإنجاز القرآني الشامل للطالب'}
                    </h1>
                  </div>
                  <p className="quran-ayah-motto font-bold" style={{ color: docAccent }}>
                    ﴿ وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ ﴾
                  </p>
                </div>

                {/* Left: Metadata & Date */}
                <div className="header-meta text-left space-y-0.5">
                  <p className="font-bold" style={{ color: docPrimary }}>التاريخ: <span className="text-slate-800">{todayFormatted}</span></p>
                  <p className="font-mono text-slate-600">موافق: {todayGregorian}</p>
                  <p className="font-mono font-bold" style={{ color: docAccent }}>كود: DOC-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* DOCUMENT CONTENT TYPE 1: INDIVIDUAL STUDENT REPORT                         */}
              {/* ========================================================================= */}
              {documentType === 'individual' && student && (
                <div className="space-y-2">
                  {/* Student Identity Box */}
                  <div className="student-identity-box">
                    <div className="identity-col">
                      <span className="identity-lbl">اسم الطالب المكرم:</span>
                      <strong className="identity-val" style={{ color: docPrimary }}>{student.name}</strong>
                    </div>
                    <div className="identity-col">
                      <span className="identity-lbl">المستوى القرآني:</span>
                      <strong className="identity-val text-slate-800">{student.level}</strong>
                    </div>
                    <div className="identity-col">
                      <span className="identity-lbl">رقم هاتف ولي الأمر:</span>
                      <strong className="identity-val font-mono text-slate-900" dir="ltr">{getStudentParentPhone(student) || 'غير مسجل'}</strong>
                    </div>
                    <div className="identity-col">
                      <span className="identity-lbl">موضع الحفظ الحالي:</span>
                      <strong className="identity-val" style={{ color: docAccent }}>
                        سورة {student.currentSurahName || studentSurah?.name || 'النبأ'} (آية {student.currentAyah || 1})
                      </strong>
                    </div>
                  </div>

                  {/* High Impact Visual Stats Badges - Strict 4 columns */}
                  <div className="stats-grid-4">
                    <div className="stat-card-green">
                      <span className="stat-lbl">نسبة المواظبة والحضور:</span>
                      <span className="stat-num" style={{ color: docPrimary }}>{attendanceRate}%</span>
                      <span className="stat-sub">({presentsCount} من {totalDaysRecorded} يوم)</span>
                    </div>

                    <div className="stat-card-gold">
                      <span className="stat-lbl">الآيات التي سمعها:</span>
                      <span className="stat-num" style={{ color: docAccent }}>{totalVersesHeard}</span>
                      <span className="stat-sub">آية مسجلة ومحفوظة</span>
                    </div>

                    <div className="stat-card-green">
                      <span className="stat-lbl">الأوجه المحفوظة:</span>
                      <span className="stat-num" style={{ color: docPrimary }}>{totalPagesCompleted}</span>
                      <span className="stat-sub">وجهاً من مصحف المدينة</span>
                    </div>

                    <div className="stat-card-gold">
                      <span className="stat-lbl">رصيد النقاط المحققة:</span>
                      <span className="stat-num" style={{ color: docAccent }}>{student.points || 0}</span>
                      <span className="stat-sub">نقطة في معايير التميز</span>
                    </div>
                  </div>

                  {/* Recitations Log Table with Emerald and Gold Theme */}
                  <div>
                    <h4 className="section-heading">
                      <BookOpen style={{ width: '13px', height: '13px' }} className="text-[#b45309]" />
                      <span>سجل التسميع والمراجعة والتقييمات:</span>
                    </h4>

                    {studentEvals.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                        لا توجد سجلات تقييم مسجلة للطالب في هذه الفترة.
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '75px' }}>التاريخ</th>
                            <th>الحفظ الجديد</th>
                            <th>المراجعة والتثبيت</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>التقييم</th>
                            <th>توجيه المعلم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentEvals.map((ev, i) => {
                            const newRec = ev.recitationDetails?.todayNewItem
                              ? `سورة ${getSurahInfo(ev.recitationDetails.todayNewItem.surahNumber).name} (${ev.recitationDetails.todayNewItem.fromAyah || 1}-${ev.recitationDetails.todayNewItem.toAyah || 1})`
                              : ev.recitationDetails?.newMemorizationAchieved || '—';

                            const revRec = ev.recitationDetails?.todayReviewItems && ev.recitationDetails.todayReviewItems.length > 0
                              ? ev.recitationDetails.todayReviewItems.map(item => {
                                  const s1 = getSurahInfo(item.surahNumber || 78);
                                  const s2 = item.toSurahNumber ? getSurahInfo(item.toSurahNumber) : s1;
                                  if (item.toSurahNumber && item.toSurahNumber !== item.surahNumber) {
                                    return `من سورة ${s1.name} (آية ${item.fromAyah || 1}) إلى سورة ${s2.name} (آية ${item.toAyah || 1})`;
                                  }
                                  return `سورة ${s1.name} (${item.fromAyah || 1}-${item.toAyah || 1})`;
                                }).join(' • ')
                              : ev.recitationDetails?.reviewAchieved || '—';

                            const firstCritScore = Object.values(ev.criteriaValues || {})[0];

                            return (
                              <tr key={ev.id || i}>
                                <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{ev.date}</td>
                                <td style={{ fontWeight: 'bold', color: '#064e3b' }}>{newRec}</td>
                                <td>{revRec}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="badge-pill badge-green">
                                    {firstCritScore ? `${firstCritScore}` : 'متميز'}
                                  </span>
                                </td>
                                <td>
                                  {ev.recitationDetails?.teacherNotes || 'أداء طيب ومتقن بارك الله فيه.'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Teacher Recommendation Box */}
                  <div className="advice-banner">
                    <strong style={{ display: 'block', color: '#b45309', marginBottom: '2px', fontWeight: 'bold' }}>
                      توجيه المعلم المحفّظ لولي الأمر:
                    </strong>
                    يرجى حث الطالب على المتابعة اليومية والاستماع للتلاوات المتقنة لتثبيت الحفظ، فالمتابعة المنزلية ركيزة أساسية في رسوخ القرآن الكريم في صدر الطالب.
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* DOCUMENT CONTENT TYPE 2: CUSTOM / ALL STUDENTS ROSTER                     */}
              {/* ========================================================================= */}
              {(documentType === 'custom' || documentType === 'all_students') && (
                <div className="space-y-2">
                  <div className="student-identity-box flex items-center justify-between" style={{ display: 'flex' }}>
                    <span>عدد الطلاب المشمولين بالتقرير: <strong className="text-[#064e3b] font-black">{targetStudents.length} طالباً</strong></span>
                    <span>تاريخ الإصدار: <strong className="font-mono text-[#064e3b]">{todayFormatted}</strong></span>
                    <span>الحالة: <strong className="text-emerald-700">معتمد رسمياً</strong></span>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '28px', textAlign: 'center' }}>م</th>
                        <th>اسم الطالب</th>
                        {customFields.includeParentPhone && (
                          <th style={{ width: '90px', textAlign: 'center' }}>هاتف ولي الأمر</th>
                        )}
                        {customFields.includeMemorization && (
                          <th>الموضع الحالي (الحفظ والمراجعة)</th>
                        )}
                        {customFields.includeAttendance && (
                          <th style={{ width: '70px', textAlign: 'center' }}>نسبة الحضور</th>
                        )}
                        {customFields.includePagesAndVerses && (
                          <th style={{ width: '70px', textAlign: 'center' }}>الأوجه المنجزة</th>
                        )}
                        {customFields.includeEvaluations && (
                          <th style={{ width: '65px', textAlign: 'center' }}>آخر تقييم</th>
                        )}
                        {customFields.includeTeacherNotes && (
                          <th>ملاحظات وتوجيه</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {targetStudents.map((std, idx) => {
                        const recData = getStudentLatestRecitations ? getStudentLatestRecitations(std) : null;
                        const sInfo = getSurahInfo(std.currentSurah || 78);
                        const newText = recData?.latestNew || `سورة ${std.currentSurahName || sInfo.name} (${std.currentAyah || 1})`;
                        const revText = recData?.latestReview || 'المراجعة المقررة';

                        // Student attendance percentage
                        const stdAtt = attendance.filter(a => a.studentId === std.id);
                        const pres = stdAtt.filter(a => a.status === 'حاضر').length;
                        const attPct = stdAtt.length > 0 ? Math.round((pres / stdAtt.length) * 100) : 100;

                        // Latest evaluation
                        const stdEval = evaluations.find(e => e.studentId === std.id);
                        const evalScore = stdEval ? Object.values(stdEval.criteriaValues || {})[0] || 'ممتاز' : '—';
                        const note = stdEval?.recitationDetails?.teacherNotes || std.notes || 'منتظم ومتقن';

                        const stdProgress = calculateStudentCompletedPages(std, evaluations);
                        const pagesCount = stdProgress.totalPagesCount;

                        return (
                          <tr key={std.id}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 'bold', color: docPrimary }}>{std.name}</td>
                            {customFields.includeParentPhone && (
                              <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }} dir="ltr">
                                {getStudentParentPhone(std) || '—'}
                              </td>
                            )}
                            {customFields.includeMemorization && (
                              <td>
                                <span style={{ fontWeight: 'bold', color: docPrimary, display: 'block' }}>{newText}</span>
                                <span style={{ fontSize: '6.5pt', color: '#64748b' }}>{revText}</span>
                              </td>
                            )}
                            {customFields.includeAttendance && (
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge-pill badge-green">
                                  {attPct}%
                                </span>
                              </td>
                            )}
                            {customFields.includePagesAndVerses && (
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: docAccent, fontFamily: 'monospace' }}>
                                {pagesCount} وجه
                              </td>
                            )}
                            {customFields.includeEvaluations && (
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge-pill badge-amber">
                                  {evalScore}
                                </span>
                              </td>
                            )}
                            {customFields.includeTeacherNotes && (
                              <td>{note}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* DOCUMENT CONTENT TYPE 3: ATTENDANCE SHEET                                  */}
              {/* ========================================================================= */}
              {documentType === 'attendance' && (
                <div className="space-y-2">
                  <div className="student-identity-box flex items-center justify-between" style={{ display: 'flex' }}>
                    <span>كشف رصد الحضور والمواظبة ليوم: <strong className="text-[#064e3b] font-black">{selectedDate}</strong></span>
                    <span>عدد الطلاب: <strong className="text-[#064e3b] font-black">{students.length} طالباً</strong></span>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '28px', textAlign: 'center' }}>م</th>
                        <th>اسم الطالب</th>
                        <th style={{ width: '75px', textAlign: 'center' }}>حالة الحضور</th>
                        <th>ملاحظات العذر / التبرير</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>الاعتماد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((std, idx) => {
                        const att = attendance.find(a => a.studentId === std.id && a.date === selectedDate);
                        const status = att?.status || 'حاضر';
                        return (
                          <tr key={std.id}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 'bold' }}>{std.name}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge-pill ${
                                status === 'حاضر'
                                  ? 'badge-green'
                                  : status === 'غائب'
                                  ? 'badge-red'
                                  : 'badge-amber'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td>{att?.note || '—'}</td>
                            <td style={{ textAlign: 'center', color: '#15803d', fontWeight: 'bold' }}>معتمد</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. OFFICIAL ELECTRONIC CERTIFICATION & GOLD SEAL */}
              <div className="seal-row" style={{ borderTop: `1.5px solid ${docPrimary}` }}>
                <div className="seal-info">
                  <div style={{ fontWeight: 'bold', color: docPrimary, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <ShieldCheck style={{ width: '13px', height: '13px', color: docAccent }} />
                    <span>الاعتماد الرسمي لإدارة {displayComplexName}:</span>
                  </div>
                  <p style={{ fontSize: '7.5pt', color: '#1e293b' }}>
                    هذه الوثيقة صادرة ومعتمدة رسمياً من إدارة {displayComplexName}
                  </p>
                </div>

                {/* Bottom Left: Official Stamp or Seal Badge */}
                <div
                  className="seal-badge"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1.5px double ${docAccent}`,
                    backgroundColor: docCardGold
                  }}
                >
                  {effectiveStampUrl && !stampFailed ? (
                    <img
                      src={effectiveStampUrl}
                      alt="ختم المجمع"
                      onError={() => setStampFailed(true)}
                      style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '50%' }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-1 text-center">
                      <span style={{ fontSize: '8pt', color: docAccent, fontWeight: '900', lineHeight: 1.1 }}>
                        ختم معتمد
                      </span>
                      <span style={{ fontSize: '6pt', color: docPrimary, fontWeight: 'bold', marginTop: '1px' }}>
                        {complexInitial}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. FOOTER VERSE */}
              <div className="doc-footer">
                <span>﴿ إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ ﴾</span>
                <span>صفحة 1 من 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
