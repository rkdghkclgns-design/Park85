import assert from 'node:assert/strict';
import test from 'node:test';
import { createReportAutosave } from '../../public/control-app/report-autosave.js';

function fixture(scope='report:user-a') {
  const saved=new Map();
  const storage={getItem:key=>saved.get(key) ?? null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  let record={siteId:'site-a',workDate:'2026-11-12',assignment:'2026-11-12',payload:{siteId:'site-a',workDate:'2026-11-12',notes:'작업 메모',units:1,exterior:1,interior:0,completionMode:'partial'}};
  const calls=[];
  const controller=createReportAutosave({scope,storage,read:()=>record,saveRemote:async data=>calls.push(data),delay:10000});
  return {saved,storage,controller,calls,set:value=>{record=value;},record:()=>record};
}

test('report input is durable synchronously before leaving and isolated by assignment and account',()=>{
  const f=fixture();
  f.controller.changed();
  f.controller.stop();
  const fresh=createReportAutosave({scope:'report:user-a',storage:f.storage,read:()=>null,saveRemote:async()=>{}});
  assert.equal(fresh.restore('site-a','2026-11-12','2026-11-12').payload.notes,'작업 메모');
  assert.equal(fresh.restore('site-a','2026-11-12','2026-12-12'),null);
  const other=createReportAutosave({scope:'report:user-b',storage:f.storage,read:()=>null,saveRemote:async()=>{}});
  assert.equal(other.resume(),null);
});

test('offline drafts retry remote storage and successful completion clears local resume',async()=>{
  const f=fixture();let online=false;
  const controller=createReportAutosave({scope:'report:user-a',storage:f.storage,read:f.record,saveRemote:async()=>{if(!online)throw Error('offline');f.calls.push(1);}});
  await controller.flushRemote();
  assert.ok(controller.resume());
  online=true;await controller.pause();
  assert.equal(f.calls.length,1);
  controller.clear(f.record());
  assert.equal(controller.resume(),null);
  controller.stop();
});

test('submission waits for pending remote save so an old write cannot reappear afterwards',async()=>{
  const f=fixture();let finish;
  const controller=createReportAutosave({scope:'report:user-a',storage:f.storage,read:f.record,saveRemote:()=>new Promise(resolve=>{finish=resolve;})});
  const first=controller.flushRemote();
  await Promise.resolve();
  let paused=false;const pause=controller.pause().then(()=>{paused=true;});
  await Promise.resolve();assert.equal(paused,false);
  finish();await first;
  await Promise.resolve();
  // Duplicate queued payloads are harmless; allow the second queued attempt to settle.
  finish();await pause;
  controller.clear(f.record());
  assert.equal(controller.resume(),null);
  controller.stop();
});

test('storage corruption and quota failure preserve the form and explain manual recovery',async()=>{
  const messages=[];let sent=0;
  const f=fixture();
  const broken={getItem:()=>'{broken',setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('blocked');}};
  const controller=createReportAutosave({scope:'a',storage:broken,read:f.record,saveRemote:async()=>{sent++;},status:(...message)=>messages.push(message)});
  assert.equal(controller.resume(),null);
  assert.equal(controller.restore('site-a','2026-11-12'),null);
  controller.changed();await controller.flushRemote();
  assert.equal(sent,0);
  assert.match(messages.at(-1)[0],/수동 임시저장/);
  assert.equal(messages.at(-1)[1],true);
  assert.doesNotThrow(()=>controller.clear(f.record()));
  controller.stop();
});

test('clearing one submitted site does not remove another site draft and repeated flush is deduplicated',async()=>{
  const f=fixture();const first=f.record();
  await f.controller.flushRemote();await f.controller.flushRemote();
  assert.equal(f.calls.length,1);
  f.set({siteId:'site-b',workDate:'2026-11-12',assignment:'2026-11-12',payload:{siteId:'site-b',workDate:'2026-11-12',notes:'다른 현장'}});
  await f.controller.flushRemote();
  f.controller.clear(first);
  assert.equal(f.controller.resume().siteId,'site-b');
  await f.controller.pause();
  f.controller.changed();
  f.controller.unpause();
  assert.equal(f.controller.resume().payload.notes,'다른 현장');
  f.set(null);assert.equal(f.controller.saveLocal(),null);
  f.controller.stop();
});

test('server validation failures retain local text and do not claim a connection retry will fix them',async()=>{
  const f=fixture();const messages=[];
  const controller=createReportAutosave({scope:'report:user-a',storage:f.storage,read:f.record,
    saveRemote:async()=>{const error=Error('이미 제출한 보고입니다.');error.status=409;throw error;},status:message=>messages.push(message)});
  await controller.flushRemote();
  assert.match(messages.at(-1),/이미 제출/);
  assert.equal(controller.resume().payload.notes,'작업 메모');
  controller.clear();controller.stop();
});
