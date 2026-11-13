import { privateImage } from './portal-api.js';
import { esc } from './ui.js';
import { cameraFields, mountCamera, zoneFields } from './camera.js';
import { downloadSettlement, settlementReview } from './settlement-export.js';
import { focusFieldIssue } from './form-guidance.js';
import { evidenceDrafts } from './evidence-drafts.js';
import { completedSafetyList, safetyChecks, safetyFields } from './field-safety.js';
import { evidenceZoneBatchEditor, evidenceZoneEditor, evidenceZoneMoveMessage, mountEvidenceZoneEditors } from './evidence-zone.js';

const opt = (value, title) => `<option value="${esc(value)}">${esc(title)}</option>`;
const label = (title, name, type, attrs = '') => `<label class="field"><span>${title}</span><input name="${name}" type="${type}" ${attrs}></label>`;
const money = value => value.toLocaleString('ko-KR') + '원';
const issues = { open: '미처리', assigned: '조치 중', resolved: '조치 완료' };
const chargerLabels = { slow: '완속 충전기', fast: '급속 충전기', unknown: '미입력' };
const canopyLabels = { included: '포함', excluded: '미포함', unknown: '미입력' };
const resultOptions = {
  surroundingsStatus: { unknown: '미입력', done: '완료', pending: '미완료', not_needed: '대상 아님' },
  faultStatus: { unknown: '미입력', normal: '이상 없음', issue: '이상 발견', not_checked: '미점검' },
};

export function workResultFields(values = {}, guided = false) {
  const menu = (name, title) => `<label class="field"><span>${title}</span><select name="${name}" ${guided ? 'required' : ''}>${Object.entries(resultOptions[name])
    .map(([key, label]) => `<option value="${guided && key === 'unknown' ? '' : key}"${values[name] === key ? ' selected' : ''}>${guided && key === 'unknown' ? '선택' : label}</option>`).join('')}</select></label>`;
  const note = (name, title) => `<label class="field" ${guided && name==='interiorResultNote' ? 'data-interior-result hidden' : ''}><span>${title}</span><textarea name="${name}" rows="2" maxlength="500"
    ${name === 'faultNote' && values.faultStatus === 'issue' ? 'required' : ''}>${esc(values[name] || '')}</textarea></label>`;
  return `<fieldset class="stack work-fieldset"><legend>기기별 작업 결과</legend>
    <div class="work-result-grid">
      ${note('exteriorResultNote', '외함 결과 메모')}${note('interiorResultNote', '내함 결과 메모')}
      <div class="stack">${menu('surroundingsStatus', '주변 상태')}${note('surroundingsNote', '주변 결과 메모')}</div>
      <div class="stack">${menu('faultStatus', '고장확인 상태')}${note('faultNote', '고장확인 메모')}</div>
    </div></fieldset>`;
}

export function workResultList(items) {
  return items?.length ? `<dl class="work-result-grid work-result-summary">${items.map(item => `<div><dt>${esc(item.label)}</dt>
    <dd><strong>${esc(item.status)}</strong>${item.note ? `<p class="small">${esc(item.note)}</p>` : ''}</dd></div>`).join('')}</dl>` : '';
}
function classificationFields(chargerType = '', canopy = '') {
  const options = (values, selected) => Object.entries(values).map(([value, title]) =>
    `<option value="${value}"${value === selected ? ' selected' : ''}>${title}</option>`).join('');
  return `<label class="field"><span>충전기 유형</span><select name="chargerType" required>${opt('', '선택')}${options(chargerLabels, chargerType)}</select></label>
    <label class="field"><span>캐노피 작업 범위</span><select name="canopy" required>${opt('', '선택')}${options(canopyLabels, canopy)}</select></label>`;
}
const slots = {
  exteriorBefore: '외부 작업 전', exteriorAfter: '외부 작업 후',
  interiorBefore: '내부 작업 전', interiorAfter: '내부 작업 후',
};

