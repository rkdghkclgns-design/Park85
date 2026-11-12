import { esc } from './ui.js';

export const safetyChecks = {
  access: '현장 출입과 주변 차량·보행자 통제를 확인했습니다.',
  equipment: '보호구와 현장에서 승인된 작업 도구를 준비했습니다.',
  condition: '외함·케이블의 파손, 누수·발열 등 작업을 중단할 이상이 없는지 확인했습니다.',
  power: '충전기 사용 상태를 확인했고, 현장 절차상 작업할 수 있는 상태입니다.',
  isolation: '내함 작업 자격과 현장 승인을 갖췄고, 자격자가 전원 차단 상태를 확인했습니다.',
};

export function safetyFields() {
  return `<fieldset class="stack work-fieldset"><legend>충전기 기본 안전 점검</legend>
    <p class="small muted">파손·누수·발열 등 이상이 있으면 작업을 중단하고 현장 담당자에게 알려 주세요.</p>
    ${Object.entries(safetyChecks).map(([key,label])=>`<label class="check guide-check" ${key === 'isolation' ? 'data-interior-check hidden' : ''}>
      <input type="checkbox" name="guide_${key}" ${key === 'isolation' ? 'disabled' : 'required'}><span>${esc(label)}</span></label>`).join('')}
    </fieldset>`;
}

export function completedSafetyList(checklist) {
  const labels = Object.entries(safetyChecks).filter(([key])=>checklist?.[key] === true);
  return labels.length ? `<details class="work-details"><summary>기기 안전 점검 ${labels.length}개 확인</summary>
    <ul class="small">${labels.map(([,label])=>`<li>${esc(label)}</li>`).join('')}</ul></details>` : '';
}
