// app/api/super-admin/exists/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('super_admins')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('exists check error:', error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
  return NextResponse.json({ exists: (count ?? 0) > 0 });
}