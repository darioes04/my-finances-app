import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zvufcwgqtqyzyvxplnht.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2dWZjd2dxdHF5enl2eHBsbmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTM0MjYsImV4cCI6MjA5MDcyOTQyNn0.wLRaVBeOqn80gPtNfBe_m4d27TMwiinNAPf2UqmoRL0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
