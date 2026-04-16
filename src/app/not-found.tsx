import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface text-text">
      <Navbar />
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="animate-fade-up max-w-md space-y-6">
          <div className="space-y-3">
            <p className="text-7xl font-black text-[#4fb1ff]/30">404</p>
            <h1 className="text-3xl font-semibold text-white">Page not found</h1>
            <p className="text-sm leading-6 text-muted">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>
          <Link
            href="/"
            className="no-min-h inline-flex rounded-lg bg-[#114a70] border border-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a5b87]"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
