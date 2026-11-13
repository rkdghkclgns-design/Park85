import { independentPortal, installPrivateMedia, portalFetch, storePortalVerification } from './portal-api.js';
import { addAccount, defaultZones, deriveSecret, emptyWorkspace, getAccount, getWorkspace, makeZone, putAccount, randomHex, readPhoto, updateWorkspace } from './store.js';
import { badge, blankPair, brand, company, duration, empty, esc, icon, listReports, metric, monthName, reportDate, stats, timeText, today } from './ui.js';
import { blankIssue, newReport, reportDetail, reportError, reportForm, reportRow } from './reports.js';
import { blankRequest, monthlyReport, newMonthly } from './monthly.js';
import { mountOperations, operationsAuth, operationsPage, operationsRequest, operationsSession, roleNames, workModeKey } from './operations.js';
import { renderSignup } from './signup.js';
import { installFormGuidance } from './form-guidance.js';
import { readPhotoQueue } from './photo-queue.js';
import { startPhotoSync,stopPhotoSync } from './photo-sync.js';
import { browserWorkspaceExport, isLegacyRoute, navigationItems, resolveNavigationRoute } from './navigation.js';

const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const dialog = document.querySelector('#dialog');
installFormGuidance();
installPrivateMedia(app,notify);
const verification = location.pathname.startsWith('/verification/');
const verificationWorker = location.pathname.startsWith('/verification/worker/');
const sessionKey = verification ? 'cleanreport-verification-user' : 'cleanreport-user';
if (independentPortal && !verification && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/control-offline-sw.js',{ scope:'/' }).catch(error => {
    console.warn('오프라인 화면을 준비하지 못했습니다.',error);
  });
}
const account = await operationsSession();
const photoTransfer=['owner','admin','cleaner'].includes(account.role)
  ? startPhotoSync({owner:location.pathname+':'+account.id,api:operationsRequest}) : null;
function showPhotoTransfer() {
  const panel=app.querySelector('[data-global-photo-status]');
  if(!panel || !photoTransfer)return;
  const state=photoTransfer.snapshot();
  panel.hidden=!state.pending.length && !state.error;
  panel.querySelector('[data-global-photo-text]').textContent=state.error ||
    `사진 ${state.pending.length}장 기기 보관 · ${state.transmitting ? '전송 중' : navigator.onLine ? '자동 전송 대기' : '오프라인 · 연결되면 자동 전송'}${state.pending.some(photo=>photo.error) ? ' · 확인이 필요한 사진 있음' : ''}`;
  const retry=panel.querySelector('button');retry.disabled=!navigator.onLine || state.syncing;
}
photoTransfer?.subscribe(showPhotoTransfer);
const recoveryKey = 'bonyeon-recovery-id';
if (independentPortal && !verification && !account.connectionUnavailable) {
  if (account.signedIn && account.id) {
    sessionStorage.setItem(recoveryKey,account.id);
    try { localStorage.setItem(recoveryKey,account.id); } catch {}
  } else {
    sessionStorage.removeItem(recoveryKey);
    try { localStorage.removeItem(recoveryKey); } catch {}
  }
}
if (account.connectionUnavailable) window.addEventListener('online',()=>location.reload(),{ once:true });
const defaultWorkspace = verification ? 'verification:' + (account.id || 'visitor')
  : account.role && account.role !== 'owner' ? 'bonyeon:' + account.id : 'demo';
let user = sessionStorage.getItem(sessionKey);
if (verification) user = account.role ? defaultWorkspace : null;
if (account.role && (!user || account.role !== 'owner')) user = defaultWorkspace;
let workspace = emptyWorkspace();
let month = today().slice(0, 7);
let selectedDate = today();
let activeRoute = '';
let authMode = 'login';
let reportEditor;
let monthEditor;
let saving = false;
let pendingPhoto = false;
let noticeTimer;
let stopOperations = () => {};

function notify(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.hidden = false;
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 4500);
}

function showDialog(title, body) {
  dialog.innerHTML = `<div class="stack"><h2 id="dialog-title">${title}</h2>${body}</div>`;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  dialog.showModal();
}

function getRoute() {
  return resolveNavigationRoute(location.hash.slice(1),account,{ independentPortal,verification,
    mail:new URLSearchParams(location.search).get('mail') || '' });
}

