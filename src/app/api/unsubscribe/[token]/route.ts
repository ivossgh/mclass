import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('unsubscribe_contact', {
    p_token: token,
  });

  if (error || !data) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const url = new URL(`/unsubscribe/${token}`, req.url);
  return NextResponse.redirect(url);
}