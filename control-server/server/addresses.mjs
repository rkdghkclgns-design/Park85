const mailboxLocalPart = /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const mailboxDomainLabel = /^[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i;

export function validMailbox(address) {
  if (typeof address !== 'string' || address.length > 254 || /\s/.test(address)) return false;
  const [local, domain, extra] = address.split('@');
  if (!domain || extra !== undefined || local.length > 64 || !mailboxLocalPart.test(local)) return false;
  const labels = domain.split('.');
  return labels.length > 1 && labels.every(label => mailboxDomainLabel.test(label));
}
