import { useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Calendar, Download, TrendingUp, TrendingDown, Target, Users, IndianRupee, Percent } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/contexts/LeadsContext';
import { useExecutives } from '@/contexts/ExecutivesContext';
import { exportElementToPdf } from '@/utils/exportPdf';

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

export function Reports() {
  const { user } = useAuth();
  const { leads } = useLeads();
  const { executives } = useExecutives();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [exportingSection, setExportingSection] = useState<string | null>(null);
  const isTeamMember = user?.role === 'team_member';
  const trendRef = useRef<HTMLDivElement | null>(null);
  const revenueRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<HTMLDivElement | null>(null);
  const teamRef = useRef<HTMLDivElement | null>(null);

  const weeklyData = useMemo(() => {
    const byWeek = new Map<string, { IndiaMART: number; WhatsApp: number; JustDial: number; Website: number; converted: number; revenue: number }>();
    for (const l of leads) {
      const key = getWeekKey(l.createdAt);
      const curr = byWeek.get(key) ?? { IndiaMART: 0, WhatsApp: 0, JustDial: 0, Website: 0, converted: 0, revenue: 0 };
      const chKey = (l.channel?.charAt(0)?.toUpperCase() ?? '') + (l.channel?.slice(1)?.toLowerCase() ?? '');
      curr[chKey as keyof typeof curr] = ((curr[chKey as keyof typeof curr] as number) ?? 0) + 1;
      if (l.stage === 'Won') {
        curr.converted += 1;
        curr.revenue += l.value;
      }
      byWeek.set(key, curr);
    }
    const sorted = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-4);
    return sorted.map(([week, v]) => ({ week: week.slice(5), IndiaMART: v.IndiaMART ?? 0, WhatsApp: v.WhatsApp ?? 0, JustDial: v.JustDial ?? 0, Website: v.Website ?? 0, converted: v.converted, revenue: v.revenue }));
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

  const channelColors: Record<string, string> = { IndiaMART: '#6366f1', WhatsApp: '#22c55e', JustDial: '#f59e0b', Website: '#0ea5e9' };
  const channelPerformance = useMemo(() => {
    const chs = ['IndiaMART', 'WhatsApp', 'JustDial', 'Website'] as const;
    return chs.map((name) => {
      const chLeads = leads.filter((l) => (l.channel?.toLowerCase?.() ?? l.channel) === name.toLowerCase());
      const converted = chLeads.filter((l) => l.stage === 'Won').length;
      const value = chLeads.filter((l) => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
      return { name, leads: chLeads.length, converted, value, color: channelColors[name] ?? '#0ea5e9' };
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
      return {
        name: exec.name.split(' ')[0],
        conversion: conversionRate,
        leads: Math.min(activeLeads * 5, 100),
        revenue: Math.min(revenue / 40000, 100),
        deals: Math.min(closedDeals * 2, 100),
      };
    });
  }, [executives, leads]);

  const weeklyMetrics = useMemo(() => {
    const newLeads = leads.length;
    const converted = leads.filter((l) => l.stage === 'Won').length;
    const revenue = leads.filter((l) => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
    const avgDeal = converted > 0 ? revenue / converted : 0;
    return [
      { label: 'New Leads', value: newLeads.toString(), change: '', up: true, icon: Users },
      { label: 'Conversions', value: converted.toString(), change: '', up: true, icon: Target },
      { label: 'Revenue', value: formatCurrency(revenue), change: '', up: true, icon: IndianRupee },
      { label: 'Avg Deal Size', value: formatCurrency(avgDeal), change: '', up: true, icon: Percent },
    ];
  }, [leads]);

  const chartData = period === 'weekly' ? (weeklyData.length ? weeklyData : [{ week: '-', IndiaMART: 0, WhatsApp: 0, JustDial: 0, Website: 0 }]) : (monthlyData.length ? monthlyData : [{ month: '-', leads: 0, converted: 0, revenue: 0 }]);
  const revenueData = period === 'weekly' ? (weeklyData.length ? weeklyData : [{ week: '-', revenue: 0 }]) : (monthlyData.length ? monthlyData : [{ month: '-', revenue: 0 }]);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{isTeamMember ? 'Analytics' : 'Reports & Insights'}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {isTeamMember ? 'Performance analytics for your assigned leads' : 'Performance analytics from your leads'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1">
            <button
              onClick={() => setPeriod('weekly')}
              className={cn('rounded-md px-3 py-1.5 text-[12px] font-medium transition-all', period === 'weekly' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={cn('rounded-md px-3 py-1.5 text-[12px] font-medium transition-all', period === 'monthly' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}
            >
              Monthly
            </button>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-600 hover:bg-stone-50 transition-colors">
            <Calendar className="h-3.5 w-3.5" />
            Date range
          </button>
          <button
            onClick={() => handleExport('overview', trendRef.current, `analytics-${period}-trend.pdf`, `${period === 'weekly' ? 'Weekly' : 'Monthly'} Lead Trend`)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {exportingSection === 'overview' ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {weeklyMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{m.label}</p>
                <Icon className="h-4 w-4 text-stone-300" />
              </div>
              <p className="text-2xl font-semibold text-stone-900">{m.value}</p>
              {m.change && (
                <div className="mt-1 flex items-center gap-1">
                  {m.up ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                  <span className={cn('text-[11px] font-medium', m.up ? 'text-emerald-600' : 'text-red-500')}>{m.change}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div ref={trendRef} className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900">{period === 'weekly' ? 'Weekly Lead Trend' : 'Monthly Lead Trend'}</h3>
            <button
              onClick={() => handleExport('trend', trendRef.current, `lead-trend-${period}.pdf`, `${period === 'weekly' ? 'Weekly' : 'Monthly'} Lead Trend`)}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'trend' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">Leads acquired vs converted</p>
          <ResponsiveContainer width="100%" height={240}>
            {period === 'weekly' ? (
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e7e5e4' }} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="IndiaMART" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="WhatsApp" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="JustDial" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Website" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e7e5e4' }} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="converted" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div ref={revenueRef} className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
            <h3 className="text-sm font-semibold text-stone-900">Revenue Trend</h3>
            <p className="text-xs text-stone-400 mt-0.5">{period === 'weekly' ? 'Weekly' : 'Monthly'} revenue performance</p>
            </div>
            <button
              onClick={() => handleExport('revenue', revenueRef.current, `revenue-trend-${period}.pdf`, 'Revenue Trend')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'revenue' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ee" vertical={false} />
              <XAxis dataKey={period === 'weekly' ? 'week' : 'month'} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e7e5e4' }} formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Revenue']} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cn('grid gap-4', isTeamMember ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3')}>
        <div ref={channelRef} className={cn('rounded-xl border border-stone-200/60 bg-white shadow-sm', isTeamMember ? '' : 'col-span-1')}>
          <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Channel Performance</h3>
              <p className="text-xs text-stone-400 mt-0.5">Conversion & revenue by channel</p>
            </div>
            <button
              onClick={() => handleExport('channel', channelRef.current, 'channel-performance.pdf', 'Channel Performance')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'channel' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {channelPerformance.map((ch) => {
              const convRate = ch.leads > 0 ? Math.round((ch.converted / ch.leads) * 100) : 0;
              return (
                <div key={ch.name} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-stone-800">{ch.name}</span>
                    <span className="text-[13px] font-semibold text-stone-900">{formatCurrency(ch.value)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-1.5 w-full rounded-full bg-stone-100">
                        <div className="h-1.5 rounded-full" style={{ width: `${convRate}%`, backgroundColor: ch.color }} />
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-stone-600">{convRate}%</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-stone-400">
                    <span>{ch.leads} leads</span>
                    <span>•</span>
                    <span>{ch.converted} converted</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isTeamMember && (
        <div ref={teamRef} className="col-span-2 rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Team Performance</h3>
              <p className="text-xs text-stone-400 mt-0.5">Executive comparison</p>
            </div>
            <button
              onClick={() => handleExport('team', teamRef.current, 'team-performance.pdf', 'Team Performance')}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingSection === 'team' ? 'Exporting...' : 'PDF'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {executivesWithStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={executivesWithStats}>
                  <PolarGrid stroke="#e7e5e4" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#a8a29e' }} />
                  <Radar name="Conversion" dataKey="conversion" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                  <Radar name="Revenue" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="col-span-2 flex items-center justify-center h-[250px] text-sm text-stone-400">Add team members to see performance</div>
            )}
            <div className="flex flex-col justify-center space-y-3">
              {executives.map((exec) => {
                const execLeads = leads.filter((l) => l.assignedTo === exec.name);
                const revenue = execLeads.filter((l) => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
                const total = execLeads.filter((l) => l.stage === 'Won' || l.stage === 'Lost').length;
                const conversionRate = total > 0 ? Math.round((execLeads.filter((l) => l.stage === 'Won').length / total) * 100) : 0;
                return (
                  <div key={exec.id} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500">
                      {exec.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-stone-700">{exec.name}</p>
                      <p className="text-[10px] text-stone-400">
                        {exec.region} • {conversionRate}% conv.
                      </p>
                    </div>
                    <span className="text-[12px] font-semibold text-stone-800">{formatCurrency(revenue)}</span>
                  </div>
                );
              })}
              {executives.length === 0 && <p className="text-sm text-stone-400">No team members</p>}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
