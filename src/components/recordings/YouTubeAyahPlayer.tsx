import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, FastForward, Rewind, Repeat, 
  MapPin, Flag, Check, CheckCircle2, ArrowLeft, Clock, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { SurahRecordingSegment } from '../../types';

interface YouTubeAyahPlayerProps {
  videoId: string;
  activeSegment: SurahRecordingSegment | null;
  targetSegmentToPlay?: SurahRecordingSegment | null;
  cuePlaybackState?: { time: number; timestamp: number } | null;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationReceived?: (duration: number) => void;
  onSetStartTime?: (seconds: number) => void;
  onSetEndTime?: (seconds: number) => void;
  onSetEndAndAdvance?: (seconds: number) => void;
  onNextAyah?: () => void;
  onPrevAyah?: () => void;
  readOnlyControls?: boolean; // For preview or student view
  surahName?: string;
  onAyahFinished?: (seg: SurahRecordingSegment) => void;
}

// Format seconds into MM:SS (with support for decimal seconds like 01:23.5 or 00:01.25)
export const formatTimeMMSS = (sec: number, showDecimals: boolean = true): string => {
  const safe = Math.max(0, Number(sec) || 0);
  const mins = Math.floor(safe / 60);
  const remainder = safe - mins * 60;
  const wholeSecs = Math.floor(remainder);
  const fraction = remainder - wholeSecs;

  let secStr = wholeSecs.toString().padStart(2, '0');
  if (showDecimals && fraction >= 0.01) {
    const fracStr = (Math.round(fraction * 100) / 100).toFixed(2).replace(/^0/, '').replace(/0+$/, '');
    if (fracStr) secStr += fracStr;
  }
  return `${mins.toString().padStart(2, '0')}:${secStr}`;
};

