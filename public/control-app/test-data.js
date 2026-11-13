import {esc,today} from './ui.js';

export function testDataPage(account) {
  return ['owner','admin'].includes(account.role)?'<div id="operations" class="stack"><p role="status">검증 자료를 불러오는 중입니다.</p></div>':'<div class="card empty">관리자 전용 보관 자료입니다.</div>';
}

export async function mountTestData(root,account,api,signal) {
  try {
    const data=await api('control/test-archive',{signal});
    if(signal.aborted)return;
    const link=(kind,id,month=today().slice(0,7))=>'#control-detail/'+kind+'/'+encodeURIComponent(id)+'?month='+month;
    root.innerHTML=`<header class="page-title"><h1>검증 자료</h1><p>보관된 테스트 현장 ${data.sites.length}곳 · 보고 ${data.reports.length}건 · 실제 운영 합계에서 제외</p></header>
      <section class="card ops-upload stack"><h2>새 테스트·정산 리허설</h2><p>새 테스트는 운영 장부와 분리된 검증 작업공간에서 진행합니다. 정산 화면의 금액 대조표에서 공급가액·부가세·작업자별 지급·미지급액을 확인할 수 있습니다.</p>
        ${account.role==='owner'?'<div><a class="btn primary" href="/verification/#control">검증 작업공간 열기</a></div>':'<p class="small">새 검증 작업공간은 사이트 소유자 계정으로 열 수 있습니다.</p>'}</section>
      <section class="card ops-upload stack"><h2>기존 테스트 기록 보관함</h2><p class="small">원본 보고와 사진을 읽기 전용으로 보존했습니다. 지도·운영 분석·일일 보고·결산·자동 발송 대상에 포함되지 않습니다.</p>
      ${data.sites.map(site=>`<article class="report-control-row stack"><div class="row between"><strong>${esc(site.name)}</strong><a class="btn compact" href="${esc(link('site',site.id))}">현장·미등록 사진 보기</a></div><p class="small">보고 ${site.reportCount}건 · 사진 ${site.photoCount}장 · ${esc(site.reason)}</p>
        <div class="row">${data.reports.filter(r=>r.siteId===site.id).map(r=>`<a class="btn compact" href="${esc(link('report',r.id,r.workDate.slice(0,7)))}">${esc(r.workDate)} · ${r.units}기 · 보고·사진 보기</a>`).join('')}</div></article>`).join('')||'<p class="muted">보관된 테스트 현장이 없습니다.</p>'}</section><div><a class="btn" href="#control">운영 관제로 돌아가기</a></div>`;
  } catch(error){if(!signal.aborted)root.innerHTML='<div class="card error">'+esc(error.message)+'</div>';}
}
