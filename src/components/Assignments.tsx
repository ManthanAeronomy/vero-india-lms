import { useState } from 'react';
import { useLeads } from '@/contexts/LeadsContext';
import { useExecutives } from '@/contexts/ExecutivesContext';
import { UserCheck, Settings, ArrowRight, Building2, MessageSquare, Phone, Globe, Zap, RefreshCw, CheckCircle2, AlertCircle, MapPin, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

const channelIcons: Record<string, React.ReactNode> = {
  IndiaMART: <Building2 className="h-3.5 w-3.5" />,
  WhatsApp: <MessageSquare className="h-3.5 w-3.5" />,
  JustDial: <Phone className="h-3.5 w-3.5" />,
  Website: <Globe className="h-3.5 w-3.5" />,
  website: <Globe className="h-3.5 w-3.5" />,
};

const channelColors: Record<string, string> = {
  IndiaMART: 'bg-indigo-50 text-indigo-600',
  WhatsApp: 'bg-emerald-50 text-emerald-600',
  JustDial: 'bg-amber-50 text-amber-600',
  Website: 'bg-sky-50 text-sky-600',
  website: 'bg-sky-50 text-sky-600',
};

export function Assignments() {
  const { leads } = useLeads();
  const { executives, loading: execLoading, error: execError } = useExecutives();
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'activity'>('overview');

  const unassignedLeads = leads.filter((l) => l.stage === 'New').length;

  const executivesWithStats = executives.map((exec) => {
    const execLeads = leads.filter((l) => l.assignedTo === exec.name);
    const activeLeads = execLeads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost').length;
    const closedDeals = execLeads.filter((l) => l.stage === 'Won').length;
    const revenue = execLeads.filter((l) => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
    const total = execLeads.filter((l) => l.stage === 'Won' || l.stage === 'Lost').length;
    const conversionRate = total > 0 ? Math.round((closedDeals / total) * 100) : 0;
    return { ...exec, activeLeads, closedDeals, revenue, conversionRate };
  });

  const recentAssignments = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((l) => ({
      lead: l.name,
      channel: (l.channel ? l.channel.charAt(0).toUpperCase() + l.channel.slice(1).toLowerCase() : 'Website') as 'IndiaMART' | 'WhatsApp' | 'JustDial' | 'Website',
      assignedTo: l.assignedTo,
      time: l.createdAt,
      auto: false,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Team & Assignments</h1>
          <p className="mt-1 text-sm text-stone-500">View platform team members and lead assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-600 hover:bg-stone-50 transition-colors">
            <Settings className="h-3.5 w-3.5" />
            Configure
          </button>
        </div>
      </div>

      {execError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{execError}</div>
      )}

      <div className="flex items-center gap-1 border-b border-stone-200">
        {(['overview', 'rules', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all capitalize',
              activeTab === tab ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Team Members</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-semibold text-stone-900">{executives.length}</p>
              <p className="mt-1 text-[11px] text-emerald-600 font-medium">Active in system</p>
            </div>
            <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Pending Assignment</p>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-semibold text-stone-900">{unassignedLeads}</p>
              <p className="mt-1 text-[11px] text-amber-600 font-medium">New leads</p>
            </div>
            <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Total Leads</p>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-3xl font-semibold text-stone-900">{leads.length}</p>
              <p className="mt-1 text-[11px] text-blue-600 font-medium">Across all channels</p>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/60 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Executive Workload</h3>
                <p className="text-xs text-stone-400 mt-0.5">Leads assigned and performance</p>
              </div>
              <button className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                <RefreshCw className="h-3 w-3" />
                Rebalance
              </button>
            </div>
            <div className="divide-y divide-stone-50">
              {execLoading ? (
                <div className="px-5 py-8 text-center text-sm text-stone-400">Loading...</div>
              ) : executivesWithStats.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-stone-400">
                  No team members yet. Ask a user to sign up and choose the Team member role.
                </div>
              ) : (
                executivesWithStats.map((exec) => {
                  const capacity = 20;
                  const load = (exec.activeLeads / capacity) * 100;
                  const loadColor = load > 75 ? 'bg-red-400' : load > 50 ? 'bg-amber-400' : 'bg-emerald-400';
                  const loadLabel = load > 75 ? 'High Load' : load > 50 ? 'Moderate' : 'Available';
                  const loadLabelColor = load > 75 ? 'text-red-600 bg-red-50' : load > 50 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';

                  return (
                    <div key={exec.id} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50/50 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 text-[12px] font-bold text-stone-600">
                        {exec.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="w-36">
                        <p className="text-[13px] font-medium text-stone-800">{exec.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-stone-400" />
                          <span className="text-[11px] text-stone-400">{exec.region}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-stone-500">
                            {exec.activeLeads} / {capacity} leads
                          </span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', loadLabelColor)}>{loadLabel}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-stone-100">
                          <div className={cn('h-2 rounded-full transition-all duration-500', loadColor)} style={{ width: `${Math.min(load, 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-center w-20">
                        <p className="text-[13px] font-semibold text-stone-800">{exec.conversionRate}%</p>
                        <p className="text-[10px] text-stone-400">Conversion</p>
                      </div>
                      <div className="text-center w-20">
                        <p className="text-[13px] font-semibold text-stone-800">{exec.closedDeals}</p>
                        <p className="text-[10px] text-stone-400">Deals Won</p>
                      </div>
                      <div className="text-right w-24">
                        <p className="text-[13px] font-semibold text-stone-800">{formatCurrency(exec.revenue)}</p>
                        <p className="text-[10px] text-stone-400">Revenue</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200/60 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Assignment Rules</h3>
                <p className="text-xs text-stone-400 mt-0.5">Configure how incoming leads are routed (coming soon)</p>
              </div>
              <div className="rounded-lg bg-stone-100 px-3 py-2 text-[12px] font-medium text-stone-500">
                Team members come from user signup
              </div>
            </div>
            <div className="px-5 py-12 text-center text-sm text-stone-400">No rules configured. Add rules to auto-assign leads by channel and region.</div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200/60 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-stone-900">Recent Assignments</h3>
              <p className="text-xs text-stone-400 mt-0.5">Leads and their assignees</p>
            </div>
            <div className="divide-y divide-stone-50">
              {recentAssignments.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-stone-400">No assignments yet. Add leads from the Leads page.</div>
              ) : (
                recentAssignments.map((a, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50/50 transition-colors">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', channelColors[a.channel] ?? channelColors['Website'])}>{channelIcons[a.channel] ?? channelIcons['Website']}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-stone-800">{a.lead}</p>
                        <ArrowRight className="h-3 w-3 text-stone-300" />
                        <p className="text-[13px] font-medium text-indigo-600">{a.assignedTo}</p>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">via {a.channel}</p>
                    </div>
                    <span className="text-[11px] text-stone-400 w-24 text-right">{a.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
