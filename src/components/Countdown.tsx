import { useEffect, useState } from 'react'
import { useLanguage } from '../lib/i18n'

function getRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  const clamped = Math.max(diff, 0)
  const days = Math.floor(clamped / (1000 * 60 * 60 * 24))
  const hours = Math.floor((clamped / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((clamped / (1000 * 60)) % 60)
  const seconds = Math.floor((clamped / 1000) % 60)
  return { diff, days, hours, minutes, seconds }
}

export function Countdown({ deadline }: { deadline: string }) {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const [remaining, setRemaining] = useState(() => getRemaining(deadline))

  useEffect(() => {
    const interval = setInterval(() => setRemaining(getRemaining(deadline)), 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remaining.diff <= 0) {
    return <div className="countdown countdown-done">{tr('انتهى الوقت المتفق عليه للتسليم', 'The agreed delivery time has ended')}</div>
  }

  return (
    <div className="countdown">
      <div className="countdown-cell"><strong>{remaining.days}</strong><span>{tr('يوم', 'days')}</span></div>
      <div className="countdown-cell"><strong>{String(remaining.hours).padStart(2, '0')}</strong><span>{tr('ساعة', 'hrs')}</span></div>
      <div className="countdown-cell"><strong>{String(remaining.minutes).padStart(2, '0')}</strong><span>{tr('دقيقة', 'min')}</span></div>
      <div className="countdown-cell"><strong>{String(remaining.seconds).padStart(2, '0')}</strong><span>{tr('ثانية', 'sec')}</span></div>
    </div>
  )
}
