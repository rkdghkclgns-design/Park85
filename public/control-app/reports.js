import { makeZone } from './store.js';
import { area, badge, blankPair, company, completePairs, duration, esc, facts, input, listReports, monthName, photoPair, reportDate, section, select, table, timeText, today } from './ui.js';

export function newReport(date, workspace) {
  const sequence = Math.max(0, ...listReports(workspace, date.slice(0, 7)).map(report => Number(report.sequence) || 0)) + 1;
  const zones = workspace.zones.map(zone => ({ ...makeZone(zone.name, zone.work), contract: zone.contract }));
  return {
    date, start: '', end: '', people: '', team: '', workers: '', sequence,
    author: company.lead.split(' ')[0],
    written: today(), zones, checked: 0, equipment: '', chemicals: '', issues: [],
    customer: company.customer, confirmation: '부재(사진 전달)', feedback: '', followup: '',
    photos: Array.from({ length: 3 }, blankPair), status: 'draft',
  };
}

export function reportRow(report) {
  return `<a class="report-row" href="#d-${report.date}"><div><strong>${reportDate(report.date)} 실행일 보고</strong><span class="small muted">${esc(report.sequence)}회차 · ${esc(report.author || '-')}${report.start && report.end ? ` · ${timeText(duration(report))}` : ''}</span></div>${badge(report.status)}</a>`;
}

function zoneEditor(zone, index) {
  const root = `zones.${index}`;
  const checks = [['contract', '계약 포함'], ['done', '실시']].map(([key, label]) =>
    `<label class="check"><input type="checkbox" data-bind="${root}.${key}"${zone[key] ? ' checked' : ''}>${label}</label>`).join('');
  const options = ['양호', '보완', '미흡'].map(value => `<label><input type="radio" name="zone-${index}" data-bind="${root}.result" value="${value}"${zone.result === value ? ' checked' : ''}>${value}</label>`).join('');
  return `<article class="zone stack">
    <div class="row"><input class="name" aria-label="구역 이름" data-bind="${root}.name" value="${esc(zone.name)}"><button class="btn compact danger-text" type="button" data-action="remove-zone" data-index="${index}" aria-label="${esc(zone.name)} 구역 삭제">×</button></div>
    <div class="checks">${checks}</div>
    <input class="work" aria-label="${esc(zone.name)} 작업 내용" data-bind="${root}.work" value="${esc(zone.work)}">
    <div class="status-buttons" role="group" aria-label="${esc(zone.name)} 점검 결과">${options}</div>
  </article>`;
}

export const blankIssue = () => ({ type: '특이사항', content: '', measure: '', done: false });
function issueEditor(issue, index) {
  const root = `issues.${index}`;
  return `<article class="issue stack"><div class="row between"><strong>특이사항 ${index + 1}</strong><button class="btn compact danger-text" type="button" data-action="remove-issue" data-index="${index}" aria-label="특이사항 ${index + 1} 삭제">삭제</button></div>
    <div class="fields">
      ${select('구분', `${root}.type`, issue.type, ['특이사항', '시설 이상', '미흡', '기타'])}
      ${input('내용', `${root}.content`, issue.content)}
      ${input('조치', `${root}.measure`, issue.measure)}
      <label class="check"><input type="checkbox" data-bind="${root}.done"${issue.done ? ' checked' : ''}>조치 완료</label>
    </div></article>`;
}

export function reportHeader(report, contract) {
  return `<header class="page-title">
    <a href="#days" class="back">← 일자별 보고</a>
    <h1>${reportDate(report.date)} 실행일 보고</h1>
    <div class="row between"><p>${esc(company.name)} · ${monthName(report.date.slice(0, 7))} ${contract}회 중 <span id="report-sequence">${esc(report.sequence)}</span>회차 · 작성 <span id="report-author">${esc(report.author || '-')}</span></p>${badge(report.status)}</div>
  </header>`;
}

