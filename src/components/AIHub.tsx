import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { sendChatMessage, type ChatMessage } from '@/api/ai';

const ALLOWED_MODELS: { id: string; name: string }[] = [
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'openai/gpt-4', name: 'GPT-4' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-5', name: 'GPT-5' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2' },
  { id: 'openai/gpt-5.4', name: 'GPT-5.4' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
];

const SUGGESTED_PROMPTS = [
  'Give me insights on my leads and conversions',
  'Which channel is performing best?',
  'What recommendations do you have to improve conversion rate?',
  'Summarize my sales performance',
  'Which deals need attention?',
];

export function AIHub() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-3.5-turbo');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isTeamMember = user?.role === 'team_member';

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  async function handleSend(content?: string) {
    const text = (content ?? input.trim()) || '';
    if (!text || loading) return;

    setInput('');
    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const { message } = await sendChatMessage([...messages, userMessage], selectedModel);
      setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">AI Hub</h1>
          <p className="mt-1 text-sm text-stone-500">
            {isTeamMember ? 'Ask about your leads and conversions' : 'Chat with AI about your leads and conversions'}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setModelDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="max-w-[180px] truncate">
              {ALLOWED_MODELS.find((m) => m.id === selectedModel)?.name ?? selectedModel}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-stone-400 transition-transform', modelDropdownOpen && 'rotate-180')} />
          </button>
          {modelDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setModelDropdownOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                {ALLOWED_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedModel(m.id);
                      setModelDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-stone-50',
                      selectedModel === m.id ? 'bg-violet-50 font-medium text-violet-700' : 'text-stone-700'
                    )}>
                    <span className="block truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-stone-800">How can I help you today?</h2>
              <p className="mt-2 max-w-md text-sm text-stone-500">
                Ask about your leads, conversions, channel performance, or get actionable recommendations.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-2.5 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-100">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'mb-6 flex gap-3',
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  )}>
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      msg.role === 'user' ? 'bg-stone-200' : 'bg-gradient-to-br from-violet-500 to-indigo-600'
                    )}>
                    {msg.role === 'user' ? (
                      <User className="h-4 w-4 text-stone-600" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'flex-1 space-y-1',
                      msg.role === 'user' ? 'text-right' : ''
                    )}>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </p>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'ml-auto max-w-[85%] bg-stone-900 text-white'
                          : 'max-w-[85%] bg-stone-100 text-stone-800'
                      )}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="mb-6 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">AI Assistant</p>
                    <div className="mt-1 flex items-center gap-2 rounded-2xl bg-stone-100 px-4 py-3">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-stone-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border-t border-stone-200/80 p-4">
          <div className="mx-auto flex max-w-3xl gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your leads, conversions, or recommendations..."
              rows={1}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none transition-all focus:border-stone-300 focus:bg-white focus:ring-2 focus:ring-stone-100 disabled:opacity-60"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-[11px] text-stone-400 mt-2">
            AI can make mistakes. Verify important data in Reports.
          </p>
        </div>
      </div>
    </div>
  );
}
