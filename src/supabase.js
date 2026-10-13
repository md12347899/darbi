import {createClient} from '@supabase/supabase-js'
// المفتاح العام (anon) مصمم ليكون ظاهرًا في المتصفح؛ الحماية الحقيقية من سياسات RLS في schema.sql
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const ready = Boolean(url && key)
export const supabase = ready ? createClient(url, key) : null
