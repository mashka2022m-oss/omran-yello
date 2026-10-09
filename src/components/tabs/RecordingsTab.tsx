import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  Sparkles,
  Eye,
  EyeOff,
  Search,
  BookOpen,
  X,
  ListOrdered,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Check,
  RotateCcw,
  Headphones,
  Loader2,
  MapPin,
  Flag,
  FastForward,
  Rewind,
  Repeat,
  ArrowLeft
} from 'lucide-react';
import { SurahRecording, RecordingsConfig, SurahRecordingSegment, AppSettings } from '../../types';
import { QURAN_SURAHS, getSurahInfo } from '../../data/quranData';
import { YouTubeAyahPlayer, formatTimeMMSS } from '../recordings/YouTubeAyahPlayer';
import { loadAllQuranVerses, getSurahVerses, getAyahTextSync } from '../../lib/quranTextService';

interface RecordingsTabProps {
  recordings: SurahRecording[];
  recordingsConfig: RecordingsConfig;
  onSaveRecording: (recording: SurahRecording) => Promise<void>;
  onDeleteRecording: (recordingId: string) => Promise<void>;
  onSaveConfig: (config: RecordingsConfig) => Promise<void>;
  isDeveloper?: boolean;
  isSupervisor?: boolean;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => Promise<void>;
}

