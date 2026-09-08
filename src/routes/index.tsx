import { Link, createFileRoute } from '@tanstack/react-router'
import type { AuthError, User } from '@supabase/supabase-js'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MoveUpLeft,
  Phone,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AuthModal, type AuthView } from '../components/AuthModal'
import { RequestModal } from '../components/RequestModal'
import { LanguageToggleInline } from '../components/LanguageToggle'
import { SupportButton } from '../components/SupportButton'
import { useLanguage, type Language } from '../lib/i18n'
import { trackGlow } from '../lib/liquid-glass'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const SERVICES_AR = [
  {
    number: '01',
    category: 'مواقع وتجارب رقمية',
    title: 'موقع يحكي قيمة مشروعك قبل أن تقول كلمة.',
    description:
      'نصمم مواقع سريعة، واضحة، ومبنية حول رحلة العميل — من أول نظرة حتى اتخاذ القرار.',
    points: ['تصميم مخصص لهويتك', 'تجربة متجاوبة على كل جهاز', 'أداء وتهيئة لمحركات البحث'],
    image: '/assets/services/illustrations/web-design.svg',
    alt: 'رسم توضيحي لموقع متجاوب على شاشة حاسوب وهاتف',
  },
  {
    number: '02',
    category: 'متاجر إلكترونية',
    title: 'متجر يربط تجارتك بالعالم، وأنت في مكانك.',
    description:
      'نبني تجربة تسوق ذكية تختصر الطريق بين اكتشاف المنتج وإتمام الطلب، وتمنحك تحكمًا كاملًا.',
    points: ['واجهة عرض منتجات جذابة وسهلة التصفح', 'تصميم يعكس هوية علامتك التجارية', 'تجربة استخدام سلسة على الموبايل والـ PC'],
    image: '/assets/services/illustrations/ecommerce.svg',
    alt: 'رسم توضيحي لمتجر إلكتروني وعملية دفع رقمية',
  },
  {
    number: '03',
    category: 'أنظمة إدارة مخصصة',
    title: 'نحوّل خطوات العمل المتكررة إلى نظام يعمل لأجلك.',
    description:
      'نحلل عملياتك ونبني لوحات وأدوات داخلية تقلل الوقت الضائع وتمنح فريقك رؤية أوضح.',
    points: ['صلاحيات وتدفقات عمل', 'تقارير لحظية قابلة للقياس', 'تكامل مع أدواتك الحالية'],
    image: '/assets/services/illustrations/systems.svg',
    alt: 'رسم توضيحي لنظام إدارة مترابط بلوحات وتدفقات عمل',
  },
  {
    number: '04',
    category: 'تطبيقات ومنتجات رقمية',
    title: 'فكرتك في تطبيق سريع، بسيط، وجاهز للنمو.',
    description:
      'من النموذج الأولي حتى الإطلاق، نصنع منتجًا يوازن بين جمال التجربة وقوة التقنية.',
    points: ['تجربة استخدام مدروسة', 'بنية تقنية قابلة للتوسع', 'اختبار ودعم بعد الإطلاق'],
    image: '/assets/services/illustrations/apps.svg',
    alt: 'رسم توضيحي لتطبيق جوال بواجهة وإشعارات',
  },
]

const SERVICES_EN = [
  {
    number: '01',
    category: 'Websites & digital experiences',
    title: "A website that tells your project's value before you say a word.",
    description:
      "We design fast, clear websites built around your customer's journey — from first glance to decision.",
    points: ['Design tailored to your brand', 'Responsive on every device', 'Performance & SEO built in'],
    image: '/assets/services/illustrations/web-design.svg',
    alt: 'Illustration of a responsive website on a laptop and phone screen',
  },
  {
    number: '02',
    category: 'Online stores',
    title: 'A store that makes buying easier — and coming back natural.',
    description:
      'We build a smart shopping experience that shortens the path from discovery to checkout, with full control in your hands.',
    points: ['A seamless purchase journey', 'Flexible product & order management', 'Payments, shipping & analytics connected'],
    image: '/assets/services/illustrations/ecommerce.svg',
    alt: 'Illustration of an online store and a digital checkout',
  },
  {
    number: '03',
    category: 'Custom management systems',
    title: 'We turn repetitive work into a system that works for you.',
    description:
      'We analyze your operations and build dashboards and internal tools that cut wasted time and give your team a clearer view.',
    points: ['Permissions & workflows', 'Real-time, measurable reports', 'Integrates with your existing tools'],
    image: '/assets/services/illustrations/systems.svg',
    alt: 'Illustration of a connected management system with dashboards and workflows',
  },
  {
    number: '04',
    category: 'Apps & digital products',
    title: "Your idea, in an app that's fast, simple, and ready to grow.",
    description:
      'From prototype to launch, we craft a product that balances a beautiful experience with solid technology.',
    points: ['Thoughtful user experience', 'Scalable technical foundation', 'Testing & support after launch'],
    image: '/assets/services/illustrations/apps.svg',
    alt: 'Illustration of a mobile app with an interface and notifications',
  },
]

