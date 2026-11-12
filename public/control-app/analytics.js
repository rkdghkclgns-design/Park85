import { esc, metric, table, today } from './ui.js';

const taskNames = { delay: '작업 지연', evidence: '증빙 누락', revision: '보완 요청', fault: '고장·이상 조치', mail: '메일 확인' };
const eventNames = {
  site_import: '현장 데이터 등록·갱신', assignment: '배정·일정 변경', assignment_removed: '배정 해제', delay: '지연 사유', partial_progress: '부분 완료 등록',
  submitted: '완료 보고 제출', revision: '보완 요청', approved: '관리자 승인', rates: '단가 반영',
  zone: '구역 추가', capture: '사진 서버 저장', evidence: '증빙 등록', evidence_change: '증빙 수정', evidence_removed: '증빙 삭제',
  evidence_zone_move: '충전기 증빙 구역 이동',
  issue: '후속 조치', payment: '정산 변경', close: '월 마감', task: '처리 담당·기한 변경',
  mail_queued: '메일 대기', mail_sent: '메일 발송', mail_held: '메일 확인 필요', mail_canceled: '메일 취소',
};
const option = (value, label, selected = false) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;
const options = (values, empty) => option('', empty) + Object.entries(values).map(([value, name]) => option(value, name)).join('');
const reportLink = id => '#control-detail/report/' + encodeURIComponent(id);
const siteLink = (id, date) => '#control-detail/site/' + encodeURIComponent(id) + (date ? '?month=' + date.slice(0, 7) : '');
const time = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' });
const displayTime = value => Number.isFinite(Date.parse(value)) ? time.format(new Date(value)) : value;
const number = value => value.toLocaleString('ko-KR');

export function operationsTasksSection() {
  return `<section class="card ops-upload stack" id="operations-tasks">
    <div class="row between"><h2>처리할 업무 목록</h2>
      <label class="field"><span>업무 유형</span><select data-task-filter>${options(taskNames, '전체 업무')}</select></label></div>
    <p role="status" class="small" data-task-status></p><div class="stack" data-task-list></div>
  </section>`;
}

export function mountOperationsTasks(root, api, signal) {
  const list = root.querySelector('[data-task-list]');
  const filter = root.querySelector('[data-task-filter]');
  const status = root.querySelector('[data-task-status]');
  let model;
  let version = 0;
  const date = today();

  function render() {
    if (!model) return;
    const tasks = model.tasks;
    list.innerHTML = tasks.length ? tasks.map(task => {
      const title = task.reportId ? `<a href="${esc(reportLink(task.reportId))}">${esc(task.title)}</a>`
        : task.siteId ? `<a href="${esc(siteLink(task.siteId, task.workDate))}">${esc(task.title)}</a>` : esc(task.title);
      const action = task.kind === 'delay' ? `<button class="btn compact" type="button" data-edit-plan="${esc(task.siteId)}">일정·작업자 변경</button>`
        : task.kind === 'mail' ? '<button class="btn compact" type="button" data-control-jump="mail-history">발송 내역 열기</button>'
        : task.kind === 'fault' ? `<button class="btn compact" type="button" data-open-evidence="${esc(task.reference)}" data-work-date="${esc(task.workDate)}">조치 기록 열기</button>`
        : task.reportId ? `<a class="btn compact" href="${esc(reportLink(task.reportId))}">보고·증빙 열기</a>` : '';
      const assignees = model.members.some(member => member.email === task.assignee) || !task.assignee ? model.members
        : [{ email: task.assignee, name: task.assignee + ' (현재 미등록)' }, ...model.members];
      return `<article class="report-control-row stack">
        <div class="row between"><strong>${title}</strong><span class="pill${task.dueDate && task.dueDate < date ? ' bad' : ''}">${taskNames[task.kind]}</span></div>
        <p class="small muted">${esc(task.workDate)} · ${esc(task.detail)}</p>
        <form class="row" data-task-kind="${esc(task.kind)}" data-task-reference="${esc(task.reference)}">
          <label class="field"><span>처리 담당자</span><select name="assignee">${option('', '미지정')}${assignees.map(member => option(member.email, member.name, task.assignee === member.email)).join('')}</select></label>
          <label class="field"><span>처리 기한</span><input type="date" name="dueDate" value="${esc(task.dueDate)}"></label>
          <label class="field grow"><span>처리 메모</span><input name="note" maxlength="500" value="${esc(task.note)}"></label>
          <button type="submit" class="btn compact primary">처리 정보 저장</button>${action}
        </form>
      </article>`;
    }).join('') : '<p class="small muted">처리할 업무가 없습니다.</p>';
  }

  async function refresh() {
    const attempt = ++version;
    try {
      const result = await api('control/tasks?' + new URLSearchParams({ kind: filter.value }), { signal });
      if (signal.aborted || attempt !== version) return;
      model = result;
      render();
      if (result.overflow) status.textContent = '먼저 처리할 200건을 표시합니다. 업무 유형별로도 조회할 수 있습니다.';
    } catch (error) {
      if (!signal.aborted && attempt === version) status.textContent = error.message;
    }
  }
  filter.addEventListener('change', () => { status.textContent = ''; void refresh(); }, { signal });
  list.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const button = event.submitter;
    if (!button) return;
    button.disabled = true;
    try {
      await api('control/tasks', { method: 'PATCH', signal, body: { ...Object.fromEntries(new FormData(form)),
        kind: form.dataset.taskKind, reference: form.dataset.taskReference } });
      status.textContent = '처리 담당자와 기한을 저장했습니다.';
      await refresh();
    } catch (error) {
      if (!signal.aborted) status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }, { signal });
  return refresh;
}