export function reportForm(report, contract) {
  const schedule = `<div class="fields">
    ${input('작업일', 'date', report.date, { type: 'date', disabled: true })}
    ${input('시작 시간', 'start', report.start, { type: 'time' })}
    ${input('종료 시간', 'end', report.end, { type: 'time' })}
    ${input('투입 인원(명)', 'people', report.people, { type: 'number', min: 1, max: 999 })}
    ${input('팀장', 'team', report.team)}
    ${input('작업자', 'workers', report.workers)}
    ${input('이번 달 회차', 'sequence', report.sequence, { type: 'number', min: 1, max: 999 })}
    ${input('작성자', 'author', report.author)}
    ${input('작성일', 'written', report.written, { type: 'date' })}
  </div><p class="small muted">실제 작업 시간: <strong id="duration">${report.start && report.end ? timeText(duration(report)) : '-'}</strong></p>`;
  const zones = `<p class="small muted">고객사 현장에 맞게 구역을 추가·삭제하고 이름을 바꿀 수 있습니다. 다음 보고는 이 구역 목록으로 시작합니다.</p>
    ${report.zones.map(zoneEditor).join('')}
    <div class="row zone-actions"><input aria-label="새 구역 이름" id="newzone" maxlength="100" placeholder="새 구역 이름"><button class="btn" type="button" data-action="add-zone">＋ 구역 추가</button></div>
    <div><button class="link-button small" type="button" data-action="reset-zones">기본 템플릿으로 되돌리기</button></div>
    ${input('자체 점검표 완료 항목 (총 30개)', 'checked', report.checked, { type: 'number', min: 0, max: 30 })}`;
  const customer = `<div class="fields">
    ${input('확인자', 'customer', report.customer)}
    ${select('확인 방법', 'confirmation', report.confirmation, ['현장 확인', '부재(사진 전달)', '전화 확인'])}
    ${input('고객 의견', 'feedback', report.feedback)}
    ${input('추가 요청', 'followup', report.followup)}
  </div>`;
  const photos = `<p class="small muted">같은 자리·같은 각도로 작업 전과 작업 후를 한 쌍으로 올려 주세요. 최소 3쌍이 있어야 제출할 수 있고, 5쌍을 권장합니다. PC 화면·서류 등 개인정보가 찍히지 않게 주의해 주세요.</p>
    ${report.photos.map((pair, index) => photoPair(pair, index, true)).join('')}
    <div><button class="btn" type="button" data-action="add-photo-pair">＋ 사진 쌍 추가</button></div>`;
  const revision = report.revision?.active ? `<div class="card card-inner"><strong class="danger-text">보완 요청</strong><p>${esc(report.revision.message)}</p></div>` : '';
  return `${reportHeader(report, contract)}<form id="report-form" class="stack">
    ${revision}
    ${section(2, '작업 일시·인원', schedule)}
    ${section(3, '작업 구역·점검 결과', zones)}
    ${section(4, '사용 장비·약품', `<div class="fields">${area('장비', 'equipment', report.equipment)}${area('약품·소모품', 'chemicals', report.chemicals)}</div>`)}
    ${section(5, '특이사항', `${report.issues.map(issueEditor).join('')}<div><button class="btn" type="button" data-action="add-issue">＋ 특이사항 추가</button></div>`)}
    ${section(6, '고객 확인', customer)}
    ${section(7, `작업 전·후(B&A) 사진 ${completePairs(report.photos).length} / 3쌍`, photos, 'photosec')}
    <div class="form-footer row end"><a href="#days" class="btn">취소</a><button type="submit" class="btn" value="draft" formnovalidate>임시 저장</button><button type="submit" class="btn primary" value="submitted">제출</button></div>
  </form>`;
}

export function reportDetail(report, contract) {
  const schedule = facts([
    ['작업일', report.date], ['시작 시간', report.start], ['종료 시간', report.end], ['작업시간', timeText(duration(report))],
    ['투입 인원(명)', report.people], ['팀장', report.team], ['작업자', report.workers], ['작성자', report.author], ['작성일', report.written],
  ]);
  const zoneRows = report.zones.map(zone => [zone.name, zone.contract ? '포함' : '-', zone.done ? '실시' : '-', zone.work, zone.result || '-']);
  const issueRows = report.issues.filter(issue => issue.content).map(issue => [issue.type, issue.content, issue.measure, issue.done ? '완료' : '-']);
  const customer = facts([['확인자', report.customer], ['확인 방법', report.confirmation], ['고객 의견', report.feedback], ['추가 요청', report.followup]]);
  const review = report.status === 'submitted' ? '<button class="btn" type="button" data-action="request-revision">보완 요청</button><button class="btn primary" type="button" data-action="confirm-report">확인 완료</button>' : '';
  return `${reportHeader(report, contract)}<div class="stack">
    ${section(2, '작업 일시·인원', schedule)}
    ${section(3, '작업 구역·점검 결과', table(['구역', '계약', '실시', '작업 내용', '점검'], zoneRows, '등록된 구역 없음') + `<p class="small muted">자체 점검표 ${esc(report.checked)} / 30개 완료</p>`)}
    ${section(4, '사용 장비·약품', facts([['장비', report.equipment], ['약품·소모품', report.chemicals]]))}
    ${section(5, '특이사항', table(['구분', '내용', '조치', '상태'], issueRows, '특이사항 없음'))}
    ${section(6, '고객 확인', customer)}
    ${section(7, `작업 전·후(B&A) 사진 ${completePairs(report.photos).length}쌍`, completePairs(report.photos).map((pair, index) => photoPair(pair, index)).join(''))}
    <div class="form-footer row end"><a href="#days" class="btn">목록</a>${review}</div>
  </div>`;
}

export function reportError(report) {
  if (!report.start || !report.end || !duration(report)) return '시작 시간과 종료 시간을 확인해 주세요.';
  if (!Number.isInteger(Number(report.people)) || Number(report.people) < 1) return '투입 인원을 입력해 주세요.';
  if (!report.author.trim() || !report.written || Number(report.sequence) < 1) return '작성자, 작성일과 이번 달 회차를 확인해 주세요.';
  if (report.zones.some(zone => !zone.name.trim())) return '이름이 비어 있는 작업 구역을 확인해 주세요.';
  if (completePairs(report.photos).length < 3) return '작업 전·후 사진을 최소 3쌍 올려 주세요.';
  return '';
}
