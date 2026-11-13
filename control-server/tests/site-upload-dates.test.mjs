import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the real browser parser and shipped SheetJS without a DOM or mocked cells.
const context = vm.createContext({ TextDecoder, File, Date, ArrayBuffer, Uint8Array,
  Uint16Array, Uint32Array, DataView, Buffer });
vm.runInContext(await readFile(new URL('../../public/control-app/vendor/xlsx.mini.min.js',import.meta.url),'utf8'),context);
const source = await readFile(new URL('../../public/control-app/operations.js',import.meta.url),'utf8');
const start = source.indexOf('const headerKeys');
const end = source.indexOf('function statusText');
assert.ok(start>=0 && end>start);
vm.runInContext(source.slice(start,end)+';globalThis.parseSiteUpload=parseUpload;',context);
const xlsx = context.XLSX;

function workbookFile(dueDate, {date1904=false,format='m/d/yy',completedDate='2026-11-10'}={}) {
  const book = xlsx.utils.book_new();
  book.Workbook = {WBProps:{date1904}};
  const sheet = xlsx.utils.aoa_to_sheet([
    ['현장ID','현장명','위도','경도','상태','예정일','완료일'],
    [7,'날짜 검증',37.5665,126.978,'작업완료',dueDate,completedDate],
  ],{cellDates:true});
  for(const [cell,value] of [['F2',dueDate],['G2',completedDate]]) {
    if(value instanceof Date)sheet[cell]={t:'d',v:value};
  }
  sheet.A2.z = '0000';
  sheet.F2.z = format;
  sheet.G2.z = format;
  xlsx.utils.book_append_sheet(book,sheet,'sites');
  return new File([xlsx.write(book,{bookType:'xlsx',type:'array',cellDates:true})],'sites.xlsx');
}

test('XLSX uses actual date values rather than localized display strings and keeps formatted IDs',async()=>{
  const rows = await context.parseSiteUpload(workbookFile(46339));
  assert.equal(rows[0].id,'0007');
  assert.equal(rows[0].dueDate,'2026-11-13');
  assert.equal(rows[0].completedDate,'2026-11-10');
  assert.equal(rows[0].lat,37.5665);
});

test('XLSX honors the workbook 1900 and 1904 serial date systems, including the 1904 epoch',async()=>{
  for(const [serial,date1904,expected] of [[46339,false,'2026-11-13'],[44877,true,'2026-11-13'],[0,true,'1904-01-01']]) {
    const [row] = await context.parseSiteUpload(workbookFile(serial,{date1904,format:'General'}));
    assert.equal(row.dueDate,expected);
  }
  await assert.rejects(context.parseSiteUpload(workbookFile(60)),/2행.*예정일/,'Excel fictional 1900-02-29 is not a valid work date');
});

test('real XLSX Date cells preserve their calendar date in positive and negative time zones',async t=>{
  const previousTZ = process.env.TZ;
  t.after(()=>{if(previousTZ===undefined)delete process.env.TZ;else process.env.TZ=previousTZ;});
  for(const zone of ['Asia/Seoul','America/Los_Angeles','Pacific/Kiritimati']) {
    process.env.TZ=zone;
    for(const date1904 of [false,true]) {
      const [row] = await context.parseSiteUpload(workbookFile(new Date('2026-11-13T00:00:00.000Z'),{
        date1904,completedDate:new Date('2026-11-10T00:00:00.000Z'),
      }));
      assert.equal(row.dueDate,'2026-11-13',zone+' due date');
      assert.equal(row.completedDate,'2026-11-10',zone+' completed date');
    }
  }
});

test('CSV dates keep their existing text formats, optional dates, and invalid-date rejection',async()=>{
  const file = content=>new File([content],'sites.csv');
  const header='현장ID,현장명,위도,경도,예정일,완료일\n';
  const [row] = await context.parseSiteUpload(file('\ufeff'+header+'CSV-01,기존 CSV,37,127,2026. 11. 13.,2026/11/10\n'));
  assert.equal(row.dueDate,'2026-11-13');
  assert.equal(row.completedDate,'2026-11-10');
  const [withoutDates] = await context.parseSiteUpload(file('현장ID,현장명,위도,경도\nCSV-02,선택 날짜 없음,37,127\n'));
  assert.equal(withoutDates.dueDate,null);
  assert.equal(withoutDates.completedDate,null);
  await assert.rejects(context.parseSiteUpload(file(header+'CSV-03,오류,37,127,2026-02-30,\n')),/2행.*예정일/);
  await assert.rejects(context.parseSiteUpload(file(header+'CSV-04,오류,37,127,46339,\n')),/2행.*예정일/);
});
