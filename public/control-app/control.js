import { privateImage, portalFetch } from './portal-api.js';
import { esc, today } from './ui.js';
import { mountWorkflows, workResultFields, workResultList, workflowsPage } from './workflows.js';
import { fieldGuidePage, mountFieldGuide } from './field-guide.js';
import { completedSafetyList } from './field-safety.js';
import { completionProgress } from './report-completion.js';
import { evidenceZoneBatchEditor, evidenceZoneEditor, evidenceZoneMoveMessage, mountEvidenceZoneEditors } from './evidence-zone.js';
import { operationsTasksSection, mountOperationsTasks } from './analytics.js';
import { focusFieldIssue } from './form-guidance.js';

const reportStatuses = { submitted: '확인 대기', approved: '승인', revision: '보완 요청' };
const evidencePhotoLabels = { exteriorBefore: '외함 작업 전', exteriorAfter: '외함 작업 후', interiorBefore: '내함 작업 전', interiorAfter: '내함 작업 후' };
const mailKinds = {
  daily: '관리자 일일 보고', settlement: '관리자 월 결산', contractor: '계약자 현장 결과',
  completion: '작업 완료 보고', worker: '작업자 정산', tax: '세무 비용 처리',
};
const allowed = account => ['owner', 'admin', 'cleaner'].includes(account.role);
const option = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;
const textField = (title, name, type, attrs = '') => `<label class="field"><span>${title}</span><input name="${name}" type="${type}" ${attrs}></label>`;
export const detailHref = (kind, id, date = '') => '#control-detail/' + kind + '/' + encodeURIComponent(id)
  + (date ? '?month=' + date.slice(0, 7) : '');
const detailAnchor = (kind, id, name, date) => `<a href="${esc(detailHref(kind, id, date))}">${esc(name)}</a>`;
const reportStatus = report => report.completionReportedAt && report.status === 'submitted'
  ? '완료 등록 · 관리자 확인 대기' : reportStatuses[report.status];
const planQuantity = row => row.plannedUnits == null ? '' : ' · 배정 ' + row.plannedUnits + '기';
const formatMoney = value => value == null ? '미입력' : value.toLocaleString('ko-KR') + '원';

