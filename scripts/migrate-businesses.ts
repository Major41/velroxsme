// // scripts/migrate-businesses.ts
// import bcrypt from 'bcryptjs';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// async function migrateBusinesses() {
//   const { data: rows } = await supabase
//     .from('businesses')
//     .select('id, admin_password, password_hash');

//   for (const r of rows ?? []) {
//     if (r.password_hash) continue;                 // already hashed
//     if (!r.admin_password) continue;               // nothing to hash
//     const password_hash = await bcrypt.hash(r.admin_password, 10);
//     await supabase
//       .from('businesses')
//       .update({ password_hash, admin_password: null })
//       .eq('id', r.id);
//     console.log('Migrated', r.id);
//   }
// }

// migrateBusinesses().then(() => console.log('done'));