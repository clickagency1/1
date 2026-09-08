import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SupportChatPanel } from '../components/SupportChatPanel'
import { trackGlow } from '../lib/liquid-glass'
import {
  closeSupportTicket,
  listSupportTicketsForStaff,
  subscribeToSupportStore,
  type SupportTicket,
} from '../lib/store'
import { useAuthUser } from '../lib/use-auth-user'

export const Route = createFileRoute('/support')({
  component: SupportPage,
})

const STATUS_LABEL: Record<SupportTicket['status'], string> = {
  open: 'مفتوحة',
  closed: 'مقفولة',
}

function SupportPage() {
  const { user, loading, isSupportStaff } = useAuthUser()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupportStaff) return
    let active = true
    const refresh = () => {
      listSupportTicketsForStaff()
        .then((data) => {
          if (active) setTickets(data)
        })
        .catch(() => {
          if (active) setTickets([])
        })
    }
    refresh()
    const unsubscribe = subscribeToSupportStore(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [isSupportStaff])

  if (loading) {
    return (
      <div className="dash-shell dash-center">
        <Loader2 className="spin" size={22} />
      </div>
    )
  }

  if (!isSupportStaff) {
    return (
      <div className="dash-shell dash-center">
        <ShieldAlert size={26} />
        <p>الصفحة دي مخصصة لفريق الدعم بس.</p>
        <Link to="/" className="button button-primary glass-shine" onMouseMove={trackGlow}>
          <ArrowRight size={18} /> الرجوع للموقع
        </Link>
      </div>
    )
  }

  const active = tickets.find((ticket) => ticket.id === activeId) ?? tickets[0] ?? null
  const staffName = (user!.user_metadata?.full_name as string | undefined) || 'فريق الدعم'

  return (
    <div className="dash-shell">
      <div className="dash-topbar">
        <Link to="/" className="dash-back glass" onMouseMove={trackGlow}><ArrowRight size={16} /> الموقع</Link>
        <h1>لوحة الدعم</h1>
      </div>

      {tickets.length === 0 ? (
        <div className="dash-empty"><p>لسه مفيش تذاكر دعم وصلت.</p></div>
      ) : (
        <div className="dash-grid">
          <aside className="dash-list">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                className={`dash-list-item glass ${active?.id === ticket.id ? 'is-active' : ''}`}
                onMouseMove={trackGlow}
                onClick={() => setActiveId(ticket.id)}
              >
                <span className="dash-list-service">{ticket.clientName || ticket.clientEmail}</span>
                <span className="dash-list-client">{ticket.clientEmail ?? 'بدون بريد إلكتروني (مسجّل بالجوال)'}</span>
                <span className={`dash-status dash-status-${ticket.status === 'closed' ? 'completed' : 'agreed'}`}>
                  {STATUS_LABEL[ticket.status]}
                </span>
              </button>
            ))}
          </aside>

          {active && <SupportTicketDetail ticket={active} staffName={staffName} />}
        </div>
      )}
    </div>
  )
}

function SupportTicketDetail({ ticket, staffName }: { ticket: SupportTicket; staffName: string }) {
  const [closing, setClosing] = useState(false)

  const handleClose = async () => {
    setClosing(true)
    try {
      await closeSupportTicket(ticket.id)
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="dash-detail">
      <div className="dash-detail-head">
        <div>
          <span className="dash-status-pill">{STATUS_LABEL[ticket.status]}</span>
          <h2>{ticket.clientName}</h2>
          <p className="dash-client">{ticket.clientEmail ?? 'بدون بريد إلكتروني (مسجّل بالجوال)'}</p>
        </div>
      </div>

      {ticket.status === 'open' && (
        <div className="dash-actions">
          <button type="button" className="button button-ghost glass" onMouseMove={trackGlow} onClick={handleClose} disabled={closing}>
            إنهاء المحادثة <CheckCircle2 size={16} />
          </button>
        </div>
      )}

      <div className="dash-chat-heading"><MessageCircle size={16} /> المحادثة مع العميل</div>
      <SupportChatPanel
        ticketId={ticket.id}
        role="support"
        senderName={staffName}
        disabled={ticket.status === 'closed'}
      />
    </div>
  )
}
