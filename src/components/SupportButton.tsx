import { Headset } from 'lucide-react'
import { useLanguage } from '../lib/i18n'
import { trackGlow } from '../lib/liquid-glass'

/**
 * زرار "سماعة" بيظهر في هيدر الصفحة. مش بيفتح حاجة بنفسه — بس بيبعت حدث
 * عام (`open-support-widget`) والـ SupportWidget (اللي شغال طول الوقت جوه
 * الصفحة) هو اللي بيسمعه ويفتح لوحة الدعم. الطريقة دي بتخلي أي هيدر في أي
 * صفحة يقدر يفتح نفس لوحة الدعم من غير ما يعرف أي تفاصيل عنها.
 */
export function SupportButton({ className = '' }: { className?: string }) {
  const { language } = useLanguage()
  const label = language === 'ar' ? 'الدعم والمساعدة' : 'Support & help'
  return (
    <button
      type="button"
      className={`header-support-btn glass ${className}`.trim()}
      onMouseMove={trackGlow}
      onClick={() => window.dispatchEvent(new CustomEvent('open-support-widget'))}
      aria-label={label}
      title={label}
    >
      <Headset size={18} />
    </button>
  )
}
