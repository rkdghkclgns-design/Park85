import assert from 'node:assert/strict';
import test from 'node:test';
import { createPhotoSync } from '../../public/control-app/photo-sync.js';

function fixture({ api }={}) {
  let online=false;
  const events=new EventTarget(),visibility=new EventTarget();
  const records=new Map([['photo',{id:'photo',owner:'user-a',fields:{siteId:'site',workDate:'2025-01-02',assetCode:'ONE',zoneId:''},slot:'exteriorBefore',blob:new Blob(['photo']),time:1}],
    ['other',{id:'other',owner:'user-b',fields:{},blob:new Blob(['private']),time:2}]]);
  const uploaded=[];
  const sync=createPhotoSync({owner:'user-a',api:api || (async(path,options)=>{uploaded.push(options.body.get('uploadId'));return{id:'saved',slot:'exteriorBefore'};}),
    online:()=>online,events,visibility,isVisible:()=>true,interval:60000,
    read:async owner=>[...records.values()].filter(row=>row.owner===owner),write:async row=>records.set(row.id,row),remove:async id=>records.delete(id)});
  return {sync,records,events,uploaded,setOnline(value){online=value;}};
}

test('the user-scoped queue continues across screen subscription changes and on reconnect',async()=>{
  const h=fixture();await h.sync.refresh();
  let cameraUpdates=0;const leaveCamera=h.sync.subscribe(()=>cameraUpdates++);leaveCamera();const oldUpdates=cameraUpdates;
  h.setOnline(true);h.events.dispatchEvent(new Event('online'));await h.sync.sync();
  assert.deepEqual(h.uploaded,['photo']);assert.equal(h.records.has('photo'),false);assert.equal(h.records.has('other'),true);
  assert.equal(cameraUpdates,oldUpdates);h.sync.stop();
});

test('concurrent requests share one upload and permanent errors remain stored until explicit retry',async()=>{
  let attempts=0;const h=fixture({api:async()=>{if(++attempts===1)throw Object.assign(Error('구역 확인'),{status:409});return{id:'saved'};}});
  await h.sync.refresh();h.setOnline(true);await Promise.all([h.sync.sync(),h.sync.sync()]);
  assert.equal(attempts,1);assert.equal(h.records.get('photo').error,'구역 확인');
  await h.sync.sync();assert.equal(attempts,1);await h.sync.sync({retry:true});assert.equal(attempts,2);assert.equal(h.records.has('photo'),false);h.sync.stop();
});

test('logout stops in-flight transport without deleting the stored original',async()=>{
  let finish;const h=fixture({api:()=>new Promise(resolve=>{finish=resolve;})});await h.sync.refresh();h.setOnline(true);
  const pending=h.sync.sync();while(!finish)await new Promise(resolve=>setTimeout(resolve,0));h.sync.stop();finish({id:'saved'});await pending;
  assert.equal(h.records.has('photo'),true);h.events.dispatchEvent(new Event('online'));assert.equal(h.records.has('photo'),true);
});
