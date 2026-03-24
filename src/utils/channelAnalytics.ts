import type { Channel } from '@/data/types';

/** Channels shown in dashboard/reports acquisition and channel charts (must match API labels). */
export const ANALYTICS_CHANNELS: readonly Channel[] = [
  'IndiaMART',
  'WhatsApp',
  'JustDial',
  'Website',
  '3M',
];

/** Map any stored channel string to a known analytics channel, or null if not in the chart set. */
export function channelForAnalytics(channel: string | undefined): Channel | null {
  if (!channel) return null;
  const lower = channel.trim().toLowerCase();
  for (const c of ANALYTICS_CHANNELS) {
    if (c.toLowerCase() === lower) return c;
  }
  return null;
}

/** Weekly chart row: per-channel counts plus aggregates (matches dashboard/reports weekly series). */
export type WeeklyChannelRow = { week: string; converted: number; revenue: number } & Record<Channel, number>;

export function sumWeeklyChannelLeads(row: WeeklyChannelRow): number {
  return ANALYTICS_CHANNELS.reduce((sum, c) => sum + (row[c] ?? 0), 0);
}
