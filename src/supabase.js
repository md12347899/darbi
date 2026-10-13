import {createClient} from '@supabase/supabase-js'
// المفتاح العام (anon) مصمم ليكون ظاهرًا في المتصفح؛ الحماية الحقيقية من سياسات RLS في schema.sql

// تنظيف القيم: مسافات وعلامات اقتباس زائدة
const clean = v =>
  String(v ?? '').trim().replace(/^["']+|["']+$/g, '').trim()

// الرابط يجب أن يكون جذر المشروع فقط
// بدون / في النهاية وبدون /rest/v1 أو /auth/v1
const url = clean(import.meta.env.VITE_SUPABASE_URL)
  .replace(/\/+$/, '')
  .replace(/\/(rest|auth)\/v1$/, '')
  .replace(/\/+$/, '')
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const ready = Boolean(url && key && /^https?:\/\//.test(url))
export const supabase = ready ? createClient(url, key) : null
