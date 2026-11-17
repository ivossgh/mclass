import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { convert } from 'html-to-text';
import { createAdminClient } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);
const BATCH_SIZE = 25;

export const maxDuration = 60;

function parseTemplate(
  template: string,
  variables: { name: string | null; email: string; unsubscribeUrl: string }
) {
  const fullName = variables.name?.trim() || 'Olá';
  const firstName = variables.name?.trim().split(' ')[0] || 'Olá';

  return template
    .replace(/\{\{\s*nome\s*\}\}/gi, fullName)
    .replace(/\{\{\s*name\s*\}\}/gi, fullName)
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, firstName)
    .replace(/\{\{\s*email\s*\}\}/gi, variables.email)
    .replace(/\{\{\s*link_descadastro\s*\}\}/gi, variables.unsubscribeUrl)
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, variables.unsubscribeUrl);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    const { data: batch, error: claimError } = await supabase.rpc('claim_pending_emails', {
      p_batch_size: BATCH_SIZE,
    });

    if (claimError) throw claimError;

    if (!batch || batch.length === 0) {
      await supabase.rpc('finalize_completed_campaigns');
      return NextResponse.json({ processed: 0, message: 'Fila vazia.' });
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const item of batch) {
      // URL visual para o usuário abrir no navegador
      const unsubscribeUrl = `${appUrl}/unsubscribe/${item.unsubscribe_token}`;
      // URL da API para o POST silencioso do botão nativo "Cancelar inscrição" do Gmail/Yahoo
      const oneClickUnsubscribeUrl = `${appUrl}/api/unsubscribe/${item.unsubscribe_token}`;

      const personalizedSubject = parseTemplate(item.subject, {
        name: item.contact_name,
        email: item.contact_email,
        unsubscribeUrl,
      });

      let personalizedHtml = parseTemplate(item.html_content, {
        name: item.contact_name,
        email: item.contact_email,
        unsubscribeUrl,
      });

      if (!personalizedHtml.includes(unsubscribeUrl)) {
        personalizedHtml += `
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            Não deseja mais receber nossos e-mails? 
            <a href="${unsubscribeUrl}" style="color: #4b5563; text-decoration: underline;">Descadastrar-se</a>.
          </div>
        `;
      }

      const plainText = item.text_content
        ? parseTemplate(item.text_content, {
            name: item.contact_name,
            email: item.contact_email,
            unsubscribeUrl,
          })
        : convert(personalizedHtml, { wordwrap: 130 });

      try {
        const { data: sendData, error: sendError } = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: item.contact_email,
          subject: personalizedSubject,
          html: personalizedHtml,
          text: plainText,
          headers: {
            'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });

        if (sendError) {
          throw new Error(sendError.message);
        }

        await supabase
          .from('campaign_logs')
          .update({
            status: 'SENT',
            provider_message_id: sendData?.id ?? null,
            sent_at: new Date().toISOString(),
          })
          .eq('id', item.log_id);

        sentCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido no provedor.';
        await supabase
          .from('campaign_logs')
          .update({
            status: 'FAILED',
            error_message: message,
          })
          .eq('id', item.log_id);

        failedCount++;
        errors.push({ email: item.contact_email, error: message });
      }
    }

    await supabase.rpc('finalize_completed_campaigns');

    return NextResponse.json({
      processed: batch.length,
      sent: sentCount,
      failed: failedCount,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error: unknown) {
    console.error('[CRON DISPATCH ERROR]:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}