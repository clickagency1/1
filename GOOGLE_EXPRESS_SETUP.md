# Google Login through Node.js/Express

هذا المشروع أصبح يحتوي على مسار OAuth اختياري عبر Express بدلًا من
`supabase.auth.signInWithOAuth` في المتصفح. بعد التحقق من Google، يرسل Express
رمز Google قصير العمر مرة واحدة إلى المتصفح، والمتصفح يستبدله بجلسة Supabase
باستخدام `signInWithIdToken`. لذلك تظل سياسات RLS والجداول الحالية تعمل كما هي.

## التشغيل

1. أنشئ OAuth Client من نوع **Web application** في Google Cloud Console.
2. أضف Redirect URI مطابقًا تمامًا لـ `GOOGLE_CALLBACK_URL`، مثل:
   `https://clickagency.online/auth/google/callback`.
3. في شاشة OAuth consent اضبط اسم التطبيق والدومين المصرّح به (Authorized
   domain) على نطاقك. لا تضع `GOOGLE_CLIENT_SECRET` في الواجهة أو في أي متغير
   يبدأ بـ `VITE_`.
4. فعّل Google provider في Supabase أيضًا؛ فهو يستقبل ID token وينشئ جلسة
   Supabase، لكنه لم يعد يدير إعادة التوجيه إلى Google.
5. انسخ `.env.server.example` إلى متغيرات بيئة الخادم، ثم:

   ```bash
   npm install
   npm run build
   npm run start:express
   ```

   محليًا يمكنك إنشاء ملف `.env` بجوار `package.json` ونسخ القيم إليه؛ الخادم
   يقرأه عبر دعم Node المدمج. لا ترفع هذا الملف إلى Git. عند النشر على Render استخدم
   تبويب **Environment** بدل رفع ملف `.env`، أو استخدم ملف `render.yaml`
   المرفق الذي يطلب القيم السرية أثناء إعداد الخدمة.

   شغّل الخادم خلف HTTPS (مثل Nginx/Render/Railway/Fly.io). يجب أن يكون
   `APP_URL` و`FRONTEND_ORIGIN` نفس النطاق العام الذي يفتح منه المستخدم الموقع.

## مهم بخصوص الدومين الظاهر في Google

تدفق Express يجعل Google يتعامل مع OAuth Client الخاص بك، وبالتالي يظهر اسم
التطبيق/الدومين الذي ضبطته في Google Cloud بدل اسم مشروع Supabase العشوائي.
هذا لا يغيّر عنوان API الخاص بـ Supabase نفسه. إذا أردت أن تكون روابط Auth وAPI
نفسها على نطاقك (`api.example.com`) فهذه ميزة **Supabase Custom Domains** وهي
إضافة مدفوعة؛ لا يمكن لخادم Express تغيير رابط مشروع Supabase المجاني.

للتطوير المحلي استخدم قيمًا منفصلة:

```env
APP_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:3000
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

وسجّل callback المحلي نفسه في Google Cloud. لا تستخدم `*` ولا تقبل `returnTo`
خارجيًا؛ الخادم يتحقق من أن القيمة مسار محلي لمنع open redirect.
