export function reconcileSettlement(rows) {
  const totals={supply:0n,vat:0n,billed:0n,received:0n,receivable:0n,expectedWages:0n,paid:0n,unpaid:0n,overpaid:0n};
  const incomplete={billing:0,vat:0,wages:0,contract:0},workers=new Map(),issues=[];
  let units=0,internalUnits=0,approvedReports=0;
  for(const row of rows) {
    if(row.status!=='approved')continue;
    approvedReports++;units+=row.units;internalUnits+=row.internalUnits||0;
    const issue=(field,message)=>issues.push({reportId:row.id,siteName:row.siteName,field,message});
    const external=row.units-(row.internalUnits||0),billed=BigInt(row.billed),paid=BigInt(row.paid),received=BigInt(row.received);
    totals.billed+=billed;totals.received+=received;totals.receivable+=billed-received;totals.paid+=paid;
    if(row.contractPrice==null){incomplete.contract++;issue('contractRate','계약 단가를 확정해 주세요.');}
    if(!row.paymentVersion){incomplete.billing++;issue('billing','청구·입금·지급 금액을 확인해 저장해 주세요.');}
    if(row.vat==null&&!(row.paymentVersion>0&&billed===0n)){incomplete.vat++;issue('vat','부가세를 입력해 주세요.');}
    else {totals.vat+=BigInt(row.vat??0);totals.supply+=billed-BigInt(row.vat??0);}
    const expected=external===0?0n:row.workerPrice==null?null:BigInt(external)*BigInt(row.workerPrice);
    if(expected===null){incomplete.wages++;issue('rate','작업자 단가를 확정해 주세요.');}
    else totals.expectedWages+=expected;
    const entries=row.suggestedWorker?[]:row.workerBreakdown||[];
    if(entries.length) {
      const allocated=entries.reduce((n,w)=>n+w.units,0),internal=entries.filter(w=>w.internal).reduce((n,w)=>n+w.units,0);
      if(allocated!==row.units||internal!==(row.internalUnits||0))issue('workers','작업자별 수량과 관리자 직접 작업 수량을 보고에 맞춰 주세요.');
      if(entries.reduce((n,w)=>n+BigInt(w.paid),0n)!==paid)issue('paid','작업자별 지급 합계와 현장 지급액이 다릅니다.');
    } else if(external>0) {
      issue('workers','실제 작업자별 수량과 지급액을 입력해 주세요.');
      if(expected!==null){totals.unpaid+=expected>paid?expected-paid:0n;totals.overpaid+=paid>expected?paid-expected:0n;}
    }
    for(const worker of entries) {
      if(worker.internal){if(worker.paid||worker.paidDate)issue('paid','관리자 직접 작업은 지급 대상에서 제외해야 합니다.');continue;}
      if(worker.paid>0&&!worker.paidDate)issue('paidDate',worker.name+' 지급일을 입력해 주세요.');
      const amount=row.workerPrice==null?null:BigInt(worker.units)*BigInt(row.workerPrice),payment=BigInt(worker.paid);
      const total=workers.get(worker.email)||{email:worker.email,name:worker.name,units:0,expected:0n,paid:0n,unpaid:0n,overpaid:0n,missingRate:false};
      total.units+=worker.units;total.paid+=payment;total.missingRate||=amount===null;
      if(amount!==null){
        const unpaid=amount>payment?amount-payment:0n,overpaid=payment>amount?payment-amount:0n;
        total.expected+=amount;total.unpaid+=unpaid;total.overpaid+=overpaid;totals.unpaid+=unpaid;totals.overpaid+=overpaid;
        if(overpaid>0n)issue('paid',worker.name+' 초과 지급 '+overpaid.toLocaleString('ko-KR')+'원을 확인해 주세요.');
      }
      workers.set(worker.email,total);
    }
  }
  const printable=value=>Object.fromEntries(Object.entries(value).map(([key,v])=>[key,typeof v==='bigint'?v.toString():v]));
  return {approvedReports,units,internalUnits,externalUnits:units-internalUnits,amounts:printable(totals),incomplete,issues,
    workers:[...workers.values()].map(w=>({...printable(w),expected:w.missingRate?null:w.expected.toString(),unpaid:w.missingRate?null:w.unpaid.toString()}))};
}
