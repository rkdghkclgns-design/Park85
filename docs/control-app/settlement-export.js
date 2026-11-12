import { esc } from './ui.js';

const payable = row => BigInt(row.units - (row.internalUnits || 0)) * BigInt(row.workerPrice ?? 0);
const outstanding = (total, paid) => total > paid ? total - paid : 0n;
const amount = number => {
  const exact = BigInt(number);
  return exact <= BigInt(Number.MAX_SAFE_INTEGER) && exact >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(exact) : exact.toString();
};

export function settlementReview(model) {
  return model.rows.flatMap(row => {
    const flags = [];
    if (row.status !== 'approved') flags.push(row.status === 'revision' ? '보완 중' : '승인 대기');
    else {
      if (row.contractPrice == null || (row.workerPrice == null && row.internalUnits < row.units)) flags.push('단가 미확정');
      if (!row.paymentVersion) flags.push('청구·입금·지급 내역 미입력');
      if (row.vat == null) flags.push('부가세 미입력');
      if (row.billed > row.received) flags.push('미수 ' + (row.billed - row.received).toLocaleString('ko-KR') + '원');
      if (!row.workerBreakdown.length && !row.internalWork) flags.push('실제 작업자별 지급 내역 미입력');
      if (row.workerPrice != null && payable(row) !== BigInt(row.paid)) {
        const difference = payable(row) - BigInt(row.paid);
        flags.push((difference > 0n ? '미지급 ' : '초과 지급 ') + (difference < 0n ? -difference : difference).toLocaleString('ko-KR') + '원');
      }
    }
    if (!flags.length) return [];
    const link = row.status === 'approved'
      ? `<button class="btn compact" type="button" data-check-payment="${esc(row.id)}">정산 상세 열기</button>`
      : `<a class="btn compact" href="#control-detail/report/${encodeURIComponent(row.id)}">보고 상세 열기</a>`;
    return [`<article class="report-control-row row between"><div><strong>${esc(row.siteName)}</strong>
      <p class="small">${esc(row.workDate)} · ${esc(flags.join(' · '))}</p></div>${link}</article>`];
  });
}

export function downloadSettlement(month, data) {
  const xlsx = window.XLSX;
  if (!xlsx?.writeFile) throw new Error('엑셀을 만들 수 없습니다. 화면을 새로고침해 주세요.');
  const rows = data.rows.filter(row => row.status === 'approved');
  const book = xlsx.utils.book_new();
  const add = (name, values) => xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(values), name);
  const total = getter => amount(rows.reduce((sum, row) => sum + BigInt(getter(row)), 0n));
  add('마감 요약', [
    ['본연 월 정산', month], ['자료 유형', data.close ? data.legacy ? '기존 마감 자료 · 기능 적용 시점의 기록' : '마감 시점 확정본' : '마감 전 검토용'],
    ['마감 일시', data.close?.closedAt || ''], ['마감 담당자', data.close?.closedBy || ''],
    ['승인 현장 보고', rows.length], ['부가세 미입력 건', rows.filter(row => row.vat == null).length],
    ['공급가액 (부가세 입력분)', total(row => row.vat == null ? 0 : row.billed - row.vat)],
    ['부가세 (입력분)', total(row => row.vat ?? 0)], ['청구 합계', total(row => row.billed)], ['입금', total(row => row.received)],
    ['미수금', total(row => row.billed - row.received)], ['작업자 지급', total(row => row.paid)],
    ['관리자 직접 작업 수량 (지급 제외)',total(row => row.internalUnits || 0)],
    ['작업자 미지급 (단가 확인분)', total(row => row.workerPrice == null ? 0n : outstanding(payable(row), BigInt(row.paid)))],
  ]);
  add('현장별 정산', [
    ['작업일','현장','보고 작업자','실작업 수량','관리자 직접 작업 수량','계약 단가','작업 단가','공급가액','부가세','청구 합계','입금','미수','작업자 지급','작업자 미지급','청구 번호','메모'],
    ...rows.map(row => [row.workDate,row.siteName,row.authorName,row.units,row.internalUnits || 0,row.contractPrice,row.workerPrice,
      row.vat == null ? null : row.billed - row.vat,row.vat,row.billed,row.received,row.billed - row.received,row.paid,
      row.workerPrice == null ? null : amount(outstanding(payable(row), BigInt(row.paid))),row.billingRef,row.note]),
  ]);
  add('작업자별 지급', [
    ['작업일','현장','작업자','이메일','작업 수량','대당 작업 단가','정산 예정','지급','미지급','초과 지급','지급일'],
    ...rows.flatMap(row => row.workerBreakdown.filter(worker => !worker.internal).map(worker => {
      const expected = BigInt(row.workerPrice ?? 0) * BigInt(worker.units);
      const paid = BigInt(worker.paid);
      return [row.workDate,row.siteName,worker.name,worker.email,worker.units,row.workerPrice,
        row.workerPrice == null ? null : amount(expected),worker.paid,
        row.workerPrice == null ? null : amount(outstanding(expected,paid)),
        row.workerPrice == null ? null : amount(outstanding(paid,expected)),worker.paidDate];
    })),
  ]);
  xlsx.writeFile(book, '본연-월정산-' + month + (data.close ? '-마감' : '-검토용') + '.xlsx');
}
