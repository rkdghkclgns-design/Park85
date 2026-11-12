import { esc } from './ui.js';
import { focusFieldIssue } from './form-guidance.js';

const headings = {
  list: [1,'현장 선택'], site: [1,'현장 정보와 청소 안내'],
  setup: [2,'충전기 안전 점검'], before: [3,'작업 전 촬영'],
  after: [4,'작업 후 촬영'], results: [5,'작업 결과'],
  saved: [5,'충전기 증빙 저장 완료'], report: [6,'작업 완료 보고'],
};
const previous = { list:'home', site:'list', setup:'site', before:'setup', after:'before', results:'after', saved:'site', report:'site', history:'home' };
const guideAction = (id,label,primary=false) => `<button type="button" class="btn ${primary ? 'primary' : 'compact'}" data-guide-action="${id}">${label}</button>`;

export function fieldGuidePage(paymentLink) {
  return `
    <section class="card ops-upload stack" data-guide-screen="home">
      <h2 tabindex="-1" data-guide-title>내 배정과 수익</h2>
      <dl class="ledger-summary" data-worker-earnings><div>수익을 불러오는 중입니다.</div></dl>
      <div class="row between"><h3>오늘 할 일</h3><span class="small muted" data-guide-total></span></div>
      <div class="stack" data-guide-today aria-live="polite">배정 현장을 불러오는 중입니다.</div>
      <div class="row">
        ${guideAction('list','현장 선택',true)}
        <a class="btn compact" href="${esc(paymentLink)}">내 지급 내역</a>
        ${guideAction('history','내 현장 보고')}
      </div>
      <div class="stack" data-report-drafts></div>
    </section>
    <section class="card ops-upload stack guide-header" data-guide-screen="list site setup before after results saved report history" hidden>
      <div class="row between">
        <span class="small muted" data-guide-progress></span>
        <div class="row">${guideAction('back','이전 화면')}${guideAction('home','작업 홈')}</div>
      </div>
      <h2 tabindex="-1" data-guide-title></h2>
      <div class="row between"><p class="small muted" data-guide-context></p>${guideAction('reread','청소 안내 다시 보기')}</div>
    </section>
    <section class="card ops-upload stack" data-guide-screen="list" hidden>
      <p class="small muted">지연 → 진행중 → 오늘 → 예정 → 확인 대기 순이며, 같은 상태에서는 예정일이 빠른 현장이 먼저 표시됩니다.</p>
      <div class="stack" data-guide-list></div>
    </section>
    <section class="card ops-upload stack" data-guide-screen="site" hidden>
      <div class="stack" data-guide-site></div>
    </section>
    <section class="card ops-upload stack" data-guide-screen="saved" hidden>
      <p>이 충전기의 안전 점검, 작업 전후 사진과 결과를 저장했습니다.</p>
      <div class="row">${guideAction('another','다음 충전기 점검')}${guideAction('report','작업 완료 보고',true)}</div>
    </section>
  `;
}

function sitePriority(site,today) {
  if (site.currentReportStatus==='submitted') return { rank:4,style:'pending',label:'확인 대기' };
  if (site.progressUnits) return { rank:1,style:'in_progress',label:'진행중' };
  if (site.nextDue < today) {
    const days = Math.round((Date.parse(today)-Date.parse(site.nextDue))/86_400_000);
    return { rank:0,style:'delayed',label:'지연 ' + days + '일' };
  }
  return { rank:site.nextDue === today ? 2 : 3,style:'pending',label:site.nextDue === today ? '오늘' : '예정' };
}

