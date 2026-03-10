import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthScreen } from '@/components/AuthScreen';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { LeadsProvider } from '@/contexts/LeadsContext';
import { ExecutivesProvider } from '@/contexts/ExecutivesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/contexts/LeadsContext';
import { useExecutives } from '@/contexts/ExecutivesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { TeamMemberHome } from '@/components/TeamMemberHome';
import { LeadsTable } from '@/components/LeadsTable';
import { DealPipeline } from '@/components/DealPipeline';
import { MeetingsCalendar } from '@/components/MeetingsCalendar';
import { BengaluruMap } from '@/components/BengaluruMap';
import { Reports } from '@/components/Reports';
import { Assignments } from '@/components/Assignments';
import { SettingsPage } from '@/components/SettingsPage';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { Bell, Search, Command } from 'lucide-react';
import type { AuthUser } from '@/api/auth';
import { cn } from '@/utils/cn';

type Page = 'dashboard' | 'leads' | 'pipeline' | 'calendar' | 'map' | 'reports' | 'assignments' | 'settings';

export function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf9]">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm text-stone-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!user.role) {
    return <OnboardingScreen />;
  }

  return (
    <ExecutivesProvider>
      <LeadsProvider>
        <NotificationsProvider>
          <AuthenticatedWorkspace user={user} onLogout={logout} />
        </NotificationsProvider>
      </LeadsProvider>
    </ExecutivesProvider>
  );
}

const pageLabels: Record<Page, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  pipeline: 'Deal Pipeline',
  calendar: 'Calendar',
  map: 'Bengaluru Map',
  reports: 'Reports',
  assignments: 'Assignments',
  settings: 'Settings',
};

function getPageLabel(page: Page, user: AuthUser) {
  if (user.role === 'team_member' && page === 'dashboard') return 'Home';
  if (user.role === 'team_member' && page === 'reports') return 'Analytics';
  if (user.role === 'team_member' && page === 'leads') return 'Leads Assigned';
  return pageLabels[page];
}

