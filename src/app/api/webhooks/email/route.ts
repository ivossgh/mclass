import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    created_at?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as ResendWebhookPayload;
    const messageId = payload?.data?.email_id;

    if (!messageId) {
      return NextResponse.json({ ignored: true }, { status: 200 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Localiza o log correspondente pelo ID retornado pelo Resend no momento do disparo
    const { data: log } = await supabase
      .from('campaign_logs')
      .select('id, contact_id, opened_at, clicked_at')
      .eq('provider_message_id', messageId)
      .maybeSingle();

    if (!log) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    switch (payload.type) {
      case 'email.opened':
        if (!log.opened_at) {
          await supabase
            .from('campaign_logs')
            .update({ opened_at: now })
            .eq('id', log.id);
        }
        break;

      case 'email.clicked':
        await supabase
          .from('campaign_logs')
          .update({
            clicked_at: log.clicked_at ?? now,
            opened_at: log.opened_at ?? now,
          })
          .eq('id', log.id);
        break;

      case 'email.bounced':
        await Promise.all([
          supabase
            .from('campaign_logs')
            .update({
              status: 'BOUNCED',
              error_message: 'Hard/Soft bounce reportado pelo provedor.',
            })
            .eq('id', log.id),
          supabase
            .from('contacts')
            .update({ status: 'BOUNCED' })
            .eq('id', log.contact_id),
        ]);
        break;

      case 'email.complained':
        // Se o destinatário marcou como spam, remove imediatamente de futuros envios
        await supabase
          .from('contacts')
          .update({ status: 'UNSUBSCRIBED' })
          .eq('id', log.contact_id);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[RESEND WEBHOOK ERROR]:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}