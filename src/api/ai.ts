const API = 'https://api.veroindia.in/api/ai';

export interface AIInsights {
  highlights: string[];
  recommendations: string[];
  risks: string[];
  summary: string;
}

export interface AIInsightsResponse {
  insights: AIInsights;
  summary: {
    totalLeads: number;
    converted: number;
    revenue: number;
    conversionRate: number;
  };
}

export async function fetchAIInsights(): Promise<AIInsightsResponse> {
  const res = await fetch(`${API}/insights`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Failed to fetch AI insights');
  }

  return res.json();
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[], model?: string): Promise<{ message: string }> {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, ...(model && { model }) }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { error?: string }).error ?? 'Failed to get AI response';
    if (res.status === 429) {
      throw new Error('AI rate limit reached. Please wait a minute and try again.');
    }
    throw new Error(msg);
  }

  return res.json();
}
