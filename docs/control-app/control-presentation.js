import { esc } from './ui.js';

export function mailConsentState(mail,checked=false) {
  const required=mail.requiresHistoricalConsent===true;
  return {required,accepted:required && checked===true,
    canSend:Boolean(mail.recipient && mail.mailReady && !mail.blocking?.length && (!required || checked===true))};
}

export function workerEarningsMarkup(earnings,month,internal=false) {
  const amount=value=>BigInt(value || '0').toLocaleString('ko-KR')+'원';
  if (internal) return `<div class="direct-work-summary"><dt>관리자 직접 청소</dt><dd>배정 ${earnings.internalPlanned || 0}기 · 이달 승인 ${earnings.internalUnits || 0}기</dd>
    <p class="small">직접 청소한 수량은 외부 작업자 지급 대상이 아닙니다. 작업 기록과 완료 수량은 그대로 관리합니다.</p></div>`;
  return `<div><dt>현재 배정 현장 예상 총액</dt><dd>${amount(earnings.expected)}</dd>
    ${earnings.unpriced ? `<p class="small">수량 또는 단가 미확정 ${earnings.unpriced}곳 제외</p>` : ''}</div>
    <div><dt>${esc(month)} 승인 달성 금액</dt><dd>${amount(earnings.approved)}</dd>
    ${earnings.unapproved ? `<p class="small">단가 미확정 승인 건 ${earnings.unapproved}건 제외</p>` : ''}</div>`;
}
