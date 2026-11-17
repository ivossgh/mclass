'use client';

import { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { Database, ContactStatus } from '@/types/database';

type Contact = Database['public']['Tables']['contacts']['Row'];

export default function ContactsPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContactStatus>('ALL');

  // Estados Cadastro Manual
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Estados Importação Planilha
  const [batchTag, setBatchTag] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }
    if (search.trim()) {
      query = query.or(
        `email.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`
      );
    }

    const { data } = await query;
    setContacts(data ?? []);
    setLoading(false);
  }, [supabase, statusFilter, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // 1. Salvar contato manual
  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    setSavingManual(true);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const { error } = await supabase.rpc('import_contacts_batch', {
      p_contacts: [
        {
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          tags: parsedTags,
        },
      ],
    });

    if (error) {
      alert('Erro ao salvar contato: ' + error.message);
    } else {
      setEmail('');
      setName('');
      setTagsInput('');
      fetchContacts();
    }
    setSavingManual(false);
  }

  // 2. Importar planilha CSV ou XLSX
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      const extraTags = batchTag
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const formatted = rows
        .map((row) => {
          // Procura colunas flexíveis (email, e-mail, Email, etc.)
          const keys = Object.keys(row);
          const emailKey = keys.find((k) =>
            ['email', 'e-mail', 'mail'].includes(k.trim().toLowerCase())
          );
          const nameKey = keys.find((k) =>
            ['nome', 'name', 'cliente', 'lead'].includes(k.trim().toLowerCase())
          );
          const tagKey = keys.find((k) =>
            ['tag', 'tags', 'segmento', 'lista'].includes(k.trim().toLowerCase())
          );

          const rawEmail = emailKey ? String(row[emailKey] ?? '').trim() : '';
          const rawName = nameKey ? String(row[nameKey] ?? '').trim() : '';
          const rowTags = tagKey
            ? String(row[tagKey] ?? '')
                .split(',')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean)
            : [];

          return {
            email: rawEmail,
            name: rawName || undefined,
            tags: Array.from(new Set([...rowTags, ...extraTags])),
          };
        })
        .filter((item) => item.email.includes('@'));

      if (formatted.length === 0) {
        alert(
          'Nenhum e-mail válido encontrado. Certifique-se de que a planilha tenha uma coluna chamada "email".'
        );
        setImporting(false);
        return;
      }

      // Envia em blocos de 500 para a RPC do Supabase
      let inserted = 0;
      let updated = 0;
      let ignored = 0;

      for (let i = 0; i < formatted.length; i += 500) {
        const chunk = formatted.slice(i, i + 500);
        const { data, error } = await supabase.rpc('import_contacts_batch', {
          p_contacts: chunk,
        });

        if (error) throw error;
        if (data) {
          inserted += data.inserted ?? 0;
          updated += data.updated ?? 0;
          ignored += data.ignored ?? 0;
        }
      }

      setImportSummary(
        `Importação concluída: ${inserted} novos, ${updated} atualizados, ${ignored} ignorados.`
      );
      setBatchTag('');
      fetchContacts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo.';
      alert(msg);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este contato permanentemente?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    fetchContacts();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
        <p className="text-sm text-slate-500">
          Adicione leads manualmente ou importe planilhas .xlsx / .csv
        </p>
      </div>

      {/* Blocos de Entrada: Manual + Planilha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cadastro Manual */}
        <form
          onSubmit={handleManualAdd}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-slate-900">Cadastro Manual</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                E-mail *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lead@dominio.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="cliente-vip, lancamento"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingManual}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {savingManual ? 'Salvando...' : 'Adicionar Contato'}
          </button>
        </form>

        {/* Importação Planilha */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">
            Importar Planilha (.xlsx ou .csv)
          </h2>
          <p className="text-xs text-slate-500">
            A planilha deve conter uma coluna <strong>email</strong> (e
            opcionalmente <strong>nome</strong> e <strong>tags</strong>).
            Contatos já existentes terão as tags mescladas sem perder o status.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Aplicar tag a todos desta planilha (opcional)
            </label>
            <input
              type="text"
              value={batchTag}
              onChange={(e) => setBatchTag(e.target.value)}
              placeholder="ex: lista-novembro-2026"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
              {importing ? 'Processando planilha...' : 'Selecionar Arquivo (.xlsx / .csv)'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={importing}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          {importSummary && (
            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {importSummary}
            </p>
          )}
        </div>
      </div>

      {/* Filtros e Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-full sm:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ContactStatus)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="UNSUBSCRIBED">Descadastrados</option>
            <option value="BOUNCED">Bounce</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Carregando...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {c.name || '—'}
                      </p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length === 0 ? (
                          <span className="text-xs text-slate-400">sem tags</span>
                        ) : (
                          c.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : c.status === 'UNSUBSCRIBED'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}