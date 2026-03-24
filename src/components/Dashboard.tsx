import { useMemo, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Users, IndianRupee, Target, Zap, Phone, MessageSquare, Building2, Globe, Download, Factory } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import type { DealStage } from '@/data/types';
import { useLeads } from '@/contexts/LeadsContext';
import { useExecutives } from '@/contexts/ExecutivesContext';
import { exportElementToPdf } from '@/utils/exportPdf';
import { ANALYTICS_CHANNELS, channelForAnalytics } from '@/utils/channelAnalytics';

const stageColors: Record<DealStage, string> = {
  New: '#94a3b8', Contacted: '#60a5fa', Qualified: '#a78bfa', Proposal: '#fb923c',
  Negotiation: '#fbbf24', Won: '#34d399', Lost: '#f87171',
};

const channelColors: Record<string, string> = {
  IndiaMART: '#6366f1',
  WhatsApp: '#22c55e',
  JustDial: '#f59e0b',
  Website: '#0ea5e9',
  website: '#0ea5e9',
  '3M': '#64748b',
};

const channelBgColors: Record<string, string> = {
  IndiaMART: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  WhatsApp: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  JustDial: 'bg-amber-50 text-amber-600 ring-amber-100',
  Website: 'bg-sky-50 text-sky-600 ring-sky-100',
  website: 'bg-sky-50 text-sky-600 ring-sky-100',
  '3M': 'bg-slate-50 text-slate-600 ring-slate-100',
};

const channelIcons: Record<string, React.ReactNode> = {
  IndiaMART: <Building2 className="h-3.5 w-3.5" />,
  WhatsApp: <MessageSquare className="h-3.5 w-3.5" />,
  JustDial: <Phone className="h-3.5 w-3.5" />,
  Website: <Globe className="h-3.5 w-3.5" />,
  website: <Globe className="h-3.5 w-3.5" />,
  '3M': <Factory className="h-3.5 w-3.5" />,
};

