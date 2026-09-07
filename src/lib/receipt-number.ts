import type { ServiceRequest } from './store'

/**
 * رقم إيصال فريد لكل عملية دفع. بنفضّل رقم عملية بوابة الدفع نفسها
 * (provider_payment_id) لأنه رقم صادر من مصدر خارجي (XPay/Paymob) وعمود
 * unique في القاعدة، فمستحيل يتكرر — وبس لو مش موجود (سجل قديم) بنرجع
 * لأول 8 خانات من رقم الطلب كبديل احتياطي.
 */
export function getReceiptNumber(request: ServiceRequest): string {
  return request.gatewayPaymentId
    ? `CLK-${request.gatewayPaymentId.toUpperCase()}`
    : `CLK-${request.id.slice(0, 8).toUpperCase()}`
}
