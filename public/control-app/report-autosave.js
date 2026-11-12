export function createReportAutosave({ scope, storage, read, saveRemote, status = () => {}, delay = 700 }) {
  let timer;
  let chain = Promise.resolve();
  let generation = 0;
  let paused = false;
  let lastSaved = '';
  const key = record => scope + ':' + JSON.stringify([record.siteId,record.workDate,record.assignment || '']);
  const latestKey = scope + ':latest';
  function readStored(id) {
    try { return JSON.parse(storage.getItem(id) || 'null'); } catch { return null; }
  }
  function resume() {
    const latest = readStored(latestKey);
    return latest?.siteId && latest?.workDate ? readStored(key(latest)) : null;
  }
  function restore(siteId,workDate,assignment='') {
    const saved = readStored(key({siteId,workDate,assignment}));
    return saved?.siteId===siteId && saved?.workDate===workDate && (saved.assignment || '')===assignment ? saved : null;
  }
  function saveLocal() {
    if (paused) return null;
    const record = read();
    if (!record?.siteId || !/^\d{4}-\d{2}-\d{2}$/.test(record.workDate || '')) return null;
    const saved = { ...record,savedAt:new Date().toISOString() };
    try {
      storage.setItem(key(saved),JSON.stringify(saved));
      storage.setItem(latestKey,JSON.stringify({siteId:saved.siteId,workDate:saved.workDate,assignment:saved.assignment || ''}));
      status('자동 임시저장됨 · 이 기기에 보관 중');
      return saved;
    } catch { status('자동 임시저장 공간을 확인해 주세요. 화면을 닫기 전에 수동 임시저장을 이용해 주세요.',true); return null; }
  }
  function flushRemote() {
    clearTimeout(timer);
    const record = saveLocal();
    if (!record) return chain;
    const token = generation;
    const encoded = JSON.stringify([record.siteId,record.workDate,record.assignment || '',record.payload]);
    if (lastSaved===encoded) return chain;
    chain = chain.catch(()=>{}).then(async()=>{
      if (token!==generation || lastSaved===encoded) return;
      try {
        await saveRemote(record.payload);
        if (token===generation) { lastSaved=encoded; status('자동 임시저장됨 · 서버 동기화 완료'); }
      } catch (error) {
        if (token===generation) status(error?.status>=400 && error?.status<500
          ? '이 기기에 임시저장했습니다. '+error.message : '자동 임시저장됨 · 연결되면 서버에 이어서 저장합니다.',Boolean(error?.status>=400 && error?.status<500));
      }
    });
    return chain;
  }
  function changed() {
    if (!saveLocal()) return;
    clearTimeout(timer);
    timer=setTimeout(()=>void flushRemote(),delay);
  }
  async function pause() {
    await flushRemote();
    paused=true;
    clearTimeout(timer);
    await chain;
  }
  function clear(record) {
    generation++;
    clearTimeout(timer);
    if (record) {
      try {
        storage.removeItem(key(record));
        const latest=readStored(latestKey);
        if (latest && key(latest)===key(record)) storage.removeItem(latestKey);
      } catch {}
    }
    paused=false;
    lastSaved='';
    status('');
  }
  function stop() { saveLocal();clearTimeout(timer);generation++; }
  return { changed,saveLocal,flushRemote,pause,clear,resume,restore,stop,unpause(){paused=false;} };
}
