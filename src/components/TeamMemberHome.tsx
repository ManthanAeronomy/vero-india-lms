import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, MapPin, Target, Users } from 'lucide-react';

import type { DealStage } from '@/data/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/contexts/LeadsContext';
import { cn } from '@/utils/cn';

type HomePage = 'dashboard' | 'leads' | 'calendar' | 'reports' | 'settings';

const followUpStorageKey = 'leadflow-meeting-followups';
const quickStages: DealStage[] = ['Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

function readDismissedFollowUps() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(followUpStorageKey) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeDismissedFollowUps(value: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(followUpStorageKey, JSON.stringify(value));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatMeetingDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRelativeMeetingTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes <= 0) return 'Starting now';
  if (diffMinutes < 60) return `Starts in ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Starts in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;

  const diffDays = Math.round(diffHours / 24);
  return `Starts in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

export function TeamMemberHome({
  onNavigate,
  onOpenLead,
}: {
  onNavigate: (page: HomePage) => void;
  onOpenLead: (term: string) => void;
}) {
  const { user } = useAuth();
  const { leads, updateLead } = useLeads();
  const [dismissingMap, setDismissingMap] = useState<Record<string, boolean>>(() => readDismissedFollowUps());
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const now = currentTime;
  const assignedLeads = leads;
  const activeLeads = assignedLeads.filter((lead) => !['Won', 'Lost'].includes(lead.stage));
  const upcomingMeetings = assignedLeads
    .filter((lead) => lead.meetingAt && new Date(lead.meetingAt).getTime() > now)
    .sort((a, b) => new Date(a.meetingAt).getTime() - new Date(b.meetingAt).getTime());

  const nextMeeting = upcomingMeetings[0] ?? null;

  const followUpLead = useMemo(
    () =>
      assignedLeads
        .filter((lead) => {
          if (!lead.meetingAt) return false;
          const meetingTime = new Date(lead.meetingAt).getTime();
          const promptKey = `${lead.id}:${lead.meetingAt}`;
          return now >= meetingTime + 10 * 60 * 1000 && !dismissingMap[promptKey];
        })
        .sort((a, b) => new Date(b.meetingAt).getTime() - new Date(a.meetingAt).getTime())[0] ?? null,
    [assignedLeads, dismissingMap, now]
  );

  async function markFollowUpDone(leadId: string, meetingAt: string, stage: DealStage) {
    const promptKey = `${leadId}:${meetingAt}`;
    setUpdatingLeadId(leadId);
    setUpdateError(null);
    try {
      await updateLead(leadId, { stage });
      const nextMap = { ...dismissingMap, [promptKey]: true };
      setDismissingMap(nextMap);
      writeDismissedFollowUps(nextMap);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update lead status');
    } finally {
      setUpdatingLeadId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-stone-200/70 bg-white px-5 py-6 shadow-sm">
        <p className="text-sm font-medium text-indigo-600">{getGreeting()}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Here is a quick snapshot of your assigned leads and today&apos;s meetings.
        </p>
      </div>

      {nextMeeting && (
        <div className="mx-auto max-w-3xl rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 px-5 py-6 text-white shadow-lg">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Upcoming Meeting</p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{nextMeeting.name}</h2>
            <p className="mt-2 text-sm text-white/80">{nextMeeting.company}</p>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 text-sm text-white/90 sm:flex-row sm:gap-4">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {formatMeetingDateTime(nextMeeting.meetingAt)}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-white/50 sm:block" />
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {nextMeeting.meetingLocation || 'Location not added'}
              </span>
            </div>
            <p className="mt-4 text-base font-medium text-white">{formatRelativeMeetingTime(nextMeeting.meetingAt)}</p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => onNavigate('calendar')}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
              >
                Open Calendar
              </button>
              <button
                onClick={() => onOpenLead(nextMeeting.name)}
                className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {followUpLead && (
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 px-5 py-6 shadow-sm">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">Meeting Follow-up</p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-900 sm:text-3xl">How did the meeting go?</h2>
            <p className="mt-2 text-sm text-stone-600">
              Your meeting with <span className="font-semibold text-stone-800">{followUpLead.name}</span> has passed.
              Update the lead status here.
            </p>
            <p className="mt-2 text-sm text-stone-500">{formatMeetingDateTime(followUpLead.meetingAt)}</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {quickStages.map((stage) => (
                <button
                  key={stage}
                  onClick={() => markFollowUpDone(followUpLead.id, followUpLead.meetingAt, stage)}
                  disabled={updatingLeadId === followUpLead.id}
                  className={cn(
                    'rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-amber-100',
                    updatingLeadId === followUpLead.id && 'cursor-not-allowed opacity-60'
                  )}
                >
                  {stage}
                </button>
              ))}
            </div>
            {updateError && <p className="mt-3 text-sm text-red-600">{updateError}</p>}
            <button
              onClick={() => onOpenLead(followUpLead.name)}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-700"
            >
              Open full lead details
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Assigned Leads</p>
            <Users className="h-4 w-4 text-stone-300" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-stone-900">{assignedLeads.length}</p>
          <button onClick={() => onNavigate('leads')} className="mt-4 text-sm font-medium text-indigo-600">
            View all assigned leads
          </button>
        </div>

        <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Active Pipeline</p>
            <Target className="h-4 w-4 text-stone-300" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-stone-900">{activeLeads.length}</p>
          <p className="mt-2 text-sm text-stone-500">Leads still in progress and waiting for follow-up.</p>
        </div>

        <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Upcoming Meetings</p>
            <CalendarClock className="h-4 w-4 text-stone-300" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-stone-900">{upcomingMeetings.length}</p>
          <button onClick={() => onNavigate('calendar')} className="mt-4 text-sm font-medium text-indigo-600">
            Open your calendar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Upcoming Meetings</h3>
              <p className="mt-0.5 text-xs text-stone-400">Your next scheduled conversations</p>
            </div>
            <button onClick={() => onNavigate('calendar')} className="text-sm font-medium text-indigo-600">
              Calendar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {upcomingMeetings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                No upcoming meetings right now.
              </div>
            ) : (
              upcomingMeetings.slice(0, 4).map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => onOpenLead(lead.name)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-stone-200/70 bg-stone-50/80 px-4 py-3 text-left transition-colors hover:bg-stone-100"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-800">{lead.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-stone-500">{lead.company}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-600">
                      <Clock3 className="h-3.5 w-3.5 text-stone-400" />
                      <span>{formatMeetingDateTime(lead.meetingAt)}</span>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Assigned Leads</h3>
              <p className="mt-0.5 text-xs text-stone-400">Latest leads you own</p>
            </div>
            <button onClick={() => onNavigate('leads')} className="text-sm font-medium text-indigo-600">
              Leads
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {assignedLeads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                No leads assigned yet.
              </div>
            ) : (
              assignedLeads.slice(0, 5).map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => onOpenLead(lead.name)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-left transition-colors hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-800">{lead.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-stone-500">{lead.company}</p>
                    <p className="mt-1 text-[12px] text-stone-400">Status: {lead.stage}</p>
                  </div>
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-stone-300" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
