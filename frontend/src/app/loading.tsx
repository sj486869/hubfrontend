export default function Loading() {
  return (
    <div className="min-h-screen bg-surface px-4 py-10 text-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="animate-fade-up rounded-[28px] border border-white/10 bg-panel/90 p-8 shadow-glow">
          <div className="shimmer-surface h-4 w-28 rounded-full" />
          <div className="mt-5 shimmer-surface h-10 max-w-xl rounded-xl" />
          <div className="mt-4 shimmer-surface h-5 max-w-2xl rounded-lg" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_360px]">
          <div className="space-y-6">
            <div className="animate-fade-up overflow-hidden rounded-[28px] border border-white/10 bg-panel p-3 shadow-glow">
              <div className="shimmer-surface aspect-video rounded-[22px]" />
            </div>
            <div className="animate-fade-up rounded-[28px] border border-white/10 bg-panel/90 p-6 shadow-glow">
              <div className="shimmer-surface h-8 max-w-2xl rounded-xl" />
              <div className="mt-4 shimmer-surface h-4 max-w-3xl rounded-lg" />
              <div className="mt-2 shimmer-surface h-4 max-w-2xl rounded-lg" />
            </div>
          </div>

          <div className="animate-fade-up rounded-[28px] border border-white/10 bg-panel/90 p-6 shadow-glow">
            <div className="shimmer-surface h-6 w-36 rounded-lg" />
            <div className="mt-5 space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="shimmer-surface aspect-video rounded-xl" />
                  <div className="mt-3 shimmer-surface h-4 rounded-lg" />
                  <div className="mt-2 shimmer-surface h-4 w-3/4 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