export function analyticsPage(account) {
  const allowed = ['owner', 'admin'].includes(account.role);
  return `<header class="page-title"><h1>운영 분석</h1><p>작업 실적, 정산 현황, 운영 변경 이력</p></header>
    ${allowed ? '<div class="stack" id="operations"></div>' : '<div class="card empty">운영 분석 권한이 없습니다.</div>'}`;
}

export function mountAnalytics(root, api, signal) {
  const date = today();
  root.innerHTML = `<section class="card ops-upload stack"><form class="row analytics-filters">
      <label class="field"><span>조회 시작</span><input name="from" type="date" max="${date}"></label>
      <label class="field"><span>조회 끝</span><input name="to" type="date" value="${date}" max="${date}"></label>
      <label class="field"><span>현장</span><select name="site">${option('', '전체 현장')}</select></label>
      <label class="field"><span>작업자</span><input name="worker" maxlength="120" placeholder="이름 또는 이메일"></label>
      <label class="field"><span>이력 유형</span><select name="kind">${options(eventNames, '전체 유형')}</select></label>
      <button type="submit" class="btn primary">조회</button>
    </form><p class="small muted" data-analytics-status role="status"></p></section>
    <dl class="metrics" data-analytics-metrics></dl>
    <section class="card ops-upload stack"><h2>월별 작업·정산 실적</h2><div data-analytics-periods></div></section>
    <section class="card ops-upload stack"><h2>운영 이력</h2>
      <div data-analytics-history class="stack"></div><div><button type="button" class="btn" data-analytics-more hidden>이력 더 보기</button></div>
    </section>`;
  const form = root.querySelector('form');
  const status = root.querySelector('[data-analytics-status]');
  const history = root.querySelector('[data-analytics-history]');
  const more = root.querySelector('[data-analytics-more]');
  let cursor = 0;
  let attempt = 0;
  let activeFilters;

  function summarize(periods) {
    const total = (field, exact = false) => periods.reduce((sum, row) => exact ? sum + BigInt(row[field]) : sum + row[field], exact ? 0n : 0);
    const visits = total('approved');
    const units = total('units');
    const late = total('late');
    const outstanding = total('billed', true) - total('received', true);
    root.querySelector('[data-analytics-metrics]').innerHTML = [
      metric('승인 방문', number(visits), '회'), metric('청소 완료', number(units), '기'),
      metric('예정일 이후 완료', number(late), '회'), metric('청구 미수', number(outstanding), '원'),
    ].join('');
    const chart = periods.slice(0, 12).reverse();
    const maximum = Math.max(1, ...chart.map(row => row.units));
    root.querySelector('[data-analytics-periods]').innerHTML = (chart.length ? `<div class="analytics-trend" aria-label="최근 12개 집계 월 청소 수량">${chart.map(row =>
      `<div><span>${esc(row.month)}</span><meter min="0" max="${maximum}" value="${row.units}" aria-label="${esc(row.month)} 청소 완료 수량"></meter>
        <strong>${number(row.units)}기</strong></div>`).join('')}</div>` : '')
      + table(['월', '전체 보고', '승인 방문', '보완 중', '완료 수량', '청구', '입금', '작업자 지급'],
        periods.map(row => [row.month, row.reports, row.approved, row.revision, row.units, ...['billed', 'received', 'paid'].map(key => number(BigInt(row[key])) + '원')]),
        '이 기간에 기록된 보고가 없습니다.');
  }

  async function load(append = false) {
    if (!append) activeFilters = new URLSearchParams(new FormData(form));
    const query = new URLSearchParams(activeFilters);
    if (append) query.set('before', cursor);
    const index = ++attempt;
    more.disabled = true;
    status.textContent = '운영 이력을 불러오는 중입니다.';
    try {
      const result = await api('control/analytics?' + query, { signal });
      if (signal.aborted || index !== attempt) return;
      if (!append) {
        form.elements.site.innerHTML = option('', '전체 현장') + result.sites.map(site => option(site.id, site.name, query.get('site') === site.id)).join('');
        summarize(result.periods);
        history.replaceChildren();
      }
      const events = result.events.map(event => {
        const name = eventNames[event.kind] || event.kind;
        const related = event.reportId ? `<a href="${esc(reportLink(event.reportId))}">${esc(event.siteName || '보고 상세')}</a>`
          : event.siteId ? `<a href="${esc(siteLink(event.siteId, event.time))}">${esc(event.siteName || event.siteId)}</a>` : '';
        return `<article class="report-control-row stack"><div class="row between"><strong>${esc(name)}</strong><time class="small muted" datetime="${esc(event.time)}">${esc(displayTime(event.time))}</time></div>
          ${related}<p class="small">${esc(event.detail)}${event.worker ? ' · ' + esc(event.worker) : ''}${event.actor ? ' · 처리 ' + esc(event.actor) : ''}</p></article>`;
      });
      if (events.length) history.insertAdjacentHTML('beforeend', events.join(''));
      else if (!append) history.textContent = '조건에 해당하는 운영 이력이 없습니다.';
      cursor = result.next;
      more.hidden = !cursor;
      status.textContent = result.first ? '이력 조회 가능 시작일 ' + result.first + ' · 실적은 작업일, 이력은 처리일 기준'
        : '기록된 운영 이력이 없습니다.';
    } catch (error) {
      if (!signal.aborted && index === attempt) status.textContent = error.message;
    } finally {
      if (index === attempt) more.disabled = false;
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); void load(); }, { signal });
  more.addEventListener('click', () => { void load(true); }, { signal });
  void load();
}
