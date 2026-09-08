import { Link, createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useLanguage } from '../lib/i18n'
import { trackGlow } from '../lib/liquid-glass'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { language } = useLanguage()
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  // Supabase بيبعت المستخدم لهنا برابط فيه recovery token في الـ URL،
  // ولما الصفحة تفتح، الـ supabase-js client بيمسك التوكن ده تلقائيًا
  // ويبعت حدث PASSWORD_RECOVERY. لحد ما الحدث ده يوصل، مينفعش نعرض الفورم.
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')
  const [linkError, setLinkError] = useState('')

  useEffect(() => {
    // لو الرابط نفسه منتهي الصلاحية أو مستخدم قبل كده، سوبابيز بترجّع بارامتر
    // error/error_description جاهز في الـ URL (سواء في الـ hash أو الـ query)
    // بدل ما تبعت PASSWORD_RECOVERY. من غير الكود ده، الصفحة كانت تفضل
    // "جارٍ التحقق..." للأبد من غير أي رسالة توضح للمستخدم إن الرابط باظ.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const searchParams = new URLSearchParams(window.location.search)
    const errorDescription =
      hashParams.get('error_description') || searchParams.get('error_description')
    if (errorDescription) {
      setLinkError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')))
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // لو الجلسة كانت متسجلة قبل ما الـ event يوصل (تحديث الصفحة مثلًا)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    // مهلة أمان: لو بعد ٦ ثواني الرابط لسه ما اتقبلش ومفيش رسالة خطأ صريحة
    // من سوبابيز (مثلًا الرابط اتفتح من متصفح/جهاز مختلف عن اللي طلب منه
    // إعادة التعيين)، نوقف السبينر ونوضح المشكلة بدل ما نسيبها تدور للأبد.
    const timeout = window.setTimeout(() => {
      setReady((current) => {
        if (!current) {
          setLinkError((currentError) =>
            currentError ||
            tr(
              'تعذر التحقق من رابط إعادة التعيين. جرّب تفتح الرابط في نفس المتصفح والجهاز اللي طلبت منه إعادة التعيين، أو اطلب رابطًا جديدًا.',
              'Could not verify the reset link. Try opening it in the same browser and device you requested the reset from, or request a new link.',
            ),
          )
        }
        return current
      })
    }, 6000)
    return () => {
      subscription.subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [tr])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (password.length < 6) {
      setMessage(tr('كلمة المرور لازم تكون 6 أحرف على الأقل.', 'The password must be at least 6 characters.'))
      return
    }
    if (password !== confirmPassword) {
      setMessage(tr('كلمتا المرور غير متطابقتين.', 'The passwords do not match.'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      // بعد تغيير كلمة المرور، نسجّل خروج من كل الأجهزة/التبويبات التانية
      // (scope: 'global') عشان أي جلسة قديمة تتلغي فورًا بدل ما تفضل شغالة
      // بكلمة المرور القديمة.
      await supabase.auth.signOut({ scope: 'global' })
      setDone(true)
    } catch {
      setMessage(tr('تعذر تحديث كلمة المرور. جرّب تطلب رابط إعادة تعيين جديد.', 'Could not update the password. Try requesting a new reset link.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dash-shell dash-center">
      <div className="auth-modal glass" style={{ position: 'static', maxWidth: 380, width: '100%' }}>
        <h2>{tr('إعادة تعيين كلمة المرور', 'Reset password')}</h2>

        {done ? (
          <>
            <p className="auth-modal-sub">
              <CheckCircle2 size={16} style={{ verticalAlign: '-2px', marginLeft: 6 }} />
              {tr(
                'تم تحديث كلمة المرور بنجاح، وتم تسجيل خروجك من كل الأجهزة الأخرى. تقدر تسجّل دخولك دلوقتي بكلمة المرور الجديدة.',
                'Your password has been updated, and you have been signed out of all other devices. You can sign in now with your new password.',
              )}
            </p>
            <Link to="/" className="button button-primary glass-shine" onMouseMove={trackGlow}>
              {tr('الرجوع للموقع', 'Back to the site')}
            </Link>
          </>
        ) : linkError ? (
          <>
            <p className="auth-modal-message" role="status" aria-live="polite">{linkError}</p>
            <Link to="/" className="button button-primary glass-shine" onMouseMove={trackGlow}>
              {tr('الرجوع للموقع وطلب رابط جديد', 'Back to the site to request a new link')}
            </Link>
          </>
        ) : !ready ? (
          <div className="dash-center" style={{ padding: '24px 0' }}>
            <Loader2 className="spin" size={22} />
            <p className="auth-modal-sub">{tr('جارٍ التحقق من رابط إعادة التعيين...', 'Verifying the reset link...')}</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <Lock size={16} aria-hidden="true" />
              <input
                type="password"
                placeholder={tr('كلمة المرور الجديدة', 'New password')}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <label className="auth-field">
              <Lock size={16} aria-hidden="true" />
              <input
                type="password"
                placeholder={tr('تأكيد كلمة المرور', 'Confirm password')}
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" className="auth-submit glass-shine" onMouseMove={trackGlow} disabled={loading}>
              {loading ? tr('جارٍ الحفظ...', 'Saving...') : tr('حفظ كلمة المرور', 'Save password')}
            </button>
          </form>
        )}

        {message && <p className="auth-modal-message" role="status" aria-live="polite">{message}</p>}
      </div>
    </div>
  )
}
