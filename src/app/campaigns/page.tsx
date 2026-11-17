'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Campaign = Database['public']['Tables']['campaigns']['Row'];

export default function CampaignsPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<
    Record<string, { total: number; sent: number; failed: number }>
  >({});
  const [loading, setLoading] = useState(true);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    const list = data ?? [];
    setCampaigns(list);

    // Busca contagem de logs por campanha
    const { data: logs } = await supabase
      .from('campaign_logs')
      .select('campaign_id, status');

    const map: Record<string, { total: number; sent: number; failed: number }> =
      {};
    (logs ?? []).forEach((log) => {
      if (!map[log.campaign_id]) {
        map[log.campaign_id] = { total: 0, sent: 0, failed: 0 };
      }
      map[log.campaign_id].total++;
      if (log.status === 'SENT') map[log.campaign_id].sent++;
      if (log.status === 'FAILED') map[log.campaign_id].failed++;
    });

    setStats(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  async function handleStartNow(campaignId: string) {
    if (!confirm('Iniciar enfileiramento e disparo desta campanha agora?')) return;
    const { data, error } = await supabase.rpc('enqueue_campaign', {
      p_campaign_id: campaignId,
    });
    if (error) {
      alert('Erro ao iniciar campanha: ' + error.message);
    } else {
      alert(`Campanha enfileirada para ${data} contatos ativos!`);
      loadCampaigns();
    }
  }

  async function handleTogglePause(campaign: Campaign) {
    const nextStatus = campaign.status === 'SENDING' ? 'PAUSED' : 'SENDING';
    await supabase
      .from('campaigns')
      .update({ status: nextStatus })
      .eq('id', campaign.id);
    loadCampaigns();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campanhas</h1>
          <p className="text-sm text-slate-500">
            Crie, agende, pause ou acompanhe seus envios em lote
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCampaigns}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Atualizar
          </button>
          <Link
            href="/campaigns/new"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            + Nova Campanha
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Carregando campanhas...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhuma campanha criada ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {campaigns.map((camp) => {
              const s = stats[camp.id] || { total: 0, sent: 0, failed: 0 };
              return (
                <div
                  key={camp.id}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">
                        {camp.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Assunto: <strong>{camp.subject}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Segmentação:{' '}
                      {camp.target_tags.length > 0
                        ? camp.target_tags.join(', ')
                        : 'Todos os contatos ativos'}
                    </p>
                    {s.total > 0 && (
                      <p className="text-xs font-medium text-slate-700 pt-1">
                        Progresso: {s.sent} enviados de {s.total}{' '}
                        {s.failed > 0 && `(${s.failed} falhas)`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(camp.status === 'DRAFT' || camp.status === 'SCHEDULED') && (
                      <button
                        onClick={() => handleStartNow(camp.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                      >
                        Disparar Agora
                      </button>
                    )}

                    {(camp.status === 'SENDING' || camp.status === 'PAUSED') && (
                      <button
                        onClick={() => handleTogglePause(camp)}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600"
                      >
                        {camp.status === 'SENDING' ? 'Pausar' : 'Retomar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}