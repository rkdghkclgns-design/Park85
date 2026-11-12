import { independentPortal, portalFetch, storePortalSession } from './portal-api.js';
import { esc } from './ui.js';
import { mountRegions, mountRegionPreview } from './regions.js';
import { controlDetailPage, controlPage, detailHref, mountControl, mountControlDetail } from './control.js';
import { mountSignupReview } from './signup.js';
import { analyticsPage, mountAnalytics } from './analytics.js';

export const roleNames = { owner: '소유자', admin: '관리자', editor: '업로드 담당자', cleaner: '청소 작업자', viewer: '조회 전용' };
export const workModeKey = 'bonyeon-work-mode:' + (location.pathname.startsWith('/verification/') ? 'verification' : 'production');
const states = {
  pending: { label: '미작업', color: '#526780' },
  delayed: { label: '지연', color: '#bc4a1d' },
  in_progress: { label: '진행중', color: '#245db0' },
  done: { label: '작업완료', color: '#158060' },
};
const dateTime = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Seoul' });

async function api(path, { method = 'GET', body, signal } = {}) {
  const result = await portalFetch('./api/' + path, {
    method, signal, cache: 'no-store',
    headers: { ...(sessionStorage.getItem(workModeKey) === 'cleaner' ? { 'X-Bonyeon-Work-Mode':'cleaner' } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type':'application/json' } : {}) },
    ...(body instanceof FormData ? { body } : body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok || result.redirected) {
    const message = payload.error ?? (result.redirected ? '사이트에 다시 로그인해 주세요.' : '운영 서버에 연결하지 못했습니다.');
    throw Object.assign(new Error(message), { status: result.status });
  }
  return payload;
}

export async function operationsSession() {
  try {
    return await api('session', { signal: AbortSignal.timeout(5000) });
  } catch (error) {
    return independentPortal ? { nativeLogin:true,signedIn:false,connectionUnavailable:![401,403].includes(error.status) } : {};
  }
}

export async function operationsAuth(action,body={}) {
  const payload = await api('auth/'+action,{ method:'POST',body });
  if (payload.sessionToken) storePortalSession(payload.sessionToken);
  if (action==='logout') {
    storePortalSession(null);
    sessionStorage.removeItem('bonyeon-recovery-id');
  }
  return payload;
}

const chip = (status, text) => `<span class="work-status ${status}"><i></i>${text ?? states[status].label}</span>`;

export function brochure() {
  return `<header class="page-title"><h1>본연 소개</h1><p>전기차 충전기 정밀 청소</p></header>
    <section class="card brochure">
      <a href="./bonyeon-brochure.png" target="_blank" rel="noopener" aria-label="본연 홍보 브로슈어 원본 보기"><img src="./bonyeon-brochure.png" width="728" height="1024" alt="본연 전기차 충전기 정밀 청소와 A/S 연계 지원 홍보 브로슈어"></a>
      <div class="row between"><a class="btn" href="./bonyeon-brochure.png" download="본연-홍보-브로슈어.png">브로슈어 다운로드</a><a class="btn primary" href="tel:01027401734">전화 문의 010-2740-1734</a></div>
    </section>`;
}

function unavailable(account) {
  if (account.signedIn) return '<div class="card empty">운영 화면 접근 권한을 본연 관리자에게 요청해 주세요.</div>';
  return '<div class="card empty">운영 화면을 보려면 본연 사이트에 로그인해 주세요.</div>';
}

export function operationsPage(route, account) {
  if (route === 'about') return brochure();
  if (route === 'control') return controlPage(account);
  if (route === 'analytics') return analyticsPage(account);
  if (route.startsWith('control-detail/')) return controlDetailPage(account);
  if (route === 'users') {
    const body = ['owner', 'admin'].includes(account.role) ? '<div id="operations" class="stack"><div class="card empty">사용자 목록을 불러오는 중입니다.</div></div>' : unavailable(account);
    return '<header class="page-title"><h1>사용자 관리</h1><p>사용자를 등록하고 권한과 활성 상태를 관리합니다.</p></header>' + body;
  }
  if (route === 'regions') {
    const body = account.role ? '<div id="operations" class="stack"></div>' : unavailable(account);
    return '<header class="page-title"><h1>구역별 충전기</h1></header>' + body;
  }
  const body = account.role ? '<div id="operations"></div>' : unavailable(account);
  return '<header class="page-title"><h1>현장 작업 지도</h1><p>현장별 전기차 충전기 작업 진행 상태</p></header>' + body;
}

const headerKeys = {
  id: ['현장id', '현장코드', 'id', 'siteid'],
  name: ['현장명', '이름', 'name', 'sitename'],
  address: ['주소', 'address'],
  lat: ['위도', 'lat', 'latitude'],
  lng: ['경도', 'lng', 'lon', 'longitude'],
  status: ['상태', '작업상태', 'status'],
  dueDate: ['예정일', '작업예정일', 'duedate'],
  delayReason: ['지연사유', '사유', 'delayreason'],
  assignee: ['담당자', '담당자명', '담당자이름', '작업자', '작업자명', 'assignee', 'worker'],
  assigneeContact: ['담당자연락처', '연락처', '전화번호', 'assigneecontact'],
  completedDate: ['완료일', '작업완료일', 'completeddate'],
  workNote: ['작업메모', '작업내용', 'worknote'],
  plannedUnits: ['배정설비수량','설비수량','충전기수량','배정수량','plannedunits'],
};
const uploadStatuses = new Map([
  ['', 'pending'], ['미작업', 'pending'], ['pending', 'pending'],
  ['지연', 'delayed'], ['delayed', 'delayed'],
  ['작업완료', 'done'], ['완료', 'done'], ['done', 'done'], ['completed', 'done'],
]);
const cellText = value => String(value ?? '').trim();
const fieldKey = value => cellText(value).replace(/[\s_\uFEFF]+/g, '').toLowerCase();

function formatDate(value) {
  const text = cellText(value);
  if (!text) return '';
  const match = /^(\d{4})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})\.?$/.exec(text);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

async function parseUpload(file) {
  if (!file || !/\.(csv|xlsx)$/i.test(file.name) || file.size > 5_000_000) {
    throw new Error('5MB 이하의 CSV 또는 XLSX 파일을 선택해 주세요.');
  }
  const xlsx = globalThis.XLSX;
  if (!xlsx) throw new Error('스프레드시트 도구를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
  let workbook;
  try {
    const bytes = await file.arrayBuffer();
    if (/\.csv$/i.test(file.name)) {
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { text = new TextDecoder('euc-kr').decode(bytes); }
      workbook = xlsx.read(text, { type: 'string', raw: true, sheetRows: 1002 });
    } else {
      workbook = xlsx.read(bytes, { cellDates: true, sheetRows: 1002 });
    }
  } catch {
    throw new Error('파일을 읽을 수 없습니다. 양식에 맞춰 CSV 또는 XLSX로 다시 저장해 주세요.');
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('첫 번째 시트에 데이터를 입력해 주세요.');
  const [header, ...records] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd', blankrows: true });
  if (!header || records.length > 1000) throw new Error('파일 한 개에 현장을 1~1,000개 입력해 주세요.');
  const columns = header.map(fieldKey);
  const indices = Object.fromEntries(Object.entries(headerKeys).map(([key, aliases]) => [key, columns.findIndex(value => aliases.includes(value))]));
  if (['id', 'name', 'lat', 'lng'].some(key => indices[key] < 0)) {
    throw new Error('첫 행에 현장ID, 현장명, 위도, 경도 열이 있어야 합니다.');
  }
  const ids = new Set();
  const rows = [];
  for (const [index, record] of records.entries()) {
    if (record.every(cell => !cellText(cell))) continue;
    const read = key => cellText(record[indices[key]]);
    const id = read('id');
    const name = read('name');
    const address = read('address');
    const lat = Number(read('lat'));
    const lng = Number(read('lng'));
    const status = uploadStatuses.get(fieldKey(read('status')));
    const dueDate = formatDate(read('dueDate'));
    const completedDate = formatDate(read('completedDate'));
    const count = read('plannedUnits').replace(/,/g,'');
    const plannedUnits = count ? Number(count) : null;
    if (!id || id.length > 80 || !name || name.length > 120 || address.length > 240 || !read('lat') || !read('lng')
      || !Number.isFinite(lat) || Math.abs(lat) > 85 || !Number.isFinite(lng) || Math.abs(lng) > 180
      || !status || dueDate === null || completedDate === null
      || (plannedUnits !== null && (!Number.isInteger(plannedUnits) || plannedUnits < 1 || plannedUnits > 10000))) {
      throw new Error(`${index + 2}행의 현장 ID, 이름, 좌표, 상태 또는 예정일을 확인해 주세요.`);
    }
    const delayReason = read('delayReason');
    const assignee = read('assignee');
    const assigneeContact = read('assigneeContact');
    const workNote = read('workNote');
    if (delayReason.length > 500 || assignee.length > 80 || assigneeContact.length > 100 || workNote.length > 500) {
      throw new Error(`${index + 2}행의 지연 사유, 담당자 또는 담당자 연락처가 너무 깁니다.`);
    }
    if (ids.has(id)) throw new Error(`${index + 2}행에 중복 현장 ID가 있습니다.`);
    ids.add(id);
    rows.push({
      id, name, address, lat, lng, status,plannedUnits,
      dueDate: indices.dueDate < 0 ? null : dueDate,
      delayReason: indices.delayReason < 0 ? null : delayReason,
      assignee: indices.assignee < 0 ? null : assignee,
      assigneeContact: indices.assigneeContact < 0 ? null : assigneeContact,
      completedDate: indices.completedDate < 0 ? null : completedDate,
      workNote: indices.workNote < 0 ? null : workNote,
    });
  }
  if (!rows.length) throw new Error('등록할 현장 행이 없습니다.');
  return rows;
}

function statusText(site) {
  return site.status === 'delayed' && site.delayDays != null ? `지연 ${site.delayDays}일` : states[site.status].label;
}

function siteDetails(site) {
  const lines = [
    '예정일 · ' + (site.dueDate || '미입력'),
    '담당 작업자 · ' + (site.assignee || '미배정'),
    '연락처 · ' + (site.assigneeContact || '미등록'),
  ];
  if (site.status === 'pending') lines.push('작업 안내 · ' + (site.workNote || '미입력'));
  if (site.plannedUnits != null) lines.push('배정 설비 · ' + site.plannedUnits + '기');
  if (site.status === 'in_progress') lines.push('누적 완료 · ' + site.progressUnits + ' / ' + site.plannedUnits + '기',
    '남은 수량 · ' + (site.plannedUnits - site.progressUnits) + '기');
  if (site.status === 'delayed') lines.push(
    '지연 일수 · ' + (site.delayDays == null ? '예정일 미입력' : site.delayDays + '일'),
    '지연 사유 · ' + (site.delayReason || '미입력'),
    '작업 안내 · ' + (site.workNote || '미입력'),
  );
  if (site.status === 'done') {
    lines.push('완료일 · ' + (site.completedDate || '미입력'));
    if (site.repeatDays && site.nextDue) lines.push('다음 예정일 · ' + site.nextDue);
    if (site.workNote) lines.push('작업 메모 · ' + site.workNote);
    if (!site.reportDate) lines.push('청소 수량 · 보고 미등록');
  }
  if (site.reportDate) {
    const review = { submitted: '확인 대기', approved: '승인', revision: '보완 요청' };
    lines.push(`최근 보고 · ${site.reportDate} · ${site.reportWorker} · ${review[site.reportStatus] || ''}`,
      `청소 · 실작업 ${site.units}기 / 외부 ${site.exterior}기 / 내부 ${site.interior}기 · 증빙 ${site.evidenceCount}기`);
  }
  if (site.repeatDays) lines.push('정기 배정 · ' + site.repeatDays + '일마다');
  return lines;
}

function popupContent(site, account) {
  const content = document.createElement('div');
  const canViewDetail = ['owner', 'admin', 'cleaner'].includes(account.role);
  const title = document.createElement(canViewDetail ? 'a' : 'strong');
  if (canViewDetail) title.href = detailHref('site', site.id, site.reportDate);
  title.textContent = site.name;
  content.append(title);
  for (const value of [site.address || '주소 미등록', statusText(site), ...siteDetails(site)]) {
    if (!value) continue;
    const line = document.createElement('div');
    line.textContent = value;
    content.append(line);
  }
  return content;
}

function mountMap(root, account, controller) {
  const editable = ['owner', 'admin', 'editor'].includes(account.role);
  root.innerHTML = `<div class="ops-grid">
    <section class="card map-card" aria-label="현장 작업 지도">
      <div class="map-toolbar row between">
        <div class="row" role="group" aria-label="작업 상태 필터">
          <button type="button" class="btn compact" data-filter="all" aria-pressed="true">전체 <span data-count="all">0</span></button>
          ${Object.entries(states).map(([key, value]) => `<button type="button" class="btn compact" data-filter="${key}" aria-pressed="false">${chip(key, value.label)} <span data-count="${key}">0</span></button>`).join('')}
        </div>
        <button type="button" class="btn compact" data-fit>현장 전체 보기</button>
      </div>
      <div class="site-map" aria-label="현장 위치"></div>
      <p class="map-sync small muted" role="status" data-sync>현장 정보를 불러오는 중입니다.</p>
    </section>
    <section class="card ops-list stack" aria-label="현장 목록">
      <div class="row between"><h2>현장 목록</h2><span class="small muted" data-site-total></span></div>
      <label class="field"><span>현장 검색</span><input type="search" data-search placeholder="현장명, 주소, ID 또는 작업자"></label>
      <label class="field"><span>작업자 검색</span><input type="search" data-worker-search placeholder="담당자 또는 보고 작성자 이름"></label>
      <div data-site-list class="site-list"></div>
    </section>
    <section class="card ops-upload stack" data-region-preview></section>
    ${editable ? `<section class="card ops-upload stack">
      <div class="row between"><h2>현장 데이터 업로드</h2><a class="btn compact" href="./site-upload-template.csv" download>CSV 양식 다운로드</a></div>
      <p class="small muted">CSV 또는 XLSX 첫 번째 시트에 현장ID·현장명·위도·경도를 입력해 주세요. 지연 사유, 작업자, 완료일과 작업 메모도 올릴 수 있습니다. 정기 배정 현장은 관제의 일정과 승인 결과로 상태를 표시합니다.</p>
      <form data-upload class="row">
        <label class="field grow"><span>현장 파일</span><input type="file" name="upload" accept=".csv,.xlsx" required></label>
        <button class="btn primary" type="submit" disabled>지도에 반영</button>
      </form>
      <p class="small" role="status" data-upload-message></p>
    </section>` : ''}
  </div>`;
  const mapRoot = root.querySelector('.site-map');
  const sync = root.querySelector('[data-sync]');
  const listing = root.querySelector('[data-site-list]');
  const search = root.querySelector('[data-search]');
  const workerSearch = root.querySelector('[data-worker-search]');
  const leaf = globalThis.L;
  const map = leaf?.map(mapRoot, {
    zoomControl: false,
    scrollWheelZoom: true,
    touchZoom: true,
  }).setView([36.45, 127.85], 7);
  if (map) {
    leaf.control.zoom({
      zoomInTitle: '지도 확대',
      zoomOutTitle: '지도 축소',
    }).addTo(map);
    const tiles = leaf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);
    tiles.on('tileerror', () => { mapRoot.classList.add('map-tile-error'); });
    tiles.on('tileload', () => { mapRoot.classList.remove('map-tile-error'); });
  } else {
    mapRoot.textContent = '지도를 불러오지 못했습니다. 현장 목록에서 상태를 확인할 수 있습니다.';
  }
  let sites = [];
  let selected = 'all';
  let lastSnapshot = '';
  let loaded = false;
  let inFlight;
  const markers = new Map();
  const normalized = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR').trim();
  const matches = () => {
    const term = normalized(search.value);
    const worker = normalized(workerSearch.value);
    return sites.filter(site => (selected === 'all' || site.status === selected)
      && (!term || [site.name, site.address, site.id, site.assignee, site.reportWorker].some(value => normalized(value).includes(term)))
      && (!worker || [site.assignee, site.reportWorker].some(value => normalized(value).includes(worker))));
  };
  function fit(rows) {
    if (map && rows.length) map.fitBounds(rows.map(site => [site.lat, site.lng]), { padding: [26, 26], maxZoom: 15 });
  }
  function showSites() {
    const rows = matches();
    const totals = { all: sites.length, pending: 0, delayed: 0, in_progress: 0, done: 0 };
    for (const site of sites) totals[site.status]++;
    root.querySelectorAll('[data-count]').forEach(node => { node.textContent = totals[node.dataset.count]; });
    root.querySelector('[data-site-total]').textContent = `${rows.length}곳`;
    listing.innerHTML = rows.length ? rows.map(site => `<button class="site-list-row" type="button" data-site="${esc(site.id)}">
      <span><strong>${esc(site.name)}</strong><span class="small muted">${esc(site.address || site.id)}</span>
      ${siteDetails(site).map(line => `<span class="small muted">${esc(line)}</span>`).join('')}</span>
      ${chip(site.status, statusText(site))}</button>`).join('') : `<p class="muted small">${sites.length ? '조건에 맞는 현장이 없습니다.' : '업로드된 현장이 없습니다.'}</p>`;
    if (!map) return;
    const visible = new Set(rows.map(site => site.id));
    for (const [id, entry] of markers) {
      if (!visible.has(id)) {
        entry.layer.remove();
        markers.delete(id);
      }
    }
    for (const site of rows) {
      const data = JSON.stringify(site);
      const entry = markers.get(site.id);
      if (entry?.data === data) continue;
      entry?.layer.remove();
      const color = states[site.status].color;
      const layer = leaf.circleMarker([site.lat, site.lng], {
        radius: 9, color: '#fff', weight: 2.5, fillColor: color, fillOpacity: 1,
      }).addTo(map).bindPopup(popupContent(site, account));
      const element = layer.getElement();
      element?.setAttribute('aria-label', site.name + ' ' + statusText(site));
      markers.set(site.id, { data, layer });
    }
  }
  async function refresh({ center = false, afterPending = false } = {}) {
    if (inFlight && afterPending) await inFlight;
    if (inFlight || controller.signal.aborted) return;
    inFlight = (async () => {
      try {
        const payload = await api('sites', { signal: controller.signal });
        const snapshot = JSON.stringify(payload.sites);
        if (snapshot !== lastSnapshot) {
          const firstSites = sites.length === 0 && payload.sites.length > 0;
          sites = payload.sites;
          lastSnapshot = snapshot;
          showSites();
          if (firstSites || center) fit(matches());
        }
        loaded = true;
        sync.textContent = '자동 갱신 · ' + dateTime.format(new Date(payload.checkedAt)) + ' 확인';
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.status === 401 || error.status === 403) {
          sites = [];
          lastSnapshot = '';
          showSites();
        }
        sync.textContent = loaded && sites.length ? '자동 갱신 연결이 지연됩니다. 마지막 확인 상태를 표시합니다.' : error.message;
      }
    })();
    try { await inFlight; }
    finally { inFlight = null; }
  }
  root.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      selected = button.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      showSites();
    });
  });
  root.querySelector('[data-fit]').addEventListener('click', () => fit(matches()));
  search.addEventListener('input', showSites);
  workerSearch.addEventListener('input', showSites);
  listing.addEventListener('click', event => {
    const button = event.target.closest('[data-site]');
    const site = button && sites.find(item => item.id === button.dataset.site);
    if (!map || !site) return;
    map.setView([site.lat, site.lng], Math.max(14, map.getZoom()));
    markers.get(site.id)?.layer.openPopup();
  });
  if (editable) setupUpload(root, refresh);
  mountRegionPreview(root.querySelector('[data-region-preview]'), api, controller.signal);
  showSites();
  refresh();
  const interval = setInterval(() => { if (!document.hidden) refresh(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); }, { signal: controller.signal });
  return () => { clearInterval(interval); map?.remove(); };
}

