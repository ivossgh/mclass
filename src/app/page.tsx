import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';



export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: activeContacts },
    { count: unsubscribedContacts },
    { count: sentEmails },
    { data: recentCampaigns },
  ] = await Promise.all([
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE'),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'UNSUBSCRIBED'),
    supabase
      .from('campaign_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SENT'),
    supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-sm text-slate-500">
            Resumo da base de contatos e status dos disparos
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/contacts"
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            + Adicionar Contatos
          </Link>
          <Link
            href="/campaigns/new"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            + Nova Campanha
          </Link>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">
            Contatos Ativos
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {activeContacts ?? 0}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">
            E-mails Enviados
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {sentEmails ?? 0}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">
            Descadastrados
          </p>
          <p className="text-3xl font-bold text-slate-600 mt-2">
            {unsubscribedContacts ?? 0}
          </p>
        </div>
      </div>

      {/* Últimas Campanhas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Últimas Campanhas</h2>
          <Link
            href="/campaigns"
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Ver todas →
          </Link>
        </div>

        {!recentCampaigns || recentCampaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhuma campanha criada ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recentCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{camp.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assunto: {camp.subject}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {camp.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}