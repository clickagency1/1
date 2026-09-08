// Edge Function: create-payment-intention
// -----------------------------------------------------------------------
// بتتنادى من متصفح العميل (زرار "ادفع الآن") لما الطلب يبقى في حالة
// 'agreed'. بتاخد request_id بس، وبتستخدم توكن المستخدم نفسه (Authorization
// header اللي supabase.functions.invoke بيبعته تلقائيًا) عشان تتأكد –
// عن طريق RLS نفسها، مش عن طريق ثقة عمياء في اللي جاي من المتصفح – إن
// الطلب ده فعلًا بتاعه وإن حالته 'agreed' وسعره محدد، قبل ما تكلم XPay.
//
// مفتاح XPay السري (XPAY_SECRET_KEY، بيبدأ بـ sk_test_ أو sk_live_) بيفضل
// هنا بس على السيرفر، وميوصلش للمتصفح أبدًا. بننشئ Checkout Session (وده
// بيرجع رابط استضافة دفع جاهز)، ونحوّل العميل عليه من الفرونت إند.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const XPAY_API_URL = Deno.env.get('XPAY_API_URL') ?? 'https://api.xpay.app'
const XPAY_SECRET_KEY = Deno.env.get('XPAY_SECRET_KEY')
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://clickagency.online'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'الطريقة غير مسموحة' }, 405)

  if (!XPAY_SECRET_KEY) {
    console.error('Missing XPay secret: XPAY_SECRET_KEY')
    return jsonResponse({ error: 'بوابة الدفع غير مُعدّة بعد. تواصل مع الدعم الفني.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'غير مصرح' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return jsonResponse({ error: 'غير مصرح' }, 401)

  let body: { requestId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400)
  }
  if (!body.requestId) return jsonResponse({ error: 'requestId مطلوب' }, 400)

  // service_requests_view محمي بنفس RLS بتاع جدول requests، فلو الطلب ده مش
  // بتاع صاحب التوكن، الاستعلام هيرجع فاضي — مش هنعتمد على أي بيانات هوية
  // جاية من المتصفح.
  const { data: request, error: requestError } = await supabase
    .from('service_requests_view')
    .select('id, status, price, currency, service, client_email, client_name')
    .eq('id', body.requestId)
    .maybeSingle()

  if (requestError) {
    console.error('request lookup error', requestError)
    return jsonResponse({ error: 'تعذر جلب بيانات الطلب' }, 500)
  }
  if (!request) return jsonResponse({ error: 'الطلب غير موجود' }, 404)
  if (request.status !== 'agreed') return jsonResponse({ error: 'الطلب مش جاهز للدفع دلوقتي' }, 400)
  if (!request.price || request.price <= 0) return jsonResponse({ error: 'السعر غير محدد لهذا الطلب' }, 400)

  // unitAmount عند XPay بالوحدة الصغرى (زي القروش/السنتات)، بالظبط زي أمونت
  // سنتس عند Paymob قبل كده.
  const unitAmount = Math.round(request.price * 100)

  let sessionRes: Response
  try {
    sessionRes = await fetch(`${XPAY_API_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XPAY_SECRET_KEY}`,
        // مفتاح ثبات (idempotency) فريد لكل محاولة دفع (مش ثابت على رقم
        // الطلب) — عشان لو العميل ضغط "ادفع الآن" أكتر من مرة (مثلًا بعد
        // ما السعر أو العملة اتغيّرت)، XPay میرفضش الطلب بحجة إن نفس
        // المفتاح استُخدم قبل كده بباراميترات مختلفة.
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        afterCompletion: {
          type: 'redirect',
          // بنضيف رقم الطلب في الرابط عشان صفحة /account تعرف تفتح بوب أب
          // "تم الدفع بنجاح" لنفس الطلب ده تحديدًا لما العميل يرجع من XPay.
          redirect: { url: `${SITE_URL}/account?paid=${request.id}` },
        },
        lineItems: [
          {
            priceData: {
              currency: request.currency,
              unitAmount,
              productData: { name: request.service },
            },
            quantity: 1,
          },
        ],
        metadata: { requestId: request.id },
      }),
    })
  } catch (error) {
    console.error('XPay network error', error)
    return jsonResponse({ error: 'تعذر الاتصال ببوابة الدفع' }, 502)
  }

  if (!sessionRes.ok) {
    const errText = await sessionRes.text()
    console.error('XPay checkout session error', sessionRes.status, errText)
    return jsonResponse({ error: 'تعذر إنشاء عملية الدفع. راجع مفتاح XPay السري.' }, 502)
  }

  const session = await sessionRes.json()
  const checkoutUrl = session.url
  if (!checkoutUrl) {
    console.error('XPay response missing url', session)
    return jsonResponse({ error: 'رد غير متوقع من بوابة الدفع' }, 502)
  }

  return jsonResponse({ checkoutUrl })
})