function legacyNotice() {
  const operationalRoute=['owner','admin','cleaner'].includes(account.role) ? '#control' : '#map';
  return `<aside class="card ops-upload stack" aria-label="기존 브라우저 자료 안내">
    <strong>기존 브라우저 보관 자료</strong>
    <p>이 자료는 이 브라우저에 저장되어 있습니다. 운영 관제의 현장·승인·정산과 구분되며 자동 메일로 발송되지 않습니다. 기존 보고서와 사진은 그대로 보관됩니다.</p>
    <div class="row"><a class="btn primary compact" href="${operationalRoute}">운영 화면으로 이동</a>
      <a class="btn compact" href="#legacy">기존 자료 목록</a><button class="btn compact" type="button" data-action="export-browser-data">저장된 원본·사진 내보내기</button></div>
  </aside>`;
}

function renderLegacyArchive() {
  return `<header class="page-title"><h1>기존 브라우저 자료</h1><p>저장된 보고서 ${Object.keys(workspace.reports).length}건 · 월간 자료 ${Object.keys(workspace.months).length}개월</p></header>
    <section class="card ops-upload stack"><h2>보관 자료 열기</h2><div class="row">
      <a class="btn" href="#home">기존 요약</a><a class="btn" href="#days">기존 일자별 보고</a>
      <a class="btn" href="#month">기존 월간 보고</a><a class="btn" href="#alerts">기존 보완 요청</a></div>
    <p class="small muted">원본 JSON 파일에는 저장된 보고 내용과 첨부 사진이 함께 들어갑니다. 이관 전에 파일을 안전하게 보관해 주세요.</p></section>`;
}

function renderMore() {
  const manager=['owner','admin'].includes(account.role);
  return `<header class="page-title"><h1>도움말·더보기</h1><p>현장 작업 외의 참고 자료와 보관 자료입니다.</p></header>
    <section class="card ops-upload stack"><h2>참고 자료</h2><div class="row">
      <a class="btn" href="#regions">${manager ? '공식 충전기 집계·청소단가 관리' : account.role==='cleaner' ? '충전기 집계·내 배정 단가' : '공식 충전기 공개 집계'}</a>
      <a class="btn" href="#about">본연 소개·문의</a></div></section>
    ${independentPortal && !verification && manager ? `<details class="card ops-upload"><summary><strong>기존 브라우저 자료</strong></summary>
      <div class="stack region-refresh"><p>예전에 이 브라우저에 저장한 보고서와 사진을 확인하고 내보낼 수 있습니다. 운영 관제의 보고·정산 화면은 ‘현장 보고·관제’에서 확인합니다.</p>
      <div class="row"><a class="btn" href="#legacy">기존 자료 열기</a><button class="btn" type="button" data-action="export-browser-data">저장된 원본·사진 내보내기</button></div></div></details>` : ''}
    ${manager && !verification ? `<section class="card ops-upload stack"><h2>검증 자료·정산 점검</h2><p>테스트 현장과 사진은 보관함에서 확인하고 실제 운영 합계와 분리해 관리합니다.</p><div><a class="btn" href="#test-data">검증 자료 열기</a></div></section>` : ''}
    ${account.role==='owner' && !verification ? `<details class="card ops-upload"><summary><strong>시스템 진단</strong></summary>
      <div class="stack region-refresh"><p>검증 작업공간은 실제 운영 장부와 분리됩니다.</p><div><a class="btn" href="/verification/#control">검증 작업공간 열기</a></div></div></details>` : ''}`;
}

function renderConnectionRecovery() {
  app.innerHTML = `<main class="auth"><section class="auth-card stack">
    ${brand('본연','현장 작업 관리')}
    <h1>관제 서버에 연결할 수 없습니다</h1>
    <p>이 기기에 저장한 사진은 인터넷 연결과 로그인이 확인되면 다시 전송할 수 있습니다.</p>
    <p class="small" data-recovery-queue role="status"></p>
    <button class="btn primary" type="button" data-reconnect>연결 다시 확인</button>
  </section></main>`;
  app.querySelector('[data-reconnect]').addEventListener('click',()=>location.reload());
  let id=sessionStorage.getItem(recoveryKey);
  try { id ||= localStorage.getItem(recoveryKey); } catch {}
  if (!id) return;
  const queue = app.querySelector('[data-recovery-queue]');
  readPhotoQueue(location.pathname+':'+id).then(photos => {
    queue.textContent = '이 기기에 보관 중인 미전송 사진 '+photos.length+'장';
  }).catch(() => {
    queue.textContent = '이 기기의 사진 대기열을 확인하지 못했습니다.';
  });
}

