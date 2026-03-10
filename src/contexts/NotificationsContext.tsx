import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLeads } from '@/contexts/LeadsContext';
import { useAuth } from '@/contexts/AuthContext';
import { getReadNotificationIds, markNotificationRead, markAllNotificationsRead } from '@/utils/notificationStorage';
import type { Notification } from '@/data/notificationTypes';

type NotificationsContextValue = {
  notifications: (Notification & { isRead: boolean })[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function buildNotifications(
  leads: { id: string; name: string; company: string; meetingAt: string; comments: { id: string; authorName: string; message: string; createdAt: string }[]; priority: string; stage: string; createdAt: string; assignedTo: string }[],
  userName: string,
  isTeamMember: boolean
): Notification[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const items: Notification[] = [];

  const filtered = isTeamMember ? leads.filter((l) => l.assignedTo === userName) : leads;

  for (const lead of filtered) {
    if (lead.meetingAt) {
      const mt = new Date(lead.meetingAt);
      if (mt >= today && mt < dayAfter) {
        const isToday = mt >= today && mt < tomorrow;
        items.push({
          id: `meeting-${lead.id}`,
          type: 'meeting',
          title: isToday ? 'Meeting today' : 'Meeting tomorrow',
          message: `${lead.name} (${lead.company}) at ${mt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`,
          link: { page: 'calendar' },
          createdAt: lead.meetingAt,
          meta: { leadId: lead.id },
        });
      }
    }

    if (lead.comments?.length) {
      const latest = lead.comments[lead.comments.length - 1];
      if (latest && latest.authorName !== userName) {
        const commentDate = new Date(latest.createdAt);
        const hoursAgo = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 48) {
          items.push({
            id: `comment-${lead.id}-${latest.id}`,
            type: 'comment',
            title: 'New comment',
            message: `${latest.authorName} on ${lead.name}: "${latest.message.slice(0, 50)}${latest.message.length > 50 ? '…' : ''}"`,
            link: { page: 'leads', search: lead.name },
            createdAt: latest.createdAt,
            meta: { leadId: lead.id },
          });
        }
      }
    }

    if (lead.priority === 'High' && lead.stage !== 'Won' && lead.stage !== 'Lost') {
      const created = new Date(lead.createdAt);
      const daysSince = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) {
        items.push({
          id: `high-${lead.id}`,
          type: 'high_priority',
          title: 'High-priority lead',
          message: `${lead.name} (${lead.company}) – ${lead.stage}`,
          link: { page: 'leads', search: lead.name },
          createdAt: lead.createdAt,
          meta: { leadId: lead.id },
        });
      }
    }
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { leads } = useLeads();
  const { user } = useAuth();
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds());

  useEffect(() => {
    setReadIds(getReadNotificationIds());
  }, []);

  const notifications = useMemo(() => {
    if (!user) return [];
    return buildNotifications(leads, user.name, user.role === 'team_member');
  }, [leads, user]);

  const notificationsWithRead = useMemo(
    () => notifications.map((n) => ({ ...n, isRead: readIds.has(n.id) })),
    [notifications, readIds]
  );

  const unreadCount = useMemo(
    () => notificationsWithRead.filter((n) => !n.isRead).length,
    [notificationsWithRead]
  );

  const markAsRead = useCallback((id: string) => {
    markNotificationRead(id);
    setReadIds((prev) => new Set([...prev, id]));
  }, []);

  const markAllAsRead = useCallback(() => {
    const ids = notifications.map((n) => n.id);
    markAllNotificationsRead(ids);
    setReadIds((prev) => new Set([...prev, ...ids]));
  }, [notifications]);

  const value = useMemo(
    () => ({ notifications: notificationsWithRead, unreadCount, markAsRead, markAllAsRead }),
    [notificationsWithRead, unreadCount, markAsRead, markAllAsRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
