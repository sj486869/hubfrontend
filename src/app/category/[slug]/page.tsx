import Image from 'next/image';
import Navbar from '../../../components/Navbar';
import VideoGrid from '../../../components/VideoGrid';
import { fetchCategories, fetchVideosByCategory } from '../../../lib/api';

type Props = {
  params: { slug: string };
};

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: Props) {
  const [videos, categories] = await Promise.all([
    fetchVideosByCategory(params.slug),
    fetchCategories(),
  ]);
  const category = categories.find((item) => item.slug === params.slug);
  const heroImage = category?.thumbnailUrl || videos[0]?.thumbnail || '';

  return (
    <div className="min-h-screen bg-surface text-text">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="animate-fade-up relative overflow-hidden rounded-[28px] border border-white/10 bg-panel/95 shadow-glow">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={category?.name || 'Category'}
              fill
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/82 to-[#020617]/45" />
          <div className="relative flex min-h-[280px] flex-col justify-end gap-5 p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted backdrop-blur-sm">
                Category
              </span>
              <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {videos.length} videos
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-white sm:text-5xl">
                {category?.name || 'Category'}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#d6e7f5]">
                Explore the newest releases, curated highlights, and long-form picks inside this collection.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 animate-fade-up">
          {videos.length ? (
            <VideoGrid videos={videos} />
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-card/90 p-8 text-center text-sm text-muted">
              This category is ready, but no videos have been published to it yet.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
