export type Channel = 'IndiaMART' | 'WhatsApp' | 'JustDial' | 'Website';
export type DealStage = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type Priority = 'High' | 'Medium' | 'Low';

export interface LeadComment {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  channel: Channel;
  stage: DealStage;
  priority: Priority;
  value: number;
  assignedTo: string;
  createdAt: string;
  lastActivity: string;
  meetingAt: string;
  meetingLocation: string;
  meetingSiteVisit?: {
    address: string;
    postalCode: string;
  };
  notes: string;
  location: string;
  comments: LeadComment[];
}

export interface Executive {
  id: string;
  name: string;
  region: string;
  email?: string;
}
