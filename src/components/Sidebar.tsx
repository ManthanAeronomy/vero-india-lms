import { LayoutDashboard, Users, GitBranch, CalendarDays, BarChart3, UserCheck, Zap, ChevronDown, Map, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AuthUser } from '@/api/auth';

type Page = 'dashboard' | 'leads' | 'pipeline' | 'calendar' | 'map' | 'reports' | 'aihub' | 'assignments' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: AuthUser;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads' as Page, label: 'Leads', icon: Users },
  { id: 'pipeline' as Page, label: 'Deal Pipeline', icon: GitBranch },
  { id: 'calendar' as Page, label: 'Calendar', icon: CalendarDays },
  { id: 'map' as Page, label: 'Bengaluru Map', icon: Map },
  { id: 'reports' as Page, label: 'Reports', icon: BarChart3 },
  { id: 'aihub' as Page, label: 'AI Hub', icon: Sparkles },
  { id: 'assignments' as Page, label: 'Assignments', icon: UserCheck },
];

export function Sidebar({ currentPage, onNavigate, user, onLogout }: SidebarProps) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const visibleNavItems = navItems
    .filter((item) => user.role === 'admin' || ['dashboard', 'leads', 'calendar', 'map', 'reports', 'aihub'].includes(item.id))
    .map((item) => {
      if (user.role === 'team_member' && item.id === 'dashboard') {
        return { ...item, label: 'Home' }
      }
      if (user.role === 'team_member' && item.id === 'leads') {
        return { ...item, label: 'Leads Assigned' }
      }
      if (user.role === 'team_member' && item.id === 'reports') {
        return { ...item, label: 'Analytics' }
      }
      return item
    })

  const mobileNavItems = visibleNavItems

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-stone-200/80 bg-stone-50/80 backdrop-blur-sm md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-stone-900">LeadFlow</span>
        </div>

        <div className="mx-3 mb-1 mt-1">
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-100">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-600 text-[9px] font-bold text-white">
              LF
            </div>
            <span className="font-medium text-stone-700">LeadFlow Workspace</span>
            <ChevronDown className="ml-auto h-3 w-3" />
          </button>
        </div>

        <nav className="mt-3 flex-1 space-y-0.5 px-3">
          <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Main Menu
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white text-stone-900 shadow-sm shadow-stone-200/50 ring-1 ring-stone-200/60'
                    : 'text-stone-500 hover:bg-white/60 hover:text-stone-700'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-stone-700' : 'text-stone-400 group-hover:text-stone-500')} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-stone-200/80 px-3 py-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium text-stone-500 transition-all duration-150 hover:bg-white/60 hover:text-stone-700"
          >
            <Zap className="h-4 w-4 text-stone-400" />
            Logout
          </button>
          <div className="mt-3 flex items-center gap-2.5 px-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-[11px] font-semibold text-stone-600">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-stone-700">{user.name}</p>
              <p className="truncate text-[11px] text-stone-400">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {user.role === 'team_member' && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur md:hidden">
          <div className="grid grid-cols-4 gap-2">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors',
                    isActive ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
