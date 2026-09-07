import { Download, FileText, Loader2, Paperclip, Send } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLanguage } from '../lib/i18n'
import {
  addMessage,
  getChatAttachmentUrl,
  listMessages,
  subscribeToStore,
  uploadChatAttachment,
  type ChatMessage,
} from '../lib/store'
import { trackGlow } from '../lib/liquid-glass'

interface ChatPanelProps {
  requestId: string
  role: 'client' | 'admin'
  senderName: string
}

export function ChatPanel({ requestId, role, senderName }: ChatPanelProps) {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachError, setAttachError] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const endRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    const refresh = () => {
      listMessages(requestId)
        .then((data) => {
          if (active) setMessages(data)
        })
        .catch(() => {
          if (active) setMessages([])
        })
    }
    refresh()
    const unsubscribe = subscribeToStore(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [requestId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // كل ما توصل رسائل فيها مرفقات جديدة، هات ليها روابط موقّتة للعرض (الباكت خاص).
  useEffect(() => {
    const pendingPaths = messages
      .map((message) => message.attachmentPath)
      .filter((path): path is string => !!path && !attachmentUrls[path])
    if (pendingPaths.length === 0) return
    let active = true
    Promise.all(
      pendingPaths.map(async (path) => [path, await getChatAttachmentUrl(path)] as const),
    ).then((pairs) => {
      if (!active) return
      setAttachmentUrls((prev) => {
        const next = { ...prev }
        for (const [path, url] of pairs) if (url) next[path] = url
        return next
      })
    })
    return () => {
      active = false
    }
  }, [messages, attachmentUrls])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await addMessage({ requestId, sender: role, senderName, text: text.trim() })
      setText('')
    } finally {
      setSending(false)
    }
  }

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // يسمح باختيار نفس الملف تاني لو احتاج
    if (files.length === 0) return
    setAttachError('')
    setUploading(true)
    try {
      for (const file of files) {
        const attachment = await uploadChatAttachment(requestId, file)
        await addMessage({ requestId, sender: role, senderName, text: '', attachment })
      }
    } catch (error) {
      setAttachError(error instanceof Error ? error.message : tr('تعذر رفع الملف. حاول مرة أخرى.', 'Could not upload the file. Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  const busy = sending || uploading

  return (
    <div className="chat-panel">
      <div className="chat-thread">
        {messages.length === 0 && <p className="chat-empty">{tr('لسه مفيش رسائل — ابدأ المحادثة.', 'No messages yet — start the conversation.')}</p>}
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.sender === role ? 'is-own' : ''}`}>
            <span className="chat-bubble-name">{message.senderName}</span>
            {message.attachmentPath && (
              <ChatAttachment
                url={attachmentUrls[message.attachmentPath]}
                name={message.attachmentName ?? tr('ملف', 'File')}
                type={message.attachmentType ?? 'file'}
                label={tr('جارٍ تجهيز المرفق...', 'Preparing attachment...')}
              />
            )}
            {message.text && <p>{message.text}</p>}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {attachError && <p className="chat-attach-error" role="status" aria-live="polite">{attachError}</p>}

      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.zip,.rar,.7z,.doc,.docx,.psd,.fig,.ai,.mp4,.mov,.xls,.xlsx"
          hidden
          onChange={handleFilesSelected}
        />
        <button
          type="button"
          className="glass chat-attach-btn"
          onMouseMove={trackGlow}
          aria-label={tr('إرفاق ملف أو صورة', 'Attach a file or image')}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="spin" size={16} /> : <Paperclip size={16} />}
        </button>
        <input
          type="text"
          placeholder={tr('اكتب رسالتك...', 'Type your message...')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={busy}
        />
        <button type="submit" className="glass" onMouseMove={trackGlow} aria-label={tr('إرسال', 'Send')} disabled={busy || !text.trim()}>
          {sending ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}

function ChatAttachment({ url, name, type, label }: { url: string | undefined; name: string; type: 'image' | 'file'; label: string }) {
  if (!url) {
    return (
      <div className="chat-attachment chat-attachment-loading">
        <Loader2 className="spin" size={14} /> <span>{label}</span>
      </div>
    )
  }

  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="chat-attachment chat-attachment-image">
        <img src={url} alt={name} loading="lazy" />
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="chat-attachment chat-attachment-file">
      <FileText size={18} />
      <span className="chat-attachment-name">{name}</span>
      <Download size={15} />
    </a>
  )
}
