import Link from 'next/link';
import Image from 'next/image';
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

function formatDate(value: string) {
  if (!value) return 'Just added';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Just added';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function VideoCard({ video }: { video: VideoItem }) {
  const likePercent =
    video.likes + video.dislikes > 0
      ? Math.round((video.likes / (video.likes + video.dislikes)) * 100)
      : 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-md transition duration-300 hover:shadow-glow">
      <Link href={`/video/${video.id}`} className="block">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={video.thumbnail || 'https://via.placeholder.com/300x200'}
            alt={video.title}
            fill
            sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 26vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition duration-300 group-hover:opacity-100" />
          
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2">
            <div className="flex items-center gap-1.5 px-1 pb-0.5">
              <span className="text-[13px]">👁</span>
              <span className="text-[11px] font-semibold text-white drop-shadow-md">
                {formatViews(video.views)}
              </span>
            </div>
            <div className="flex items-center gap-1 px-1 pb-0.5">
              <span className="text-[11px] font-bold text-white drop-shadow-md">
                {likePercent}%
              </span>
              <span className="text-[13px] text-yellow-400 drop-shadow-md">⭐</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link href={`/video/${video.id}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-5 text-text transition group-hover:text-gray-300">
            {video.title}
          </h3>
        </Link>
      </div>
    </article>
  );
}