function renderNativeLogin() {
  app.innerHTML = `<main class="auth"><section class="auth-card" aria-labelledby="native-login-title">
    ${brand('본연','현장 작업 관리')}
    <h1 id="native-login-title">본연 로그인</h1>
    <form id="native-login" class="stack">
      <label class="field"><span>아이디 또는 이메일</span><input name="email" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="254" required></label>
      <label class="field"><span>비밀번호 또는 로그인 키</span><input name="key" type="password" autocomplete="current-password" maxlength="80" required></label>
      <p class="error" id="auth-error" role="alert" hidden></p>
      <button type="submit" class="btn primary full">로그인</button>
    </form>
    <div class="row between auth-foot"><a class="link-button" href="#signup">회원가입</a><a href="https://bonyeonclean.com/" target="_top">본연 홈페이지</a></div>
  </section></main>`;
}

async function verificationRequest(action, body) {
  const response = await portalFetch('./api/verification/' + action, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '검증 로그인 요청을 처리하지 못했습니다.');
  if (result.verificationToken) storePortalVerification(result.verificationToken);
  if (action==='logout') storePortalVerification(null);
  return result;
}

function renderVerificationLogin() {
  app.innerHTML = `<main class="auth"><section class="auth-card" aria-labelledby="verification-title">
    ${brand('본연', '테스트 작업자 계정')}
    <h1 id="verification-title">테스트 작업자 로그인</h1>
    <form id="verification-login" class="stack">
      <label class="field"><span>테스트 작업자 이메일</span><input name="email" type="email" autocomplete="username" maxlength="254" required></label>
      <label class="field"><span>일회용 검증 코드</span><input name="code" type="password" autocomplete="one-time-code" maxlength="32" required></label>
      <p class="error" id="auth-error" role="alert" hidden></p>
      <button class="btn primary full" type="submit">테스트 작업자로 로그인</button>
    </form>
    <p class="auth-note">검증 공간의 데이터와 사진은 운영 장부에서 분리됩니다.</p>
    <a href="/verification/#control">검증 관리자 관제로 돌아가기</a>
  </section></main>`;
}

function verificationBanner() {
  if (!verification) return '';
  if (account.canSwitchMode && account.role === 'cleaner') return '<aside class="card ops-upload"><strong>검증 공간 · 청소 진행자 모드</strong></aside>';
  if (verificationWorker) return '<aside class="card ops-upload"><strong>검증 공간 · 테스트 작업자</strong></aside>';
  const returnUrl = independentPortal ? (window.parent===window ? '/#/service/charger/charger-cleaning' : '/control-app/#control') : '/#control';
  return `<aside class="card ops-upload stack">
    <div class="row between"><strong>검증 공간 · 관리자</strong><a href="${returnUrl}">운영 관제로 돌아가기</a></div>
    <details><summary>테스트 작업자 로그인 준비</summary>
      <form class="row region-refresh" id="verification-code">
        <label class="field"><span>테스트 작업자 이메일</span><input name="email" type="email" maxlength="254" required></label>
        <button class="btn compact" type="submit">일회용 검증 코드 발급</button>
        <a href="/verification/worker/" ${independentPortal ? '' : 'target="_blank" rel="noopener"'}>테스트 작업자 로그인 열기</a>
        <output class="small" data-verification-code></output>
      </form>
    </details>
  </aside>`;
}

function monthPicker() {
  const options = new Set([month, today().slice(0, 7), ...Object.keys(workspace.months), ...Object.keys(workspace.reports).map(date => date.slice(0, 7))]);
  return `<select id="monthsel" aria-label="보고 월">${[...options].sort().reverse().map(option => `<option value="${option}"${option === month ? ' selected' : ''}>${monthName(option)}</option>`).join('')}</select>`;
}

