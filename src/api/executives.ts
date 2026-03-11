import type { Executive } from '@/data/types';

const API = 'https://api.veroindia.in/api/executives';

export type CreateExecutiveInput = Omit<Executive, 'id'>;

export async function fetchExecutives(): Promise<Executive[]> {
  const res = await fetch(API, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createExecutive(data: CreateExecutiveInput): Promise<Executive> {
  const res = await fetch(API, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateExecutive(id: string, data: Partial<CreateExecutiveInput>): Promise<Executive> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteExecutive(id: string): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
}
