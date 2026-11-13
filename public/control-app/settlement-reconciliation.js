import {esc} from './ui.js';
const money=value=>value==null?'미확정':BigInt(value).toLocaleString('ko-KR')+'원';

export function reconciliationMarkup(check) {
  if(!check)return '';
  const a=check.amounts;
  const summary=[['공급가액 · 부가세 입력분',a.supply],['부가세 · 입력분',a.vat],['청구 합계',a.billed],['입금액',a.received],['미수금',a.receivable],
    ['외부 작업자 정산 예정 · 단가 확인분',a.expectedWages],['작업자 지급액',a.paid],['미지급액 · 단가 확인분',a.unpaid],['초과 지급액',a.overpaid]];
  return `<section class="stack work-fieldset"><h3>정산 금액 대조</h3><p class="small">승인 ${check.approvedReports}건 · ${check.units}기 중 관리자 직접 작업 ${check.internalUnits}기 지급 제외 · 외부 작업 ${check.externalUnits}기</p>
    <p class="small">미확인 항목 · 계약 단가 ${check.incomplete.contract}건 · 청구·지급 입력 ${check.incomplete.billing}건 · 부가세 ${check.incomplete.vat}건 · 작업자 단가 ${check.incomplete.wages}건. 아래 합계는 입력·확인된 금액 기준입니다.</p>
    <dl class="ledger-summary">${summary.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${money(value)}</dd></div>`).join('')}</dl>
    ${check.workers.length?`<div class="control-detail-table"><table><thead><tr><th>실제 작업자</th><th>수량</th><th>정산 예정</th><th>지급액</th><th>미지급액</th><th>초과 지급액</th></tr></thead><tbody>${check.workers.map(w=>`<tr><td>${esc(w.name)}</td><td>${w.units}기</td><td>${money(w.expected)}</td><td>${money(w.paid)}</td><td>${money(w.unpaid)}</td><td>${money(w.overpaid)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small">외부 작업자 배분 내역이 없습니다.</p>'}
    ${check.issues.length?`<details open><summary>입력 대조 · 확인 ${check.issues.length}건</summary>${check.issues.map(i=>`<div class="report-control-row row between"><p class="small">${esc(i.siteName)} · ${esc(i.message)}</p>${['rate','contractRate'].includes(i.field)?'<a class="btn compact" href="#regions">단가 설정 열기</a>':`<button type="button" class="btn compact" data-check-payment="${esc(i.reportId)}" data-check-field="${esc(i.field)}">해당 입력으로 이동</button>`}</div>`).join('')}</details>`:'<p class="small">입력된 금액과 작업자 배분에서 불일치가 발견되지 않았습니다.</p>'}</section>`;
}
