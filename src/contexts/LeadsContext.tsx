import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Lead } from '@/data/types';
import {
  fetchLeads,
  createLead as apiCreateLead,
  updateLead as apiUpdateLead,
  deleteLead as apiDeleteLead,
  addLeadComment as apiAddLeadComment,
  type CreateLeadInput,
} from '@/api/leads';

type LeadsContextValue = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLead: (data: CreateLeadInput) => Promise<Lead>;
  updateLead: (id: string, data: Parameters<typeof apiUpdateLead>[1]) => Promise<Lead>;
  deleteLead: (id: string) => Promise<void>;
  addLeadComment: (id: string, message: string) => Promise<Lead>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const createLead = useCallback(async (data: CreateLeadInput) => {
    const lead = await apiCreateLead(data);
    setLeads(prev => [lead, ...prev]);
    return lead;
  }, []);

  const updateLead = useCallback(async (id: string, data: Parameters<typeof apiUpdateLead>[1]) => {
    const lead = await apiUpdateLead(id, data);
    setLeads(prev => prev.map(l => l.id === id ? lead : l));
    return lead;
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    await apiDeleteLead(id);
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const addLeadComment = useCallback(async (id: string, message: string) => {
    const lead = await apiAddLeadComment(id, { message });
    setLeads(prev => prev.map(l => l.id === id ? lead : l));
    return lead;
  }, []);

  return (
    <LeadsContext.Provider value={{ leads, loading, error, refetch, createLead, updateLead, deleteLead, addLeadComment }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be used within LeadsProvider');
  return ctx;
}
