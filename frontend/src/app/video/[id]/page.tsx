import type { Metadata } from 'next';
import Navbar from '../../../components/Navbar';
import VideoDetailClient from '../../../components/VideoDetailClient';
import { fetchVideoById, fetchVideos } from '../../../lib/api';
import type { VideoItem } from '../../../lib/types';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const video = await fetchVideoById(params.id);
  return {
    title: `${video.title} | VibeStream`,
    description: video.description,
  };
}

export default async function VideoPage({ params }: Props) {
  const video = await fetchVideoById(params.id);
  const related = (await fetchVideos()).filter((item) => item.id !== video.id && item.category === video.category);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <VideoDetailClient video={video} related={related} />
      </main>
    </div>
  );
}
