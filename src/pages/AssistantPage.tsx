import { useMutation } from '@tanstack/react-query'
import { ArrowUp, Bot, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/layout/nav-user'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMe } from '@/features/auth/use-auth'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Tóm tắt công việc hôm nay giúp tôi',
  'Gợi ý cách chăm sóc khách hàng mới',
  'Viết thông báo nội bộ về lịch họp',
]

let nextId = 1

export function AssistantPage() {
  const { data: user } = useMe()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const chat = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiClient.post<{ data: { reply: string } }>('/ai/chat', { message: text })
      return res.data.data.reply
    },
    onSuccess: (reply) =>
      setMessages((prev) => [...prev, { id: nextId++, role: 'assistant', content: reply }]),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, chat.isPending])

  const send = (text: string) => {
    const content = text.trim()
    if (!content || chat.isPending) return
    setMessages((prev) => [...prev, { id: nextId++, role: 'user', content }])
    setInput('')
    chat.mutate(content)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(input)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto flex h-[calc(100svh-3.5rem-1rem)] w-full max-w-3xl flex-col px-4 md:h-[calc(100svh-3.5rem-2rem)]">
      <div className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
              <Sparkles className="size-7" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Xin chào {displayName(user)}, tôi có thể giúp gì?
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
              Đặt câu hỏi hoặc chọn một gợi ý bên dưới để bắt đầu.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" className="rounded-full" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                {m.role === 'user' ? (
                  <UserAvatar user={user} className="size-8 rounded-lg" />
                ) : (
                  <AssistantAvatar />
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm border bg-card',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex gap-3">
                <AssistantAvatar />
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Đang suy nghĩ…
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="pb-4">
        <div className="relative rounded-2xl border bg-card shadow-sm transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn cho trợ lý AI…"
            rows={1}
            className="max-h-40 min-h-12 resize-none border-0 bg-transparent py-3.5 pr-14 pl-4 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || chat.isPending}
            className="absolute right-2.5 bottom-2.5 rounded-xl"
            aria-label="Gửi"
          >
            <ArrowUp />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Enter để gửi · Shift + Enter để xuống dòng
        </p>
      </form>
    </div>
  )
}

function AssistantAvatar() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
      <Bot className="size-4" />
    </div>
  )
}
