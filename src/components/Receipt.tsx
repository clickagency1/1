import { forwardRef } from 'react'
import { useLanguage } from '../lib/i18n'
import { getReceiptNumber } from '../lib/receipt-number'
import type { ServiceRequest } from '../lib/store'

interface ReceiptProps {
  request: ServiceRequest
  clientName: string
  clientEmail: string | null
}

const PAYMENT_METHOD_LABEL: Record<string, { ar: string; en: string }> = {
  card: { ar: 'بطاقة ائتمان/مدى', en: 'Credit/debit card' },
  'apple-pay': { ar: 'Apple Pay', en: 'Apple Pay' },
}

/**
 * إيصال الدفع الرسمي. المكوّن ده بيترسم مخفي عن الشاشة وبس بيتصوّر
 * بـ html-to-image وقت الحاجة (زر التحميل)، مش عنصر واجهة عادي.
 *
 * ملحوظة مهمة: الإخفاء (position/offset) موجود على غلاف خارجي (.receipt-offscreen)
 * مش على .receipt-doc نفسها. لو حطينا position:fixed + إزاحة ضخمة على
 * العنصر اللي بيتصوّر مباشرة، html-to-image بينسخ الـ inline style ده جوه
 * foreignObject له نظام إحداثيات مستقل، فالمحتوى بيتزحلق برّه حدود
 * الالتقاط ويطلع الملف صفحة بيضاء فاضية. الغلاف الخارجي بس هو اللي بيتحرك؛
 * .receipt-doc جواه بتتصرف بشكل طبيعي (static) فالتقاطها بيطلع سليم.
 *
 * شكل "إيصال بالعرض" (stub) بدل ورقة A4 طويلة: شريط جانبي غامق فيه الهوية
 * والرقم والمبلغ، وجسم أبيض فيه تفاصيل الخدمة بس — من غير تكرار اسم الشركة
 * أو الموقع أكتر من مرة زي التصميم القديم.
 *
 * لغة الإيصال نفسه بتتبع لغة الموقع وقت التحميل (عربي/إنجليزي)، بما في ذلك
 * اتجاه الورقة (rtl/ltr).
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(function Receipt(
  { request, clientName, clientEmail },
  ref,
) {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const locale = language === 'ar' ? 'ar-EG' : 'en-US'
  const receiptNumber = getReceiptNumber(request)
  const issuedDate = new Date(request.paidAt ?? Date.now())
  const dateLabel = issuedDate.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
  const timeLabel = issuedDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const paymentMethodLabel = request.paymentMethod
    ? PAYMENT_METHOD_LABEL[request.paymentMethod]?.[language] ?? request.paymentMethod
    : '—'

  return (
    <div className="receipt-offscreen">
    <div ref={ref} className="receipt-doc" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="receipt-stub">
        <div className="receipt-stub-pattern" aria-hidden="true" />
        <img className="receipt-stub-logo" src="/assets/logo-transparent.png" alt="Click" />

        <div className="receipt-stub-badge">✓ {tr('مدفوعة بنجاح', 'Paid successfully')}</div>

        <div className="receipt-stub-meta">
          <div><span>{tr('رقم الإيصال', 'Receipt number')}</span><strong dir="ltr">{receiptNumber}</strong></div>
          <div><span>{tr('التاريخ', 'Date')}</span><strong>{dateLabel}</strong></div>
          <div><span>{tr('الوقت', 'Time')}</span><strong dir="ltr">{timeLabel}</strong></div>
          <div><span>{tr('طريقة الدفع', 'Payment method')}</span><strong>{paymentMethodLabel}</strong></div>
        </div>

        <div className="receipt-stub-amount">
          <span>{tr('الإجمالي المدفوع', 'Total paid')}</span>
          <strong>{request.price?.toLocaleString(locale) ?? '—'} <em>{request.currency}</em></strong>
        </div>
      </aside>

      <div className="receipt-main">
        <div className="receipt-main-head">
          <h1>{tr('إيصال دفع رسمي', 'Official payment receipt')}</h1>
          <p>{tr('كليك لتطوير المواقع والتطبيقات', 'Click — Web & App Development')} — clickagency.online</p>
        </div>

        <div className="receipt-client-row">
          <div><span>{tr('العميل', 'Client')}</span><strong>{clientName}</strong></div>
          <div><span>{tr('البريد الإلكتروني', 'Email')}</span><strong dir="ltr">{clientEmail ?? '—'}</strong></div>
        </div>

        <div className="receipt-section">
          <h3>{tr('تفاصيل الخدمة', 'Service details')}</h3>
          <table className="receipt-table">
            <tbody>
              <tr>
                <td>{tr('الخدمة', 'Service')}</td>
                <td>{request.service}</td>
              </tr>
              <tr>
                <td>{tr('وصف الطلب', 'Request description')}</td>
                <td>{request.description}</td>
              </tr>
              {request.deliverable && (
                <tr>
                  <td>{tr('بنود التسليم', 'Deliverables')}</td>
                  <td>{request.deliverable}</td>
                </tr>
              )}
              {request.deadline && (
                <tr>
                  <td>{tr('موعد التسليم', 'Delivery date')}</td>
                  <td>{new Date(request.deadline).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="receipt-main-foot">
          <div className="receipt-stamp" aria-hidden="true">
            <img src="/assets/click-stamp.png" alt="" />
          </div>
          <div className="receipt-foot-text">
            <p className="receipt-thanks">{tr('شكرًا لثقتك في كليك. نتمنى لك تجربة رائعة مع خدمتنا.', 'Thank you for trusting Click. We hope you enjoy your experience with our service.')}</p>
            <p className="receipt-contact">
              <span dir="ltr">support@clickagency.online</span>
              <span dir="ltr">+20 100 428 7432</span>
              <span>{tr('المنوفية، مصر', 'Monufia, Egypt')}</span>
            </p>
            <p className="receipt-disclaimer">{tr('إيصال إلكتروني صادر آليًا ولا يحتاج توقيعًا لاعتماده.', 'This is an automatically generated electronic receipt and requires no signature.')}</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
})
