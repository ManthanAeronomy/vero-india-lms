import { useState } from 'react';
import { LockKeyhole, Mail, User2, Zap } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

type AuthMode = 'login' | 'signup';

const desktopBackgroundImage = "url('/images/auth-bg.png')";
const panelBackgroundImage = "url('/images/auth-panel.png')";
const mobileBackgroundImage = "url('/images/auth-mobile.png')";

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const name = String(fd.get('name') ?? '').trim();
        if (!name) {
          setError('Name is required');
          return;
        }
        await signup({ name, email, password });
      } else {
        await login({ email, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-4 py-8">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: `${desktopBackgroundImage}, linear-gradient(135deg, #111827 0%, #0f172a 45%, #312e81 100%)` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.26),transparent_24%)]" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-white/8 shadow-2xl shadow-black/30 backdrop-blur-xl md:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden min-h-[720px] overflow-hidden p-10 text-white md:block">
          <div
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage: `${panelBackgroundImage}, linear-gradient(160deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.92) 50%, rgba(49,46,129,0.88) 100%)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-stone-950/80 via-stone-900/50 to-indigo-950/70" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">LeadFlow CRM</p>
                <p className="text-sm text-white/70">Sales pipeline, analytics, and team workflow</p>
              </div>
            </div>

            <div className="mt-20 space-y-6">
              <div>
                <p className="max-w-md text-4xl font-semibold leading-tight">
                  Welcome to LeadFlow.
                </p>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
                  Sign in or create your account to continue.
                </p>
              </div>

              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] font-medium text-white/85 backdrop-blur-sm">
                Secure CRM access
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center bg-gradient-to-br from-stone-100/95 via-white/92 to-stone-100/90 p-6 sm:p-10">
          <div
            className="absolute inset-x-0 top-0 h-36 bg-cover bg-center opacity-15 md:hidden"
            style={{ backgroundImage: `${mobileBackgroundImage}, linear-gradient(135deg, #312e81 0%, #0f172a 100%)` }}
          />

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="md:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white shadow-lg shadow-stone-900/20">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900">LeadFlow CRM</p>
                  <p className="text-sm text-stone-500">Secure CRM access</p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-7">
              <div className="flex items-center gap-1 rounded-2xl bg-stone-100 p-1.5">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={cn(
                    'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                    mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  )}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={cn(
                    'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                    mode === 'signup' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  )}
                >
                  Sign Up
                </button>
              </div>

              <div className="mt-6">
                <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-indigo-700">
                  {mode === 'login' ? 'Welcome Back' : 'Create Secure Account'}
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  {mode === 'login'
                    ? 'Sign in to access your CRM dashboard, leads, pipeline, and reports.'
                    : 'Create an account to save your name, email, and hashed password securely in MongoDB Atlas.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                    {error}
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Name</label>
                    <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                      <User2 className="h-4 w-4 text-stone-400" />
                      <input
                        name="name"
                        placeholder="Your full name"
                        className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none placeholder:text-stone-400"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Email</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                    <Mail className="h-4 w-4 text-stone-400" />
                    <input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none placeholder:text-stone-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Password</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                    <LockKeyhole className="h-4 w-4 text-stone-400" />
                    <input
                      name="password"
                      type="password"
                      placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none placeholder:text-stone-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-stone-900 px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
                >
                  {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-[12px] leading-5 text-stone-500">
                  Add your custom images in `public/images` using `auth-bg.jpg`, `auth-panel.jpg`, and `auth-mobile.jpg`.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