function setupUpload(root, refresh) {
  const form = root.querySelector('[data-upload]');
  const field = form.elements.upload;
  const message = root.querySelector('[data-upload-message]');
  const submit = form.querySelector('button');
  let rows;
  field.addEventListener('change', async () => {
    const file = field.files[0];
    rows = null;
    submit.disabled = true;
    message.textContent = file ? '파일을 읽는 중입니다.' : '';
    if (!file) return;
    try {
      const result = await parseUpload(file);
      if (field.files[0] !== file) return;
      rows = result;
      message.classList.remove('error');
      message.textContent = `${result.length}개 현장을 읽었습니다. 지도에 반영을 누르면 저장합니다.`;
      submit.disabled = false;
    } catch (error) {
      if (field.files[0] !== file) return;
      message.classList.add('error');
      message.textContent = error.message;
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!rows) return;
    submit.disabled = true;
    field.disabled = true;
    try {
      const result = await api('sites/import', { method: 'POST', body: { rows } });
      rows = null;
      form.reset();
      message.classList.remove('error');
      message.textContent = `${result.count}개 현장을 저장했습니다.`;
      await refresh({ center: true, afterPending: true });
    } catch (error) {
      message.classList.add('error');
      message.textContent = error.message;
    } finally {
      field.disabled = false;
      submit.disabled = !rows;
    }
  });
}