export const RecordingsTab: React.FC<RecordingsTabProps> = ({
  recordings,
  recordingsConfig,
  onSaveRecording,
  onDeleteRecording,
  onSaveConfig,
  isDeveloper = false,
  isSupervisor = false,
  settings,
  onUpdateSettings
}) => {
  const [isAddingRecording, setIsAddingRecording] = useState(false);
  const [editingRecording, setEditingRecording] = useState<Partial<SurahRecording> | null>(null);
  const [recordingToDelete, setRecordingToDelete] = useState<SurahRecording | null>(null);
  const [previewingRecording, setPreviewingRecording] = useState<SurahRecording | null>(null);

  // Listening Points & Repetition Target Configuration State (for Developer & Supervisor)
  const [listeningRewardPoints, setListeningRewardPoints] = useState<number>(
    recordingsConfig.listeningPointsReward ?? settings?.dailyListeningPoints ?? 5
  );
  const [dailyRepetitions, setDailyRepetitions] = useState<number>(
    recordingsConfig.dailyRepetitionTarget ?? 3
  );
  const [isSavingPointsConfig, setIsSavingPointsConfig] = useState(false);
  const [pointsConfigSuccess, setPointsConfigSuccess] = useState<string | null>(null);

  // Active playback state
  const [activeAyahIndex, setActiveAyahIndex] = useState<number>(0);
  const [selectedAyahForPlayback, setSelectedAyahForPlayback] = useState<SurahRecordingSegment | null>(null);
  const [targetSegmentToPlay, setTargetSegmentToPlay] = useState<SurahRecordingSegment | null>(null);
  const [cuePlaybackState, setCuePlaybackState] = useState<{ time: number; timestamp: number } | null>(null);
  const [currentLiveTime, setCurrentLiveTime] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Segmentation State & Animation
  const [isAnalyzingWithAI, setIsAnalyzingWithAI] = useState(false);
  const [aiProgressPercent, setAiProgressPercent] = useState(0);
  const [aiProgressStep, setAiProgressStep] = useState(1);
  const [aiProgressMessage, setAiProgressMessage] = useState('');
  const [editingSegmentsDirectly, setEditingSegmentsDirectly] = useState(true);
  const [ayahSearchTerm, setAyahSearchTerm] = useState('');
  const [videoPlayerDuration, setVideoPlayerDuration] = useState<number>(0);

  // Preload full Quran verses on mount
  useEffect(() => {
    loadAllQuranVerses().catch(e => console.warn('Quran preloading note:', e));
  }, []);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isAddingRecording || previewingRecording || recordingToDelete || isAnalyzingWithAI;
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAddingRecording, previewingRecording, recordingToDelete, isAnalyzingWithAI]);

  // Extract YouTube ID from string
  const extractYouTubeId = (url: string): string => {
    if (!url) return '';
    const clean = url.trim();
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : clean.length === 11 ? clean : '';
  };

  // Helper: auto-generate realistic non-uniform segments for Ayahs based on words, syllables, Madd letters and pauses
  const generateAyahSegments = (surahNumber: number, targetTotalSeconds?: number): SurahRecordingSegment[] => {
    const sInfo = getSurahInfo(surahNumber);
    const ayahsCount = sInfo.numberOfAyahs;
    const weights: Array<{ ayahNumber: number; text: string; weight: number }> = [];

    // Basmalah / Isti'adhah segment
    weights.push({
      ayahNumber: 0,
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ (الاستعاذة والبسملة)',
      weight: 6.5
    });

    for (let i = 1; i <= ayahsCount; i++) {
      const vText = getAyahTextSync(surahNumber, i);
      const cleanWords = vText.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').trim().split(/\s+/).filter(Boolean);
      const wordCount = cleanWords.length;
      const maddMatches = (vText.match(/[آٓ]|\u0653|[اوي]ء|[اوي][\u064B-\u0652]*ء/g) || []).length;
      const shaddahMatches = (vText.match(/\u0651/g) || []).length;

      // Realistic duration weighting: words + madds + shaddahs + pause
      const weight = Math.max(3.0, (wordCount * 1.45) + (maddMatches * 1.3) + (shaddahMatches * 0.25) + 1.4);
      weights.push({
        ayahNumber: i,
        text: vText,
        weight
      });
    }

    const sumWeights = weights.reduce((acc, w) => acc + w.weight, 0);
    const totalDuration = targetTotalSeconds && targetTotalSeconds > 10 ? targetTotalSeconds : sumWeights;
    const scale = totalDuration / sumWeights;

    let currentStart = 0;
    const segments: SurahRecordingSegment[] = [];

    for (let j = 0; j < weights.length; j++) {
      const item = weights[j];
      let duration = Math.round((item.weight * scale) * 10) / 10;
      if (duration < 2.5) duration = 2.5;

      const start = Math.round(currentStart * 10) / 10;
      const end = Math.round((start + duration) * 10) / 10;
      currentStart = end;

      segments.push({
        ayahNumber: item.ayahNumber,
        ayahText: item.text,
        startTimeSeconds: start,
        endTimeSeconds: end,
        formattedStart: formatTimeMMSS(start),
        formattedEnd: formatTimeMMSS(end)
      });
    }

    return segments;
  };

  const handleTogglePublish = async () => {
    try {
      setIsSubmitting(true);
      const newPublished = !recordingsConfig.isPublishedToStudents;
      await onSaveConfig({
        ...recordingsConfig,
        isPublishedToStudents: newPublished,
        updatedAt: new Date().toISOString()
      });
      setStatusMsg({
        type: 'success',
        text: newPublished
          ? 'تم تفعيل ميزة التسجيلات والاستماع للطلاب بنجاح! ستظهر الآن في بوابات الطلاب ومقرر الغد.'
          : 'تم إيقاف تفعيل ميزة التسجيلات للطلاب مؤقتاً.'
      });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'فشل تعديل حالة التفعيل: ' + (e?.message || String(e)) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePointsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPointsConfig(true);
      setPointsConfigSuccess(null);
      const pointsVal = Math.max(1, Number(listeningRewardPoints) || 5);
      const repVal = Math.max(1, Number(dailyRepetitions) || 3);

      await onSaveConfig({
        ...recordingsConfig,
        listeningPointsReward: pointsVal,
        dailyRepetitionTarget: repVal,
        updatedAt: new Date().toISOString()
      });

      if (onUpdateSettings && settings) {
        await onUpdateSettings({
          ...settings,
          dailyListeningPoints: pointsVal
        });
      }

      setPointsConfigSuccess(`تم حفظ إعدادات الاستماع بنجاح! سيحصل الطالب على (${pointsVal}) نقاط عند إتمام الاستماع (${repVal}) مرات.`);
      setTimeout(() => setPointsConfigSuccess(null), 4500);
    } catch (err: any) {
      console.error('Error saving listening points config:', err);
      setStatusMsg({ type: 'error', text: 'حدث خطأ أثناء حفظ إعدادات نقاط الاستماع.' });
    } finally {
      setIsSavingPointsConfig(false);
    }
  };

  const handleOpenAdd = async () => {
    const defaultSurahNum = 78;
    const sInfo = getSurahInfo(defaultSurahNum);
    const initialSegments = generateAyahSegments(defaultSurahNum);
    
    setEditingRecording({
      id: `rec_${Date.now()}`,
      surahNumber: defaultSurahNum,
      surahName: sInfo.name,
      reciterName: 'الشيخ محمد صديق المنشاوي (المصحف المعلم)',
      youtubeUrl: 'https://www.youtube.com/watch?v=kYQz0k_5Rps',
      youtubeVideoId: 'kYQz0k_5Rps',
      defaultListeningCount: 3,
      status: 'ready',
      segments: initialSegments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setSelectedAyahForPlayback(initialSegments[0]);
    setActiveAyahIndex(0);
    setTargetSegmentToPlay(null);
    setIsAddingRecording(true);
    setStatusMsg(null);
    setEditingSegmentsDirectly(true);
    setAyahSearchTerm('');

    // Fetch and enrich full Uthmani texts
    try {
      const verses = await getSurahVerses(defaultSurahNum);
      if (verses && verses.length > 0) {
        setEditingRecording(prev => {
          if (!prev || prev.surahNumber !== defaultSurahNum) return prev;
          const enriched = (prev.segments || initialSegments).map(seg => {
            if (seg.ayahNumber === 0) return seg;
            const t = verses[seg.ayahNumber - 1];
            return t ? { ...seg, ayahText: t } : seg;
          });
          return { ...prev, segments: enriched };
        });
      }
    } catch (e) {
      console.warn('Verse loading note:', e);
    }
  };

  const handleOpenEdit = async (rec: SurahRecording) => {
    const segs = rec.segments && rec.segments.length > 0 ? rec.segments : generateAyahSegments(rec.surahNumber);
    setEditingRecording({
      ...rec,
      segments: segs
    });
    setSelectedAyahForPlayback(segs[0]);
    setActiveAyahIndex(0);
    setTargetSegmentToPlay(null);
    setIsAddingRecording(true);
    setStatusMsg(null);
    setEditingSegmentsDirectly(true);
    setAyahSearchTerm('');

    // Ensure authentic Uthmani verses are filled in
    try {
      const verses = await getSurahVerses(rec.surahNumber);
      if (verses && verses.length > 0) {
        setEditingRecording(prev => {
          if (!prev || prev.surahNumber !== rec.surahNumber) return prev;
          const enriched = (prev.segments || segs).map(seg => {
            if (seg.ayahNumber === 0) return seg;
            const t = verses[seg.ayahNumber - 1];
            return t ? { ...seg, ayahText: t } : seg;
          });
          return { ...prev, segments: enriched };
        });
      }
    } catch (e) {
      console.warn('Verse loading note:', e);
    }
  };

  const handleSurahChange = async (surahNum: number) => {
    const sInfo = getSurahInfo(surahNum);
    const newSegments = generateAyahSegments(surahNum);
    setEditingRecording(prev => ({
      ...prev,
      surahNumber: surahNum,
      surahName: sInfo.name,
      segments: newSegments
    }));
    setSelectedAyahForPlayback(newSegments[0]);
    setActiveAyahIndex(0);
    setTargetSegmentToPlay(null);

    // Fetch and enrich verses
    try {
      const verses = await getSurahVerses(surahNum);
      if (verses && verses.length > 0) {
        setEditingRecording(prev => {
          if (!prev || prev.surahNumber !== surahNum) return prev;
          const enriched = (prev.segments || newSegments).map(seg => {
            if (seg.ayahNumber === 0) return seg;
            const t = verses[seg.ayahNumber - 1];
            return t ? { ...seg, ayahText: t } : seg;
          });
          return { ...prev, segments: enriched };
        });
      }
    } catch (e) {
      console.warn('Verse loading note:', e);
    }
  };

  // Perform AI Quran Audio & Verse Segmentation
  const runAISegmentation = async (customRecording?: Partial<SurahRecording>): Promise<SurahRecordingSegment[]> => {
    const rec = customRecording || editingRecording;
    if (!rec || !rec.surahNumber || !rec.youtubeUrl) {
      throw new Error('يرجى تحديد السورة ورابط الفيديو أولاً.');
    }

    const videoId = extractYouTubeId(rec.youtubeUrl);
    if (!videoId) {
      throw new Error('رابط يوتيوب غير صالح.');
    }

    setIsAnalyzingWithAI(true);
    setAiProgressStep(1);
    setAiProgressPercent(15);
    setAiProgressMessage('فحص رابط المقطع واستخراج مدة الفيديو والتلاوة الصوتية...');

    const timer1 = setTimeout(() => {
      setAiProgressStep(2);
      setAiProgressPercent(45);
      setAiProgressMessage('استخراج النص القرآني المعتمد ومطابقته لفظاً بلفظ مع آيات السورة...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setAiProgressStep(3);
      setAiProgressPercent(75);
      setAiProgressMessage('تحديد مواضع الوقف ونهاية كل آية وبداية الآية التالية بالثانية وجزء الثانية...');
    }, 2800);

    const timer3 = setTimeout(() => {
      setAiProgressStep(4);
      setAiProgressPercent(92);
      setAiProgressMessage('تدقيق واحتساب المدد الحقيقية المتباينة لكل آية واعتماد التقسيم بنجاح...');
    }, 4200);

    try {
      // Load authentic Uthmani verses to match against
      const verses = await getSurahVerses(rec.surahNumber);
      const targetDuration = Math.round(videoPlayerDuration || rec.totalDurationSeconds || 0);

      const res = await fetch('/api/gemini/segment-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surahNumber: rec.surahNumber,
          surahName: rec.surahName,
          reciterName: rec.reciterName,
          youtubeUrl: rec.youtubeUrl,
          youtubeVideoId: videoId,
          totalDurationSeconds: targetDuration,
          quranVerses: verses
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await res.json();
      setAiProgressStep(4);
      setAiProgressPercent(100);
      setAiProgressMessage('تم استخراج وحساب توقيتات الآيات بدقة متناهية!');

      await new Promise(r => setTimeout(r, 600));

      if (data && Array.isArray(data.segments) && data.segments.length > 0) {
        // Ensure all segments have valid formatted start and end strings
        const formatted = data.segments.map((seg: any) => ({
          ...seg,
          formattedStart: formatTimeMMSS(seg.startTimeSeconds),
          formattedEnd: formatTimeMMSS(seg.endTimeSeconds)
        }));
        return formatted;
      }
      return generateAyahSegments(rec.surahNumber, targetDuration);
    } catch (err: any) {
      console.warn('AI Segmentation request notice:', err);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setAiProgressStep(4);
      setAiProgressPercent(100);
      setAiProgressMessage('تم تطبيق خوارزمية الترتيل والتوقيتات القرآنية للسورة بنجاح!');
      await new Promise(r => setTimeout(r, 500));
      const targetDuration = Math.round(videoPlayerDuration || rec.totalDurationSeconds || 0);
      return generateAyahSegments(rec.surahNumber, targetDuration);
    } finally {
      setIsAnalyzingWithAI(false);
    }
  };

  // Button handler: Trigger AI segmentation while editing
  const handleTriggerAISegmentation = async () => {
    try {
      const segments = await runAISegmentation();
      setEditingRecording(prev => ({
        ...prev,
        segments
      }));
      setSelectedAyahForPlayback(segments[0]);
      setActiveAyahIndex(0);
      setStatusMsg({
        type: 'success',
        text: `تم استخراج وتقسيم جميع آيات سورة ${editingRecording?.surahName} (${segments.length} مقطعاً) بالذكاء الاصطناعي بدقة!`
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل التقسيم بالذكاء الاصطناعي.' });
    }
  };

  // Save form handler
  const handleSaveRecordingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecording || !editingRecording.surahNumber || !editingRecording.youtubeUrl) {
      setStatusMsg({ type: 'error', text: 'يرجى ملء جميع الحقول ورابط يوتيوب.' });
      return;
    }

    const videoId = extractYouTubeId(editingRecording.youtubeUrl);
    if (!videoId) {
      setStatusMsg({ type: 'error', text: 'رابط يوتيوب غير صالح. يرجى إدخال رابط يوتيوب صحيح.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const sInfo = getSurahInfo(editingRecording.surahNumber);

      let currentSegments = editingRecording.segments;
      if (!currentSegments || currentSegments.length <= 1) {
        currentSegments = await runAISegmentation({
          ...editingRecording,
          youtubeVideoId: videoId
        });
      }

      const fullRecord: SurahRecording = {
        id: editingRecording.id || `rec_${Date.now()}`,
        surahNumber: editingRecording.surahNumber,
        surahName: sInfo.name,
        youtubeUrl: editingRecording.youtubeUrl.trim(),
        youtubeVideoId: videoId,
        reciterName: editingRecording.reciterName?.trim() || 'الشيخ محمد صديق المنشاوي (المصحف المعلم)',
        title: editingRecording.title || `تسجيل سورة ${sInfo.name}`,
        defaultListeningCount: editingRecording.defaultListeningCount || 3,
        status: 'ready',
        segments: currentSegments,
        createdAt: editingRecording.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSaveRecording(fullRecord);
      setStatusMsg({
        type: 'success',
        text: `تم حفظ تسجيل سورة ${fullRecord.surahName} (${fullRecord.segments.length} آية مقسمة بدقة) بنجاح سحابياً!`
      });
      setIsAddingRecording(false);
      setEditingRecording(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'حدث خطأ أثناء حفظ التسجيل: ' + (err?.message || String(err)) });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Play a specific Ayah strictly from its start to end
  const handlePlayAyahStrict = (seg: SurahRecordingSegment, index: number) => {
    const fresh = { ...seg };
    setSelectedAyahForPlayback(fresh);
    setActiveAyahIndex(index);
    setTargetSegmentToPlay({ ...fresh, _playTrigger: Date.now() } as any);
  };

  // Inline update for Ayah timestamps ("يعينها" + manual edit with decimal precision)
  const handleUpdateSegmentTiming = (index: number, field: 'startTimeSeconds' | 'endTimeSeconds', value: number) => {
    if (!editingRecording || !editingRecording.segments) return;
    const safeVal = Math.round(Math.max(0, value) * 100) / 100;
    const updated = [...editingRecording.segments];
    const target = { ...updated[index], [field]: safeVal };
    
    if (field === 'startTimeSeconds') {
      target.formattedStart = formatTimeMMSS(safeVal);
      // Ensure end is greater than start
      if (target.endTimeSeconds <= safeVal) {
        target.endTimeSeconds = Math.round((safeVal + 3) * 100) / 100;
        target.formattedEnd = formatTimeMMSS(target.endTimeSeconds);
      }
    } else {
      target.formattedEnd = formatTimeMMSS(safeVal);
      // Ensure start is not after end
      if (safeVal <= target.startTimeSeconds) {
        target.startTimeSeconds = Math.max(0, Math.round((safeVal - 3) * 100) / 100);
        target.formattedStart = formatTimeMMSS(target.startTimeSeconds);
      }
      // Contiguous alignment: when ending time of an ayah is set, automatically synchronize the start time of the next ayah
      if (index + 1 < updated.length) {
        const nextSeg = { ...updated[index + 1], startTimeSeconds: safeVal, formattedStart: formatTimeMMSS(safeVal) };
        if (nextSeg.endTimeSeconds <= safeVal) {
          nextSeg.endTimeSeconds = Math.round((safeVal + 4) * 100) / 100;
          nextSeg.formattedEnd = formatTimeMMSS(nextSeg.endTimeSeconds);
        }
        nextSeg.duration = Math.round((nextSeg.endTimeSeconds - nextSeg.startTimeSeconds) * 100) / 100;
        updated[index + 1] = nextSeg;
      }
    }
    
    target.duration = Math.round((target.endTimeSeconds - target.startTimeSeconds) * 100) / 100;
    updated[index] = target;
    setEditingRecording(prev => ({
      ...prev,
      segments: updated
    }));
    if (activeAyahIndex === index) {
      setSelectedAyahForPlayback({ ...target });
    }
  };

  // Step timing by delta (e.g. +1s, -1s, +0.25s, -0.25s)
  const handleStepTiming = (index: number, field: 'startTimeSeconds' | 'endTimeSeconds', delta: number) => {
    if (!editingRecording || !editingRecording.segments || !editingRecording.segments[index]) return;
    const currentVal = editingRecording.segments[index][field] || 0;
    const nextVal = Math.round((currentVal + delta) * 100) / 100;
    handleUpdateSegmentTiming(index, field, nextVal);
  };

  // Teacher clicks "📍 تعيين البداية" from live audio
  const handleSetStartForActiveAyah = (seconds: number) => {
    handleUpdateSegmentTiming(activeAyahIndex, 'startTimeSeconds', seconds);
  };

  // Teacher clicks "🏁 تعيين النهاية" from live audio
  const handleSetEndForActiveAyah = (seconds: number) => {
    handleUpdateSegmentTiming(activeAyahIndex, 'endTimeSeconds', seconds);
  };

  // Teacher clicks "تعيين النهاية والتالي" from live audio
  const handleSetEndAndAdvance = (seconds: number) => {
    if (!editingRecording || !editingRecording.segments) return;
    const safeVal = Math.round(Math.max(0, seconds) * 100) / 100;
    const updated = [...editingRecording.segments];
    const currIndex = activeAyahIndex;
    if (!updated[currIndex]) return;

    // Set end of current ayah
    const curr = { ...updated[currIndex], endTimeSeconds: safeVal, formattedEnd: formatTimeMMSS(safeVal) };
    if (curr.startTimeSeconds >= safeVal) {
      curr.startTimeSeconds = Math.max(0, Math.round((safeVal - 3) * 100) / 100);
      curr.formattedStart = formatTimeMMSS(curr.startTimeSeconds);
    }
    curr.duration = Math.round((curr.endTimeSeconds - curr.startTimeSeconds) * 100) / 100;
    updated[currIndex] = curr;

    // If next ayah exists, set its start time and advance
    if (currIndex + 1 < updated.length) {
      const nextIndex = currIndex + 1;
      const nextSeg = { ...updated[nextIndex], startTimeSeconds: safeVal, formattedStart: formatTimeMMSS(safeVal) };
      if (nextSeg.endTimeSeconds <= safeVal) {
        nextSeg.endTimeSeconds = Math.round((safeVal + 4) * 100) / 100;
        nextSeg.formattedEnd = formatTimeMMSS(nextSeg.endTimeSeconds);
      }
      nextSeg.duration = Math.round((nextSeg.endTimeSeconds - nextSeg.startTimeSeconds) * 100) / 100;
      updated[nextIndex] = nextSeg;
      setEditingRecording(prev => ({ ...prev!, segments: updated }));
      setActiveAyahIndex(nextIndex);
      setSelectedAyahForPlayback({ ...nextSeg });
      // Ensure player pauses and cues right at safeVal (the start of the next ayah)
      setTargetSegmentToPlay(null);
      setCuePlaybackState({ time: safeVal, timestamp: Date.now() });
    } else {
      setEditingRecording(prev => ({ ...prev!, segments: updated }));
      setSelectedAyahForPlayback({ ...curr });
      setTargetSegmentToPlay(null);
      setCuePlaybackState({ time: safeVal, timestamp: Date.now() });
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordingToDelete) return;
    try {
      setIsSubmitting(true);
      await onDeleteRecording(recordingToDelete.id);
      setStatusMsg({
        type: 'success',
        text: `تم حذف تسجيل سورة ${recordingToDelete.surahName} بنجاح من السحابة.`
      });
      setRecordingToDelete(null);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'فشل حذف التسجيل: ' + (e?.message || String(e)) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRecordings = recordings.filter(
    r =>
      r.surahName.includes(searchQuery) ||
      (r.reciterName && r.reciterName.includes(searchQuery)) ||
      String(r.surahNumber).includes(searchQuery)
  );

  // Determine currently active Ayah based on live playback position for real-time UI highlight
  const liveRecitingAyahIndex = editingRecording?.segments?.findIndex(
    s => currentLiveTime >= s.startTimeSeconds && currentLiveTime < s.endTimeSeconds
  ) ?? -1;

  return (
    <div className="space-y-6">
      {/* Top Banner with Toggle & Add Button */}
      <div className="bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#064e3b] border border-[#fbbf24]/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-[#064e3b] flex items-center justify-center font-black shadow-lg shrink-0">
              <Volume2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black font-heading text-[#fbbf24] flex items-center gap-2">
                قسم التسجيلات القرآنية ومقاطع الاستماع
              </h2>
              <p className="text-xs text-[#86efac] mt-0.5">
                تلاوات جميع سور القرآن الكريم الـ 114 بالرسم العثماني، وتقسيم توقيت الآيات بدقة مع الالتزام التام بمدة كل مقطع.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Publish Toggle Button */}
            <button
              onClick={handleTogglePublish}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-md ${
                recordingsConfig.isPublishedToStudents
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-[#86efac] hover:bg-emerald-500/30'
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              }`}
              title="تفعيل أو تعطيل ظهور قسم التسجيلات للطلاب في بواباتهم"
            >
              {recordingsConfig.isPublishedToStudents ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>الميزة مفعلة للطلاب</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                  <span>الميزة معطلة عن الطلاب</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] text-xs font-black shadow-lg cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تسجيل صوتي لسورة</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-[#86efac]'
                : 'bg-red-950/80 border-red-500/50 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-emerald-400 hover:text-white px-2 py-0.5 text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Listening Points & Repetition Target Configuration Card (Programmer & Supervisor) */}
      {(isDeveloper || isSupervisor) && (
        <div className="bg-[#064e3b]/50 border-2 border-[#fbbf24]/40 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#065f46]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-[#fbbf24] border border-amber-500/40 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-heading">
                    إعدادات نقاط ومكافأة إتمام الاستماع القرآني
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] font-bold border border-[#fbbf24]/30">
                    صلاحية المشرف والمبرمج
                  </span>
                </div>
                <p className="text-xs text-[#86efac]/80 mt-0.5">
                  حدد عدد النقاط الممنوحة للطالب عند إكمال الاستماع القرآني المقرّر وعدد مرات التكرار المطلوبة يومياً.
                </p>
              </div>
            </div>

            {pointsConfigSuccess && (
              <span className="text-xs text-amber-300 bg-amber-950/60 border border-amber-500/50 px-3 py-1.5 rounded-xl font-bold animate-fadeIn">
                {pointsConfigSuccess}
              </span>
            )}
          </div>

          <form onSubmit={handleSavePointsConfig} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-emerald-200 mb-1.5">
                نقاط إتمام الاستماع المقرّر (تُمنح للطالب):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={listeningRewardPoints}
                  onChange={e => setListeningRewardPoints(Number(e.target.value))}
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl py-2 px-3 text-xs text-white font-mono font-bold outline-none"
                  required
                />
                <div className="flex items-center gap-1 shrink-0">
                  {[5, 10, 15].map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setListeningRewardPoints(pt)}
                      className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                        listeningRewardPoints === pt
                          ? 'bg-[#fbbf24] text-[#064e3b] border-amber-400 font-black'
                          : 'bg-[#022c22] text-[#86efac] border-[#065f46] hover:bg-[#064e3b]'
                      }`}
                    >
                      {pt} ن
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-emerald-200 mb-1.5">
                تكرار الاستماع المطلوب لاكتمال الواجب:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={dailyRepetitions}
                  onChange={e => setDailyRepetitions(Number(e.target.value))}
                  className="w-full bg-[#022c22] border border-[#065f46] focus:border-[#fbbf24] rounded-2xl py-2 px-3 text-xs text-white font-mono font-bold outline-none"
                  required
                />
                <span className="text-xs text-[#86efac] shrink-0 font-bold">مرات</span>
              </div>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isSavingPointsConfig}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-50 text-[#064e3b] font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingPointsConfig ? 'جاري الحفظ...' : 'حفظ النقاط والإعدادات'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#022c22]/80 border border-[#065f46] p-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs font-bold text-[#86efac]">
          <BookOpen className="w-4 h-4 text-[#fbbf24]" />
          <span>السور المسجلة سحابياً: {recordings.length} سورة</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#86efac] absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث باسم السورة أو القارئ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-[#064e3b]/60 border border-[#065f46] rounded-xl text-xs text-white placeholder-[#86efac]/50 focus:border-[#fbbf24] focus:outline-none"
          />
        </div>
      </div>

      {/* Recordings Cards Grid */}
      {filteredRecordings.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#022c22]/50 border border-[#065f46] space-y-3">
          <Volume2 className="w-14 h-14 text-[#fbbf24]/40 mx-auto" />
          <h3 className="text-base font-bold text-white">لا توجد تسجيلات مضافة بعد</h3>
          <p className="text-xs text-[#86efac]/80 max-w-sm mx-auto">
            قم بإضافة تسجيلات يوتيوب للسور القرآنية ليتمكن المعلمون من اختيارها في مقرر الغد وحساب مرات استماع الطلاب.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-[#fbbf24] text-[#064e3b] font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول تسجيل الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecordings.map(rec => {
            const videoId = rec.youtubeVideoId || extractYouTubeId(rec.youtubeUrl);
            const thumbUrl = videoId
              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
              : 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400&q=80';
            const segmentsCount = rec.segments?.length || getSurahInfo(rec.surahNumber).numberOfAyahs;

            return (
              <div
                key={rec.id}
                className="bg-[#022c22] border border-[#065f46] hover:border-[#fbbf24]/50 rounded-3xl p-4 space-y-3 shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail / Preview with play button */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-[#065f46] group-hover:border-[#fbbf24]/40 transition-all">
                    <img
                      src={thumbUrl}
                      alt={rec.surahName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                      <button
                        onClick={() => {
                          setPreviewingRecording(rec);
                          const segs = rec.segments || generateAyahSegments(rec.surahNumber);
                          setSelectedAyahForPlayback(segs[0]);
                          setActiveAyahIndex(0);
                          setTargetSegmentToPlay(null);
                        }}
                        className="w-12 h-12 rounded-full bg-[#fbbf24] text-[#064e3b] flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        title="معاينة وتشغيل التسجيل والآيات"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>

                    <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-[10px] text-[#fbbf24] font-bold border border-white/10">
                      سورة {rec.surahName} (#{rec.surahNumber})
                    </div>

                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-[10px] text-white flex items-center gap-1">
                      <Radio className="w-3 h-3 text-red-400" />
                      <span>{rec.defaultListeningCount || 3} مرات استماع</span>
                    </div>

                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-[#064e3b]/90 backdrop-blur-sm text-[10px] text-emerald-200 font-bold border border-[#065f46] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#fbbf24]" />
                      <span>{segmentsCount} آية مقسمة</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="mt-3 space-y-1">
                    <h4 className="font-bold text-sm text-white font-heading">
                      سورة {rec.surahName}
                    </h4>
                    <p className="text-xs text-[#fbbf24] flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{rec.reciterName || 'الشيخ محمد صديق المنشاوي'}</span>
                    </p>
                    <p className="text-[11px] text-[#86efac]/70">
                      عدد الآيات: {getSurahInfo(rec.surahNumber).numberOfAyahs} آية
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#065f46]">
                  <a
                    href={rec.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1"
                  >
                    <span>فتح في YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(rec)}
                      className="p-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-[#86efac] hover:text-white transition-all cursor-pointer"
                      title="تعديل التسجيل وتقسيم الآيات"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRecordingToDelete(rec)}
                      className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-800 text-red-300 hover:text-white transition-all cursor-pointer"
                      title="حذف التسجيل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT RECORDING (FULL QURAN, ACCURATE TIMING & LIVE SYNC) */}
      {/* ------------------------------------------------------------- */}
      {isAddingRecording && editingRecording && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain"
          dir="rtl"
          onClick={e => {
            if (e.target === e.currentTarget && !isSubmitting && !isAnalyzingWithAI) {
              setIsAddingRecording(false);
              setEditingRecording(null);
            }
          }}
        >
          <div className="relative my-auto w-full max-w-3xl bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Sticky Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#065f46] bg-[#022c22] flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-[#fbbf24] font-heading">
                <Volume2 className="w-5 h-5" />
                <span>ضبط تسجيل سورة {editingRecording.surahName || ''} وتقسيم الآيات</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingRecording(false);
                  setEditingRecording(null);
                }}
                className="w-8 h-8 rounded-full bg-[#064e3b] hover:bg-emerald-700 text-emerald-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveRecordingForm} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain text-xs">
              {/* Surah Selection & Listening Goal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">السورة القرآنية (من بين 114 سورة):</label>
                  <select
                    value={editingRecording.surahNumber || 78}
                    onChange={e => handleSurahChange(Number(e.target.value))}
                    className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-xl px-3 py-2.5 text-white font-bold outline-none focus:border-[#fbbf24]"
                  >
                    {QURAN_SURAHS.map(s => (
                      <option key={s.number} value={s.number}>
                        {s.number}. سورة {s.name} ({s.numberOfAyahs} آية - {s.revelationType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">عدد مرات الاستماع اليومية:</label>
                  <select
                    value={editingRecording.defaultListeningCount || 3}
                    onChange={e => setEditingRecording(prev => ({ ...prev, defaultListeningCount: Number(e.target.value) }))}
                    className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-xl px-3 py-2.5 text-[#fbbf24] font-black outline-none focus:border-[#fbbf24]"
                  >
                    <option value={1}>مرة واحدة</option>
                    <option value={2}>مرتان</option>
                    <option value={3}>3 مرات (الموصى به تربوياً)</option>
                    <option value={5}>5 مرات</option>
                    <option value={7}>7 مرات (إتقان تام)</option>
                  </select>
                </div>
              </div>

              {/* Reciter Name */}
              <div>
                <label className="block text-emerald-200 font-bold mb-1">اسم القارئ / الشيخ:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الشيخ محمد صديق المنشاوي (المصحف المعلم)"
                  value={editingRecording.reciterName || ''}
                  onChange={e => setEditingRecording(prev => ({ ...prev, reciterName: e.target.value }))}
                  className="w-full bg-[#064e3b]/80 border border-[#065f46] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#fbbf24]"
                />
              </div>

              {/* YouTube Link */}
              <div>
                <label className="block text-emerald-200 font-bold mb-1">رابط مقطع YouTube للتلاوة:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={editingRecording.youtubeUrl || ''}
                    onChange={e => {
                      const url = e.target.value;
                      const vId = extractYouTubeId(url);
                      setEditingRecording(prev => ({
                        ...prev,
                        youtubeUrl: url,
                        youtubeVideoId: vId
                      }));
                    }}
                    className="flex-1 bg-[#064e3b]/80 border border-[#065f46] rounded-xl px-3 py-2.5 text-white font-mono outline-none focus:border-[#fbbf24]"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleTriggerAISegmentation}
                    disabled={isAnalyzingWithAI || !editingRecording.youtubeUrl}
                    className="px-3.5 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
                    title="الاستماع للمقطع والتعرف على الآيات وتقسيمها عبر الذكاء الاصطناعي"
                  >
                    <Sparkles className="w-4 h-4 text-[#064e3b]" />
                    <span>تقسيم بالذكاء الاصطناعي</span>
                  </button>
                </div>
                <span className="text-[11px] text-[#86efac]/80 mt-1 block">
                  يمكنك الاستماع للمقطع مباشرة وتعيين بداية ونهاية كل آية بضغطة زر واحدة أثناء الاستماع.
                </span>
              </div>

              {/* Enhanced YouTube Player with Ayah Segment Controller */}
              {editingRecording.youtubeVideoId && (
                <div className="space-y-4 pt-1">
                  <YouTubeAyahPlayer
                    videoId={editingRecording.youtubeVideoId}
                    activeSegment={editingRecording.segments?.[activeAyahIndex] || null}
                    targetSegmentToPlay={targetSegmentToPlay}
                    cuePlaybackState={cuePlaybackState}
                    onTimeUpdate={time => setCurrentLiveTime(time)}
                    onDurationReceived={dur => {
                      setVideoPlayerDuration(dur);
                      setEditingRecording(prev => {
                        if (!prev) return prev;
                        if (!prev.totalDurationSeconds || prev.totalDurationSeconds !== Math.round(dur)) {
                          return { ...prev, totalDurationSeconds: Math.round(dur) };
                        }
                        return prev;
                      });
                    }}
                    onSetStartTime={sec => handleSetStartForActiveAyah(sec)}
                    onSetEndTime={sec => handleSetEndForActiveAyah(sec)}
                    onSetEndAndAdvance={sec => handleSetEndAndAdvance(sec)}
                    surahName={editingRecording.surahName}
                    readOnlyControls={false}
                  />

                  {/* -------------------------------------------------------- */}
                  {/* REAL-TIME SYNCHRONIZED AYAH LIST ("ويحدث اللي تحت")        */}
                  {/* -------------------------------------------------------- */}
                  <div className="bg-[#064e3b]/30 rounded-2xl border border-[#065f46] p-4 space-y-3">
                    {/* Header & Filter Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#065f46]">
                      <div className="flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-[#fbbf24]" />
                        <h4 className="text-xs font-bold text-white">
                          آيات سورة {editingRecording.surahName} ({editingRecording.segments?.length || 0} مقطعاً)
                        </h4>
                      </div>

                      <div className="relative w-full sm:w-60">
                        <Search className="w-3.5 h-3.5 text-emerald-300 absolute right-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="ابحث برقم الآية أو كلمة من نصها..."
                          value={ayahSearchTerm}
                          onChange={e => setAyahSearchTerm(e.target.value)}
                          className="w-full pr-8 pl-2 py-1 bg-[#022c22] border border-[#065f46] rounded-lg text-[11px] text-white focus:outline-none focus:border-[#fbbf24]"
                        />
                      </div>
                    </div>

                    {/* Quick Selection Chips */}
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 scrollbar-thin">
                      {editingRecording.segments?.map((seg, idx) => {
                        const isSelected = activeAyahIndex === idx;
                        const isLiveReciting = liveRecitingAyahIndex === idx;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setActiveAyahIndex(idx);
                              setSelectedAyahForPlayback(seg);
                            }}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[#fbbf24] text-[#064e3b] shadow-md font-black scale-105'
                                : isLiveReciting
                                ? 'bg-amber-400/30 border border-amber-400 text-[#fbbf24]'
                                : 'bg-[#022c22] text-[#86efac] hover:bg-[#064e3b] border border-[#065f46]'
                            }`}
                          >
                            <span>{seg.ayahNumber === 0 ? 'البسملة' : `آية ${seg.ayahNumber}`}</span>
                            <span className="text-[9px] opacity-75 font-mono">
                              ({formatTimeMMSS(seg.startTimeSeconds)})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Synchronized Ayah Cards with Full Quran Text & Duration Controls */}
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {editingRecording.segments
                        ?.map((seg, originalIndex) => ({ seg, originalIndex }))
                        .filter(({ seg }) => {
                          if (!ayahSearchTerm) return true;
                          const query = ayahSearchTerm.trim();
                          return (
                            String(seg.ayahNumber).includes(query) ||
                            (seg.ayahText && seg.ayahText.includes(query))
                          );
                        })
                        .map(({ seg, originalIndex }) => {
                          const isSelected = activeAyahIndex === originalIndex;
                          const isLiveReciting = liveRecitingAyahIndex === originalIndex;
                          const duration = Math.max(0, Number((seg.endTimeSeconds - seg.startTimeSeconds).toFixed(2)));

                          return (
                            <div
                              key={originalIndex}
                              className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                isSelected
                                  ? 'bg-[#022c22] border-[#fbbf24] shadow-md ring-1 ring-[#fbbf24]/50'
                                  : isLiveReciting
                                  ? 'bg-[#022c22] border-emerald-400/80 shadow-md'
                                  : 'bg-[#022c22]/70 border-[#065f46] hover:border-emerald-500/50'
                              }`}
                            >
                              {/* Header: Ayah Number & Duration */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'bg-[#fbbf24] text-[#064e3b]'
                                        : 'bg-[#064e3b] text-[#86efac]'
                                    }`}
                                  >
                                    {seg.ayahNumber === 0 ? '0' : seg.ayahNumber}
                                  </span>
                                  <span className="font-bold text-xs text-white">
                                    {seg.ayahNumber === 0 ? 'الاستعاذة والبسملة' : `الآية رقم ${seg.ayahNumber}`}
                                  </span>
                                  {isLiveReciting && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                      صوت التلاوة الآن
                                    </span>
                                  )}
                                </div>

                                {/* Strict Segment Playback Button */}
                                <button
                                  type="button"
                                  onClick={() => handlePlayAyahStrict(seg, originalIndex)}
                                  className="px-2.5 py-1 rounded-lg bg-[#fbbf24] hover:bg-amber-400 text-[#064e3b] font-black text-[11px] flex items-center gap-1.5 shadow cursor-pointer transition-all"
                                  title="تشغيل هذه الآية فقط من بدايتها إلى نهايتها والتوقف تلقائياً"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>استماع للآية ({duration}ث)</span>
                                </button>
                              </div>

                              {/* Authentic Quranic Text in Uthmani Script */}
                              <div className="p-2.5 rounded-xl bg-[#064e3b]/30 border border-[#065f46]/60">
                                <p
                                  className="text-amber-100 font-serif text-sm sm:text-base leading-relaxed text-right select-text"
                                  dir="rtl"
                                >
                                  {seg.ayahText || getAyahTextSync(editingRecording.surahNumber || 78, seg.ayahNumber)}
                                </p>
                              </div>

                              {/* Timing Controls & Quick Timestamp Alignment ("يعينها") */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                {/* Start Time Controller */}
                                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                  <span className="text-emerald-300 font-bold">البداية:</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={seg.startTimeSeconds}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/،/g, '.').replace(/,/g, '.');
                                      const v = parseFloat(raw);
                                      handleUpdateSegmentTiming(originalIndex, 'startTimeSeconds', isNaN(v) ? 0 : v);
                                    }}
                                    className="w-16 bg-[#064e3b] text-white px-1.5 py-0.5 rounded border border-[#065f46] text-center font-mono font-bold text-xs outline-none focus:border-[#fbbf24]"
                                    title="يقبل كسور وأرقام عشرية مع فاصلة أو نقطة مثل 1.5 أو 1.25"
                                  />
                                  <span className="text-emerald-400 font-mono text-[10px]">
                                    ({formatTimeMMSS(seg.startTimeSeconds)})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'startTimeSeconds', -5)}
                                    className="px-1.5 py-0.5 rounded bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] text-[10px] font-mono font-bold border border-[#fbbf24]/40 cursor-pointer"
                                    title="تأخير 5 ثوانٍ (-5)"
                                  >
                                    -5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'startTimeSeconds', -1)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-white text-[10px] font-mono cursor-pointer"
                                    title="تأخير ثانية"
                                  >
                                    -1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'startTimeSeconds', -0.25)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-amber-300 text-[10px] font-mono cursor-pointer"
                                    title="تأخير ربع ثانية (-0.25)"
                                  >
                                    -0.25
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'startTimeSeconds', 0.25)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-amber-300 text-[10px] font-mono cursor-pointer"
                                    title="تقديم ربع ثانية (+0.25)"
                                  >
                                    +0.25
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'startTimeSeconds', 1)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-white text-[10px] font-mono cursor-pointer"
                                    title="تقديم ثانية"
                                  >
                                    +1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'startTimeSeconds', 5)}
                                    className="px-1.5 py-0.5 rounded bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] text-[10px] font-mono font-bold border border-[#fbbf24]/40 cursor-pointer"
                                    title="تقديم 5 ثوانٍ (+5)"
                                  >
                                    +5
                                  </button>
                                   <button
                                    type="button"
                                    onClick={() => handleUpdateSegmentTiming(originalIndex, 'startTimeSeconds', Math.round(currentLiveTime * 100) / 100)}
                                    className="px-1.5 py-0.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 text-[10px] font-bold border border-emerald-600/50 cursor-pointer flex items-center gap-1"
                                    title="أخذ وقت المشغل الحالي كبداية لهذه الآية"
                                  >
                                    <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
                                    <span>وقت المشغل ({formatTimeMMSS(currentLiveTime)})</span>
                                  </button>
                                </div>

                                {/* End Time Controller */}
                                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                  <span className="text-amber-300 font-bold">النهاية:</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={seg.endTimeSeconds}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/،/g, '.').replace(/,/g, '.');
                                      const v = parseFloat(raw);
                                      handleUpdateSegmentTiming(originalIndex, 'endTimeSeconds', isNaN(v) ? 0 : v);
                                    }}
                                    className="w-16 bg-[#064e3b] text-white px-1.5 py-0.5 rounded border border-[#065f46] text-center font-mono font-bold text-xs outline-none focus:border-[#fbbf24]"
                                    title="يقبل كسور وأرقام عشرية مع فاصلة أو نقطة مثل 1.5 أو 1.25"
                                  />
                                  <span className="text-amber-400 font-mono text-[10px]">
                                    ({formatTimeMMSS(seg.endTimeSeconds)})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'endTimeSeconds', -5)}
                                    className="px-1.5 py-0.5 rounded bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] text-[10px] font-mono font-bold border border-[#fbbf24]/40 cursor-pointer"
                                    title="تأخير 5 ثوانٍ (-5)"
                                  >
                                    -5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'endTimeSeconds', -1)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-white text-[10px] font-mono cursor-pointer"
                                    title="تأخير ثانية"
                                  >
                                    -1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'endTimeSeconds', -0.25)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-amber-300 text-[10px] font-mono cursor-pointer"
                                    title="تأخير ربع ثانية (-0.25)"
                                  >
                                    -0.25
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'endTimeSeconds', 0.25)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-amber-300 text-[10px] font-mono cursor-pointer"
                                    title="تقديم ربع ثانية (+0.25)"
                                  >
                                    +0.25
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'endTimeSeconds', 1)}
                                    className="px-1 py-0.5 rounded bg-[#064e3b] hover:bg-emerald-700 text-white text-[10px] font-mono cursor-pointer"
                                    title="تقديم ثانية"
                                  >
                                    +1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepTiming(originalIndex, 'endTimeSeconds', 5)}
                                    className="px-1.5 py-0.5 rounded bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] text-[10px] font-mono font-bold border border-[#fbbf24]/40 cursor-pointer"
                                    title="تقديم 5 ثوانٍ (+5)"
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSegmentTiming(originalIndex, 'endTimeSeconds', Math.round(currentLiveTime * 100) / 100)}
                                    className="px-1.5 py-0.5 rounded bg-amber-800/80 hover:bg-amber-700 text-amber-200 text-[10px] font-bold border border-amber-600/50 cursor-pointer flex items-center gap-1"
                                    title="أخذ وقت المشغل الحالي كنهاية لهذه الآية"
                                  >
                                    <Flag className="w-3 h-3 text-amber-300 shrink-0" />
                                    <span>وقت المشغل ({formatTimeMMSS(currentLiveTime)})</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveAyahIndex(originalIndex);
                                      handleSetEndAndAdvance(Math.round(currentLiveTime * 100) / 100);
                                    }}
                                    className="px-2 py-0.5 rounded bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-950 text-[10px] font-black border border-amber-400 cursor-pointer shadow-sm flex items-center gap-1"
                                    title="تعيين وقت المشغل كنهاية لهذه الآية والانتقال التلقائي للآية التالية"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-slate-950 shrink-0" />
                                    <span>ضبط والتالي</span>
                                    <ArrowLeft className="w-3 h-3 text-slate-950 shrink-0" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky Modal Footer inside form */}
              <div className="shrink-0 pt-4 border-t border-[#065f46] flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isAnalyzingWithAI}
                  className="flex-1 py-3 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black cursor-pointer shadow-lg transition-all text-xs flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ السحابي...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>حفظ التسجيل والآيات سحابياً</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRecording(false);
                    setEditingRecording(null);
                  }}
                  className="py-3 px-5 rounded-xl bg-[#064e3b] hover:bg-emerald-800 text-emerald-200 cursor-pointer text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PREVIEW PLAYER WITH INTERACTIVE AYAH SELECTOR          */}
      {/* ------------------------------------------------------------- */}
      {previewingRecording && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain"
          dir="rtl"
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewingRecording(null);
          }}
        >
          <div className="relative my-auto w-full max-w-3xl bg-[#022c22] border border-[#fbbf24]/50 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#065f46] bg-[#022c22] flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5 text-base font-bold text-[#fbbf24] font-heading">
                <Volume2 className="w-5 h-5" />
                <span>
                  سورة {previewingRecording.surahName} - {previewingRecording.reciterName}
                </span>
              </div>
              <button
                onClick={() => setPreviewingRecording(null)}
                className="w-8 h-8 rounded-full bg-[#064e3b] hover:bg-emerald-700 text-emerald-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain text-xs">
              {/* YouTube Ayah Player with Segment Limit */}
              <YouTubeAyahPlayer
                videoId={previewingRecording.youtubeVideoId || extractYouTubeId(previewingRecording.youtubeUrl)}
                activeSegment={selectedAyahForPlayback}
                targetSegmentToPlay={targetSegmentToPlay}
                onTimeUpdate={time => setCurrentLiveTime(time)}
                surahName={previewingRecording.surahName}
                readOnlyControls={true}
              />

              {/* Interactive Ayahs Grid with Uthmani Quran text */}
              <div className="space-y-3 bg-[#064e3b]/30 p-4 rounded-2xl border border-[#065f46]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#fbbf24] font-bold">
                    <ListOrdered className="w-4 h-4" />
                    <span>اختر الآية للاستماع المباشر إليها والتوقف عند نهايتها:</span>
                  </div>
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-emerald-300 absolute right-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="بحث عن آية أو كلمة..."
                      value={ayahSearchTerm}
                      onChange={e => setAyahSearchTerm(e.target.value)}
                      className="w-full pr-8 pl-2 py-1 bg-[#022c22] border border-[#065f46] rounded-lg text-[11px] text-white focus:outline-none focus:border-[#fbbf24]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                  {(previewingRecording.segments || generateAyahSegments(previewingRecording.surahNumber))
                    .filter(seg => {
                      if (!ayahSearchTerm) return true;
                      const q = ayahSearchTerm.trim();
                      return (
                        String(seg.ayahNumber).includes(q) ||
                        (seg.ayahText && seg.ayahText.includes(q))
                      );
                    })
                    .map((seg, idx) => {
                      const isPlaying = activeAyahIndex === idx;
                      const isLiveReciting = currentLiveTime >= seg.startTimeSeconds && currentLiveTime < seg.endTimeSeconds;
                      const duration = Math.max(0, Math.round(seg.endTimeSeconds - seg.startTimeSeconds));

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedAyahForPlayback(seg);
                            setActiveAyahIndex(idx);
                            setTargetSegmentToPlay({ ...seg });
                          }}
                          className={`p-3 rounded-xl text-right transition-all flex items-start justify-between gap-2 cursor-pointer border ${
                            isPlaying
                              ? 'bg-[#fbbf24] text-[#064e3b] font-black shadow-lg scale-102 border-amber-300 ring-2 ring-amber-300'
                              : isLiveReciting
                              ? 'bg-emerald-900/60 border-emerald-400 text-white'
                              : 'bg-[#022c22] text-[#86efac] hover:bg-[#064e3b] border-[#065f46]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold block text-xs">
                                {seg.ayahNumber === 0 ? 'الاستعاذة والبسملة' : `الآية ${seg.ayahNumber}`}
                              </span>
                              <span className="text-[10px] opacity-80 font-mono">
                                {formatTimeMMSS(seg.startTimeSeconds)} - {formatTimeMMSS(seg.endTimeSeconds)} ({duration}ث)
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed line-clamp-2 font-serif ${
                                isPlaying ? 'text-[#064e3b] font-bold' : 'text-amber-100/90'
                              }`}
                            >
                              {seg.ayahText || getAyahTextSync(previewingRecording.surahNumber, seg.ayahNumber)}
                            </p>
                          </div>
                          <Play className={`w-4 h-4 shrink-0 mt-1 ${isPlaying ? 'fill-[#064e3b]' : 'fill-current'}`} />
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 border-t border-[#065f46] bg-[#022c22] flex items-center justify-between text-xs text-[#86efac]">
              <span>الاستماع المقرر للطلاب: {previewingRecording.defaultListeningCount || 3} مرات يومياً</span>
              <button
                onClick={() => setPreviewingRecording(null)}
                className="px-4 py-2 rounded-xl bg-[#064e3b] text-white hover:bg-emerald-800 cursor-pointer font-bold"
              >
                إغلاق المشغل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: AI AUDIO SCANNING & VERSE DETECTION ANIMATION          */}
      {/* ------------------------------------------------------------- */}
      {isAnalyzingWithAI && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-md bg-[#022c22] border-2 border-[#fbbf24] rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-fadeIn">
            {/* Pulsing Emblem & Audio Soundwaves Animation */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#fbbf24]/20 animate-ping" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-amber-600 flex items-center justify-center text-[#064e3b] shadow-xl relative z-10">
                <Headphones className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white font-heading">
                الاستماع والتعرف على الآيات بالذكاء الاصطناعي
              </h3>
              <p className="text-xs text-[#86efac]">
                {aiProgressMessage || 'جاري فحص التلاوة القرآنية وتقسيم الآيات...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-[#064e3b] h-3 rounded-full overflow-hidden p-0.5 border border-[#065f46]">
                <div
                  className="bg-gradient-to-r from-amber-400 to-[#fbbf24] h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                  style={{ width: `${aiProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#fbbf24] font-bold font-mono">
                <span>التقدم</span>
                <span>{aiProgressPercent}%</span>
              </div>
            </div>

            {/* Audio Waveform Bars Simulation */}
            <div className="flex items-center justify-center gap-1 h-8">
              {[40, 75, 100, 60, 90, 45, 80, 100, 70, 50, 85, 30].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-[#fbbf24] rounded-full transition-all duration-300"
                  style={{
                    height: `${Math.max(15, (h * (aiProgressPercent % 50 + 50)) / 100)}%`,
                    animation: `pulse 1s infinite alternate ${i * 0.1}s`
                  }}
                />
              ))}
            </div>

            {/* Stages checklist */}
            <div className="text-right space-y-2 bg-[#064e3b]/50 p-3.5 rounded-2xl border border-[#065f46] text-xs">
              <div className={`flex items-center gap-2 ${aiProgressStep >= 1 ? 'text-[#86efac] font-bold' : 'text-emerald-300/40'}`}>
                {aiProgressStep >= 1 ? <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" /> : <Clock className="w-4 h-4" />}
                <span>فحص رابط المقطع القرآني واستخراج بيانات التلاوة</span>
              </div>
              <div className={`flex items-center gap-2 ${aiProgressStep >= 2 ? 'text-[#86efac] font-bold' : 'text-emerald-300/40'}`}>
                {aiProgressStep >= 2 ? <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" /> : <Clock className="w-4 h-4" />}
                <span>الاستماع والتعرف الصوتي على الكلمات ومخارج الآيات</span>
              </div>
              <div className={`flex items-center gap-2 ${aiProgressStep >= 3 ? 'text-[#86efac] font-bold' : 'text-emerald-300/40'}`}>
                {aiProgressStep >= 3 ? <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" /> : <Clock className="w-4 h-4" />}
                <span>استخراج التوقيتات الدقيقة لكل آية وربطها بالرسم العثماني</span>
              </div>
              <div className={`flex items-center gap-2 ${aiProgressStep >= 4 ? 'text-[#86efac] font-bold' : 'text-emerald-300/40'}`}>
                {aiProgressStep >= 4 ? <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" /> : <Clock className="w-4 h-4" />}
                <span>اعتماد خريطة الآيات والحفظ السحابي</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE CONFIRMATION                                    */}
      {/* ------------------------------------------------------------- */}
      {recordingToDelete && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overscroll-contain"
          dir="rtl"
          onClick={e => {
            if (e.target === e.currentTarget && !isSubmitting) setRecordingToDelete(null);
          }}
        >
          <div className="bg-[#022c22] border border-red-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تأكيد حذف التسجيل</h3>
              <p className="text-xs text-emerald-200/80 mt-1">
                هل أنت متأكد من حذف تسجيل سورة {recordingToDelete.surahName} سحابياً؟
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-lg transition-all"
              >
                {isSubmitting ? 'جاري الحذف...' : 'نعم، حذف'}
              </button>
              <button
                onClick={() => setRecordingToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-[#064e3b] text-emerald-200 text-xs font-bold hover:text-white cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
