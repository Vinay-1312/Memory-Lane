import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function getMemories() {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('date', { ascending: true })

  if (error) throw error
  return data
}

export async function addMemory({ date, description, media_url, media_type }) {
  const { data, error } = await supabase
    .from('memories')
    .insert([{ date, description, media_url, media_type }])
    .select()

  if (error) throw error
  return data[0]
}

export async function deleteMemory(id) {
  const { error } = await supabase.from('memories').delete().eq('id', id)
  if (error) throw error
}
