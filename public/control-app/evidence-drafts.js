const guidedChecks = ['guide_access','guide_equipment','guide_condition','guide_power','guide_isolation'];
const savedFields = ['chargerType','canopy','exterior','interior','safety',...guidedChecks,'issue','exteriorResultNote','interiorResultNote',
  'surroundingsStatus','surroundingsNote','faultStatus','faultNote'];
const checkFields = new Set(['exterior','interior','safety',...guidedChecks]);

export function evidenceDrafts(form,userId) {
  const scope = 'bonyeon-proof:' + JSON.stringify([location.pathname,userId]) + ':';
  const memory = new Map();
  let current;
  const key = () => {
    const { siteId,workDate,zoneId } = form.elements;
    return siteId.value && workDate.value ? scope + JSON.stringify([siteId.value,workDate.value,zoneId.value]) : '';
  };
  function store(record) {
    memory.set(current,record);
    try { localStorage.setItem(current,JSON.stringify(record)); return true; }
    catch { return false; }
  }
  function read(id) {
    if (memory.has(id)) return memory.get(id);
    try { return JSON.parse(localStorage.getItem(id) || 'null'); } catch { return null; }
  }
  function restore() {
    const next = key();
    if (current === next) return;
    current = next;
    if (!next) { form.elements.assetCode.value = ''; return; }
    const record = read(next) || { assetCode: 'AUTO-' + crypto.randomUUID().toUpperCase() };
    form.elements.assetCode.value = record.assetCode;
    form.dataset.assetLabel = record.assetLabel || '';
    for (const field of savedFields) {
      const input = form.elements[field];
      if (!input) continue;
      if (checkFields.has(field)) input.checked = record.values?.[field] ?? input.defaultChecked;
      else if (field.endsWith('Status')) input.value = record.values?.[field] ?? input.options[0].value;
      else input.value = record.values?.[field] ?? '';
    }
    form.elements.faultNote.required = form.elements.faultStatus.value === 'issue';
    form.querySelector('[data-evidence-draft-status]').textContent = record.values ? '이 기기에 임시저장한 증빙을 불러왔습니다.' : '';
    store(record);
  }
  function save() {
    restore();
    if (!current) return false;
    const values = Object.fromEntries(savedFields.filter(name=>form.elements[name]).map(name => {
      const field = form.elements[name];
      return [name,checkFields.has(name) ? field.checked : field.value];
    }));
    const stored = store({ assetCode:form.elements.assetCode.value,assetLabel:form.dataset.assetLabel,values });
    if (!stored) throw new Error('이 기기에 임시저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');
    const { siteId,workDate,zoneId } = form.elements;
    try { localStorage.setItem(scope+'latest',JSON.stringify({ siteId:siteId.value,workDate:workDate.value,zoneId:zoneId.value })); } catch {}
    form.querySelector('[data-evidence-draft-status]').textContent = '이 기기에 임시저장했습니다.';
    return true;
  }
  function useDevice(assetCode,assetLabel) {
    restore();
    if (!current) return;
    form.elements.assetCode.value = assetCode;
    form.dataset.assetLabel = assetLabel || '';
    for (const name of ['safety',...guidedChecks]) if (form.elements[name]) form.elements[name].checked=false;
    store({ assetCode,assetLabel });
  }
  function reset() {
    memory.delete(current);
    try {
      const latest = resume();
      localStorage.removeItem(current);
      if (latest && current === scope + JSON.stringify([latest.siteId,latest.workDate,latest.zoneId])) localStorage.removeItem(scope+'latest');
    } catch {}
    current = null;
    restore();
  }
  function resume() {
    try { return JSON.parse(localStorage.getItem(scope+'latest') || 'null'); } catch { return null; }
  }
  return { restore,save,useDevice,reset,resume };
}
