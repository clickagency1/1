// طبقة بيانات مربوطة بـ Supabase (Postgres + Realtime).
// البيانات مفصولة فعليًا في جداول منفصلة في القاعدة:
//   requests  → بيانات الطلب الأساسية والحالة
//   offers    → السعر والمدة (يحددها الأدمن)
//   payments  → عملية الدفع
//   messages  → المحادثة
// القراءة بتتم من service_requests_view (view بيجمع الجداول التلاتة الأولى)
// عشان باقي الكود يتعامل مع "الطلب" كوحدة واحدة بدون تعقيد joins يدويًا،
// لكن الكتابة بتروح لكل جدول لوحده حسب نوع البيانات.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type RequestStatus =
  | 'submitted'
  | 'priced'
  | 'accepted'
  | 'rejected'
  | 'agreed'
  | 'paid'
  | 'completed'

export interface ServiceRequest {
  id: string
  clientId: string
  clientEmail: string | null
  clientName: string
  service: string
  description: string
  status: RequestStatus
  price: number | null
  currency: 'EGP'
  deliverable: string | null
  deadline: string | null // ISO date
  createdAt: string
  updatedAt: string
  paidAt: string | null
  paymentMethod: 'card' | 'apple-pay' | null
  gatewayPaymentId: string | null
}

export interface ChatMessage {
  id: string
  requestId: string
  sender: 'client' | 'admin'
  senderName: string
  text: string
  attachmentPath: string | null
  attachmentName: string | null
  attachmentType: 'image' | 'file' | null
  createdAt: string
}

export type SupportTicketStatus = 'open' | 'closed'

export interface SupportTicket {
  id: string
  clientId: string
  clientEmail: string | null
  clientName: string
  status: SupportTicketStatus
  createdAt: string
  updatedAt: string
}

export interface SupportMessage {
  id: string
  ticketId: string
  sender: 'client' | 'support'
  senderName: string
  text: string
  createdAt: string
}

// ---- تحويل صفوف قاعدة البيانات (snake_case) لشكل الواجهة (camelCase) ----

interface ViewRow {
  id: string
  client_id: string
  client_email: string | null
  client_name: string
  service: string
  description: string
  status: RequestStatus
  price: number | null
  currency: 'EGP'
  deliverable: string | null
  deadline: string | null
  created_at: string
  updated_at: string
  paid_at: string | null
  payment_method: 'card' | 'apple-pay' | null
  gateway_payment_id: string | null
}

interface MessageRow {
  id: string
  request_id: string
  sender: 'client' | 'admin'
  sender_name: string
  text: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_type: 'image' | 'file' | null
  created_at: string
}

interface SupportTicketRow {
  id: string
  client_id: string
  client_email: string | null
  client_name: string
  status: SupportTicketStatus
  created_at: string
  updated_at: string
}

interface SupportMessageRow {
  id: string
  ticket_id: string
  sender: 'client' | 'support'
  sender_name: string
  text: string
  created_at: string
}

function mapRequest(row: ViewRow): ServiceRequest {
  return {
    id: row.id,
    clientId: row.client_id,
    clientEmail: row.client_email,
    clientName: row.client_name,
    service: row.service,
    description: row.description,
    status: row.status,
    price: row.price,
    currency: row.currency,
    deliverable: row.deliverable,
    deadline: row.deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at,
    paymentMethod: row.payment_method,
    gatewayPaymentId: row.gateway_payment_id,
  }
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    requestId: row.request_id,
    sender: row.sender,
    senderName: row.sender_name,
    text: row.text,
    attachmentPath: row.attachment_path,
    attachmentName: row.attachment_name,
    attachmentType: row.attachment_type,
    createdAt: row.created_at,
  }
}

function mapSupportTicket(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    clientId: row.client_id,
    clientEmail: row.client_email,
    clientName: row.client_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSupportMessage(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    sender: row.sender,
    senderName: row.sender_name,
    text: row.text,
    createdAt: row.created_at,
  }
}

// ---- قراءة (من الـ view المجمّعة) ----

export async function listRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests_view')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as ViewRow[]).map(mapRequest)
}

export async function listRequestsForClient(clientId: string): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests_view')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as ViewRow[]).map(mapRequest)
}

export async function listMessages(requestId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as MessageRow[]).map(mapMessage)
}

// ---- كتابة (كل جزء بيانات بيروح لجدوله) ----

export async function createRequest(input: {
  clientId: string
  clientEmail: string | null
  clientName: string
  service: string
  description: string
}): Promise<ServiceRequest> {
  const { data, error } = await supabase
    .from('requests')
    .insert({
      client_id: input.clientId,
      client_email: input.clientEmail,
      client_name: input.clientName,
      service: input.service,
      description: input.description,
    })
    .select()
    .single()
  if (error) throw error

  // الطلب لسه ملوش عرض ولا دفعة، فبنبني شكل ServiceRequest يدويًا بدل قراءة الـ view تاني
  return {
    id: data.id,
    clientId: data.client_id,
    clientEmail: data.client_email,
    clientName: data.client_name,
    service: data.service,
    description: data.description,
    status: data.status,
    price: null,
    currency: 'EGP',
    deliverable: null,
    deadline: null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    paidAt: null,
    paymentMethod: null,
    gatewayPaymentId: null,
  }
}

export async function updateRequestStatus(id: string, status: RequestStatus): Promise<void> {
  const { error } = await supabase.from('requests').update({ status }).eq('id', id)
  if (error) throw error
}

