import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Executive } from '@/data/types';
import { fetchExecutives, createExecutive as apiCreateExecutive, updateExecutive as apiUpdateExecutive, deleteExecutive as apiDeleteExecutive, type CreateExecutiveInput } from '@/api/executives';

type ExecutivesContextValue = {
  executives: Executive[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createExecutive: (data: CreateExecutiveInput) => Promise<Executive>;
  updateExecutive: (id: string, data: Partial<CreateExecutiveInput>) => Promise<Executive>;
  deleteExecutive: (id: string) => Promise<void>;
};

const ExecutivesContext = createContext<ExecutivesContextValue | null>(null);

export function ExecutivesProvider({ children }: { children: React.ReactNode }) {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExecutives();
      setExecutives(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createExecutive = useCallback(async (data: CreateExecutiveInput) => {
    const exec = await apiCreateExecutive(data);
    setExecutives((prev) => [...prev, exec].sort((a, b) => a.name.localeCompare(b.name)));
    return exec;
  }, []);

  const updateExecutive = useCallback(async (id: string, data: Parameters<typeof apiUpdateExecutive>[1]) => {
    const exec = await apiUpdateExecutive(id, data);
    setExecutives((prev) =>
      prev.map((e) => (e.id === id ? exec : e)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return exec;
  }, []);

  const deleteExecutive = useCallback(async (id: string) => {
    await apiDeleteExecutive(id);
    setExecutives((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <ExecutivesContext.Provider
      value={{
        executives,
        loading,
        error,
        refetch,
        createExecutive,
        updateExecutive,
        deleteExecutive,
      }}
    >
      {children}
    </ExecutivesContext.Provider>
  );
}

export function useExecutives() {
  const ctx = useContext(ExecutivesContext);
  if (!ctx) throw new Error('useExecutives must be used within ExecutivesProvider');
  return ctx;
}
