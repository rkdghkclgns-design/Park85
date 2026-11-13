import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadSettlement} from '../../public/control-app/settlement-export.js';

test('Excel preserves one worker unpaid balance even when another is overpaid at the same site',()=>{
  const sheets=new Map();globalThis.window={XLSX:{utils:{book_new:()=>({}),aoa_to_sheet:rows=>rows,book_append_sheet:(_,rows,name)=>sheets.set(name,rows)},writeFile:()=>{}}};
  try {
    downloadSettlement('2025-01',{close:null,rows:[{id:'r',status:'approved',workDate:'2025-01-01',siteName:'현장',authorName:'관리자',units:2,internalUnits:0,
      workerPrice:100,contractPrice:100,billed:220,vat:20,received:0,paid:200,billingRef:'',note:'',workerBreakdown:[
        {name:'A',email:'a@example.invalid',units:1,paid:150,paidDate:'2025-01-01'},
        {name:'B',email:'b@example.invalid',units:1,paid:50,paidDate:'2025-01-01'}]}]});
    assert.equal(sheets.get('마감 요약').find(r=>r[0]==='작업자 미지급 (단가 확인분)')[1],50);
    assert.equal(sheets.get('현장별 정산')[1][13],50);
  } finally {delete globalThis.window;}
});
