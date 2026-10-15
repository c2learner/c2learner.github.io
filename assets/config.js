/* Supabase project for accounts and progress sync.
   Both values are public by design (Supabase → Project Settings → API → Project URL / anon public key).
   Leave them empty to run the site without accounts, with progress kept only in this browser. */
window.LEXICON_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  allowSignup: true,   // stage 1: anyone with a code can create an account; becomes false when teachers invite students
};
