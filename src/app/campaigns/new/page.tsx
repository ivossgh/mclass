'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewCampaignPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [targetTags, setTargetTags] = useState('');
  const [htmlContent, setHtmlContent] = useState(
    `<p>Olá, {{primeiro_nome}}!</p>\n<p>Escreva sua mensagem aqui...</p>`
  );
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(mode: 'DRAFT' | 'SCHEDULED' | 'NOW') {
    if (!name.trim() || !subject.trim() || !htmlContent.trim()) {
      alert('Preencha nome interno, assunto e conteúdo do e-mail.');
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const tagsArray = targetTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: name.trim(),
        subject: subject.trim(),
        html_content: htmlContent,
        target_tags: tagsArray,
        status: mode === 'SCHEDULED' && scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduled_at:
          mode === 'SCHEDULED' && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (error || !campaign) {
      alert('Erro ao criar campanha: ' + error?.message);
      setSaving(false);
      return;
    }

    if (mode === 'NOW') {
      const { error: enqueueError } = await supabase.rpc('enqueue_campaign', {
        p_campaign_id: campaign.id,
      });
      if (enqueueError) {
        alert('Campanha salva, mas erro ao enfileirar: ' + enqueueError.message);
      }
    }

    router.push('/campaigns');
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nova Campanha</h1>
        <p className="text-sm text-slate-500">
          Variáveis disponíveis: <code>{'{{primeiro_nome}}'}</code>,{' '}
          <code>{'{{nome}}'}</code>, <code>{'{{email}}'}</code>,{' '}
          <code>{'{{link_descadastro}}'}</code>
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome interno da campanha *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Newsletter Novembro #01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Assunto do e-mail *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: {{primeiro_nome}}, novidades importantes para você"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Filtrar por Tags (deixe vazio para enviar a TODOS os contatos ativos)
          </label>
          <input
            type="text"
            value={targetTags}
            onChange={(e) => setTargetTags(e.target.value)}
            placeholder="Ex: cliente-vip, evento-picos"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Conteúdo HTML *
          </label>
          <textarea
            rows={10}
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Agendar para (opcional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('DRAFT')}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Salvar Rascunho
            </button>
            {scheduledAt && (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('SCHEDULED')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Agendar
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('NOW')}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
            >
              {saving ? 'Processando...' : 'Disparar Agora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}