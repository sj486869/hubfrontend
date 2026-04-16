import Link from 'next/link';
import type { Category } from '../lib/constants';

export default function Sidebar({ categories }: { categories: Category[] }) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-panel p-6 shadow-glow">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Categories</h2>
        <p className="mt-2 text-sm text-muted">Browse curated collections in a clean grid.</p>
      </div>
      <div className="space-y-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="block rounded-3xl border border-white/10 bg-card/80 px-4 py-3 text-sm text-white transition duration-200 hover:border-[#80c7ff]/70 hover:bg-[#0b2f4a]"
          >
            <div className="flex items-center justify-between gap-2">
              <span>{category.name}</span>
              <span className="text-xs text-muted">{category.videoCount}</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
