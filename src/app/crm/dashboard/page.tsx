import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();

  return <DashboardClient initialLeads={leads ?? []} userEmail={user?.email ?? ''} />;
}
