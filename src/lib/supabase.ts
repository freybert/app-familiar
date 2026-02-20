import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bpidiwrdbsltiogkckhc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaWRpd3JkYnNsdGlvZ2tja2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDkyOTksImV4cCI6MjA4NzA4NTI5OX0.praZQ2Hc5gDy57qsZmtu-qfVeykI9DMCXriez2463_0';
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
