import { validMailbox } from './addresses.mjs';

export const maxClientRecipients = 20;

export function normalizeClientRecipients(value) {
  const items = typeof value === 'string' ? value.split(/[,;\r\n]+/) : value;
  if (!Array.isArray(items) || items.length > 100 || items.some(item => typeof item !== 'string')) return null;
  const recipients = [...new Set(items.map(item => item.trim().toLowerCase()).filter(Boolean))];
  if (recipients.length > maxClientRecipients || recipients.some(email => !validMailbox(email))) return null;
  return recipients;
}

export function clientRecipients(row) {
  let saved;
  try { saved = JSON.parse(row?.contractor_emails || '[]'); } catch { return []; }
  if (!Array.isArray(saved)) return [];
  return normalizeClientRecipients(saved.length ? saved : row?.contractor_email || '') || [];
}

// Older single-address settings remain valid until an administrator replaces them.
export const clientRecipientsSql = alias => `CASE WHEN json_array_length(${alias}.contractor_emails)>0
  THEN ${alias}.contractor_emails ELSE json_array(${alias}.contractor_email) END`;

export const finalClientReportSql = alias => `${alias}.status='approved'
  AND ${alias}.planned_units>0 AND ${alias}.units=${alias}.planned_units`;