const channelLegendDot: Record<string, string> = {
  IndiaMART: 'bg-indigo-500',
  WhatsApp: 'bg-emerald-500',
  JustDial: 'bg-amber-500',
  Website: 'bg-sky-500',
  '3M': 'bg-slate-500',
};

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().slice(0, 10);
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function Dashboard() {
  const { leads } = useLeads();
  const { executives } = useExecutives();
  const [exportingSection, setExportingSection] = useState<string | null>(null);
  const acquisitionRef = useRef<HTMLDivElement | null>(null);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const revenueRef = useRef<HTMLDivElement | null>(null);
  const stagesRef = useRef<HTMLDivElement | null>(null);
  const recentLeadsRef = useRef<HTMLDivElement | null>(null);
  const topExecsRef = useRef<HTMLDivElement | null>(null);

  const totalRevenue = leads.filter((l) => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
  const totalLeads = leads.length;
  const wonDeals = leads.filter((l) => l.stage === 'Won').length;
  const conversionRate = totalLeads ? Math.round((wonDeals / totalLeads) * 100) : 0;
  const newLeads = leads.filter((l) => l.stage === 'New').length;

  const kpis = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), change: '', up: true, icon: IndianRupee, color: 'from-emerald-500 to-teal-600' },
    { label: 'Total Leads', value: totalLeads.toString(), change: '', up: true, icon: Users, color: 'from-blue-500 to-indigo-600' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, change: '', up: true, icon: Target, color: 'from-violet-500 to-purple-600' },
    { label: 'New Leads', value: newLeads.toString(), change: '', up: false, icon: Zap, color: 'from-orange-500 to-red-500' },
  ];

  const recentLeads = leads.slice(0, 5);
  const dealStageData = (['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as DealStage[]).map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
    value: leads.filter((l) => l.stage === stage).reduce((s, l) => s + l.value, 0),
    color: stageColors[stage],
  }));

  const weeklyData = useMemo(() => {
    const emptyChannels = () =>
      Object.fromEntries(ANALYTICS_CHANNELS.map((c) => [c, 0])) as Record<(typeof ANALYTICS_CHANNELS)[number], number>;
    const byWeek = new Map<string, ReturnType<typeof emptyChannels> & { converted: number; revenue: number }>();
    for (const l of leads) {
      const key = getWeekKey(l.createdAt);
      const curr = byWeek.get(key) ?? { ...emptyChannels(), converted: 0, revenue: 0 };
      const ck = channelForAnalytics(l.channel);
      if (ck) curr[ck] += 1;
      if (l.stage === 'Won') {
        curr.converted += 1;
        curr.revenue += l.value;
      }
      byWeek.set(key, curr);
    }
    const sorted = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-4);
    return sorted.map(([week, v]) => ({
      week: week.slice(5),
      ...Object.fromEntries(ANALYTICS_CHANNELS.map((c) => [c, v[c] ?? 0])),
      converted: v.converted,
      revenue: v.revenue,
    }));
  }, [leads]);

  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, { leads: number; converted: number; revenue: number }>();
    for (const l of leads) {
      const key = getMonthKey(l.createdAt);
      const curr = byMonth.get(key) ?? { leads: 0, converted: 0, revenue: 0 };
      curr.leads += 1;
      if (l.stage === 'Won') {
        curr.converted += 1;
        curr.revenue += l.value;
      }
      byMonth.set(key, curr);
    }
    const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return sorted.map(([ym, v]) => ({ month: monthNames[parseInt(ym.slice(5), 10) - 1] ?? ym, ...v }));
  }, [leads]);

  const channelPerformance = useMemo(() => {
    return ANALYTICS_CHANNELS.map((name) => {
      const chLeads = leads.filter((l) => channelForAnalytics(l.channel) === name);
      const converted = chLeads.filter((l) => l.stage === 'Won').length;
      const value = chLeads.filter((l) => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
      return { name, leads: chLeads.length, converted, value, color: channelColors[name] };
    });
  }, [leads]);

  const executivesWithStats = useMemo(() => {
    return executives.map((exec) => {
      const execLeads = leads.filter((l) => l.assignedTo === exec.name);
      const activeLeads = execLeads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost').length;
      const closedDeals = execLeads.filter((l) => l.stage === 'Won').length;
      const revenue = execLeads.filter((l) => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
      const total = execLeads.filter((l) => l.stage === 'Won' || l.stage === 'Lost').length;
      const conversionRate = total > 0 ? Math.round((closedDeals / total) * 100) : 0;
      const avatar = exec.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return { ...exec, avatar, activeLeads, closedDeals, revenue, conversionRate };
    });
  }, [executives, leads]);

  async function handleExport(sectionId: string, element: HTMLDivElement | null, filename: string, title: string) {
    if (!element) return;
    setExportingSection(sectionId);
    try {
      await exportElementToPdf(element, filename, title);
    } finally {
      setExportingSection(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">Overview of your lead pipeline and performance metrics.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="group relative overflow-hidden rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-stone-300/60">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wider text-stone-400">{kpi.label}</p>
                  <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-stone-900">{kpi.value}</p>
                  {kpi.change && (
                    <div className="mt-2.5 flex items-center gap-1">
                      {kpi.up ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-amber-500" />}
                      <span className={`text-[12px] font-medium ${kpi.up ? 'text-emerald-600' : 'text-amber-600'}`}>{kpi.change}</span>
                    </div>
                  )}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.color} text-white shadow-lg shadow-stone-200/50`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div ref={acquisitionRef} className="col-span-2 rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Lead Acquisition Trend</h3>
              <p className="text-xs text-stone-400 mt-0.5">Weekly breakdown by channel</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleExport('acquisition', acquisitionRef.current, 'lead-acquisition-trend.pdf', 'Lead Acquisition Trend')}
                className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
              >
                <Download className="h-3.5 w-3.5" />
                {exportingSection === 'acquisition' ? 'Exporting...' : 'PDF'}
              </button>
              {ANALYTICS_CHANNELS.map((ch) => (
                <div key={ch} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${channelLegendDot[ch] ?? 'bg-stone-400'}`} />
                  <span className="text-[11px] text-stone-500">{ch}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={
                weeklyData.length
                  ? weeklyData
                  : [{ week: '-', ...Object.fromEntries(ANALYTICS_CHANNELS.map((c) => [c, 0])) }]
              }
            >
              <defs>
                <linearGradient id="colorIM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorJD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="color3M" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e7e5e4', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Area type="monotone" dataKey="IndiaMART" stroke="#6366f1" strokeWidth={2} fill="url(#colorIM)" />
              <Area type="monotone" dataKey="WhatsApp" stroke="#22c55e" strokeWidth={2} fill="url(#colorWA)" />
              <Area type="monotone" dataKey="JustDial" stroke="#f59e0b" strokeWidth={2} fill="url(#colorJD)" />
              <Area type="monotone" dataKey="Website" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorWeb)" />
              <Area type="monotone" dataKey="3M" stroke="#64748b" strokeWidth={2} fill="url(#color3M)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div ref={splitRef} className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Channel Split</h3>
              <p className="text-xs text-stone-400 mt-0.5">Lead distribution by source</p>
            </div>
            <button
              onClick={() => handleExport('split', splitRef.current, 'channel-split.pdf', 'Channel Split')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'split' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <div className="mt-2 flex justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={channelPerformance.filter((c) => c.leads > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="leads"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {channelPerformance.filter((c) => c.leads > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e7e5e4' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-2.5">
            {channelPerformance.map((ch) => (
              <div key={ch.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md ring-1 ${channelBgColors[ch.name]}`}>{channelIcons[ch.name]}</div>
                  <span className="text-xs font-medium text-stone-700">{ch.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-stone-900">{ch.leads}</span>
                  <span className="text-[10px] text-stone-400 ml-1">leads</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div ref={revenueRef} className="col-span-2 rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Revenue Overview</h3>
              <p className="text-xs text-stone-400 mt-0.5">Monthly revenue trend</p>
            </div>
            <button
              onClick={() => handleExport('revenue', revenueRef.current, 'revenue-overview.pdf', 'Revenue Overview')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'revenue' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData.length ? monthlyData : [{ month: '-', revenue: 0 }]} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e7e5e4', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Revenue']} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div ref={stagesRef} className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Deal Stages</h3>
              <p className="text-xs text-stone-400 mt-0.5">Current pipeline distribution</p>
            </div>
            <button
              onClick={() => handleExport('stages', stagesRef.current, 'deal-stages.pdf', 'Deal Stages')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'stages' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <div className="mt-4 space-y-2.5">
            {dealStageData.map((stage) => {
              const maxCount = Math.max(...dealStageData.map((s) => s.count), 1);
              const pct = (stage.count / maxCount) * 100;
              return (
                <div key={stage.stage} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-stone-600">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-stone-900">{stage.count}</span>
                      <span className="text-[10px] text-stone-400">{formatCurrency(stage.value)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-100">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div ref={recentLeadsRef} className="col-span-2 rounded-xl border border-stone-200/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Recent Leads</h3>
              <p className="text-xs text-stone-400 mt-0.5">Latest incoming leads across all channels</p>
            </div>
            <button
              onClick={() => handleExport('recent', recentLeadsRef.current, 'recent-leads.pdf', 'Recent Leads')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'recent' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {recentLeads.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">No leads yet. Add your first lead from the Leads page.</div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50/50 transition-colors">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${channelBgColors[lead.channel] ?? channelBgColors['Website']}`}>{channelIcons[lead.channel] ?? channelIcons['Website']}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-stone-800 truncate">{lead.name}</p>
                      <span className="text-[11px] text-stone-400">•</span>
                      <span className="text-[11px] text-stone-400 truncate">{lead.company}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">{lead.notes || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-stone-800">{formatCurrency(lead.value)}</p>
                    <span
                      className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        lead.stage === 'New'
                          ? 'bg-stone-100 text-stone-600'
                          : lead.stage === 'Contacted'
                            ? 'bg-blue-50 text-blue-600'
                            : lead.stage === 'Qualified'
                              ? 'bg-violet-50 text-violet-600'
                              : lead.stage === 'Proposal'
                                ? 'bg-orange-50 text-orange-600'
                                : lead.stage === 'Negotiation'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : lead.stage === 'Won'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {lead.stage}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div ref={topExecsRef} className="rounded-xl border border-stone-200/60 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Top Executives</h3>
              <p className="text-xs text-stone-400 mt-0.5">By conversion rate</p>
            </div>
            <button
              onClick={() => handleExport('executives', topExecsRef.current, 'top-executives.pdf', 'Top Executives')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'executives' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {executivesWithStats.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">No team members yet. Add them in Assignments.</div>
            ) : (
              [...executivesWithStats]
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 5)
                .map((exec, i) => (
                  <div key={exec.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/50 transition-colors">
                    <span className="text-[11px] font-medium text-stone-300 w-3">{i + 1}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-stone-100 to-stone-200 text-[11px] font-semibold text-stone-600">
                      {exec.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-stone-800 truncate">{exec.name}</p>
                      <p className="text-[11px] text-stone-400">
                        {exec.region} • {exec.activeLeads} active
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-semibold text-emerald-600">{exec.conversionRate}%</p>
                      <p className="text-[10px] text-stone-400">{exec.closedDeals} deals</p>
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
