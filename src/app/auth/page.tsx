'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import { login, signup } from '../../lib/api';
import { setAuthSession } from '../../lib/session';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setIsError(false);
      setStatus(mode === 'login' ? 'Signing you in...' : 'Creating your account...');

      const result =
        mode === 'login'
          ? await login({ email, password })
          : await signup({ name, email, password });
      setAuthSession({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        role: result.role,
      });

      window.location.href = result.role === 'admin' ? '/admin' : '/profile';
    } catch (error) {
      console.error(error);
      setIsError(true);
      setStatus('Authentication failed. Double-check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
          {/* Form panel — always visible */}
          <section className="animate-fade-up rounded-2xl border border-white/10 bg-panel/95 p-5 shadow-glow sm:rounded-[28px] sm:p-8">
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-accent/90 sm:text-sm">Access</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                {mode === 'login' ? 'Welcome back' : 'Create your access'}
              </h1>
              <p className="text-sm leading-6 text-muted sm:leading-7">
                Sign in to continue watching, track your history, and react to videos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
              {mode === 'signup' && (
                <label className="block text-sm text-muted">
                  <span className="mb-1.5 block font-medium text-[#cbd5e1]">Full name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 sm:rounded-2xl"
                  />
                </label>
              )}
              <label className="block text-sm text-muted">
                <span className="mb-1.5 block font-medium text-[#cbd5e1]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 sm:rounded-2xl"
                />
              </label>
              <label className="block text-sm text-muted">
                <span className="mb-1.5 block font-medium text-[#cbd5e1]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 sm:rounded-2xl"
                />
              </label>

              {/* Status/error message */}
              {status && (
                <p className={`rounded-lg px-3 py-2 text-sm ${isError ? 'border border-red-500/20 bg-red-500/10 text-red-400' : 'text-muted'}`}>
                  {status}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="no-min-h w-full rounded-xl bg-[#114a70] border border-white/10 px-6 py-4 text-sm font-semibold text-white transition active:bg-[#1a5b87] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-lg sm:py-3 hover:bg-[#0b2031]"
              >
                {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
              <div className="flex items-center gap-2">
                <span>{mode === 'login' ? 'New to VibeStream?' : 'Already have an account?'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setStatus('');
                    setIsError(false);
                  }}
                  className="no-min-h font-semibold text-white transition hover:text-accent"
                >
                  {mode === 'login' ? 'Create account' : 'Sign in'}
                </button>
              </div>
            </div>
          </section>

          {/* Benefits panel — desktop only */}
          <section className="animate-fade-up hidden rounded-[28px] border border-white/10 bg-panel p-8 shadow-glow lg:block">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.35em] text-muted">Why sign in</p>
                <h2 className="text-3xl font-semibold text-white">A better, faster watch flow</h2>
                <p className="text-sm leading-7 text-muted">
                  Keep your profile in sync, preserve your watch history, jump back into streams, and manage uploads when you are signed in as admin.
                </p>
              </div>

              <div className="grid gap-4">
                {[
                  ['Watch history', 'Pick up exactly where you left off.'],
                  ['Secure access', 'Role-based routes stay protected across the app.'],
                  ['Admin tools', 'Upload, manage, and publish from one dashboard.'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-lg font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
