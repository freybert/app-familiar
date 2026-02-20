import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || '';

// Debugging for Vercel blank screen
if (import.meta.env.PROD) {
    console.log('Production Environment Check:');
    console.log('URL defined:', !!supabaseUrl);
    console.log('Key defined:', !!supabaseKey);
    if (!supabaseUrl || !supabaseKey) {
        console.error('CRITICAL: Supabase environment variables are missing in Vercel. Please check Project Settings > Environment Variables.');
    }
}

export const supabase = createClient(supabaseUrl, supabaseKey);
