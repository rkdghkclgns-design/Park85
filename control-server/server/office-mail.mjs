import { internalWorkUnits } from './progress.mjs';
import { validMailbox } from './addresses.mjs';

const validRecipient = validMailbox;
const number = value => value.toLocaleString('ko-KR');
const money = value => value == null ? '미입력' : number(value) + '원';
const units = value => number(value) + '기';
const section = (title, columns, rows, note = '') => ({ title, columns, rows, note });
const sum = (rows, value) => rows.reduce((total, row) => total + BigInt(value(row)), 0n);

function workerPayment(rate, worker) {
  const paid = BigInt(worker.paid);
  const expected = rate == null ? null : BigInt(rate) * BigInt(worker.units);
  return {
    paid,
    expected,
    unpaid: expected == null ? null : expected > paid ? expected - paid : 0n,
    overpaid: expected == null ? null : paid > expected ? paid - expected : 0n,
  };
}

function renderMail(detailedReport, subject, recipient, title, period, intro, metrics, sections, warnings, blocking) {
  const { detailText, html } = detailedReport(title, period, intro, metrics, sections);
  return { recipient, subject, text: detailText, html, warnings, blocking };
}

async function buildWorkerMail(db, month, email, context, { workerMailEnabled, centralEmail, detailedReport, confirmedOnly, withdrawals }) {
  const worker = await db.prepare("SELECT email,name FROM members WHERE email=? AND role IN ('cleaner','admin') AND active=1")
    .bind(email).first();
  if (!worker) throw new context.HttpError(404, '활성 상태의 작업자를 찾을 수 없습니다.');
  const [{ results: rows }, { results: plans }] = await Promise.all([
    db.prepare(`
      SELECT r.work_date, r.site_name, r.worker_price, json_extract(w.value, '$.units') AS units,
             json_extract(w.value, '$.paid') AS paid, json_extract(w.value, '$.paidDate') AS paid_date
      FROM field_reports r JOIN settlement_payments p ON p.report_id = r.id
      JOIN json_each(p.worker_breakdown) w ON json_extract(w.value, '$.email') = ?
      WHERE r.work_date BETWEEN ? AND ? AND r.status = 'approved' AND COALESCE(json_extract(w.value,'$.internal'),0)=0 AND (? = 0 OR (
        r.worker_price IS NOT NULL AND (json_extract(w.value, '$.paid') = 0 OR COALESCE(json_extract(w.value, '$.paidDate'), '') <> '')
      ))
      ORDER BY r.work_date, r.site_name, r.id
    `).bind(worker.email, month + '-01', month + '-31', Number(Boolean(confirmedOnly))).all(),
    db.prepare(`
      SELECT w.name, w.address, p.next_due, p.start_date, p.repeat_days, p.instructions,
             CASE WHEN p.delay_date = p.next_due THEN p.delay_reason ELSE '' END AS delay_reason
      FROM work_plan_cycles p JOIN work_sites w ON w.id = p.site_id
      WHERE p.worker_email = ? AND (p.next_due <= date(?, '+31 days') OR p.start_date LIKE ?)
      ORDER BY (p.start_date LIKE ?) DESC, p.next_due, w.name, w.id LIMIT 101
    `).bind(worker.email, context.koreaDate(), month + '-%', month + '-%').all(),
  ]);
  return renderWorkerMail(month, worker, rows, plans, { workerMailEnabled, centralEmail, detailedReport, withdrawals });
}