function AuthenticatedWorkspace({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const { leads } = useLeads();
  const { executives } = useExecutives();
  const { unreadCount } = useNotifications();
  const isTeamMember = user.role === 'team_member';
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  const allowedPages = useMemo<Page[]>(
    () =>
      user.role === 'admin'
        ? ['dashboard', 'leads', 'pipeline', 'calendar', 'map', 'reports', 'assignments', 'settings']
        : ['dashboard', 'leads', 'calendar', 'map', 'reports', 'settings'],
    [user.role]
  );

  useEffect(() => {
    if (!allowedPages.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [allowedPages, currentPage, user.role]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const pageResults = useMemo(
    () =>
      normalizedSearch
        ? allowedPages.filter((page) => getPageLabel(page, user).toLowerCase().includes(normalizedSearch))
        : [],
    [allowedPages, normalizedSearch, user]
  );

  const leadResults = useMemo(
    () =>
      normalizedSearch
        ? leads
            .filter((lead) =>
              [lead.name, lead.company, lead.email, lead.phone, lead.assignedTo, lead.id]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedSearch))
            )
            .slice(0, 5)
        : [],
    [leads, normalizedSearch]
  );

  const meetingResults = useMemo(
    () =>
      normalizedSearch
        ? leads
            .filter(
              (lead) =>
                lead.meetingAt &&
                [lead.name, lead.company, lead.meetingLocation]
                  .filter(Boolean)
                  .some((value) => value.toLowerCase().includes(normalizedSearch))
            )
            .slice(0, 4)
        : [],
    [leads, normalizedSearch]
  );

  const memberResults = useMemo(
    () =>
      normalizedSearch && user.role === 'admin'
        ? executives
            .filter((member) =>
              [member.name, member.email ?? ''].some((value) => value.toLowerCase().includes(normalizedSearch))
            )
            .slice(0, 4)
        : [],
    [executives, normalizedSearch, user.role]
  );

  function clearSearch() {
    setSearchQuery('');
  }

  function openLeadSearch(term: string) {
    setLeadSearch(term);
    setCurrentPage('leads');
    clearSearch();
  }

  function handleNotificationNavigate(page: string, search?: string) {
    setCurrentPage(page as Page);
    if (search) setLeadSearch(search);
    setNotificationsOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-[#fafaf9]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} user={user} onLogout={onLogout} />

      <main className={cn('flex-1', 'md:ml-[260px]', isTeamMember && 'pb-24 md:pb-0')}>
        <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-[#fafaf9]/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && normalizedSearch) {
                  openLeadSearch(searchQuery.trim());
                }
              }}
              placeholder="Search pages, leads, meetings..."
              className="w-full rounded-lg border border-stone-200/80 bg-white/80 py-2 pl-9 pr-12 text-[13px] text-stone-600 placeholder-stone-400 outline-none transition-all focus:border-stone-300 focus:ring-2 focus:ring-stone-100"
            />
            <div className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-400 sm:flex">
              <Command className="h-2.5 w-2.5" />K
            </div>

            {normalizedSearch && (
              <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-full max-w-[420px] rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xl shadow-stone-200/60">
                <div className="space-y-3">
                  {pageResults.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Pages</p>
                      <div className="mt-1 space-y-1">
                        {pageResults.map((page) => (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page);
                              clearSearch();
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                          >
                            <span>{getPageLabel(page, user)}</span>
                            <span className="text-[11px] text-stone-400">Open</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {leadResults.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Leads</p>
                      <div className="mt-1 space-y-1">
                        {leadResults.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => openLeadSearch(lead.name)}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-stone-50"
                          >
                            <div>
                              <p className="text-sm font-medium text-stone-800">{lead.name}</p>
                              <p className="text-[11px] text-stone-400">{lead.company}</p>
                            </div>
                            <span className="text-[11px] text-stone-400">{lead.stage}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {meetingResults.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Meetings</p>
                      <div className="mt-1 space-y-1">
                        {meetingResults.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => {
                              setCurrentPage('calendar');
                              clearSearch();
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-stone-50"
                          >
                            <div>
                              <p className="text-sm font-medium text-stone-800">{lead.name}</p>
                              <p className="text-[11px] text-stone-400">{lead.meetingLocation || 'Scheduled meeting'}</p>
                            </div>
                            <span className="text-[11px] text-stone-400">Calendar</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {memberResults.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Team Members</p>
                      <div className="mt-1 space-y-1">
                        {memberResults.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setCurrentPage('assignments');
                              clearSearch();
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-stone-50"
                          >
                            <div>
                              <p className="text-sm font-medium text-stone-800">{member.name}</p>
                              <p className="text-[11px] text-stone-400">{member.email || 'Team member'}</p>
                            </div>
                            <span className="text-[11px] text-stone-400">Team</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {pageResults.length === 0 && leadResults.length === 0 && meetingResults.length === 0 && memberResults.length === 0 && (
                    <div className="rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                      No results found for &quot;{searchQuery.trim()}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-between gap-3 sm:justify-end">
            <div className="relative">
              <button
                ref={bellRef}
                type="button"
                onClick={() => setNotificationsOpen((o) => !o)}
                className="relative rounded-lg p-2 text-stone-400 hover:bg-white hover:text-stone-600 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-[#fafaf9]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationsPanel
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                anchorRef={bellRef}
                onNavigate={handleNotificationNavigate}
                onItemClick={() => setNotificationsOpen(false)}
              />
            </div>
            <div className="h-5 w-px bg-stone-200" />
            <button
              type="button"
              onClick={() => setCurrentPage('settings')}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white transition-colors cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
                {user.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <span className="text-[13px] font-medium text-stone-700">{user.name}</span>
            </button>
          </div>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          {currentPage === 'dashboard' && (isTeamMember ? <TeamMemberHome onNavigate={setCurrentPage} onOpenLead={openLeadSearch} /> : <Dashboard />)}
          {currentPage === 'leads' && <LeadsTable externalSearch={leadSearch} />}
          {currentPage === 'pipeline' && <DealPipeline />}
          {currentPage === 'calendar' && <MeetingsCalendar />}
          {currentPage === 'map' && <BengaluruMap />}
          {currentPage === 'reports' && <Reports />}
          {currentPage === 'assignments' && <Assignments />}
          {currentPage === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}