function renderAuth() {
  const login = authMode === 'login';
  const reset = authMode === 'reset';
  const heading = login ? '로그인' : reset ? '비밀번호 찾기' : '회원가입';
  app.innerHTML = `<main class="auth"><section class="auth-card" aria-labelledby="auth-title">
    ${brand('본연', '전기차 충전기 정밀 청소 · 작업 관리')}
    <h1 id="auth-title">${heading}</h1>
    ${login ? `<button class="btn full" type="button" data-action="demo-login">${icon('enter')}${account.role ? '본연 업무 화면 열기' : '데모 계정으로 계속하기'}</button><div class="divider">또는 이메일</div>` : ''}
    ${reset ? '<p class="small muted">가입할 때 발급받은 복구 코드를 사용해 비밀번호를 바꿉니다.</p>' : ''}
    <form id="auth-form" class="stack">
      <label class="field"><span>이메일</span><input name="email" type="email" autocomplete="username" maxlength="254" required></label>
      ${reset ? '<label class="field"><span>복구 코드</span><input name="recovery" autocomplete="off" required></label>' : ''}
      <label class="field"><span>${reset ? '새 비밀번호' : '비밀번호'}</span><input name="password" type="password" autocomplete="${login ? 'current-password' : 'new-password'}" required ${login ? '' : 'minlength="8"'} maxlength="256"></label>
      ${login ? '' : '<label class="field"><span>비밀번호 확인</span><input name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="256" required></label>'}
      <p class="error" id="auth-error" role="alert" hidden></p>
      <button class="btn primary full" type="submit">${reset ? '비밀번호 변경' : heading}</button>
    </form>
    <div class="row between auth-foot">${login
      ? '<button class="link-button" type="button" data-action="auth-reset">비밀번호 찾기</button><span class="muted">계정이 없나요? <button class="link-button" type="button" data-action="auth-register">회원가입</button></span>'
      : '<button class="link-button" type="button" data-action="auth-login">← 로그인</button>'}</div>
  </section><p class="auth-note">일자별 보고서와 첨부 사진은 이 브라우저에 저장됩니다.</p></main>`;
}

function renderHome() {
  const result = stats(workspace, month);
  const pending = result.reports.filter(report => report.status === 'submitted');
  const flagged = result.reports.filter(report => report.feedback || report.followup || report.zones.some(zone => zone.result === '미흡'));
  const recent = listReports(workspace, month).slice(0, 5);
  return `<header class="page-title"><h1>본연 ${monthName(month)}</h1><p>${esc(company.name)} · ${esc(company.term)}</p>
    <div class="toolbar row">${monthPicker()}<button type="button" class="btn compact" data-action="refresh">새로고침</button></div></header>
    <dl class="metrics">
      ${metric('실시 / 계약', result.reports.length, '/ ' + result.contract + '회')}
      ${metric('이행률', result.rate + '%')}
      ${metric('회당 평균 작업', timeText(result.average), '', true)}
      ${metric('연인원', result.people, '명')}
    </dl>
    <div class="stack">
      <section class="card summary-card"><div class="card-inner"><h2>확인 대기 ${pending.length}건</h2>${pending.length ? '' : '<p class="muted">모든 제출 보고를 확인했습니다.</p>'}</div>${pending.slice(0, 5).map(reportRow).join('')}</section>
      <section class="card summary-card"><div class="card-inner"><h2>고객사 의견·미흡 표시 ${flagged.length}건</h2>${flagged.length ? '' : '<p class="muted">이번 달 고객사 표시가 없습니다.</p>'}</div>${flagged.slice(0, 5).map(reportRow).join('')}</section>
      <section class="card summary-card"><div class="card-inner"><h2 class="row between">최근 보고 <a class="small" href="#days">전체 보기</a></h2>${recent.length ? '' : '<p class="muted">이 달 보고가 아직 없습니다.</p>'}</div>${recent.map(reportRow).join('')}</section>
    </div>`;
}

function renderDays() {
  const reports = listReports(workspace, month);
  return `<header class="page-title split"><div><h1>일자별 보고</h1><p>${monthName(month)} · ${reports.length}건</p></div>
    <div class="toolbar row">${monthPicker()}<input type="date" id="newdate" aria-label="작업일" value="${selectedDate}"><button type="button" class="btn primary" data-action="new-report">새 보고 작성</button></div>
  </header>${reports.length ? `<section class="card" aria-label="일자별 보고 목록">${reports.map(reportRow).join('')}</section>`
    : empty(`<p>${monthName(month)} 보고가 없습니다. 작업일을 고르고</p><strong>새 보고 작성</strong><p>을 누르세요.</p>`)}`;
}

function renderAlerts() {
  const requests = Object.values(workspace.reports).filter(report => report.revision)
    .sort((left, right) => right.revision.requestedAt.localeCompare(left.revision.requestedAt));
  const body = requests.map(report => `<a class="card report-row" href="#d-${report.date}"><div><strong>${reportDate(report.date)} 실행일 보고</strong><p class="muted">${esc(report.revision.message)}</p></div>${report.revision.active ? badge('revision') : '<span class="pill good">처리 완료</span>'}</a>`).join('');
  return `<header class="page-title"><h1>보완 요청</h1><p>관리자가 현장 담당자에게 보낸 부족 항목 알림입니다. 담당자가 보완 후 다시 제출하면 자동으로 처리됩니다.</p></header>${body ? `<div class="stack">${body}</div>` : empty('보낸 보완 요청이 없습니다.')}`;
}

