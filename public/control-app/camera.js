import { privateImage } from './portal-api.js';
import { esc } from './ui.js';
import { readPhotoQueue, writeQueuedPhoto, removeQueuedPhoto } from './photo-queue.js';
import { clearFieldIssue, focusFieldIssue } from './form-guidance.js';

const cameraLabels = {
  exteriorBefore: '외함 작업 전', exteriorAfter: '외함 작업 후',
  interiorBefore: '내함 작업 전', interiorAfter: '내함 작업 후',
};

export function cameraFields(guided = false) {
  return `<fieldset class="stack work-fieldset" data-camera-fields data-validation-group tabindex="-1"><legend>현장 카메라 촬영 <small class="field-requirement is-required">필수</small></legend>
    <p class="small muted" data-camera-help>전·후 각 항목에 6장까지 찍을 수 있습니다. 인터넷이 끊겨도 이 기기에 보관하고 연결되면 이어서 보냅니다.</p>
    <div class="row"><span class="small" role="status" data-camera-queue-status></span>
      <button class="btn compact" type="button" data-retry-camera hidden>대기 사진 다시 보내기</button></div>
    <div class="stack" data-camera-pending></div>
    ${guided ? '' : '<div class="row" data-camera-resume></div>'}
    ${['Before','After'].map(phase => `<div class="stack camera-stage" data-camera-phase="${phase}"><h3>${phase === 'Before' ? '작업 전' : '작업 후'}</h3><div class="work-result-grid">
      ${Object.entries(cameraLabels).filter(([slot]) => slot.endsWith(phase)).map(([slot, label]) => `<section class="stack" data-camera-section="${slot}" data-validation-group>
        <button class="btn compact" type="button" data-start-camera="${slot}">${label} 촬영</button>
        <div class="camera-thumbnails" data-camera-images="${slot}"></div>
      </section>`).join('')}
    </div></div>`).join('')}
    <dialog class="dialog" data-camera-dialog>
      <div class="camera-toast" data-camera-toast role="status" aria-live="polite" aria-atomic="true" hidden></div>
      <div class="stack"><h3 data-camera-title></h3><video autoplay muted playsinline></video>
        <p class="small" role="status" data-camera-status></p>
        <div class="row"><button class="btn primary" type="button" data-camera-snap>촬영하고 바로 등록</button>
          <button class="btn" type="button" data-close-camera>닫기</button></div>
      </div>
    </dialog>
  </fieldset>`;
}

export function zoneFields() {
  return `<div class="row"><label class="field"><span>작업 구역</span><select name="zoneId"><option value="">구역 미지정</option></select></label>
    <button class="btn compact" type="button" data-show-zone>구역 빠르게 추가</button>
    <button class="btn compact" type="button" data-rename-zone hidden>구역명 수정</button>
    <button class="btn compact danger-text" type="button" data-delete-zone hidden>선택한 구역 삭제</button>
    <div class="row" data-new-zone hidden>
      <label class="field"><span>새 구역 이름</span><input type="text" data-zone-name data-required-label maxlength="80" placeholder="예: 지하 2층 B구역"></label>
      <button class="btn compact primary" type="button" data-add-zone>구역 추가</button>
    </div>
    <div class="row" data-zone-rename-panel hidden>
      <label class="field"><span>변경할 구역 이름</span><input type="text" data-renamed-zone-name data-required-label maxlength="80"></label>
      <button class="btn compact primary" type="button" data-save-zone-name>이름 저장</button>
      <button class="btn compact" type="button" data-cancel-zone-rename>취소</button>
    </div>
  </div>`;
}

async function frameJpeg(video) {
  if (!video.videoWidth || !video.videoHeight) throw new Error('카메라 화면이 보이면 다시 촬영해 주세요.');
  const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob)
    : reject(new Error('사진을 저장할 수 없습니다. 다시 촬영해 주세요.')), 'image/jpeg', 0.84));
}

