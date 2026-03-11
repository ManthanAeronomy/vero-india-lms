import type { Lead, Channel, DealStage, Priority } from '@/data/types';

const API = 'https://api.veroindia.in/api/leads';

export type CreateLeadInput = Omit<Lead, 'id' | 'createdAt' | 'lastActivity' | 'comments'> & {
  createdAt?: string;
  lastActivity?: string;
};

export type UpdateLeadInput = Partial<Omit<Lead, 'id' | 'createdAt' | 'lastActivity' | 'comments'>>;
export type AddLeadCommentInput = { message: string };

export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(API, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createLead(data: CreateLeadInput): Promise<Lead> {
  const res = await fetch(API, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateLead(id: string, data: UpdateLeadInput): Promise<Lead> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
}

export async function addLeadComment(id: string, data: AddLeadCommentInput): Promise<Lead> {
  const res = await fetch(`${API}/${id}/comments`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
