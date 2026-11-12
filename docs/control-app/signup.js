import { portalFetch } from './portal-api.js';
import { brand, esc } from './ui.js';
import { mountIntakeChallenge } from './public-intake.js';

async function signupRequest(path = '', { method = 'GET', body, signal } = {}) {
  const form = body instanceof FormData;
  const response = await portalFetch('./api/signup' + path, { method, signal,
    ...(body ? form ? { body } : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '가입 신청을 확인하지 못했습니다.');
  return result;
}

export async function renderSignup(root, account, signal) {
  const publicSignup=!account.signedIn;
  root.innerHTML = `<main class="auth"><section class="auth-card signup-card" aria-labelledby="signup-title">
    ${brand('본연', '현장 청소 작업자')}
    <h1 id="signup-title">${publicSignup ? '작업자 가입 초대 요청' : '작업자 회원가입'}</h1>
    ${publicSignup ? '<a class="link-button" href="#control">로그인으로 돌아가기</a>' : `
      ${account.nativeLogin ? '<button class="link-button" type="button" data-action="native-logout">로그아웃</button>' : ''}
      <p class="small muted">로그인 계정 · ${esc(account.email)}</p>`}
    <p class="small" data-signup-status role="status">가입 상태를 확인하는 중입니다.</p>
    <form class="stack" data-signup-form hidden>
      ${publicSignup ? '<label class="field"><span>로그인 이메일</span><input name="email" type="email" autocomplete="email" maxlength="254" required></label>' : ''}
      <label class="field"><span>이름</span><input name="name" maxlength="80" required></label>
      ${publicSignup ? '' : `<label class="field"><span>가입 유형</span><select name="kind"><option value="individual">개인</option><option value="business">사업자</option></select></label>
      <label class="field"><span>계산서 수신 이메일</span><input name="invoiceEmail" type="email" maxlength="254"></label>
      <fieldset class="stack work-fieldset" data-business-documents hidden><legend>사업자 증빙</legend>
        <label class="field"><span>사업자명</span><input name="businessName" maxlength="120"></label>
        <label class="field"><span>사업자등록증</span><input name="businessCertificate" type="file" accept="application/pdf,image/jpeg,image/png"></label>
        <label class="field"><span>통장사본</span><input name="bankCopy" type="file" accept="application/pdf,image/jpeg,image/png"></label>
        <p class="small muted">각 파일 5MB 이하 · PDF, JPG, PNG</p>
      </fieldset>`}
      ${publicSignup ? '<div data-intake-protection></div>' : ''}
      <button class="btn primary" type="submit">${publicSignup ? '초대 요청' : '가입 신청'}</button>
    </form>
  </section></main>`;
  const form = root.querySelector('[data-signup-form]');
  const notice = root.querySelector('[data-signup-status]');
  const documents = root.querySelector('[data-business-documents]');
  let protection;
  form.elements.kind?.addEventListener('change', () => {
    const business = form.elements.kind.value === 'business';
    documents.hidden = !business;
    for (const field of documents.querySelectorAll('input')) {
      field.disabled = !business;
      field.required = business;
      if (!business && field.type === 'file') field.value = '';
    }
    form.elements.invoiceEmail.required = business;
  }, { signal });
  for (const field of documents?.querySelectorAll('input') ?? []) field.disabled = true;
  try {
    const [{ enabled },{ application }] = await Promise.all([
      signupRequest('/settings',{ signal }),publicSignup ? Promise.resolve({}) : signupRequest('',{ signal }),
    ]);
    if (signal.aborted) return;
    if (application?.status === 'pending') {
      notice.textContent = '가입 신청이 접수됐습니다. 관리자 승인 후 배정받은 현장을 이용할 수 있습니다.';
      return;
    }
    if (application?.status === 'approved') {
      notice.textContent = '승인된 신청입니다. 이용 권한은 관리자에게 확인해 주세요.';
      return;
    }
    if (!enabled) {
      notice.textContent='현재 회원가입 접수가 중지되어 있습니다.';
      return;
    }
    form.hidden = false;
    if (publicSignup) protection=await mountIntakeChallenge(root.querySelector('[data-intake-protection]'),'signup_invite',signal,form.querySelector('button'));
    notice.textContent = application?.status === 'rejected' ? '이전 신청 처리 사유 · ' + application.reason : publicSignup ? '관리자가 이메일을 확인해 초대 키를 전달합니다. 키로 로그인한 뒤 가입 신청을 완료해 주세요.' : '관리자 승인 후 작업자로 등록됩니다.';
  } catch (error) {
    if (!signal.aborted) notice.textContent = error.message;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const fields = new FormData(form);
      await signupRequest(publicSignup ? '/register' : '',{ method:'POST',
        body:publicSignup ? { ...Object.fromEntries(fields),challengeToken:protection?.readToken() } : fields,signal });
      if (signal.aborted) return;
      form.reset();
      form.hidden = true;
      notice.textContent = publicSignup ? '초대 요청이 접수됐습니다. 본연 관리자에게 초대 키를 받은 뒤 로그인해 주세요.'
        : '가입 신청이 접수됐습니다. 관리자 승인 후 배정받은 현장을 이용할 수 있습니다.';
    } catch (error) {
      if (!signal.aborted) notice.textContent = error.message;
    } finally {
      if (publicSignup && !form.hidden) protection?.reset();
      else button.disabled = false;
    }
  }, { signal });
}

