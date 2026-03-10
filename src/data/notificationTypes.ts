export type NotificationType = 'meeting' | 'comment' | 'lead' | 'high_priority';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: { page: string; search?: string };
  createdAt: string;
  isRead?: boolean;
  meta?: Record<string, unknown>;
}