function renderWorkerMail(month, worker, rows, plans, { workerMailEnabled, centralEmail, detailedReport, withdrawals = [] }) {
  const recipient = workerMailEnabled ? worker.email : centralEmail;
  const warnings = [];
  const blocking = [];
  if (!validRecipient(recipient)) blocking.push('발송에 사용할 이메일 주소를 확인해 주세요.');
  if (!workerMailEnabled) warnings.push('작업자 직접 발송이 꺼져 있어 본연 Gmail에서 확인합니다.');
  const payments = rows.map(row => ({ ...row, ...workerPayment(row.worker_price, row) }));
  const missingRates = payments.filter(row => row.expected == null).length;
  const missingDates = payments.filter(row => row.paid > 0n && !row.paid_date).length;
  if (!payments.length) warnings.push('선택한 작업월에 본인에게 배정된 승인 정산 내역이 없습니다.');
  if (missingRates) warnings.push('작업 단가 미확정 ' + missingRates + '건의 예정액·잔액은 미입력으로 표시합니다.');
  if (missingDates) warnings.push('지급일이 입력되지 않은 내역이 ' + missingDates + '건 있습니다.');
  if (plans.length > 100) warnings.push('정기 배정이 100건을 초과해 예정일이 이른 100건을 표시합니다.');

  const known = payments.filter(row => row.expected != null);
  const confirmedTotal = field => !payments.length ? 0n : known.length ? sum(known, row => row[field]) : null;
  const sections = [
    section('내 작업 정산 상세', ['작업일', '현장', '배정 수량', '대당 작업 단가', '정산 예정액', '지급액', '지급일', '미지급액', '초과 지급액'],
      payments.map(row => [row.work_date, row.site_name, units(row.units), money(row.worker_price), money(row.expected),
        money(row.paid), row.paid_date || (row.paid > 0n ? '미입력' : '—'), money(row.unpaid), money(row.overpaid)]),
      missingRates ? '예정액과 잔액 합계는 단가가 확정된 내역 기준입니다.' : ''),
    section('현재 정기 배정', ['다음 예정일', '첫 작업일', '반복 주기', '현장', '주소', '작업 지시', '지연 사유'],
      plans.slice(0, 100).map(row => [row.next_due, row.start_date, row.repeat_days + '일마다',
        row.name, row.address || '—', row.instructions || '—', row.delay_reason || '—']),
      '선택한 월에 시작한 배정과 앞으로 31일 이내의 작업을 표시합니다.'),
  ];
  if (withdrawals.length) sections.unshift(section('이전 안내에서 변경된 내역', ['기존 일정·작업일', '변경'],
    withdrawals.map(row => [row.date || '—', row.source === 'assignment' ? '이전 작업 배정 해제' : '이전 지급 대상에서 제외']),
    '변경된 항목의 현재 배정·정산은 아래 상세를 확인해 주세요.'));
  return renderMail(detailedReport, '[본연] 작업자 작업·지급 안내 · ' + month + ' · ' + worker.name.replace(/[\r\n]/g, ' '), recipient || '',
    '작업자 작업·지급 안내', month + ' · ' + worker.name,
    [withdrawals.length ? '이전에 안내한 배정 또는 지급 대상이 변경됐습니다.' : '본인에게 배정된 현장과 작업월 기준 정산 내역입니다.', ...warnings].join('\n'),
    [['작업 수량', units(sum(rows, row => row.units))], ['정산 예정액', money(confirmedTotal('expected'))],
      ['지급액', money(sum(payments, row => row.paid))], ['미지급액', money(confirmedTotal('unpaid'))],
      ['초과 지급액', money(confirmedTotal('overpaid'))]], sections, warnings, blocking);
}

async function buildTaxMail(db, month, { taxEmail, detailedReport }) {
  const [close, { results }] = await Promise.all([
    db.prepare('SELECT closed_at FROM settlement_months WHERE month = ?').bind(month).first(),
    db.prepare(`
      SELECT r.work_date,r.site_name,r.author_name,r.units,r.status,r.worker_price,r.internal_work,r.internal_units,p.report_id,p.billing_ref,
             p.billed, p.vat, p.received, p.paid, p.worker_breakdown
      FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id
      WHERE r.work_date BETWEEN ? AND ? ORDER BY r.work_date, r.site_name, r.id
    `).bind(month + '-01', month + '-31').all(),
  ]);
  return renderTaxMail(month, close, results, { taxEmail, detailedReport });
}

