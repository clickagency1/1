import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { SupportWidget } from '../components/SupportWidget'
import { LanguageProvider } from '../lib/i18n'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'كليك | نصنع حضورك الرقمي',
      },
      {
        name: 'description',
        content: 'كليك شريك تقني لتصميم وبرمجة المواقع والمتاجر والتطبيقات والأنظمة الرقمية باحترافية.',
      },
    ],
    links: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        {/* بيشتغل قبل أي رسم للصفحة عشان يظبط اتجاه اللغة (rtl/ltr) فورًا
            من غير ما يحصل "فلاش" للاتجاه الغلط لحظة قبل ما React يشتغل. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem('click-lang');if(l==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <LanguageProvider>
          {children}
          <SupportWidget />
        </LanguageProvider>
        <Scripts />
      </body>
    </html>
  )
}