export function mountCamera(evidence, api, signal, notify, onModeChange, userId, draft, afterZoneRename) {
  const dialog = evidence.querySelector('[data-camera-dialog]');
  const camera = evidence.querySelector('[data-camera-fields]');
  const video = dialog.querySelector('video');
  const status = dialog.querySelector('[data-camera-status]');
  const toast = dialog.querySelector('[data-camera-toast]');
  const zone = evidence.elements.zoneId;
  const zoneName = evidence.querySelector('[data-zone-name]');
  const renameZoneButton = evidence.querySelector('[data-rename-zone]');
  const renamePanel = evidence.querySelector('[data-zone-rename-panel]');
  const renamedZoneName = evidence.querySelector('[data-renamed-zone-name]');
  const saveZoneNameButton = evidence.querySelector('[data-save-zone-name]');
  const deleteZoneButton = evidence.querySelector('[data-delete-zone]');
  const fileMode = evidence.querySelector('[data-verification-file]');
  const legacy = evidence.querySelector('[data-verification-photos]');
  let stream;
  let toastTimer;
  let opening = 0;
  let current;
  let drafts = [];
  let latestDraft = 0;
  let latestZoneRequest = 0;
  let pending = [];
  let transmitting = '';
  let syncing = false;
  let confirmed = 0;
  const owner = location.pathname + ':' + userId;
  const serverDrafts = new Map();
  const recoverable = new Map();
  const zoneCache = new Map();
  const thumbnails = [];
  const context = () => Object.fromEntries(['siteId', 'workDate', 'assetCode', 'zoneId'].map(name => [name, evidence.elements[name].value]));
  const draftKey = ({ siteId, workDate, assetCode, zoneId }) => JSON.stringify([siteId, workDate, assetCode.trim().normalize('NFKC').toUpperCase(), zoneId]);
  const usesFiles = () => Boolean(fileMode?.checked);
  const stop = () => {
    window.clearTimeout(toastTimer);
    toast.hidden = true;
    opening++;
    current = null;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
  };
  const imageLink = id => './api/work/capture?' + new URLSearchParams({ id });
  const localPhotos = fields => pending.filter(photo => draftKey(photo.fields) === draftKey(fields));

  function renderQueue() {
    for (const url of thumbnails.splice(0)) URL.revokeObjectURL(url);
    const panel = evidence.querySelector('[data-camera-pending]');
    const state = evidence.querySelector('[data-camera-queue-status]');
    const retry = evidence.querySelector('[data-retry-camera]');
    const parts = [navigator.onLine ? '온라인' : '오프라인'];
    if (pending.length) parts.push('기기 보관 ' + pending.length + '장');
    if (transmitting) parts.push('전송 중');
    if (confirmed) parts.push('이번 화면에서 서버 저장 완료 ' + confirmed + '장');
    state.textContent = parts.join(' · ');
    retry.hidden = !pending.length;
    retry.disabled = !navigator.onLine || syncing;
    panel.innerHTML = pending.map(photo => {
      const preview = URL.createObjectURL(photo.blob);
      thumbnails.push(preview);
      const device = photo.assetLabel || (photo.fields.assetCode.startsWith('AUTO-') ? '충전기' : photo.fields.assetCode);
      const currentZoneName = zoneCache.get(photo.fields.siteId)?.find(item=>item.id===photo.fields.zoneId)?.name ?? photo.zoneName;
      const label = photo.siteName + (currentZoneName ? ' · ' + currentZoneName : '') + ' · ' + device + ' · ' + cameraLabels[photo.slot];
      const status = transmitting === photo.id ? '전송 중' : photo.error ? '확인 필요 · ' + photo.error : '기기 저장 완료 · 전송 대기';
      return `<div class="row pending-camera-photo"><img src="${esc(preview)}" alt="${esc(label)}">
        <div><strong class="small">${esc(label)}</strong><p class="small">${esc(status)}</p></div>
        <button class="link-button small" type="button" data-remove-pending="${esc(photo.id)}" ${syncing ? 'disabled' : ''}>삭제</button></div>`;
    }).join('');
  }

  async function refreshQueue() {
    pending = (await readPhotoQueue(owner)).sort((left, right) => left.time - right.time || left.id.localeCompare(right.id));
    if (!signal.aborted) { renderQueue(); renderDrafts(); }
  }

  async function syncQueue({ retry = false } = {}) {
    if (syncing || !navigator.onLine || signal.aborted) return;
    syncing = true;
    try {
      await refreshQueue();
      for (const photo of pending) {
        if (!navigator.onLine || signal.aborted) break;
        if (photo.error && !retry) continue;
        transmitting = photo.id;
        renderQueue();
        const payload = new FormData();
        for (const [key, value] of Object.entries({ ...photo.fields, slot: photo.slot, uploadId: photo.id })) payload.set(key, value);
        payload.set('photo', photo.blob, '촬영.jpg');
        const upload = new AbortController();
        const abortUpload = () => upload.abort();
        const timeout = window.setTimeout(abortUpload, 15_000);
        signal.addEventListener('abort', abortUpload, { once: true });
        try {
          const saved = await api('work/captures', { method: 'POST', body: payload, signal: upload.signal });
          if (!saved.id) throw new Error('서버 저장 응답을 확인할 수 없습니다.');
          await removeQueuedPhoto(photo.id);
          const key = draftKey(photo.fields);
          const known = serverDrafts.get(key) || [];
          if (!known.some(item => item.id === saved.id)) serverDrafts.set(key, [...known, saved]);
          confirmed++;
        } catch (error) {
          if (signal.aborted) break;
          if (![400, 403, 404, 409, 413, 507].includes(error.status)) break;
          await writeQueuedPhoto({ ...photo, error: error.message });
        } finally {
          window.clearTimeout(timeout);
          signal.removeEventListener('abort', abortUpload);
          transmitting = '';
          await refreshQueue();
        }
      }
    } catch {
      if (!signal.aborted) notify('기기에 보관한 사진을 읽지 못했습니다. 브라우저 저장 공간을 확인해 주세요.', true);
    } finally {
      syncing = false;
      if (!signal.aborted) { renderQueue(); await refreshDrafts(); }
    }
  }

  function renderDrafts() {
    const fields = context();
    drafts = serverDrafts.get(draftKey(fields)) || [];
    const local = localPhotos(fields);
    const captured = [...drafts,...local];
    const beforeReady = ['exterior','interior'].every(scope => !evidence.elements[scope].checked
      || captured.some(photo => photo.slot === scope + 'Before'));
    const available = recoverable.get(draftKey(fields)) || [];
    evidence.querySelector('[data-camera-resume]').innerHTML = available.map((photo,index) =>
      `<button class="btn compact" type="button" data-resume-capture="${esc(photo.assetCode)}">이전 촬영 ${index + 1} 이어서 (${photo.count}장)</button>`).join('');
    for (const slot of Object.keys(cameraLabels)) {
      const enabled = evidence.elements[slot.startsWith('exterior') ? 'exterior' : 'interior'].checked;
      const section = evidence.querySelector('[data-camera-section="' + slot + '"]');
      section.hidden = !enabled;
      const waitingForBefore = slot.endsWith('After') && !beforeReady;
      const count = captured.filter(photo => photo.slot === slot).length;
      const button = section.querySelector('button');
      button.disabled = waitingForBefore || count >= 6;
      if (captured.some(photo => photo.slot === slot)) clearFieldIssue(button);
      const list = section.querySelector('[data-camera-images]');
      list.innerHTML = drafts.filter(photo => photo.slot === slot).map((photo, index) =>
        `<div><a href="${esc(imageLink(photo.id))}" target="_blank" rel="noopener"><img ${privateImage(imageLink(photo.id))} alt="${cameraLabels[slot]} ${index + 1}"></a>
          <button class="link-button small" type="button" data-remove-capture="${esc(photo.id)}">삭제</button></div>`).join('');
      if (waitingForBefore) list.insertAdjacentHTML('beforeend', '<span class="small muted">작업 전 사진을 먼저 찍어 주세요.</span>');
    }
  }

  async function refreshDrafts() {
    const token = ++latestDraft;
    draft.restore();
    onModeChange();
    const fields = context();
    renderDrafts();
    if (usesFiles() || !navigator.onLine || !fields.siteId || !fields.workDate || !fields.assetCode.trim()) return;
    try {
      const data = await api('work/captures?' + new URLSearchParams(fields), { signal });
      if (!signal.aborted && token === latestDraft && draftKey(fields) === draftKey(context())) {
        serverDrafts.set(draftKey(fields), data.captures);
        recoverable.set(draftKey(fields),data.inProgress || []);
        renderDrafts();
      }
    } catch (error) {
      if (!signal.aborted && token === latestDraft && error.status) notify(error.message, true);
    }
  }

  async function refreshZones(selected = '', offlineName = '') {
    const token = ++latestZoneRequest;
    const siteId = evidence.elements.siteId.value;
    renamePanel.hidden=true;
    function showZones(zones) {
      zone.innerHTML = '<option value="">구역 미지정</option>' + zones.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
      if (selected && !navigator.onLine && !zones.some(item=>item.id===selected)) {
        zone.insertAdjacentHTML('beforeend',`<option value="${esc(selected)}">${esc(offlineName || '저장된 구역')} · 오프라인 보관</option>`);
        zone.value=selected;
      }
      if (zones.some(item => item.id === selected)) zone.value = selected;
      renameZoneButton.hidden=!zone.value;
      deleteZoneButton.hidden=!zone.value;
    }
    showZones(zoneCache.get(siteId) || []);
    const draftsRefresh = refreshDrafts();
    if (!siteId || !navigator.onLine) { await draftsRefresh; return; }
    const { zones } = await api('work/zones?' + new URLSearchParams({ siteId }), { signal });
    if (signal.aborted || token !== latestZoneRequest || evidence.elements.siteId.value !== siteId) return;
    zoneCache.set(siteId, zones);
    showZones(zones);
    if (pending.length) renderQueue();
    await (zone.value ? refreshDrafts() : draftsRefresh);
  }

  function updateMode() {
    camera.hidden = usesFiles();
    if (legacy) legacy.hidden = !usesFiles();
    onModeChange();
    renderDrafts();
  }

  async function addZone() {
    const siteId = evidence.elements.siteId.value;
    const name = zoneName.value.trim();
    if (!siteId || !name) {
      focusFieldIssue(siteId ? zoneName : evidence.elements.siteId, siteId ? '새 구역 이름을 입력해 주세요.' : '증빙 현장을 선택해 주세요.');
      return;
    }
    if (!navigator.onLine) throw new Error('새 구역은 연결된 상태에서 추가해 주세요. 기존 구역의 사진은 계속 찍을 수 있습니다.');
    const { zone: added } = await api('work/zones', { method: 'POST', body: { siteId, name }, signal });
    if (siteId !== evidence.elements.siteId.value) return;
    await refreshZones(added.id);
    zoneName.value = '';
    zoneName.closest('[data-new-zone]').hidden = true;
    zone.focus();
    notify('작업 구역을 추가했습니다.');
  }

  async function renameZone() {
    const siteId = evidence.elements.siteId.value;
    const zoneId = zone.value;
    const name = renamedZoneName.value.trim();
    if (!siteId || !zoneId || renamePanel.hidden) return;
    if (!name) return focusFieldIssue(renamedZoneName,'변경할 구역 이름을 입력해 주세요.');
    if (!navigator.onLine) throw new Error('인터넷에 연결된 상태에서 구역 이름을 수정해 주세요.');
    const { zone:renamed } = await api('work/zones',{ method:'PATCH',body:{ siteId,zoneId,name },signal });
    const zones = zoneCache.get(siteId);
    if (zones) zoneCache.set(siteId,zones.map(item=>item.id===renamed.id ? renamed : item));
    if (siteId===evidence.elements.siteId.value) {
      const option = Array.from(zone.options).find(item=>item.value===renamed.id);
      if (option) option.textContent=renamed.name;
      if (zone.value===renamed.id && !renamePanel.hidden) {
        renamePanel.hidden=true;
        renameZoneButton.focus();
      }
    }
    if (pending.length) renderQueue();
    notify('구역 이름을 ‘' + renamed.name + '’으로 수정했습니다.');
    await afterZoneRename();
  }

  async function deleteZone() {
    const siteId = evidence.elements.siteId.value;
    const zoneId = zone.value;
    const name = zone.selectedOptions[0]?.textContent;
    if (!siteId || !zoneId) return;
    if (!navigator.onLine) throw new Error('인터넷에 연결된 상태에서 구역을 삭제해 주세요.');
    let photos;
    try { photos=await readPhotoQueue(owner); }
    catch { throw new Error('이 기기에 보관한 사진을 확인하지 못했습니다. 다시 시도해 주세요.'); }
    if (photos.some(photo=>photo.fields.siteId===siteId && photo.fields.zoneId===zoneId)) {
      throw new Error('이 기기에 아직 전송하지 않은 사진이 있는 구역은 삭제할 수 없습니다.');
    }
    if (!window.confirm('‘' + name + '’ 구역을 삭제할까요?')) return;
    await api('work/zones',{ method:'DELETE',body:{ siteId,zoneId },signal });
    zoneCache.set(siteId,(zoneCache.get(siteId) || []).filter(item=>item.id!==zoneId));
    if (siteId===evidence.elements.siteId.value) {
      const selected = zone.value===zoneId ? '' : zone.value;
      if (zone.value===zoneId) zone.querySelector('option:checked')?.remove();
      clearFieldIssue(zone);
      await refreshZones(selected);
      zone.focus();
    }
    notify('‘' + name + '’ 구역을 삭제했습니다.');
  }

  async function openCamera(slot) {
    draft.restore();
    const fields = context();
    for (const [name, message] of [['siteId', '증빙 현장을 선택해 주세요.'], ['workDate', '증빙 작업일을 확인해 주세요.']]) {
      const field = evidence.elements[name];
      if (!field.value.trim() || !field.validity.valid) {
        focusFieldIssue(field, message);
        return;
      }
    }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 환경에서 카메라를 열 수 없습니다.');
    stop();
    const token = opening;
    current = { fields, slot };
    dialog.querySelector('[data-camera-title]').textContent = cameraLabels[slot] + ' 촬영';
    status.textContent = '카메라를 여는 중입니다.';
    dialog.showModal();
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
      if (token !== opening || signal.aborted) { next.getTracks().forEach(track => track.stop()); return; }
      stream = next;
      video.srcObject = stream;
      await video.play();
      status.textContent = '화면을 확인한 뒤 촬영해 주세요.';
    } catch {
      if (token === opening) {
        stop();
        status.textContent = '카메라를 열지 못했습니다. 기기에서 카메라 권한을 확인해 주세요.';
      }
    }
  }

  evidence.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    const { startCamera, removeCapture } = button.dataset;
    if (button.hasAttribute('data-show-zone')) {
      const box = evidence.querySelector('[data-new-zone]');
      renamePanel.hidden=true;
      box.hidden = !box.hidden;
      if (!box.hidden) zoneName.focus();
    }
    if (button===renameZoneButton && zone.value) {
      zoneName.closest('[data-new-zone]').hidden=true;
      clearFieldIssue(renamedZoneName);
      renamedZoneName.value=zone.selectedOptions[0].textContent;
      renamePanel.hidden=false;
      renamedZoneName.select();
      renamedZoneName.focus();
    }
    if (button.hasAttribute('data-cancel-zone-rename')) {
      renamePanel.hidden=true;
      renameZoneButton.focus();
    }
    if (button.hasAttribute('data-close-camera')) dialog.close();
    try {
      if (button.hasAttribute('data-retry-camera')) await syncQueue({ retry: true });
      if (button.dataset.resumeCapture) {
        draft.useDevice(button.dataset.resumeCapture);
        await refreshDrafts();
      }
      if (button.dataset.removePending && !syncing) {
        await removeQueuedPhoto(button.dataset.removePending);
        await refreshQueue();
      }
      if (button.hasAttribute('data-add-zone') && !button.disabled) {
        button.disabled = true;
        try { await addZone(); }
        finally { button.disabled = false; }
      }
      if (button===deleteZoneButton && !button.disabled) {
        button.disabled=true;
        try { await deleteZone(); }
        catch (error) { if (!signal.aborted) focusFieldIssue(zone,error.message); }
        finally { button.disabled=false; }
      }
      if (button===saveZoneNameButton && !button.disabled) {
        button.disabled=true;
        try { await renameZone(); }
        catch (error) {
          if (!signal.aborted && !renamePanel.hidden) focusFieldIssue(renamedZoneName,error.message);
          else if (!signal.aborted) notify(error.message,true);
        } finally { button.disabled=false; }
      }
      if (startCamera) await openCamera(startCamera);
      if (removeCapture) {
        await api('work/captures', { method: 'DELETE', body: { id: removeCapture }, signal });
        await refreshDrafts();
      }
      if (button.hasAttribute('data-camera-snap') && current) {
        button.disabled = true;
        window.clearTimeout(toastTimer);
        toast.hidden = true;
        const captureOpening = opening;
        try {
          const { fields, slot } = current;
          const key = draftKey(fields);
          const count = [...(serverDrafts.get(key) || []), ...localPhotos(fields)].filter(photo => photo.slot === slot).length;
          if (count >= 6) throw new Error('한 항목에 6장까지 촬영할 수 있습니다.');
          const blob = await frameJpeg(video);
          if (blob.size > 1_200_000) throw new Error('사진이 너무 큽니다. 다시 촬영해 주세요.');
          await writeQueuedPhoto({ id: crypto.randomUUID(), owner, fields, slot, blob, time: Date.now(), assetLabel:evidence.dataset.assetLabel,
            siteName: evidence.elements.siteId.selectedOptions[0]?.textContent || '', zoneName: zone.value ? zone.selectedOptions[0].textContent : '' });
          if (!signal.aborted && dialog.open && opening === captureOpening) {
            window.clearTimeout(toastTimer);
            toast.textContent = '촬영 완료 · 기기에 저장했습니다. (' + (count + 1) + '장)';
            toast.hidden = false;
            toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4000);
          }
          if (draftKey(fields)===draftKey(context())) {
            try { draft.save({automatic:true}); } catch (error) { notify(error.message,true); }
          }
          await refreshQueue();
          status.textContent = '이 기기에 저장했습니다. 추가로 촬영할 수 있습니다.';
          void syncQueue();
        } catch (error) {
          if (!signal.aborted) status.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      }
    } catch (error) {
      if (!signal.aborted) notify(error.message, true);
    }
  }, { signal });
  for (const [input,button] of [[zoneName,evidence.querySelector('[data-add-zone]')],[renamedZoneName,saveZoneNameButton]]) {
    input.addEventListener('keydown',event=>{
      if (event.key!=='Enter' || event.isComposing) return;
      event.preventDefault();
      button.click();
    },{ signal });
  }
  evidence.elements.siteId.addEventListener('change', () => refreshZones().catch(error => {
    if (!signal.aborted) notify(error.message, true);
  }), { signal });
  zone.addEventListener('change',() => {
    clearFieldIssue(zone);
    renamePanel.hidden=true;
    renameZoneButton.hidden=!zone.value;
    deleteZoneButton.hidden=!zone.value;
  },{ signal });
  for (const field of [zone, evidence.elements.workDate]) {
    field.addEventListener('change', refreshDrafts, { signal });
  }
  for (const field of [evidence.elements.exterior, evidence.elements.interior]) field.addEventListener('change', renderDrafts, { signal });
  fileMode?.addEventListener('change', () => { updateMode(); refreshDrafts(); }, { signal });
  dialog.addEventListener('close', stop, { signal });
  window.addEventListener('online', () => { renderQueue(); void syncQueue(); }, { signal });
  window.addEventListener('offline', renderQueue, { signal });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void syncQueue(); }, { signal });
  const timer = window.setInterval(() => { if (pending.some(photo => !photo.error)) void syncQueue(); }, 20_000);
  signal.addEventListener('abort', () => { stop(); window.clearInterval(timer); thumbnails.forEach(url => URL.revokeObjectURL(url)); }, { once: true });
  updateMode();
  void refreshQueue().then(() => { if (pending.length) void syncQueue(); }).catch(() => {
    if (!signal.aborted) evidence.querySelector('[data-camera-queue-status]').textContent = '이 기기에서 임시 저장 공간을 열지 못했습니다.';
  });
  return {
    usesFiles,
    selectZone: refreshZones,
    missingSlot(phase) {
      const photos = [...(serverDrafts.get(draftKey(context())) || []),...localPhotos(context())];
      return Object.keys(cameraLabels).find(slot => slot.endsWith(phase)
        && evidence.elements[slot.startsWith('exterior') ? 'exterior' : 'interior'].checked
        && !photos.some(photo => photo.slot === slot));
    },
    selectedIds: () => drafts.filter(photo => evidence.elements[photo.slot.startsWith('exterior') ? 'exterior' : 'interior'].checked).map(photo => photo.id),
    reset: refreshDrafts,
    async ready() {
      await refreshQueue();
      if (localPhotos(context()).length || !navigator.onLine) {
        focusFieldIssue(camera, '서버 전송이 끝난 뒤 증빙을 저장해 주세요.');
        return false;
      }
      await refreshDrafts();
      const missing = Object.keys(cameraLabels).find(slot => evidence.elements[slot.startsWith('exterior') ? 'exterior' : 'interior'].checked
        && !drafts.some(photo => photo.slot === slot));
      if (missing) {
        const field = evidence.querySelector('[data-start-camera="' + missing + '"]');
        focusFieldIssue(field.closest('[hidden]') ? camera : field,cameraLabels[missing] + ' 사진을 한 장 이상 찍어 주세요.');
        return false;
      }
      clearFieldIssue(camera);
      return true;
    },
  };
}
