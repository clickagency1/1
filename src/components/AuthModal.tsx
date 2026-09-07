import { ChevronDown, Lock, Mail, Phone, RotateCw, User, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { useLanguage } from '../lib/i18n'
import { trackGlow } from '../lib/liquid-glass'

export type AuthView = 'login' | 'signup'
export type AuthMethod = 'email' | 'phone'

// أكواد الدول: بيبان منها في القايمة، والعميل بيكتب رقمه المحلي بس من غيرها.
// مرتبة بحيث مصر (مقر الشركة) في الأول وبعدها باقي دول الخليج والعربي، وفي
// الآخر شوية دول عالمية شائعة.
interface CountryCode {
  code: string // ISO الدولة، مستخدم كـ value فريدة في القايمة
  dial: string // كود الاتصال الدولي
  flag: string
  name: string
  nameEn: string
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'EG', dial: '+20', flag: '🇪🇬', name: 'مصر', nameEn: 'Egypt' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'السعودية', nameEn: 'Saudi Arabia' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'الإمارات', nameEn: 'UAE' },
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'الكويت', nameEn: 'Kuwait' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'قطر', nameEn: 'Qatar' },
  { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'البحرين', nameEn: 'Bahrain' },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'عمان', nameEn: 'Oman' },
  { code: 'JO', dial: '+962', flag: '🇯🇴', name: 'الأردن', nameEn: 'Jordan' },
  { code: 'LB', dial: '+961', flag: '🇱🇧', name: 'لبنان', nameEn: 'Lebanon' },
  { code: 'IQ', dial: '+964', flag: '🇮🇶', name: 'العراق', nameEn: 'Iraq' },
  { code: 'PS', dial: '+970', flag: '🇵🇸', name: 'فلسطين', nameEn: 'Palestine' },
  { code: 'SY', dial: '+963', flag: '🇸🇾', name: 'سوريا', nameEn: 'Syria' },
  { code: 'YE', dial: '+967', flag: '🇾🇪', name: 'اليمن', nameEn: 'Yemen' },
  { code: 'SD', dial: '+249', flag: '🇸🇩', name: 'السودان', nameEn: 'Sudan' },
  { code: 'LY', dial: '+218', flag: '🇱🇾', name: 'ليبيا', nameEn: 'Libya' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'تونس', nameEn: 'Tunisia' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'الجزائر', nameEn: 'Algeria' },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'المغرب', nameEn: 'Morocco' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'أمريكا', nameEn: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'بريطانيا', nameEn: 'United Kingdom' },
]

const EMAIL_OTP_LENGTH = 8
// طول الكود ده لازم يطابق "SMS OTP Length" المضبوط في Supabase Dashboard
// (Authentication → Providers → Phone).
const PHONE_OTP_LENGTH = 6

interface AuthModalProps {
  view: AuthView
  onSwitchView: (view: AuthView) => void
  onClose: () => void
  onGoogleLogin: () => void
  onEmailAuth: (email: string, password: string, name?: string) => void
  otpEmail: string | null
  onVerifyOtp: (token: string) => void
  onResendOtp: () => void
  onForgotPassword: (email: string) => void
  onPhoneAuth: (phone: string, name?: string) => void
  otpPhone: string | null
  onVerifyPhoneOtp: (token: string) => void
  onResendPhoneOtp: () => void
  loading: boolean
  message: string
}

