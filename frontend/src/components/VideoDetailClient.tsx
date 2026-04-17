'use client';

import { useEffect, useState } from 'react';
import type { VideoItem } from '../lib/types';
import { getStoredAccessToken } from '../lib/session';
import { trackWatchHistory } from '../lib/api';
import VideoPlayer from './VideoPlayer';
import CommentSection from './CommentSection';
import RelatedVideos from './RelatedVideos';

export default function VideoDetailClient({ video, related }: { video: VideoItem; related: VideoItem[] }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = getStoredAccessToken();
    setToken(savedToken);
    if (savedToken) {
      trackWatchHistory(savedToken, video.id).catch(() => {});
    }
  }, [video.id]);

  return (
    <div className="space-y-4 sm:space-y-6 xl:space-y-0 xl:grid xl:gap-6 xl:grid-cols-[minmax(0,1.85fr)_360px]">
      {/* Main column: video player always shown */}
      <section className="animate-fade-up space-y-4 sm:space-y-6">
        <VideoPlayer video={video} token={token} />
        <CommentSection videoId={video.id} comments={video.comments || []} token={token} />
      </section>

      {/* Desktop sidebar: related videos */}
      <aside className="hidden xl:block">
        <RelatedVideos videos={related} />
      </aside>

      {/* Mobile: related videos below the player */}
      <div className="block xl:hidden">
        <RelatedVideos videos={related} mobile={true} />
      </div>
    </div>
  );
}
