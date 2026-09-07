import { Link } from '@tanstack/react-router'
import { Check, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useLanguage } from '../lib/i18n'
import { createRequest, type ServiceRequest } from '../lib/store'
import { trackGlow } from '../lib/liquid-glass'

// الـ value بيفضل عربي دايمًا (هو اللي بيتخزن في الداتابيز ويتعرض في لوحة
// الأدمن)، والـ label بس هو اللي بيتغيّر مع اللغة.
const SERVICE_OPTIONS = [
  { value: 'مواقع وتجارب رقمية', labelEn: 'Websites & digital experiences' },
  { value: 'متاجر إلكترونية', labelEn: 'Online stores' },
  { value: 'أنظمة إدارة مخصصة', labelEn: 'Custom management systems' },
  { value: 'تطبيقات ومنتجات رقمية', labelEn: 'Apps & digital products' },
]

interface RequestModalProps {
  clientId: string
  clientEmail: string | null
  clientName: string
  onClose: () => void
}

export function RequestModal({ clientId, clientEmail, clientName, onClose }: RequestModalProps) {
  const { language } = useLanguage()
  const tr = <T,>(ar: T, en: T): T => (language === 'ar' ? ar : en)
  const [service, setService] = useState(SERVICE_OPTIONS[0].value)
  const [description, setDescription] = useState('')
  const [created, setCreated] = useState<ServiceRequest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleId = useId()

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!description.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const request = await createRequest({
        clientId,
        clientEmail,
        clientName,
        service,
        description: description.trim(),
      })
      setCreated(request)
    } catch {
      setError(tr('حصل خطأ أثناء إرسال الطلب. جرّب تاني.', 'Something went wrong while sending the request. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="auth-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="auth-modal glass" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseMove={trackGlow}>
        <button type="button" className="auth-modal-close glass" aria-label={tr('إغلاق', 'Close')} onClick={onClose} onMouseMove={trackGlow}>
          <X size={17} />
        </button>

        {created ? (
          <div className="request-success">
            <div className="request-success-icon"><Check size={22} /></div>
            <h2 id={titleId}>{tr('وصلنا طلبك', 'We got your request')}</h2>
            <p className="auth-modal-sub">
              {tr(
                'هنراجع تفاصيل مشروعك ونحدد السعر ونفتح معاك محادثة من لوحة طلباتك خلال وقت قصير.',
                "We'll review your project details, set the price, and open a chat with you from your requests dashboard shortly.",
              )}
            </p>
            <Link to="/account" className="auth-submit glass-shine" onMouseMove={trackGlow} onClick={onClose}>
              {tr('متابعة طلبي', 'Track my request')}
            </Link>
          </div>
        ) : (
          <>
            <h2 id={titleId}>{tr('لنبدأ مشروعك', "Let's start your project")}</h2>
            <p className="auth-modal-sub">{tr('احكِلنا باختصار عن اللي محتاجه، وهنرجعلك بسعر ومدة تسليم واضحين.', "Tell us briefly what you need, and we'll get back to you with a clear price and delivery time.")}</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field request-select">
                <select value={service} onChange={(event) => setService(event.target.value)}>
                  {SERVICE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{tr(option.value, option.labelEn)}</option>
                  ))}
                </select>
              </label>

              <label className="auth-field request-textarea-field">
                <textarea
                  ref={textareaRef}
                  placeholder={tr('اكتب وصف مشروعك أو الخدمة اللي محتاجها...', 'Describe your project or the service you need...')}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  required
                />
              </label>

              {error && <p className="auth-modal-message" role="status" aria-live="polite">{error}</p>}

              <button type="submit" className="auth-submit glass-shine" onMouseMove={trackGlow} disabled={submitting}>
                {submitting ? tr('جارٍ الإرسال...', 'Sending...') : <>{tr('إرسال الطلب', 'Send request')} <Send size={16} /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
