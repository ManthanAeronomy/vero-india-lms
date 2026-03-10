import { useRef, useEffect } from 'react';
import { Bell, CalendarDays, MessageSquare, AlertCircle, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import type { Notification, NotificationType } from '@/data/notificationTypes';
import { cn } from '@/utils/cn';

const typeIcons: Record<NotificationType, React.ReactNode> = {
  meeting: <CalendarDays className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
  lead: <Bell className="h-4 w-4" />,
  high_priority: <AlertCircle className="h-4 w-4" />,
};

const typeStyles: Record<NotificationType, string> = {
  meeting: 'bg-indigo-50 text-indigo-600',
  comment: 'bg-emerald-50 text-emerald-600',
  lead: 'bg-amber-50 text-amber-600',
  high_priority: 'bg-red-50 text-red-600',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onNavigate: (page: string, search?: string) => void;
  onItemClick?: () => void;
}

export function NotificationsPanel({ isOpen, onClose, anchorRef, onNavigate, onItemClick }: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-full min-w-[320px] max-w-[400px] overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xl shadow-stone-200/60 sm:right-0"
    >
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-stone-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-stone-200" />
            <p className="mt-3 text-sm text-stone-500">No notifications yet</p>
            <p className="mt-1 text-xs text-stone-400">Meetings, comments, and high-priority leads will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onNavigate={onNavigate}
                onMarkRead={markAsRead}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
  onItemClick,
}: {
  notification: Notification & { isRead: boolean };
  onNavigate: (page: string, search?: string) => void;
  onMarkRead: (id: string) => void;
  onItemClick?: () => void;
}) {
  const handleClick = () => {
    if (!notification.isRead) onMarkRead(notification.id);
    if (notification.link) {
      onNavigate(notification.link.page, notification.link.search);
    }
    onItemClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50',
        !notification.isRead && 'bg-indigo-50/30'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          typeStyles[notification.type]
        )}
      >
        {typeIcons[notification.type]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900">{notification.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{notification.message}</p>
        <p className="mt-1 text-[10px] text-stone-400">{formatTime(notification.createdAt)}</p>
      </div>
    </button>
  );
}
