import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search  = (searchParams.get('search')  ?? '').toLowerCase();
  const status  = searchParams.get('status')  ?? '';
  const product = searchParams.get('product') ?? '';
  const state   = searchParams.get('state')   ?? '';
  const sort    = searchParams.get('sort')    ?? 'created_at';
  const dir     = searchParams.get('dir')     ?? 'desc';

  const allowed = ['created_at', 'updated_at', 'firstname', 'product', 'status'];
  const col = allowed.includes(sort) ? sort : 'created_at';

  let query = supabase.from('leads').select('*').order(col, { ascending: dir === 'asc' });

  if (status)  query = query.eq('status', status);
  if (product) query = query.eq('product', product);
  if (state)   query = query.eq('state', state);

  const { data: leads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = search
    ? leads.filter(l =>
        `${l.firstname} ${l.lastname}`.toLowerCase().includes(search) ||
        (l.email ?? '').toLowerCase().includes(search) ||
        (l.phone ?? '').toLowerCase().includes(search)
      )
    : leads;

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.firstname?.trim() || !body.lastname?.trim()) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
  }
  if (!body.product) {
    return NextResponse.json({ error: 'Product is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const lead = {
    id:         randomUUID(),
    firstname:  body.firstname.trim(),
    lastname:   body.lastname.trim(),
    email:      body.email?.trim() ?? '',
    phone:      body.phone?.trim() ?? '',
    state:      body.state ?? '',
    timeframe:  body.timeframe ?? '',
    product:    body.product,
    status:     body.status ?? 'New',
    source:     body.source ?? 'Manual Entry',
    notes:      body.notes?.trim() ?? '',
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from('leads').insert(lead).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