export function workflowsPage(admin, today) {
  return `
    ${admin ? `<section class="card ops-upload stack" id="work-plans">
      <div class="row between"><h2>정기 작업 배정</h2><span data-plan-summary class="small"></span></div>
      <form class="stack" data-work="plan">
        <div class="row">
          <label class="field"><span>배정 현장</span><select name="siteId" required></select></label>
          <label class="field"><span>청소 작업자</span><select name="workerEmail" required></select></label>
          ${label('첫 작업일', 'startDate', 'date', `required value="${today}"`)}
          ${label('반복 주기(일)', 'repeatDays', 'number', 'min="1" max="365" step="1" value="30" required')}
        </div>
        ${label('작업 안내', 'instructions', 'text', 'maxlength="500"')}
        <div class="row"><button type="submit" class="btn primary">배정 저장</button>
          <button type="button" class="btn" data-remove-plan hidden>정기 배정 해제</button></div>
      </form>
      <form class="row" data-work="quantity">
        <label class="field"><span>수량을 등록할 건물</span><select name="siteId" required></select></label>
        ${label('건물 배정 설비 수량(기)','plannedUnits','number','min="1" max="10000" step="1" required inputmode="numeric"')}
        <button type="submit" class="btn compact">배정 수량 저장</button></form>
      <p class="small muted">예정일이 지나면 지연으로 표시합니다. 정기 작업은 충전기별 사진 증빙 수량이 보고와 일치해야 승인할 수 있습니다.</p>
      <div data-work-plans class="stack"></div>
    </section>` : ''}
    <section class="card ops-upload stack" id="work-evidence" ${admin ? '' : 'data-guide-screen="setup before after results" hidden'}>
      ${admin ? '<h2>충전기별 사진·안전 점검</h2>' : ''}
      <form class="stack" data-work="evidence">
        <input type="hidden" name="assetCode">
        <div class="stack" ${admin ? '' : 'data-guide-group="setup"'}>
        <div class="row">
          <label class="field" ${admin ? '' : 'hidden'}><span>증빙 현장</span><select name="siteId" required></select></label>
          ${label('증빙 작업일', 'workDate', 'date', `required value="${today}" max="${today}"`)}
          ${classificationFields()}
        </div>
        ${zoneFields()}
        <fieldset class="stack work-fieldset"><legend>작업 범위 <small class="field-requirement is-required">필수 · 한 가지 이상</small></legend>
          <label class="check"><input type="checkbox" name="exterior" value="1" checked>외부 청소</label>
          <label class="check"><input type="checkbox" name="interior" value="1"><span>내부 청소 · 해당 현장만</span></label>
          ${admin && location.pathname.startsWith('/verification/') ? `<label class="check"><input type="checkbox" data-verification-file>검증용 가상 파일 사용</label>
            <div class="stack" data-verification-photos hidden>
              <div class="row" data-photo-pair="exterior">${label(slots.exteriorBefore, 'exteriorBefore', 'file', 'accept="image/*"')}${label(slots.exteriorAfter, 'exteriorAfter', 'file', 'accept="image/*"')}</div>
              <div class="row" data-photo-pair="interior">${label(slots.interiorBefore, 'interiorBefore', 'file', 'accept="image/*"')}${label(slots.interiorAfter, 'interiorAfter', 'file', 'accept="image/*"')}</div>
            </div>` : ''}
        </fieldset>
        ${admin ? '' : `<div class="row" data-guide-devices></div><div class="row" data-camera-resume></div>${safetyFields()}
          <div class="row"><button class="btn primary" type="button" data-guide-action="to-before">점검 완료 · 작업 전 촬영</button>
            <button type="button" class="btn" data-open-evidence-draft hidden>임시저장 증빙 열기</button></div>`}
        </div>
        <div class="stack" ${admin ? '' : 'data-guide-group="before after results"'}>
          ${cameraFields(!admin)}
          ${admin ? '' : `<div data-guide-group="before"><button class="btn primary" type="button" data-guide-action="to-after">작업 전 촬영 완료 · 작업 후 촬영</button></div>
          <div data-guide-group="after"><button class="btn primary" type="button" data-guide-action="to-results">작업 후 촬영 완료 · 결과 입력</button></div>`}
        </div>
        <div class="stack" ${admin ? '' : 'data-guide-group="results"'}>
        <label class="check"><input type="checkbox" name="safety" value="1" required>현장 안전 절차에 따라 작업 전 점검과 작업 후 상태 확인을 마쳤습니다.</label>
        <label class="field"><span>이상 사항 (발견 시)</span><textarea rows="2" name="issue" maxlength="800"></textarea></label>
        ${workResultFields({},!admin)}
        <div><button type="submit" class="btn primary" data-upload-proof>증빙 저장</button></div>
        </div>
        <div class="row">
          <button type="button" class="btn" data-save-evidence-draft>증빙 임시저장</button>
          ${admin ? '<button type="button" class="btn" data-open-evidence-draft hidden>임시저장 증빙 열기</button>' : ''}</div>
        <p class="small" data-evidence-draft-status role="status"></p>
      </form>
    </section>
    <section class="card ops-upload stack" id="work-evidence-history" ${admin ? '' : 'data-guide-screen="history" hidden'}>
      <div class="row between"><h3>등록된 증빙</h3>${label('증빙 조회 월', 'evidenceMonth', 'month', `value="${today.slice(0, 7)}"`)}</div>
      <div class="stack" data-work-evidence></div>
    </section>
    ${admin ? `<section class="card ops-upload stack" id="work-settlement">
      <div class="row between"><h2>월 마감·정산 대조</h2>${label('정산 조회 월', 'ledgerMonth', 'month', `value="${today.slice(0, 7)}" max="${today.slice(0, 7)}"`)}
        <button type="button" class="btn compact" data-refresh-ledger>정산 새로고침</button>
        <button type="button" class="btn compact" data-export-ledger>정산 엑셀 내려받기</button>
        <button type="button" class="btn compact" data-prepare-tax>세무 메일 미리보기</button></div>
      <p class="small muted">마감 엑셀에는 마감 시점의 금액이 들어갑니다. 이후 입금·지급 변경은 현재 장부와 운영 이력에서 확인할 수 있습니다.</p>
      <div class="stack" data-work-ledger></div>
    </section>` : ''}
  `;
}

function planRows(sites, today) {
  if (!sites.length) return '<p class="small muted">정기 배정된 현장이 없습니다.</p>';
  return sites.map(site => {
    const late = site.nextDue < today && !site.progressUnits;
    const days = Math.round((Date.parse(today) - Date.parse(site.nextDue)) / 86_400_000);
    return `<article class="report-control-row stack">
      <div class="row between"><strong>${esc(site.name)}</strong>
        <span class="work-status ${site.progressUnits ? 'in_progress' : late ? 'delayed' : 'pending'}"><i></i>${site.progressUnits ? '진행중 · ' + site.progressUnits + '/' + site.plannedUnits + '기' : late ? '지연 ' + days + '일' : site.nextDue === today ? '오늘 작업' : '작업 예정'}</span></div>
      <p class="small muted">${esc(site.workerName)} · 다음 작업일 ${esc(site.nextDue)} · ${site.repeatDays}일마다</p>
      <p class="small muted">배정 설비 · ${site.plannedUnits == null ? '미등록' : esc(site.plannedUnits) + '기'}</p>
      ${site.instructions ? `<p class="small">${esc(site.instructions)}</p>` : ''}
      ${late ? `<form class="row" data-work="delay" data-site="${esc(site.id)}" data-due="${esc(site.nextDue)}">
        ${label('지연 사유', 'reason', 'text', `maxlength="500" value="${esc(site.delayReason)}"`)}
        <button type="submit" class="btn compact">사유 저장</button>
      </form>` : ''}
      <div class="row"><button type="button" class="btn compact" data-edit-plan="${esc(site.id)}">배정 수정</button>
        <button type="button" class="btn compact" data-add-proof="${esc(site.id)}">이 현장 증빙 등록</button></div>
    </article>`;
  }).join('');
}

