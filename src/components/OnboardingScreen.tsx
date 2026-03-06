import { useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

export function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [role, setRole] = useState<'admin' | 'team_member' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) {
      setError('Please choose your role to continue');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({ role });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your role');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafaf9] px-4 py-10">
      <div className="w-full max-w-2xl rounded-[32px] border border-stone-200/70 bg-white p-8 shadow-xl shadow-stone-200/40 sm:p-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-indigo-700">
            Welcome to Vero India
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Tell us your role</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            This helps us show the right workspace after account creation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-xl space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                id: 'admin' as const,
                title: 'Admin',
                description: 'Access the full admin dashboard, assignments, full CRM visibility, and settings.',
                icon: ShieldCheck,
              },
              {
                id: 'team_member' as const,
                title: 'Team member',
                description: 'See only leads assigned to you, your meetings calendar, and your analytics.',
                icon: Users,
              },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRole(option.id)}
                  className={cn(
                    'rounded-3xl border p-5 text-left transition-all',
                    role === option.id
                      ? 'border-stone-900 bg-stone-900 text-white shadow-lg shadow-stone-300/40'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                  )}
                >
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', role === option.id ? 'bg-white/10' : 'bg-stone-100')}>
                    <Icon className={cn('h-5 w-5', role === option.id ? 'text-white' : 'text-stone-600')} />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{option.title}</h2>
                  <p className={cn('mt-2 text-sm leading-6', role === option.id ? 'text-white/80' : 'text-stone-500')}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-stone-900 px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