const PROCESS_STEPS_AR = [
  ['01', 'نسمع بتركيز', 'نفهم فكرتك، جمهورك، وأين تريد أن تصل قبل اقتراح أي شاشة.'],
  ['02', 'نرسم الطريق', 'نحوّل الأهداف إلى رحلة واضحة، أولويات، ونطاق عمل محسوب.'],
  ['03', 'نصمم ونبني', 'نختبر التفاصيل بصريًا وتقنيًا، ونشاركك التقدم خطوة بخطوة.'],
  ['04', 'نطلق ونطوّر', 'نراقب التجربة بعد الإطلاق ونحسنها اعتمادًا على الاستخدام الحقيقي.'],
]

const PROCESS_STEPS_EN = [
  ['01', 'We listen closely', 'We understand your idea, your audience, and where you want to go before proposing a single screen.'],
  ['02', 'We map the path', 'We turn goals into a clear journey, priorities, and a well-scoped plan.'],
  ['03', 'We design & build', 'We test every detail visually and technically, sharing progress with you step by step.'],
  ['04', 'We launch & improve', 'We monitor the experience after launch and refine it based on real usage.'],
]

const TICKER_ITEMS_AR = ['مواقع احترافية', 'متاجر إلكترونية', 'أنظمة إدارة', 'تطبيقات موبايل', 'تجربة مستخدم', 'حلول مخصصة']
const TICKER_ITEMS_EN = ['Professional websites', 'Online stores', 'Management systems', 'Mobile apps', 'User experience', 'Custom solutions']

const E164_PHONE = /^\+[1-9]\d{7,14}$/

function normalizePhone(phone: string) {
  const compact = phone.trim().replace(/[\s().-]/g, '')
  const international = compact.startsWith('00') ? `+${compact.slice(2)}` : compact
  const normalizedEgyptian = /^01[0125]\d{8}$/.test(international)
    ? `+20${international.slice(1)}`
    : international
  return E164_PHONE.test(normalizedEgyptian) ? normalizedEgyptian : null
}

function getAuthErrorMessage(error: unknown, language: Language) {
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en)
  const authError = error as AuthError | undefined
  if (authError?.message) {
    const message = authError.message.toLowerCase()
    // الحساب محظور (على الأغلب لأنه إيميل وهمي عمل ارتداد/bounce)، فمينفعش
    // نبعتله أكواد تأكيد تانية، لازم نوقفه برسالة واضحة.
    if (
      authError.code === 'user_banned' ||
      message.includes('user is banned') ||
      message.includes('banned') ||
      message.includes('is disabled')
    ) {
      return tr(
        'هذا الحساب محظور ولا يمكن إرسال رموز تأكيد إليه. تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.',
        'This account is banned and cannot receive verification codes. Contact support if you think this is a mistake.',
      )
    }
    if (message.includes('invalid login credentials')) {
      return tr('البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'Incorrect email or password.')
    }
    if (message.includes('already registered')) {
      return tr('هذا البريد الإلكتروني مسجّل بالفعل. سجّل دخولك بدلًا من ذلك.', 'This email is already registered. Please sign in instead.')
    }
    return tr('تعذر إكمال تسجيل الدخول. حاول مرة أخرى.', 'Could not complete sign-in. Please try again.')
  }
  return tr('حدث خطأ غير متوقع أثناء تسجيل الدخول.', 'An unexpected error occurred while signing in.')
}