function evidenceRows(evidence, admin) {
  if (!evidence.length) return '<p class="small muted">이 달에 등록된 충전기 증빙이 없습니다.</p>';
  return evidence.map(row => {
    const legacyPhotos = Object.entries(slots).filter(([slot]) => slot.startsWith('exterior') ? row.exterior : row.interior);
    const photos = row.photos?.length ? row.photos.map(({ id, slot }) => [slots[slot], './api/work/capture?' + new URLSearchParams({ id })])
      : legacyPhotos.map(([slot, title]) => [title, './api/work/photo?' + new URLSearchParams({ id: row.id, slot })]);
    const hasIssue = row.issue || row.workResults?.find(item => item.label === '고장확인' && item.status === '이상 발견')?.note;
    return `<details class="report-control-row" data-evidence-row="${esc(row.id)}">
      <summary><strong>${esc(row.assetLabel)} · ${esc(row.siteName)}${row.zoneName ? ' · ' + esc(row.zoneName) : ''}</strong>
        <span class="small muted"> · ${esc(row.workDate)} · ${esc(row.authorName)}${hasIssue ? ' · 이상 ' + issues[row.followupStatus] : ''}</span></summary>
      <div class="stack work-details">
        <p class="small">${row.exterior ? '외부 청소 · ' : ''}${row.interior ? '내부 청소 · ' : ''}안전 점검 확인</p>
        <p class="small">유형 ${chargerLabels[row.chargerType]} · 캐노피 ${canopyLabels[row.canopy]}</p>
        ${completedSafetyList(row.safetyChecklist)}
        ${workResultList(row.workResults)}
        ${admin && !row.closed ? `<form class="row" data-work="classification" data-id="${esc(row.id)}">
          ${classificationFields(row.chargerType, row.canopy)}
          <button type="submit" class="btn compact">기기 분류 저장</button>
        </form>` : ''}
        <div class="proof-grid">${photos.map(([title, url]) => `<figure><a href="${esc(url)}" target="_blank" rel="noopener">
          <img ${privateImage(url)} alt="${title}" loading="lazy"></a><figcaption class="small">${title}</figcaption></figure>`).join('')}</div>
        ${evidenceZoneEditor(row)}
        ${hasIssue ? `<p class="small report-control-note">이상 사항 · ${esc(hasIssue)}</p>
          <p class="small">후속 조치 · ${issues[row.followupStatus]}${row.followupOwner ? ' · ' + esc(row.followupOwner) : ''}${row.followupNote ? ' · ' + esc(row.followupNote) : ''}</p>` : ''}
        ${admin && hasIssue ? `<form class="row" data-work="issue" data-id="${esc(row.id)}">
          <label class="field"><span>후속 조치 상태</span><select name="status">${Object.entries(issues).map(([value, title]) =>
            `<option value="${value}"${value === row.followupStatus ? ' selected' : ''}>${title}</option>`).join('')}</select></label>
          ${label('조치 담당자', 'owner', 'text', `maxlength="80" value="${esc(row.followupOwner)}"`)}
          ${label('처리 내용', 'note', 'text', `maxlength="500" value="${esc(row.followupNote)}"`)}
          <button type="submit" class="btn compact">후속 조치 저장</button>
        </form>` : ''}
        ${!row.approved && !row.closed ? `<div><button type="button" class="btn compact" data-remove-proof="${esc(row.id)}">증빙 삭제</button></div>` : ''}
      </div>
    </details>`;
  }).join('');
}

function workerPaymentRow(workers, today, row = {}) {
  const options = workers.some(worker => worker.email === row.email) || !row.email ? workers
    : [...workers, { email: row.email, name: row.name }];
  return `<div class="row" data-payment-worker>
    <label class="field"><span>실제 작업자</span><select name="actualWorker" required>
      ${opt('', '작업자 선택')}${options.map(worker => {
        const internal = worker.email === row.email && row.email ? Boolean(row.internal) : Boolean(worker.internal);
        return `<option value="${esc(worker.email)}" data-internal="${Number(internal)}"${worker.email === row.email ? ' selected' : ''}>${esc(worker.name + (internal ? ' · 관리자 직접 작업' : ' · ' + worker.email))}</option>`;
      }).join('')}
    </select></label>
    ${label('담당 실작업 수량', 'workerUnits', 'number', `min="1" step="1" required value="${row.units ?? ''}"`)}
    ${label('개인 지급액(원)', 'workerPaid', 'number', `min="0" step="1" required value="${row.paid ?? ''}" ${row.internal ? 'readonly' : ''}`)}
    ${label('지급일', 'workerPaidDate', 'date', `max="${today}" value="${esc(row.paidDate ?? '')}" ${row.internal ? 'readonly' : ''}`)}
    <span class="small muted" data-internal-caption ${row.internal ? '' : 'hidden'}>관리자 직접 작업 · 지급 제외</span>
    <button type="button" class="btn compact" data-remove-payment-worker>줄 빼기</button>
  </div>`;
}

