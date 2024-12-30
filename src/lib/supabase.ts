import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vmosommpjhpawkanucoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtb3NvbW1wamhwYXdrYW51Y29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMTg4NTcsImV4cCI6MjA1MDU5NDg1N30.XtL4l5rEajnnOslELP9iITQynlXTOjaV_3p-c_vSKFc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);