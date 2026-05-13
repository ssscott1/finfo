'use client';
import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Lead, LeadStatus } from '@/lib/types';
import { PRODUCTS, STATUSES } from '@/lib/types';

const STATUS_COLOR: Record<string, string> = {
  'New': '#2563EB', 'Contacted': '#7C3AED', 'In Progress': '#D97706',
  'Referred': '#059669', 'Completed': '#00C16A', 'Lost': '#9CA3AF',
};

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
const TIMEFRAMES = ['ASAP', '1-3 months', '3-6 months', '6-12 months', '12+ months'];

export default function DashboardClient({ initialLeads, userEmail }: { initialLeads: Lead[], userEmail: string }) {
  const [leads, setLeads]         = useState<Lead[]>(initialLeads);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFStatus] = useState('');
  const [filterProduct, setFProd] = useState('');
  const [selected, setSelected]   = useState<Lead | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch('/api/leads');
      if (res.ok) setLeads(await res.json());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => leads.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterProduct && l.product !== filterProduct) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!`${l.firstname} ${l.lastname} ${l.email} ${l.phone}`.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [leads, search, filterStatus, filterProduct]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'New').length,
    thisMonth: leads.filter(l => l.created_at?.startsWith(new Date().toISOString().slice(0, 7))).length,
  }), [leads]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/crm/login');
  }

  async function updateStatus(id: string, status: LeadStatus) {
    await fetch(`/api/leads/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    if (selected?.id === id) setSelected(s => s ? { ...s, status } : s);
  }

  async function saveLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const isEdit = !!(selected?.id);
    const url = isEdit ? `/api/leads/${selected.id}` : '/api/leads';
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated: Lead = await res.json();
      if (isEdit) setLeads(ls => ls.map(l => l.id === updated.id ? updated : l));
      else setLeads(ls => [updated, ...ls]);
      setSelected(null);
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    setLeads(ls => ls.filter(l => l.id !== id));
    setSelected(null);
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const editLead = selected && !showAdd ? selected : null;

  return (
    <div style={s.shell}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoText}>finfo</span>
          <span style={s.logoTag}>CRM</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.userEmail}>{userEmail}</span>
          <button style={s.signOutBtn} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div style={s.body}>
        {/* Stats */}
        <div style={s.stats}>
          {[
            { label: 'Total Leads', value: stats.total },
            { label: 'New', value: stats.new },
            { label: 'This Month', value: stats.thisMonth },
          ].map(({ label, value }) => (
            <div key={label} style={s.stat}>
              <div style={s.statVal}>{value}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={s.toolbar}>
          <input
            style={s.search}
            placeholder="Search name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={s.select} value={filterStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(st => <option key={st}>{st}</option>)}
          </select>
          <select style={s.select} value={filterProduct} onChange={e => setFProd(e.target.value)}>
            <option value="">All products</option>
            {PRODUCTS.map(p => <option key={p}>{p}</option>)}
          </select>
          <button style={s.addBtn} onClick={() => { setSelected(null); setShowAdd(true); }}>+ Add Lead</button>
        </div>

        {/* Table */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Name', 'Product', 'Status', 'Source', 'Date', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>No leads found</td></tr>
              )}
              {filtered.map(lead => (
                <tr key={lead.id} style={s.tr} onClick={() => { setShowAdd(false); setSelected(lead); }}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>{lead.firstname} {lead.lastname}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{lead.email}</div>
                  </td>
                  <td style={s.td}>{lead.product}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: STATUS_COLOR[lead.status] + '20', color: STATUS_COLOR[lead.status] }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={s.td}>{lead.source}</td>
                  <td style={s.td}>{fmt(lead.created_at)}</td>
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    <select
                      style={s.miniSelect}
                      value={lead.status}
                      onChange={e => updateStatus(lead.id, e.target.value as LeadStatus)}
                    >
                      {STATUSES.map(st => <option key={st}>{st}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead detail / Add lead panel */}
      {(editLead || showAdd) && (
        <div style={s.overlay} onClick={() => { setSelected(null); setShowAdd(false); }}>
          <div style={s.panel} onClick={e => e.stopPropagation()}>
            <h2 style={s.panelTitle}>{showAdd ? 'Add Lead' : `${editLead!.firstname} ${editLead!.lastname}`}</h2>
            <form onSubmit={saveLead}>
              <div style={s.row2}>
                <Field label="First name" name="firstname" defaultValue={editLead?.firstname} required />
                <Field label="Last name" name="lastname" defaultValue={editLead?.lastname} required />
              </div>
              <div style={s.row2}>
                <Field label="Email" name="email" type="email" defaultValue={editLead?.email} />
                <Field label="Phone" name="phone" type="tel" defaultValue={editLead?.phone} />
              </div>
              <div style={s.row2}>
                <SelectField label="State" name="state" defaultValue={editLead?.state} options={['', ...AU_STATES]} />
                <SelectField label="Timeframe" name="timeframe" defaultValue={editLead?.timeframe} options={['', ...TIMEFRAMES]} />
              </div>
              <div style={s.row2}>
                <SelectField label="Product" name="product" defaultValue={editLead?.product} options={['', ...PRODUCTS]} required />
                <SelectField label="Status" name="status" defaultValue={editLead?.status ?? 'New'} options={STATUSES} />
              </div>
              <Field label="Notes" name="notes" defaultValue={editLead?.notes} textarea />
              <div style={s.panelActions}>
                {editLead && (
                  <button type="button" style={s.deleteBtn} onClick={() => deleteLead(editLead.id)}>Delete</button>
                )}
                <button type="button" style={s.cancelBtn} onClick={() => { setSelected(null); setShowAdd(false); }}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, name, defaultValue, type = 'text', required, textarea }: {
  label: string; name: string; defaultValue?: string; type?: string; required?: boolean; textarea?: boolean;
}) {
  const style: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: textarea ? 'vertical' : undefined,
    minHeight: textarea ? 80 : undefined,
  };
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      {textarea
        ? <textarea name={name} defaultValue={defaultValue} style={style} />
        : <input name={name} type={type} defaultValue={defaultValue} required={required} style={style} />
      }
    </div>
  );
}

function SelectField({ label, name, defaultValue, options, required }: {
  label: string; name: string; defaultValue?: string; options: readonly string[]; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, boxSizing: 'border-box' }}
      >
        {options.map(o => <option key={o} value={o}>{o || '— select —'}</option>)}
      </select>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { minHeight: '100vh', background: '#f5f7f5', display: 'flex', flexDirection: 'column' },
  header: {
    background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px',
    height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: { display: 'flex', alignItems: 'baseline', gap: 6 },
  logoText: { fontSize: 22, fontWeight: 800, color: '#0A2E1A', letterSpacing: '-1px' },
  logoTag: {
    fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    background: '#00C16A', color: '#fff', borderRadius: 4, padding: '2px 6px',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  userEmail: { fontSize: 13, color: '#6B7280' },
  signOutBtn: { padding: '6px 14px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, cursor: 'pointer' },
  body: { padding: 24, flex: 1 },
  stats: { display: 'flex', gap: 16, marginBottom: 24 },
  stat: { background: '#fff', borderRadius: 12, padding: '20px 24px', flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  statVal: { fontSize: 32, fontWeight: 800, color: '#0A2E1A' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  toolbar: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  search: {
    flex: '1 1 200px', padding: '9px 14px', borderRadius: 8,
    border: '1px solid #D1D5DB', fontSize: 14, outline: 'none',
  },
  select: { padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 },
  addBtn: {
    padding: '9px 20px', background: '#00C16A', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  tableWrap: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' },
  tr: { borderBottom: '1px solid #F3F4F6', cursor: 'pointer' },
  td: { padding: '12px 16px', fontSize: 14, verticalAlign: 'middle' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  miniSelect: { padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' },
  panel: { background: '#fff', width: '100%', maxWidth: 520, height: '100%', overflowY: 'auto', padding: 32, boxShadow: '-4px 0 24px rgba(0,0,0,.1)' },
  panelTitle: { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 24px' },
  row2: { display: 'flex', gap: 12 },
  panelActions: { display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' },
  deleteBtn: { padding: '10px 18px', borderRadius: 8, border: 'none', background: '#FFF1F0', color: '#C0392B', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginRight: 'auto' },
  cancelBtn: { padding: '10px 18px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer' },
  saveBtn: { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#00C16A', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
