import type { VideoItem } from '../lib/types';
import VideoCard from './VideoCard';

export default function VideoGrid({ videos }: { videos: VideoItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {videos.map((video, index) => (
        <VideoCard key={video.id} video={video} priority={index < 5} />
      ))}
    </div>
  );
}
