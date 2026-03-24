import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';

import { useLeads } from '@/contexts/LeadsContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDayKey(date: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
}

function formatMeetingTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function MeetingsCalendar() {
  const { leads } = useLeads();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  const scheduledLeads = useMemo(
    () => {
      const base = leads.filter((lead) => lead.meetingAt);
      const scoped =
        user?.role === 'team_member'
          ? base.filter((lead) => lead.assignedTo === user.name)
          : base;
      return scoped.sort((a, b) => new Date(a.meetingAt).getTime() - new Date(b.meetingAt).getTime());
    },
    [leads, user]
  );

  const meetingsByDay = useMemo(() => {
    return scheduledLeads.reduce<Record<string, typeof scheduledLeads>>((acc, lead) => {
      const key = getDayKey(new Date(lead.meetingAt));
      acc[key] = [...(acc[key] ?? []), lead];
      return acc;
    }, {});
  }, [scheduledLeads]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    const gridEnd = addDays(monthEnd, 6 - monthEnd.getDay());

    const result: Date[] = [];
    for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
      result.push(new Date(cursor));
    }
    return result;
  }, [currentMonth]);

  const upcomingMeetings = scheduledLeads.filter((lead) => new Date(lead.meetingAt) >= new Date()).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Meetings Calendar</h1>
          <p className="mt-1 text-sm text-stone-500">Scheduled meetings linked to your leads.</p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-1 shadow-sm sm:justify-start">
          <button
            onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-0 flex-1 text-center text-sm font-medium text-stone-800 sm:min-w-[180px] sm:flex-none">{formatMonthLabel(currentMonth)}</span>
          <button
            onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <div className="min-w-[700px]">
          <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/70">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = getDayKey(day);
              const entries = meetingsByDay[key] ?? [];
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = getDayKey(day) === getDayKey(new Date());

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[150px] border-b border-r border-stone-100 p-3',
                    !isCurrentMonth && 'bg-stone-50/50 text-stone-300'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                        isToday ? 'bg-stone-900 text-white' : 'text-stone-700'
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {entries.length > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        {entries.length} meeting{entries.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {entries.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-2.5 py-2">
                        <p className="text-[11px] font-semibold text-stone-800">{lead.name}</p>
                        <p className="mt-0.5 text-[10px] text-stone-500">{lead.company}</p>
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-700">
                          <Clock3 className="h-3 w-3" />
                          <span>{formatMeetingTime(lead.meetingAt)}</span>
                        </div>
                      </div>
                    ))}
                    {entries.length > 3 && (
                      <p className="text-[10px] font-medium text-stone-400">+{entries.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900">Upcoming Meetings</h2>
          </div>

          <div className="mt-4 space-y-3">
            {upcomingMeetings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                No scheduled meetings yet. Add a meeting date and time from the Leads form.
              </div>
            ) : (
              upcomingMeetings.map((lead) => (
                <div key={lead.id} className="rounded-xl border border-stone-200/70 bg-stone-50/70 p-3">
                  <p className="text-sm font-semibold text-stone-800">{lead.name}</p>
                  <p className="mt-0.5 text-[12px] text-stone-500">{lead.company}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-600">
                    <Clock3 className="h-3.5 w-3.5 text-stone-400" />
                    <span>
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lead.meetingAt))}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-stone-600">
                    <MapPin className="h-3.5 w-3.5 text-stone-400" />
                    <span>
                      {lead.meetingSiteVisit?.address
                        ? `${lead.meetingSiteVisit.address}${lead.meetingSiteVisit.postalCode ? ` (${lead.meetingSiteVisit.postalCode})` : ''}`
                        : lead.meetingLocation || 'Location not added'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
