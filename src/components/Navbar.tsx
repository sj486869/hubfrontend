'use client';

import { useState, useEffect, Suspense, FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { clearAuthSession, getStoredRole } from '../lib/session';

function NavbarInner() {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile menu
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Close the mobile menu automatically when the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push('/search');
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // Desktop link styling
  const navLinkStyle = (href: string) => 
    `text-sm font-medium transition hover:text-white ${pathname === href ? 'text-white border-b-2 border-white pb-1' : 'text-gray-300'}`;

  // Mobile link styling
  const mobileNavLinkStyle = (href: string) => 
    `block px-4 py-3 text-base font-medium transition hover:bg-white/10 ${pathname === href ? 'text-white bg-white/5 border-l-4 border-white' : 'text-gray-300'}`;

  return (
    <header className="sticky top-0 z-50 bg-surface shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90">
          MyStream
        </Link>

        {/* Center: Desktop Search */}
        <form onSubmit={handleSearch} className="hidden w-full max-w-md px-6 md:block">
          <div className="flex h-9 w-full items-center overflow-hidden rounded-full bg-panel px-4 shadow-inner border border-white/10 focus-within:border-white/30">
            <span className="mr-2 text-gray-400">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
            />
          </div>
        </form>

        {/* Right: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className={navLinkStyle('/')}>Home</Link>
          <Link href="/categories" className={navLinkStyle('/categories')}>Categories</Link>
          <Link href="/search" className={navLinkStyle('/search')}>Trending</Link>
          
          {role ? (
            <div className="flex items-center gap-4 border-l border-white/10 pl-4">
              <Link href="/profile" className={navLinkStyle('/profile')}>Profile</Link>
              <button onClick={() => { clearAuthSession(); setRole(null); router.push('/'); }} className="text-sm font-medium text-gray-300 transition hover:text-white">
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 border-l border-white/10 pl-4">
              <Link href="/auth" className={navLinkStyle('/auth')}>Sign In</Link>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <button 
          className="md:hidden p-2 text-gray-300 hover:text-white focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-surface shadow-lg pb-3">
          {/* Mobile Search */}
          <div className="px-4 py-3">
            <form onSubmit={handleSearch} className="w-full">
              <div className="flex h-10 w-full items-center overflow-hidden rounded-full bg-panel px-4 shadow-inner border border-white/10 focus-within:border-white/30">
                <span className="mr-2 text-gray-400">🔍</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-gray-400"
                />
              </div>
            </form>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex flex-col">
            <Link href="/" className={mobileNavLinkStyle('/')}>Home</Link>
            <Link href="/categories" className={mobileNavLinkStyle('/categories')}>Categories</Link>
            <Link href="/search" className={mobileNavLinkStyle('/search')}>Trending</Link>
            
            <div className="my-2 border-t border-white/10"></div>
            
            {role ? (
              <>
                <Link href="/profile" className={mobileNavLinkStyle('/profile')}>Profile</Link>
                <button 
                  onClick={() => { clearAuthSession(); setRole(null); router.push('/'); }} 
                  className="block w-full text-left px-4 py-3 text-base font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link href="/auth" className={mobileNavLinkStyle('/auth')}>Sign In</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<header className="sticky top-0 z-50 h-16 bg-surface shadow-md" />}>
      <NavbarInner />
    </Suspense>
  );
}