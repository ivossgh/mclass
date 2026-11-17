import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { convert } from 'html-to-text';
import { createClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { to, subject, htmlContent } = await req.json();

  if (!to || !subject || !htmlContent) {
    return NextResponse.json(
      { error: 'Preencha destinatário, assunto e conteúdo.' },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const previewHtml = String(htmlContent)
    .replace(/\{\{\s*nome\s*\}\}/gi, 'Operador Teste')
    .replace(/\{\{\s*name\s*\}\}/gi, 'Operador Teste')
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, 'Operador')
    .replace(/\{\{\s*email\s*\}\}/gi, to)
    .replace(/\{\{\s*link_descadastro\s*\}\}/gi, `${appUrl}/unsubscribe/teste`)
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, `${appUrl}/unsubscribe/teste`);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: String(to).trim(),
    subject: `[TESTE] ${subject}`,
    html: previewHtml,
    text: convert(previewHtml, { wordwrap: 130 }),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}