function ledgerRows(model, month, today) {
  const approved = model.rows.filter(row => row.status === 'approved');
  const totals = { contract: 0n, labor: 0n, billed: 0n, received: 0n, paid: 0n, supply: 0n, vat: 0n,internal:0 };
  let vatRecorded = false;
  let unresolved = model.rows.length - approved.length;
  for (const row of approved) {
    if (row.closeBlocked ?? (row.contractPrice == null || (row.workerPrice == null && row.internalUnits < row.units))) unresolved++;
    const units = BigInt(row.units);
    totals.contract += row.contractPrice == null ? 0n : units * BigInt(row.contractPrice);
    totals.labor += row.workerPrice == null ? 0n : BigInt(row.units-row.internalUnits) * BigInt(row.workerPrice);
    totals.internal += row.internalUnits;
    for (const key of ['billed', 'received', 'paid']) totals[key] += BigInt(row[key]);
    if (row.vat != null) {
      vatRecorded = true;
      totals.supply += BigInt(row.billed) - BigInt(row.vat);
      totals.vat += BigInt(row.vat);
    }
  }
  const summary = [['계약금액(확정분)', totals.contract], ['작업자 정산(확정분)', totals.labor],
    ['관리자 직접 작업(지급 제외)',totals.internal+'기'],
    ['공급가액(입력분)', vatRecorded ? totals.supply : '미입력'], ['부가세(입력분)', vatRecorded ? totals.vat : '미입력'],
    ['고객 청구 합계', totals.billed], ['입금 / 미수', money(totals.received) + ' / ' + money(totals.billed - totals.received)],
    ['작업자 지급 / 정산 차액', money(totals.paid) + ' / ' + money(totals.labor - totals.paid)]];
  const status = model.close ? `마감 완료 · ${new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(model.close.closedAt))} · ${esc(model.close.closedBy)}`
    : `마감 전 · 필수 확인 ${unresolved}건 (승인·단가·청구·부가세·작업자 배분·지급일)`;
  const checks = settlementReview(model);
  return `<p class="small"><strong>${status}</strong></p>
    <dl class="ledger-summary">${summary.map(([title, value]) =>
      `<div><dt>${title}</dt><dd>${typeof value === 'bigint' ? money(value) : value}</dd></div>`).join('')}</dl>
    <details class="stack" ${checks.length && !model.close ? 'open' : ''}><summary>정산 점검 · 확인 ${checks.length}건</summary>
      <div class="stack">${checks.join('') || '<p class="small muted">확인할 항목이 없습니다.</p>'}</div></details>
    ${!model.close && month < today.slice(0, 7) && approved.length && !unresolved
      ? '<div><button type="button" class="btn primary" data-close-ledger>이 달 결산 마감</button></div>' : ''}
    ${approved.length ? approved.map(row => {
      const subtotal = (price,count=row.units) => !count ? '0원' : price == null ? '단가 미확정' : money(BigInt(count) * BigInt(price));
      const billingLocked = model.close ? 'readonly' : '';
      return `<details class="report-control-row" data-ledger-report="${esc(row.id)}"><summary><strong>${esc(row.siteName)} · ${esc(row.workDate)}</strong><span class="small muted"> · ${esc(row.authorName)} · ${row.units}기</span></summary>
        <div class="stack work-details">
          <p class="small">계약 ${subtotal(row.contractPrice)} · 작업자 정산 ${subtotal(row.workerPrice,row.units-row.internalUnits)} · 미수 ${money(BigInt(row.billed) - BigInt(row.received))}
            ${row.internalUnits ? ' · 관리자 직접 작업 ' + row.internalUnits + '기 지급 제외' : ''}</p>
          <form class="stack" data-work="payments" data-id="${esc(row.id)}" data-payment-version="${row.paymentVersion}" data-internal-only="${Number(row.internalWork)}">
            <div class="row">${label('청구 합계(원)', 'billed', 'number', `min="0" step="1" required value="${row.billed}" ${billingLocked}`)}
              ${label('부가세(원)', 'vat', 'number', `min="0" step="1" value="${row.vat ?? ''}" ${row.vat == null ? '' : billingLocked}`)}
              ${label('입금액(원)', 'received', 'number', `min="0" step="1" required value="${row.received}"`)}
              ${label('작업자 지급 합계(원)', 'paid', 'number', `min="0" step="1" required value="${row.paid}" ${row.workerBreakdown.length || row.internalWork ? 'readonly' : ''}`)}</div>
            ${billingLocked ? '<p class="small muted">마감된 청구 합계·청구 번호와 입력된 부가세는 고정됩니다. 변경할 때는 사유를 입력해 주세요.</p>' : ''}
            <p class="small muted" data-payment-supply>공급가액 · ${row.vat == null ? '부가세 미입력' : money(row.billed - row.vat)}</p>
            <fieldset class="stack work-fieldset">
              <legend>실제 작업자별 수량·지급</legend>
              ${row.suggestedWorker ? '<p class="small muted">보고 작성자를 기본값으로 표시했습니다. 실제 작업자를 확인해 주세요.</p>' : ''}
              <p class="small muted">작업자별 수량의 합계를 이 보고의 실작업 ${row.units}기와 맞춰 주세요. 지급 합계는 개인 지급액을 더해 표시합니다.</p>
              <div class="stack" data-payment-workers>${row.workerBreakdown.map(worker => workerPaymentRow(model.workers, today, worker)).join('')}</div>
              <div><button type="button" class="btn compact" data-add-payment-worker>실제 작업자 추가</button></div>
            </fieldset>
            <div class="row">${label('청구 번호', 'billingRef', 'text', `maxlength="100" value="${esc(row.billingRef)}" ${billingLocked}`)}
              ${label('정산 메모', 'note', 'text', `maxlength="400" value="${esc(row.note)}"`)}
              ${model.close ? label('마감 후 변경 사유', 'changeReason', 'text', 'maxlength="400" required') : ''}
              <button type="submit" class="btn compact">정산 내역 저장</button></div>
          </form>
        </div></details>`;
    }).join('') : '<p class="small muted">이 달에 승인된 보고가 없습니다.</p>'}`;
}

