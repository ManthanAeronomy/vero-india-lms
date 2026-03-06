import { useState } from 'react';
import { type DealStage } from '@/data/mockData';
import { useLeads } from '@/contexts/LeadsContext';
import { Building2, MessageSquare, Phone, Globe, GripVertical } from 'lucide-react';
import { cn } from '@/utils/cn';

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

const stages: { id: DealStage; color: string; bgColor: string; dotColor: string }[] = [
  { id: 'New', color: 'text-stone-600', bgColor: 'bg-stone-50', dotColor: 'bg-stone-400' },
  { id: 'Contacted', color: 'text-blue-600', bgColor: 'bg-blue-50/50', dotColor: 'bg-blue-400' },
  { id: 'Qualified', color: 'text-violet-600', bgColor: 'bg-violet-50/50', dotColor: 'bg-violet-400' },
  { id: 'Proposal', color: 'text-orange-600', bgColor: 'bg-orange-50/50', dotColor: 'bg-orange-400' },
  { id: 'Negotiation', color: 'text-yellow-700', bgColor: 'bg-yellow-50/50', dotColor: 'bg-yellow-400' },
  { id: 'Won', color: 'text-emerald-600', bgColor: 'bg-emerald-50/50', dotColor: 'bg-emerald-400' },
  { id: 'Lost', color: 'text-red-600', bgColor: 'bg-red-50/50', dotColor: 'bg-red-400' },
];

const channelIcons: Record<string, React.ReactNode> = {
  'IndiaMART': <Building2 className="h-3 w-3" />,
  'WhatsApp': <MessageSquare className="h-3 w-3" />,
  'JustDial': <Phone className="h-3 w-3" />,
  'Website': <Globe className="h-3 w-3" />,
  'website': <Globe className="h-3 w-3" />,
};

const channelColors: Record<string, string> = {
  'IndiaMART': 'text-indigo-500',
  'WhatsApp': 'text-emerald-500',
  'JustDial': 'text-amber-500',
  'Website': 'text-sky-500',
  'website': 'text-sky-500',
};

const priorityDots: Record<string, string> = {
  'High': 'bg-red-400',
  'Medium': 'bg-amber-400',
  'Low': 'bg-stone-300',
};

export function DealPipeline() {
  const { leads, updateLead } = useLeads();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  const totalPipelineValue = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').reduce((s, l) => s + l.value, 0);

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDraggedLeadId(null);
    setDragOverStage(null);
  }

  function handleDragOver(e: React.DragEvent, stage: DealStage) {
    e.preventDefault();
    setDragOverStage(stage);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  async function handleDrop(e: React.DragEvent, targetStage: DealStage) {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = draggedLeadId;
    setDraggedLeadId(null);
    if (!leadId) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;
    try {
      await updateLead(leadId, { stage: targetStage });
    } catch {
      // Error handled by LeadsContext
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Deal Pipeline</h1>
          <p className="mt-1 text-sm text-stone-500">
            Pipeline value: <span className="font-semibold text-stone-700">{formatCurrency(totalPipelineValue)}</span> across {leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length} active deals
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.id);
          const stageValue = stageLeads.reduce((s, l) => s + l.value, 0);

          return (
            <div
              key={stage.id}
              className={cn(
                'flex w-[220px] shrink-0 flex-col rounded-xl border transition-colors',
                dragOverStage === stage.id ? 'border-stone-400 bg-stone-100/80' : 'border-stone-200/60 bg-stone-50/50'
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3.5 py-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', stage.dotColor)} />
                  <span className={cn('text-[12px] font-semibold', stage.color)}>{stage.id}</span>
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-200/80 px-1 text-[10px] font-semibold text-stone-500">
                    {stageLeads.length}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-stone-400">{formatCurrency(stageValue)}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 p-2.5 min-h-[120px]">
                {stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'group cursor-grab active:cursor-grabbing rounded-lg border border-stone-200/60 bg-white p-3 shadow-sm hover:shadow-md hover:border-stone-300/60 transition-all',
                      draggedLeadId === lead.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-stone-800 truncate">{lead.name}</p>
                        <p className="text-[10px] text-stone-400 truncate">{lead.company}</p>
                      </div>
                      <GripVertical className="h-3.5 w-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-stone-800">{formatCurrency(lead.value)}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={cn('h-1.5 w-1.5 rounded-full', priorityDots[lead.priority])} />
                        <span className={cn(channelColors[lead.channel] ?? channelColors['Website'])}>
                          {channelIcons[lead.channel] ?? channelIcons['Website']}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[8px] font-bold text-stone-500">
                        {(lead.assignedTo?.trim() ? lead.assignedTo.split(' ').map(n => n[0]).join('') : 'NA').slice(0, 2)}
                      </div>
                      <span className="text-[10px] text-stone-400 truncate">{lead.assignedTo?.trim() || 'Unassigned'}</span>
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-stone-200 py-8">
                    <p className="text-[11px] text-stone-400">No deals</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Summary */}
      <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-900 mb-4">Pipeline Conversion Funnel</h3>
        <div className="flex items-end gap-1">
          {stages.filter(s => s.id !== 'Lost').map((stage) => {
            const count = leads.filter(l => l.stage === stage.id).length;
            const maxCount = Math.max(...stages.map(s => leads.filter(l => l.stage === s.id).length), 1);
            const height = Math.max((count / maxCount) * 140, 20);
            return (
              <div key={stage.id} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[13px] font-semibold text-stone-800">{count}</span>
                <div className={cn('w-full rounded-lg transition-all', stage.bgColor)} style={{ height, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className={cn('h-full w-full rounded-lg opacity-40', stage.dotColor.replace('bg-', 'bg-'))} />
                </div>
                <span className="text-[10px] font-medium text-stone-500 text-center">{stage.id}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
