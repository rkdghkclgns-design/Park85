const evidenceSteps=['setup','before','after','results'];

export function recoveryMatches(saved,site,today) {
  return Boolean(saved && site && saved.siteId===site.id && saved.assignmentDue===site.nextDue
    && /^\d{4}-\d{2}-\d{2}$/.test(saved.workDate || '')
    && Number.isFinite(Date.parse(saved.workDate+'T00:00:00Z'))
    && new Date(saved.workDate+'T00:00:00Z').toISOString().slice(0,10)===saved.workDate
    && saved.workDate>=site.nextDue && saved.workDate<=today);
}

export function safeRecoveryStep(requested,{guidance,setup,before,after}) {
  if (!guidance) return 'site';
  if (!evidenceSteps.includes(requested)) return 'site';
  if (requested==='setup' || !setup) return 'setup';
  if (requested==='before' || !before) return 'before';
  if (requested==='after' || !after) return 'after';
  return 'results';
}

export function workRecovery(scope) {
  const key=scope+'flow';
  let stored;
  return {
    read() {try {return JSON.parse(localStorage.getItem(key) || 'null');} catch {return null;}},
    save(value) {try {const text=JSON.stringify(value);if(text!==stored)localStorage.setItem(key,text);stored=text;return true;} catch {return false;}},
    clear() {try {localStorage.removeItem(key);stored=undefined;} catch {}},
  };
}