function renderReport(date) {
  const existing = workspace.reports[date];
  const contract = workspace.months[date.slice(0, 7)]?.contract ?? 20;
  if (existing?.status === 'submitted' || existing?.status === 'confirmed') return reportDetail(existing, contract);
  reportEditor ??= existing ? structuredClone(existing) : newReport(date, workspace);
  return reportForm(reportEditor, contract);
}

function render({ keepScroll = false } = {}) {
  stopOperations();
  stopOperations = () => {};
  if (account.connectionUnavailable) return renderConnectionRecovery();
  if ((!verification || independentPortal) && account.nativeLogin && !account.signedIn) {
    if (location.hash==='#signup') {
      const controller = new AbortController();
      stopOperations = () => controller.abort();
      renderSignup(app,account,controller.signal);
    } else renderNativeLogin();
    return;
  }
  if (!verification && account.signedIn && !account.role) {
    const controller = new AbortController();
    stopOperations = () => controller.abort();
    renderSignup(app, account, controller.signal);
    return;
  }
  if (!user) {
    if (verificationWorker) renderVerificationLogin();
    else renderAuth();
    return;
  }
  const route = getRoute();
  if (route !== activeRoute) {
    reportEditor = null;
    monthEditor = null;
  }
  activeRoute = route;
  const controlDetail = route.startsWith('control-detail/');
  const ownPayment=account.role==='cleaner' && route.startsWith('control-detail/worker/'+encodeURIComponent(account.id)+'?');
  const navKey = independentPortal && isLegacyRoute(route) ? 'more' : location.hash==='#history' && account.role==='cleaner' ? 'history' : ownPayment ? 'payments'
    : route.startsWith('d-') ? 'days' : controlDetail ? 'control' : route;
  let body;
  if (route === 'home') body = renderHome();
  if (route === 'days') body = renderDays();
  if (route === 'month') body = monthlyReport(workspace, month, monthPicker(), monthEditor);
  if (route === 'alerts') body = renderAlerts();
  if (route === 'legacy') body = renderLegacyArchive();
  if (route === 'more') body = renderMore();
  if (controlDetail || ['map', 'control', 'analytics', 'regions', 'users', 'about', 'test-data'].includes(route)) body = operationsPage(route, account);
  if (route.startsWith('d-')) body = renderReport(route.slice(2));
  if (independentPortal && !verification && isLegacyRoute(route)) body=legacyNotice()+body;
  const scroll = keepScroll ? window.scrollY : 0;
  const role = roleNames[account.role] ?? '보고서';
  const visibleTabs = navigationItems(account,{ independentPortal,verification,month:today().slice(0,7) });
  const menu = compact => visibleTabs.map(({key,shortLabel,label,href,icon:iconName})=>
    `<a href="${esc(href)}"${key===navKey ? ' aria-current="page"' : ''}>${icon(iconName)}<span>${esc(compact ? shortLabel : label)}</span></a>`).join('');
  const switchButton = account.canSwitchMode ? `<button class="link-button" type="button" data-action="toggle-work-mode">${account.role === 'cleaner' ? '관리자 모드로 전환' : '청소 진행자 모드로 전환'}</button>` : '';
  const accountButton = switchButton + (verificationWorker ? '<button class="link-button" type="button" data-action="verification-logout">테스트 작업자 로그아웃</button>'
    : verification ? '' : account.nativeLogin ? '<button class="link-button" type="button" data-action="native-logout">로그아웃</button>'
      : '<button class="link-button" type="button" data-action="logout">보고서 계정 전환</button>');
  app.innerHTML = `<div class="workspace">
    <aside class="sidebar">${brand('본연', '현장 작업 관리')}<nav class="side-menu" aria-label="주 메뉴">${menu(false)}</nav>
      <div class="sidebar-user"><strong>${role}</strong><p class="muted">${esc(account.name || '본연')}</p>${accountButton}</div>
    </aside>
    <header class="topbar"><div class="shell">${brand('본연', role)}${accountButton}</div></header>
    <main class="main"><div class="shell">${verificationBanner()}${photoTransfer ? '<aside class="card ops-upload row between" data-global-photo-status role="status" hidden><span data-global-photo-text></span><button class="btn compact" type="button" data-action="retry-photo-uploads">대기 사진 다시 보내기</button></aside>' : ''}${body}</div></main>
    <nav class="bottomnav" aria-label="주 메뉴"><div class="shell">${menu(true)}</div></nav>
  </div>`;
  stopOperations = mountOperations(document.querySelector('#operations'), route, account);
  showPhotoTransfer();
  window.scrollTo(0, scroll);
}