/**
 * بيبعت لـ Edge Function `create-payment-intention` (سيرفر Supabase) عشان
 * تنشئ Checkout Session في XPay وترجع رابط الدفع الآمن. المفتاح السري بتاع
 * XPay مش موجود في الفرونت إند خالص، كله على السيرفر.
 */
export async function createPaymentIntention(requestId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ checkoutUrl?: string; error?: string }>(
    'create-payment-intention',
    { body: { requestId } },
  )
  if (error) throw error
  if (!data?.checkoutUrl) throw new Error(data?.error || 'تعذر إنشاء عملية الدفع.')
  return data.checkoutUrl
}

export async function saveOffer(
  id: string,
  offer: { price: number; deliverable: string; deadline: string },
): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .upsert(
      { request_id: id, price: offer.price, deliverable: offer.deliverable, deadline: offer.deadline },
      { onConflict: 'request_id' },
    )
  if (error) throw error
}

export async function addMessage(input: {
  requestId: string
  sender: 'client' | 'admin'
  senderName: string
  text: string
  attachment?: { path: string; name: string; type: 'image' | 'file' }
}): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      request_id: input.requestId,
      sender: input.sender,
      sender_name: input.senderName,
      text: input.text,
      attachment_path: input.attachment?.path ?? null,
      attachment_name: input.attachment?.name ?? null,
      attachment_type: input.attachment?.type ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapMessage(data as MessageRow)
}

const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments'
const MAX_CHAT_ATTACHMENT_BYTES = 25 * 1024 * 1024 // لازم يتطابق مع file_size_limit بتاع الباكت في schema.sql

/**
 * برفع ملف/صورة لباكت التخزين الخاص بمرفقات المحادثة، جوه مسار مبني على
 * رقم الطلب (عشان سياسات RLS تقدر تتحقق من الملكية). بيرجّع المسار المخزّن
 * (مش رابط مباشر — الباكت خاص، والروابط بتتولّد وقت العرض فقط).
 */
export async function uploadChatAttachment(
  requestId: string,
  file: File,
): Promise<{ path: string; name: string; type: 'image' | 'file' }> {
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error('حجم الملف أكبر من الحد المسموح (25 ميجا).')
  }
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-150)
  const path = `${requestId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return { path, name: file.name, type: file.type.startsWith('image/') ? 'image' : 'file' }
}

/** بيرجّع رابط موقّت (ساعة) لعرض/تحميل مرفق مخزّن. */
export async function getChatAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).createSignedUrl(path, 3600)
  if (error) return null
  return data.signedUrl
}

// ---- تزامن لحظي (Realtime) ----
// بيسمع لأي تغيير في الجداول الأربعة ويستدعي callback عشان الشاشة تعيد التحميل.
// كل استدعاء بياخد اسم قناة فريد (بدل اسم ثابت) عشان لو أكتر من مكوّن
// (زي صفحة "طلباتي" وشات الطلب جواها) بيشتركوا في نفس الوقت، مايحصلش تعارض
// على قناة واحدة مشتركة بالفعل (اللي بيسبب "cannot add postgres_changes
// callbacks after subscribe()").
let channelCounter = 0

export function subscribeToStore(callback: () => void) {
  channelCounter += 1
  const channelName = `click-store-changes-${channelCounter}`
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, callback)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/** يعيد تشغيل أي مكوّن يستخدمه كل مرة يحصل فيها تغيير في القاعدة (بديل useStoreTick القديم). */
export function useStoreTick() {
  const [, setTick] = useState(0)
  useEffect(() => subscribeToStore(() => setTick((tick) => tick + 1)), [])
}

// ===== نظام الدعم (منفصل عن نظام الطلبات، جداول وقناة realtime خاصة به) =====

/**
 * بيرجّع تذكرة الدعم "المفتوحة" الحالية للعميل، ولو مفيش واحدة بيعمل
 * وحدة جديدة. بالشكل ده كل عميل عنده محادثة دعم مستمرة واحدة في كل مرة.
 */
export async function getOrCreateSupportTicket(input: {
  clientId: string
  clientEmail: string | null
  clientName: string
}): Promise<SupportTicket> {
  const { data: existing, error: findError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('client_id', input.clientId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return mapSupportTicket(existing as SupportTicketRow)

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ client_id: input.clientId, client_email: input.clientEmail, client_name: input.clientName })
    .select()
    .single()
  if (error) throw error
  return mapSupportTicket(data as SupportTicketRow)
}

export async function listSupportTicketsForStaff(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as SupportTicketRow[]).map(mapSupportTicket)
}

export async function listSupportMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as SupportMessageRow[]).map(mapSupportMessage)
}

export async function addSupportMessage(input: {
  ticketId: string
  sender: 'client' | 'support'
  senderName: string
  text: string
}): Promise<SupportMessage> {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: input.ticketId,
      sender: input.sender,
      sender_name: input.senderName,
      text: input.text,
    })
    .select()
    .single()
  if (error) throw error
  return mapSupportMessage(data as SupportMessageRow)
}

export async function closeSupportTicket(id: string): Promise<void> {
  const { error } = await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', id)
  if (error) throw error
}

let supportChannelCounter = 0

export function subscribeToSupportStore(callback: () => void) {
  supportChannelCounter += 1
  const channelName = `click-support-changes-${supportChannelCounter}`
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, callback)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
