import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Banknote, CalendarClock, CheckCircle2, Download, Loader2, MessageCircle, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChatPanel } from '../components/ChatPanel'
import { Countdown } from '../components/Countdown'
import { LanguageToggleInline } from '../components/LanguageToggle'
import { PaymentSuccessModal } from '../components/PaymentSuccessModal'
import { Receipt } from '../components/Receipt'
import { SupportButton } from '../components/SupportButton'
import { useLanguage } from '../lib/i18n'
import { trackGlow } from '../lib/liquid-glass'
import { downloadElementAsPdf } from '../lib/pdf'
import { getReceiptNumber } from '../lib/receipt-number'
import { createPaymentIntention, listRequestsForClient, subscribeToStore, updateRequestStatus, type ServiceRequest } from '../lib/store'
import { useAuthUser } from '../lib/use-auth-user'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

const STATUS_LABEL: Record<ServiceRequest['status'], { ar: string; en: string }> = {
  submitted: { ar: 'بانتظار المراجعة', en: 'Awaiting review' },
  priced: { ar: 'تم تحديد السعر', en: 'Price set' },
  accepted: { ar: 'تمت موافقتك على العرض', en: 'You accepted the offer' },
  rejected: { ar: 'تم رفض العرض', en: 'Offer rejected' },
  agreed: { ar: 'بانتظار الدفع', en: 'Awaiting payment' },
  paid: { ar: 'قيد التنفيذ', en: 'In progress' },
  completed: { ar: 'تم التسليم', en: 'Delivered' },
}

function AccountPage() {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const { user, loading } = useAuthUser()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [justPaidId, setJustPaidId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    const refresh = () => {
      listRequestsForClient(user.id)
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
  }, [user])

  // لو رجعنا من صفحة دفع XPay (رابط ?paid=<requestId>)، افتح بوب أب "تم الدفع
  // بنجاح" لنفس الطلب ده، وامسح الباراميتر من الرابط عشان لو المستخدم عمل
  // ريفريش بعدين ميظهرش تاني.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paidId = params.get('paid')
    if (!paidId) return
    setJustPaidId(paidId)
    setActiveId(paidId)
    params.delete('paid')
    const newSearch = params.toString()
    window.history.replaceState({}, '', newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname)
  }, [])

  if (loading) {
    return (
      <div className="dash-shell dash-center">
        <Loader2 className="spin" size={22} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="dash-shell dash-center">
        <p>{tr('لازم تسجّل دخولك الأول عشان تشوف طلباتك.', 'You need to sign in first to see your requests.')}</p>
        <Link to="/" className="button button-primary glass-shine" onMouseMove={trackGlow}>
          <ArrowRight size={18} /> {tr('الرجوع للموقع', 'Back to the site')}
        </Link>
      </div>
    )
  }

  const active = requests.find((request) => request.id === activeId) ?? requests[0] ?? null
  const clientName = (user.user_metadata?.full_name as string | undefined) || user.email || tr('العميل', 'Client')

  return (
    <div className="dash-shell">
      <div className="dash-topbar">
        <Link to="/" className="dash-back glass" onMouseMove={trackGlow}><ArrowRight size={16} /> {tr('الموقع', 'Website')}</Link>
        <h1>{tr('طلباتي', 'My requests')}</h1>
        <div className="dash-topbar-actions">
          <LanguageToggleInline />
          <SupportButton />
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="dash-empty">
          <p>{tr('لسه معندكش طلبات. ابدأ مشروعك من الصفحة الرئيسية.', "You don't have any requests yet. Start your project from the homepage.")}</p>
          <Link to="/" className="button button-primary glass-shine" onMouseMove={trackGlow}>{tr('ابدأ مشروعك', 'Start your project')}</Link>
        </div>
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
                <span className={`dash-status dash-status-${request.status}`}>{STATUS_LABEL[request.status][language]}</span>
              </button>
            ))}
          </aside>

          {active && <RequestDetail request={active} clientName={clientName} clientEmail={user.email ?? null} />}
        </div>
      )}

      {justPaidId && requests.find((request) => request.id === justPaidId) && (
        <PaymentSuccessModal
          request={requests.find((request) => request.id === justPaidId)!}
          clientName={clientName}
          clientEmail={user.email ?? null}
          onClose={() => setJustPaidId(null)}
        />
      )}
    </div>
  )
}