function detailAmounts(title, columns, rows) {
  return `<section class="card ops-upload stack"><h2>${title}</h2>${rows.length
    ? `<div class="control-detail-table"><table><thead><tr>${columns.map(column => `<th scope="col">${column}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<p class="muted">입력된 금액이 없습니다.</p>'}</section>`;
}

export function controlPage(account) {
  const title = account.role === 'cleaner' ? '내 작업' : '관리자 관제';
  return `<header class="page-title"><h1>${title}</h1></header>`
    + (allowed(account) ? '<div id="operations" class="stack"></div>' : '<div class="card empty">현장 보고 권한이 없습니다.</div>');
}

export function controlDetailPage(account) {
  return `<div class="row"><a href="#control">← ${account.role === 'cleaner' ? '내 작업' : '관리자 관제'}</a></div>`
    + (allowed(account) ? '<div id="operations" class="stack"><p role="status">작업 정보를 불러오는 중입니다.</p></div>'
      : '<div class="card empty">현장 보고 권한이 없습니다.</div>');
}

export async function mountControlDetail(root, route, api, signal, movedZone) {
  const [, kind, segment] = route.split('/');
  const [encoded, query] = segment.split('?');
  const month = new URLSearchParams(query).get('month') || today().slice(0, 7);
  try {
    const id = decodeURIComponent(encoded);
    if (kind==='archive') {
      if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('보고 자료 주소를 확인해 주세요.');
      root.innerHTML='<section class="card ops-upload stack"><h1>보관된 전체 보고 자료</h1><p role="status">전체 자료를 불러오는 중입니다.</p></section>';
      const response=await portalFetch('./api/control/mail/archive?'+new URLSearchParams({ id }),{ signal,cache:'no-store' });
      if (!response.ok) {
        const error=await response.json().catch(()=>({}));
        throw new Error(error.error || '보고 자료를 열 수 없습니다.');
      }
      const saved=await response.json();
      if (signal.aborted) return;
      if (!saved || typeof saved.text!=='string' || (saved.html!=null && typeof saved.html!=='string')) {
        throw new Error('보고 자료의 형식을 확인해 주세요.');
      }
      root.innerHTML='<section class="card ops-upload stack mail-preview"><h1>보관된 전체 보고 자료</h1><div class="row"><button class="btn compact" data-download-html>HTML 다운로드</button><button class="btn compact" data-download-text>텍스트 다운로드</button></div><iframe title="보관된 전체 보고 자료" sandbox></iframe><pre hidden></pre></section>';
      const {text:plain,html}=saved;
      if (html) root.querySelector('iframe').srcdoc=html;
      else {
        root.querySelector('iframe').hidden=true;
        root.querySelector('pre').hidden=false;
        root.querySelector('pre').textContent=plain;
        root.querySelector('[data-download-html]').hidden=true;
      }
      const download=(text,type,name)=>{
        const url=URL.createObjectURL(new Blob([text],{type}));
        const link=document.createElement('a');
        link.href=url;
        link.download=name;
        link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      };
      root.querySelector('[data-download-html]').addEventListener('click',()=>download(html,'text/html;charset=utf-8','본연-전체보고.html'),{signal});
      root.querySelector('[data-download-text]').addEventListener('click',()=>download(plain,'text/plain;charset=utf-8','본연-전체보고.txt'),{signal});
      return;
    }
    const data = await api('control/detail?' + new URLSearchParams({ kind, id, month }), { signal });
    if (signal.aborted) return;
    if (kind === 'mail') {
      const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });
      const stamp = data.sentAt || data.createdAt;
      root.innerHTML = `<header class="page-title"><h1>${data.kind === 'worker' ? '작업 배정·지급 상세' : '세무 비용 자료 상세'}</h1>
        <p>${esc(data.subject)}</p><p>${data.sentAt ? '발송' : '등록'} · ${date.format(new Date(stamp))}</p></header>
        <section class="card ops-upload stack mail-preview"><iframe title="발송 시점의 상세 내역" sandbox></iframe><pre hidden></pre></section>`;
      if (data.html) root.querySelector('iframe').srcdoc = data.html;
      else {
        root.querySelector('iframe').hidden = true;
        const plain = root.querySelector('pre');
        plain.hidden = false;
        plain.textContent = data.text;
      }
      return;
    }
    const { title, address, nextDue, reports, devices, example, overflow, billing, payouts, canEditResults } = data;
    const type = { site: '현장', worker: '작업자', report: '작업 결과' }[kind];
    const work = reports.map(report => `<article class="report-control-row stack">
      <div class="row between"><strong>${kind === 'site' ? esc(report.siteName) : detailAnchor('site', report.siteId, report.siteName, report.workDate)}</strong><span class="pill">${esc(reportStatus(report))}</span></div>
      <p class="small muted">${esc(report.workDate)} · ${kind === 'worker' ? esc(report.authorName) : detailAnchor('worker', report.authorId, report.authorName, report.workDate)}${planQuantity(report)} · 실작업 ${report.units}기 · 외부 ${report.exterior}기 · 내부 ${report.interior}기</p>
      ${report.notes ? `<p class="small report-control-note">${esc(report.notes)}</p>` : ''}
      ${report.reviewNote ? `<p class="small error">보완 요청 · ${report.revisionTarget ? esc(report.revisionTarget) + ' · ' : ''}${esc(report.reviewNote)}
        ${report.revisionPhotoId ? `<a href="./api/work/capture?${esc(new URLSearchParams({ id: report.revisionPhotoId }))}" target="_blank" rel="noopener">지정 사진 보기</a>` : ''}</p>` : ''}
      ${kind === 'report' ? '' : detailAnchor('report', report.id, '작업 결과·증빙 보기')}
    </article>`).join('');
    const equipment = kind === 'report' ? `<section class="card ops-upload stack" data-report-equipment><h2>기기별 청소 증빙</h2>
      ${movedZone ? `<p class="small" role="status" tabindex="-1" data-zone-moved>${esc(evidenceZoneMoveMessage(movedZone.count,movedZone.zoneName))}</p>` : ''}
      ${evidenceZoneBatchEditor(devices.map(device=>({ ...device,assetLabel:device.asset_code,siteName:title })))}
      ${devices.map(device => {
      const charger = { slow: '완속 충전기', fast: '급속 충전기', unknown: '유형 미입력' }[device.charger_type];
      const canopy = { included: '캐노피 포함', excluded: '캐노피 미포함', unknown: '캐노피 미입력' }[device.canopy];
      const photo = (slot, label) => {
        const source = './api/work/photo?' + new URLSearchParams({ id: device.id, slot });
        return `<a href="${esc(source)}" target="_blank" rel="noopener"><img ${privateImage(source)} alt="${label}" loading="lazy"><span>${label}</span></a>`;
      };
      const capturedPhotos = (device.photos || []).map((capture, index) => {
        const label = evidencePhotoLabels[capture.slot];
        const source = './api/work/capture?' + new URLSearchParams({ id: capture.id });
        return `<a href="${esc(source)}" target="_blank" rel="noopener"><img ${privateImage(source)} alt="${label} ${index + 1}" loading="lazy"><span>${label}</span></a>`;
      }).join('');
      return `<article class="report-control-row stack"><h3>${esc(device.asset_code)}${device.zoneName ? ' · ' + esc(device.zoneName) : ''}</h3><p class="small muted">${esc(charger)} · ${esc(canopy)} · 안전 ${device.safety_checked ? '확인' : '미확인'}</p>
        ${completedSafetyList(device.safetyChecklist)}
        ${workResultList(device.workResults?.items)}
        ${device.issue ? `<p class="small report-control-note">이상 사항 · ${esc(device.issue)}</p>` : ''}
        ${device.id ? `<div class="detail-photo-gallery">${capturedPhotos || ((device.exterior ? photo('exteriorBefore', '외부 작업 전') + photo('exteriorAfter', '외부 작업 후') : '')
          + (device.interior ? photo('interiorBefore', '내부 작업 전') + photo('interiorAfter', '내부 작업 후') : ''))}</div>` : ''}
        ${evidenceZoneEditor(device)}
        ${canEditResults && device.id ? `<details><summary>작업 결과 상세 보완</summary><form class="stack" data-result-editor="${esc(device.id)}">
          ${workResultFields(device.workResults?.values)}<div><button class="btn compact" type="submit">네 항목 저장</button></div>
          <p class="small" role="status"></p></form></details>` : ''}</article>`;
    }).join('') || '<p class="muted">등록된 증빙이 없습니다.</p>'}</section>` : '';
    const customerAmounts = billing ? detailAmounts('청구·입금 상세',
      ['작업일', '청구번호', '공급가액', '부가세', '청구 합계', '입금액', '미수금', '작업자 지급액'],
      billing.map(row => [row.date, row.billingRef || '미입력', formatMoney(row.vat == null ? null : row.billed - row.vat),
        formatMoney(row.vat), formatMoney(row.billed), formatMoney(row.received), formatMoney(row.billed - row.received), formatMoney(row.paid)])) : '';
    const workerAmounts = payouts ? detailAmounts('작업자 지급 상세',
      ['작업일', '현장', '수량', '대당 단가', '정산 예정액', '지급액', '지급일', '미지급액', '초과 지급액'],
      payouts.map(row => [row.date, row.site, row.units + '기', formatMoney(row.rate), row.expected, formatMoney(row.paid),
        row.paidDate || (row.paid > 0 ? '미입력' : '—'), row.unpaid, row.overpaid])) : '';
    const verificationMail = kind === 'report' && location.pathname === '/verification/' && reports[0]?.status === 'approved' && devices.length;
    const revisionForm = kind === 'report' && canEditResults && reports[0]?.status === 'submitted' && devices.length
      ? `<section class="card ops-upload stack"><h2>구역·사진 보완 요청</h2>
        <form class="stack" data-target-revision>
          <label class="field"><span>보완 대상</span><select name="target" required>${option('', '구역 또는 사진 선택')}
            ${devices.map(device => {
              const label = [device.zoneName, device.asset_code].filter(Boolean).join(' · ');
              return option(device.id, label + ' 전체') + (device.photos || []).map((photo, index) =>
                option(device.id + ':' + photo.id, label + ' · ' + evidencePhotoLabels[photo.slot] + ' (' + (index + 1) + ')')).join('');
            }).join('')}
          </select></label>
          <label class="field"><span>보완 내용</span><textarea name="note" rows="2" maxlength="500" required></textarea></label>
          <p class="small" role="status"></p><div><button class="btn primary" type="submit">지정 대상 보완 요청</button></div>
        </form></section>` : '';
    root.innerHTML = `<header class="page-title"><h1>${esc(title)}</h1><p>${type} 상세${address ? ' · ' + esc(address) : ''}</p>
      ${nextDue ? `<p>다음 예정일 · ${esc(nextDue)}</p>` : ''}
      ${example ? '<p>서식 테스트 · 예시 데이터</p>' : ''}</header>
      <section class="card ops-upload stack"><div class="row between"><h2>${kind === 'report' ? '등록 내용' : '작업 이력'}</h2>
      ${kind !== 'report' && !example ? `<label class="field"><span>조회 월</span><input type="month" data-detail-month value="${esc(month)}"></label>` : ''}</div>
      ${work || '<p class="muted">이 달에 등록된 작업 결과가 없습니다.</p>'}
      ${verificationMail ? '<div><button class="btn compact" type="button" data-verification-mail>검증 완료 보고 메일 보내기</button></div><p class="small" role="status" data-verification-mail-status></p>' : ''}</section>${equipment}${revisionForm}${customerAmounts}${workerAmounts}
      ${overflow ? '<p class="small muted">최근 내역 일부를 표시합니다.</p>' : ''}`;
    mountEvidenceZoneEditors(root.querySelector('[data-report-equipment]'),api,signal,change=>mountControlDetail(root,route,api,signal,change));
    root.querySelector('[data-zone-moved]')?.focus();
    root.querySelector('[data-detail-month]')?.addEventListener('change', event => {
      if (event.target.value) location.hash = detailHref(kind, id, event.target.value);
    }, { signal });
    root.querySelector('[data-target-revision]')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = event.submitter;
      if (!button) return;
      button.disabled = true;
      const [evidenceId, photoId = ''] = form.elements.target.value.split(':');
      try {
        await api('control/review', { method: 'PATCH', signal,
          body: { id, action: 'revise', evidenceId, photoId, note: form.elements.note.value } });
        await mountControlDetail(root, route, api, signal);
      } catch (error) {
        if (!signal.aborted) form.querySelector('[role="status"]').textContent = error.message;
      } finally {
        button.disabled = false;
      }
    }, { signal });
    root.querySelector('[data-verification-mail]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const status = root.querySelector('[data-verification-mail-status]');
      button.disabled = true;
      try {
        const result = await api('verification/completion-mail', { method: 'POST', body: { id }, signal });
        status.textContent = result.sentAt ? '검증 메일 발송 완료' : result.holdAt ? '발송 결과 확인 필요' : '검증 메일을 본연 Gmail 대기열에 등록했습니다.';
      } catch (error) {
        if (!signal.aborted) status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    }, { signal });
    for (const form of root.querySelectorAll('form[data-result-editor]')) {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const status = form.querySelector('[role="status"]');
        const button = form.querySelector('button');
        button.disabled = true;
        try {
          await api('work/evidence/result', { method: 'PATCH',
            body: { id: form.dataset.resultEditor, ...Object.fromEntries(new FormData(form)) }, signal });
          await mountControlDetail(root, route, api, signal);
        } catch (error) {
          if (!signal.aborted) status.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      }, { signal });
    }
  } catch (error) {
    if (!signal.aborted) {
      root.innerHTML = '<p class="card empty" role="alert"></p>';
      root.firstElementChild.textContent = error.message;
    }
  }
}

