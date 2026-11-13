export function installPrivateImageLoader(root,fetchMedia,{
  scope=()=>'',events=window,observe=callback=>new MutationObserver(callback),
  createURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url),
  schedule=setTimeout,cancel=clearTimeout,
}={}) {
  const urls=new Map(),states=new WeakMap(),inflight=new Map(),timers=new Set();
  let stopped=false;
  const images=()=>root.querySelectorAll('img[data-private-image]');
  const release=image=>{if(urls.has(image)){revokeURL(urls.get(image));urls.delete(image);}};
  function sync() {
    if(stopped)return;
    for(const image of urls.keys())if(!root.contains(image))release(image);
    for(const image of images()) {
      if(image.closest('[hidden], details:not([open])'))continue;
      const owner=scope(),path=image.dataset.privateImage,key=JSON.stringify([owner,path]),previous=states.get(image);
      if(previous?.key===key && previous.status!=='retry')continue;
      if(previous){release(image);image.removeAttribute('src');}
      const state={key,alt:previous?.alt || image.alt,attempts:previous?.key===key ? previous.attempts : 0,status:'pending'};
      states.set(image,state);
      let request=inflight.get(key);
      if(!request) {
        request=Promise.resolve().then(()=>{if(stopped || scope()!==owner)throw Error('stopped');return fetchMedia(path,{cache:'no-store'});}).then(response=>{
          if(!response.ok)throw Object.assign(Error('private media'),{status:response.status});
          return response.blob();
        }).finally(()=>{if(inflight.get(key)===request)inflight.delete(key);});
        inflight.set(key,request);
      }
      request.then(blob=>{
        if(stopped || scope()!==owner || !root.contains(image) || states.get(image)!==state)return;
        release(image);const url=createURL(blob);urls.set(image,url);image.src=url;image.alt=state.alt;state.status='loaded';
      }).catch(error=>{
        if(stopped || scope()!==owner || !root.contains(image) || states.get(image)!==state)return;
        state.status='failed';state.attempts++;image.alt=state.alt+' · 사진을 불러오지 못했습니다';
        if([401,403,404].includes(error.status) || state.attempts>=3)return;
        const timer=schedule(()=>{
          timers.delete(timer);
          if(stopped || scope()!==owner || !root.contains(image) || states.get(image)!==state)return;
          state.status='retry';sync();
        },2000*state.attempts);
        timers.add(timer);
      });
    }
  }
  function retry() {
    for(const image of images()) {
      const state=states.get(image);
      if(state?.status==='failed'){state.status='retry';state.attempts=0;}
    }
    sync();
  }
  const observer=observe(sync);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
  events.addEventListener('online',retry);root.addEventListener('toggle',sync,true);sync();
  return ()=>{
    stopped=true;observer.disconnect();events.removeEventListener('online',retry);root.removeEventListener('toggle',sync,true);
    for(const timer of timers)cancel(timer);timers.clear();for(const image of urls.keys())release(image);
  };
}
