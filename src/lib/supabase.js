import { createClient } from '@supabase/supabase-js'

const supabaseUrl ='https://zrkdvmcmmsnpbsclantd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpya2R2bWNtbXNucGJzY2xhbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4MjcyNDUsImV4cCI6MjA0NjQwMzI0NX0.bt8-l5kWheEBw-FM0cQRdrVkQlsKqozQlxZ7dxPBKNc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
