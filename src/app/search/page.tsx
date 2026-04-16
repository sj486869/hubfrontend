import Navbar from '../../components/Navbar';
import VideoGrid from '../../components/VideoGrid';
import { searchVideos } from '../../lib/api';

type Props = {
  searchParams: { q?: string };
};

const QUICK_SEARCHES = ['anime', 'action', 'romance', 'dubbed', 'featured'];

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: Props) {
  const query = (searchParams.q || '').trim();
  const videos = query ? await searchVideos(query) : [];

  return (
    <div className="min-h-screen bg-surface text-text">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <section className="animate-fade-up rounded-2xl border border-white/10 bg-panel/95 p-4 shadow-glow sm:rounded-[2rem] sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-muted">Search results</p>
              <h1 className="mt-1.5 text-2xl font-semibold text-white sm:mt-2 sm:text-4xl">
                {query ? `Results for "${query}"` : 'Search the library'}
              </h1>
              <p className="mt-1.5 text-xs text-muted sm:mt-3 sm:max-w-2xl sm:text-sm">
                Browse videos by title, description, category, or tags.
              </p>
            </div>

            <form action="/search" className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by name, tag, or category"
                className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:rounded-lg sm:py-3"
              />
              <button
                type="submit"
                className="no-min-h shrink-0 rounded-xl bg-[#114a70] border border-white/10 px-6 py-3.5 text-sm font-semibold text-white transition active:bg-[#1a5b87] sm:rounded-lg sm:py-3 sm:hover:bg-[#0b2031]"
              >
                Search
              </button>
            </form>

            {/* Quick search pills — horizontal scroll on mobile */}
            <div className="scroll-strip">
              {QUICK_SEARCHES.map((term) => (
                <a
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="no-min-h rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-muted transition active:border-white/50 sm:hover:border-white/50 sm:hover:text-white"
                >
                  {term}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="animate-fade-up mt-5 space-y-4 sm:mt-8 sm:space-y-5">
          {query ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-card/85 px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4">
              <p className="text-sm text-muted">
                <span className="font-semibold text-white">{videos.length}</span> result{videos.length === 1 ? '' : 's'} for{' '}
                <span className="font-semibold text-[#c4b5fd]">{query}</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
                Titles • Categories • Tags
              </p>
            </div>
          ) : null}

          {videos.length ? (
            <VideoGrid videos={videos} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-card/90 p-6 text-center text-sm text-muted sm:rounded-[2rem] sm:p-8">
              {query
                ? 'No results matched your search yet. Try a broader term or a different tag.'
                : 'Start typing a title, category, or tag to explore the catalog.'}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
