import { Languages } from 'lucide-react'
import { trackGlow } from '../lib/liquid-glass'
import { useLanguage } from '../lib/i18n'

/**
 * زرار تبديل لغة الموقع كله. بيتحط جوه هيدر كل صفحة بنفسها (مش عايم فوق
 * الصفحة زي قبل كده) عشان يبقى جزء طبيعي من شريط التنقل بدل ما يتصادم
 * بصريًا مع حاجات تانية زي قائمة الحساب المنسدلة.
 */
export function LanguageToggleInline({ className = '' }: { className?: string }) {
  const { language, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      className={`glass-pill lang-toggle ${className}`.trim()}
      onMouseMove={trackGlow}
      onClick={toggleLanguage}
      aria-label={language === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
    >
      <Languages size={14} aria-hidden="true" />
      <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  )
}
