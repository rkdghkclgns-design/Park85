import assert from 'node:assert/strict';
import test from 'node:test';
import { installPrivateImageLoader } from '../../public/control-app/private-media.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const image=(path='photo')=>({dataset:{privateImage:path},alt:'작업 전',hidden:false,closest(){return this.hidden ? {} : null;},removeAttribute(name){delete this[name];}});
function fixture(fetchMedia) {
  const root=new EventTarget(),events=new EventTarget(),images=[],revoked=[],timers=[];
  let sync,scope='user-a',serial=0;
  root.querySelectorAll=()=>images;root.contains=img=>images.includes(img);
  const stop=installPrivateImageLoader(root,fetchMedia,{events,scope:()=>scope,
    observe:callback=>({observe(){sync=callback;},disconnect(){}}),
    createURL:()=>`blob:${++serial}`,revokeURL:url=>revoked.push(url),
    schedule:callback=>{timers.push(callback);return callback;},cancel:()=>{}});
  return {root,events,images,revoked,timers,stop,sync:()=>sync(),setScope:value=>{scope=value;}};
}

test('private images share pending reads, skip closed sections, and revoke removed URLs',async()=>{
  let calls=0,finish;
  const h=fixture(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
  const a=image(),b=image(),hidden=image('hidden');hidden.hidden=true;
  h.images.push(a,b,hidden);h.sync();h.sync();await tick();assert.equal(calls,1);
  finish(new Response(new Blob(['photo'])));await tick();await tick();
  assert.ok(a.src);assert.ok(b.src);assert.notEqual(a.src,b.src);assert.equal(hidden.src,undefined);
  const old=a.src;h.images.splice(0,1);h.sync();assert.ok(h.revoked.includes(old));
  hidden.hidden=false;h.root.dispatchEvent(new Event('toggle'));await tick();assert.equal(calls,2);h.stop();
});

test('old account responses cannot populate a new account image',async()=>{
  const pending=[];const h=fixture(()=>new Promise(resolve=>pending.push(resolve))),a=image();
  h.images.push(a);h.sync();await tick();h.setScope('user-b');h.sync();await tick();assert.equal(pending.length,2);
  pending[0](new Response(new Blob(['private-a'])));await tick();await tick();assert.equal(a.src,undefined);
  pending[1](new Response(new Blob(['private-b'])));await tick();await tick();assert.ok(a.src);h.stop();
});

test('changing account without a DOM update rejects the previous delayed response',async()=>{
  let finish;const h=fixture(()=>new Promise(resolve=>{finish=resolve;})),a=image();h.images.push(a);h.sync();await tick();
  h.setScope('user-b');finish(new Response(new Blob(['old-account'])));await tick();await tick();assert.equal(a.src,undefined);h.stop();
});

test('transient retry is bounded and a stopped timer cannot restart reads',async()=>{
  let calls=0;const h=fixture(async()=>{calls++;throw Error('network');}),a=image();h.images.push(a);h.sync();await tick();await tick();
  assert.equal(calls,1);h.timers.shift()();await tick();await tick();assert.equal(calls,2);
  h.timers.shift()();await tick();await tick();assert.equal(calls,3);assert.equal(h.timers.length,0);
  h.events.dispatchEvent(new Event('online'));await tick();await tick();assert.equal(calls,4);
  const retry=h.timers.shift();h.stop();retry();await tick();assert.equal(calls,4);
});

test('network failures retry and stopped loaders never display delayed data',async()=>{
  let calls=0;const h=fixture(async()=>{calls++;if(calls===1)throw Error('offline');return new Response(new Blob(['photo']));});
  const a=image();h.images.push(a);h.sync();await tick();await tick();assert.match(a.alt,/불러오지/);
  h.events.dispatchEvent(new Event('online'));await tick();await tick();assert.ok(a.src);assert.equal(a.alt,'작업 전');
  h.stop();assert.ok(h.revoked.includes(a.src));
  let finish;const slow=fixture(()=>new Promise(resolve=>{finish=resolve;})),b=image();slow.images.push(b);slow.sync();await tick();slow.stop();
  finish(new Response(new Blob(['private'])));await tick();await tick();assert.equal(b.src,undefined);
});

test('portal fetches send cookies and an account guard without storing credentials in localStorage',async t=>{
  const previous={document:globalThis.document,location:globalThis.location,sessionStorage:globalThis.sessionStorage};
  const values=new Map([['bonyeon-portal-session','legacy-token']]);
  globalThis.document={querySelector:()=>({content:'https://test.workers.dev'})};
  globalThis.location={pathname:'/control-app/'};
  globalThis.sessionStorage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  t.after(()=>Object.assign(globalThis,previous));
  const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return new Response('{}');});
  const api=await import('../../public/control-app/portal-api.js?persistent-test');
  api.setPortalAccount('user-a');await api.portalFetch('./api/work/captures');
  assert.equal(calls[0].options.credentials,'include');assert.equal(calls[0].options.headers.get('X-Bonyeon-Account'),'user-a');
  await api.portalFetch('./api/auth/login',{method:'POST'});assert.equal(calls[1].options.headers.has('X-Bonyeon-Account'),false);
  api.storePortalSession(null);assert.equal(api.portalSignedOut(),true);api.storePortalSession('new-token');assert.equal(api.portalSignedOut(),false);
});