export const YouTubeAyahPlayer: React.FC<YouTubeAyahPlayerProps> = ({
  videoId,
  activeSegment,
  targetSegmentToPlay,
  cuePlaybackState,
  onTimeUpdate,
  onDurationReceived,
  onSetStartTime,
  onSetEndTime,
  onSetEndAndAdvance,
  onNextAyah,
  onPrevAyah,
  readOnlyControls = false,
  surahName,
  onAyahFinished
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [playingSegment, setPlayingSegment] = useState<SurahRecordingSegment | null>(null);
  const [justFinishedAlert, setJustFinishedAlert] = useState<string | null>(null);
  const [strictStopAtEnd, setStrictStopAtEnd] = useState<boolean>(readOnlyControls);
  const seekGracePeriodRef = useRef<number>(0);
  const lastPulseRef = useRef<{ timestamp: number; audioTime: number }>({ timestamp: 0, audioTime: 0 });

  // Compute millisecond-accurate playback time on demand
  const getAccurateTime = useCallback((): number => {
    if (!isPlaying || lastPulseRef.current.timestamp === 0) {
      return Math.round(currentTime * 100) / 100;
    }
    const elapsedSec = (Date.now() - lastPulseRef.current.timestamp) / 1000;
    // Bound elapsed interval to max 0.4s to prevent drift when backgrounded
    const safeElapsed = Math.min(Math.max(0, elapsedSec), 0.4);
    const estimated = lastPulseRef.current.audioTime + safeElapsed;
    return Math.round(estimated * 100) / 100;
  }, [isPlaying, currentTime]);

  // Sync playing segment when active segment timings change
  useEffect(() => {
    if (activeSegment && playingSegment && playingSegment.ayahNumber === activeSegment.ayahNumber) {
      setPlayingSegment({ ...activeSegment });
    }
  }, [activeSegment]);

  // Send command to YouTube iframe via postMessage
  const sendYTCommand = useCallback((func: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args
        }),
        '*'
      );
    } catch (e) {
      console.warn('Error sending postMessage to YouTube player:', e);
    }
  }, []);

  // Listen to postMessage from YouTube iframe (accepts both JSON string and already parsed Object)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      let data = e.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      try {
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            onDurationReceived?.(data.info.duration);
          }

          if (typeof data.info.currentTime === 'number') {
            const time = Math.round(Number(data.info.currentTime) * 100) / 100;
            lastPulseRef.current = { timestamp: Date.now(), audioTime: time };
            setCurrentTime(time);
            onTimeUpdate?.(time);

            // Check if playing in strict auto-stop mode and reached end of segment
            if ((readOnlyControls || strictStopAtEnd) && playingSegment && playingSegment.endTimeSeconds > 0) {
              if (Date.now() > seekGracePeriodRef.current) {
                if (time >= (playingSegment.endTimeSeconds - 0.05)) {
                  if (isLooping) {
                    seekGracePeriodRef.current = Date.now() + 800;
                    sendYTCommand('seekTo', [playingSegment.startTimeSeconds, true]);
                    sendYTCommand('playVideo');
                  } else {
                    sendYTCommand('pauseVideo');
                    setIsPlaying(false);
                    setJustFinishedAlert(`تم استماع الآية رقم ${playingSegment.ayahNumber} وتوقف المشغل عند نهايتها (${formatTimeMMSS(playingSegment.endTimeSeconds)})`);
                    setTimeout(() => setJustFinishedAlert(null), 3500);
                    onAyahFinished?.(playingSegment);
                    setPlayingSegment(null);
                  }
                }
              }
            }
          }

          if (typeof data.info.playerState === 'number') {
            // YT.PlayerState: 1 is playing, 2 is paused, 0 is ended
            setIsPlaying(data.info.playerState === 1);
          }
        }
      } catch {
        // Ignore non-json or unformatted messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [playingSegment, isLooping, readOnlyControls, strictStopAtEnd, onTimeUpdate, onDurationReceived, onAyahFinished, sendYTCommand]);

  // High-frequency listening pulse from YouTube iframe (every 120ms for smooth sub-second tracking)
  useEffect(() => {
    const interval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 'yt-ayah-player' }),
          '*'
        );
      }
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // Play a specific segment strictly from its start to end
  const playAyahSegment = useCallback((seg: SurahRecordingSegment, forceStrictStop: boolean = false) => {
    setPlayingSegment({ ...seg });
    if (forceStrictStop) {
      setStrictStopAtEnd(true);
    }
    const start = Math.max(0, Number(seg.startTimeSeconds) || 0);
    seekGracePeriodRef.current = Date.now() + 750;
    sendYTCommand('seekTo', [start, true]);
    sendYTCommand('playVideo');
    setIsPlaying(true);
    setJustFinishedAlert(null);
  }, [sendYTCommand]);

  // When targetSegmentToPlay changes, automatically seek and play
  useEffect(() => {
    if (targetSegmentToPlay) {
      playAyahSegment(targetSegmentToPlay, false);
    }
  }, [targetSegmentToPlay, playAyahSegment]);

  // When cuePlaybackState changes, pause video and seek to exact cued point (ready to start next verse)
  useEffect(() => {
    if (cuePlaybackState && cuePlaybackState.timestamp > 0) {
      sendYTCommand('pauseVideo');
      setIsPlaying(false);
      seekGracePeriodRef.current = Date.now() + 1000;
      const targetTime = Math.max(0, cuePlaybackState.time);
      sendYTCommand('seekTo', [targetTime, true]);
      setCurrentTime(targetTime);
      lastPulseRef.current = { timestamp: Date.now(), audioTime: targetTime };
      setPlayingSegment(null);
    }
  }, [cuePlaybackState, sendYTCommand]);

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      sendYTCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      sendYTCommand('playVideo');
      setIsPlaying(true);
    }
  };

  const handleSeekDelta = (deltaSeconds: number) => {
    const newTime = Math.max(0, Math.round((currentTime + deltaSeconds) * 100) / 100);
    setCurrentTime(newTime);
    lastPulseRef.current = { timestamp: Date.now(), audioTime: newTime };
    seekGracePeriodRef.current = Date.now() + 750;
    sendYTCommand('seekTo', [newTime, true]);
  };

  const handleSetStartFromCurrent = () => {
    if (onSetStartTime) {
      const precise = getAccurateTime();
      onSetStartTime(precise);
      setJustFinishedAlert(`تم تعيين بداية الآية عند ${formatTimeMMSS(precise)}`);
      setTimeout(() => setJustFinishedAlert(null), 3000);
    }
  };

  const handleSetEndFromCurrent = () => {
    if (onSetEndTime) {
      const precise = getAccurateTime();
      onSetEndTime(precise);
      setJustFinishedAlert(`تم اعتماد نهاية الآية عند ${formatTimeMMSS(precise)}`);
      setTimeout(() => setJustFinishedAlert(null), 3000);
    }
  };

  const handleSetEndAndAdvanceFromCurrent = () => {
    if (onSetEndAndAdvance) {
      const precise = getAccurateTime();
      // 1. Immediately pause video and stop playback so user has control
      sendYTCommand('pauseVideo');
      setIsPlaying(false);
      // 2. Immediately seek to this precise moment (beginning of next verse)
      seekGracePeriodRef.current = Date.now() + 1000;
      sendYTCommand('seekTo', [precise, true]);
      setCurrentTime(precise);
      lastPulseRef.current = { timestamp: Date.now(), audioTime: precise };
      setPlayingSegment(null);
      // 3. Notify parent to update current verse end, next verse start, and active verse
      onSetEndAndAdvance(precise);
      setJustFinishedAlert(`تم اعتماد نهاية الآية عند ${formatTimeMMSS(precise)}، وتوقف المشغل عند بداية الآية التالية جاهزاً للتشغيل`);
      setTimeout(() => setJustFinishedAlert(null), 3500);
    }
  };

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;

  return (
    <div className="space-y-3 bg-[#022c22] rounded-2xl border border-[#065f46] p-3 shadow-lg">
      {/* YouTube Embed Container */}
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative border border-[#065f46]/60 shadow-inner">
        <iframe
          ref={iframeRef}
          id="yt-ayah-player"
          src={embedUrl}
          title={`تلاوة ${surahName || 'القرآن الكريم'}`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Floating banner when playing an Ayah */}
        {playingSegment && (
          <div className="absolute top-2 left-2 right-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#fbbf24]/60 flex items-center justify-between text-xs text-white z-10 animate-fadeIn">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-[#fbbf24]">
                {playingSegment.ayahNumber === 0 ? 'الاستعاذة والبسملة' : `استماع الآية ${playingSegment.ayahNumber}`}
              </span>
              <span className="text-[#86efac] text-[11px] truncate">
                ({formatTimeMMSS(playingSegment.startTimeSeconds)} - {formatTimeMMSS(playingSegment.endTimeSeconds)})
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-amber-300">
              <Clock className="w-3 h-3 text-[#fbbf24]" />
              <span>
                {strictStopAtEnd
                  ? `يقف تلقائياً عند ${formatTimeMMSS(playingSegment.endTimeSeconds)}`
                  : 'استماع مستمر لتحديد نهاية الآية بالزر أدناه'}
              </span>
            </div>
          </div>
        )}

        {/* Notification feedback toast */}
        {justFinishedAlert && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#064e3b]/95 border border-[#fbbf24] text-amber-200 px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 z-20 animate-fadeIn backdrop-blur-sm">
            <CheckCircle2 className="w-4 h-4 text-[#fbbf24] shrink-0" />
            <span>{justFinishedAlert}</span>
          </div>
        )}
      </div>

      {/* Live Playback Toolbar & Timestamps Controller */}
      <div className="bg-[#064e3b]/60 border border-[#065f46] rounded-xl p-2.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Live time indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#022c22] border border-[#065f46] text-white font-mono text-xs">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-ping' : 'bg-zinc-500'}`} />
              <span className="text-emerald-300 font-bold">الوقت الحالي:</span>
              <span className="text-[#fbbf24] font-black text-sm">{formatTimeMMSS(currentTime)}</span>
              <span className="text-[10px] text-[#86efac]/70">({currentTime.toFixed(2)}ث)</span>
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                isLooping
                  ? 'bg-amber-500/30 border-amber-400 text-[#fbbf24]'
                  : 'bg-[#022c22] border-[#065f46] text-emerald-300 hover:text-white'
              }`}
              title="تكرار الآية المحددة تلقائياً للتحفيظ والإتقان"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isLooping ? 'التكرار مفعل' : 'تكرار الآية'}</span>
            </button>
          </div>

          {/* Quick player scrubber controls */}
          <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
            <button
              type="button"
              onClick={() => handleSeekDelta(-5)}
              className="px-2 py-1 rounded-lg bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] hover:text-amber-300 text-xs font-bold font-mono border border-[#fbbf24]/40 hover:border-[#fbbf24] flex items-center gap-1 cursor-pointer transition-all shadow-sm active:scale-95"
              title="رجوع 5 ثوانٍ للخلف (-5s)"
            >
              <Rewind className="w-3.5 h-3.5 fill-current" />
              <span>5ث-</span>
            </button>
            <button
              type="button"
              onClick={() => handleSeekDelta(-1)}
              className="px-1.5 py-1 rounded-lg bg-[#022c22] hover:bg-[#064e3b] text-[#86efac] text-xs font-mono border border-[#065f46] cursor-pointer active:scale-95"
              title="تأخير ثانية واحدة (-1s)"
            >
              1ث-
            </button>
            <button
              type="button"
              onClick={() => handleSeekDelta(-0.25)}
              className="px-1.5 py-1 rounded-lg bg-[#022c22] hover:bg-[#064e3b] text-amber-300 text-xs font-mono border border-amber-500/40 cursor-pointer active:scale-95"
              title="تأخير ربع ثانية (-0.25s)"
            >
              0.25ث-
            </button>
            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="px-3.5 py-1.5 rounded-lg bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all ring-1 ring-amber-300"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الاستماع'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSeekDelta(0.25)}
              className="px-1.5 py-1 rounded-lg bg-[#022c22] hover:bg-[#064e3b] text-amber-300 text-xs font-mono border border-amber-500/40 cursor-pointer active:scale-95"
              title="تقديم ربع ثانية (+0.25s)"
            >
              +0.25ث
            </button>
            <button
              type="button"
              onClick={() => handleSeekDelta(1)}
              className="px-1.5 py-1 rounded-lg bg-[#022c22] hover:bg-[#064e3b] text-[#86efac] text-xs font-mono border border-[#065f46] cursor-pointer active:scale-95"
              title="تقديم ثانية واحدة (+1s)"
            >
              +1ث
            </button>
            <button
              type="button"
              onClick={() => handleSeekDelta(5)}
              className="px-2 py-1 rounded-lg bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] hover:text-amber-300 text-xs font-bold font-mono border border-[#fbbf24]/40 hover:border-[#fbbf24] flex items-center gap-1 cursor-pointer transition-all shadow-sm active:scale-95"
              title="تقديم 5 ثوانٍ للأمام (+5s)"
            >
              <span>+5ث</span>
              <FastForward className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        {/* PROMINENT LIVE END-POINT DETERMINATION BAR (طلب المستخدم الحصري) */}
        {!readOnlyControls && activeSegment && (
          <div className="space-y-2 pt-2 border-t border-[#065f46]">
            {/* Prominent Golden Action Bar */}
            <div className="p-2.5 bg-gradient-to-r from-[#022c22] via-[#064e3b] to-[#022c22] rounded-xl border border-[#fbbf24]/60 shadow-md flex flex-col md:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-[#fbbf24] text-[#064e3b] font-black shrink-0">
                  {activeSegment.ayahNumber === 0 ? 'الاستعاذة والبسملة' : `الآية ${activeSegment.ayahNumber}`}
                </span>
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <span>الضبط الفوري:</span>
                  <span className="font-mono text-[#fbbf24] text-sm">
                    {formatTimeMMSS(currentTime)}
                  </span>
                </div>
              </div>

              {/* Action Buttons styled in platform theme */}
              <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
                {/* 5s rewind & forward quick jump buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSeekDelta(-5)}
                    className="px-2.5 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] font-bold text-xs flex items-center gap-1 border border-[#fbbf24]/40 hover:border-[#fbbf24] shadow cursor-pointer transition-all active:scale-95"
                    title="رجوع 5 ثوانٍ للخلف (-5s)"
                  >
                    <Rewind className="w-3.5 h-3.5" />
                    <span>رجوع 5ث</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSeekDelta(5)}
                    className="px-2.5 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] font-bold text-xs flex items-center gap-1 border border-[#fbbf24]/40 hover:border-[#fbbf24] shadow cursor-pointer transition-all active:scale-95"
                    title="تقديم 5 ثوانٍ للأمام (+5s)"
                  >
                    <span>تقديم 5ث</span>
                    <FastForward className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1. Main user request: "الآن نهاية الآية والتالي" */}
                {onSetEndAndAdvance && (
                  <button
                    type="button"
                    onClick={handleSetEndAndAdvanceFromCurrent}
                    className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#064e3b] font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all transform active:scale-95 cursor-pointer ring-2 ring-[#fbbf24]/50"
                    title="اضغط فور انتهاء القارئ من الآية لاعتماد هذه اللحظة بالمللي ثانية كنهاية والتوقف فوراً عند بداية الآية التالية جاهزة للتشغيل"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#064e3b] shrink-0" />
                    <span>الآن نهاية الآية والتالي (مع توقف)</span>
                    <ArrowLeft className="w-4 h-4 text-[#064e3b] shrink-0" />
                  </button>
                )}

                {/* 2. Set End only at this exact moment */}
                <button
                  type="button"
                  onClick={handleSetEndFromCurrent}
                  className="px-3 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#fbbf24]/60 shadow cursor-pointer transition-all active:scale-95"
                  title="اعتماد هذه اللحظة كنهاية لهذه الآية فقط"
                >
                  <Flag className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
                  <span>الآن نهاية الآية فقط</span>
                </button>

                {/* 3. Set Start at this exact moment */}
                <button
                  type="button"
                  onClick={handleSetStartFromCurrent}
                  className="px-2.5 py-2 rounded-xl bg-[#022c22] hover:bg-[#064e3b] text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-[#065f46] shadow cursor-pointer transition-all active:scale-95"
                  title="اعتماد هذه اللحظة كبداية للآية"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>الآن بداية الآية</span>
                </button>
              </div>
            </div>

            {/* Bottom details & quick playback test */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#86efac] px-1">
              <div className="flex items-center gap-2">
                <span className="text-zinc-300">النطاق المسجل حالياً:</span>
                <span className="font-mono text-white font-bold">
                  {formatTimeMMSS(activeSegment.startTimeSeconds)} إلى {formatTimeMMSS(activeSegment.endTimeSeconds)}
                </span>
                <span className="text-amber-300 font-mono text-[11px]">
                  (المدة: {Math.max(0, Number((activeSegment.endTimeSeconds - activeSegment.startTimeSeconds).toFixed(2)))} ث)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Continuous listening vs Strict stop toggle */}
                <button
                  type="button"
                  onClick={() => setStrictStopAtEnd(!strictStopAtEnd)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                    strictStopAtEnd
                      ? 'bg-emerald-800/80 border-emerald-500 text-emerald-100'
                      : 'bg-[#022c22] border-[#065f46] text-[#86efac]'
                  }`}
                  title="التبديل بين التوقف التلقائي عند نهاية الآية أو الاستماع المستمر لتحديد نهايتها"
                >
                  <SlidersHorizontal className="w-3 h-3 text-[#fbbf24]" />
                  <span>{strictStopAtEnd ? 'إيقاف تلقائي عند نهاية الآية' : 'استماع مستمر لتحديد النهاية'}</span>
                </button>

                {/* Test play this segment strictly */}
                <button
                  type="button"
                  onClick={() => playAyahSegment(activeSegment, true)}
                  className="px-2.5 py-1 rounded-lg bg-[#022c22] hover:bg-[#064e3b] text-[#fbbf24] font-bold text-xs flex items-center gap-1 border border-[#fbbf24]/50 cursor-pointer transition-all"
                  title="تشغيل هذه الآية فقط من بدايتها لنهايتها للتحقق مع الإيقاف التلقائي"
                >
                  <Play className="w-3 h-3 fill-[#fbbf24]" />
                  <span>استماع للتحقق</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
