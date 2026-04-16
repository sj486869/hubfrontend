'use client';

import Hls from 'hls.js';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { VideoItem } from '../lib/types';
import { toggleLike } from '../lib/api';

/* ─────────────────────────── helpers ─────────────────────────── */

function formatViews(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views.toLocaleString()} views`;
}

function formatPublishedDate(value: string) {
  if (!value) return 'Recently';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return [hours, minutes, secs].map((v, i) => (i === 0 ? String(v) : String(v).padStart(2, '0'))).join(':');
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function isHlsSource(url: string) {
  return url.toLowerCase().includes('.m3u8');
}

/* ─────────────────────────── toast ───────────────────────────── */

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

/* ─────────────────────────── icons ───────────────────────────── */

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);
const VolumeOnIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);
const VolumeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);
const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);
const ThumbUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
  </svg>
);
const ThumbDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
  </svg>
);

/* ─────────────────────────── component ───────────────────────── */

export default function VideoPlayer({ video, token }: { video: VideoItem; token: string | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [likes, setLikes] = useState(video.likes);
  const [dislikes, setDislikes] = useState(video.dislikes);
  const [busyAction, setBusyAction] = useState<'like' | 'dislike' | null>(null);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<{height: number, bitrate: number}[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const lastTapRef = useRef<{ time: number, x: number } | null>(null);

  const [playbackMode, setPlaybackMode] = useState<'stream' | 'file'>(
    isHlsSource(video.videoUrl) ? 'stream' : 'file',
  );

  const { toast, show: showToast } = useToast();
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const likePercent = likes + dislikes > 0 ? Math.round((likes / (likes + dislikes)) * 100) : 0;
  const reactionTotal = likes + dislikes;

  /* ── auto-hide controls ── */
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  /* ── HLS setup ── */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    setIsReady(false);
    setCurrentTime(0);
    setDuration(0);
    setProgressValue(0);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (isHlsSource(video.videoUrl)) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, maxBufferLength: 90, backBufferLength: 90 });
        hlsRef.current = hls;
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setHlsLevels(data.levels);
          setCurrentLevel(hls.currentLevel);
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentLevel(data.level);
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS Fatal Error:', data);
            setPlaybackError('Your browser blocked the stream or the file is corrupted. Check if you need to allow "Insecure Content".');
            setIsReady(true); // Stop spinner
          }
        });

        hls.loadSource(video.videoUrl);
        hls.attachMedia(el);
        setPlaybackMode('stream');
      } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = video.videoUrl;
        setPlaybackMode('stream');
      } else {
        el.src = video.videoUrl;
        setPlaybackMode('file');
      }
    } else {
      el.src = video.videoUrl;
      setPlaybackMode('file');
    }

    el.load();
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [video.videoUrl]);

  /* ── video events ── */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const syncTime = () => {
      if (!isSeeking) {
        const t = el.currentTime || 0;
        const d = el.duration || 0;
        setCurrentTime(t);
        setDuration(d);
        setProgressValue(d ? (t / d) * 100 : 0);
      }
    };

    const onMeta = () => { setIsReady(true); syncTime(); setPlaybackError(null); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVol = () => { setIsMuted(el.muted || el.volume === 0); setVolume(el.volume); };
    const onWait = () => setIsReady(false);
    const onCan = () => setIsReady(true);
    const onDur = () => setDuration(el.duration || 0);
    const onErr = () => {
      console.error('Video element error');
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && video.videoUrl.startsWith('http:')) {
        setPlaybackError('Security Block: Your browser is preventing this video from loading because it is not served over a secure connection (HTTPS). Please allow insecure content in your site settings.');
      } else {
        setPlaybackError('Failed to load video. This might be a network error or a missing file.');
      }
      setIsReady(true);
    };

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', syncTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('volumechange', onVol);
    el.addEventListener('waiting', onWait);
    el.addEventListener('canplay', onCan);
    el.addEventListener('durationchange', onDur);
    el.addEventListener('error', onErr);
    onVol();

    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', syncTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('volumechange', onVol);
      el.removeEventListener('waiting', onWait);
      el.removeEventListener('canplay', onCan);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('error', onErr);
    };
  }, [isSeeking, video.videoUrl]);

  /* ── actions ── */
  const togglePlayback = () => {
    const el = videoRef.current;
    if (!el) return;
    el.paused ? void el.play() : el.pause();
    resetHideTimer();
  };

  const setSpeed = (rate: number) => {
    const el = videoRef.current;
    if (el) el.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
    resetHideTimer();
  };

  const setQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
    }
    setShowSettings(false);
    resetHideTimer();
  };

  const handleVideoTouch = (e: React.TouchEvent) => {
    resetHideTimer();
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const x = touch.clientX;
    const isDoubleTap = lastTapRef.current && (now - lastTapRef.current.time < 300);

    if (isDoubleTap) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      adjustTime(x < mid ? -10 : 10);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, x };
    }
  };

  const adjustTime = (delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    const next = Math.min(Math.max((el.currentTime || 0) + delta, 0), el.duration || 0);
    el.currentTime = next;
    setCurrentTime(next);
    setProgressValue(el.duration ? (next / el.duration) * 100 : 0);
    resetHideTimer();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const next = ratio * duration;
    const el = videoRef.current;
    if (el) el.currentTime = next;
    setCurrentTime(next);
    setProgressValue(ratio * 100);
  };

  const handleProgressDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setIsSeeking(true);
    setProgressValue(v);
    setCurrentTime(duration ? (v / 100) * duration : 0);
  };

  const commitSeek = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const v = Number((e.target as HTMLInputElement).value);
    const next = duration ? (v / 100) * duration : 0;
    const el = videoRef.current;
    if (el) el.currentTime = next;
    setCurrentTime(next);
    setProgressValue(v);
    setIsSeeking(false);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
  };

  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    const v = Number(e.target.value);
    if (el) { el.volume = v; el.muted = v === 0; }
    setVolume(v);
    setIsMuted(v === 0);
  };

  const openFullscreen = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    await el.requestFullscreen();
  };

  const handleAction = async (action: 'like' | 'dislike') => {
    if (!token) { showToast('Sign in to leave a reaction.'); return; }
    try {
      setBusyAction(action);
      const result = await toggleLike(token, { video_id: video.id, action });
      setLikes(result.likes);
      setDislikes(result.dislikes);
      setUserReaction(prev => prev === action ? null : action);
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        showToast('Session expired. Please sign in again.');
      } else {
        showToast('Unable to register your reaction. Try again.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  /* ── computed ── */
  const infoMeta = useMemo(() => ({
    category: video.category,
    views: formatViews(video.views),
    date: formatPublishedDate(video.createdAt),
    duration: video.duration,
    mode: playbackMode === 'stream' ? 'HLS' : 'MP4',
  }), [video, playbackMode]);

  /* ═══════════════════════════ render ═════════════════════════ */

  return (
    <>
      {/* ── Global styles injected once ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        .vp-root { --gold: #93c5fd; --gold-light: #3b82f6; --gold-dim: #2563eb; --ink: transparent; --ink-2: #0b2f4a; --ink-3: #114a70; --surface: #0b2f4a; --border: rgba(255,255,255,.1); --text: #ffffff; --muted: #cbd5e1; font-family: 'DM Sans', sans-serif; color: var(--text); background: var(--ink); }
        .vp-title { font-family: 'Bebas Neue', sans-serif; letter-spacing: .04em; line-height: 1.05; }

        .vp-progress-track { position: relative; height: 4px; background: rgba(255,255,255,.12); border-radius: 2px; cursor: pointer; }
        .vp-progress-track:hover { height: 6px; }
        .vp-progress-track:hover .vp-progress-thumb { opacity: 1; }
        .vp-progress-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 2px; background: #3b82f6; pointer-events: none; transition: height .15s; }
        .vp-progress-thumb { position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 50%; background: #60a5fa; transform: translateY(-50%); opacity: 0; pointer-events: none; transition: opacity .15s; box-shadow: 0 0 8px #60a5fa; }
        .vp-progress-input { position: absolute; inset: -6px 0; opacity: 0; cursor: pointer; width: 100%; }

        .vp-btn-primary { background: #114a70; border: 1px solid rgba(255,255,255,.1); color: #ffffff; font-weight: 600; border-radius: 6px; padding: 8px 18px; font-size: 13px; letter-spacing: .04em; transition: opacity .15s, transform .1s; }
        .vp-btn-primary:hover { opacity: 0.9; background: #1a5b87; }
        .vp-btn-primary:active { transform: scale(.97); }
        .vp-btn-primary.active { box-shadow: 0 0 16px rgba(59,130,246,0.5); border: 1px solid rgba(255,255,255,0.4); }

        .vp-btn-ghost { background: rgba(255,255,255,.05); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 8px 14px; font-size: 13px; transition: background .15s, border-color .15s; }
        .vp-btn-ghost:hover { background: rgba(139,92,246,.15); border-color: var(--gold-light); }
        .vp-btn-ghost.active { border-color: var(--gold-light); color: var(--gold-light); }

        .vp-icon-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px; background: rgba(255,255,255,.05); border: 1px solid var(--border); color: var(--text); transition: background .15s, border-color .15s; }
        .vp-icon-btn:hover { background: rgba(139,92,246,.15); border-color: var(--gold-light); }

        .vp-icon-plain { display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: white; padding: 6px; transform: scale(1.1); opacity: 0.9; transition: transform .1s, opacity .15s; cursor: pointer; }
        .vp-icon-plain:hover { opacity: 1; transform: scale(1.25); }

        .vp-controls-fade { transition: opacity .35s; }
        .vp-controls-hidden { opacity: 0; pointer-events: none; }

        .vp-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; border: 1px solid var(--border); color: var(--muted); background: rgba(255,255,255,.03); }
        .vp-chip.gold { border-color: rgba(255,255,255,.4); color: #ffffff; background: rgba(255,255,255,.1); }

        .vp-tag { display: inline-block; padding: 4px 11px; border-radius: 3px; font-size: 11px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: var(--text); letter-spacing: .05em; }

        .vp-bar-bg { background: rgba(255,255,255,.07); border-radius: 2px; overflow: hidden; }
        .vp-bar-fill { height: 100%; border-radius: 2px; background: #3b82f6; transition: width .5s cubic-bezier(.4,0,.2,1); }

        .vp-vol-slider { -webkit-appearance: none; appearance: none; height: 3px; border-radius: 2px; background: rgba(255,255,255,.15); outline: none; width: 70px; }
        .vp-vol-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: #ffffff; cursor: pointer; }

        .vp-spinner { width: 28px; height: 28px; border: 2px solid rgba(255,255,255,.2); border-top-color: #3b82f6; border-radius: 50%; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .vp-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 10px 20px; border-radius: 8px; font-size: 13px; z-index: 100; white-space: nowrap; box-shadow: 0 8px 32px rgba(0,0,0,.3); animation: toastIn .25s ease; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } }

        .vp-divider { height: 1px; background: var(--border); }

        .vp-scrollchips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .vp-scrollchips::-webkit-scrollbar { display: none; }

        .vp-info-panel { border-radius: 12px; border: 1px solid var(--border); background: var(--ink-2); padding: 16px; }
        .vp-reaction-grid { display: flex; flex-direction: column; gap: 16px; align-items: stretch; }
        .vp-btn-group { display: flex; flex-direction: row; gap: 8px; }
        .vp-btn-group button { flex: 1; }
        
        .vp-controls-row { display: flex; align-items: center; gap: 4px; padding: 0 4px; }
        .vp-time-display { flex: 1; text-align: center; font-size: 10px; color: #b8b4a8; font-variant-numeric: tabular-nums; letter-spacing: .06em; }
        .vp-play-btn-text { display: none; }

        @media (min-width: 640px) {
          .vp-info-panel { padding: 24px 24px 20px; }
          .vp-reaction-grid { flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 20px; }
          .vp-btn-group { flex-direction: column; min-width: 120px; }
          .vp-controls-row { gap: 8px; padding: 0; }
          .vp-vol-slider { display: block; }
          .vp-time-display { font-size: 12px; }
          .vp-play-btn-text { display: inline; font-family: 'DM Sans'; font-size: 12px; font-weight: 600; letter-spacing: .05em; }
        }
        @media (max-width: 639px) {
          .vp-vol-slider { display: none; }
        }
      `}</style>

      <div className="vp-root space-y-4">

        {/* Toast */}
        {toast && <div className="vp-toast">{toast}</div>}

        {/* ═══ VIDEO WRAPPER ═══ */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', background: '#000', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
          <div
            style={{ position: 'relative', aspectRatio: '16/9' }}
            onMouseMove={resetHideTimer}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onTouchStart={handleVideoTouch}
          >
            {/* Video */}
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000', cursor: showControls ? 'default' : 'none' }}
              poster={video.thumbnail}
              preload="metadata"
              playsInline
              onClick={togglePlayback}
            />

            {/* Gradient vignette bottom */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 40%)' }} />

            {/* Loading spinner or Error Message */}
            {!isReady && !playbackError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.4)' }}>
                <div className="vp-spinner" />
              </div>
            )}

            {playbackError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.7)', padding: 40, textAlign: 'center' }}>
                <div className="max-w-md space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-red-500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Playback Error</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {playbackError}
                  </p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 rounded-full bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-white/90"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            )}

            {/* ── Settings Popover ── */}
            {showSettings && (
              <div 
                className="absolute bottom-[60px] right-4 z-50 rounded-xl border border-white/10 bg-black/80 px-4 py-4 backdrop-blur-md"
                onMouseLeave={() => setShowSettings(false)}
              >
                <div className="flex gap-8">
                  {/* Speed Column */}
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Speed</h3>
                    <div className="flex flex-col items-start gap-1">
                      {[0.5, 1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => setSpeed(speed)}
                          className={`text-left text-sm font-medium transition hover:text-white ${playbackRate === speed ? 'text-white' : 'text-muted'}`}
                        >
                          {speed === 1 ? 'Normal' : `${speed}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Quality Column */}
                  {hlsLevels.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Quality</h3>
                      <div className="flex flex-col items-start gap-1">
                        <button
                          onClick={() => setQuality(-1)}
                          className={`text-left text-sm font-medium transition hover:text-white ${currentLevel === -1 ? 'text-white' : 'text-muted'}`}
                        >
                          Auto
                        </button>
                        {hlsLevels.map((lvl, idx) => (
                          <button
                            key={idx}
                            onClick={() => setQuality(idx)}
                            className={`text-left text-sm font-medium transition hover:text-white ${currentLevel === idx ? 'text-white' : 'text-muted'}`}
                          >
                            {lvl.height}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Controls ── */}
            <div
              className={`vp-controls-fade ${!showControls && isPlaying ? 'vp-controls-hidden' : ''}`}
              style={{ position: 'absolute', inset: '0 0 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 2% 2%' }}
            >
              {/* Progress bar */}
              <div style={{ padding: '8px 0', marginBottom: '4px' }}>
                <div
                  ref={progressRef}
                  className="vp-progress-track"
                  onClick={handleProgressClick}
                >
                  <div className="vp-progress-fill" style={{ width: `${progressValue}%` }} />
                  <div className="vp-progress-thumb" style={{ left: `calc(${progressValue}% - 6px)` }} />
                  <input
                    type="range" min={0} max={100} step={0.1}
                    value={progressValue}
                    className="vp-progress-input"
                    onChange={handleProgressDrag}
                    onMouseUp={commitSeek}
                    onTouchEnd={commitSeek}
                    aria-label="Seek"
                  />
                </div>
              </div>

              {/* Controls row - Netflix Style */}
              <div className="flex items-center justify-between">
                
                {/* Left controls */}
                <div className="flex items-center gap-3 sm:gap-5">
                  <button className="vp-icon-plain" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button className="vp-icon-plain" onClick={() => adjustTime(-10)} aria-label="-10s">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12,5V1L7,6l5,5V7c3.31,0,6,2.69,6,6s-2.69,6-6,6s-6-2.69-6-6H4c0,4.42,3.58,8,8,8s8-3.58,8-8S16.42,5,12,5z M9.94,14.6l-1.39-0.45l-0.54,1.66L6.5,15.3l1.83-5.38h1.83L9.94,14.6z M10.46,12.33c0-0.34,0-0.61-0.08-0.8c-0.08-0.2-0.21-0.33-0.4-0.4s-0.41-0.11-0.65-0.1h-0.2L8.85,11.8l-0.34,1.06h1.23 C10.15,12.86,10.46,12.69,10.46,12.33zM15.42,16.5H16.8v-6.6h-1.63l-1.5,1.1l0.69,1.15l0.87-0.65L15.42,16.5z"/></svg>
                  </button>
                  <button className="vp-icon-plain" onClick={() => adjustTime(10)} aria-label="+10s">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12,5V1L17,6l-5,5V7c-3.31,0-6,2.69-6,6s2.69,6,6,6s6-2.69,6-6H20c0,4.42-3.58,8-8,8s-8-3.58-8-8S7.58,5,12,5z M14.06,14.6l1.39-0.45l0.54,1.66L17.5,15.3l-1.83-5.38h-1.83L14.06,14.6z M13.54,12.33c0-0.34,0-0.61,0.08-0.8c0.08-0.2,0.21-0.33,0.4-0.4s0.41-0.11,0.65-0.1h0.2l0.29,1.1h-1.23 C13.85,12.86,13.54,12.69,13.54,12.33zM8.58,16.5H7.2v-6.6h1.63l1.5,1.1l-0.69,1.15l-0.87-0.65L8.58,16.5z"/></svg>
                  </button>
                  <div className="group hidden sm:flex items-center">
                    <button className="vp-icon-plain" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                      {isMuted ? <VolumeOffIcon /> : <VolumeOnIcon />}
                    </button>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={isMuted ? 0 : volume}
                      className="vp-vol-slider w-0 opacity-0 transition-all duration-300 group-hover:w-[70px] group-hover:opacity-100 group-hover:ml-2"
                      onChange={handleVolumeSlider}
                      aria-label="Volume"
                    />
                  </div>
                  <div className="text-xs font-semibold tabular-nums tracking-wide text-white drop-shadow-md">
                    {formatClock(currentTime)} <span className="mx-1 text-white/50">/</span> {formatClock(duration)}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3 sm:gap-5">
                  <span className="hidden rounded-md border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white sm:block">
                    {infoMeta.mode}
                  </span>
                  <button 
                    className="vp-icon-plain" 
                    onClick={() => setShowSettings(!showSettings)}
                    aria-label="Settings"
                  >
                    <SettingsIcon />
                  </button>
                  <button className="vp-icon-plain" onClick={openFullscreen} aria-label="Fullscreen">
                    <FullscreenIcon />
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ═══ INFO PANEL ═══ */}
        <div className="vp-info-panel">

          {/* Meta chips */}
          <div className="vp-scrollchips" style={{ marginBottom: 16 }}>
            <span className="vp-chip gold">{infoMeta.category}</span>
            <span className="vp-chip">{infoMeta.views}</span>
            <span className="vp-chip">{infoMeta.duration}</span>
            <span className="vp-chip">{infoMeta.date}</span>
          </div>

          {/* Title */}
          <h1 className="vp-title" style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: 'var(--text)', marginBottom: 10 }}>
            {video.title}
          </h1>

          {/* Desc */}
          <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--muted)', maxWidth: 720, marginBottom: 24 }}>
            {video.description}
          </p>

          <div className="vp-divider" style={{ marginBottom: 24 }} />

          {/* Reaction section */}
          <div className="vp-reaction-grid">
            {/* Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: '.05em', color: '#ffffff' }}>{likePercent}%</span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Positive</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {reactionTotal ? `${reactionTotal.toLocaleString()} reactions` : 'No reactions yet'}
                </span>
              </div>
              <div className="vp-bar-bg" style={{ height: 6, marginBottom: 10 }}>
                <div className="vp-bar-fill" style={{ width: `${likePercent}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)' }}>
                <span>{likes.toLocaleString()} likes</span>
                <span>{dislikes.toLocaleString()} dislikes</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="vp-btn-group">
              <button
                className={`vp-btn-primary${userReaction === 'like' ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}
                onClick={() => handleAction('like')}
                disabled={busyAction !== null}
                aria-label="Like"
              >
                <ThumbUpIcon />
                <span>{busyAction === 'like' ? '…' : likes.toLocaleString()}</span>
              </button>
              <button
                className={`vp-btn-ghost${userReaction === 'dislike' ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}
                onClick={() => handleAction('dislike')}
                disabled={busyAction !== null}
                aria-label="Dislike"
              >
                <ThumbDownIcon />
                <span>{busyAction === 'dislike' ? '…' : dislikes.toLocaleString()}</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          {video.tags.length > 0 && (
            <>
              <div className="vp-divider" style={{ margin: '20px 0 16px' }} />
              <div className="vp-scrollchips">
                {video.tags.map(tag => (
                  <span key={tag} className="vp-tag">#{tag}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}