function reportRows(reports, admin, filter = '') {
  if (filter) reports = reports.filter(report => report.status === filter);
  if (!reports.length) return `<p class="muted">${filter ? '선택한 상태의 보고가 없습니다.' : '이 달에 등록된 현장 보고가 없습니다.'}</p>`;
  return reports.map(report => {
    const id = esc(report.id);
    const controls = [];
    if (admin && report.status === 'submitted') {
      controls.push(`<button class="btn compact primary" type="button" data-review="approve" data-id="${id}">승인</button>
        <form class="row" data-control="revise" data-id="${id}">
          <input name="note" aria-label="보완 요청 내용" maxlength="500" placeholder="보완 요청 내용" required>
          <button class="btn compact" type="submit">보완 요청</button>
        </form>`);
    }
    if (admin && report.status === 'approved') {
      controls.push(`<button class="btn compact" type="button" data-contractor-mail="${id}">계약자 메일 미리보기</button>`);
      if (report.contractPrice == null || report.workerPrice == null) {
        controls.push(`<button class="btn compact" type="button" data-review="rates" data-id="${id}">미확정 단가 반영</button>`);
      }
    }
    if (!admin && report.status !== 'approved') {
      controls.push(`<button class="btn compact" type="button" data-edit-report="${id}">보고 수정</button>`);
    }
    const rate = price => price == null ? '미확정' : price.toLocaleString('ko-KR') + '원/기';
    return `<article class="report-control-row stack">
      <div class="row between"><strong>${detailAnchor('site', report.siteId, report.siteName, report.workDate)}</strong><span class="pill">${esc(reportStatus(report))}</span></div>
      <p class="small muted">${esc(report.workDate)} · ${detailAnchor('worker', report.authorId, report.authorName, report.workDate)}${planQuantity(report)} · 실작업 ${report.units}기 · 외부 ${report.exterior}기 · 내부 ${report.interior}기</p>
      <div>${detailAnchor('report', report.id, '작업 결과·증빙 보기')}</div>
      ${report.notes ? `<p class="small report-control-note">${esc(report.notes)}</p>` : ''}
      ${report.reviewNote ? `<p class="small error">보완 요청 · ${report.revisionTarget ? esc(report.revisionTarget) + ' · ' : ''}${esc(report.reviewNote)}</p>` : ''}
      ${admin && report.status === 'approved' ? `<p class="small muted">${esc(report.region || '구역 미지정')} · 계약 ${rate(report.contractPrice)} · 작업자 ${rate(report.workerPrice)}</p>` : ''}
      ${controls.length ? `<div class="row">${controls.join('')}</div>` : ''}
    </article>`;
  }).join('');
}

