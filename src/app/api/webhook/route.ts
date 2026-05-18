import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const REFERRAL_TYPE_TO_PRODUCT: Record<string, string> = {
  'car loan':                   'Car Loan',
  'car, boat & personal loans': 'Car Loan',
  'boat loan':                  'Boat Loan',
  'personal loan':              'Personal Loan',
  'home loan':                  'Mortgage',
  'home loan referral':         'Mortgage',
  'mortgage':                   'Mortgage',
  'accountant':                 'Accountant',
  'financial adviser':          'Financial Adviser',
  'financial advisor':          'Financial Adviser',
  'smsf setup':                 'SMSF Setup',
  'smsf':                       'SMSF Setup',
  'insurance':                  'Insurance',
};

const FORM_NAME_TO_PRODUCT: Record<string, string> = {
  'car-loan':          'Car Loan',
  'boat-loan':         'Boat Loan',
  'personal-loan':     'Personal Loan',
  'mortgage':          'Mortgage',
  'accountant':        'Accountant',
  'financial-adviser': 'Financial Adviser',
  'smsf-setup':        'SMSF Setup',
  'insurance':         'Insurance',
};

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[webhook] payload:', JSON.stringify(body));
  const data = (body.data as Record<string, string>) ?? {};
  const formName = ((body.form_name as string) ?? '').toLowerCase();

  // Newsletter-only form — no lead to create
  if (formName === 'finfo-subscribers') {
    console.log(`[webhook] Newsletter: ${data.email}`);
    return NextResponse.json({ success: true, skipped: 'newsletter' });
  }

  // finfo.com.au forms use hyphenated field names
  const firstname = (data['first-name'] ?? data.firstname ?? '').trim();
  const lastname  = (data['last-name']  ?? data.lastname  ?? '').trim();

  if (!firstname && !lastname) {
    return NextResponse.json({ error: 'Missing name fields' }, { status: 400 });
  }

  const referralType = (data['referral-type'] ?? data.referral_type ?? '').toLowerCase();
  const product =
    data.product ??
    REFERRAL_TYPE_TO_PRODUCT[referralType] ??
    REFERRAL_TYPE_TO_PRODUCT[Object.keys(REFERRAL_TYPE_TO_PRODUCT).find(k => referralType.includes(k)) ?? ''] ??
    FORM_NAME_TO_PRODUCT[formName] ??
    'Unknown';

  const now = new Date().toISOString();
  const lead = {
    id:         randomUUID(),
    firstname,
    lastname,
    email:      (data.email     ?? '').trim(),
    phone:      (data.phone     ?? '').trim(),
    state:      (data.state     ?? '').trim(),
    timeframe:  (data.timeframe ?? '').trim(),
    product,
    status:     'New',
    source:     'Finfo Website',
    notes:      (data.message   ?? data.notes ?? '').trim(),
    created_at: (body.created_at as string) ?? now,
    updated_at: now,
  };

  const supabase = createServiceClient();
  const { error } = await supabase.from('leads').insert(lead);

  if (error) {
    console.error('[webhook] Supabase insert error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  console.log(`[webhook] Lead created: ${lead.firstname} ${lead.lastname} — ${lead.product}`);
  return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
}
