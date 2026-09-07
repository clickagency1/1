import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Language = 'ar' | 'en'

const STORAGE_KEY = 'click-lang'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

/**
 * بيدير لغة الموقع كله (عربي/إنجليزي) وبيحفظها في localStorage عشان تفضل
 * زي ما هي بعد أي ريفريش أو تنقل بين الصفحات، لحد ما المستخدم يغيّرها بنفسه.
 *
 * ليه بنبدأ بـ 'ar' دايمًا في أول رندر (حتى لو المحفوظ 'en')؟ لأن الصفحة
 * دي بتترندر على السيرفر (SSR) بلغة عربية ثابتة، فلو بدأنا بقيمة مختلفة من
 * localStorage هيحصل "hydration mismatch" بين السيرفر والمتصفح. الحل:
 * نبدأ زي السيرفر بالظبط، وبعد ما الصفحة تتحمّل (useEffect بيشتغل في
 * المتصفح بس) نقرأ القيمة المحفوظة ونحوّل اللغة فورًا لو مختلفة.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'ar' || stored === 'en') setLanguageState(stored)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    window.localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const setLanguage = (lang: Language) => setLanguageState(lang)
  const toggleLanguage = () => setLanguageState((current) => (current === 'ar' ? 'en' : 'ar'))

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage لازم يتستخدم جوه LanguageProvider')
  return ctx
}
