// Edge Function: paymob-webhook
// -----------------------------------------------------------------------
// URL عام (بدون تسجيل دخول) بينده Paymob عليه بعد أي محاولة دفع (Transaction
// Processed Callback). ده الـ endpoint اللي حطيناه في notification_url وقت
// إنشاء الـ intention، ولازم يتسجل كمان يدويًا مرة واحدة في Paymob Dashboard
// (Developers → Payment Integrations → التكامل بتاع الكارت).
//
// **لازم** نتحقق من توقيع HMAC قبل ما نصدّق أي بيانات جايه هنا، لأن أي حد
// يقدر يبعت POST مزوّر لنفس الرابط. من غير التحقق ده، أي حد يقدر "يدفع"
// أي طلب من غير ما يدفع فعلًا. التحقق بيتم بحساب SHA512 HMAC لقيم مجموعة
// حقول محددة (بترتيب ثابت من مستندات Paymob) ومقارنتها بالـ hmac اللي جاي
// في الـ query string.
//
// service_role key بيوصل تلقائي كـ env var لكل Edge Function منشورة على
// Supabase، فمحتاجين نضيفه إحنا يدويًا كسر.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const HMAC_SECRET = Deno.env.get('PAYMOB_HMAC_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// الترتيب ده ثابت من مستندات Paymob (HMAC Calculation) — ممنوع نغيّره أو
// نرتبه أبجديًا، لازم يفضل زي ما هو بالظبط.
const HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
]

// deno-lint-ignore no-explicit-any
function getPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

// deno-lint-ignore no-explicit-any
async function computeHmac(obj: any, secret: string) {
  const concatenated = HMAC_FIELDS.map((field) => {
    const value = getPath(obj, field)
    return value === null || value === undefined ? '' : String(value)
  }).join('')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(concatenated))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!HMAC_SECRET) {
    console.error('Missing PAYMOB_HMAC_SECRET secret')
    return new Response('Server misconfigured', { status: 500 })
  }

  const url = new URL(req.url)
  const receivedHmac = url.searchParams.get('hmac')
  if (!receivedHmac) return new Response('Missing hmac', { status: 400 })

  // deno-lint-ignore no-explicit-any
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid payload', { status: 400 })
  }

  const obj = payload?.obj
  if (!obj) return new Response('Missing obj', { status: 400 })

  const calculatedHmac = await computeHmac(obj, HMAC_SECRET)
  if (calculatedHmac !== receivedHmac) {
    console.error('Paymob webhook: HMAC mismatch — تجاهلنا الطلب.')
    return new Response('Invalid signature', { status: 401 })
  }

  // بس نسجّل الدفعة لو العملية نجحت فعلًا (success) ومش pending، وبنتجاهل
  // أي حاجة تانية (فشل، استرجاع، إلغاء...) في نفس الـ endpoint من غير خطأ.
  if (!obj.success || obj.pending) {
    return new Response('Ignored (not a successful, final transaction)', { status: 200 })
  }

  const requestId: string | undefined = obj.order?.merchant_order_id ?? payload?.extras?.request_id
  if (!requestId) {
    console.error('Paymob webhook: missing merchant_order_id/request_id', obj.order)
    return new Response('Missing merchant_order_id', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // upsert على request_id (عمود unique في جدول payments) عشان لو Paymob
  // بعت نفس الـ webhook أكتر من مرة (شائع جدًا) ميتكررش الصف ولا يفشل.
  const { error: insertError } = await supabase.from('payments').upsert(
    {
      request_id: requestId,
      amount: (obj.amount_cents ?? 0) / 100,
      currency: obj.currency ?? 'SAR',
      method: 'card',
      provider_payment_id: String(obj.id),
    },
    { onConflict: 'request_id' },
  )
  if (insertError) {
    console.error('Paymob webhook: payment insert error', insertError)
    return new Response('DB error', { status: 500 })
  }

  const { error: statusError } = await supabase
    .from('requests')
    .update({ status: 'paid' })
    .eq('id', requestId)
  if (statusError) {
    console.error('Paymob webhook: status update error', statusError)
    return new Response('DB error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
