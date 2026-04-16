'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import VideoGrid from '../../components/VideoGrid';
import { fetchProfile, fetchVideos } from '../../lib/api';
import { clearAuthSession, getStoredAccessToken } from '../../lib/session';
import type { UserProfile, VideoItem } from '../../lib/types';

function resolveVideos(ids: string[], videos: VideoItem[]) {
  return ids
    .map((id) => videos.find((video) => video.id === id))
    .filter((video): video is VideoItem => Boolean(video));
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [status, setStatus] = useState('Loading your profile...');

  useEffect(() => {
    const saved = getStoredAccessToken();
    if (!saved) {
      setStatus('Sign in to unlock watch history, likes, and personalized shortcuts.');
      return;
    }

    Promise.all([fetchProfile(saved), fetchVideos()])
      .then(([profileData, allVideos]) => {
        setProfile(profileData);
        setVideos(allVideos);
        setStatus('');
      })
      .catch(() => {
        clearAuthSession();
        setProfile(null);
        setStatus('We could not load your session. Please sign in again.');
      });
  }, []);

  const watchHistory = useMemo(
    () => (profile ? resolveVideos(profile.watchHistory, videos) : []),
    [profile, videos],
  );

  const likedVideos = useMemo(
    () => (profile ? resolveVideos(profile.likedVideos, videos) : []),
    [profile, videos],
  );

  const recommendedVideos = useMemo(() => {
    const seen = new Set([...(profile?.watchHistory || []), ...(profile?.likedVideos || [])]);
    return videos.filter((video) => !seen.has(video.id)).slice(0, 4);
  }, [profile, videos]);

  const isSignedIn = Boolean(profile);
  const heroMessage = isSignedIn
    ? 'Track what you watched, keep your favorites close, and jump back into the best part of your library.'
    : status;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="space-y-4 sm:space-y-8">
          <section className="surface-grid animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-panel/95 shadow-glow sm:rounded-[28px]">
            <div className="grid gap-4 p-4 sm:gap-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_340px] lg:items-end">
              <div className="space-y-4">
                <span className="inline-flex rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white sm:text-[11px]">
                  Profile
                </span>
                <div className="space-y-2 sm:space-y-3">
                  <h1 className="max-w-3xl text-2xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                    {profile ? `Welcome back, ${profile.name}` : 'Your VibeStream account'}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-[#d4e8f8] sm:leading-7">{heroMessage}</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                  {profile ? (
                    <>
                      <Link
                        href={watchHistory[0] ? `/video/${watchHistory[0].id}` : '/categories'}
                        className="no-min-h w-full rounded-lg bg-[#114a70] border border-white/10 px-5 py-3.5 text-center text-sm font-semibold text-white transition active:opacity-90 sm:w-auto sm:py-3 hover:bg-[#1a5b87]"
                      >
                        {watchHistory[0] ? 'Resume watching' : 'Start watching'}
                      </Link>
                      {profile.role === 'admin' ? (
                        <Link
                        href="/admin"
                        className="no-min-h w-full rounded-lg border border-white/15 bg-black/20 px-5 py-3.5 text-center text-sm font-semibold text-white transition active:bg-black/40 sm:w-auto sm:py-3 hover:border-white/40 hover:bg-black/30"
                      >
                        Open admin dashboard
                      </Link>
                      ) : (
                        <Link
                        href="/categories"
                        className="no-min-h w-full rounded-lg border border-white/15 bg-black/20 px-5 py-3.5 text-center text-sm font-semibold text-white transition active:bg-black/40 sm:w-auto sm:py-3 hover:border-white/40 hover:bg-black/30"
                      >
                        Browse categories
                      </Link>
                      )}
                    </>
                  ) : (
                    <Link
                      href="/auth"
                      className="no-min-h w-full rounded-lg border border-white/10 bg-[#114a70] px-5 py-3.5 text-center text-sm font-semibold text-white transition active:opacity-90 sm:w-auto sm:py-3 hover:bg-[#1a5b87]"
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
                {[
                  ['Role', profile?.role || 'Guest'],
                  ['History', String(profile?.watchHistory.length ?? 0)],
                  ['Liked', String(profile?.likedVideos.length ?? 0)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="hover-lift rounded-xl border border-white/10 bg-black/20 px-3 py-3 sm:rounded-2xl sm:px-5 sm:py-4"
                  >
                    <p className="text-[9px] uppercase tracking-[0.26em] text-muted sm:text-xs">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-white sm:mt-2 sm:text-2xl">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="animate-fade-up rounded-[28px] border border-white/10 bg-panel/95 p-6 shadow-glow">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-muted">Watch history</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Pick up where you left off</h2>
                </div>
                <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-muted">
                  {watchHistory.length} saved
                </span>
              </div>

              <div className="mt-6">
                {watchHistory.length ? (
                  <VideoGrid videos={watchHistory} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-8 text-center text-sm text-muted">
                    No watch history yet. Open any video and we will keep this shelf updated.
                  </div>
                )}
              </div>
            </div>

            <aside className="animate-slide-in space-y-4 rounded-[28px] border border-white/10 bg-panel/95 p-6 shadow-glow">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.3em] text-muted">Account summary</p>
                <h2 className="text-2xl font-semibold text-white">Everything in one place</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-muted">Name</p>
                  <p className="mt-2 text-lg font-semibold text-white">{profile?.name || 'Guest'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-muted">Email</p>
                  <p className="mt-2 break-all text-lg font-semibold text-white">
                    {profile?.email || 'Not signed in'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-muted">Next step</p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    {profile?.role === 'admin'
                      ? 'Publish new videos or update categories from the admin dashboard.'
                      : 'Use likes and watch history to build your own personal library.'}
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="animate-fade-up rounded-[28px] border border-white/10 bg-panel/95 p-6 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-muted">Favorites</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Videos you liked</h2>
              </div>
              <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-muted">
                {likedVideos.length} saved
              </span>
            </div>

            <div className="mt-6">
              {likedVideos.length ? (
                <VideoGrid videos={likedVideos} />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-8 text-center text-sm text-muted">
                  Nothing here yet. Use the like button on any video page to build this shelf.
                </div>
              )}
            </div>
          </section>

          {!likedVideos.length && recommendedVideos.length ? (
            <section className="animate-fade-up rounded-[28px] border border-white/10 bg-panel/95 p-6 shadow-glow">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-muted">Recommended</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">A few picks to get started</h2>
                </div>
                <Link
                  href="/search"
                  className="rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-black/30"
                >
                  Explore more
                </Link>
              </div>
              <div className="mt-6">
                <VideoGrid videos={recommendedVideos} />
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
