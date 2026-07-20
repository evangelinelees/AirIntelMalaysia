import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const supabase = createSupabaseRouteClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { message } = await req.json();

  const n8nRes = await fetch(`${process.env.N8N_HOST}/webhook/v1/admin-broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AirIntel-Secret': process.env.AIRINTEL_SHARED_SECRET!,
    },
    body: JSON.stringify({ message, adminRole: 'admin' }),
  });

  const data = await n8nRes.json();
  return NextResponse.json(data, { status: n8nRes.status });
}