function navigate(route) {
  if (location.hash === '#' + route) render();
  else location.hash = route;
}

async function signIn(account) {
  const saved = await getWorkspace(account);
  user = account;
  workspace = saved;
  sessionStorage.setItem(sessionKey, account);
  month = today().slice(0, 7);
  selectedDate = today();
  activeRoute = '';
  history.replaceState(null, '', '#home');
  render();
}

function signOut() {
  user = null;
  reportEditor = null;
  monthEditor = null;
  workspace = emptyWorkspace();
  authMode = 'login';
  sessionStorage.removeItem(sessionKey);
  history.replaceState(null, '', location.pathname + location.search);
  render();
}

async function submitAuth(form) {
  const values = new FormData(form);
  const email = values.get('email').trim().toLowerCase();
  const password = values.get('password');
  const account = await getAccount(email);
  if (authMode === 'login') {
    if (!account || await deriveSecret(password, account.salt) !== account.password) {
      throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
    await signIn(email);
    return;
  }
  if (password !== values.get('confirm')) throw new Error('비밀번호가 일치하지 않습니다.');
  if (authMode === 'reset') {
    const code = values.get('recovery').trim().toLowerCase();
    if (!account || await deriveSecret(code, account.salt) !== account.recovery) throw new Error('이메일 또는 복구 코드가 일치하지 않습니다.');
    account.password = await deriveSecret(password, account.salt);
    await putAccount(email, account);
    authMode = 'login';
    render();
    notify('비밀번호를 변경했습니다.');
    return;
  }
  if (account) throw new Error('이미 이 브라우저에 등록된 이메일입니다.');
  const salt = randomHex(16);
  const code = randomHex(16);
  await addAccount(email, { salt, password: await deriveSecret(password, salt), recovery: await deriveSecret(code, salt) });
  await signIn(email);
  showDialog('비밀번호 복구 코드', `<p>이 브라우저의 계정 비밀번호를 재설정할 때 아래 코드를 사용합니다. 안전한 곳에 보관해 주세요.</p><code class="recovery-code">${code}</code><form method="dialog" class="row end"><button class="btn primary">확인</button></form>`);
}

const changedElsewhere = '다른 탭에서 저장된 내용이 있습니다. 목록에서 다시 열어 주세요.';
async function saveReport(status) {
  if (pendingPhoto) throw new Error('사진을 처리 중입니다. 잠시 후 다시 저장해 주세요.');
  if (status === 'submitted') {
    const message = reportError(reportEditor);
    if (message) throw new Error(message);
  }
  const report = structuredClone(reportEditor);
  if (report.revision?.active && status === 'submitted') report.revision.active = false;
  report.status = report.revision?.active ? 'revision' : status;
  workspace = await updateWorkspace(user, data => {
    if (data.reports[report.date]?.version !== report.version) throw new Error(changedElsewhere);
    report.version = randomHex(8);
    data.reports[report.date] = report;
    data.zones = report.zones.filter(zone => zone.name.trim());
  });
  month = report.date.slice(0, 7);
  selectedDate = report.date;
  reportEditor = null;
  navigate('days');
  notify(status === 'submitted' ? '보고서를 제출했습니다.' : '임시 저장했습니다.');
}

async function reviewReport(message) {
  const date = activeRoute.slice(2);
  const current = workspace.reports[date];
  if (current?.status !== 'submitted') return;
  workspace = await updateWorkspace(user, data => {
    const report = data.reports[date];
    if (report?.version !== current.version) throw new Error(changedElsewhere);
    report.status = message ? 'revision' : 'confirmed';
    report.version = randomHex(8);
    if (message) report.revision = { message, active: true, requestedAt: new Date().toISOString() };
  });
  reportEditor = null;
  if (dialog.open) dialog.close();
  if (message) navigate('alerts');
  else render({ keepScroll: true });
  notify(message ? '보완 요청을 등록했습니다.' : '보고서를 확인 완료했습니다.');
}

async function saveMonth() {
  if (pendingPhoto) throw new Error('사진을 처리 중입니다. 잠시 후 다시 저장해 주세요.');
  const report = structuredClone(monthEditor);
  report.contract = Number(report.contract);
  if (!Number.isInteger(report.contract) || report.contract < 1) throw new Error('이번 달 계약 방문 횟수를 입력해 주세요.');
  if (report.requests.some(request => !request.name.trim())) throw new Error('이름이 비어 있는 요청사항을 확인해 주세요.');
  const targetMonth = month;
  workspace = await updateWorkspace(user, data => {
    if (data.months[targetMonth]?.version !== report.version) throw new Error(changedElsewhere);
    report.version = randomHex(8);
    data.months[targetMonth] = report;
  });
  monthEditor = null;
  render();
  notify('월간 결과보고서를 저장했습니다.');
}

function editValue(target) {
  const editor = monthEditor ?? reportEditor;
  if (!editor || !target.dataset.bind) return;
  const path = target.dataset.bind.split('.');
  const field = path.pop();
  const parent = path.reduce((value, key) => value[key], editor);
  parent[field] = target.type === 'checkbox' ? target.checked : target.value;
  if (target.dataset.bind === 'start' || target.dataset.bind === 'end') {
    document.querySelector('#duration').textContent = editor.start && editor.end ? timeText(duration(editor)) : '-';
  }
  if (target.dataset.bind === 'sequence') document.querySelector('#report-sequence').textContent = editor.sequence || '-';
  if (target.dataset.bind === 'author' && reportEditor) document.querySelector('#report-author').textContent = editor.author || '-';
}

function modifyEditor(callback) {
  if (pendingPhoto) {
    notify('사진을 처리 중입니다.');
    return;
  }
  callback();
  render({ keepScroll: true });
}

function addZone() {
  const field = document.querySelector('#newzone');
  const name = field.value.trim();
  if (!name) {
    field.focus();
    notify('추가할 구역 이름을 입력해 주세요.');
    return;
  }
  modifyEditor(() => reportEditor.zones.push(makeZone(name)));
  document.querySelector('#newzone')?.focus();
}

const actions = {
  'auth-login': () => { authMode = 'login'; render(); },
  'auth-register': () => { authMode = 'register'; render(); },
  'auth-reset': () => { authMode = 'reset'; render(); },
  'demo-login': () => signIn(defaultWorkspace),
  logout: signOut,
  'native-logout': async () => {
    await operationsAuth('logout');
    stopPhotoSync();
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(workModeKey);
    location.reload();
  },
  'toggle-work-mode': () => {
    if (!account.canSwitchMode) return;
    if (account.role === 'cleaner') sessionStorage.removeItem(workModeKey);
    else sessionStorage.setItem(workModeKey,'cleaner');
    stopPhotoSync();
    history.replaceState(null,'',location.pathname + '#control');
    location.reload();
  },
  'verification-logout': async () => { await verificationRequest('logout', {});stopPhotoSync();location.reload(); },
  'retry-photo-uploads':()=>photoTransfer?.sync({retry:true}),
  'export-browser-data': () => {
    const payload=browserWorkspaceExport(workspace,{workspaceKey:user,exportedAt:new Date().toISOString()});
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;
    link.download='본연-기존브라우저자료-'+today()+'.json';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),60_000);
    notify('저장된 기존 보고서와 사진을 원본 파일로 내보냈습니다.');
  },
  refresh: async () => { workspace = await getWorkspace(user); render(); notify('새로고침했습니다.'); },
  'new-report': () => {
    const field = document.querySelector('#newdate');
    if (!field.value || !field.checkValidity()) {
      field.focus();
      notify('작업일을 선택해 주세요.');
      return;
    }
    month = field.value.slice(0, 7);
    navigate('d-' + field.value);
  },
  'add-zone': addZone,
  'remove-zone': button => modifyEditor(() => reportEditor.zones.splice(Number(button.dataset.index), 1)),
  'reset-zones': () => modifyEditor(() => { reportEditor.zones = defaultZones(); }),
  'add-issue': () => modifyEditor(() => reportEditor.issues.push(blankIssue())),
  'remove-issue': button => modifyEditor(() => reportEditor.issues.splice(Number(button.dataset.index), 1)),
  'add-photo-pair': () => modifyEditor(() => {
    const editor = monthEditor ?? reportEditor;
    if (editor.photos.length >= 30) throw new Error('사진은 보고서당 최대 30쌍까지 추가할 수 있습니다.');
    editor.photos.push(blankPair());
  }),
  'remove-photo': button => modifyEditor(() => {
    const editor = monthEditor ?? reportEditor;
    editor.photos[Number(button.dataset.index)][button.dataset.side] = '';
  }),
  'request-revision': () => showDialog('보완 요청', '<form id="revision-form" class="stack"><label class="field"><span>보완할 내용을 적어 주세요.</span><textarea name="message" maxlength="1000" required autofocus></textarea></label><div class="row end"><button type="button" class="btn" data-close-dialog>취소</button><button class="btn primary" type="submit">보완 요청 등록</button></div></form>'),
  'confirm-report': () => reviewReport(''),
  'edit-month': () => { monthEditor = structuredClone(workspace.months[month] ?? newMonthly()); render(); },
  'cancel-month': () => { monthEditor = null; render(); },
  'add-request': () => modifyEditor(() => monthEditor.requests.push(blankRequest())),
  'remove-request': button => modifyEditor(() => monthEditor.requests.splice(Number(button.dataset.index), 1)),
  print: () => window.print(),
};

