import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, Building2, MessageSquare, Phone, Globe, ArrowUpDown, Eye, MoreHorizontal, Plus, Pencil, X } from 'lucide-react';
import { type Lead, type Channel, type DealStage } from '@/data/mockData';
import { useLeads } from '@/contexts/LeadsContext';
import { useExecutives } from '@/contexts/ExecutivesContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

function formatChannelLabel(channel: string): string {
  const normalized = channel?.toLowerCase?.() ?? channel;
  if (normalized === 'indiamart') return 'IndiaMART';
  if (normalized === 'whatsapp') return 'WhatsApp';
  if (normalized === 'justdial') return 'JustDial';
  if (normalized === 'website') return 'Website';
  return channel;
}

function toDateTimeLocalValue(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMeetingDateTime(value: string): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const channelIcons: Record<string, React.ReactNode> = {
  'IndiaMART': <Building2 className="h-3.5 w-3.5" />,
  'WhatsApp': <MessageSquare className="h-3.5 w-3.5" />,
  'JustDial': <Phone className="h-3.5 w-3.5" />,
  'Website': <Globe className="h-3.5 w-3.5" />,
  'website': <Globe className="h-3.5 w-3.5" />,
};

const channelStyles: Record<string, string> = {
  'IndiaMART': 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  'WhatsApp': 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  'JustDial': 'bg-amber-50 text-amber-600 ring-amber-100',
  'Website': 'bg-sky-50 text-sky-600 ring-sky-100',
  'website': 'bg-sky-50 text-sky-600 ring-sky-100',
};

const stageStyles: Record<string, string> = {
  'New': 'bg-stone-100 text-stone-600',
  'Contacted': 'bg-blue-50 text-blue-600',
  'Qualified': 'bg-violet-50 text-violet-600',
  'Proposal': 'bg-orange-50 text-orange-600',
  'Negotiation': 'bg-yellow-50 text-yellow-700',
  'Won': 'bg-emerald-50 text-emerald-600',
  'Lost': 'bg-red-50 text-red-600',
};

const priorityStyles: Record<string, string> = {
  'High': 'bg-red-50 text-red-600',
  'Medium': 'bg-amber-50 text-amber-600',
  'Low': 'bg-stone-50 text-stone-500',
};

const allChannels: Channel[] = ['IndiaMART', 'WhatsApp', 'JustDial', 'Website'];
const allStages: DealStage[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export function LeadsTable({ externalSearch = '' }: { externalSearch?: string }) {
  const { user } = useAuth();
  const { leads, loading, error, createLead, updateLead, addLeadComment } = useLeads();
  const { executives } = useExecutives();
  const isTeamMember = user?.role === 'team_member';
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<Channel | 'All'>('All');
  const [stageFilter, setStageFilter] = useState<DealStage | 'All'>('All');
  const [sortField, setSortField] = useState<'value' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    setSearch(externalSearch);
  }, [externalSearch]);

  const filtered = useMemo(() => {
    let result = [...leads];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(s) ||
        l.company.toLowerCase().includes(s) ||
        l.email.toLowerCase().includes(s) ||
        l.id.toLowerCase().includes(s)
      );
    }
    if (channelFilter !== 'All') result = result.filter(l => (l.channel?.toLowerCase?.() ?? l.channel) === channelFilter.toLowerCase());
    if (stageFilter !== 'All') result = result.filter(l => l.stage === stageFilter);
    result.sort((a, b) => {
      const aVal = sortField === 'value' ? a.value : new Date(a.createdAt).getTime();
      const bVal = sortField === 'value' ? b.value : new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [leads, search, channelFilter, stageFilter, sortField, sortDir]);

  async function handleAddLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const value = Number(fd.get('value'));
    if (isNaN(value) || value < 0) {
      setFormError('Enter a valid deal value');
      return;
    }
    setSubmitting(true);
    try {
      await createLead({
        name: fd.get('name') as string,
        company: fd.get('company') as string,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string,
        channel: fd.get('channel') as Channel,
        stage: (fd.get('stage') as DealStage) || 'New',
        priority: (fd.get('priority') as 'High' | 'Medium' | 'Low') || 'Medium',
        value,
        assignedTo: fd.get('assignedTo') as string,
        meetingAt: fd.get('meetingAt') ? new Date(fd.get('meetingAt') as string).toISOString() : '',
        meetingLocation: (fd.get('meetingLocation') as string) || '',
        notes: (fd.get('notes') as string) || '',
        location: (fd.get('location') as string) || '',
      });
      setShowAddModal(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingLead) return;
    setEditError(null);
    const fd = new FormData(e.currentTarget);
    const value = Number(fd.get('value'));
    if (isNaN(value) || value < 0) {
      setEditError('Enter a valid deal value');
      return;
    }
    setEditSubmitting(true);
    try {
      const updatedLead = await updateLead(editingLead.id, {
        name: fd.get('name') as string,
        company: fd.get('company') as string,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string,
        channel: fd.get('channel') as Channel,
        stage: (fd.get('stage') as DealStage) || 'New',
        priority: (fd.get('priority') as 'High' | 'Medium' | 'Low') || 'Medium',
        value,
        assignedTo: (fd.get('assignedTo') as string) || '',
        meetingAt: fd.get('meetingAt') ? new Date(fd.get('meetingAt') as string).toISOString() : '',
        meetingLocation: (fd.get('meetingLocation') as string) || '',
        notes: (fd.get('notes') as string) || '',
        location: (fd.get('location') as string) || '',
      });
      setEditingLead(null);
      if (selectedLead?.id === updatedLead.id) setSelectedLead(updatedLead);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleAddComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedLead) return;

    const message = commentDraft.trim();
    if (!message) {
      setCommentError('Comment cannot be empty');
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const updatedLead = await addLeadComment(selectedLead.id, message);
      setSelectedLead(updatedLead);
      setCommentDraft('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  }

  const toggleSort = (field: 'value' | 'createdAt') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{isTeamMember ? 'Leads Assigned' : 'Leads'}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {loading ? 'Loading...' : `${leads.length} total leads across all channels`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-stone-800 sm:w-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Lead
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-[13px] text-stone-700 placeholder-stone-400 outline-none focus:border-stone-300 focus:ring-2 focus:ring-stone-100 transition-all"
          />
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-1.5 rounded-lg border border-stone-200 bg-white p-1">
              <button
                onClick={() => setChannelFilter('All')}
                className={cn('rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all',
                  channelFilter === 'All' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}
              >All</button>
              {allChannels.map(ch => (
                <button key={ch} onClick={() => setChannelFilter(ch)}
                  className={cn('flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all',
                    channelFilter === ch ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}
                >
                  {channelIcons[ch]}
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value as DealStage | 'All')}
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[12px] font-medium text-stone-600 outline-none focus:border-stone-300 sm:w-auto"
            >
              <option value="All">All Stages</option>
              {allStages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="md:hidden space-y-3">
        {filtered.map((lead) => (
          <div key={lead.id} className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-stone-900">{lead.name}</p>
                <p className="truncate text-[12px] text-stone-500">{lead.company}</p>
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-stone-800">{formatCurrency(lead.value)}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ring-1', channelStyles[lead.channel] ?? channelStyles['Website'])}>
                {channelIcons[lead.channel] ?? channelIcons['Website']} {formatChannelLabel(lead.channel)}
              </span>
              <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium', stageStyles[lead.stage])}>
                {lead.stage}
              </span>
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', priorityStyles[lead.priority])}>
                {lead.priority}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <p className="text-stone-400">Assigned To</p>
                <p className="font-medium text-stone-700">{lead.assignedTo || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-stone-400">Created</p>
                <p className="font-medium text-stone-700">{lead.createdAt}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => setSelectedLead(lead)} className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-[13px] font-medium text-stone-600 hover:bg-stone-50">
                View
              </button>
              <button onClick={() => setEditingLead(lead)} className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-stone-800">
                Edit
              </button>
            </div>
          </div>
        ))}
        {(loading ? [] : filtered).length === 0 && (
          <div className="rounded-xl border border-stone-200/60 bg-white py-12 text-center shadow-sm">
            <p className="text-sm text-stone-400">
              {loading ? 'Loading leads...' : 'No leads found. Add your first lead to get started.'}
            </p>
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-stone-200/60 bg-white shadow-sm md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/50">
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">Lead</th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">Channel</th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">Stage</th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">Priority</th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 cursor-pointer" onClick={() => toggleSort('value')}>
                <span className="inline-flex items-center gap-1">Value <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">Assigned To</th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 cursor-pointer" onClick={() => toggleSort('createdAt')}>
                <span className="inline-flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filtered.map(lead => (
              <tr key={lead.id} className="group hover:bg-stone-50/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[11px] font-bold text-stone-500">
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-stone-800">{lead.name}</p>
                      <p className="text-[11px] text-stone-400">{lead.company}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ring-1', channelStyles[lead.channel] ?? channelStyles['Website'])}>
                    {channelIcons[lead.channel] ?? channelIcons['Website']} {formatChannelLabel(lead.channel)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium', stageStyles[lead.stage])}>
                    {lead.stage}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', priorityStyles[lead.priority])}>
                    {lead.priority}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[13px] font-semibold text-stone-800">{formatCurrency(lead.value)}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[12px] text-stone-600">{lead.assignedTo}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[12px] text-stone-400">{lead.createdAt}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedLead(lead)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingLead(lead)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(loading ? [] : filtered).length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-stone-400">
              {loading ? 'Loading leads...' : 'No leads found. Add your first lead to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-stone-900">Add Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Name *</label>
                  <input name="name" required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Company *</label>
                  <input name="company" required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Email *</label>
                  <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Phone *</label>
                  <input name="phone" required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Channel</label>
                  <select name="channel" required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                    {allChannels.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Stage</label>
                  <select name="stage" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                    {allStages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Priority</label>
                  <select name="priority" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Deal Value (₹) *</label>
                  <input name="value" type="number" min="0" required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Assigned To</label>
                  {executives.length > 0 ? (
                    <select name="assignedTo" required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                      {executives.map((e) => (
                        <option key={e.id} value={e.name}>{e.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input name="assignedTo" required placeholder="Enter assignee name (or add team members in Assignments)" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                  )}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Location</label>
                <input name="location" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" placeholder="e.g. Mumbai" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Meeting Date & Time</label>
                  <input name="meetingAt" type="datetime-local" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Meeting Location</label>
                  <input name="meetingLocation" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" placeholder="e.g. Office / Google Meet" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Notes</label>
                <textarea name="notes" rows={2} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-stone-600 hover:bg-stone-100">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-stone-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-stone-800 disabled:opacity-60">
                  {submitting ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setEditingLead(null)}>
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-stone-900">Edit Lead</h2>
              <button onClick={() => setEditingLead(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEditLead} className="space-y-4">
              {editError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Name *</label>
                  <input name="name" defaultValue={editingLead.name} required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Company *</label>
                  <input name="company" defaultValue={editingLead.company} required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Email *</label>
                  <input name="email" type="email" defaultValue={editingLead.email} required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Phone *</label>
                  <input name="phone" defaultValue={editingLead.phone} required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Channel</label>
                  <select name="channel" defaultValue={formatChannelLabel(editingLead.channel)} required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                    {allChannels.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Stage</label>
                  <select name="stage" defaultValue={editingLead.stage} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                    {allStages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Priority</label>
                  <select name="priority" defaultValue={editingLead.priority} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Deal Value (₹) *</label>
                  <input name="value" type="number" min="0" defaultValue={editingLead.value} required className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Assigned To</label>
                  {executives.length > 0 ? (
                    <select name="assignedTo" defaultValue={editingLead.assignedTo || ''} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]">
                      <option value="">Unassigned</option>
                      {executives.map((e) => (
                        <option key={e.id} value={e.name}>{e.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input name="assignedTo" defaultValue={editingLead.assignedTo} placeholder="Enter assignee name" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
                  )}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Location</label>
                <input name="location" defaultValue={editingLead.location} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" placeholder="e.g. Mumbai" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Meeting Date & Time</label>
                  <input
                    name="meetingAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(editingLead.meetingAt)}
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Meeting Location</label>
                  <input
                    name="meetingLocation"
                    defaultValue={editingLead.meetingLocation}
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]"
                    placeholder="e.g. Office / Google Meet"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Notes</label>
                <textarea name="notes" rows={2} defaultValue={editingLead.notes} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingLead(null)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-stone-600 hover:bg-stone-100">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting} className="rounded-lg bg-stone-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-stone-800 disabled:opacity-60">
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
          <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{selectedLead.name}</h2>
                <p className="text-sm text-stone-500">{selectedLead.company}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingLead(selectedLead)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedLead(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['Lead ID', selectedLead.id],
                ['Channel', selectedLead.channel],
                ['Stage', selectedLead.stage],
                ['Priority', selectedLead.priority],
                ['Deal Value', formatCurrency(selectedLead.value)],
                ['Assigned To', selectedLead.assignedTo],
                ['Location', selectedLead.location],
                ['Meeting Time', formatMeetingDateTime(selectedLead.meetingAt)],
                ['Meeting Location', selectedLead.meetingLocation || 'Not set'],
                ['Created', selectedLead.createdAt],
                ['Email', selectedLead.email],
                ['Phone', selectedLead.phone],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-stone-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Notes</p>
              <p className="mt-1 text-[13px] text-stone-600">{selectedLead.notes || 'No notes added yet.'}</p>
            </div>
            <div className="mt-4 border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Comments</p>
                  <p className="mt-1 text-[13px] text-stone-500">Any signed-in user can leave updates on this lead.</p>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500">
                  {selectedLead.comments.length} comment{selectedLead.comments.length === 1 ? '' : 's'}
                </span>
              </div>

              <form onSubmit={handleAddComment} className="mt-4">
                <label className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  Add Comment{user ? ` as ${user.name}` : ''}
                </label>
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={3}
                  placeholder="Write an update, follow-up, or note for this lead..."
                  className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-stone-300 focus:ring-2 focus:ring-stone-100"
                />
                {commentError && <p className="mt-2 text-sm text-red-600">{commentError}</p>}
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={commentSubmitting}
                    className="rounded-lg bg-stone-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-stone-800 disabled:opacity-60"
                  >
                    {commentSubmitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>

              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                {selectedLead.comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                    No comments yet. Start the conversation on this lead.
                  </div>
                ) : (
                  [...selectedLead.comments]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((comment) => (
                      <div key={comment.id} className="rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-medium text-stone-800">{comment.authorName}</p>
                            <p className="text-[11px] text-stone-400">
                              {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt))}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-stone-600">{comment.message}</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