async function resizePhoto(file) {
  if (file.size > 20_000_000) throw new Error('20MB 이하의 사진을 선택해 주세요.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob =>
      blob ? resolve(blob) : reject(new Error('사진을 JPG로 변환할 수 없습니다.')), 'image/jpeg', 0.78));
  } catch {
    throw new Error('열 수 있는 JPG, PNG 또는 휴대전화 사진을 선택해 주세요.');
  } finally {
    bitmap?.close();
  }
}

export function mountWorkflows(root, admin, today, api, signal, notify, afterPlanChange, userId, guide) {
  const plan = root.querySelector('form[data-work="plan"]');
  const quantity = root.querySelector('form[data-work="quantity"]');
  const evidence = root.querySelector('form[data-work="evidence"]');
  const evidenceArchive = root.querySelector('[data-work-evidence]');
  const evidenceMonth = root.querySelector('[name="evidenceMonth"]');
  const ledgerMonth = root.querySelector('[name="ledgerMonth"]');
  const ledger = root.querySelector('[data-work-ledger]');
  let model;
  let ledgerWorkers = [];
  let overviewToken = 0;
  let ledgerToken = 0;
  let evidenceLocked=false;
  const working = new WeakSet();
  const getSite = id => model?.sites.find(site => site.id === id);

  function fillPlan() {
    const site = getSite(plan.elements.siteId.value);
    plan.elements.workerEmail.value = site?.workerEmail || '';
    plan.elements.startDate.value = site?.startDate || today;
    plan.elements.repeatDays.value = site?.repeatDays || 30;
    plan.elements.instructions.value = site?.instructions || '';
    plan.querySelector('[data-remove-plan]').hidden = !site?.workerName;
  }

  function fillPhotoFields() {
    const isolation = evidence.elements.guide_isolation;
    if (isolation) {
      const needed = evidence.elements.interior.checked;
      if (!needed) isolation.checked=false;
      isolation.closest('label').hidden=!needed;
      isolation.disabled=evidenceLocked || !needed;
      isolation.required=needed;
      const interiorNote = evidence.elements.interiorResultNote;
      interiorNote.closest('[data-interior-result]').hidden=!needed;
      interiorNote.disabled=evidenceLocked || !needed;
    }
    for (const scope of ['exterior', 'interior']) {
      const row = evidence.querySelector('[data-photo-pair="' + scope + '"]');
      if (!row) continue;
      const enabled = evidence.elements[scope].checked && evidence.querySelector('[data-verification-file]').checked;
      row.hidden = !enabled;
      for (const input of row.querySelectorAll('input')) {
        input.disabled = evidenceLocked || !enabled;
        input.required = enabled;
      }
    }
  }
  const draft = evidenceDrafts(evidence,userId,{signal,getAssignmentDue:siteId=>getSite(siteId)?.nextDue || '',
    onError:error=>notify(error.message,true)});
  const camera = mountCamera(evidence, api, signal, notify, fillPhotoFields, userId, draft, refresh);
  function renderDevices() {
    if (!guide) return;
    const devices = model?.devices?.filter(device=>device.siteId===evidence.elements.siteId.value) || [];
    const field = evidence.querySelector('[data-guide-devices]');
    field.innerHTML = devices.length ? `<label class="field"><span>이전에 등록한 충전기</span><select data-guide-device>${opt('', '새 충전기')}
      ${devices.map(device=>opt(device.assetCode,device.assetLabel + (device.zoneName ? ' · ' + device.zoneName : ''))).join('')}</select></label>` : '';
    const select = field.querySelector('select');
    if (select && devices.some(device=>device.assetCode===evidence.elements.assetCode.value)) select.value=evidence.elements.assetCode.value;
  }

  function updateDraftButton() {
    const saved = draft.resume();
    evidence.querySelector('[data-open-evidence-draft]').hidden = !getSite(saved?.siteId)
      || (!admin && saved.siteId !== evidence.elements.siteId.value);
  }

  async function setEvidenceSite(siteId,workDate) {
    draft.flush();
    evidence.elements.siteId.value=siteId;
    evidence.elements.workDate.value=workDate;
    updateDraftButton();
    await camera.selectZone();
    renderDevices();
  }

  function checkSetup() {
    const fields = evidence.elements;
    for (const [name,message] of [['workDate','작업일을 확인해 주세요.'],['chargerType','충전기 유형을 선택해 주세요.'],['canopy','캐노피 작업 범위를 선택해 주세요.']]) {
      if (!fields[name].validity.valid) { focusFieldIssue(fields[name],message); return false; }
    }
    if (!fields.exterior.checked && !fields.interior.checked) {
      focusFieldIssue(fields.exterior,'외부 또는 내부 청소를 한 가지 이상 선택해 주세요.');
      return false;
    }
    const missing = Object.keys(safetyChecks).map(key=>fields['guide_'+key]).find(field=>!field.disabled && !field.checked);
    if (missing) {
      focusFieldIssue(missing,'이 안전 점검 항목을 확인해 주세요.');
      return false;
    }
    return true;
  }
  function setupValid() {
    const fields=evidence.elements;
    return ['workDate','chargerType','canopy'].every(name=>fields[name].validity.valid)
      && (fields.exterior.checked || fields.interior.checked)
      && Object.keys(safetyChecks).every(key=>fields['guide_'+key].disabled || fields['guide_'+key].checked);
  }
  function resetSafety() {
    for (const name of ['safety',...Object.keys(safetyChecks).map(key=>'guide_'+key)]) evidence.elements[name].checked=false;
    draft.save({automatic:true});
  }
  const fillQuantity = () => { quantity.elements.plannedUnits.value = getSite(quantity.elements.siteId.value)?.configuredUnits ?? ''; };

  async function refresh() {
    if (!evidenceMonth.value) return;
    const token = ++overviewToken;
    try {
      const data = await api('work/overview?' + new URLSearchParams({ month: evidenceMonth.value }), { signal });
      if (signal.aborted || token !== overviewToken) return;
      model = data;
      const siteOptions = opt('', '현장을 선택해 주세요') + data.sites.map(site => opt(site.id, site.name)).join('');
      for (const form of [evidence, plan, quantity].filter(Boolean)) {
        const prior = form.elements.siteId.value;
        form.elements.siteId.innerHTML = siteOptions;
        form.elements.siteId.value = data.sites.some(site => site.id === prior) ? prior : '';
      }
      if (plan) {
        plan.elements.workerEmail.innerHTML = opt('', data.workers.length ? '작업자를 선택해 주세요' : '사용자 메뉴에서 청소 작업자를 등록해 주세요')
          + data.workers.map(worker => opt(worker.email, worker.name + ' · ' + worker.email)).join('');
        fillPlan();
        fillQuantity();
        const assigned = data.sites.filter(site=>site.nextDue).sort((a,b)=>a.nextDue.localeCompare(b.nextDue));
        const overdue = assigned.filter(site=>site.nextDue<today && !site.progressUnits);
        const summary = root.querySelector('[data-plan-summary]');
        summary.textContent='정기 배정 ' + assigned.length + '곳 · 지연 ' + overdue.length + '곳';
        summary.classList.toggle('error',Boolean(overdue.length));
        root.querySelector('[data-work-plans]').innerHTML=planRows(assigned,today);
      }
      evidenceArchive.innerHTML = evidenceZoneBatchEditor(data.evidence) + evidenceRows(data.evidence, admin)
        + (data.evidenceOverflow ? '<p class="small muted">최근 증빙 200건을 표시합니다.</p>' : '');
      updateDraftButton();
      renderDevices();
      if (guide) guide.onModel(data);
      evidence.querySelector('[data-upload-proof]').disabled = !data.photoReady;
      if (!data.photoReady) notify('증빙 사진 저장소 연결이 필요합니다.', true);
    } catch (error) { if (!signal.aborted && token === overviewToken) notify(error.message, true); }
  }

  async function refreshLedger() {
    if (!ledgerMonth?.value) return;
    const token = ++ledgerToken;
    const month = ledgerMonth.value;
    ledger.textContent = '정산 내역을 불러오는 중입니다.';
    try {
      const data = await api('work/settlement?' + new URLSearchParams({ month }), { signal });
      if (!signal.aborted && token === ledgerToken) {
        ledgerWorkers = data.workers;
        ledger.innerHTML = ledgerRows(data, month, today);
      }
    } catch (error) { if (!signal.aborted && token === ledgerToken) ledger.textContent = error.message; }
  }

  async function run(button, operation) {
    if (!button || working.has(button)) return;
    working.add(button);
    button.disabled = true;
    try { await operation(); }
    catch (error) { if (!signal.aborted) notify(error.message, true); }
    finally {
      working.delete(button);
      if (button.isConnected && (!button.hasAttribute('data-upload-proof') || model?.photoReady)) button.disabled = false;
    }
  }

  function show(form) {
    root.dispatchEvent(new CustomEvent('bonyeon-show-section',{detail:{id:form.closest('section')?.id}}));
    form.scrollIntoView({ block: 'center' }); form.elements.siteId.focus({ preventScroll: true });
  }
  function updatePaymentFields(form) {
    const entries = [...form.querySelectorAll('[data-payment-worker]')].map(row => {
      const internal = row.querySelector('[name="actualWorker"]').selectedOptions[0]?.dataset.internal === '1';
      const paid = row.querySelector('[name="workerPaid"]');
      const paidDate = row.querySelector('[name="workerPaidDate"]');
      paid.readOnly = paidDate.readOnly = internal;
      row.querySelector('[data-internal-caption]').hidden = !internal;
      if (internal) { paid.value = '0'; paidDate.value = ''; }
      return paid;
    });
    const amount = form.elements.paid;
    amount.readOnly = entries.length > 0 || form.dataset.internalOnly === '1';
    if (entries.length) amount.value = entries.reduce((sum, field) => sum + Number(field.value), 0);
    else if (form.dataset.internalOnly === '1') amount.value = '0';
    const { billed, vat } = form.elements;
    form.querySelector('[data-payment-supply]').textContent = '공급가액 · '
      + (vat.value === '' ? '부가세 미입력' : Number(vat.value) > Number(billed.value) ? '청구 합계 확인'
        : money(Number(billed.value) - Number(vat.value)));
  }
  plan?.elements.siteId.addEventListener('change', fillPlan, { signal });
  quantity?.elements.siteId.addEventListener('change',fillQuantity,{ signal });
  evidence.addEventListener('change', fillPhotoFields, { signal });
  evidence.addEventListener('change', event => {
    if (!event.target.matches('[data-guide-device]')) return;
    const device = model?.devices?.find(row=>row.assetCode===event.target.value && row.siteId===evidence.elements.siteId.value);
    run(evidence.querySelector('[data-guide-action="to-before"]'),async () => {
      if (!device) {
        await camera.selectZone(evidence.elements.zoneId.value);
        draft.useDevice('AUTO-' + crypto.randomUUID().toUpperCase());
      } else {
        await camera.selectZone(device.zoneId || '');
        draft.useDevice(device.assetCode,device.assetLabel);
        evidence.elements.chargerType.value=device.chargerType;
        evidence.elements.canopy.value=device.canopy;
      }
      await camera.reset();
    });
  }, { signal });
  evidenceMonth.addEventListener('change', refresh, { signal });
  ledgerMonth?.addEventListener('change', refreshLedger, { signal });
  mountEvidenceZoneEditors(evidenceArchive,api,signal,async ({ id,count,zoneName })=>{
    await refresh();
    if (signal.aborted) return;
    const row=[...evidenceArchive.querySelectorAll('[data-evidence-row]')].find(item=>item.dataset.evidenceRow===id);
    if (row) {
      row.open=true;
      row.querySelector('summary').focus({ preventScroll:true });
    }
    notify(evidenceZoneMoveMessage(count,zoneName));
  });
  fillPhotoFields();
  root.addEventListener('input', event => {
    const form = event.target.closest('form[data-work="payments"]');
    if (form) updatePaymentFields(form);
  }, { signal });
  root.addEventListener('submit', event => {
    const form = event.target;
    const action = form.dataset.work;
    if (!action) return;
    event.preventDefault();
    const payload = new FormData(form);
    const data = Object.fromEntries(payload);
    run(event.submitter || form.querySelector('button'), async () => {
      if (action === 'plan') {
        await api('work/plan', { method: 'PUT', body: { ...data, repeatDays: Number(data.repeatDays) }, signal });
        notify('정기 작업 배정을 저장했습니다.');
        await afterPlanChange();
      } else if (action === 'quantity') {
        await api('work/site-quantity',{ method:'PATCH',body:{ siteId:data.siteId,plannedUnits:Number(data.plannedUnits) },signal });
        notify('건물 배정 설비 수량을 저장했습니다.');
        await afterPlanChange();
      } else if (action === 'delay') {
        await api('work/delay', { method: 'PATCH', body: { siteId: form.dataset.site, dueDate: form.dataset.due, reason: data.reason }, signal });
        notify('지연 사유를 저장했습니다.');
        await refresh();
      } else if (action === 'evidence') {
        if (guide && !guide.canSave(data)) return;
        if (!data.exterior && !data.interior) {
          focusFieldIssue(form.elements.exterior, '외부 또는 내부 청소를 한 가지 이상 선택해 주세요.');
          return;
        }
        if (data.faultStatus === 'issue' && !data.faultNote.trim()) {
          focusFieldIssue(form.elements.faultNote, '발견한 이상을 메모에 입력해 주세요.');
          return;
        }
        const locked=[...form.querySelectorAll('input,select,textarea,button')].map(field=>[field,field.disabled]);
        evidenceLocked=true;
        for (const [field] of locked) field.disabled=true;
        try {
        if (camera.usesFiles()) {
          for (const slot of Object.keys(slots)) {
            const photo = payload.get(slot);
            if (!photo) continue;
            payload.set(slot, await resizePhoto(photo), slot + '.jpg');
          }
        } else {
          if (!await camera.ready()) return;
          payload.set('captureIds', JSON.stringify(camera.selectedIds()));
        }
        if (guide) payload.set('safetyChecklist',JSON.stringify(Object.fromEntries(
          Object.keys(safetyChecks).map(key=>[key,form.elements['guide_'+key].checked]))));
        await api('work/evidence', { method: 'POST', body: payload, signal });
        evidenceMonth.value = data.workDate.slice(0, 7);
        form.elements.safety.checked = false;
        form.elements.issue.value = '';
        for (const key of ['exteriorResultNote', 'interiorResultNote', 'surroundingsNote', 'faultNote']) form.elements[key].value = '';
        for (const key of ['surroundingsStatus', 'faultStatus']) form.elements[key].value = 'unknown';
        form.elements.faultNote.required = false;
        for (const slot of Object.keys(slots)) if (form.elements[slot]) form.elements[slot].value = '';
        draft.reset();
        updateDraftButton();
        await camera.reset();
        renderDevices();
        notify('충전기 증빙을 저장했습니다.');
        guide?.onSaved(data.siteId,data.workDate);
        await refresh();
        } finally {
          evidenceLocked=false;
          for (const [field,disabled] of locked) if (field.isConnected) field.disabled=disabled;
          fillPhotoFields();
        }
      } else if (action === 'issue') {
        await api('work/issue', { method: 'PATCH', body: { id: form.dataset.id, ...data }, signal });
        notify('후속 조치를 저장했습니다.');
        await afterPlanChange();
      } else if (action === 'classification') {
        await api('work/evidence/classification', { method: 'PATCH', body: { id: form.dataset.id, ...data }, signal });
        notify('충전기 유형과 캐노피 작업 범위를 저장했습니다.');
        await refresh();
      } else if (action === 'payments') {
        const workers = [...form.querySelectorAll('[data-payment-worker]')].map(row => ({
          email: row.querySelector('[name="actualWorker"]').value,
          units: Number(row.querySelector('[name="workerUnits"]').value),
          paid: Number(row.querySelector('[name="workerPaid"]').value),
          paidDate: row.querySelector('[name="workerPaidDate"]').value,
        }));
        await api('work/settlement/payments', { method: 'PATCH', body: { id: form.dataset.id,
          paymentVersion: Number(form.dataset.paymentVersion),
          billed: Number(data.billed), received: Number(data.received), paid: Number(data.paid),
          vat: data.vat === '' ? null : Number(data.vat), workers, billingRef: data.billingRef, note: data.note, changeReason: data.changeReason }, signal });
        notify('청구·입금·지급 내역을 저장했습니다.');
        await refreshLedger();
      }
    });
  }, { signal });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-save-evidence-draft')) {
      run(button,async () => {
        if (!evidence.elements.siteId.value) return focusFieldIssue(evidence.elements.siteId,'증빙 현장을 선택해 주세요.');
        if (!evidence.elements.workDate.checkValidity()) return focusFieldIssue(evidence.elements.workDate,'증빙 작업일을 확인해 주세요.');
        if (draft.save()) {
          evidence.querySelector('[data-open-evidence-draft]').hidden=false;
          notify('증빙을 이 기기에 임시저장했습니다.');
        }
      });
      return;
    }
    if (button.hasAttribute('data-open-evidence-draft')) {
      run(button,async () => {
        const saved=draft.resume();
        if (!saved || !getSite(saved.siteId) || (!admin && saved.siteId !== evidence.elements.siteId.value)) {
          throw new Error('선택한 현장에 열 수 있는 증빙이 없습니다.');
        }
        evidence.elements.siteId.value=saved.siteId;
        evidence.elements.workDate.value=saved.workDate;
        await camera.selectZone(saved.zoneId);
        if (admin) show(evidence);
        else renderDevices();
      });
      return;
    }
    if (button.hasAttribute('data-refresh-ledger')) {
      run(button, refreshLedger);
      return;
    }
    if (button.hasAttribute('data-export-ledger')) {
      run(button, async () => {
        const month = ledgerMonth.value;
        if (!month) throw new Error('결산 월을 선택해 주세요.');
        const data = await api('work/settlement/export?' + new URLSearchParams({ month }), { signal });
        downloadSettlement(month, data);
      });
      return;
    }
    if (button.dataset.checkPayment) {
      root.dispatchEvent(new CustomEvent('bonyeon-show-section',{detail:{id:'work-settlement'}}));
      const row = [...ledger.querySelectorAll('[data-ledger-report]')].find(item => item.dataset.ledgerReport === button.dataset.checkPayment);
      if (row) {
        row.open = true;
        row.scrollIntoView({ block: 'center' });
      }
      return;
    }
    if (button.hasAttribute('data-add-payment-worker') || button.hasAttribute('data-remove-payment-worker')) {
      const form = button.closest('form[data-work="payments"]');
      if (button.hasAttribute('data-add-payment-worker')) {
        const container = form.querySelector('[data-payment-workers]');
        container.insertAdjacentHTML('beforeend', workerPaymentRow(ledgerWorkers, today));
        container.lastElementChild.querySelector('select').focus();
      } else button.closest('[data-payment-worker]').remove();
      updatePaymentFields(form);
      return;
    }
    const { editPlan, addProof, removeProof } = button.dataset;
    if (button.dataset.openEvidence) run(button, async () => {
      evidenceMonth.value = button.dataset.workDate.slice(0, 7);
      root.dispatchEvent(new CustomEvent('bonyeon-show-section',{detail:{id:'work-evidence-history',month:evidenceMonth.value}}));
      await refresh();
      const item = [...root.querySelectorAll('[data-evidence-row]')].find(row => row.dataset.evidenceRow === button.dataset.openEvidence);
      if (!item) throw new Error('증빙 목록에서 이 건을 찾을 수 없습니다. 보고 상세를 열어 주세요.');
      item.open = true;
      item.scrollIntoView({ block: 'center' });
    });
    if (editPlan && plan) { plan.elements.siteId.value = editPlan; fillPlan(); show(plan); }
    if (addProof) {
      evidence.elements.siteId.value = addProof;
      evidence.elements.siteId.dispatchEvent(new Event('change', { bubbles: true }));
      show(evidence);
    }
    if (removeProof && window.confirm('승인 전 증빙과 첨부 사진을 삭제할까요?')) run(button, async () => {
      await api('work/evidence', { method: 'DELETE', body: { id: removeProof }, signal });
      notify('작업 증빙을 삭제했습니다.');
      await refresh();
    });
    if (button.hasAttribute('data-remove-plan') && plan?.elements.siteId.value && window.confirm('이 현장의 정기 배정을 해제할까요? 기존 보고는 보존됩니다.')) {
      run(button, async () => {
        await api('work/plan', { method: 'DELETE', body: { siteId: plan.elements.siteId.value }, signal });
        notify('정기 배정을 해제했습니다.');
        await afterPlanChange();
      });
    }
    if (button.hasAttribute('data-close-ledger') && window.confirm(ledgerMonth.value + ' 결산을 마감할까요? 마감된 달의 현장 보고는 변경할 수 없습니다.')) {
      run(button, async () => {
        await api('work/settlement/close', { method: 'POST', body: { month: ledgerMonth.value }, signal });
        notify('월 결산을 마감했습니다.');
        await Promise.all([refresh(), refreshLedger()]);
      });
    }
  }, { signal });
  return {
    refresh:()=>Promise.all([refresh(),refreshLedger()]),form:evidence,camera,draft,setEvidenceSite,checkSetup,setupValid,resetSafety,
    assignmentFor:siteId=>getSite(siteId)?.nextDue || '',
    recheckAssignment() { draft.restore();fillPhotoFields(); },
    getMonth:()=>evidenceMonth.value,
    setMonth(month,{refresh:reload=true}={}) {
      if (!/^\d{4}-\d{2}$/.test(month)) return Promise.resolve();
      evidenceMonth.value=month;
      if (ledgerMonth) ledgerMonth.value=month;
      return reload ? Promise.all([refresh(),refreshLedger()]) : Promise.resolve();
    },
    async restoreDraft(saved) {
      const site=getSite(saved?.siteId);
      if (!site || saved.assignmentDue!==site.nextDue || saved.workDate<site.nextDue || saved.workDate>today) return false;
      await setEvidenceSite(saved.siteId,saved.workDate);
      await camera.selectZone(saved.zoneId,saved.zoneName);
      if (evidence.elements.zoneId.value!==(saved.zoneId || '')) return false;
      if (saved.assetCode && saved.assetCode!==evidence.elements.assetCode.value) draft.useDevice(saved.assetCode,saved.assetLabel);
      fillPhotoFields();renderDevices();await camera.reset();
      return !signal.aborted;
    },
  };
}
