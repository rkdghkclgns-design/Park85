import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileSettlement } from '../server/settlement-reconciliation.mjs';

const fixture=()=>({id:'r',siteName:'정산 검증',status:'approved',units:4,internalUnits:1,contractPrice:100000,workerPrice:30000,
  billed:440000,vat:40000,received:220000,paid:40000,paymentVersion:1,workerBreakdown:[
    {email:'a@example.invalid',name:'A',units:2,paid:40000,paidDate:'2025-01-20'},
    {email:'b@example.invalid',name:'B',units:1,paid:0,paidDate:''},
    {email:'owner@example.invalid',name:'관리자',units:1,paid:0,paidDate:'',internal:true}]});

test('reconciles VAT, partial payments and each cleaner without charging internal work',()=>{
  const result=reconcileSettlement([fixture()]);
  assert.deepEqual(result.amounts,{supply:'400000',vat:'40000',billed:'440000',received:'220000',receivable:'220000',expectedWages:'90000',paid:'40000',unpaid:'50000',overpaid:'0'});
  assert.equal(result.internalUnits,1);assert.equal(result.externalUnits,3);assert.equal(result.issues.length,0);
  assert.deepEqual(result.workers.map(w=>[w.name,w.expected,w.paid,w.unpaid]),[['A','60000','40000','20000'],['B','30000','0','30000']]);
});
test('incomplete amounts and mismatched allocations remain explicit instead of becoming confirmed zero',()=>{
  const row={...fixture(),vat:null,workerPrice:null,paymentVersion:0,workerBreakdown:[]};
  const result=reconcileSettlement([row]);
  assert.ok(result.issues.some(i=>i.field==='vat'));assert.ok(result.issues.some(i=>i.field==='workers'));
  assert.equal(result.incomplete.wages,1);assert.equal(result.incomplete.billing,1);
  const mismatch=fixture();mismatch.workerBreakdown[0].paid=39000;
  assert.ok(reconcileSettlement([mismatch]).issues.some(i=>i.field==='paid'));
});
test('exact totals exceed the JavaScript safe integer range without rounding and ignore unapproved rows',()=>{
  const row={...fixture(),units:1,internalUnits:0,workerPrice:Number.MAX_SAFE_INTEGER,paid:0,workerBreakdown:[{email:'a@example.invalid',name:'A',units:1,paid:0,paidDate:''}]};
  const result=reconcileSettlement([row,{...row,id:'r2'},{...row,id:'ignored',status:'submitted'}]);
  assert.equal(result.amounts.expectedWages,'18014398509481982');assert.equal(result.approvedReports,2);
});
test('one cleaner overpayment never cancels another cleaner unpaid balance',()=>{
  const row=fixture();row.paid=90000;row.workerBreakdown[0].paid=90000;
  const result=reconcileSettlement([row]);
  assert.equal(result.amounts.unpaid,'30000');assert.equal(result.amounts.overpaid,'30000');
  assert.ok(result.issues.some(i=>i.field==='paid'));
});
test('explicit zero invoices preserve the existing optional VAT policy',()=>{
  const row={...fixture(),billed:0,vat:null,received:0};
  assert.equal(reconcileSettlement([row]).incomplete.vat,0);
});
test('a suggested author allocation is not a confirmed actual cleaner allocation',()=>{
  const row={...fixture(),units:1,internalUnits:0,paid:0,suggestedWorker:true,workerBreakdown:[{email:'a@example.invalid',name:'A',units:1,paid:0,paidDate:''}]};
  const result=reconcileSettlement([row]);
  assert.ok(result.issues.some(i=>i.field==='workers'));assert.equal(result.workers.length,0);
});
