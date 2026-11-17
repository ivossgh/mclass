import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'MClass Mail — Disparo Interno',
  description: 'Gestão de contatos e disparos de e-mail',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <Navbar userEmail={user?.email} />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}