export function AuthModal({
  view,
  onSwitchView,
  onClose,
  onGoogleLogin,
  onEmailAuth,
  otpEmail,
  onVerifyOtp,
  onResendOtp,
  onForgotPassword,
  onPhoneAuth,
  otpPhone,
  onVerifyPhoneOtp,
  onResendPhoneOtp,
  loading,
  message,
}: AuthModalProps) {
  const { language } = useLanguage()
  const tr = <T,>(ar: T, en: T): T => (language === 'ar' ? ar : en)
  const [method, setMethod] = useState<AuthMethod>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dialCode, setDialCode] = useState('+20')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [codeListOpen, setCodeListOpen] = useState(false)
  const selectedCountry = COUNTRY_CODES.find((country) => country.dial === dialCode) ?? COUNTRY_CODES[0]
  const codeSelectRef = useRef<HTMLDivElement>(null)

  // كود الدولة بقى قايمة مخصّصة (مش <select> المتصفح الأصلي) عشان نتحكم في
  // شكلها بالكامل ونمنع أي "طفح" خارج نافذة التسجيل على الموبايل، ولإظهار
  // اسم الدولة كامل جوه القايمة من غير ما نضطر نوسّع الصندوق المقفول.
  useEffect(() => {
    if (!codeListOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!codeSelectRef.current?.contains(event.target as Node)) setCodeListOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setCodeListOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [codeListOpen])

  // شاشة إدخال الكود بتبقى شغالة سواء الكود جاي من إيميل أو جوال، فرقهم بس
  // طول الكود المطلوب (8 للإيميل بتاع Supabase الافتراضي، 6 للجوال).
  const otpTarget = otpEmail ?? otpPhone
  const isPhoneOtp = Boolean(otpPhone)
  const OTP_LENGTH = isPhoneOtp ? PHONE_OTP_LENGTH : EMAIL_OTP_LENGTH

  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const token = otpDigits.join('')
  const emailInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const titleId = useId()

  useEffect(() => {
    if (otpTarget) return
    if (method === 'email') emailInputRef.current?.focus()
    else phoneInputRef.current?.focus()
  }, [otpTarget, method])

  useEffect(() => {
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    if (otpTarget) otpInputRefs.current[0]?.focus()
    // OTP_LENGTH بيتغير مع otpTarget نفسه (من إيميل لجوال أو العكس)، فمش
    // محتاجين نضيفه في الاعتماديات عشان منعملش إعادة تعيين زيادة عن اللازم.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpTarget])

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtpDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < OTP_LENGTH - 1) otpInputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    event.preventDefault()
    setOtpDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < OTP_LENGTH; i += 1) next[i] = pasted[i] ?? ''
      return next
    })
    otpInputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

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

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!email || !password) return
    if (view === 'signup' && !name.trim()) return
    onEmailAuth(email, password, view === 'signup' ? name.trim() : undefined)
  }

  const handlePhoneSubmit = (event: FormEvent) => {
    event.preventDefault()
    // بنشيل أي أصفار أو رموز زيادة العميل ممكن يكتبها غلط (زي 01004287432
    // أو 0100 428 7432) ونضيف كود الدولة المختار قبلها، فيتولد رقم دولي
    // صحيح بشكل +201004287432 من غير ما العميل يعرف صيغة E.164 أصلًا.
    const localDigits = phone.trim().replace(/\D/g, '').replace(/^0+/, '')
    if (!localDigits) return
    if (view === 'signup' && !name.trim()) return
    onPhoneAuth(`${dialCode}${localDigits}`, view === 'signup' ? name.trim() : undefined)
  }

  const handleOtpSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (token.length !== OTP_LENGTH) return
    if (isPhoneOtp) onVerifyPhoneOtp(token)
    else onVerifyOtp(token)
  }

  const handleResendOtp = () => {
    if (isPhoneOtp) onResendPhoneOtp()
    else onResendOtp()
  }

  return (
    <div className="auth-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="auth-modal glass" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseMove={trackGlow}>
        <button type="button" className="auth-modal-close glass" aria-label={tr('إغلاق', 'Close')} onClick={onClose} onMouseMove={trackGlow}>
          <X size={17} />
        </button>

        {!otpTarget && (
          <div className="auth-tabs" role="tablist" aria-label={tr('الدخول أو إنشاء حساب', 'Sign in or create an account')}>
            <button type="button" role="tab" aria-selected={view === 'login'} className={view === 'login' ? 'is-active' : ''} onClick={() => onSwitchView('login')}>{tr('تسجيل الدخول', 'Sign in')}</button>
            <button type="button" role="tab" aria-selected={view === 'signup'} className={view === 'signup' ? 'is-active' : ''} onClick={() => onSwitchView('signup')}>{tr('إنشاء حساب', 'Sign up')}</button>
          </div>
        )}

        <h2 id={titleId}>
          {otpTarget
            ? tr(isPhoneOtp ? 'تأكيد رقم الجوال' : 'تأكيد البريد الإلكتروني', isPhoneOtp ? 'Verify your phone number' : 'Verify your email')
            : view === 'login'
              ? tr('أهلًا بعودتك', 'Welcome back')
              : tr('لنبدأ مشروعك', "Let's start your project")}
        </h2>
        {otpTarget ? (
          <p className="auth-modal-sub">
            {tr(
              <>أرسلنا رمزًا من {OTP_LENGTH} أرقام إلى <strong dir="ltr">{otpTarget}</strong>. اكتبه هنا لإتمام {isPhoneOtp ? 'التحقق' : 'إنشاء الحساب'}.</>,
              <>We sent a {OTP_LENGTH}-digit code to <strong dir="ltr">{otpTarget}</strong>. Enter it here to complete {isPhoneOtp ? 'verification' : 'account creation'}.</>,
            )}
          </p>
        ) : (
          <p className="auth-modal-sub">{tr(
            view === 'login' ? 'سجّل دخولك لمتابعة مشروعك ومحادثتك مع فريق كليك.' : 'أنشئ حسابك في ثوانٍ وابدأ محادثتك مع فريق كليك.',
            view === 'login' ? 'Sign in to keep up with your project and your chat with the Click team.' : 'Create your account in seconds and start chatting with the Click team.',
          )}</p>
        )}

        {!otpTarget && (
          <>
            <button type="button" className="auth-google-btn glass" onClick={onGoogleLogin} onMouseMove={trackGlow} disabled={loading}>
              <span className="google-mark" aria-hidden="true">G</span> {tr('المتابعة باستخدام Google', 'Continue with Google')}
            </button>
            <div className="auth-divider"><span>{tr('أو', 'or')}</span></div>

            <div className="auth-method-switch" role="tablist" aria-label={tr('طريقة التسجيل', 'Sign-up method')}>
              <button type="button" role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'is-active' : ''} onClick={() => setMethod('email')}>
                <Mail size={15} aria-hidden="true" /> {tr('بريد إلكتروني', 'Email')}
              </button>
              <button type="button" role="tab" aria-selected={method === 'phone'} className={method === 'phone' ? 'is-active' : ''} onClick={() => setMethod('phone')}>
                <Phone size={15} aria-hidden="true" /> {tr('رقم الجوال', 'Phone number')}
              </button>
            </div>
          </>
        )}

        {otpTarget ? (
          <form className="auth-form" onSubmit={handleOtpSubmit}>
            <div className="otp-boxes" dir="ltr">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { otpInputRefs.current[index] = element }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleOtpDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  required
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <button type="submit" className="auth-submit glass-shine" onMouseMove={trackGlow} disabled={loading || token.length !== OTP_LENGTH}>{loading ? tr('جارٍ التحقق...', 'Verifying...') : tr('تأكيد الرمز', 'Confirm code')}</button>
            <button type="button" className="auth-otp-resend" onClick={handleResendOtp} disabled={loading}><RotateCw size={15} aria-hidden="true" /> {tr('إعادة إرسال الرمز', 'Resend code')}</button>
          </form>
        ) : method === 'email' ? (
          <form className="auth-form" onSubmit={handleEmailSubmit}>
            {view === 'signup' && (
              <label className="auth-field">
                <User size={16} aria-hidden="true" />
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder={tr('اسمك اللي هيظهر في الموقع', 'Your name as it will appear on the site')}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}
            <label className="auth-field"><Mail size={16} aria-hidden="true" /><input ref={emailInputRef} type="email" name="email" autoComplete="email" placeholder={tr('بريدك الإلكتروني', 'Your email')} value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="auth-field"><Lock size={16} aria-hidden="true" /><input type="password" name="password" autoComplete={view === 'login' ? 'current-password' : 'new-password'} placeholder={tr('كلمة المرور', 'Password')} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {view === 'login' && (
              <button type="button" className="auth-forgot-link" onClick={() => onForgotPassword(email)} disabled={loading}>
                {tr('نسيت كلمة المرور؟', 'Forgot password?')}
              </button>
            )}
            <button type="submit" className="auth-submit glass-shine" onMouseMove={trackGlow} disabled={loading}>{loading ? tr('جارٍ التحميل...', 'Loading...') : view === 'login' ? tr('تسجيل الدخول', 'Sign in') : tr('إنشاء الحساب', 'Create account')}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handlePhoneSubmit}>
            {view === 'signup' && (
              <label className="auth-field">
                <User size={16} aria-hidden="true" />
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder={tr('اسمك اللي هيظهر في الموقع', 'Your name as it will appear on the site')}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}
            <div className="phone-field-group" dir="ltr">
              <div className="phone-code-select" ref={codeSelectRef}>
                <button
                  type="button"
                  className="phone-code-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={codeListOpen}
                  aria-label={tr('كود الدولة', 'Country code')}
                  onClick={() => setCodeListOpen((open) => !open)}
                >
                  <span aria-hidden="true">{selectedCountry.flag}</span>
                  <span>{selectedCountry.dial}</span>
                  <ChevronDown size={14} aria-hidden="true" className={codeListOpen ? 'is-open' : ''} />
                </button>
                {codeListOpen && (
                  <ul className="phone-code-list" role="listbox" aria-label={tr('كود الدولة', 'Country code')}>
                    {COUNTRY_CODES.map((country) => (
                      <li key={country.code} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={country.dial === dialCode}
                          className={country.dial === dialCode ? 'is-selected' : ''}
                          onClick={() => {
                            setDialCode(country.dial)
                            setCodeListOpen(false)
                          }}
                        >
                          <span aria-hidden="true">{country.flag}</span>
                          <span className="phone-code-name">{tr(country.name, country.nameEn)}</span>
                          <span className="phone-code-dial">{country.dial}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="auth-field phone-number-field">
                <Phone size={16} aria-hidden="true" />
                <input
                  ref={phoneInputRef}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="1004287432"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>
            </div>
            <p className="auth-field-hint">{tr('اختار كود دولتك واكتب رقمك من غير صفر في الأول. لن يُفعَّل الحساب إلا بعد إدخال رمز SMS المستلم.', 'Pick your country code and type your number without a leading zero. The account activates only after you enter the SMS code.')}</p>
            <button type="submit" className="auth-submit glass-shine" onMouseMove={trackGlow} disabled={loading}>{loading ? tr('جارٍ الإرسال...', 'Sending...') : tr('إرسال رمز التحقق', 'Send verification code')}</button>
          </form>
        )}

        {message && <p className="auth-modal-message" role="status" aria-live="polite">{message}</p>}

        {!otpTarget && (
          <p className="auth-switch">
            {view === 'login'
              ? <>{tr('ليس لديك حساب؟', "Don't have an account?")} <button type="button" onClick={() => onSwitchView('signup')}>{tr('إنشاء حساب جديد', 'Create a new account')}</button></>
              : <>{tr('لديك حساب بالفعل؟', 'Already have an account?')} <button type="button" onClick={() => onSwitchView('login')}>{tr('تسجيل الدخول', 'Sign in')}</button></>}
          </p>
        )}
      </div>
    </div>
  )
}
