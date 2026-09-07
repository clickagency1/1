import { Link, useRouterState } from '@tanstack/react-router'
import { Mail, MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../lib/i18n'
import { trackGlow } from '../lib/liquid-glass'
import { getOrCreateSupportTicket, type SupportTicket } from '../lib/store'
import { useAuthUser } from '../lib/use-auth-user'
import { SupportChatPanel } from './SupportChatPanel'

const SUPPORT_EMAIL = 'support@clickagency.online'

type WidgetView = 'closed' | 'menu' | 'chat'

export function SupportWidget() {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { user, loading } = useAuthUser()
  const [view, setView] = useState<WidgetView>('closed')
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [ticketError, setTicketError] = useState('')
  const [ticketLoading, setTicketLoading] = useState(false)

  // فريق الدعم والأدمن عندهم لوحاتهم الخاصة أصلًا (/support و/admin)، مش
  // محتاجين الودجت ده يظهرلهم فوق شغلهم.
  const hideOnRoute = pathname.startsWith('/support') || pathname.startsWith('/admin')

  // زرار "سماعة" الدعم بقى في هيدر كل صفحة (SupportButton) بدل الفقاعة
  // العايمة القديمة؛ بيبعت الحدث ده وإحنا بنفتح/نقفل بيه لوحة الدعم.
  useEffect(() => {
    const handleOpen = () => setView((current) => (current === 'closed' ? 'menu' : 'closed'))
    window.addEventListener('open-support-widget', handleOpen)
    return () => window.removeEventListener('open-support-widget', handleOpen)
  }, [])

  useEffect(() => {
    if (view !== 'chat' || !user || ticket) return
    setTicketLoading(true)
    setTicketError('')
    getOrCreateSupportTicket({
      clientId: user.id,
      clientEmail: user.email ?? null,
      clientName: (user.user_metadata?.full_name as string | undefined) || user.email || tr('العميل', 'Client'),
    })
      .then(setTicket)
      .catch(() => setTicketError(tr('تعذر فتح الدردشة دلوقتي. جرّب تاني بعد شوية أو راسلنا على الإيميل.', 'Could not open the chat right now. Please try again shortly or email us.')))
      .finally(() => setTicketLoading(false))
  }, [view, user, ticket, tr])

  if (loading || hideOnRoute || view === 'closed') return null

  const close = () => setView('closed')
  const clientName = (user?.user_metadata?.full_name as string | undefined) || user?.email || tr('العميل', 'Client')

  return (
    <div className="support-widget">
      <div className="support-panel glass">
        <div className="support-panel-head">
          <span>{view === 'chat' ? tr('الدردشة مع خدمة العملاء', 'Chat with customer support') : tr('الدعم والمساعدة', 'Support & help')}</span>
          <button type="button" className="support-panel-close" onClick={close} aria-label={tr('إغلاق', 'Close')}>
            <X size={16} />
          </button>
        </div>

        {view === 'menu' && (
          <div className="support-options">
            <a
              className="support-option glass"
              onMouseMove={trackGlow}
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              <Mail size={18} />
              <span>
                {tr('راسلنا عبر الإيميل', 'Email us')}
                <small>{SUPPORT_EMAIL}</small>
              </span>
            </a>
            <button
              type="button"
              className="support-option glass"
              onMouseMove={trackGlow}
              onClick={() => setView('chat')}
            >
              <MessageCircle size={18} />
              <span>
                {tr('دردشة مباشرة', 'Live chat')}
                <small>{tr('تحدّث الآن مع فريق خدمة العملاء', 'Talk now with the customer support team')}</small>
              </span>
            </button>
          </div>
        )}

        {view === 'chat' && (
          <div className="support-chat">
            {!user ? (
              <div className="support-chat-locked">
                <p>{tr('لازم تسجّل دخولك الأول عشان تقدر تدردش مباشرة مع فريق الدعم.', 'You need to sign in first to chat directly with the support team.')}</p>
                <Link to="/" className="button button-primary glass-shine" onMouseMove={trackGlow} onClick={close}>
                  {tr('تسجيل الدخول', 'Sign in')}
                </Link>
              </div>
            ) : ticketLoading ? (
              <p className="support-chat-status">{tr('جارٍ فتح الدردشة...', 'Opening the chat...')}</p>
            ) : ticketError ? (
              <p className="support-chat-status">{ticketError}</p>
            ) : ticket ? (
              <SupportChatPanel ticketId={ticket.id} role="client" senderName={clientName} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
