# إعداد Supabase الآمن

## 1. إعداد المتغيرات

أضف في إعدادات الاستضافة أو محليًا في `.env` (ولا ترفع الملف إلى Git أو ZIP):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

المفتاح العام فقط مسموح في المتصفح. لا تضع `service_role` أو مفتاح بوابة الدفع في أي متغير يبدأ بـ`VITE_`.

بعد فك أي نسخة محدّثة من المشروع، نفّذ `npm install` مرة واحدة قبل التشغيل — ضفنا مكتبتين جديدتين (`jspdf`, `html2canvas`) مسؤولتين عن توليد إيصال الدفع كـ PDF.

## 2. تشغيل السكيمة

انسخ محتوى `supabase/schema.sql` بالكامل إلى **Supabase Dashboard → SQL Editor** ثم اضغط Run. ينشئ:

- `profiles`: اسم المستخدم ودوره (`client` أو `admin` أو `support`).
- `requests`, `offers`, `payments`, `messages`.
- `support_tickets`, `support_messages`: نظام دعم منفصل تمامًا عن نظام الطلبات (صفحة `/support`).
- باكت تخزين خاص `chat-attachments` لمرفقات المحادثة (ملفات/صور تسليم المشروع)، مع سياسات RLS تمنع أي طرف يشوف مرفقات طلب مش بتاعه.
- سياسات RLS التي تمنع العميل من تغيير حالة طلبه إلا من `priced` إلى `accepted` أو `rejected`.
- منع تسجيل دفعة من المتصفح؛ لا بد من webhook/Edge Function موثوق.

> **تحديث على مشروع شغّال بالفعل؟** الملف آمن تعيد تشغيله كامل أكتر من مرة
> (فيه `drop constraint if exists` و`create or replace`)، فقط انسخه والصقه
> من جديد في SQL Editor وشغّله عشان تضيف حالة `rejected`، جداول الدعم،
> باكت مرفقات المحادثة، وحقول المرفقات في جدول `messages` لو كانت قاعدتك
> مُنشأة بنسخة أقدم من هذا الملف.

## 3. إنشاء المدير وموظف الدعم بدون وضع بريدهم في التطبيق

1. أنشئ الحساب (مدير أو موظف دعم) من صفحة الموقع أو من **Authentication → Users**.
2. انسخ `UUID` الخاص بالحساب من Supabase Dashboard.
3. نفّذ الأمر المناسب في SQL Editor بعد استبدال القيمة فقط:

```sql
-- لحساب مدير (يقدر يشوف /admin و /support)
update public.profiles
set role = 'admin'
where id = 'PUT-ADMIN-USER-UUID-HERE';

-- لحساب موظف دعم (يشوف /support بس)
update public.profiles
set role = 'support'
where id = 'PUT-SUPPORT-USER-UUID-HERE';
```

لا يوجد بريد مدير أو دعم في ملفات frontend أو في RLS. الواجهة تقرأ دور المستخدم الحالي من `profiles`، بينما قاعدة البيانات تحمي كل البيانات عبر `is_admin()` و`is_support_staff()`.

## 4. ربط بوابة الدفع (XPay — مصر)

واجهة إدخال البطاقة أُزيلت عمدًا: لا يجوز إرسال أو تخزين بيانات البطاقة داخل
الموقع. الدفع بيتم بالكامل على صفحة XPay المستضافة (Checkout Session)،
وبيانات النجاح بترجع لنا فقط عن طريق **webhook** موقّع (HMAC-SHA256) نتحقق
منه على السيرفر — العميل ولا حتى الأدمن يقدر "يزوّر" دفعة ناجحة.

### 4.1 هات المفاتيح من XPay