function RequestDetail({
  request,
  clientName,
  clientEmail,
}: {
  request: ServiceRequest
  clientName: string
  clientEmail: string | null
}) {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const locale = language === 'ar' ? 'ar-EG' : 'en-US'
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  // العميل يقدر يحمّل إيصاله في أي وقت (مش بس أول ما يدفع)، طول ما الطلب
  // اتدفع فعلًا — بنعتمد على paidAt نفسه (مش status) عشان الزرار يفضل ظاهر
  // حتى بعد ما الطلب يتحول لـ completed.
  const canDownloadReceipt = Boolean(request.paidAt)

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || downloading) return
    setDownloading(true)
    try {
      await downloadElementAsPdf(receiptRef.current, `${getReceiptNumber(request)}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  const handleAccept = async () => {
    setSubmitting(true)
    setErrorMessage('')
    try {
      await updateRequestStatus(request.id, 'accepted')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : tr('تعذر تسجيل موافقتك. حاول مرة أخرى.', 'Could not record your approval. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    setSubmitting(true)
    setErrorMessage('')
    try {
      await updateRequestStatus(request.id, 'rejected')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : tr('تعذر تسجيل رفضك. حاول مرة أخرى.', 'Could not record your rejection. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayNow = async () => {
    setPayLoading(true)
    setPayError('')
    try {
      const checkoutUrl = await createPaymentIntention(request.id)
      window.location.href = checkoutUrl
    } catch (error) {
      setPayError(error instanceof Error ? error.message : tr('تعذر بدء عملية الدفع. حاول مرة أخرى.', 'Could not start the payment process. Please try again.'))
      setPayLoading(false)
    }
  }

  return (
    <div className="dash-detail">
      <div className="dash-detail-head">
        <div>
          <span className="dash-status-pill">{STATUS_LABEL[request.status][language]}</span>
          <h2>{request.service}</h2>
        </div>
        {canDownloadReceipt && (
          <button
            type="button"
            className="button button-ghost glass dash-receipt-btn"
            onMouseMove={trackGlow}
            onClick={handleDownloadReceipt}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
            {downloading ? tr('جارٍ التجهيز...', 'Preparing...') : tr('تحميل الإيصال', 'Download receipt')}
          </button>
        )}
      </div>
      <p className="dash-description">{request.description}</p>

      {request.price != null && (
        <div className="dash-terms">
          <div className="dash-term"><Banknote size={16} /> {tr('السعر', 'Price')}: {request.price.toLocaleString(locale)} {request.currency}</div>
          {request.deliverable && <div className="dash-term"><CheckCircle2 size={16} /> {request.deliverable}</div>}
          {request.deadline && (
            <div className="dash-term"><CalendarClock size={16} /> {tr('التسليم', 'Delivery')}: {new Date(request.deadline).toLocaleDateString(locale)}</div>
          )}
        </div>
      )}

      {request.status === 'priced' && (
        <div className="offer-box glass">
          <p>{tr('راجع العرض وأكد موافقتك ليتم تجهيز فاتورة الدفع، أو ارفضه لو مش مناسب.', "Review the offer and confirm to prepare the payment invoice, or reject it if it doesn't work for you.")}</p>
          <div className="dash-actions">
            <button
              type="button"
              className="auth-submit glass-shine"
              onMouseMove={trackGlow}
              onClick={handleAccept}
              disabled={submitting}
            >
              {tr('أوافق على العرض', 'Accept the offer')} <CheckCircle2 size={16} />
            </button>
            <button
              type="button"
              className="button button-ghost glass"
              onMouseMove={trackGlow}
              onClick={handleReject}
              disabled={submitting}
            >
              {tr('أرفض العرض', 'Reject the offer')} <XCircle size={16} />
            </button>
          </div>
          {errorMessage && <p className="auth-modal-message" role="status" aria-live="polite">{errorMessage}</p>}
        </div>
      )}

      {request.status === 'accepted' && (
        <div className="offer-box glass"><p>{tr('تم تسجيل موافقتك. سيقوم الفريق بإصدار طلب الدفع بعد تثبيت تفاصيل التسليم.', "Your approval has been recorded. The team will issue the payment request once delivery details are finalized.")}</p></div>
      )}

      {request.status === 'rejected' && (
        <div className="offer-box glass"><p>{tr('تم تسجيل رفضك للعرض. سيتواصل معك فريق كليك أو يرسل لك عرضًا معدّلًا.', 'Your rejection has been recorded. The Click team will contact you or send a revised offer.')}</p></div>
      )}

      {request.status === 'agreed' && (
        <div className="pay-box glass">
          <p className="pay-demo-note">{tr('هيتم تحويلك لصفحة دفع آمنة تابعة لبوابة الدفع. مش هنطلب بيانات بطاقتك من موقعنا.', "You'll be redirected to a secure payment gateway page. We never ask for your card details on our site.")}</p>
          <button
            type="button"
            className="auth-submit glass-shine"
            onMouseMove={trackGlow}
            onClick={handlePayNow}
            disabled={payLoading}
          >
            {payLoading ? <Loader2 className="spin" size={16} /> : <Banknote size={16} />}
            {payLoading ? tr('جارٍ تجهيز الدفع...', 'Preparing payment...') : tr(`ادفع الآن — ${request.price?.toLocaleString('ar-EG') ?? ''} ${request.currency}`, `Pay now — ${request.price?.toLocaleString('en-US') ?? ''} ${request.currency}`)}
          </button>
          {payError && <p className="auth-modal-message" role="status" aria-live="polite">{payError}</p>}
        </div>
      )}

      {request.status === 'paid' && request.deadline && (
        <div className="countdown-box glass">
          <span>{tr('الوقت المتبقي للتسليم', 'Time remaining for delivery')}</span>
          <Countdown deadline={request.deadline} />
        </div>
      )}

      <div className="dash-chat-heading"><MessageCircle size={16} /> {tr('المحادثة مع فريق كليك', 'Chat with the Click team')}</div>
      <ChatPanel requestId={request.id} role="client" senderName={clientName} />

      {/* العنصر الفعلي اللي بيتصوّر لتحميل الإيصال — موجود جوه الصفحة (مش
          display:none) لكن مرسوم خارج حدود الشاشة، طول ما الطلب مدفوع. */}
      {canDownloadReceipt && (
        <Receipt ref={receiptRef} request={request} clientName={clientName} clientEmail={clientEmail} />
      )}
    </div>
  )
}
