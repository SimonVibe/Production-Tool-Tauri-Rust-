import { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Mic, RefreshCw, Volume2, Video, CheckCircle2, 
  AlertCircle, Maximize2, Minimize2, Columns, LayoutGrid, 
  Play, Square, VolumeX, Eye, Sparkles, Radio, Check, Sliders
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  onClose: () => void;
}

type LayoutPreset = 'split' | 'mic-priority' | 'cinema';
type VideoSizePreset = 'compact' | 'auto' | 'large';

export default function CameraMicModal({ onClose }: Props) {
  const { t, language } = useLanguage();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  
  // Layout and Dynamic Size controls
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>('split');
  const [videoSize, setVideoSize] = useState<VideoSizePreset>('auto');
  
  // Audio state
  const [micVolume, setMicVolume] = useState<number>(0);
  const [peakVolume, setPeakVolume] = useState<number>(0);
  const [freqData, setFreqData] = useState<number[]>(new Array(16).fill(0));
  
  // Microphone loopback test (Record 3s and playback)
  const [isRecordingLoopback, setIsRecordingLoopback] = useState<boolean>(false);
  const [isPlayingLoopback, setIsPlayingLoopback] = useState<boolean>(false);
  const [loopbackProgress, setLoopbackProgress] = useState<number>(0);
  const [hasLoopbackSample, setHasLoopbackSample] = useState<boolean>(false);
  
  // Speaker Test Tone (440Hz Sine)
  const [isPlayingTone, setIsPlayingTone] = useState<boolean>(false);

  // Snapshot capture
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const toneOscillatorRef = useRef<OscillatorNode | null>(null);
  const toneContextRef = useRef<AudioContext | null>(null);
  const loopbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const streamSessionIdRef = useRef<number>(0);

  // Helper to securely stop and disable all tracks in a MediaStream
  const stopMediaStreamTracks = (stream: MediaStream | null) => {
    if (!stream) return;
    try {
      const tracks = stream.getTracks();
      for (const track of tracks) {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) {
          console.warn('Erreur arrêt piste média:', e);
        }
      }
    } catch (err) {
      console.warn('Erreur récupération pistes média:', err);
    }
  };

  const stopAllStreams = () => {
    // Invalidate in-flight getUserMedia requests
    streamSessionIdRef.current++;

    // Clear loopback recording interval
    if (loopbackIntervalRef.current) {
      clearInterval(loopbackIntervalRef.current);
      loopbackIntervalRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }
    setIsRecordingLoopback(false);

    // Stop volume / frequency animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Stop Tone test oscillator & audio context
    if (toneOscillatorRef.current) {
      try {
        toneOscillatorRef.current.stop();
        toneOscillatorRef.current.disconnect();
      } catch {}
      toneOscillatorRef.current = null;
    }
    if (toneContextRef.current) {
      try {
        toneContextRef.current.close().catch(() => {});
      } catch {}
      toneContextRef.current = null;
    }
    setIsPlayingTone(false);

    // Stop and cleanup recorded audio playback
    if (audioPlaybackRef.current) {
      try {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current.src = '';
      } catch {}
      audioPlaybackRef.current = null;
      setIsPlayingLoopback(false);
    }
    if (currentAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      } catch {}
      currentAudioUrlRef.current = null;
    }

    // Close mic analyzer Web Audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }

    // Stop camera and microphone hardware tracks
    if (mediaStreamRef.current) {
      stopMediaStreamTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }

    // Detach video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }

    setMicVolume(0);
    setPeakVolume(0);
    setFreqData(new Array(16).fill(0));
  };

  // Safe Close Handler
  const handleClose = () => {
    isMountedRef.current = false;
    stopAllStreams();
    onClose();
  };

  // Scan available audio/video devices
  const refreshDevices = async () => {
    try {
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      if (initialStream) {
        stopMediaStreamTracks(initialStream);
      }

      if (!isMountedRef.current) return;
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!isMountedRef.current) return;

      const vDevs = devices.filter(d => d.kind === 'videoinput');
      const aDevs = devices.filter(d => d.kind === 'audioinput');

      setVideoDevices(vDevs);
      setAudioDevices(aDevs);

      if (vDevs.length > 0 && !selectedVideoId) {
        setSelectedVideoId(vDevs[0].deviceId);
      }
      if (aDevs.length > 0 && !selectedAudioId) {
        setSelectedAudioId(aDevs[0].deviceId);
      }
    } catch (err: any) {
      console.error('Erreur énumération périphériques:', err);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    refreshDevices();
    return () => {
      isMountedRef.current = false;
      stopAllStreams();
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current) {
      startMediaStream();
    }
    return () => {
      stopAllStreams();
    };
  }, [selectedVideoId, selectedAudioId]);

  const startMediaStream = async () => {
    stopAllStreams();
    const currentSession = streamSessionIdRef.current;

    setCameraError(null);
    setMicError(null);
    setCapturedPhoto(null);

    const constraints: MediaStreamConstraints = {
      video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
      audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Abort if unmounted or if another stream configuration was requested in the meantime
      if (!isMountedRef.current || currentSession !== streamSessionIdRef.current) {
        stopMediaStreamTracks(stream);
        return;
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!isMountedRef.current || currentSession !== streamSessionIdRef.current) return;
          if (videoRef.current) {
            setVideoResolution({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
          }
        };
        videoRef.current.play().catch(() => {});
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.6;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVolume = () => {
            if (!isMountedRef.current || currentSession !== streamSessionIdRef.current) return;

            analyser.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volumePercent = Math.min(100, Math.round((average / 128) * 100));
            
            setMicVolume(volumePercent);
            setPeakVolume(prev => Math.max(prev * 0.94, volumePercent));

            const bands: number[] = [];
            const step = Math.max(1, Math.floor(dataArray.length / 16));
            for (let i = 0; i < 16; i++) {
              const val = dataArray[i * step] || 0;
              bands.push(Math.min(100, Math.round((val / 255) * 100)));
            }
            setFreqData(bands);

            animFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        } catch (e) {
          console.error('Audio analyzer setup error:', e);
          if (isMountedRef.current && currentSession === streamSessionIdRef.current) {
            setMicError('Impossible d’initialiser l’analyseur audio');
          }
        }
      } else {
        if (isMountedRef.current && currentSession === streamSessionIdRef.current) {
          setMicError('Aucun flux audio détecté');
        }
      }

    } catch (err: any) {
      if (!isMountedRef.current || currentSession !== streamSessionIdRef.current) return;
      console.error('getUserMedia error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Accès à la caméra/micro refusé par Windows ou l’utilisateur.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('Aucun périphérique caméra ou micro détecté.');
      } else {
        setCameraError(`Erreur média: ${err.message || 'Impossible d’accéder aux périphériques'}`);
      }
    }
  };

  // Mic Loopback: Record 3s of audio and playback
  const handleStartLoopbackTest = () => {
    if (!mediaStreamRef.current) return;
    const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      setMicError('Aucun microphone actif pour le test');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const recStream = new MediaStream([audioTrack]);
      const recorder = new MediaRecorder(recStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (!isMountedRef.current) return;
        setIsRecordingLoopback(false);
        setHasLoopbackSample(true);
        playRecordedLoopback();
      };

      recorder.start();
      setIsRecordingLoopback(true);
      setLoopbackProgress(0);

      const startTime = Date.now();
      if (loopbackIntervalRef.current) {
        clearInterval(loopbackIntervalRef.current);
      }

      loopbackIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          if (loopbackIntervalRef.current) clearInterval(loopbackIntervalRef.current);
          return;
        }
        const elapsed = Date.now() - startTime;
        const p = Math.min(100, Math.round((elapsed / 3000) * 100));
        setLoopbackProgress(p);
        if (elapsed >= 3000) {
          if (loopbackIntervalRef.current) {
            clearInterval(loopbackIntervalRef.current);
            loopbackIntervalRef.current = null;
          }
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 50);
    } catch (e: any) {
      console.error('MediaRecorder error:', e);
      setMicError(`Erreur enregistreur : ${e.message}`);
      setIsRecordingLoopback(false);
    }
  };

  const playRecordedLoopback = () => {
    if (recordedChunksRef.current.length === 0) return;
    try {
      if (currentAudioUrlRef.current) {
        try { URL.revokeObjectURL(currentAudioUrlRef.current); } catch {}
      }
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      currentAudioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioPlaybackRef.current = audio;

      setIsPlayingLoopback(true);
      audio.onended = () => {
        if (isMountedRef.current) {
          setIsPlayingLoopback(false);
        }
      };
      audio.play().catch(() => {
        if (isMountedRef.current) setIsPlayingLoopback(false);
      });
    } catch (e: any) {
      console.error('Audio playback error:', e);
      if (isMountedRef.current) setIsPlayingLoopback(false);
    }
  };

  // Test Speaker Tone (440Hz Sine Wave)
  const handleToggleSpeakerTone = () => {
    if (isPlayingTone) {
      if (toneOscillatorRef.current) {
        try {
          toneOscillatorRef.current.stop();
          toneOscillatorRef.current.disconnect();
        } catch {}
        toneOscillatorRef.current = null;
      }
      if (toneContextRef.current) {
        try { toneContextRef.current.close().catch(() => {}); } catch {}
        toneContextRef.current = null;
      }
      setIsPlayingTone(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        toneContextRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        toneOscillatorRef.current = osc;
        setIsPlayingTone(true);

        setTimeout(() => {
          if (!isMountedRef.current) return;
          if (toneOscillatorRef.current === osc) {
            try {
              osc.stop();
              osc.disconnect();
            } catch {}
            toneOscillatorRef.current = null;
            if (toneContextRef.current === ctx) {
              try { ctx.close().catch(() => {}); } catch {}
              toneContextRef.current = null;
            }
            setIsPlayingTone(false);
          }
        }, 2000);
      } catch (e) {
        console.error('Tone generation error:', e);
      }
    }
  };

  // Snapshot photo test
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhoto(dataUrl);
    }
  };

  // Video container height class based on size preset and layout
  const getVideoContainerHeight = () => {
    if (layoutPreset === 'mic-priority') {
      return 'h-40 max-h-[160px] aspect-video';
    }
    if (layoutPreset === 'cinema') {
      return 'h-[58vh] min-h-[300px]';
    }
    // Split mode with videoSize presets
    switch (videoSize) {
      case 'compact':
        return 'h-48 max-h-[200px] aspect-video';
      case 'large':
        return 'h-[52vh] min-h-[320px] aspect-video';
      case 'auto':
      default:
        return 'h-[36vh] min-h-[220px] max-h-[320px] aspect-video';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className={`bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 transition-all duration-200 w-full ${
        layoutPreset === 'cinema' 
          ? 'max-w-6xl max-h-[96vh]' 
          : 'max-w-5xl max-h-[92vh]'
      }`}>
        
        {/* ================= COMPACT HEADER ================= */}
        <div className="bg-zinc-900/95 px-4 py-2 flex items-center justify-between border-b border-zinc-800 shrink-0">
          
          {/* Title & Stream Resolution */}
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Camera size={16} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">{t('cam_mic.hd_title')}</h3>
                {videoResolution && (
                  <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 rounded border border-emerald-500/30">
                    {videoResolution.width}×{videoResolution.height}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Layout & Dynamic Size Controls */}
          <div className="flex items-center space-x-2">
            
            {/* Dynamic Preset Modes */}
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setLayoutPreset('split')}
                title={language === 'en' ? "Side-by-side layout (Recommended for laptops and PCs)" : "Disposition Côte-à-Côte (Recommandée pour portables et ordinateurs)"}
                className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  layoutPreset === 'split' 
                    ? 'bg-amber-500 text-zinc-950 font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Columns size={12} />
                <span className="hidden sm:inline">{t('cam_mic.balanced')}</span>
              </button>

              <button
                onClick={() => setLayoutPreset('mic-priority')}
                title={language === 'en' ? "Microphone Priority (Ideal for small screens or focused mic test)" : "Microphone Prioritaire (Idéal pour petits écrans ou focus test micro)"}
                className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  layoutPreset === 'mic-priority' 
                    ? 'bg-amber-500 text-zinc-950 font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mic size={12} />
                <span className="hidden sm:inline">{t('cam_mic.mic_focus')}</span>
              </button>

              <button
                onClick={() => setLayoutPreset('cinema')}
                title={language === 'en' ? "Large Camera Format" : "Grand Format Caméra"}
                className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  layoutPreset === 'cinema' 
                    ? 'bg-amber-500 text-zinc-950 font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Maximize2 size={12} />
                <span className="hidden sm:inline">{t('cam_mic.large')}</span>
              </button>
            </div>

            {/* Video Size Sub-Selector (in split mode) */}
            {layoutPreset === 'split' && (
              <div className="hidden md:flex items-center bg-zinc-950 px-1 py-0.5 rounded-lg border border-zinc-800 text-[10px]">
                <span className="text-zinc-500 px-1 font-semibold">{t('cam_mic.video_size')}</span>
                {(['compact', 'auto', 'large'] as VideoSizePreset[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setVideoSize(sz)}
                    className={`px-1.5 py-0.5 rounded uppercase font-bold cursor-pointer transition-colors ${
                      videoSize === sz 
                        ? 'bg-zinc-800 text-amber-400' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {sz === 'compact' ? '35%' : sz === 'auto' ? 'Auto' : '75%'}
                  </button>
                ))}
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={refreshDevices}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              title={t('cam_mic.refresh_tooltip')}
            >
              <RefreshCw size={15} />
            </button>

            {/* Close */}
            <button 
              onClick={handleClose} 
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              title={t('cam_mic.close_tooltip')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= COMPACT DEVICE SELECTORS BAR ================= */}
        <div className="bg-zinc-950/90 border-b border-zinc-800/80 px-4 py-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs shrink-0">
          {/* Camera Select */}
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px] font-bold flex items-center shrink-0">
              <Video size={13} className="mr-1 text-blue-400" /> {t('cam_mic.camera_label')}
            </span>
            <select
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs font-medium text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer truncate"
            >
              {videoDevices.length === 0 ? (
                <option value="">{t('cam_mic.no_camera_found')}</option>
              ) : (
                videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `${language === 'en' ? 'Camera' : 'Caméra'} ${i + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Mic Select */}
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px] font-bold flex items-center shrink-0">
              <Mic size={13} className="mr-1 text-emerald-400" /> {t('cam_mic.mic_label')}
            </span>
            <select
              value={selectedAudioId}
              onChange={(e) => setSelectedAudioId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs font-medium text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer truncate"
            >
              {audioDevices.length === 0 ? (
                <option value="">{t('cam_mic.no_mic_found')}</option>
              ) : (
                audioDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `${language === 'en' ? 'Microphone' : 'Microphone'} ${i + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* ================= MODAL BODY WITH FLUID LAYOUT ================= */}
        <div className={`p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 ${
          layoutPreset === 'cinema' 
            ? 'space-y-3'
            : 'grid grid-cols-1 md:grid-cols-12 gap-3 items-start'
        }`}>

          {/* ================= COLUMN 1 / VIDEO FRAME ================= */}
          <div className={`${
            layoutPreset === 'cinema' 
              ? 'w-full' 
              : layoutPreset === 'mic-priority'
              ? 'md:col-span-5 flex flex-col justify-start'
              : 'md:col-span-7 flex flex-col justify-start'
          } space-y-2`}>
            
            {/* Video Box */}
            <div className={`relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-inner group ${getVideoContainerHeight()}`}>
              
              {/* HTML5 Live Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${isMirrored ? 'scale-x-[-1]' : ''}`}
              />

              {/* Grid Alignment Overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-dashed border-white/20">
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div></div>
                </div>
              )}

              {/* Live Status Badge */}
              <div className="absolute top-2 left-2 bg-zinc-950/85 backdrop-blur-xs text-zinc-200 text-[10px] font-mono px-2 py-0.5 rounded-md border border-zinc-800 flex items-center space-x-1.5 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{videoResolution ? `${videoResolution.width}×${videoResolution.height}` : (language === 'en' ? 'Active stream' : 'Flux actif')}</span>
              </div>

              {/* Video Overlay Quick Buttons */}
              <div className="absolute top-2 right-2 flex items-center space-x-1.5 z-10">
                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors cursor-pointer backdrop-blur-xs ${
                    isMirrored 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:bg-zinc-900'
                  }`}
                  title={language === 'en' ? 'Toggle horizontal mirror' : 'Inverser le miroir horizontal'}
                >
                  {language === 'en' ? 'Mirror' : 'Miroir'}
                </button>

                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-1 rounded-md border transition-colors cursor-pointer backdrop-blur-xs ${
                    showGrid 
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                      : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:bg-zinc-900'
                  }`}
                  title={language === 'en' ? 'Framing grid' : 'Grille de cadrage'}
                >
                  <Eye size={12} />
                </button>

                <button
                  onClick={handleTakeSnapshot}
                  className="bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 p-1 rounded-md border border-zinc-800 transition-colors cursor-pointer"
                  title={language === 'en' ? 'Take test photo' : 'Prendre une photo test'}
                >
                  <Camera size={12} />
                </button>
              </div>

              {/* Error overlay */}
              {cameraError && (
                <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-4 text-center z-20">
                  <AlertCircle size={28} className="text-rose-500 mb-1" />
                  <p className="text-rose-300 text-xs font-bold">{cameraError}</p>
                  <p className="text-zinc-500 text-[10px] mt-1 max-w-xs">
                    {t('cam_mic.check_shutter')}
                  </p>
                  <button
                    onClick={startMediaStream}
                    className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              )}
            </div>

            {/* Snapshot thumbnail if captured */}
            {capturedPhoto && (
              <div className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <img 
                    src={capturedPhoto} 
                    alt="Capture test" 
                    className="w-12 h-9 object-cover rounded-md border border-zinc-700" 
                  />
                  <div>
                    <span className="text-[11px] font-bold text-zinc-200">{t('cam_mic.photo_captured')}</span>
                    <p className="text-[9px] text-zinc-500">{t('cam_mic.sensor_ok')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCapturedPhoto(null)}
                  className="text-zinc-400 hover:text-zinc-200 text-[10px] px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700 cursor-pointer"
                >
                  {t('common.close')}
                </button>
              </div>
            )}

          </div>

          {/* ================= COLUMN 2 / MICROPHONE & AUDIO (ALWAYS VISIBLE) ================= */}
          <div className={`${
            layoutPreset === 'cinema' 
              ? 'w-full' 
              : layoutPreset === 'mic-priority'
              ? 'md:col-span-7 space-y-2.5'
              : 'md:col-span-5 space-y-2.5'
          }`}>
            
            {/* 1. VU-MÈTRE DIRECT & SPECTRE FRÉQUENTIEL */}
            <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 space-y-2 shadow-sm">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Volume2 size={16} className={micVolume > 4 ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'} />
                  <span className="text-xs font-bold text-zinc-200">{t('cam_mic.vumeter')}</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {micVolume}% <span className="text-zinc-500 font-normal text-[10px]">(Max: {Math.round(peakVolume)}%)</span>
                </span>
              </div>

              {/* Master Volume Bar */}
              <div className="w-full h-3 bg-zinc-950 rounded-full border border-zinc-800 p-0.5 relative overflow-hidden flex items-center">
                <div 
                  className="h-full rounded-full transition-all duration-75 flex items-center justify-end shadow-sm"
                  style={{
                    width: `${micVolume}%`,
                    backgroundColor: micVolume > 75 ? '#f43f5e' : micVolume > 35 ? '#eab308' : '#10b981',
                  }}
                />
              </div>

              {/* Real-time Frequency Equalizer Bars (16 bands) */}
              <div className="pt-0.5">
                <div className="flex items-end justify-between h-7 bg-zinc-950/90 px-1.5 py-1 rounded-lg border border-zinc-800/80 gap-0.5">
                  {freqData.map((val, idx) => (
                    <div 
                      key={idx} 
                      className="flex-1 bg-gradient-to-t from-emerald-600 via-amber-500 to-rose-500 rounded-t-xs transition-all duration-75 min-h-[2px]"
                      style={{ height: `${Math.max(4, val)}%` }}
                    />
                  ))}
                </div>
              </div>

              {micError && (
                <p className="text-[11px] text-rose-400 font-semibold">{micError}</p>
              )}
            </div>

            {/* 2. TESTS AUDIO RAPIDES (ÉCHO 3s & BIP SONORE) */}
            <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 space-y-2 shadow-sm">
              <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>{t('cam_mic.sound_tests')}</span>
                <span className="text-[10px] text-zinc-500 font-normal">{t('cam_mic.mic_speakers')}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Loopback Test Button */}
                <button
                  onClick={handleStartLoopbackTest}
                  disabled={isRecordingLoopback || isPlayingLoopback}
                  className={`p-2 rounded-lg border text-left text-xs font-semibold flex flex-col justify-between transition-all cursor-pointer ${
                    isRecordingLoopback
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse'
                      : isPlayingLoopback
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                  }`}
                  title={language === 'en' ? "Records 3 seconds then automatically plays back into speakers" : "Enregistre 3 secondes puis rejoue automatiquement dans les haut-parleurs"}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Radio size={13} className={isRecordingLoopback ? 'text-rose-400' : 'text-emerald-400'} />
                    <span className="font-bold text-[11px]">
                      {isRecordingLoopback 
                        ? t('cam_mic.record_3s') 
                        : isPlayingLoopback 
                        ? t('cam_mic.playback_audio') 
                        : t('cam_mic.test_mic_echo')}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-normal">
                    {isRecordingLoopback ? (
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-1">
                        <div className="bg-rose-500 h-full transition-all duration-75" style={{ width: `${loopbackProgress}%` }}></div>
                      </div>
                    ) : isPlayingLoopback ? (
                      t('cam_mic.listen_speakers')
                    ) : (
                      t('cam_mic.speak_3s')
                    )}
                  </div>
                </button>

                {/* Speaker Tone Bip Button */}
                <button
                  onClick={handleToggleSpeakerTone}
                  className={`p-2 rounded-lg border text-left text-xs font-semibold flex flex-col justify-between transition-all cursor-pointer ${
                    isPlayingTone
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                  }`}
                  title={language === 'en' ? "Generates a tone to validate stereo speakers" : "Génère un bip sonore pour valider les haut-parleurs"}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Volume2 size={13} className={isPlayingTone ? 'text-amber-400' : 'text-blue-400'} />
                    <span className="font-bold text-[11px]">
                      {isPlayingTone ? t('cam_mic.speaker_tone_active') : t('cam_mic.speaker_tone_btn')}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-normal">
                    {isPlayingTone ? t('cam_mic.signal_active') : t('cam_mic.speaker_tone_desc')}
                  </div>
                </button>
              </div>

              {hasLoopbackSample && !isRecordingLoopback && !isPlayingLoopback && (
                <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-400 font-medium border-t border-zinc-800">
                  <span className="flex items-center gap-1"><Check size={12} /> {t('cam_mic.sample_captured')}</span>
                  <button 
                    onClick={playRecordedLoopback}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Play size={11} /> {t('cam_mic.playback_btn')}
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* ================= COMPACT FOOTER ================= */}
        <div className="bg-zinc-900/95 px-4 py-2 flex justify-between items-center border-t border-zinc-800 shrink-0">
          <div className="text-xs text-zinc-400 flex items-center space-x-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-[11px]">{t('cam_mic.multimedia_active')}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer border border-zinc-700"
            >
              {t('cam_mic.close_test')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