function guideSections(instructions,open) {
  return `<div class="stack">
    <details class="report-control-row guide-details" ${open ? 'open' : ''}><summary>현장별 작업·출입 안내</summary>
      <p class="guide-note">${esc(instructions || '별도 현장 안내가 등록되어 있지 않습니다. 도착하면 작업 위치와 출입 절차를 확인해 주세요.')}</p></details>
    <details class="report-control-row guide-details" ${open ? 'open' : ''}><summary>외함·주변 청소 방법</summary>
      <p>작업 전 상태를 촬영합니다. 제조사와 현장 절차에 맞는 도구를 사용해 외함과 주변의 먼지·이물질을 제거합니다. 충전기에 물이나 세정제를 직접 분사하지 않습니다.</p></details>
    <details class="report-control-row guide-details" ${open ? 'open' : ''}><summary>내함 청소·고장 확인</summary>
      <p>내함은 작업 자격과 현장 승인을 갖추고 자격자가 전원 차단 상태를 확인한 뒤 작업합니다. 파손·누수·발열·오류가 보이면 작업을 중단하고 안전한 곳에서 확인한 내용을 현장 담당자에게 알립니다.</p></details>
  </div>`;
}

export function mountFieldGuide(root,{ today,api,signal,notify,workflow,prefillCompletion }) {
  const header = root.querySelector('.guide-header');
  const sitePanel = root.querySelector('[data-guide-site]');
  const reread = header.querySelector('[data-guide-action="reread"]');
  const evidence = workflow.form;
  const confirmations = new Map();
  let sites = [];
  let savedEvidence = [];
  let loaded = false;
  let step = 'home';
  let site;
  let guidance;
  let workDate = today;
  let intendedReport = false;
  let backTo;
  let attempt = 0;

  function show(next,{ focus = true } = {}) {
    step = next;
    for (const section of root.querySelectorAll('[data-guide-screen]')) {
      section.hidden=!section.dataset.guideScreen.split(' ').includes(next);
    }
    for (const group of evidence.querySelectorAll('[data-guide-group]')) {
      group.hidden=!group.dataset.guideGroup.split(' ').includes(next);
    }
    for (const group of evidence.querySelectorAll('[data-camera-phase]')) {
      group.hidden=group.dataset.cameraPhase.toLowerCase()!==next;
    }
    evidence.querySelector('[data-camera-help]').hidden=next==='results';
    const [number,title] = headings[next] || [null,'내 현장 보고'];
    header.querySelector('[data-guide-progress]').textContent=number ? '단계 ' + number + ' / 6' : '';
    header.querySelector('[data-guide-title]').textContent=title;
    const context = !['list','home','history'].includes(next) && site;
    const date = ['before','after','results'].includes(next) ? evidence.elements.workDate.value : workDate;
    header.querySelector('[data-guide-context]').textContent=context ? [site.name,date,
      ['before','after','results'].includes(next) ? evidence.dataset.assetLabel || '새 충전기' : ''].filter(Boolean).join(' · ') : '';
    reread.hidden=!context || next==='site';
    if (focus) {
      const title = root.querySelector('[data-guide-screen="home"]:not([hidden]) [data-guide-title]') || header.querySelector('[data-guide-title]');
      title.focus({ preventScroll:true });
      title.scrollIntoView({ block:'nearest' });
    }
  }

  function drawLists() {
    const due = sites.filter(row=>row.currentReportStatus!=='submitted' && (row.nextDue <= today || row.progressUnits));
    const item = row => {
      const status = sitePriority(row,today);
      return `<button class="guide-site-button" type="button" data-guide-site-id="${esc(row.id)}">
        <span><strong>${esc(row.name)}</strong><small>${esc(row.nextDue)}${row.address ? ' · ' + esc(row.address) : ''}</small></span>
        <span class="work-status ${status.style}"><i></i>${status.label}</span>
      </button>`;
    };
    root.querySelector('[data-guide-total]').textContent=loaded ? '내 배정 ' + sites.length + '곳' : '';
    root.querySelector('[data-guide-today]').innerHTML=due.map(item).join('') || (loaded
      ? '<p class="small muted">오늘 처리할 배정 현장이 없습니다.</p>' : '배정 현장을 불러오는 중입니다.');
    root.querySelector('[data-guide-list]').innerHTML=sites.map(item).join('') || (loaded
      ? '<p class="small muted">배정된 현장이 없습니다.</p>' : '배정 현장을 불러오는 중입니다.');
  }

  function drawSite() {
    const status = sitePriority(site,today);
    const required = !guidance?.confirmedAt;
    const approvalPending = site.currentReportStatus==='submitted';
    const hasEvidence = site.progressUnits || savedEvidence.some(row=>row.siteId===site.id && row.workDate===workDate);
    sitePanel.innerHTML=`<div class="row between"><h3>${esc(site.name)}</h3><span class="work-status ${status.style}"><i></i>${status.label}</span></div>
      <dl class="ledger-summary guide-site-details">
        <div><dt>주소</dt><dd>${esc(site.address || '미등록')}</dd></div>
        <div><dt>예정일</dt><dd>${esc(site.nextDue)}</dd></div>
        <div><dt>완료 / 배정</dt><dd>${site.progressUnits || 0} / ${site.plannedUnits == null ? '미등록' : site.plannedUnits + '기'}</dd></div>
      </dl>
      ${site.currentReportStatus==='revision' ? '<p class="small">보고에 보완 요청이 있습니다. 내 현장 보고에서 내용을 확인할 수 있습니다.</p>' : ''}
      ${status.rank===0 ? `<details class="report-control-row"><summary>지연 사유${site.delayReason ? ' · ' + esc(site.delayReason) : ''}</summary>
        <form class="row" data-work="delay" data-site="${esc(site.id)}" data-due="${esc(site.nextDue)}">
          <label class="field grow"><span>지연 사유</span><input name="reason" maxlength="500" value="${esc(site.delayReason || '')}"></label>
          <button class="btn compact" type="submit">사유 저장</button>
        </form></details>` : ''}
      ${guidance ? guideSections(guidance.instructions,(!approvalPending && required) || Boolean(backTo)) : '<p class="small" data-guide-loading>현장 안내를 불러오는 중입니다.</p>'}
      ${approvalPending ? `<div class="row">${guideAction('history','제출한 현장 보고 보기',true)}</div>` : ''}
      ${guidance && required && (!approvalPending || intendedReport) ? '<label class="check guide-check"><input type="checkbox" data-guide-confirm><span>현장별 안내와 청소 방법을 모두 확인했습니다. <small class="field-requirement is-required">필수</small></span></label>' : ''}
      ${guidance && (!approvalPending || intendedReport) ? `<div class="row">${guideAction('continue',backTo ? '진행하던 단계로 돌아가기'
        : required ? '안내 확인하고 ' + (intendedReport ? '보고 열기' : '안전 점검') : '충전기 안전 점검',true)}
      ${!required && !backTo && hasEvidence ? guideAction('report','저장된 증빙으로 완료 보고') : ''}</div>` : ''}`;
  }

  async function selectSite(siteId,date=today,resumeReport=false) {
    const next = sites.find(row=>row.id===siteId);
    if (!next) throw new Error('배정된 현장을 찾을 수 없습니다. 현장 목록을 새로고침해 주세요.');
    const token = ++attempt;
    site=next;
    workDate=date;
    intendedReport=resumeReport;
    guidance=null;
    backTo=null;
    drawSite();
    show('site');
    try {
      const key = siteId + ':' + next.nextDue;
      const info = !navigator.onLine && confirmations.has(key)
        ? confirmations.get(key) : await api('work/guidance?' + new URLSearchParams({ siteId }),{ signal });
      if (signal.aborted || token!==attempt || step!=='site') return;
      guidance=info;
      if (info.confirmedAt) confirmations.set(key,info);
      drawSite();
      if (resumeReport && info.confirmedAt) await openReport();
    } catch (error) {
      if (signal.aborted || token!==attempt) return;
      const loading = sitePanel.querySelector('[data-guide-loading]');
      if (loading) loading.textContent=error.message;
      sitePanel.insertAdjacentHTML('beforeend',`<div>${guideAction('retry-site','현장 안내 다시 불러오기')}</div>`);
      throw error;
    }
  }

  async function startInspection() {
    await workflow.setEvidenceSite(site.id,workDate);
    show('setup');
  }

  async function openReport() {
    if (!guidance?.confirmedAt) return;
    const data = await prefillCompletion(site.id,workDate,{ reveal:false });
    if (!data?.units) {
      notify('저장된 충전기 증빙이 없습니다. 안전 점검부터 진행해 주세요.',true);
      await startInspection();
      return;
    }
    notify('');
    show('report');
  }

  function checkPhotos(phase) {
    const missing = workflow.camera.missingSlot(phase);
    if (!missing) return true;
    const kind = missing.startsWith('exterior') ? '외함' : '내함';
    focusFieldIssue(evidence.querySelector('[data-start-camera="' + missing + '"]'),kind + ' 사진을 한 장 이상 찍어 주세요.');
    return false;
  }

  const actions = {
    home() { attempt++; show('home'); },
    list() { show('list'); },
    history() { show('history'); },
    back() {
      if (backTo && step==='site') return actions.continue();
      attempt++;
      show(previous[step]);
    },
    'retry-site'() { return selectSite(site.id,workDate,intendedReport); },
    reread() { backTo=step; drawSite(); show('site'); },
    async continue() {
      if (!guidance.confirmedAt) {
        const checkbox = sitePanel.querySelector('[data-guide-confirm]');
        if (!checkbox?.checked) {
          focusFieldIssue(checkbox,'현장 안내와 청소 방법을 확인해 주세요.');
          return;
        }
        try {
          const { version,assignmentDue } = guidance;
          guidance=await api('work/guidance',{ method:'PUT',body:{ siteId:site.id,version,assignmentDue,confirmed:true },signal });
          confirmations.set(site.id + ':' + guidance.assignmentDue,guidance);
          drawSite();
        } catch (error) {
          if (error.status===409) await selectSite(site.id,workDate,intendedReport);
          throw error;
        }
      }
      if (backTo) {
        const next=backTo;
        backTo=null;
        drawSite();
        show(next);
      } else if (intendedReport) await openReport();
      else await startInspection();
    },
    'to-before'() { if (workflow.checkSetup()) show('before'); },
    'to-after'() { if (checkPhotos('Before')) show('after'); },
    'to-results'() {
      if (workflow.camera.missingSlot('Before')) {
        show('before');
        checkPhotos('Before');
        return;
      }
      if (checkPhotos('After')) show('results');
    },
    another() { show('setup'); },
    remaining:startInspection,
    report:openReport,
  };

  let working=false;
  root.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-guide-action],button[data-guide-site-id]');
    if (!button || working) return;
    const action=actions[button.dataset.guideAction];
    working=true;
    button.disabled=true;
    try {
      if (action) await action();
      else if (button.dataset.guideSiteId) await selectSite(button.dataset.guideSiteId);
    } catch (error) {
      if (!signal.aborted) notify(error.message,true);
    } finally {
      button.disabled=false;
      working=false;
    }
  },{ signal });

  show('home',{ focus:false });
  return {
    setModel(data) {
      loaded=true;
      savedEvidence=data.evidence;
      sites=data.sites.filter(row=>row.nextDue).sort((a,b)=>
        sitePriority(a,today).rank-sitePriority(b,today).rank || a.nextDue.localeCompare(b.nextDue) || a.name.localeCompare(b.name,'ko'));
      drawLists();
      const updated = site && sites.find(row=>row.id===site.id);
      if (updated) {
        const changed = updated.delayReason!==site.delayReason || updated.progressUnits!==site.progressUnits
          || updated.currentReportStatus!==site.currentReportStatus;
        site=updated;
        if (changed && step==='site') drawSite();
      }
    },
    canSave(data) {
      if (step!=='results' || data.siteId!==site?.id || !guidance?.confirmedAt) return false;
      for (const [stage,phase] of [['before','Before'],['after','After']]) {
        if (workflow.camera.missingSlot(phase)) {
          show(stage);
          checkPhotos(phase);
          return false;
        }
      }
      return true;
    },
    evidenceSaved(siteId,date) {
      if (site?.id===siteId && step==='results') {
        workDate=date;
        show('saved');
      }
    },
    reportAllowed(data) { return step==='report' && guidance?.confirmedAt && data.siteId===site?.id && data.workDate===workDate; },
    selectSite,
    home:actions.home,
  };
}
