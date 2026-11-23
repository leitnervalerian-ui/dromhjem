import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://civiovuovtffnucmawqt.supabase.co/rest/v1/';
const supabasePublishableKey = 'sb_publishable_C9DL1pOqNlFRoiUKywATGg_f66i6d1b';

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);