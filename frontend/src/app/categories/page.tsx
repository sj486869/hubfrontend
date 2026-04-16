import Navbar from '../../components/Navbar';
import CategoryCard from '../../components/CategoryCard';
import GridLayout from '../../components/GridLayout';
import { fetchCategories, fetchVideos } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const [categories, videos] = await Promise.all([fetchCategories(), fetchVideos()]);

  const categoryCards = categories.map((category) => {
    const thumbnails = videos
      .filter(
        (video) =>
          video.category.toLowerCase().replace(/\s+/g, '-') === category.slug ||
          video.category.toLowerCase().includes(category.slug.split('-')[0]),
      )
      .slice(0, 4)
      .map((video) => video.thumbnail || 'https://via.placeholder.com/300x200');

    return <CategoryCard key={category.slug} category={category} thumbnails={thumbnails} />;
  });

  return (
    <div className="min-h-screen bg-surface text-text">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">All Categories</h1>
          </div>
          <div className="text-sm font-semibold text-gray-300">
            {categories.length} Collections
          </div>
        </div>

        <section className="animate-fade-up">
          <GridLayout>{categoryCards}</GridLayout>
        </section>

      </main>
    </div>
  );
}
