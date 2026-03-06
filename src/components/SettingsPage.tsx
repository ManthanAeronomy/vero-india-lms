import { useState } from 'react';
import { LockKeyhole, Mail, Save, ShieldCheck, User2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

type SettingsTab = 'profile' | 'account';

export function SettingsPage() {
  const { user, updateProfile, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profileState, setProfileState] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setProfileSubmitting(true);
    try {
      await updateProfile(profileState);
      setProfileMessage('Profile updated successfully')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get('currentPassword') ?? '');
    const newPassword = String(fd.get('newPassword') ?? '');
    const confirmPassword = String(fd.get('confirmPassword') ?? '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match')
      return
    }

    setPasswordSubmitting(true);
    try {
      await updatePassword({ currentPassword, newPassword })
      setPasswordMessage('Password updated successfully')
      e.currentTarget.reset()
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Settings</h1>
          <p className="mt-1 text-sm text-stone-500">Manage your profile and account security.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">{user.name}</p>
            <p className="text-xs text-stone-500">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-5">
        <div className="rounded-2xl border border-stone-200/70 bg-white p-3 shadow-sm">
          {[
            { id: 'profile' as SettingsTab, label: 'Profile', icon: User2 },
            { id: 'account' as SettingsTab, label: 'Account', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors',
                  activeTab === tab.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-5">
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-stone-900">Profile</h2>
                <p className="mt-1 text-sm text-stone-500">Update your display details for the platform.</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {profileError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{profileError}</div>}
                {profileMessage && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{profileMessage}</div>}

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Full Name</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                    <User2 className="h-4 w-4 text-stone-400" />
                    <input
                      value={profileState.name}
                      onChange={(e) => setProfileState((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Email Address</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                    <Mail className="h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      value={profileState.email}
                      onChange={(e) => setProfileState((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {profileSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-stone-900">Account Security</h2>
                <p className="mt-1 text-sm text-stone-500">Change your password and keep your account secure.</p>
              </div>

              <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Passwords are stored as hashes only
                </div>
                <p className="mt-1 text-xs text-stone-500">Your raw password is never stored in the database.</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {passwordError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{passwordError}</div>}
                {passwordMessage && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{passwordMessage}</div>}

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Current Password</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                    <LockKeyhole className="h-4 w-4 text-stone-400" />
                    <input name="currentPassword" type="password" className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">New Password</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                    <LockKeyhole className="h-4 w-4 text-stone-400" />
                    <input name="newPassword" type="password" className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Confirm New Password</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-3 shadow-sm">
                    <LockKeyhole className="h-4 w-4 text-stone-400" />
                    <input name="confirmPassword" type="password" className="w-full bg-transparent px-3 py-3.5 text-sm text-stone-700 outline-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {passwordSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
