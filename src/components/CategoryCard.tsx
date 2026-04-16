import Link from 'next/link';
import Image from 'next/image';
import { PLACEHOLDER_IMAGE } from '../lib/constants';
import type { CategoryItem } from '../lib/types';

export default function CategoryCard({
  category,
  thumbnails,
}: {
  category: CategoryItem;
  thumbnails: string[];
}) {
  // Try to grab exactly 4 images for the collage, fallback to placeholder if not enough
  const collage = [...thumbnails, ...Array(4).fill(PLACEHOLDER_IMAGE)].slice(0, 4);

  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-card shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-glow"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden p-1">
        {/* Collage grid */}
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 rounded-lg overflow-hidden">
          {collage.map((src, i) => (
            <div key={i} className="relative h-full w-full bg-[#0a0f1d]">
              <Image
                src={src}
                alt={`${category.name} grid image ${i+1}`}
                fill
                sizes="(max-width: 640px) 45vw, 25vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-black/10 transition group-hover:bg-transparent" />
      </div>

      <div className="flex flex-col items-center justify-center space-y-1 p-4 pb-5 text-center">
        <h3 className="text-lg font-bold text-text transition group-hover:text-gray-200">
          {category.name}
        </h3>
        <p className="text-sm font-medium text-muted">
          {category.videoCount} videos
        </p>
      </div>
    </Link>
  );
}
