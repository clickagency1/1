import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, ShieldAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { ChatPanel } from '../components/ChatPanel'
import { Countdown } from '../components/Countdown'
import { trackGlow } from '../lib/liquid-glass'
import { listRequests, saveOffer, subscribeToStore, updateRequestStatus, type ServiceRequest } from '../lib/store'
import { useAuthUser } from '../lib/use-auth-user'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

const STATUS_LABEL: Record<ServiceRequest['status'], string> = {
  submitted: 'طلب جديد',
  priced: 'بانتظار موافقة العميل',
  accepted: 'تمت موافقة العميل',
  rejected: 'رفض العميل العرض',
  agreed: 'بانتظار الدفع',
  paid: 'قيد التنفيذ',
  completed: 'تم التسليم',
}

function AdminPage() {
  const { user, loading, isAdmin } = useAuthUser()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    const refresh = () => {
      listRequests()
        .then((data) => {
          if (active) setRequests(data)
        })
        .catch(() => {
          if (active) setRequests([])
        })
    }
    refresh()
    const unsubscribe = subscribeToStore(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [isAdmin])

  if (loading) {
    return (
      <div className="dash-shell dash-center">
        <Loader2 className="spin" size={22} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="dash-shell dash-center">
        <ShieldAlert size={26} />
        <p>الصفحة دي مخصصة لفريق كليك بس.</p>
        <Link to="/" className="button button-primary glass-shine" onMouseMove={trackGlow}>
          <ArrowRight size={18} /> الرجوع للموقع
        </Link>
      </div>
    )
  }

  const active = requests.find((request) => request.id === activeId) ?? requests[0] ?? null
  const adminName = (user!.user_metadata?.full_name as string | undefined) || 'فريق كليك'

  return (
    <div className="dash-shell">
      <div className="dash-topbar">
        <Link to="/" className="dash-back glass" onMouseMove={trackGlow}><ArrowRight size={16} /> الموقع</Link>
        <h1>لوحة التحكم</h1>
      </div>

      {requests.length === 0 ? (
        <div className="dash-empty"><p>لسه مفيش طلبات وصلت.</p></div>
      ) : (
        <div className="dash-grid">
          <aside className="dash-list">
            {requests.map((request) => (
              <button
                key={request.id}
                className={`dash-list-item glass ${active?.id === request.id ? 'is-active' : ''}`}
                onMouseMove={trackGlow}
                onClick={() => setActiveId(request.id)}
              >
                <span className="dash-list-service">{request.service}</span>
                <span className="dash-list-client">{request.clientName || request.clientEmail}</span>
                <span className={`dash-status dash-status-${request.status}`}>{STATUS_LABEL[request.status]}</span>
              </button>
            ))}
          </aside>

          {active && <AdminRequestDetail request={active} adminName={adminName} />}
        </div>
      )}
    </div>
  )
}

function AdminRequestDetail({ request, adminName }: { request: ServiceRequest; adminName: string }) {
  const [price, setPrice] = useState(request.price?.toString() ?? '')
  const [deliverable, setDeliverable] = useState(request.deliverable ?? '')
  const [deadline, setDeadline] = useState(request.deadline ? request.deadline.slice(0, 10) : '')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSaveTerms = async (event: FormEvent) => {
    event.preventDefault()
    const parsedPrice = Number(price)
    if (!parsedPrice || !deliverable.trim() || !deadline) return
    setSubmitting(true)
    setErrorMessage('')
    try {
      await saveOffer(request.id, {
        price: parsedPrice,
        deliverable: deliverable.trim(),
        deadline: new Date(deadline).toISOString(),
      })
      // لازم نحول الحالة لـ "priced" في أول مرة، وكمان لو العميل كان رفض
      // عرض قديم وعدّلنا السعر/المدة تاني، عشان يوصله العرض الجديد ويظهرله
      // زرار القبول/الرفض تاني.
      if (request.status === 'submitted' || request.status === 'rejected') {
        await updateRequestStatus(request.id, 'priced')
      }
    } catch (error) {
      // فشل صامت هنا كان بيخلي العرض ميوصلش للعميل من غير أي تنبيه للأدمن.
      setErrorMessage(
        error instanceof Error
          ? `تعذر حفظ العرض: ${error.message}`
          : 'تعذر حفظ العرض. تأكد إن حسابك عليه صلاحية أدمن في جدول profiles وحاول مرة أخرى.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const markAgreed = async () => {
    setSubmitting(true)
    try {
      await updateRequestStatus(request.id, 'agreed')
    } finally {
      setSubmitting(false)
    }
  }

  const markCompleted = async () => {
    setSubmitting(true)
    try {
      await updateRequestStatus(request.id, 'completed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dash-detail">
      <div className="dash-detail-head">
        <div>
          <span className="dash-status-pill">{STATUS_LABEL[request.status]}</span>
          <h2>{request.service}</h2>
          <p className="dash-client">{request.clientName}{request.clientEmail ? ` · ${request.clientEmail}` : ''}</p>
        </div>
      </div>
      <p className="dash-description">{request.description}</p>

      <form className="auth-form dash-terms-form" onSubmit={handleSaveTerms}>
        <label className="auth-field">
          <input type="number" min="0" placeholder="السعر (ريال)" value={price} onChange={(event) => setPrice(event.target.value)} />
        </label>
        <label className="auth-field auth-field-textarea">
          <textarea
            placeholder="وصف ما سيتم تسليمه"
            value={deliverable}
            onChange={(event) => {
              setDeliverable(event.target.value)
              const el = event.target
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
            rows={1}
          />
        </label>
        <label className="auth-field">
          <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
        </label>
        <button type="submit" className="auth-submit glass-shine" onMouseMove={trackGlow} disabled={submitting}>حفظ السعر والمدة</button>
        {errorMessage && <p className="auth-modal-message" role="status" aria-live="polite">{errorMessage}</p>}
      </form>

      <div className="dash-actions">
        {request.status === 'accepted' && (
          <button type="button" className="button button-ghost glass" onMouseMove={trackGlow} onClick={markAgreed} disabled={submitting}>
            إصدار طلب الدفع <CheckCircle2 size={16} />
          </button>
        )}
        {request.status === 'paid' && (
          <button type="button" className="button button-ghost glass" onMouseMove={trackGlow} onClick={markCompleted} disabled={submitting}>
            تحديد كمكتمل <CheckCircle2 size={16} />
          </button>
        )}
      </div>

      {request.status === 'paid' && request.deadline && (
        <div className="countdown-box glass">
          <span>الوقت المتبقي للتسليم</span>
          <Countdown deadline={request.deadline} />
        </div>
      )}

      <div className="dash-chat-heading"><MessageCircle size={16} /> المحادثة مع العميل</div>
      <ChatPanel requestId={request.id} role="admin" senderName={adminName} />
    </div>
  )
}
