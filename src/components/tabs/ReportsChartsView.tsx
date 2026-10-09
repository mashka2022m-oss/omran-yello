import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  BookOpen,
  Award,
  Calendar,
  Users,
  CheckCircle2,
  Filter,
  Activity,
  Layers,
  FileText,
  Clock,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserX,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { Student, StudentEvaluation, AttendanceRecord, AppSettings } from '../../types';
import { getSurahInfo, QURAN_SURAHS } from '../../data/quranData';

interface ReportsChartsViewProps {
  students: Student[];
  evaluations: StudentEvaluation[];
  attendance: AttendanceRecord[];
  settings: AppSettings;
  selectedStudentId?: string;
}

export const ReportsChartsView: React.FC<ReportsChartsViewProps> = ({
  students,
  evaluations,
  attendance,
  settings,
  selectedStudentId: initialStudentId
}) => {
  const [activeTab, setActiveTab] = useState<'surahs' | 'pages' | 'attendance' | 'master_table'>('surahs');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<string>(
    initialStudentId || (students[0]?.id || '')
  );

  useEffect(() => {
    if (students.length > 0) {
      if (!selectedStudentForDetail || !students.some(s => s.id === selectedStudentForDetail)) {
        setSelectedStudentForDetail(students[0].id);
      }
    } else {
      setSelectedStudentForDetail('');
    }
  }, [students, selectedStudentForDetail]);

  // Filter evaluations by time range
  const filteredEvaluations = useMemo(() => {
    if (timeRange === 'all') {
      return [...evaluations].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }

    const daysCount = timeRange === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysCount);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return evaluations
      .filter(e => e.date && e.date >= cutoffStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [evaluations, timeRange]);

  // Filter attendance by time range
  const filteredAttendance = useMemo(() => {
    if (timeRange === 'all') return attendance;
    const daysCount = timeRange === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysCount);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return attendance.filter(a => a.date && a.date >= cutoffStr);
  }, [attendance, timeRange]);

  // Comprehensive Student Stats Aggregation
  const studentMetrics = useMemo(() => {
    return students.map(student => {
      // 1. Current Surah & Progress
      const curSurahNum = student.currentSurah || 78;
      const curSurahInfo = getSurahInfo(curSurahNum);
      const curAyah = student.currentAyah || 1;
      const totalAyahsInCurSurah = curSurahInfo.numberOfAyahs || 1;
      const surahProgressPct = Math.min(100, Math.round((curAyah / totalAyahsInCurSurah) * 100));

      // Calculate approximate completed surahs based on progress or recorded milestones
      // E.g. in Juz Amma (Surahs 78 to 114): if student is at surah 90, they have finished 114 down to 91 or 78 up to 89
      let completedSurahsCount = 0;
      const completedSurahNames: string[] = [];

      // Check evaluations for finished surahs
      const studentEvals = filteredEvaluations.filter(e => e.studentId === student.id);
      studentEvals.forEach(ev => {
        const text = (ev.recitationDetails?.newMemorizationAchieved || '') + ' ' + (ev.recitationDetails?.reviewAchieved || '');
        if (text.includes('ختام سورة') || text.includes('كاملة')) {
          completedSurahsCount += 1;
        }
      });

      // Baseline estimate from currentSurah if > 1 or student has completed portions
      if (curAyah >= totalAyahsInCurSurah) {
        completedSurahNames.push(curSurahInfo.name);
      }

      // 2. Pages Completed in the selected period
      let pagesCount = 0;
      studentEvals.forEach(ev => {
        if (ev.recitationDetails?.pagesCompletedToday && ev.recitationDetails.pagesCompletedToday.length > 0) {
          pagesCount += ev.recitationDetails.pagesCompletedToday.length;
        } else {
          // Estimate from recitation text
          const hasNew = Boolean(
            ev.recitationDetails?.todayNewItem?.surahNumber ||
            (ev.recitationDetails?.newMemorizationAchieved &&
             !ev.recitationDetails.newMemorizationAchieved.includes('لم يسم'))
          );
          if (hasNew) pagesCount += 1;
        }
      });

      // 3. Attendance Stats
      const studentAtt = filteredAttendance.filter(a => a.studentId === student.id);
      const presentDays = studentAtt.filter(a => a.status === 'حاضر').length;
      const absentDays = studentAtt.filter(a => a.status === 'غائب').length;
      const excusedDays = studentAtt.filter(a => a.status === 'معتذر').length;
      const totalRecordedDays = presentDays + absentDays + excusedDays;
      const attendanceRate = totalRecordedDays > 0 ? Math.round((presentDays / totalRecordedDays) * 100) : 100;

      return {
        student,
        id: student.id,
        name: student.name,
        shortName: student.name.split(' ')[0] || student.name,
        currentSurahName: student.currentSurahName || curSurahInfo.name,
        currentAyah: curAyah,
        totalAyahsInCurSurah,
        surahProgressPct,
        completedSurahsCount: Math.max(completedSurahsCount, curAyah >= totalAyahsInCurSurah ? 1 : 0),
        pagesCount,
        presentDays,
        absentDays,
        excusedDays,
        totalRecordedDays,
        attendanceRate,
        evaluationsCount: studentEvals.length
      };
    });
  }, [students, filteredEvaluations, filteredAttendance]);

  // Overall KPIs
  const overallKPIs = useMemo(() => {
    let totalCompletedSurahs = 0;
    let totalPages = 0;
    let totalPresents = 0;
    let totalAbsents = 0;
    let totalExcuses = 0;

    studentMetrics.forEach(m => {
      totalCompletedSurahs += m.completedSurahsCount;
      totalPages += m.pagesCount;
      totalPresents += m.presentDays;
      totalAbsents += m.absentDays;
      totalExcuses += m.excusedDays;
    });

    const totalDays = totalPresents + totalAbsents + totalExcuses;
    const avgAttendance = totalDays > 0 ? Math.round((totalPresents / totalDays) * 100) : 100;

    return {
      totalCompletedSurahs,
      totalPages,
      totalPresents,
      totalAbsents,
      totalExcuses,
      avgAttendance,
      studentsCount: students.length
    };
  }, [studentMetrics, students]);

  // Chart Data: Surahs per student
  const surahsChartData = useMemo(() => {
    return studentMetrics.map(m => ({
      name: m.shortName,
      fullName: m.name,
      'السور المنجزة': m.completedSurahsCount,
      'نسبة إنجاز السورة الحالية': m.surahProgressPct
    }));
  }, [studentMetrics]);

  // Chart Data: Pages per student
  const pagesChartData = useMemo(() => {
    return studentMetrics.map(m => ({
      name: m.shortName,
      fullName: m.name,
      'الأوجه المنجزة': m.pagesCount,
      'جلسات التقييم': m.evaluationsCount
    }));
  }, [studentMetrics]);

  // Chart Data: Attendance vs Absence
  const attendanceChartData = useMemo(() => {
    return studentMetrics.map(m => ({
      name: m.shortName,
      fullName: m.name,
      'حضور': m.presentDays,
      'غياب': m.absentDays,
      'اعتذار': m.excusedDays
    }));
  }, [studentMetrics]);

  // Pie Data for overall attendance
  const attendancePieData = useMemo(() => {
    return [
      { name: 'حاضر', value: overallKPIs.totalPresents || 1, color: '#10b981' },
      { name: 'غائب', value: overallKPIs.totalAbsents || 0, color: '#ef4444' },
      { name: 'معتذر', value: overallKPIs.totalExcuses || 0, color: '#f59e0b' }
    ];
  }, [overallKPIs]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#022c22]/95 border border-amber-400/50 p-3 rounded-2xl shadow-2xl text-xs text-white space-y-1" dir="rtl">
          <div className="font-bold text-[#fbbf24] border-b border-[#065f46] pb-1">
            {label}
          </div>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[#86efac]">{item.name}:</span>
              <span className="font-bold font-mono text-white">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-[32px] p-6 shadow-xl backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-heading text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-[#fbbf24]" />
            <span>لوحة الإحصائيات والإنجاز القرآني الشاملة</span>
          </h3>
          <p className="text-xs text-[#86efac]/90 mt-1">
            إحصائيات واضحة ومباشرة عن: السور المنجزة، الأوجه المحفوظة، وسجل الحضور والغياب للطلاب
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-2 bg-[#022c22] border border-[#065f46] p-1.5 rounded-2xl text-xs">
          <span className="text-xs text-[#86efac] px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>الفترة:</span>
          </span>
          <button
            type="button"
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              timeRange === '7d'
                ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
                : 'text-[#86efac]/70 hover:text-white'
            }`}
          >
            آخر 7 أيام
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              timeRange === '30d'
                ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
                : 'text-[#86efac]/70 hover:text-white'
            }`}
          >
            آخر 30 يوماً
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              timeRange === 'all'
                ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
                : 'text-[#86efac]/70 hover:text-white'
            }`}
          >
            كامل السجل
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-[#064e3b]/50 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-lg space-y-1">
          <div className="text-xs text-[#86efac] flex items-center justify-between">
            <span>إجمالي السور المنجزة</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
            {overallKPIs.totalCompletedSurahs}
          </div>
          <p className="text-[10px] text-slate-300">سورة مكتملة تم إتقانها</p>
        </div>

        <div className="bg-[#064e3b]/50 border border-amber-400/40 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-lg space-y-1">
          <div className="text-xs text-amber-200 flex items-center justify-between">
            <span>الأوجه المنجزة (مصحف المدينة)</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
            {overallKPIs.totalPages}
          </div>
          <p className="text-[10px] text-slate-300">وجهاً تم حفظها وتسميعها</p>
        </div>

        <div className="bg-[#064e3b]/50 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-lg space-y-1">
          <div className="text-xs text-[#86efac] flex items-center justify-between">
            <span>نسبة مواظبة الطلاب</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {overallKPIs.avgAttendance}%
          </div>
          <p className="text-[10px] text-slate-300">
            {overallKPIs.totalPresents} يوم حضور مقابل {overallKPIs.totalAbsents} غياب
          </p>
        </div>

        <div className="bg-[#064e3b]/50 border border-emerald-600/40 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-lg space-y-1">
          <div className="text-xs text-[#86efac] flex items-center justify-between">
            <span>إجمالي الطلاب بالحلقة</span>
            <Users className="w-4 h-4 text-[#fbbf24]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#fbbf24] font-mono">
            {students.length}
          </div>
          <p className="text-[10px] text-slate-300">طالباً مسجلين في المتابعة الحية</p>
        </div>
      </div>

      {/* Tabs Switcher: Exactly the 3 requested points + Master Table */}
      <div className="flex items-center gap-2 p-1.5 bg-[#022c22] border border-[#065f46] rounded-2xl flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('surahs')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'surahs'
              ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
              : 'text-[#86efac]/70 hover:text-white hover:bg-[#064e3b]/40'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>السور المنجزة والمحفوظة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
              : 'text-[#86efac]/70 hover:text-white hover:bg-[#064e3b]/40'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>الأوجه والآيات المنجزة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
              : 'text-[#86efac]/70 hover:text-white hover:bg-[#064e3b]/40'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>حضور وغياب الطلاب</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('master_table')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'master_table'
              ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black'
              : 'text-[#86efac]/70 hover:text-white hover:bg-[#064e3b]/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>كشف الحصيلة الشامل للطلاب</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SURAHS COMPLETED TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'surahs' && (
        <div className="space-y-6">
          <div className="bg-[#064e3b]/70 border border-[#065f46] rounded-[32px] p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#065f46] pb-3">
              <div>
                <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#fbbf24]" />
                  <span>رسم بياني: عدد السور المنجزة لكل طالب</span>
                </h4>
                <p className="text-xs text-[#86efac]/80 mt-0.5">
                  يوضح عدد السور التي أتم الطالب تسميعها وإتقانها بالكامل
                </p>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={surahsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#065f46" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#86efac" fontSize={11} angle={-20} textAnchor="end" />
                  <YAxis stroke="#86efac" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="السور المنجزة" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Student Surah Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentMetrics.map(m => (
              <div
                key={m.id}
                className="bg-[#022c22] border border-[#065f46] rounded-2xl p-4 space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-[#fbbf24] flex items-center justify-center font-bold text-xs">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-white">{m.name}</h5>
                      <span className="text-[10px] text-[#86efac]">
                        سورة {m.currentSurahName} (الآية {m.currentAyah} من {m.totalAyahsInCurSurah})
                      </span>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {m.completedSurahsCount} سورة
                  </span>
                </div>

                {/* Progress in current Surah */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#86efac]/80">إنجاز سورة {m.currentSurahName}</span>
                    <span className="font-mono text-[#fbbf24] font-bold">{m.surahProgressPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#064e3b] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#fbbf24] rounded-full transition-all"
                      style={{ width: `${m.surahProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PAGES COMPLETED TAB                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="bg-[#064e3b]/70 border border-[#065f46] rounded-[32px] p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#065f46] pb-3">
              <div>
                <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#fbbf24]" />
                  <span>رسم بياني: الأوجه المنجزة لكل طالب (مصحف المدينة)</span>
                </h4>
                <p className="text-xs text-[#86efac]/80 mt-0.5">
                  إجمالي الأوجه القرآنية التي أنجزها كل طالب خلال الفترة المحددة ({timeRange === '7d' ? 'آخر 7 أيام' : timeRange === '30d' ? 'آخر 30 يوماً' : 'كامل السجل'})
                </p>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pagesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#065f46" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#86efac" fontSize={11} angle={-20} textAnchor="end" />
                  <YAxis stroke="#86efac" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="الأوجه المنجزة" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Pages Table */}
          <div className="bg-[#022c22] border border-[#065f46] rounded-3xl p-5 shadow-xl overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#065f46] text-[#86efac]">
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">موضع الحفظ الحالي</th>
                  <th className="p-3 text-center">الأوجه المنجزة بالفترة</th>
                  <th className="p-3 text-center">جلسات التسميع</th>
                  <th className="p-3 text-center">المعدل اليومي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#065f46]/40">
                {studentMetrics.map(m => (
                  <tr key={m.id} className="hover:bg-[#064e3b]/30 transition-colors">
                    <td className="p-3 font-bold text-white">{m.name}</td>
                    <td className="p-3 text-[#86efac]">
                      سورة {m.currentSurahName} (الآية {m.currentAyah})
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-[#fbbf24] text-sm">
                      {m.pagesCount} أوجه
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-300">
                      {m.evaluationsCount} جلسة
                    </td>
                    <td className="p-3 text-center text-slate-300">
                      {m.evaluationsCount > 0 ? (m.pagesCount / m.evaluationsCount).toFixed(1) : '0'} وجه/جلسة
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ATTENDANCE & ABSENCE TAB                                               */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attendance vs Absence Bar Chart */}
            <div className="lg:col-span-2 bg-[#064e3b]/70 border border-[#065f46] rounded-[32px] p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-[#065f46] pb-3">
                <div>
                  <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#fbbf24]" />
                    <span>مقارنة أيام الحضور والغياب للطلاب</span>
                  </h4>
                  <p className="text-xs text-[#86efac]/80 mt-0.5">
                    رصد تفصيلي لالتزام كل طالب بالحضور والغياب
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>حضور</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-red-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span>غياب</span>
                  </span>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#065f46" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#86efac" fontSize={11} angle={-20} textAnchor="end" />
                    <YAxis stroke="#86efac" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="حضور" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="غياب" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Distribution Pie */}
            <div className="bg-[#022c22] border border-[#065f46] rounded-[32px] p-6 shadow-xl flex flex-col items-center justify-between">
              <h4 className="text-sm font-bold text-white font-heading pb-2 border-b border-[#065f46] w-full text-center">
                توزيع نسب الحضور الإجمالية
              </h4>

              <div className="h-48 w-full my-auto flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {attendancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-[#065f46]">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-300 block">حاضر</span>
                  <strong className="text-white font-mono">{overallKPIs.totalPresents}</strong>
                </div>
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                  <span className="text-[10px] text-red-300 block">غائب</span>
                  <strong className="text-white font-mono">{overallKPIs.totalAbsents}</strong>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-[10px] text-amber-300 block">معتذر</span>
                  <strong className="text-white font-mono">{overallKPIs.totalExcuses}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Student Attendance Ranking List */}
          <div className="bg-[#022c22] border border-[#065f46] rounded-3xl p-5 shadow-xl overflow-x-auto">
            <h4 className="text-sm font-bold text-white font-heading mb-3">
              ترتيب الطلاب حسب نسبة المواظبة والالتزام
            </h4>
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#065f46] text-[#86efac]">
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3 text-center">أيام الحضور</th>
                  <th className="p-3 text-center">أيام الغياب</th>
                  <th className="p-3 text-center">أيام الاعتذار</th>
                  <th className="p-3 text-center">نسبة الالتزام</th>
                  <th className="p-3 text-center">تقييم الالتزام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#065f46]/40">
                {studentMetrics
                  .slice()
                  .sort((a, b) => b.attendanceRate - a.attendanceRate)
                  .map(m => (
                    <tr key={m.id} className="hover:bg-[#064e3b]/30 transition-colors">
                      <td className="p-3 font-bold text-white">{m.name}</td>
                      <td className="p-3 text-center font-mono text-emerald-400 font-bold">{m.presentDays}</td>
                      <td className="p-3 text-center font-mono text-red-400 font-bold">{m.absentDays}</td>
                      <td className="p-3 text-center font-mono text-amber-300">{m.excusedDays}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#fbbf24] text-sm">
                        {m.attendanceRate}%
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.attendanceRate >= 90
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : m.attendanceRate >= 75
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}
                        >
                          {m.attendanceRate >= 90
                            ? 'مواظبة ممتازة'
                            : m.attendanceRate >= 75
                            ? 'مواظبة مقبولة'
                            : 'يحتاج متابعة وتنبيه'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MASTER COMPREHENSIVE SUMMARY TABLE                                     */}
      {/* ========================================================================= */}
      {activeTab === 'master_table' && (
        <div className="bg-[#022c22] border border-[#065f46] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#065f46] pb-3">
            <div>
              <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#fbbf24]" />
                <span>كشف الحصيلة الشاملة لجميع طلاب الحلقة</span>
              </h4>
              <p className="text-xs text-[#86efac]/80 mt-0.5">
                جدول متكامل يجمع السور المنجزة، الأوجه المحفوظة، ونسب الحضور والغياب لكل طالب
              </p>
            </div>
            <span className="text-xs text-[#86efac] font-mono">
              إجمالي الطلاب: {students.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#065f46] text-[#86efac]">
                  <th className="p-3 w-8 text-center">م</th>
                  <th className="p-3">اسم الطالب المكرم</th>
                  <th className="p-3">موضع الحفظ الحالي</th>
                  <th className="p-3 text-center">السور المنجزة</th>
                  <th className="p-3 text-center">الأوجه المنجزة</th>
                  <th className="p-3 text-center">أيام الحضور</th>
                  <th className="p-3 text-center">أيام الغياب</th>
                  <th className="p-3 text-center">نسبة الالتزام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#065f46]/40">
                {studentMetrics.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-[#064e3b]/30 transition-colors">
                    <td className="p-3 text-center font-mono text-[#86efac]/70">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{m.name}</td>
                    <td className="p-3 text-[#86efac]">
                      سورة {m.currentSurahName} (آية {m.currentAyah})
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-400">
                      {m.completedSurahsCount} سورة
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-[#fbbf24]">
                      {m.pagesCount} وجه
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-300">{m.presentDays}</td>
                    <td className="p-3 text-center font-mono text-red-400">{m.absentDays}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          m.attendanceRate >= 85
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}
                      >
                        {m.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
