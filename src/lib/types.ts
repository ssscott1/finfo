export type LeadStatus = 'New' | 'Contacted' | 'In Progress' | 'Referred' | 'Completed' | 'Lost';

export const PRODUCTS = [
  'Car Loan', 'Boat Loan', 'Personal Loan', 'Mortgage',
  'Accountant', 'Financial Adviser', 'SMSF Setup', 'Insurance',
] as const;

export const STATUSES: LeadStatus[] = [
  'New', 'Contacted', 'In Progress', 'Referred', 'Completed', 'Lost',
];

export interface Lead {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  state: string;
  timeframe: string;
  product: string;
  status: LeadStatus;
  source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  type: string;
  content: string;
  created_at: string;
}
