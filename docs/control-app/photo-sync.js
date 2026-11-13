import { readPhotoQueue, writeQueuedPhoto, removeQueuedPhoto } from './photo-queue.js';

let active;

export function createPhotoSync({ owner,api,read=readPhotoQueue,write=writeQueuedPhoto,remove=removeQueuedPhoto,
  online=()=>navigator.onLine,events=globalThis.window,visibility=globalThis.document,
  isVisible=()=>!document.hidden,interval=20000 }) {
  const lifetime=new AbortController();
  const listeners=new Set();
  let state={pending:[],transmitting:'',syncing:false,confirmed:0,error:''};
  let running;
  let readVersion=0;
  const snapshot=()=>({...state,pending:[...state.pending]});
  function emit(event) {
    if(lifetime.signal.aborted)return;
    for(const listener of listeners){try{listener(snapshot(),event);}catch{console.warn('사진 전송 상태 표시를 갱신하지 못했습니다.');}}
  }
  async function refresh() {
    const version=++readVersion;
    const pending=await read(owner);
    if(lifetime.signal.aborted || version!==readVersion)return;
    state={...state,pending:pending.filter(photo=>photo.owner===owner).sort((a,b)=>a.time-b.time || a.id.localeCompare(b.id)),error:''};
    emit();
  }
  async function run(retry) {
    state={...state,syncing:true};emit();
    try {
      await refresh();
      for(const photo of state.pending) {
        if(!online() || lifetime.signal.aborted)break;
        if(photo.error && !retry)continue;
        state={...state,transmitting:photo.id};emit();
        const body=new FormData();
        for(const[key,value]of Object.entries({...photo.fields,slot:photo.slot,uploadId:photo.id}))body.set(key,value);
        body.set('photo',photo.blob,'촬영.jpg');
        const upload=new AbortController();
        const abort=()=>upload.abort();
        const timeout=setTimeout(abort,15000);
        lifetime.signal.addEventListener('abort',abort,{once:true});
        try {
          const saved=await api('work/captures',{method:'POST',body,signal:upload.signal});
          if(lifetime.signal.aborted)break;
          if(typeof saved.id!=='string' || !saved.id)throw new Error('사진 저장 응답을 확인하지 못했습니다.');
          await remove(photo.id);
          state={...state,confirmed:state.confirmed+1};
          emit({type:'uploaded',photo,saved});
        } catch(error) {
          if(lifetime.signal.aborted)break;
          if(![400,403,404,409,413,507].includes(error.status))break;
          await write({...photo,error:error.message});
        } finally {
          clearTimeout(timeout);lifetime.signal.removeEventListener('abort',abort);
          state={...state,transmitting:''};
          await refresh();
        }
      }
    } catch {
      state={...state,error:'이 기기에 보관한 사진을 확인하지 못했습니다. 저장 공간과 로그인 상태를 확인해 주세요.'};
    } finally {
      state={...state,syncing:false,transmitting:''};emit();
    }
  }
  function sync({retry=false}={}) {
    if(lifetime.signal.aborted || !online())return Promise.resolve();
    if(!running)running=run(retry).finally(()=>{running=undefined;});
    return running;
  }
  events?.addEventListener('online',()=>void sync(),{signal:lifetime.signal});
  events?.addEventListener('offline',()=>emit(),{signal:lifetime.signal});
  visibility?.addEventListener('visibilitychange',()=>{if(isVisible())void sync();},{signal:lifetime.signal});
  const timer=setInterval(()=>void sync(),interval);timer.unref?.();
  void refresh().then(()=>sync()).catch(()=>{state={...state,error:'사진 대기열을 확인하지 못했습니다.'};emit();});
  return {owner,snapshot,refresh,sync,
    subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener);},
    stop(){lifetime.abort();clearInterval(timer);listeners.clear();},
  };
}

export function startPhotoSync(options) {
  if(active?.owner===options.owner)return active;
  active?.stop();
  active=createPhotoSync(options);
  return active;
}

export function stopPhotoSync() {active?.stop();active=undefined;}
