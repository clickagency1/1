import { Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLanguage } from '../lib/i18n'
import { addSupportMessage, listSupportMessages, subscribeToSupportStore, type SupportMessage } from '../lib/store'
import { trackGlow } from '../lib/liquid-glass'

interface SupportChatPanelProps {
  ticketId: string
  role: 'client' | 'support'
  senderName: string
  disabled?: boolean
}

export function SupportChatPanel({ ticketId, role, senderName, disabled }: SupportChatPanelProps) {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const refresh = () => {
      listSupportMessages(ticketId)
        .then((data) => {
          if (active) setMessages(data)
        })
        .catch(() => {
          if (active) setMessages([])
        })
    }
    refresh()
    const unsubscribe = subscribeToSupportStore(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [ticketId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || sending || disabled) return
    setSending(true)
    try {
      await addSupportMessage({ ticketId, sender: role, senderName, text: text.trim() })
      setText('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-thread">
        {messages.length === 0 && <p className="chat-empty">{tr('لسه مفيش رسائل — ابدأ المحادثة.', 'No messages yet — start the conversation.')}</p>}
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.sender === role ? 'is-own' : ''}`}>
            <span className="chat-bubble-name">{message.senderName}</span>
            <p>{message.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={disabled ? tr('التذكرة مقفولة', 'The ticket is closed') : tr('اكتب رسالتك...', 'Type your message...')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={sending || disabled}
        />
        <button type="submit" className="glass" onMouseMove={trackGlow} aria-label={tr('إرسال', 'Send')} disabled={sending || disabled}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