function roleOptions(account, current) {
  return (account.role === 'owner' ? ['viewer', 'cleaner', 'editor', 'admin'] : ['viewer', 'cleaner', 'editor'])
    .map(role => `<option value="${role}"${current === role ? ' selected' : ''}>${roleNames[role]}</option>`).join('');
}

function mountUsers(root, account, controller) {
  const verification = location.pathname === '/verification/';
  const native = account.nativeLogin && !verification;
  const keyButton = email => `<button type="button" class="btn compact" data-issue-key="${esc(email)}">로그인 키 발급</button>`;
  root.innerHTML = `<section class="card ops-upload stack"><h2>사용자 등록</h2>
    <form class="user-form" data-member="new">
      <label class="field"><span>이름</span><input name="name" maxlength="80" required></label>
      <label class="field"><span>${verification ? '테스트 작업자 이메일' : native ? '이메일' : 'ChatGPT 이메일'}</span><input name="email" type="email" maxlength="254" required></label>
      <p class="small">기본 권한은 청소 작업자입니다. 현장을 배정하면 본인 작업과 지급 내역을 확인하고 완료 보고를 등록할 수 있습니다.</p>
      <details class="work-details"><summary>고급 권한 선택 · 기본: 청소 작업자</summary>
        <label class="field"><span>권한</span><select name="role">${roleOptions(account, 'cleaner')}</select></label>
        <p class="small muted">조회 전용은 현장 작업을 등록할 수 없습니다. 업로드 담당자는 현장 자료를 관리하며, 청소를 진행할 사용자는 청소 작업자로 등록해 주세요.</p>
      </details>
      <button class="btn primary" type="submit">사용자 등록</button>
    </form>
    <p class="small muted">${verification ? '등록한 테스트 작업자에게 일회용 검증 코드를 발급해 로그인할 수 있습니다.'
      : native ? '사용자별로 로그인 키를 발급해 해당 사용자에게 전달하세요. 키를 다시 발급하면 이전 키와 로그인 세션이 만료됩니다.'
        : '등록한 이메일에 비공개 사이트를 공유하면 해당 권한으로 이용할 수 있습니다.'}</p>
    ${native ? `<div data-issued-key class="stack" hidden>
      <label class="field"><span data-issued-key-label>발급된 로그인 키</span><input data-issued-key-value readonly spellcheck="false"></label>
      <div><button class="btn compact" type="button" data-copy-key>로그인 키 복사</button></div>
    </div>` : ''}
    <p data-users-message class="small" role="status"></p>
  </section><section class="card ops-upload stack"><h2>등록된 사용자</h2><div data-members class="stack"></div></section>
  ${verification ? '' : `<section class="card ops-upload stack" data-signup-review-panel><h2>회원가입 신청</h2>
    ${native ? `<form class="row" data-signup-settings>
      <label class="check"><input name="enabled" type="checkbox" disabled>회원가입 접수 허용</label>
      <button class="btn compact" type="submit" disabled>접수 설정 저장</button>
      <span class="small" data-signup-settings-status role="status">접수 상태를 확인하는 중입니다.</span>
    </form>` : ''}
    ${native ? `<form class="row" data-issue-applicant>
      <label class="field"><span>가입 신청자 이메일</span><input name="email" type="email" maxlength="254" required></label>
      <button class="btn compact" type="submit">가입용 키 발급</button>
    </form>` : ''}
    <p class="small" data-signup-review-status role="status"></p><div class="stack" data-signup-applications></div></section>`}`;
  const list = root.querySelector('[data-members]');
  const notice = root.querySelector('[data-users-message]');
  let working = false;
  async function load() {
    try {
      const { users } = await api('users', { signal: controller.signal });
      list.innerHTML = users.map(member => {
        const readOnly = member.role === 'owner' || member.email === account.email || (member.role === 'admin' && account.role !== 'owner');
        if (readOnly) return `<div class="member-row row between"><span><strong>${esc(member.name)}</strong><span class="muted small member-email">${esc(member.email)}</span></span>
          <span class="pill good">${roleNames[member.role]}</span>${native && member.role==='owner' && account.role==='owner' && !account.adminPassword ? keyButton(member.email) : ''}</div>`;
        return `<form class="member-row user-form" data-member="existing">
          <label class="field"><span>이름</span><input name="name" value="${esc(member.name)}" maxlength="80" required></label>
          <div><span class="small muted">이메일</span><span class="member-email">${esc(member.email)}</span><input type="hidden" name="email" value="${esc(member.email)}"></div>
          <details class="work-details"><summary>권한 변경 · ${esc(roleNames[member.role])}</summary>
            <label class="field"><span>권한</span><select name="role">${roleOptions(account, member.role)}</select></label>
            <p class="small muted">청소를 진행하려면 청소 작업자 권한이 필요합니다. 변경하지 않으면 기존 권한을 유지합니다.</p>
          </details>
          <label class="check"><input type="checkbox" name="active"${member.active ? ' checked' : ''}>활성</label>
          <button class="btn compact" type="submit">저장</button>
          ${native && member.active ? keyButton(member.email) : ''}
        </form>`;
      }).join('');
    } catch (error) {
      if (!controller.signal.aborted) list.textContent = error.message;
    }
  }
  const signupReview = root.querySelector('[data-signup-review-panel]');
  if (signupReview) mountSignupReview(signupReview, controller.signal, load);
  root.addEventListener('change',event=>{
    if (!event.target.matches('select[name="role"]')) return;
    const summary=event.target.closest('details')?.querySelector('summary');
    if (summary) summary.textContent='권한 선택 · '+roleNames[event.target.value];
  },{signal:controller.signal});
  async function issueKey(email,applicant,button) {
    if (working) return;
    working=true;
    button.disabled=true;
    const panel=root.querySelector('[data-issued-key]');
    panel.hidden=true;
    panel.querySelector('input').value='';
    try {
      const { key }=await api('auth/key',{ method:'POST',body:{ email,applicant },signal:controller.signal });
      panel.querySelector('[data-issued-key-label]').textContent='발급된 로그인 키 · '+email;
      panel.querySelector('input').value=key;
      panel.hidden=false;
      panel.querySelector('input').focus();
      notice.classList.remove('error');
      notice.textContent='로그인 키를 발급했습니다.';
    } catch (error) {
      if (!controller.signal.aborted) {
        notice.classList.add('error');
        notice.textContent=error.message;
      }
    } finally {
      working=false;
      button.disabled=false;
    }
  }
  root.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if (button?.dataset.issueKey) await issueKey(button.dataset.issueKey,false,button);
    if (button?.hasAttribute('data-copy-key')) {
      const input=root.querySelector('[data-issued-key-value]');
      try {
        await navigator.clipboard.writeText(input.value);
        notice.textContent='로그인 키를 복사했습니다.';
      } catch { input.select(); }
    }
  },{ signal:controller.signal });
  root.addEventListener('submit', async event => {
    const form = event.target;
    if (form.hasAttribute('data-issue-applicant')) {
      event.preventDefault();
      await issueKey(form.elements.email.value,true,form.querySelector('button'));
      return;
    }
    if (!form.dataset.member) return;
    event.preventDefault();
    if (working) return;
    working = true;
    const data = new FormData(form);
    const isNew = form.dataset.member === 'new';
    const body = { email: data.get('email'), name: data.get('name'), role: data.get('role'), active: isNew || data.has('active') };
    if (event.submitter) event.submitter.disabled = true;
    try {
      await api('users', { method: isNew ? 'POST' : 'PATCH', body });
      if (isNew) form.reset();
      notice.classList.remove('error');
      notice.textContent = isNew ? '사용자를 등록했습니다.' : '사용자 설정을 저장했습니다. 역할이나 활성 상태를 변경했다면 로그인 키를 새로 발급해 주세요.';
      await load();
    } catch (error) {
      notice.classList.add('error');
      notice.textContent = error.message;
    } finally {
      working = false;
      if (event.submitter) event.submitter.disabled = false;
    }
  });
  load();
}

export function mountOperations(root, route, account) {
  if (!root) return () => {};
  const controller = new AbortController();
  let dispose;
  if (route === 'map') dispose = mountMap(root, account, controller);
  if (route === 'control') mountControl(root, account, api, controller.signal);
  if (route === 'analytics') mountAnalytics(root, api, controller.signal);
  if (route.startsWith('control-detail/')) mountControlDetail(root, route, api, controller.signal);
  if (route === 'regions') mountRegions(root, account, api, controller.signal);
  if (route === 'users') mountUsers(root, account, controller);
  return () => {
    controller.abort();
    dispose?.();
  };
}
