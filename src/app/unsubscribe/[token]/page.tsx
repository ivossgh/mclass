'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function UnsubscribePage() {
  const params = useParams<{ token: string }>();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      if (!params?.token) return;

      const { data, error } = await supabase.rpc('get_unsubscribe_info', {
        p_token: params.token,
      });

      if (error || !data || data.length === 0) {
        setInvalidToken(true);
      } else {
        setMaskedEmail(data[0].masked_email);
        setStatus(data[0].status);
      }
      setLoading(false);
    }

    loadInfo();
  }, [params?.token, supabase]);

  async function handleConfirmUnsubscribe() {
    setProcessing(true);
    const { data, error } = await supabase.rpc('unsubscribe_contact', {
      p_token: params.token,
    });

    if (!error && data) {
      setStatus('UNSUBSCRIBED');
    }
    setProcessing(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        {loading ? (
          <p className="text-sm text-slate-500">Verificando solicitação...</p>
        ) : invalidToken ? (
          <>
            <h1 className="text-lg font-bold text-slate-900">Link inválido</h1>
            <p className="text-sm text-slate-600 mt-2">
              Não encontramos nenhum contato associado a este link de descadastro.
            </p>
          </>
        ) : status === 'UNSUBSCRIBED' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              ✓
            </div>
            <h1 className="text-lg font-bold text-slate-900">Descadastro confirmado</h1>
            <p className="text-sm text-slate-600 mt-2">
              O e-mail <span className="font-medium text-slate-900">{maskedEmail}</span> foi
              removido da nossa lista de envios e não receberá mais comunicações.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-slate-900">Cancelar inscrição</h1>
            <p className="text-sm text-slate-600 mt-2">
              Você deseja remover o e-mail{' '}
              <span className="font-medium text-slate-900">{maskedEmail}</span> da nossa lista
              de contatos?
            </p>
            <button
              onClick={handleConfirmUnsubscribe}
              disabled={processing}
              className="mt-6 w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              {processing ? 'Processando...' : 'Confirmar descadastro'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}