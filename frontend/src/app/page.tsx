import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import CategoryCard from '../components/CategoryCard';
import GridLayout from '../components/GridLayout';
import VideoGrid from '../components/VideoGrid';
import { fetchCategories, fetchVideos } from '../lib/api';

export const revalidate = 600; // Cache for 10 minutes

function formatViews(views: number) {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  }
  return `${views} views`;
}

export default async function HomePage() {
  const [categoriesData, videos] = await Promise.all([fetchCategories(), fetchVideos()]);

  return (
    <div className="min-h-screen bg-surface text-text">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Categories Section */}
        <section className="mb-12 space-y-6 animate-fade-up">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Categories</h2>
            </div>
            <Link
              href="/categories"
              className="text-sm font-semibold text-gray-300 hover:text-white"
            >
              View all
            </Link>
          </div>
          <GridLayout>
            {categoriesData.slice(0, 5).map((category) => {
              const thumbnails = videos
                .filter(
                  (video) =>
                    video.category.toLowerCase().replace(/\s+/g, '-') === category.slug ||
                    video.category.toLowerCase().includes(category.slug.split('-')[0]),
                )
                .slice(0, 4)
                .map((video) => video.thumbnail || 'https://via.placeholder.com/300x200');
              return <CategoryCard key={category.slug} category={category} thumbnails={thumbnails} />;
            })}
          </GridLayout>
        </section>

        {/* Video Grid Section */}
        <section className="space-y-6 animate-fade-up">
          <div className="flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Trending</h2>
            </div>
          </div>
          <VideoGrid videos={videos} />
        </section>

      </main>
    </div>
  );
}
