'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PLACEHOLDER_IMAGE } from '../lib/constants';
import type { VideoItem } from '../lib/types';

function formatViews(views: number) {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${views}`;
}

export default function RelatedVideos({ videos, mobile = false }: { videos: VideoItem[]; mobile?: boolean }) {
  const containerClass = mobile
    ? "space-y-4 mt-6 border-t border-white/10 pt-6"
    : "animate-fade-up space-y-5 rounded-2xl bg-panel p-5 shadow-lg xl:sticky xl:top-24";

  return (
    <aside className={containerClass}>
      <div className="space-y-1 sm:space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Up next
        </p>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white sm:text-xl">More to watch</h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">
            {videos.length} clips
          </span>
        </div>
      </div>

      <div className={`space-y-3 ${mobile ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 sm:space-y-0" : ""}`}>
        {videos.length ? (
          videos.slice(0, 8).map((video) => (
            <Link
              key={video.id}
              href={`/video/${video.id}`}
              className="group flex gap-3 rounded-xl bg-card p-2 shadow-sm transition hover:bg-white/5 hover:shadow-md"
            >
              <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-[#0a0f1d] sm:w-36">
                <Image
                  src={video.thumbnail || PLACEHOLDER_IMAGE}
                  alt={video.title}
                  fill
                  sizes="144px"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {video.duration}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1">
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-gray-100 transition group-hover:text-white">
                  {video.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-gray-400">
                  <span>👁 {formatViews(video.views)}</span>
                  <span>•</span>
                  <span>{video.category}</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-gray-400">
            No related videos found in this category.
          </div>
        )}
      </div>
    </aside>
  );
}
