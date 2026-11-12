import { esc } from './ui.js';

export function evidenceZoneEditor({ id,siteId,zoneId,zoneName,canMoveZone }) {
  if (!id || !canMoveZone) return '';
  return `<details class="work-details" data-evidence-zone-editor>
    <summary>작업 구역 옮기기</summary>
    <form class="stack" data-move-evidence="${esc(id)}" data-site="${esc(siteId)}" data-zone="${esc(zoneId || '')}">
      <p class="small muted">현재 구역 · ${esc(zoneName || '구역 미지정')}</p>
      <div class="row">
        <label class="field"><span>옮길 구역</span><select name="zoneId" required disabled></select></label>
        <button class="btn compact primary" type="submit" disabled>사진과 작업 기록 옮기기</button>
      </div>
      <p class="small" role="status"></p>
    </form>
  </details>`;
}

export function evidenceZoneBatchEditor(records) {
  const sites = Map.groupBy(records.filter(row=>row.id && row.canMoveZone),row=>row.siteId);
  const groups = [...sites.values()].filter(rows=>rows.length>=2);
  if (!groups.length) return '';
  const siteField = groups.length===1 ? `<input type="hidden" name="siteId" value="${esc(groups[0][0].siteId)}">`
    : `<label class="field"><span>작업 현장</span><select name="siteId" required>
        <option value="">현장 선택</option>${groups.map(([row])=>`<option value="${esc(row.siteId)}">${esc(row.siteName)}</option>`).join('')}
      </select></label>`;
  return `<details class="report-control-row work-details" data-evidence-zone-editor>
    <summary>충전기 여러 대 한 번에 옮기기</summary>
    <form class="stack" data-move-evidence-batch>
      ${siteField}
      ${groups.map(rows=>`<fieldset class="stack work-fieldset" data-move-site="${esc(rows[0].siteId)}" hidden>
        <legend>${groups.length===1 && rows[0].siteName ? esc(rows[0].siteName) + ' · ' : ''}옮길 충전기</legend>
        <label class="check"><input type="checkbox" data-move-all disabled>선택 가능한 충전기 모두 선택</label>
        ${rows.map(row=>`<label class="check"><input type="checkbox" value="${esc(row.id)}" data-move-item data-zone="${esc(row.zoneId || '')}" disabled>
          <span><strong>${esc(row.assetLabel)}</strong> · ${esc(row.zoneName || '구역 미지정')}${row.workDate ? ' · ' + esc(row.workDate) : ''}</span>
        </label>`).join('')}
      </fieldset>`).join('')}
      <div class="row">
        <label class="field"><span>옮길 구역</span><select name="zoneId" required disabled></select></label>
        <button class="btn compact primary" type="submit" disabled>선택한 사진과 작업 기록 옮기기</button>
      </div>
      <p class="small" data-move-count aria-live="polite">충전기 2대 이상을 선택해 주세요.</p>
      <p class="small" role="status"></p>
    </form>
  </details>`;
}

function updateBatchSelection(form) {
  const { siteId,zoneId } = form.elements;
  let count=0;
  let alreadyThere=0;
  for (const group of form.querySelectorAll('[data-move-site]')) {
    const active=group.dataset.moveSite===siteId.value;
    group.hidden=!active;
    const inputs=[...group.querySelectorAll('[data-move-item]')];
    for (const field of inputs) {
      const sameZone=Boolean(zoneId.value) && field.dataset.zone===zoneId.value;
      field.disabled=!active || sameZone;
      if (field.disabled) field.checked=false;
      if (active && sameZone) alreadyThere++;
    }
    const available=inputs.filter(field=>!field.disabled);
    const checked=available.filter(field=>field.checked).length;
    const all=group.querySelector('[data-move-all]');
    all.disabled=!available.length;
    all.checked=Boolean(available.length) && checked===available.length;
    all.indeterminate=checked>0 && checked<available.length;
    count+=checked;
  }
  const message=count ? '작업 기록 ' + count + '건 선택' : '충전기 2대 이상을 선택해 주세요.';
  form.querySelector('[data-move-count]').textContent=message + (alreadyThere ? ' · 대상 구역에 있는 ' + alreadyThere + '건 제외' : '');
  form.querySelector('button').disabled=Boolean(form.dataset.saving) || count<2 || zoneId.disabled || !zoneId.value;
}