app.addEventListener('click', async event => {
  const historyLink=event.target.closest('a[href="#history"]');
  if (historyLink && location.hash==='#history' && account.role==='cleaner' && !event.defaultPrevented) {
    event.preventDefault();
    render();
    return;
  }
  const button = event.target.closest('button[data-action]');
  if (!button || saving) return;
  try {
    button.disabled = true;
    await actions[button.dataset.action](button);
  } catch (error) {
    notify(error.message);
  } finally {
    button.disabled = false;
  }
});

app.addEventListener('input', event => {
  editValue(event.target);
  if (event.target.id === 'newdate') selectedDate = event.target.value;
});

app.addEventListener('change', async event => {
  const target = event.target;
  if (target.id === 'monthsel') {
    month = target.value;
    if (!selectedDate.startsWith(month)) selectedDate = month === today().slice(0, 7) ? today() : month + '-01';
    monthEditor = null;
    render();
  }
  if (target.dataset.photo === undefined || !target.files?.length) return;
  if (pendingPhoto) {
    target.value = '';
    notify('다른 사진을 처리 중입니다. 잠시 후 다시 선택해 주세요.');
    return;
  }
  const editor = monthEditor ?? reportEditor;
  const file = target.files[0];
  pendingPhoto = true;
  try {
    const photo = await readPhoto(file);
    if (editor !== (monthEditor ?? reportEditor)) return;
    editor.photos[Number(target.dataset.photo)][target.dataset.side] = photo;
    render({ keepScroll: true });
  } catch (error) {
    target.value = '';
    notify(error.message || '사진을 열지 못했습니다.');
  } finally {
    pendingPhoto = false;
  }
});