function HomePage() {
  const { language } = useLanguage()
  const tr = <T,>(ar: T, en: T): T => (language === 'ar' ? ar : en)
  const services = language === 'ar' ? SERVICES_AR : SERVICES_EN
  const processSteps = language === 'ar' ? PROCESS_STEPS_AR : PROCESS_STEPS_EN
  const tickerItems = language === 'ar' ? TICKER_ITEMS_AR : TICKER_ITEMS_EN
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const [accountPopoverPos, setAccountPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState('')
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [otpEmail, setOtpEmail] = useState<string | null>(null)
  const [otpPhone, setOtpPhone] = useState<string | null>(null)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true

    const finishExpressGoogleLogin = async () => {
      const params = new URLSearchParams(window.location.search)
      const googleResult = params.get('google')
      if (!googleResult) return
      // Remove the marker immediately so refresh cannot replay the one-time token.
      params.delete('google')
      params.delete('reason')
      const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
      window.history.replaceState({}, document.title, cleanUrl)
      if (googleResult === 'error') {
        setAuthMessage(tr('تعذر تسجيل الدخول باستخدام Google. حاول مرة أخرى.', 'Google sign-in could not be completed. Please try again.'))
        return
      }
      try {
        const tokenResponse = await fetch('/auth/google/token', { credentials: 'include', headers: { Accept: 'application/json' } })
        if (!tokenResponse.ok) throw new Error('Google token endpoint returned an error')
        const payload = (await tokenResponse.json()) as { idToken?: string }
        if (!payload.idToken) throw new Error('Google ID token is missing')
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: payload.idToken })
        if (error) throw error
        if (isMounted) {
          setAuthView(null)
          setAuthMessage(tr('تم تسجيل الدخول بنجاح.', 'Signed in successfully.'))
        }
      } catch (error) {
        if (isMounted) setAuthMessage(getAuthErrorMessage(error, language))
      }
    }

    void finishExpressGoogleLogin()

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (event === 'SIGNED_IN' && session) {
        setAuthMessage(tr('تم تسجيل الدخول بنجاح.', 'Signed in successfully.'))
      }
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = 'true'
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.14 },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (isPaused) return
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % services.length),
      5600,
    )
    return () => window.clearInterval(timer)
  }, [isPaused, activeSlide])

  const changeSlide = (index: number) => {
    setActiveSlide((index + services.length) % services.length)
  }

  const closeMenu = () => setMenuOpen(false)

  const openAccountMenu = () => {
    const rect = accountButtonRef.current?.getBoundingClientRect()
    if (rect) {
      const popoverWidth = 240
      // في RTL، القائمة لازم تتفرّع من نفس حافة الزرار اليمنى وتتوسّع
      // لليسار — لو استخدمنا حافة الزرار الشمال زي ما كان قبل كده، القائمة
      // كانت بتمتد يمينًا فوق باقي عناصر الهيدر (الروابط وزرار "ابدأ
      // مشروعك") بدل ما تظهر مرتبة تحت الزرار نفسه بس.
      const left = Math.min(Math.max(8, rect.right - popoverWidth), window.innerWidth - popoverWidth - 8)
      setAccountPopoverPos({ top: rect.bottom + 10, left })
    }
    setAccountMenuOpen((open) => !open)
  }

  useEffect(() => {
    if (!accountMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false)
    }
    // القائمة بتتحدد مكانها بإحداثيات محسوبة وقت الفتح؛ لو المستخدم عمل
    // scroll أو غيّر حجم الشاشة والقائمة مفتوحة، أسهل وأسلم حاجة نقفلها
    // بدل ما تفضل معلقة في مكان غلط.
    const onScrollOrResize = () => setAccountMenuOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [accountMenuOpen])

  const handleGoogleLogin = async () => {
    setAuthLoading(true)
    setAuthMessage(tr('جارٍ تحويلك إلى Google...', 'Redirecting you to Google...'))
    // OAuth is initiated by the Express server so Google sees your own
    // domain/app configuration. The server returns a one-time ID token,
    // which Supabase exchanges for the normal RLS-backed session.
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.assign(`/auth/google?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const handleLogout = async () => {
    setAuthLoading(true)
    setAuthMessage('')
    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthMessage(getAuthErrorMessage(error, language))
    } else {
      setUser(null)
      setMenuOpen(false)
      setAccountMenuOpen(false)
      setAuthMessage(tr('تم تسجيل الخروج.', 'Signed out.'))
    }
    setAuthLoading(false)
  }

  const handleEmailAuth = async (email: string, password: string, name?: string) => {
    const view = authView ?? 'login'
    setAuthLoading(true)
    setAuthMessage('')
    try {
      const { data, error } =
        view === 'signup'
          ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name?.trim() } } })
          : await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // الحساب اتعمل قبل كده بنفس الإيميل لكن لسه ماأكدش الكود (OTP) — بدل
        // ما نوقف المستخدم بمانع "الإيميل مسجّل"، نبعتله كود تأكيد جديد
        // ونوديه لشاشة إدخال الكود على طول.
        if (view === 'signup' && error.message.toLowerCase().includes('already registered')) {
          const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
          if (!resendError) {
            setOtpEmail(email)
            setAuthMessage(tr('هذا البريد مسجّل بالفعل ولم يُؤكَّد بعد. أرسلنا رمز تأكيد جديد إليه.', 'This email is already registered but not verified yet. We sent a new verification code.'))
            return
          }
          // فشل إعادة الإرسال (مثلًا الحساب محظور بسبب ارتداد/bounce) — نعرض
          // سبب الفشل الحقيقي بدل رسالة "الإيميل مسجّل بالفعل" المضلِّلة.
          throw resendError
        }
        throw error
      }
      // Supabase بيرجّع نجاح "مموّه" (من غير error) لو الإيميل مسجّل ومؤكَّد
      // بالفعل، عشان محدش يقدر يعرف إيميلات مستخدمين تانيين موجودة ولا لأ
      // (identities بتيجي فاضية في الحالة دي بس). من غير الفحص ده، المستخدم
      // كان هيتحوّل لشاشة "إدخال كود" مستنّي كود مش هيوصله أبدًا.
      if (view === 'signup' && data.user && data.user.identities && data.user.identities.length === 0) {
        setAuthMessage(tr('هذا البريد الإلكتروني مسجّل بالفعل. سجّل دخولك بدلًا من ذلك.', 'This email is already registered. Please sign in instead.'))
        return
      }
      if (view === 'signup' && !data.session) {
        setOtpEmail(email)
        setAuthMessage(tr('تم إرسال رمز التأكيد إلى بريدك الإلكتروني.', 'A verification code has been sent to your email.'))
        return
      }
      const authedUser = data.user
      setUser(authedUser)
      setAuthView(null)
      setMenuOpen(false)
      setAuthMessage(
        view === 'signup'
          ? data.session
            ? 'تم إنشاء الحساب بنجاح.'
            : 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده.'
          : 'تم تسجيل الدخول بنجاح.',
      )
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, language))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgotPassword = async (email: string) => {
    if (!email) {
      setAuthMessage(tr('اكتب بريدك الإلكتروني أولًا في الحقل بالأعلى، ثم اضغط "نسيت كلمة المرور؟".', 'Enter your email in the field above first, then tap "Forgot password?".'))
      return
    }
    setAuthLoading(true)
    setAuthMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setAuthMessage(tr('أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.', 'We sent a password reset link to your email.'))
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, language))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleVerifyOtp = async (token: string) => {
    if (!otpEmail) return
    setAuthLoading(true)
    setAuthMessage('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: otpEmail, token, type: 'signup' })
      if (error) throw error
      setUser(data.user)
      setOtpEmail(null)
      setAuthView(null)
      setMenuOpen(false)
      setAuthMessage(tr('تم تأكيد بريدك الإلكتروني وتسجيل الدخول بنجاح.', 'Your email is verified and you are signed in.'))
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, language))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!otpEmail) return
    setAuthLoading(true)
    setAuthMessage('')
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: otpEmail })
      if (error) throw error
      setAuthMessage(tr('تم إرسال رمز جديد إلى بريدك الإلكتروني.', 'A new code was sent to your email.'))
    } catch (error) {
      const authError = error as AuthError
      // لو الحساب محظور، نقفل شاشة الكود بدل ما نسيب المستخدم يكرر "إعادة
      // الإرسال" على حساب مش هيوصله أي كود أبدًا.
      if (authError?.code === 'user_banned' || authError?.message?.toLowerCase().includes('banned')) {
        setOtpEmail(null)
      }
      setAuthMessage(getAuthErrorMessage(error, language))
    } finally {
      setAuthLoading(false)
    }
  }

  const handlePhoneAuth = async (phone: string, name?: string) => {
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      setAuthMessage(tr('اكتب رقم جوال حقيقي بصيغة دولية، مثال: +201004287432.', 'Enter a valid phone number in international format, e.g. +201004287432.'))
      return
    }
    const view = authView ?? 'login'
    setAuthLoading(true)
    setAuthMessage('')
    try {
      if (view === 'signup') {
        // نتحقق الأول (من غير ما ننشئ أي حساب: shouldCreateUser:false) هل
        // الرقم ده مرتبط بحساب موجود بالفعل. لو نجح الطلب من غير أي خطأ،
        // معناه إن سوبابيز لاقت حساب فعلي وبعتتله كود دخول — يبقى الرقم ده
        // مسجّل من قبل ولازم نوقف هنا برسالة واضحة بدل ما نكمل "تسجيل".
        const { error: existsCheckError } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: { shouldCreateUser: false },
        })
        if (!existsCheckError) {
          setAuthMessage(tr('هذا الرقم مسجّل بالفعل. سجّل دخولك بدلًا من ذلك.', 'This number is already registered. Please sign in instead.'))
          return
        }
      }
      // signInWithOtp بالجوال بيغطي تسجيل الدخول وإنشاء الحساب مع بعض:
      // لو الرقم جديد بينشئ حساب، ولو موجود بيبعتله كود دخول عادي — في
      // الحالتين لازم يتحقق بالكود الوصل قبل ما تتفعل الجلسة.
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: name ? { data: { full_name: name } } : undefined,
      })
      if (error) throw error
      setOtpPhone(normalizedPhone)
      setAuthMessage(tr('تم إرسال رمز التحقق إلى جوالك.', 'A verification code was sent to your phone.'))
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, language))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleVerifyPhoneOtp = async (token: string) => {
    if (!otpPhone) return
    setAuthLoading(true)
    setAuthMessage('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: otpPhone, token, type: 'sms' })
      if (error) throw error
      setUser(data.user)
      setOtpPhone(null)
      setAuthView(null)
      setMenuOpen(false)
      setAuthMessage(tr('تم تأكيد رقم جوالك وتسجيل الدخول بنجاح.', 'Your phone is verified and you are signed in.'))
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, language))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleResendPhoneOtp = async () => {
    if (!otpPhone) return
    setAuthLoading(true)
    setAuthMessage('')
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: otpPhone })
      if (error) throw error
      setAuthMessage(tr('تم إرسال رمز جديد إلى جوالك.', 'A new code was sent to your phone.'))
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, language))
    } finally {
      setAuthLoading(false)
    }
  }

  const closeAuth = () => {
    setOtpEmail(null)
    setOtpPhone(null)
    setAuthView(null)
  }

  const switchAuthView = (view: AuthView) => {
    setOtpEmail(null)
    setOtpPhone(null)
    setAuthMessage('')
    setAuthView(view)
  }

  const openStartProject = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    setAuthMessage('')
    if (user) {
      setRequestModalOpen(true)
    } else {
      setAuthView('login')
    }
  }

  const authLabel =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    tr('حسابك', 'Your account')
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <div className="site" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="noise" aria-hidden="true" />
      <header className="site-header">
        <nav className="nav-shell container" aria-label={tr('التنقل الرئيسي', 'Main navigation')}>
          <a className="brand" href="#home" aria-label={tr('كليك - الرئيسية', 'Click — Home')}>
            <img src="/assets/logo-transparent.png" alt={tr('شعار كليك', 'Click logo')} />
          </a>
          <div className={`nav-drawer ${menuOpen ? 'is-open' : ''}`}>
            <a className="glass-pill" href="#services" onClick={closeMenu} onMouseMove={trackGlow}>{tr('خدماتنا', 'Services')}</a>
            <a className="glass-pill" href="#why" onClick={closeMenu} onMouseMove={trackGlow}>{tr('لماذا كليك؟', 'Why Click?')}</a>
            <a className="glass-pill" href="#process" onClick={closeMenu} onMouseMove={trackGlow}>{tr('كيف نعمل؟', 'How we work')}</a>
            <a className="glass-pill" href="#contact" onClick={closeMenu} onMouseMove={trackGlow}>{tr('تواصل معنا', 'Contact us')}</a>
            <button
              className="mobile-auth-button glass"
              type="button"
              onClick={user ? handleLogout : handleGoogleLogin}
              onMouseMove={trackGlow}
              disabled={authLoading}
            >
              {user ? <LogOut size={17} /> : <span className="google-mark" aria-hidden="true">G</span>}
              <span className="mobile-auth-label">
                {authLoading ? tr('جارٍ التحميل...', 'Loading...') : user ? tr(`خروج — ${authLabel}`, `Log out — ${authLabel}`) : tr('الدخول باستخدام Google', 'Sign in with Google')}
                {user?.email && <small dir="ltr">{user.email}</small>}
              </span>
            </button>
          </div>
          <div className="nav-actions">
            <SupportButton />
            {user && (
              <Link className="glass-pill nav-account-link" to="/account" onMouseMove={trackGlow}>
                {tr('طلباتي', 'My requests')}
              </Link>
            )}
            <a className="nav-cta glass-shine" href="#contact" onMouseMove={trackGlow} onClick={openStartProject}>
              {tr('ابدأ مشروعك', 'Start your project')} <MoveUpLeft size={16} />
            </a>
            <div className="account-menu" ref={accountMenuRef}>
              <button
                ref={accountButtonRef}
                className={`auth-button glass ${user ? 'is-authenticated' : ''}`}
                type="button"
                onClick={user ? openAccountMenu : handleGoogleLogin}
                onMouseMove={trackGlow}
                disabled={authLoading}
                aria-expanded={user ? accountMenuOpen : undefined}
                title={user ? undefined : tr('الدخول باستخدام حساب Google', 'Sign in with your Google account')}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                ) : user ? (
                  <span className="account-initial" aria-hidden="true">{authLabel.charAt(0)}</span>
                ) : (
                  <span className="google-mark" aria-hidden="true">G</span>
                )}
                <span>{authLoading ? tr('جارٍ التحميل...', 'Loading...') : user ? authLabel : tr('الدخول بجوجل', 'Sign in with Google')}</span>
              </button>
              {user && accountMenuOpen && accountPopoverPos && (
                <div
                  className="account-popover glass"
                  role="menu"
                  style={{ top: accountPopoverPos.top, left: accountPopoverPos.left }}
                >
                  <div className="account-popover-info">
                    <span className="account-popover-name">{authLabel}</span>
                    {user.email && <span className="account-popover-email" dir="ltr">{user.email}</span>}
                  </div>
                  <Link to="/account" className="account-popover-link" onClick={() => setAccountMenuOpen(false)}>{tr('طلباتي', 'My requests')}</Link>
                  <button type="button" className="account-popover-logout" onClick={handleLogout} disabled={authLoading}>
                    <LogOut size={15} /> {tr('تسجيل الخروج', 'Log out')}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="nav-end">
            <LanguageToggleInline />
            <button
              className="menu-toggle glass"
              type="button"
              aria-label={menuOpen ? tr('إغلاق القائمة', 'Close menu') : tr('فتح القائمة', 'Open menu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              onMouseMove={trackGlow}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </nav>
        {authMessage && <div className="auth-message" role="status" aria-live="polite">{authMessage}</div>}
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" aria-hidden="true" />
          <div className="hero-grid container">
            <div className="hero-copy">
              <div className="hero-kicker"><Sparkles size={15} /> {tr('شريكك التقني من الفكرة حتى الإطلاق', 'Your tech partner from idea to launch')}</div>
              <h1>
                {tr(
                  <>لا نصنع موقعًا فقط، نصنع <span>انطباعًا</span> يصعب تجاوزه.</>,
                  <>We don't just build a website — we craft an <span>impression</span> that's hard to forget.</>,
                )}
              </h1>
              <p>
                {tr(
                  'نحوّل رؤيتك إلى تجربة رقمية محسوبة: تصميم يلفت، تقنية تتحمّل النمو، ورسالة تجعل عميلك يعرف قيمتك من أول ضغطة.',
                  'We turn your vision into a considered digital experience: design that captures attention, technology built to scale, and a message that shows your value from the very first click.',
                )}
              </p>
              <div className="hero-actions">
                <a className="button button-primary glass-shine" href="#contact" onMouseMove={trackGlow}>{tr('احكِ لنا عن فكرتك', 'Tell us your idea')} <ArrowLeft size={18} /></a>
                <a className="button button-ghost glass" href="#services" onMouseMove={trackGlow}>{tr('استكشف الخدمات', 'Explore services')}</a>
              </div>
              <div className="trust-row">
                <span>{tr('تصميم مخصص', 'Tailored design')}</span><span>{tr('دعم بعد الإطلاق', 'Post-launch support')}</span><span>{tr('تجربة سريعة وآمنة', 'Fast, secure experience')}</span>
              </div>
            </div>

            <div className="hero-art" aria-label={tr('هوية كليك الرقمية', "Click's digital identity")}>
              <div className="orbit orbit-one"><i /></div>
              <div className="orbit orbit-two"><i /></div>
              <div className="logo-stage">
                <span className="stage-code">&lt;/&gt;</span>
                <img src="/assets/logo-transparent.png" alt={tr('كليك — نبرمج أفكارك، نطلق نجاحك', 'Click — we code your ideas, we launch your success')} />
              </div>
              <div className="floating-card card-top"><span>{tr('من الفكرة', 'From idea')}</span><strong>{tr('إلى منتج حيّ', 'to a live product')}</strong></div>
              <div className="floating-card card-bottom"><strong>360°</strong><span>{tr('حل رقمي متكامل', 'A complete digital solution')}</span></div>
            </div>
          </div>
          <a className="scroll-cue" href="#services" aria-label={tr('انتقل إلى الخدمات', 'Go to services')}><span /> {tr('اكتشف المزيد', 'Discover more')}</a>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            {[...Array(2)].flatMap((_, group) =>
              tickerItems.map((item) => (
                <span key={`${group}-${item}`}>{item}<b>✦</b></span>
              )),
            )}
          </div>
        </div>

        <section className="section services-section" id="services">
          <div className="container">
            <div className="section-heading" data-reveal>
              <span className="eyebrow">{tr('ما نصنعه لك', 'What we build for you')}</span>
              <h2>{tr(<>خدمات تحوّل فكرتك إلى <em>منتج يستحق المنافسة.</em></>, <>Services that turn your idea into a <em>product that competes.</em></>)}</h2>
              <p>{tr('كل خدمة تبدأ بفهم نشاطك وتنتهي بحل عملي يسهّل البيع، التشغيل، أو الوصول إلى جمهورك.', 'Every service starts with understanding your business and ends with a practical solution that makes selling, operating, or reaching your audience easier.')}</p>
            </div>

            <div
              className="service-slider"
              data-reveal
              role="region"
              aria-roledescription="carousel"
              aria-label={tr('خدمات كليك', 'Click services')}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }}
              onTouchEnd={(event) => {
                if (touchStart.current === null) return
                const distance = event.changedTouches[0].clientX - touchStart.current
                if (Math.abs(distance) > 45) changeSlide(activeSlide + (distance < 0 ? 1 : -1))
                touchStart.current = null
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') changeSlide(activeSlide + 1)
                if (event.key === 'ArrowRight') changeSlide(activeSlide - 1)
              }}
              tabIndex={0}
            >
              <div className="slides-track" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
                {services.map((service, index) => (
                  <article className={`service-slide ${index === activeSlide ? 'is-active' : ''}`} key={service.number} aria-hidden={index !== activeSlide}>
                    <div className="service-photo">
                      <img src={service.image} alt={service.alt} loading={index === 0 ? 'eager' : 'lazy'} />
                      <span className="service-index">{service.number} / 04</span>
                    </div>
                    <div className="service-copy">
                      <span className="slide-label">{service.category}</span>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                      <ul>
                        {service.points.map((point) => <li key={point}><Check size={15} /> {point}</li>)}
                      </ul>
                      <a href="#contact" className="text-link glass-pill" onMouseMove={trackGlow}>{tr('ناقش هذه الخدمة', 'Discuss this service')} <ArrowLeft size={17} /></a>
                    </div>
                  </article>
                ))}
              </div>
              <div className="slider-footer">
                <div className="slider-dots" aria-label={tr('اختر الخدمة', 'Choose a service')}>
                  {services.map((service, index) => (
                    <button
                      type="button"
                      className={`glass-shine ${index === activeSlide ? 'active' : ''}`}
                      onMouseMove={trackGlow}
                      onClick={() => changeSlide(index)}
                      aria-label={tr(`عرض الخدمة ${index + 1}: ${service.category}`, `Show service ${index + 1}: ${service.category}`)}
                      aria-current={index === activeSlide ? 'true' : undefined}
                      key={service.number}
                    >
                      {index === activeSlide && <span key={activeSlide} className={isPaused ? 'paused' : ''} />}
                    </button>
                  ))}
                </div>
                <div className="slider-counter"><strong>0{activeSlide + 1}</strong><i />04</div>
                <div className="slider-controls">
                  <button className="glass" type="button" onClick={() => changeSlide(activeSlide - 1)} onMouseMove={trackGlow} aria-label={tr('الخدمة السابقة', 'Previous service')}><ArrowRight /></button>
                  <button className="glass" type="button" onClick={() => changeSlide(activeSlide + 1)} onMouseMove={trackGlow} aria-label={tr('الخدمة التالية', 'Next service')}><ArrowLeft /></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section why-section" id="why">
          <div className="container why-grid">
            <div className="why-copy" data-reveal>
              <span className="eyebrow">{tr('لماذا كليك؟', 'Why Click?')}</span>
              <h2>{tr(<>نوازن بين الصورة الجميلة و<strong>النتيجة الحقيقية.</strong></>, <>We balance a beautiful look with a <strong>real result.</strong></>)}</h2>
              <p>{tr('التصميم عندنا ليس زينة، والتقنية ليست تعقيدًا. كل قرار له سبب يخدم مشروعك وعميلك.', "Design, for us, isn't decoration, and technology isn't complexity. Every decision has a reason that serves your project and your customer.")}</p>
              <a href="#contact" className="text-link glass-pill" onMouseMove={trackGlow}>{tr('لنبنِ شيئًا مختلفًا', "Let's build something different")} <ArrowLeft size={17} /></a>
            </div>
            <div className="metrics-grid" data-reveal>
              <article><span>01</span><strong>{tr('وضوح قبل التنفيذ', 'Clarity before execution')}</strong><p>{tr('نحدد الهدف والأولوية كي لا تضيع الميزانية في تفاصيل لا تخدم النتيجة.', "We define the goal and priorities so budget never gets lost in details that don't serve the result.")}</p></article>
              <article><span>02</span><strong>{tr('حرفة في كل تفصيلة', 'Craft in every detail')}</strong><p>{tr('من أول حركة حتى أصغر رسالة، نبني تجربة متماسكة ومقصودة.', 'From the first interaction to the smallest message, we build a coherent, intentional experience.')}</p></article>
              <article><span>03</span><strong>{tr('تقنية قابلة للنمو', 'Technology built to grow')}</strong><p>{tr('بنية سريعة وآمنة لا تضطر لإعادة بنائها كلما توسع مشروعك.', "A fast, secure foundation you won't need to rebuild every time your project scales.")}</p></article>
              <article className="metric-accent"><b>360°</b><p>{tr('رؤية متكاملة تجمع الاستراتيجية والتصميم والتقنية في تجربة واحدة.', 'A complete vision that brings strategy, design, and technology together in one experience.')}</p></article>
            </div>
          </div>
        </section>

        <section className="section process-section" id="process">
          <div className="container">
            <div className="section-heading compact" data-reveal>
              <span className="eyebrow">{tr('طريقة العمل', 'How we work')}</span>
              <h2>{tr(<>عملية واضحة. <em>نتيجة بلا مفاجآت.</em></>, <>A clear process. <em>A result with no surprises.</em></>)}</h2>
            </div>
            <div className="process-list">
              {processSteps.map(([number, title, copy], index) => (
                <article data-reveal style={{ '--delay': `${index * 90}ms` } as CSSProperties} key={number}>
                  <span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><i />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-orb" aria-hidden="true" />
          <div className="container contact-inner" data-reveal>
            <span className="eyebrow">{tr('جاهز نبدأ؟', 'Ready to start?')}</span>
            <h2>{tr(<>لديك فكرة تستحق أن تُرى <em>كما تخيلتها؟</em></>, <>Have an idea worth seeing <em>exactly as you imagined it?</em></>)}</h2>
            <p>{tr('شاركنا فكرتك، وسنساعدك على تحويلها إلى خطوة رقمية واضحة وقابلة للتنفيذ.', "Share your idea with us, and we'll help turn it into a clear, actionable digital step.")}</p>
            <a className="button button-light glass-shine" href="mailto:hello@click.sa" onMouseMove={trackGlow} onClick={openStartProject}>{tr('ابدأ المحادثة', 'Start the conversation')} <ArrowLeft size={19} /></a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div><img src="/assets/logo-transparent.png" alt={tr('شعار كليك', 'Click logo')} /><p>{tr('نصمم ونبرمج تجارب ومنتجات رقمية تصنع فرقًا.', 'We design and build digital products and experiences that make a difference.')}</p></div>
          <div className="footer-links">
            <a className="glass-pill" href="#services" onMouseMove={trackGlow}>{tr('الخدمات', 'Services')}</a>
            <a className="glass-pill" href="#why" onMouseMove={trackGlow}>{tr('لماذا كليك؟', 'Why Click?')}</a>
            <a className="glass-pill" href="#process" onMouseMove={trackGlow}>{tr('كيف نعمل؟', 'How we work')}</a>
            <a className="glass-pill" href="#contact" onMouseMove={trackGlow}>{tr('تواصل معنا', 'Contact us')}</a>
          </div>
          <div className="footer-meta">
            <strong>{tr('تواصل معنا', 'Contact us')}</strong>
            <a href="mailto:support@clickagency.online" className="footer-support-link"><Mail size={13} /> support@clickagency.online</a>
            <a href="tel:+201004287432" className="footer-support-link"><Phone size={13} /> +20 100 428 7432</a>
            <span className="footer-location"><MapPin size={13} /> {tr('المنوفية — Minuofia', 'Minuofia, Egypt')}</span>
            <span>{tr('© 2026 كليك. جميع الحقوق محفوظة.', '© 2026 Click. All rights reserved.')}</span>
          </div>
        </div>
      </footer>

      {authView && (
        <AuthModal
          view={authView}
          onSwitchView={switchAuthView}
          onClose={closeAuth}
          onGoogleLogin={handleGoogleLogin}
          onEmailAuth={handleEmailAuth}
          otpEmail={otpEmail}
          onVerifyOtp={handleVerifyOtp}
          onResendOtp={handleResendOtp}
          onForgotPassword={handleForgotPassword}
          onPhoneAuth={handlePhoneAuth}
          otpPhone={otpPhone}
          onVerifyPhoneOtp={handleVerifyPhoneOtp}
          onResendPhoneOtp={handleResendPhoneOtp}
          loading={authLoading}
          message={authMessage}
        />
      )}

      {requestModalOpen && user && (
        <RequestModal
          clientId={user.id}
          clientEmail={user.email ?? null}
          clientName={authLabel}
          onClose={() => setRequestModalOpen(false)}
        />
      )}
    </div>
  )
}
