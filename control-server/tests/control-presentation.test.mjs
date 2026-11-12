import assert from 'node:assert/strict';
import test from 'node:test';
import { mailConsentState, workerEarningsMarkup } from '../../public/control-app/control-presentation.js';

test('historical client mail cannot be sent until the entire new preview is explicitly accepted',()=>{
  const mail={recipient:'client@example.invalid',mailReady:true,requiresHistoricalConsent:true};
  assert.equal(mailConsentState(mail,false).canSend,false);
  assert.equal(mailConsentState(mail,true).canSend,true);
  assert.equal(mailConsentState({...mail,blocking:['수신처 확인 필요']},true).canSend,false);
  assert.equal(mailConsentState({...mail,mailReady:false},true).canSend,false);
  assert.equal(mailConsentState({...mail,requiresHistoricalConsent:false},false).canSend,true);
  assert.equal(mailConsentState({...mail,recipient:''},true).canSend,false);
});

test('administrator direct work explains payable exclusion without presenting misleading zero income',()=>{
  const earnings={expected:'0',approved:'0',internalUnits:2,internalPlanned:4};
  const html=workerEarningsMarkup(earnings,'2026-11',true);
  assert.match(html,/관리자 직접 청소/);
  assert.match(html,/4기/);
  assert.match(html,/2기/);
  assert.match(html,/지급 대상이 아닙니다/);
  assert.doesNotMatch(html,/예상 총액|0원/);
  const cleaner=workerEarningsMarkup({...earnings,expected:'60000',approved:'30000'},'2026-11',false);
  assert.match(cleaner,/60,000원/);
  assert.match(cleaner,/30,000원/);
  const unpriced=workerEarningsMarkup({unpriced:2,unapproved:1},'2026-11',false);
  assert.match(unpriced,/미확정 2곳/);
  assert.match(unpriced,/미확정 승인 건 1건/);
  assert.match(workerEarningsMarkup({},'2026-11',true),/배정 0기/);
});