export function mountSignupReview(root, signal, afterApproval) {
  const notice = root.querySelector('[data-signup-review-status]');
  const list = root.querySelector('[data-signup-applications]');
  const settings=root.querySelector('[data-signup-settings]');
  if (settings) {
    const field=settings.elements.enabled;
    const button=settings.querySelector('button');
    const status=settings.querySelector('[data-signup-settings-status]');
    const show=enabled=>{
      field.checked=enabled;
      status.textContent=enabled ? '신규 가입 신청을 받고 있습니다.' : '신규 가입 신청이 중지되었습니다.';
    };
    signupRequest('/settings',{ signal }).then(({ enabled })=>{
      if (signal.aborted) return;
      show(enabled);
      button.disabled=field.disabled=false;
    }).catch(error=>{ if (!signal.aborted) status.textContent=error.message; });
    settings.addEventListener('submit',async event=>{
      event.preventDefault();
      button.disabled=field.disabled=true;
      try {
        const { enabled }=await signupRequest('/settings',{ method:'PATCH',body:{ enabled:field.checked },signal });
        if (!signal.aborted) show(enabled);
      } catch (error) {
        if (!signal.aborted) status.textContent=error.message;
      } finally { button.disabled=field.disabled=false; }
    },{ signal });
  }
  const link = (id, kind, name) => `<a class="btn compact" href="./api/signup/document?${esc(new URLSearchParams({ id, kind }))}">${name}</a>`;
  async function refresh() {
    try {
      const { applications, invites = [] } = await signupRequest('/admin', { signal });
      if (signal.aborted) return;
      const inviteButton = email => `<button class="btn compact" type="button" data-signup-invite="${esc(email)}">초대 키 발급</button>`;
      const pendingInvites = invites.length ? `<section class="stack"><h3>가입 초대 요청</h3>
        <p class="small">요청자의 이메일을 확인한 뒤 초대 키를 발급하고 본인에게 전달해 주세요.</p>
        ${invites.map(row => `<article class="report-control-row row between"><span>${esc(row.name)} · ${esc(row.email)}</span>${inviteButton(row.email)}</article>`).join('')}</section>` : '';
      list.innerHTML = pendingInvites + (applications.length ? applications.map(row => `<article class="report-control-row stack">
        <div class="row between"><strong>${esc(row.name)} · ${row.kind === 'business' ? '사업자' : '개인'}</strong><span class="pill">${{ pending: '승인 대기', approved: '승인', rejected: '반려' }[row.status]}</span></div>
        <p class="small">${esc(row.email)}${row.businessName ? ' · ' + esc(row.businessName) : ''}</p>
        ${row.invoiceEmail ? `<p class="small">계산서 수신 · ${esc(row.invoiceEmail)}</p>` : ''}
        ${row.hasBusinessCertificate || row.hasBankCopy ? `<div class="row">
          ${row.hasBusinessCertificate ? link(row.id, 'businessCertificate', '사업자등록증 받기') : ''}
          ${row.hasBankCopy ? link(row.id, 'bankCopy', '통장사본 받기') : ''}
        </div>` : ''}
        ${row.reason ? `<p class="small">${esc(row.reason)}</p>` : ''}
        ${row.status === 'pending' ? `<form class="row" data-signup-review="${esc(row.id)}">
          <input name="reason" aria-label="반려 사유" placeholder="반려 사유" maxlength="500">
          ${row.verified ? '<button class="btn compact primary" type="submit" value="approved">작업자로 승인</button>' : inviteButton(row.email)}
          <button class="btn compact" type="submit" value="rejected">반려</button>
        </form>` : row.status === 'approved' ? '<a href="#control">관제에서 현장 배정</a>' : ''}
      </article>`).join('') : '<p class="small muted">접수된 가입 신청이 없습니다.</p>');
    } catch (error) {
      if (!signal.aborted) notice.textContent = error.message;
    }
  }
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-signup-invite]');
    if (!button) return;
    const email = button.dataset.signupInvite;
    if (!confirm(email + ' 요청자의 이메일을 확인했나요? 기존 키가 있다면 새 키로 교체됩니다.')) return;
    button.disabled = true;
    try {
      const response = await portalFetch('./api/auth/key',{ method:'POST',signal,
        headers:{ 'Content-Type':'application/json' },body:JSON.stringify({ email,applicant:true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '초대 키 발급에 실패했습니다.');
      const field = document.createElement('input');
      field.readOnly = true;
      field.value = result.key;
      field.setAttribute('aria-label',email + ' 초대 키');
      notice.replaceChildren(document.createTextNode('본인 확인을 마친 요청자에게 전달해 주세요. '),field);
      field.select();
      await refresh();
    } catch (error) {
      if (!signal.aborted) notice.textContent = error.message;
    } finally { button.disabled = false; }
  },{ signal });
  root.addEventListener('submit', async event => {
    const form = event.target;
    const id = form.dataset.signupReview;
    if (!id) return;
    event.preventDefault();
    const button = event.submitter;
    if (!button) return;
    button.disabled = true;
    try {
      await signupRequest('/admin', { method: 'PATCH', body: { id, status: button.value, reason: form.elements.reason.value }, signal });
      notice.textContent = button.value === 'approved' ? '승인했습니다. 이제 관제에서 현장을 배정할 수 있습니다.' : '반려했습니다.';
      await Promise.all([refresh(), afterApproval()]);
    } catch (error) {
      if (!signal.aborted) notice.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }, { signal });
  return refresh();
}