export function evidenceZoneMoveMessage(count,zoneName) {
  const subject=count>1 ? '선택한 작업 기록 ' + count + '건과 사진을 ' : '사진과 작업 기록을 ';
  return subject + '‘' + zoneName + '’으로 옮겼습니다.';
}

export function mountEvidenceZoneEditors(root,api,signal,onMoved) {
  if (!root) return;
  let moving=false;
  const loading = new WeakMap();
  async function loadZones(form) {
    const batch=form.hasAttribute('data-move-evidence-batch');
    const siteId=batch ? form.elements.siteId.value : form.dataset.site;
    const field=form.elements.zoneId;
    const button=form.querySelector('button');
    const status=form.querySelector('[role="status"]');
    const request={};
    loading.set(form,request);
    field.replaceChildren();
    button.disabled=field.disabled=true;
    status.classList.remove('error');
    status.textContent='';
    if (batch) updateBatchSelection(form);
    if (!siteId) { loading.delete(form); return; }
    status.textContent='이 현장의 작업 구역을 불러오는 중입니다.';
    try {
      const { zones }=await api('work/zones?' + new URLSearchParams({ siteId }),{ signal });
      if (signal.aborted || !form.isConnected || loading.get(form)!==request) return;
      const targets=zones.filter(zone=>zone.id!==form.dataset.zone);
      field.replaceChildren(new Option('구역 선택',''),...targets.map(zone=>new Option(zone.name,zone.id)));
      button.disabled=field.disabled=!targets.length;
      if (batch) updateBatchSelection(form);
      status.textContent=targets.length ? '' : '옮길 구역이 없습니다. 이 현장에 작업 구역을 추가해 주세요.';
    } catch (error) {
      if (!signal.aborted && loading.get(form)===request) {
        status.classList.add('error');
        status.textContent=error.message;
      }
    } finally { if (loading.get(form)===request) loading.delete(form); }
  }
  root.addEventListener('toggle',event=>{
    const editor=event.target;
    if (!editor.matches('[data-evidence-zone-editor]') || !editor.open) return;
    const form=editor.querySelector('form');
    if (!loading.has(form) && !form.dataset.saving) void loadZones(form);
  },{ capture:true,signal });
  root.addEventListener('change',event=>{
    const field=event.target;
    const form=field.closest('form[data-move-evidence-batch]');
    if (!form || form.dataset.saving) return;
    if (field.name==='siteId') { void loadZones(form); return; }
    if (field.hasAttribute('data-move-all')) {
      for (const item of field.closest('fieldset').querySelectorAll('[data-move-item]:enabled')) item.checked=field.checked;
    }
    updateBatchSelection(form);
  },{ signal });
  root.addEventListener('submit',async event=>{
    const form=event.target;
    const batch=form.hasAttribute('data-move-evidence-batch');
    if (!batch && !form.hasAttribute('data-move-evidence')) return;
    event.preventDefault();
    const button=form.querySelector('button');
    if (moving || button.disabled) return;
    const status=form.querySelector('[role="status"]');
    const { siteId,zoneId:zoneField }=form.elements;
    const zoneId=zoneField.value;
    const moves=batch ? [...form.querySelectorAll('[data-move-item]:enabled:checked')].map(field=>({
      id:field.value,fromZoneId:field.dataset.zone || null,
    })) : [{ id:form.dataset.moveEvidence,fromZoneId:form.dataset.zone || null }];
    if (!zoneId || (batch && moves.length<2)) return;
    moving=true;
    form.dataset.saving='1';
    button.disabled=zoneField.disabled=true;
    if (siteId) siteId.disabled=true;
    status.classList.remove('error');
    status.textContent='사진과 작업 기록을 옮기는 중입니다.';
    try {
      const result=await api(batch ? 'work/evidence/zones' : 'work/evidence/zone',{
        method:'PATCH',body:batch ? { moves,zoneId } : { ...moves[0],zoneId },signal,
      });
      if (!signal.aborted) await onMoved({ id:moves[0].id,count:1,...result });
    } catch (error) {
      if (!signal.aborted) {
        status.classList.add('error');
        status.textContent=error.message;
      }
    } finally {
      button.disabled=zoneField.disabled=false;
      if (siteId) siteId.disabled=false;
      delete form.dataset.saving;
      if (batch) updateBatchSelection(form);
      moving=false;
    }
  },{ signal });
}
