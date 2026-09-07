import { CheckCircle2, Download, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useLanguage } from '../lib/i18n'
import { trackGlow } from '../lib/liquid-glass'
import { downloadElementAsPdf } from '../lib/pdf'
import { getReceiptNumber } from '../lib/receipt-number'
import type { ServiceRequest } from '../lib/store'
import { Receipt } from './Receipt'

interface PaymentSuccessModalProps {
  request: ServiceRequest
  clientName: string
  clientEmail: string | null
  onClose: () => void
}

export function PaymentSuccessModal({ request, clientName, clientEmail, onClose }: PaymentSuccessModalProps) {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!receiptRef.current || downloading) return
    setDownloading(true)
    try {
      await downloadElementAsPdf(receiptRef.current, `${getReceiptNumber(request)}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="success-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="success-modal glass" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label={tr('إغلاق', 'Close')}><X size={18} /></button>
        <div className="success-modal-icon"><CheckCircle2 size={32} /></div>
        <h2>{tr('تم الدفع بنجاح', 'Payment successful')}</h2>
        <p>{tr(
          `شكرًا ليك! استلمنا دفعتك عن طلب "${request.service}" وهنبدأ التنفيذ. تقدر تحمّل إيصال الدفع الرسمي دلوقتي أو أي وقت تاني.`,
          `Thank you! We received your payment for "${request.service}" and we'll start work on it. You can download the official payment receipt now or anytime later.`,
        )}</p>
        <div className="success-modal-actions">
          <button type="button" className="auth-submit glass-shine" onMouseMove={trackGlow} onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
            {downloading ? tr('جارٍ تجهيز الإيصال...', 'Preparing the receipt...') : tr('تحميل إيصال الدفع (PDF)', 'Download payment receipt (PDF)')}
          </button>
          <button type="button" className="button button-ghost glass" onMouseMove={trackGlow} onClick={onClose}>
            {tr('تم', 'Done')}
          </button>
        </div>
      </div>

      {/* العنصر الفعلي اللي بيتصوّر — موجود جوه الصفحة (مش display:none) لكن مرسوم خارج حدود الشاشة. */}
      <Receipt ref={receiptRef} request={request} clientName={clientName} clientEmail={clientEmail} />
    </div>
  )
}