app.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.id === 'newzone') {
    event.preventDefault();
    addZone();
  }
});

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['auth-form', 'native-login', 'report-form', 'month-form', 'revision-form', 'verification-code', 'verification-login'].includes(form.id)) return;
  event.preventDefault();
  if (saving) return;
  saving = true;
  const submitter = event.submitter;
  if (submitter) submitter.disabled = true;
  try {
    if (form.id==='native-login') {
      await operationsAuth('login',Object.fromEntries(new FormData(form)));
      sessionStorage.removeItem(workModeKey);
      location.reload();
    }
    if (form.id === 'verification-code') {
      const result = await verificationRequest('code', Object.fromEntries(new FormData(form)));
      form.querySelector('[data-verification-code]').textContent = result.code;
    }
    if (form.id === 'verification-login') {
      await verificationRequest('login', Object.fromEntries(new FormData(form)));
      location.reload();
    }
    if (form.id === 'auth-form') await submitAuth(form);
    if (form.id === 'report-form') await saveReport(submitter?.value === 'draft' ? 'draft' : 'submitted');
    if (form.id === 'month-form') await saveMonth();
    if (form.id === 'revision-form') {
      const message = new FormData(form).get('message').trim();
      if (!message) throw new Error('보완할 내용을 입력해 주세요.');
      await reviewReport(message);
    }
  } catch (error) {
    const authError = form.querySelector('#auth-error');
    if (authError) {
      authError.hidden = false;
      authError.textContent = error.message;
    } else notify(error.message);
  } finally {
    saving = false;
    if (submitter) submitter.disabled = false;
  }
});

dialog.addEventListener('click', event => {
  if (event.target.closest('[data-close-dialog]')) dialog.close();
});
window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
  render();
});

if (user) {
  try {
    workspace = await getWorkspace(user);
    const initial = getRoute();
    if (initial.startsWith('d-')) {
      selectedDate = initial.slice(2);
      month = selectedDate.slice(0, 7);
    }
  } catch {
    signOut();
    notify('브라우저의 저장소를 열지 못했습니다.');
  }
}
render();
