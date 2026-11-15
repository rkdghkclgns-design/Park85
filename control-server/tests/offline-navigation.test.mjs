import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const workerSource=await readFile(new URL('../../public/control-offline-sw.js',import.meta.url),'utf8');
function worker({online=true,fetcher=async()=>Response.error(),cached}={}) {
  const listeners=new Map(),requests=[];
  const self={location:{origin:'https://bonyeonclean.com'},navigator:{onLine:online},
    addEventListener:(name,handler)=>listeners.set(name,handler)};
  vm.runInNewContext(workerSource,{self,URL,Response,Request,AbortSignal,Set,
    fetch:async(request,options)=>{requests.push({request,options});return fetcher(request,options);},
    caches:{open:async()=>({match:async()=>cached,put:async()=>{}})}});
  return {requests,async navigate(path='/') {
    let response;
    listeners.get('fetch')({request:{method:'GET',url:self.location.origin+path,mode:'navigate'},
      respondWith:value=>{response=value;},waitUntil:()=>{}});
    return await response;
  }};
}

test('offline homepage navigation opens the cached control app even when HTTP cache contains a stale React shell',async()=>{
  const h=worker({online:false,fetcher:async()=>new Response('<div id="root"></div><script src="/assets/old.js"></script>')});
  const response=await h.navigate();
  assert.equal(response.status,302);
  assert.equal(response.headers.get('Location'),'https://bonyeonclean.com/control-app/#control');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(h.requests.length,0,'an offline restart must not accept a cached homepage whose JS is not in the control cache');
});

test('a stale online signal still performs a network-only homepage request and recovers when it fails',async()=>{
  const h=worker({online:true,fetcher:async()=>{throw Error('physical connection unavailable');}});
  const response=await h.navigate('/?view=control');
  assert.equal(h.requests[0].options.cache,'no-store');
  assert.equal(response.status,302);
  assert.equal(response.headers.get('Location'),'https://bonyeonclean.com/control-app/#control');
});

test('a successful online homepage remains the original website, while an unavailable homepage recovers',async()=>{
  const page=new Response('<html>본연 홈페이지</html>');
  assert.equal(await (await worker({fetcher:async()=>page}).navigate()).text(),'<html>본연 홈페이지</html>');
  const response=await worker({fetcher:async()=>new Response('Unavailable',{status:503})}).navigate();
  assert.equal(response.status,302);
});

test('the redirected control document is served from the existing shell cache without altering stored work',async()=>{
  const h=worker({online:false,fetcher:async()=>{throw Error('offline');},cached:new Response('<html>cached control app</html>')});
  const response=await h.navigate('/control-app/');
  assert.equal(response.status,200);
  assert.equal(await response.text(),'<html>cached control app</html>');
});
