import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: profiles, error: pErr } = await supabase
    .from('group_members')
    .select('*, profile:profiles(*)');

  if (pErr) {
    console.error('Error fetching group_members with profiles:', pErr);
  } else {
    console.log('Success!', profiles.slice(0, 1));
  }
}

test();