function renderTaxMail(month, close, results, { taxEmail, detailedReport }) {
  const warnings = [];
  const blocking = [];
  if (!validRecipient(taxEmail)) blocking.push('세무 담당자 수신 이메일을 등록해 주세요.');
  if (!close) blocking.push('해당 작업월을 마감한 뒤 세무 자료를 발송할 수 있습니다.');
  const approved = results.filter(row => row.status === 'approved');
  const pending = results.length - approved.length;
  if (pending) blocking.push('미승인 작업 보고 ' + pending + '건을 확인해 주세요.');
  const recorded = approved.filter(row => row.report_id);
  const missingRecords = approved.length - recorded.length;
  if (missingRecords) blocking.push('청구·지급 내역 미저장 ' + missingRecords + '건을 입력해 주세요. 금액이 없으면 0원으로 저장할 수 있습니다.');
  const missingVat = recorded.filter(row => row.billed > 0 && row.vat == null).length;
  if (missingVat) blocking.push('청구가 있는 내역 중 부가세 미입력 ' + missingVat + '건을 확인해 주세요. 부가세가 없으면 0원을 입력해 주세요.');
  const missingBillingRefs = recorded.filter(row => row.billed > 0 && !row.billing_ref).length;
  if (missingBillingRefs) warnings.push('청구번호 미입력 ' + missingBillingRefs + '건이 있습니다.');
  const missingRates = approved.filter(row => row.worker_price == null && internalWorkUnits(row) < row.units).length;
  if (missingRates) blocking.push('작업자 단가 미확정 ' + missingRates + '건을 확인해 주세요.');

  const labor = [];
  const internal = [];
  let missingWorkers = 0;
  let mismatchedWorkers = 0;
  for (const row of recorded) {
    const allocations = JSON.parse(row.worker_breakdown);
    const internalUnits = internalWorkUnits(row,allocations);
    if (!allocations.length && internalUnits) internal.push([row.work_date,row.site_name,
      internalUnits===row.units ? row.author_name : '관리자 작업 (증빙 집계)',units(internalUnits),'지급 제외']);
    if (!allocations.length && internalUnits < row.units && (row.paid > 0 || row.worker_price > 0)) missingWorkers++;
    if (allocations.length && (sum(allocations, worker => worker.units) !== BigInt(row.units)
      || sum(allocations, worker => worker.paid) !== BigInt(row.paid))) mismatchedWorkers++;
    for (const worker of allocations) {
      if (worker.internal) internal.push([row.work_date,row.site_name,worker.name,units(worker.units),'지급 제외']);
      else labor.push({ row,worker,...workerPayment(row.worker_price,worker) });
    }
  }
  if (missingWorkers) blocking.push('비용이 있는 작업의 실제 작업자 미배정 ' + missingWorkers + '건을 확인해 주세요.');
  if (mismatchedWorkers) blocking.push('작업자별 수량 또는 지급 합계 불일치 ' + mismatchedWorkers + '건을 확인해 주세요.');
  const missingPaidDates = labor.filter(item => item.paid > 0n && !item.worker.paidDate).length;
  if (missingPaidDates) blocking.push('작업자 지급일 미입력 ' + missingPaidDates + '건을 확인해 주세요.');
  const ratedLabor = labor.filter(item => item.expected != null);
  const overpaid = sum(ratedLabor, item => item.overpaid);
  if (overpaid > 0n) warnings.push('정산 예정액보다 많이 지급된 ' + money(overpaid) + '을 확인해 주세요.');

  const knownVat = recorded.filter(row => row.vat != null || row.billed === 0);
  const supply = sum(knownVat, row => row.billed - (row.vat ?? 0));
  const vat = sum(knownVat, row => row.vat ?? 0);
  const rated = approved.filter(row => row.worker_price != null || internalWorkUnits(row) === row.units);
  const laborExpected = sum(rated, row => BigInt(row.worker_price ?? 0) * BigInt(row.units - internalWorkUnits(row)));
  const moneyForSaved = (total, records = recorded) => !records.length && approved.length ? '미입력' : money(total);
  const note = '공급가액과 부가세 합계는 입력이 확인된 금액 기준입니다. 입금액과 지급액은 조회 시점까지 저장된 금액입니다.';
  const sections = [
    section('현장별 청구·입금', ['작업일', '현장', '청구번호', '공급가액', '부가세', '청구 합계', '입금액', '미수금'],
      approved.map(row => [row.work_date, row.site_name, row.billing_ref || (row.billed > 0 ? '미입력' : '—'),
        money(row.billed === 0 ? 0 : row.vat == null ? null : row.billed - row.vat),
        money(row.billed === 0 ? 0 : row.vat), money(row.billed), money(row.received),
        money(row.report_id ? row.billed - row.received : null)]), note),
    section('작업자별 지급 비용', ['작업일', '현장', '작업자', '수량', '대당 단가', '정산 예정액', '지급액', '지급일', '미지급액', '초과 지급액'],
      labor.map(({ row, worker, paid, expected, unpaid, overpaid: excess }) => [row.work_date, row.site_name, worker.name,
        units(worker.units), money(row.worker_price), money(expected), money(paid),
        worker.paidDate || (paid > 0n ? '미입력' : '—'), money(unpaid), money(excess)]),
      '정산 예정액은 확정 단가 기준입니다. 미지급액과 초과 지급액은 실제 작업자 배정 내역을 기준으로 계산합니다.'),
    ...(internal.length ? [section('관리자 직접 작업',['작업일','현장','관리자','수량','구분'],internal)] : []),
  ];
  const balancesKnown = !(missingRecords || missingRates || missingWorkers || mismatchedWorkers);
  return renderMail(detailedReport, '[본연] 세무 비용 처리 자료 · ' + month, taxEmail || '', '세무 비용 처리 자료',
    month + ' 작업월', ['작업월 기준으로 정리한 고객 청구·입금과 작업자 지급 자료입니다.',
      close ? '작업 마감일 ' + new Date(close.closed_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '작업 마감 전 미리보기',
      ...blocking, ...warnings].join('\n'),
    [['공급가액', moneyForSaved(supply, knownVat)], ['부가세', moneyForSaved(vat, knownVat)],
      ['청구 합계', moneyForSaved(sum(recorded, row => row.billed))], ['입금액', moneyForSaved(sum(recorded, row => row.received))],
      ['미수금', moneyForSaved(sum(recorded, row => row.billed - row.received))],
      ['작업자 정산 예정액', moneyForSaved(laborExpected, rated)],
      ['작업자 지급액', moneyForSaved(sum(recorded, row => row.paid))],
      ['작업자 미지급액', money(balancesKnown ? sum(ratedLabor, item => item.unpaid) : null)],
      ['작업자 초과 지급액', money(balancesKnown ? overpaid : null)]], sections, warnings, blocking);
}

export async function buildOfficeMail(db, kind, reference, context, settings) {
  const ref = typeof reference === 'string' && /^(\d{4}-\d{2})(?::(.+))?$/.exec(reference);
  if (!ref || !context.validDate(ref[1] + '-01')) throw new context.HttpError(400, '조회할 작업월을 확인해 주세요.');
  const [, month, email] = ref;
  if (kind === 'worker' && validRecipient(email)) return buildWorkerMail(db, month, context.emailAddress(email), context, settings);
  if (kind === 'tax' && !email && month <= context.koreaDate().slice(0, 7)) return buildTaxMail(db, month, settings);
  throw new context.HttpError(400, '작업월과 발송 대상을 확인해 주세요.');
}

export function officeAcceptanceData(today) {
  const previous = new Date(today.slice(0, 7) + '-01T00:00:00Z');
  previous.setUTCDate(0);
  const month = previous.toISOString().slice(0, 7);
  const worker = { email: 'office-test-worker@example.invalid', name: '자동발송 검증 작업자' };
  const site = { name: '자동발송 검증 현장', address: '서울 예시 주소' };
  const workDate = month + '-25';
  const paidDate = month + '-27';
  const allocation = { ...worker, units: 2, paid: 25000, paidDate };
  const payment = { work_date: workDate, site_name: site.name, units: 2, status: 'approved', worker_price: 15000,
    report_id: 'office-test-report', billing_ref: '자동발송-검증', billed: 110000, vat: 10000, received: 88000,
    paid: allocation.paid, worker_breakdown: JSON.stringify([allocation]) };
  const plan = { ...site, start_date: month + '-28', next_due: month + '-28', repeat_days: 30,
    instructions: '배정 확정 · 외부와 내부 청소 후 기기별 증빙 등록', delay_reason: '' };
  return { month, worker, site, payment, allocation, plan, close: { closed_at: today + 'T00:00:00.000Z' } };
}

export function buildOfficeAcceptanceMails(today, mailbox, detailedReport) {
  const { month, worker, payment, allocation, plan, close } = officeAcceptanceData(today);
  const workerRows = [{ ...payment, units: allocation.units, paid: allocation.paid, paid_date: allocation.paidDate }];
  return [
    ['worker', renderWorkerMail(month, worker, workerRows, [plan], { centralEmail: mailbox, detailedReport })],
    ['tax', renderTaxMail(month, close, [payment], { taxEmail: mailbox, detailedReport })],
  ];
}
