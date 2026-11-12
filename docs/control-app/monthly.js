import { area, company, dayName, duration, esc, facts, input, metric, monthName, photoPair, section, select, stats, table, timeText } from './ui.js';

export const newMonthly = () => ({ contract: 20, author: company.lead, date: '', summary: '', requests: [], recommendations: '', next: '', photos: [] });
export const blankRequest = () => ({ name: '', status: '미이행', note: '' });

function requestEditor(request, index) {
  const root = `requests.${index}`;
  return `<article class="request stack">
    <div class="row between"><strong>요청사항 ${index + 1}</strong><button type="button" class="btn compact danger-text" data-action="remove-request" data-index="${index}">삭제</button></div>
    <div class="fields">${input('요청사항', `${root}.name`, request.name)}${select('이행', `${root}.status`, request.status, ['이행', '부분 이행', '미이행'])}${input('비고', `${root}.note`, request.note, { className: 'span' })}</div>
  </article>`;
}

function combineZones(reports) {
  const byName = new Map();
  const priority = { '미흡': 3, '보완': 2, '양호': 1, '': 0 };
  for (const report of reports) {
    for (const zone of report.zones) {
      if (!zone.name.trim()) continue;
      const entry = byName.get(zone.name) ?? { result: '', count: 0, notes: new Set() };
      if (priority[zone.result] > priority[entry.result]) entry.result = zone.result;
      if (zone.done) entry.count++;
      if (['보완', '미흡'].includes(zone.result) && zone.work) entry.notes.add(zone.work);
      byName.set(zone.name, entry);
    }
  }
  return [...byName].map(([name, entry]) => [name, entry.result || '-', entry.count + '회', [...entry.notes].join(' · ') || '-']);
}

export function monthlyReport(workspace, month, monthControl, editor) {
  const saved = workspace.months[month] ?? newMonthly();
  const model = editor ?? saved;
  const result = stats(workspace, month);
  const contract = editor && model.contract !== '' ? Number(model.contract) : result.contract;
  const rate = contract ? Math.round(result.reports.length / contract * 100) : 0;
  const basicInfo = facts([
    ['고객사명', company.name], ['현장 담당자', company.lead], ['고객사 담당자', company.customer], ['연락처', company.phone],
    ['보고 월', month.replace('-', '.')], ['작업 장소', company.location], ['계약 주기', company.term],
    ['이번 달 계약 방문', saved.contract + '회'], ['작성자 (총괄 책임자)', saved.author], ['작성일', saved.date],
  ]);
  const basicEditor = editor ? `<div class="fields">
    ${input('이번 달 계약 방문 횟수', 'contract', model.contract, { type: 'number', min: 1, max: 999 })}
    ${input('작성일', 'date', model.date, { type: 'date' })}
    ${input('작성자 (총괄 책임자)', 'author', model.author)}
  </div>` : '';
  const metrics = `<dl class="metrics month">
    ${metric('계약 방문', contract, '회')}
    ${metric('실시 횟수', result.reports.length, '회')}
    ${metric('이행률', rate + '%')}
    ${metric('총 작업시간', timeText(result.total), '', true)}
    ${metric('회당 평균', timeText(result.average), '', true)}
    ${metric('연인원', result.people, '명')}
  </dl>`;
  const visits = [...result.reports].reverse().map((report, index) => [
    index + 1, report.date, dayName(report.date), report.start, report.end, timeText(duration(report)), report.people,
    report.zones.filter(zone => zone.done).map(zone => zone.name).join(', ') || '-',
    report.issues.filter(issue => issue.content).map(issue => issue.content).join(' · ') || '-',
  ]);
  const issueRows = result.reports.flatMap(report => report.issues.filter(issue => issue.content)
    .map(issue => [report.date, issue.type, issue.content, issue.measure || '-', issue.done ? '완료' : '-']));
  const requests = editor ? `${model.requests.map(requestEditor).join('')}<div><button type="button" class="btn" data-action="add-request">＋ 요청사항 추가</button></div>`
    : table(['요청사항', '이행', '비고'], model.requests.map(request => [request.name, request.status, request.note || '-']), '등록된 요청사항 없음');
  const comments = facts([
    ['만족도', '-'], ['추가 요청', result.reports.map(report => report.followup).filter(Boolean).join('\n')], ['고객 의견', result.reports.map(report => report.feedback).filter(Boolean).join('\n')],
  ]);
  const recommendations = editor ? `<div class="fields">
    ${area('개선 권고 (주기·옵션 등) · 줄마다 한 항목', 'recommendations', model.recommendations, 'span')}
    ${area('다음 달 계획·참고사항 · 줄마다 한 항목', 'next', model.next, 'span')}
  </div>` : facts([['개선 권고 (주기·옵션 등)', model.recommendations], ['다음 달 계획·참고사항', model.next]]);
  const selectedPhotos = editor ? model.photos : model.photos.filter(pair => pair.before || pair.after);
  const representative = selectedPhotos.length ? selectedPhotos.map((pair, index) => photoPair(pair, index, !!editor)).join('') : '<p class="muted">대표 사진 없음</p>';
  const body = `${section(1, '기본 정보', basicInfo + basicEditor)}
    ${section(2, '서비스 개요', editor ? area('서비스 개요', 'summary', model.summary) : `<p class="multiline">${esc(model.summary || '-')}</p>`)}
    ${section(3, '이번 달 실적 요약 (자동)', metrics)}
    ${section(4, '방문 기록 (일자별 보고에서 자동 연결)', table(['No', '작업일', '요일', '시작', '종료', '작업시간', '인원', '작업 구역', '특이사항'], visits, '보고 없음'))}
    ${section(5, '구역별 점검 결과', table(['구역', '이번 달 상태', '실시', '비고 (보완·미흡 내용)'], combineZones(result.reports), '보고 없음'))}
    ${section(6, '요청사항 이행 (견적서 상세내역 기준)', requests)}
    ${section(7, '특이사항·조치 내역', table(['일자', '구분', '내용', '조치', '완료'], issueRows, '특이사항 없음'))}
    ${section(8, '고객 의견', comments)}
    ${section(9, '책임자 의견 및 개선 권고', recommendations)}
    ${section(10, '대표 사진', `<p class="muted small">작업 전·후 · 같은 각도 · 개인정보 노출 금지</p>${representative}${editor ? '<div><button type="button" class="btn" data-action="add-photo-pair">＋ 대표 사진 쌍 추가</button></div>' : ''}`)}`;
  const actions = editor ? '' : '<button type="button" class="btn" data-action="print">인쇄·PDF</button><button type="button" class="btn" data-action="edit-month">편집</button>';
  return `<header class="page-title"><h1>월간 결과보고서</h1><p>${esc(company.name)} · ${monthName(month)} · 말일까지 크린사업본부 제출 → 5일까지 고객사 전달</p><div class="toolbar row">${monthControl}${actions}</div></header>
    ${editor ? `<form id="month-form" class="stack">${body}<div class="form-footer row end"><button type="button" class="btn" data-action="cancel-month">취소</button><button type="submit" class="btn primary">월간 보고 저장</button></div></form>` : `<div class="stack">${body}</div>`}`;
}
