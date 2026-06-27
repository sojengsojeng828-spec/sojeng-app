import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fzutuwlsbayatkcmjbmo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbW9udHFoaXVna2prYWtteWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDU1NDMsImV4cCI6MjA5ODEyMTU0M30.ZrY4_rCdb-PPr-ljINn2e8Pp5bhRF46MTqHCqTONIGM'

export const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null
export const isSupabaseReady = !!supabaseKey