export function mountControl(root, account, api, signal) {
  const admin = ['owner', 'admin'].includes(account.role);
  const currentDay = today();
  root.innerHTML = `
    ${admin ? `<section class="card ops-upload stack" aria-labelledby="control-actions-title">
      <div class="row between"><h2 id="control-actions-title">처리할 업무</h2><button class="btn compact" type="button" data-refresh-control>새로고침</button></div>
      <div class="control-actions" data-control-actions><p class="small muted">현장 보고와 메일 상태를 불러오는 중입니다.</p></div>
    </section>` : ''}
    ${admin ? '' : fieldGuidePage(detailHref('worker',account.id,currentDay))}
    ${admin ? `<div class="row control-jumps" role="group" aria-label="관제 메뉴">
      <button class="btn compact" type="button" data-control-jump="work-plans">정기 작업</button>
      <button class="btn compact" type="button" data-control-jump="work-evidence">충전기 증빙</button>
      <button class="btn compact" type="button" data-control-jump="field-report">현장 보고</button>
      <button class="btn compact" type="button" data-control-jump="operations-tasks">업무 목록</button><button class="btn compact" type="button" data-control-jump="work-settlement">월 마감</button><button class="btn compact" type="button" data-control-jump="report-mail">리포트 메일</button><a class="btn compact" href="#analytics">운영 분석</a>
    </div>` : ''}
    <p class="control-notice" data-control-status role="status"></p>
    ${admin ? operationsTasksSection() : ''}
    ${workflowsPage(admin, currentDay)}
    <section class="card ops-upload stack" id="field-report" ${admin ? '' : 'data-guide-screen="report" hidden'}>
      ${admin ? '<h2>일일 현장 보고 제출</h2><div class="stack" data-report-drafts></div>' : ''}
      <form class="stack" data-control="report">
        <div class="row" ${admin ? '' : 'hidden'}>
          <label class="field grow"><span>작업 현장</span><select name="siteId" required><option value="">현장을 선택해 주세요</option></select></label>
          ${textField('작업일', 'workDate', 'date', `required value="${currentDay}" max="${currentDay}"`)}
        </div>
        <div class="report-completion stack" data-report-completion role="status" aria-live="polite" aria-atomic="true">
          <strong data-completion-heading>현장과 작업일을 선택해 주세요.</strong>
          <dl class="completion-quantities" data-completion-quantities hidden>
            <div><dt>배정 설비</dt><dd data-completion-planned></dd></div>
            <div><dt>${admin ? '누적 완료' : '증빙 저장 완료'}</dt><dd data-completion-count></dd></div>
            <div data-completion-remaining-cell><dt>남은 충전기</dt><dd data-completion-remaining></dd></div>
          </dl>
          <progress data-completion-progress aria-label="배정 충전기 완료율" hidden></progress>
          <p data-proof-count></p>
        </div>
        <input name="completionMode" type="hidden">
        ${admin ? `<div class="row">
          ${textField('누적 완료 충전기(기)', 'units', 'number', 'required min="1" step="1" inputmode="numeric"')}
          ${textField('외부 청소(기)', 'exterior', 'number', 'required min="0" step="1" inputmode="numeric" value="0"')}
          ${textField('내부 청소(기)', 'interior', 'number', 'min="0" step="1" inputmode="numeric" placeholder="미실시 시 비워 두세요"')}
        </div>` : `<dl class="completion-scopes" data-completion-scopes hidden>
          <div><dt>외부 청소</dt><dd data-completion-exterior></dd></div>
          <div><dt>내부 청소</dt><dd data-completion-interior></dd></div>
        </dl>`}
        <label class="field"><span>작업 메모</span><textarea name="notes" rows="2" maxlength="1500"></textarea></label>
        <div class="row"><button class="btn primary" type="submit" data-submit-completion disabled>${admin ? '현장 보고 제출' : '작업 완료 등록'}</button>
          ${admin ? '' : '<button class="btn" type="button" data-guide-action="remaining" hidden>남은 충전기 작업하기</button>'}
          <button class="btn" type="button" data-save-report-draft>보고 임시저장</button></div>
      </form>
      ${admin ? '<div class="stack" data-partial-reports></div>' : ''}
    </section>
    <section class="card ops-upload stack" id="control-reviews" ${admin ? '' : 'data-guide-screen="history" hidden'}>
      <div class="row between"><h2>${admin ? '현장 보고 확인' : '내 현장 보고'}</h2>
        ${admin ? `<label class="field"><span>보고 상태</span><select data-report-filter>${option('', '전체')}${Object.entries(reportStatuses).map(([value, label]) => option(value, label)).join('')}</select></label>` : ''}
        <label class="field"><span>보고 월</span><input type="month" data-control-month value="${currentDay.slice(0, 7)}"></label>
      </div>
      <div data-control-reports class="stack">현장 보고를 불러오는 중입니다.</div>
      ${admin ? '' : '<div class="stack" data-partial-reports></div>'}
    </section>
    ${admin ? `<section class="card ops-upload stack" id="report-mail" data-control-mail-section>
      <h2>리포트 메일</h2>
      <p data-mail-ready class="small muted"></p>
      <p data-office-auto-status class="small muted"></p>
      <form class="row" data-control="preview">
        <label class="field"><span>보고 유형</span><select name="kind">${['daily', 'settlement', 'contractor', 'worker', 'tax'].map(kind => option(kind, mailKinds[kind])).join('')}</select></label>
        ${textField('보고 날짜', 'day', 'date', `required value="${currentDay}"`)}
        <label class="field" hidden><span>결산 월</span><input name="month" type="month" value="${currentDay.slice(0, 7)}" max="${currentDay.slice(0, 7)}" disabled></label>
        <label class="field grow" hidden><span>청소 작업자</span><select name="worker" disabled></select></label>
        <label class="field grow" hidden><span>승인된 현장 보고</span><select name="report" disabled></select></label>
        <button class="btn" type="submit">메일 미리보기</button>
      </form>
      <section class="mail-preview stack" data-mail-preview hidden>
        <strong data-mail-subject></strong><p class="small muted" data-mail-recipient></p>
        <ul class="small stack mail-checks" data-mail-warnings hidden></ul>
        <ul class="small stack mail-checks error" data-mail-blocking hidden></ul>
        <div class="row" data-mail-resolution hidden>
          <button class="btn compact" type="button" data-control-jump="control-recipients">수신처 설정</button>
          <button class="btn compact" type="button" data-preview-ledger>해당 월 정산 열기</button>
        </div>
        <pre data-mail-body></pre>
        <iframe data-mail-html title="보고서 메일 본문 미리보기" sandbox="allow-popups allow-popups-to-escape-sandbox" hidden></iframe>
        <div><button class="btn primary" type="button" data-send-control-mail>메일 발송 대기열에 추가</button></div>
      </section>
      <details class="work-details" id="mail-history">
        <summary>최근 메일 상태</summary>
        <div data-mail-history class="stack"></div>
      </details>
      ${account.role === 'owner' ? `<details class="work-details" id="office-test">
        <summary>예약 자동발송 검증</summary>
        <p class="small muted">예시 배정·지급·월 마감 자료 두 통을 본연 Gmail의 다음 예약 실행으로 보냅니다.</p>
        <div class="row"><button class="btn compact" type="button" data-office-test="start">검증용 메일 두 통 예약</button>
          <button class="btn compact" type="button" data-office-test="refresh">검증 상태 확인</button></div>
        <div class="stack" data-office-test-results aria-live="polite"></div>
      </details>` : ''}
    </section>
    <details class="card ops-upload" id="control-recipients"><summary><strong>현장과 수신 이메일 설정</strong></summary>
      <div class="stack region-refresh">
        <form class="row" data-control="settings">
          ${textField('관리자 보고 수신 이메일', 'email', 'email', 'required maxlength="254"')}
          ${textField('세무 담당자 수신 이메일', 'taxEmail', 'email', 'maxlength="254"')}
          <label class="check"><input name="workerMailEnabled" type="checkbox">작업자별 등록 이메일로 발송</label>
          <label class="check"><input name="officeAutoEnabled" type="checkbox">작업자 안내·세무 자료 자동 발송</label>
          <button class="btn compact" type="submit">수신 이메일 저장</button>
        </form>
        <p class="small muted">작업자별 발송을 끄면 작업자 안내를 본연 Gmail로 보냅니다. 세무 자료는 월 마감과 필수 금액 확인을 마친 뒤 등록한 주소로 보냅니다.</p>
        <form class="row" data-control="site">
          <label class="field"><span>현장</span><select name="siteId" required></select></label>
          <label class="field"><span>단가 적용 구역</span><select name="region"></select></label>
          ${textField('계약자 보고 수신 이메일', 'contractorEmail', 'email', 'maxlength="254"')}
          <button class="btn compact" type="submit">현장 설정 저장</button>
        </form>
      </div>
    </details>` : ''}
  `;
  const status = root.querySelector('[data-control-status]');
  const month = root.querySelector('[data-control-month]');
  const reportForm = root.querySelector('form[data-control="report"]');
  const reviewList = root.querySelector('[data-control-reports]');
  const reportFilter = root.querySelector('[data-report-filter]');
  const proofCount = root.querySelector('[data-proof-count]');
  const completionBox = root.querySelector('[data-report-completion]');
  const submitCompletion = root.querySelector('[data-submit-completion]');
  const settings = root.querySelector('form[data-control="settings"]');
  const siteForm = root.querySelector('form[data-control="site"]');
  const previewForm = root.querySelector('form[data-control="preview"]');
  const mailBox = root.querySelector('[data-mail-preview]');
  let model;
  let preview;
  let requestIndex = 0;
  let previewIndex = 0;
  let completionIndex = 0;
  let completionData;
  let settingsDirty = false;
  let siteDirty = false;
  const inProgress = new WeakSet();

  function notify(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
  }
  const workflow = mountWorkflows(root,admin,currentDay,api,signal,notify,refresh,account.id,admin ? null : {
    onModel:data=>guide.setModel(data), canSave:data=>guide.canSave(data), onSaved:(siteId,date)=>guide.evidenceSaved(siteId,date),
  });
  const guide = admin ? null : mountFieldGuide(root,{ today:currentDay,api,signal,notify,workflow,prefillCompletion });
  const refreshTasks = admin ? mountOperationsTasks(root, api, signal) : null;

  function fillSiteSettings() {
    const site = model.sites.find(item => item.id === siteForm.elements.siteId.value);
    siteForm.elements.region.value = site?.region || '';
    siteForm.elements.contractorEmail.value = site?.contractorEmail || '';
  }

  function showSection(id) {
    const section = root.querySelector('#' + id);
    if (section?.tagName === 'DETAILS') section.open = true;
    section?.scrollIntoView({ block: 'start' });
  }

  function fillMailChoices() {
    const { worker, report } = previewForm.elements;
    const workers = model.workers ?? [];
    const approved = model.reports.filter(item => item.status === 'approved');
    const previousWorker = worker.value;
    const previousReport = report.value;
    worker.innerHTML = option('', '작업자 선택') + workers.map(item => option(item.email, item.name + ' · ' + item.email)).join('');
    report.innerHTML = option('', '현장 보고 선택') + approved.map(item => option(item.id, item.workDate + ' · ' + item.siteName)).join('');
    if (workers.some(item => item.email === previousWorker)) worker.value = previousWorker;
    if (approved.some(item => item.id === previousReport)) report.value = previousReport;
  }

  function updateReportList() {
    if (model) reviewList.innerHTML = reportRows(model.reports, admin, reportFilter?.value);
  }

  function drawActions() {
    const waiting = model.reports.filter(report => report.status === 'submitted').length;
    const revisions = model.reports.filter(report => report.status === 'revision').length;
    const contractorMissing = model.sites.filter(site => !site.contractorEmail).length;
    const reviewNeeded = model.deliveries.filter(mail => mail.holdAt || mail.canceledAt || (!mail.sentAt && !mail.queued &&
      Date.now() - Date.parse(mail.createdAt) > 900_000)).length;
    const taxReady = Boolean(model.mailSettings?.taxEmail);
    const card = (label, detail, action) => `<button class="btn control-action" type="button" ${action}><strong>${label}</strong><span class="small">${detail}</span></button>`;
    root.querySelector('[data-control-actions]').innerHTML = [
      card('승인 대기', waiting + '건', 'data-action-report="submitted"'),
      card('보완 요청', revisions + '건', 'data-action-report="revision"'),
      card('수신처 설정', '계약자 미등록 ' + contractorMissing + '곳 · 세무 ' + (taxReady ? '등록됨' : '미등록'), 'data-control-jump="control-recipients"'),
      card('최근 메일', '확인 필요 ' + reviewNeeded + '건', 'data-control-jump="mail-history"'),
      card('처리할 업무 목록', '담당자·기한·보완 대상', 'data-control-jump="operations-tasks"'),
    ].join('');
  }

  async function refresh() {
    const workflowUpdate = workflow.refresh();
    if (refreshTasks) void refreshTasks();
    const attempt = ++requestIndex;
    try {
      const data = await api('control/overview?' + new URLSearchParams({ month: month.value }), { signal });
      if (signal.aborted || attempt !== requestIndex) return;
      model = data;
      const siteOptions = option('', '현장을 선택해 주세요') + data.sites.map(site => option(site.id, site.name)).join('');
      for (const form of [reportForm, siteForm].filter(Boolean)) {
        const field = form.elements.siteId;
        const previous = field.value;
        field.innerHTML = siteOptions;
        field.value = data.sites.some(site => site.id === previous) ? previous : '';
      }
      updateReportList();
      root.querySelector('[data-report-drafts]').innerHTML = data.drafts?.length ? `<details open><summary>내 임시저장 보고 ${data.drafts.length}건</summary>
        <div class="row">${data.drafts.map(draft => `<button class="btn compact" type="button" data-resume-report="${esc(draft.siteId)}"
          data-work-date="${esc(draft.workDate)}">${esc(draft.siteName)} · ${esc(draft.workDate)} 이어쓰기</button>`).join('')}</div></details>` : '';
      root.querySelector('[data-partial-reports]').innerHTML = data.progress?.length ? `<h3>부분 완료 · 진행중</h3>${data.progress.map(row =>
        `<article class="report-control-row row between"><div><strong>${esc(row.siteName)}</strong>
        <p class="small">${esc(row.workDate)} · 완료 ${row.units} / ${row.plannedUnits}기 · 남은 수량 ${row.plannedUnits - row.units}기</p></div>
        <button class="btn compact" type="button" data-resume-report="${esc(row.siteId)}" data-work-date="${currentDay}">이어서 완료 보고</button></article>`).join('')}` : '';
      if (!admin) {
        const amount = value => BigInt(value || '0').toLocaleString('ko-KR') + '원';
        const { expected,approved,unpriced,unapproved,internalUnits,internalPlanned } = data.earnings;
        root.querySelector('[data-worker-earnings]').innerHTML = `<div><dt>현재 배정 현장 예상 총액</dt><dd>${amount(expected)}</dd>
          ${unpriced ? `<p class="small">수량 또는 단가 미확정 ${unpriced}곳 제외</p>` : ''}</div>
          <div><dt>${esc(month.value)} 승인 달성 금액</dt><dd>${amount(approved)}</dd>
          ${unapproved ? `<p class="small">단가 미확정 승인 건 ${unapproved}건 제외</p>` : ''}</div>
          ${account.canSwitchMode ? `<div><dt>관리자 직접 작업 · 지급 제외</dt><dd>현재 배정 ${internalPlanned}기 · 이달 승인 ${internalUnits}기</dd></div>` : ''}`;
      }
      if (admin) {
        if (!settingsDirty) {
          settings.elements.email.value = data.adminEmail;
          settings.elements.taxEmail.value = data.mailSettings?.taxEmail ?? '';
          settings.elements.workerMailEnabled.checked = Boolean(data.mailSettings?.workerMailEnabled);
          settings.elements.officeAutoEnabled.checked = Boolean(data.mailSettings?.officeAutoEnabled);
        }
        fillMailChoices();
        const previousRegion = siteForm.elements.region.value;
        siteForm.elements.region.innerHTML = option('', '구역 미지정') + data.regions.map(region => option(region.name, region.name)).join('');
        if (siteDirty && siteForm.elements.siteId.value) siteForm.elements.region.value = previousRegion;
        else fillSiteSettings();
        drawActions();
        const lastRun = data.gmailRunner?.lastSeenAt;
        const fresh = lastRun && Date.now() - Date.parse(lastRun) < 60 * 60 * 1000;
        const gmailStatus = data.gmailConfigured
          ? lastRun ? (fresh ? '본연 Gmail 자동 발송 연결됨' : '본연 Gmail 자동 발송의 최근 실행을 확인해 주세요.')
            : '본연 Gmail 자동 발송 연결을 기다리는 중입니다.'
          : '';
        root.querySelector('[data-mail-ready]').textContent = gmailStatus || (data.mailReady
          ? '메일 발송 서비스 연결됨' : '메일 발송 서비스 연결이 필요합니다. 메일 미리보기는 이용할 수 있습니다.');
        root.querySelector('[data-office-auto-status]').textContent = data.mailSettings?.officeAutoEnabled
          ? '작업자 안내·세무 자료 자동 발송 사용 중' : '작업자 안내·세무 자료 자동 발송 꺼짐';
        const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' });
        root.querySelector('[data-mail-history]').innerHTML = data.deliveries.length ? data.deliveries.map(row => {
          const state = row.sentAt ? '발송 완료' : row.holdAt ? row.holdReason==='storage' ? '보고 분량 확인 필요' : '발송 결과 확인 필요' : row.canceledAt ? '대기 취소' : row.queued ? '발송 대기'
            : Date.now() - Date.parse(row.createdAt) > 900_000 ? '발송 결과 확인 필요' : '발송 처리 중';
          const subject = row.subject || mailKinds[row.kind] || row.kind;
          return `<article class="report-control-row stack"><div class="row between"><strong>${row.detailKey ? detailAnchor('mail', row.detailKey, subject) : esc(subject)}</strong>
            <span class="pill">${state}</span></div><p class="small muted">${esc(row.recipient)} · ${date.format(new Date(row.sentAt || row.canceledAt || row.createdAt))}</p></article>`;
        }).join('') : '<p class="small muted">아직 발송 내역이 없습니다.</p>';
      }
    } catch (error) {
      if (!signal.aborted && attempt === requestIndex) notify(error.message, true);
    }
    await workflowUpdate;
  }

  async function previewMail(kind, reference) {
    const attempt = ++previewIndex;
    preview = null;
    mailBox.hidden = true;
    const data = await api('control/mail?' + new URLSearchParams({ kind, reference }), { signal });
    if (signal.aborted || attempt !== previewIndex) return;
    preview = { kind, reference, recipient: data.recipient, previewToken: data.previewToken };
    mailBox.querySelector('[data-mail-subject]').textContent = data.subject;
    mailBox.querySelector('[data-mail-recipient]').textContent = '받는 사람 · ' + (data.recipient || '수신 이메일 미등록');
    for (const [key, messages] of [['warnings', data.warnings], ['blocking', data.blocking]]) {
      const list = mailBox.querySelector('[data-mail-' + key + ']');
      list.innerHTML = (messages ?? []).map(message => `<li>${esc(message)}</li>`).join('');
      list.hidden = !messages?.length;
    }
    mailBox.querySelector('[data-mail-resolution]').hidden = Boolean(data.recipient) && !data.blocking?.length;
    mailBox.querySelector('[data-preview-ledger]').hidden = !['tax', 'worker', 'settlement'].includes(kind);
    const plain = mailBox.querySelector('[data-mail-body]');
    const formatted = mailBox.querySelector('[data-mail-html]');
    plain.textContent = data.text;
    plain.hidden = Boolean(data.html);
    formatted.hidden = !data.html;
    formatted.srcdoc = data.html || '';
    mailBox.querySelector('[data-send-control-mail]').disabled = !data.recipient || !data.mailReady || Boolean(data.blocking?.length);
    mailBox.hidden = false;
    mailBox.scrollIntoView({ block: 'nearest' });
  }

  function updatePreviewForm() {
    const { kind, day, month, worker, report } = previewForm.elements;
    const fields = [[day, kind.value === 'daily'], [month, ['settlement', 'worker', 'tax'].includes(kind.value)],
      [worker, kind.value === 'worker'], [report, kind.value === 'contractor']];
    for (const [field, visible] of fields) {
      field.closest('label').hidden = !visible;
      field.required = visible;
      field.disabled = !visible;
    }
  }

  function clearPreview() {
    previewIndex++;
    preview = null;
    mailBox.hidden = true;
  }

  function updateCompletionMode(waitingMessage = '현장과 작업일을 선택해 주세요.') {
    const fields = reportForm.elements;
    const planned = completionData?.plannedUnits;
    const entered = admin ? fields.units.valueAsNumber : completionData?.units;
    const completed = Number.isInteger(entered) && entered>0 ? entered : 0;
    const { state,mode,remaining } = completionProgress(planned,completed,completionData?.previousUnits ?? 0);
    const count = value => Number(value).toLocaleString('ko-KR') + '기';
    const detail = {
      missing:['이전 완료 수량을 확인해 주세요.',admin
        ? '누적 완료 수량은 이전 부분 완료 수량(' + count(completionData?.previousUnits) + ') 이상으로 입력해 주세요.'
        : '저장된 증빙이 이전 부분 완료 수량(' + count(completionData?.previousUnits) + ')보다 적습니다. 빠진 증빙을 다시 등록해 주세요.'],
      empty:admin ? ['누적 완료 수량을 입력해 주세요.','입력한 수량으로 완료 구분을 자동 결정합니다.']
        : ['저장된 충전기 증빙이 없습니다.','충전기 작업 전후 사진과 결과를 저장해 주세요.'],
      unplanned:['완료 보고 · 배정 수량 미등록','현재 완료 수량을 보고할 수 있습니다. 전체 완료 여부는 배정 수량이 등록되면 확인할 수 있습니다.'],
      excess:['배정 수량을 초과했습니다.',admin
        ? '누적 완료 수량은 배정 설비 ' + count(planned) + ' 이하로 입력해 주세요.'
        : '저장된 증빙이 배정 수량보다 ' + count(completed-(planned ?? 0)) + ' 많습니다. 등록된 증빙과 배정 수량을 확인해 주세요.'],
      partial:['부분 완료 · ' + count(remaining) + ' 남음',admin
        ? '현재 ' + count(completed) + '를 부분 완료로 등록합니다. 전체 완료까지 ' + count(remaining) + ' 남았습니다.'
        : '현재 ' + count(completed) + '를 부분 완료로 등록할 수 있습니다. 전체 완료하려면 남은 ' + count(remaining) + '의 작업 전후 사진과 결과를 저장해 주세요.'],
      full:['전체 완료',admin ? '배정된 ' + count(planned) + ' 전체를 완료로 보고합니다.'
        : '배정된 ' + count(planned) + ' 모두 증빙을 저장했습니다. 전체 완료를 등록하면 관리자 확인이 시작됩니다.'],
    };
    const [heading,message] = completionData ? detail[state] : [waitingMessage,''];
    completionBox.dataset.state = completionData ? state : '';
    completionBox.querySelector('[data-completion-heading]').textContent=heading;
    proofCount.textContent=message;
    proofCount.hidden=!message;
    completionBox.querySelector('[data-completion-quantities]').hidden=!completionData;
    completionBox.querySelector('[data-completion-planned]').textContent=planned == null ? '미등록' : count(planned);
    completionBox.querySelector('[data-completion-count]').textContent=count(completed);
    completionBox.querySelector('[data-completion-remaining-cell]').hidden=remaining == null;
    completionBox.querySelector('[data-completion-remaining]').textContent=remaining == null ? '' : count(remaining);
    const progress=completionBox.querySelector('[data-completion-progress]');
    progress.hidden=planned == null;
    if (planned != null) { progress.max=planned; progress.value=Math.min(completed,planned); }
    if (!admin) {
      reportForm.querySelector('[data-completion-scopes]').hidden=!completionData;
      reportForm.querySelector('[data-completion-exterior]').textContent=completionData?.exterior ? count(completionData.exterior) : '미실시';
      reportForm.querySelector('[data-completion-interior]').textContent=completionData?.interior ? count(completionData.interior) : '미실시';
      reportForm.querySelector('[data-guide-action="remaining"]').hidden=!completionData || !(remaining>0);
    }
    fields.completionMode.value=completionData ? mode : '';
    submitCompletion.disabled=!fields.completionMode.value || inProgress.has(submitCompletion);
    submitCompletion.textContent=mode==='partial' ? '부분 완료 등록'
      : state==='full' ? '전체 완료 등록' : admin ? '현장 보고 제출' : '작업 완료 등록';
  }

  async function prefillCompletion(siteId, workDate, { reveal = true, restore = true } = {}) {
    const fields = reportForm.elements;
    if (!Array.from(fields.siteId.options).some(item => item.value === siteId)) {
      throw new Error('배정된 현장 정보를 불러온 뒤 다시 시도해 주세요.');
    }
    const previous = model?.reports.find(row => row.siteId === siteId && row.workDate === workDate);
    const currentNotes = !admin && completionData && fields.siteId.value===siteId && fields.workDate.value===workDate
      ? fields.notes.value : null;
    fields.siteId.value = siteId;
    fields.workDate.value = workDate;
    completionData = null;
    const attempt = ++completionIndex;
    if (reveal) showSection('field-report');
    updateCompletionMode('저장된 충전기 증빙을 집계하고 있습니다.');
    try {
      const data = await api('work/completion-counts?' + new URLSearchParams({ siteId, workDate }), { signal });
      if (signal.aborted || attempt !== completionIndex) return;
      completionData = data;
      const draft = restore ? data.draft : null;
      fields.notes.value = currentNotes ?? draft?.notes ?? previous?.notes ?? data.progressNotes ?? '';
      if (admin) {
        fields.units.value=draft ? draft.units ?? '' : previous?.units ?? (Math.max(data.units,data.previousUnits ?? 0) || '');
        fields.exterior.value=draft ? draft.exterior ?? '' : previous?.exterior ?? Math.max(data.exterior,data.previousExterior ?? 0);
        fields.interior.value=draft ? draft.interior ?? '' : previous?.interior ?? (Math.max(data.interior,data.previousInterior ?? 0) || '');
      }
      updateCompletionMode();
      return data;
    } catch (error) {
      if (signal.aborted || attempt !== completionIndex) return;
      updateCompletionMode(error.message);
      if (!admin) throw error;
    }
  }

  async function work(control, action) {
    if (inProgress.has(control)) return;
    inProgress.add(control);
    if (control) control.disabled = true;
    try { await action(); }
    catch (error) { if (!signal.aborted) notify(error.message, true); }
    finally {
      inProgress.delete(control);
      if (control?.isConnected && !control.hasAttribute('data-send-control-mail')) {
        control.disabled=control===submitCompletion && !reportForm.elements.completionMode.value;
      }
    }
  }

  async function updateOfficeTest(start) {
    const { messages } = await api('control/office-test', { signal, ...(start ? { method: 'POST', body: {} } : {}) });
    if (signal.aborted) return;
    root.querySelector('[data-office-test-results]').innerHTML = messages.length ? messages.map(mail => {
      const state = mail.sentAt ? '발송 완료' : mail.holdAt ? '발송 결과 확인 필요' : mail.canceledAt ? '대기 취소'
        : mail.claimed ? '발송 처리 중' : '예약 발송 대기';
      const subject = mail.canceledAt ? esc(mail.subject) : detailAnchor('mail', mail.detailKey, mail.subject);
      return `<p class="small">${subject} · ${state}</p>`;
    }).join('') : '<p class="small muted">오늘 등록한 검증용 메일이 없습니다.</p>';
  }

  month.addEventListener('change', refresh, { signal });
  reportFilter?.addEventListener('change', updateReportList, { signal });
  settings?.addEventListener('input', () => { settingsDirty = true; }, { signal });
  siteForm?.addEventListener('input', event => {
    if (event.target.name !== 'siteId') siteDirty = true;
  }, { signal });
  siteForm?.elements.siteId.addEventListener('change', () => {
    siteDirty = false;
    fillSiteSettings();
  }, { signal });
  previewForm?.addEventListener('change', () => {
    updatePreviewForm();
    clearPreview();
  }, { signal });
  reportForm.elements.units?.addEventListener('input', () => updateCompletionMode(), { signal });
  reportForm.addEventListener('change', event => {
    if (!['siteId','workDate'].includes(event.target.name)) return;
    const { siteId,workDate } = reportForm.elements;
    if (siteId.value && workDate.value) void prefillCompletion(siteId.value,workDate.value,{ reveal:false });
    else {
      completionIndex++;
      completionData=null;
      updateCompletionMode();
    }
  },{ signal });

  root.addEventListener('submit', event => {
    const form = event.target;
    if (!form.dataset.control) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    work(event.submitter ?? form.querySelector('button'), async () => {
      const action = form.dataset.control;
      if (action === 'report') {
        if (guide && !guide.reportAllowed(data)) return;
        const { siteId, workDate, notes,completionMode } = data;
        if (!completionMode || !completionData) return;
        const { units,exterior,interior } = admin
          ? { units:Number(data.units),exterior:Number(data.exterior),interior:Number(data.interior) }
          : completionData;
        if (units < Math.max(exterior, interior) || units > exterior + interior) {
          const message='실작업 수량은 외부·내부 각각의 수량 이상이고, 두 수량의 합계 이하여야 합니다.';
          if (admin) focusFieldIssue(form.elements.units,message);
          else notify(message,true);
          return;
        }
        await api('control/report', { method: 'POST', body: { siteId, workDate, notes, units, exterior, interior,completionMode } });
        completionIndex++;
        month.value = workDate.slice(0, 7);
        form.reset();
        completionData = null;
        updateCompletionMode();
        notify(completionMode === 'partial' ? '부분 완료를 등록했습니다. 현장은 진행중으로 표시됩니다.'
          : admin ? '현장 보고를 제출했습니다.' : '작업 완료를 등록했습니다. 관리자 확인을 기다립니다.');
        guide?.home();
      } else if (action === 'preview') {
        const reference = { daily: data.day, contractor: data.report, worker: data.month + ':' + data.worker }[data.kind] ?? data.month;
        await previewMail(data.kind, reference);
        return;
      } else if (action === 'revise') {
        await api('control/review', { method: 'PATCH', body: { id: form.dataset.id, action: 'revise', note: data.note } });
        notify('보완을 요청했습니다.');
      } else if (action === 'site') {
        await api('control/site', { method: 'PATCH', body: { ...data, region: data.region || null } });
        siteDirty = false;
        clearPreview();
        notify('현장 구역과 계약자 이메일을 저장했습니다.');
      } else if (action === 'settings') {
        await api('control/settings', { method: 'PATCH', body: { email: data.email, taxEmail: data.taxEmail,
          workerMailEnabled: form.elements.workerMailEnabled.checked, officeAutoEnabled: form.elements.officeAutoEnabled.checked } });
        settingsDirty = false;
        clearPreview();
        notify('메일 수신처 설정을 저장했습니다.');
      }
      await refresh();
    });
  }, { signal });

  root.addEventListener('click', event => {
    const testButton = event.target.closest('button[data-office-test]');
    if (testButton) {
      work(testButton, () => updateOfficeTest(testButton.dataset.officeTest === 'start'));
      return;
    }
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-refresh-control')) {
      work(button, refresh);
      return;
    }
    if (button.hasAttribute('data-preview-ledger')) {
      const ledgerMonth = root.querySelector('[name="ledgerMonth"]');
      const period = preview?.reference.slice(0, 7);
      if (period && ledgerMonth.value !== period) {
        ledgerMonth.value = period;
        ledgerMonth.dispatchEvent(new Event('change'));
      }
      showSection('work-settlement');
      return;
    }
    if (button.hasAttribute('data-prepare-tax')) {
      const period = root.querySelector('[name="ledgerMonth"]').value;
      previewForm.elements.kind.value = 'tax';
      previewForm.elements.month.value = period;
      updatePreviewForm();
      work(button, () => previewMail('tax', period));
      return;
    }
    if (button.dataset.controlJump) {
      showSection(button.dataset.controlJump);
      return;
    }
    if (button.dataset.actionReport && reportFilter) {
      reportFilter.value = button.dataset.actionReport;
      updateReportList();
      showSection('control-reviews');
      return;
    }
    if (button.hasAttribute('data-save-report-draft')) {
      work(button,async () => {
        const fields = reportForm.elements;
        for (const name of ['siteId','workDate']) if (!fields[name].checkValidity()) return;
        const payload = Object.fromEntries(new FormData(reportForm));
        for (const name of ['units','exterior','interior']) {
          payload[name]=admin ? (payload[name]==='' ? null : Number(payload[name])) : completionData?.[name] ?? null;
        }
        payload.completionMode ||= 'full';
        await api('control/report-draft',{ method:'PUT',body:payload,signal });
        notify('보고를 임시저장했습니다.');
        await refresh();
      });
      return;
    }
    if (button.dataset.resumeReport) {
      work(button,() => guide ? guide.selectSite(button.dataset.resumeReport,button.dataset.workDate,true)
        : prefillCompletion(button.dataset.resumeReport,button.dataset.workDate));
      return;
    }
    if (button.dataset.editReport) {
      const report = model?.reports.find(row => row.id === button.dataset.editReport);
      if (!report) return;
      work(button,() => guide ? guide.selectSite(report.siteId,report.workDate,true) : prefillCompletion(report.siteId,report.workDate));
      return;
    }
    if (button.dataset.review) work(button, async () => {
      await api('control/review', { method: 'PATCH', body: { id: button.dataset.id, action: button.dataset.review } });
      notify(button.dataset.review === 'approve' ? '현장 보고를 승인했습니다.' : '등록된 구역 단가를 반영했습니다.');
      await refresh();
    });
    if (button.dataset.contractorMail) work(button, () => {
      previewForm.elements.kind.value = 'contractor';
      previewForm.elements.report.value = button.dataset.contractorMail;
      updatePreviewForm();
      return previewMail('contractor', button.dataset.contractorMail);
    });
    if (button.hasAttribute('data-send-control-mail') && preview) work(button, async () => {
      const message = preview;
      try {
        const result = await api('control/mail', { method: 'POST', body: message });
        notify(result.alreadySent ? '이미 발송된 보고 메일입니다.' : result.alreadyQueued ? '이미 발송을 기다리는 메일입니다.'
          : result.queued ? '메일을 발송 대기열에 추가했습니다.' : '메일 서비스에 발송을 접수했습니다.');
        if (preview === message) clearPreview();
        showSection('mail-history');
        await refresh();
      } catch (error) {
        if (preview === message) button.disabled = false;
        throw error;
      }
    });
  }, { signal });

  refresh();
}