1. سجّل دخولك على [لوحة XPay](https://app.xpay.app).
2. من القائمة: **Developer → API Keys** وانسخ الـ **Secret Key** (يبدأ بـ
   `sk_test_...` في وضع الاختبار، أو `sk_live_...` في وضع الإنتاج). الوضع
   (اختبار/حي) بيتحدد من نوع المفتاح نفسه، مش من رابط منفصل.
3. من **Developer → Webhooks**: أضف Endpoint جديد ورابطه هيكون رابط
   `xpay-webhook` (هتاخده من الخطوة 4.2 تحت)، واختر الحدث
   `checkout.session.completed`. XPay هيديك وقتها **Signing Secret** يبدأ
   بـ `whsec_...` — ده اللي هيتحط في `XPAY_WEBHOOK_SECRET`.
4. لاحظ إن وضع الاختبار ووضع الإنتاج ليهم Webhook Endpoints منفصلة، كل
   واحد بسر توقيع (`whsec_`) خاص بيه.

### 4.2 نشر الـ Edge Functions

المشروع فيه فنكشنين جاهزين في `supabase/functions/`:
- `create-payment-intention`: بيتنادى من زرار "ادفع الآن" في `/account`، بيتأكد إن الطلب بتاع نفس المستخدم وحالته `agreed`، وبينشئ Checkout Session في XPay برقم سري (Secret Key) موجود على السيرفر بس.
- `xpay-webhook`: رابط عام بيستقبل حدث `checkout.session.completed` من XPay، **يتحقق من توقيع HMAC-SHA256 أولًا** (هيدر `XPay-Signature`)، وبعدين بس يسجّل الدفعة في جدول `payments` ويحوّل الطلب لـ `paid`.

انشرهم باستخدام [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy create-payment-intention
npx supabase functions deploy xpay-webhook --no-verify-jwt
```

`--no-verify-jwt` مهم لـ `xpay-webhook` لأن XPay مش هيبعت توكن مستخدم — التحقق الحقيقي بيتم بالتوقيع (HMAC) جوه الكود نفسه.

بعد النشر، انسخ رابط `xpay-webhook` (شكله `https://YOUR_PROJECT.supabase.co/functions/v1/xpay-webhook`) وحطه في خطوة 4.1.3 فوق.

### 4.3 ضبط أسرار الفنكشنز (مفيش سر منهم يوصل للمتصفح خالص)

```bash
npx supabase secrets set XPAY_SECRET_KEY=sk_test_xxxxxxxxxxxx
npx supabase secrets set XPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
npx supabase secrets set SITE_URL=https://clickagency.online
```

`SUPABASE_URL` و`SUPABASE_ANON_KEY` و`SUPABASE_SERVICE_ROLE_KEY` بيتوفروا تلقائيًا لكل Edge Function منشورة — مش محتاج تضيفهم إنت.

### 4.4 التجربة في وضع الاختبار

XPay بيدّيك بطاقة اختبار ناجحة في صفحة **Test mode & test cards** بالتوثيق
بتاعه (رقم `5123 4500 0000 0008` بتاريخ انتهاء `01/39` وقت كتابة السطور
دي — تأكد منها في لوحتك لأنها ممكن تتغيّر). اعمل طلب كامل من الموقع لحد ما
يوصل لحالة `agreed`، دوس "ادفع الآن"، وجرب بالبطاقة التجريبية. لو نجحت،
هتلاقي صف جديد اتضاف في `payments` وحالة الطلب اتغيرت لـ `paid` تلقائيًا
بمجرد وصول الـ webhook (ممكن ياخد كام ثانية).

لما تكون جاهز فعليًا: بدّل `XPAY_SECRET_KEY` بمفتاح `sk_live_...`، وأنشئ
Webhook Endpoint منفصل لوضع الإنتاج في خطوة 4.1.3 وحط سره الجديد
(`whsec_...`) في `XPAY_WEBHOOK_SECRET`.

## 5. فحص سريع بعد التشغيل

```sql
select tablename from pg_tables where schemaname = 'public';
select policyname, tablename from pg_policies where schemaname = 'public';
select id, role, created_at from public.profiles order by created_at desc;
```

## 6. إعداد التحقق ومنع الحسابات غير المؤكدة

من **Authentication → Providers** فعّل **Confirm email** وفعّل مزود **Phone** مع بوابة SMS الفعلية أو `sms-hook` الموجود في المشروع. لا تمنح أي صلاحيات أو طلبات للمستخدم قبل تأكيد رمز OTP؛ التطبيق يفعل ذلك تلقائيًا، وملف `schema.sql` ينسخ البريد/الجوال ووقت تأكيدهما من `auth.users` إلى `profiles`.

عدم وصول الرسالة ليس دليلًا قاطعًا أن الرقم أو البريد مزيف (قد يكون عطل شبكة أو حظر رسائل). لا تحظر الحساب تلقائيًا لهذا السبب. استخدم تقرير حالة التسليم من مزود SMS أو ارتداد البريد المؤكد فقط، ثم احظر الحساب من **Authentication → Users**؛ عندها لن يستطيع استقبال رموز جديدة.
