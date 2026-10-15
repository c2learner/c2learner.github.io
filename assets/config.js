/* Supabase project for accounts and progress sync.
   Both values are public by design (Supabase → Project Settings → API → Project URL / anon public key).
   Leave them empty to run the site without accounts, with progress kept only in this browser. */
window.LEXICON_CONFIG = {
  supabaseUrl: 'https://cpnjfzmgctlropsoqpqn.supabase.co',
  supabaseAnonKey: 'sb_publishable_5sFL67XpSmw1pDGKrQiqig_Oe5Tf9OA',
  allowSignup: true,   // stage 1: anyone with a code can create an account; becomes false when teachers invite students
};
