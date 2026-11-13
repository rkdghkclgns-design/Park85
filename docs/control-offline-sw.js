const cacheName = 'bonyeon-control-shell-v5';
const files = [
  '', 'index.html', 'styles.css', 'app.js', 'portal-api.js', 'store.js', 'ui.js', 'reports.js', 'monthly.js',
  'operations.js', 'signup.js', 'form-guidance.js', 'regions.js', 'control.js', 'analytics.js', 'workflows.js',
  'camera.js', 'photo-queue.js', 'photo-sync.js', 'evidence-drafts.js', 'evidence-zone.js', 'field-guide.js', 'field-safety.js',
  'report-completion.js', 'settlement-export.js', 'public-intake.js',
  'navigation.js','control-presentation.js','report-autosave.js','work-recovery.js',
  'mail-preview.js','mail-preview-styles.js','mail-preview.css','photo-thumbnails.js','private-media.js',
  'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/xlsx.mini.min.js',
].map(file => '/control-app/'+file);
const shellPaths = new Set(files);
const recovery = () => new Response(
  '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>본연 연결 복구</title><main><h1>관제 연결을 확인해 주세요</h1><p>이 기기에 저장된 현장 사진은 연결이 복구되면 보낼 수 있습니다.</p><p><a href="/control-app/#control">본연 관제 복구 열기</a></p></main></html>',
  { headers:{ 'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store' } },
);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(files.map(path => new Request(path,{ cache:'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('bonyeon-control-shell-') && key!==cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method!=='GET' || url.origin!==self.location.origin) return;
  if (shellPaths.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      try {
        const response = await fetch(request,{ signal:AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Shell unavailable');
        event.waitUntil(cache.put(url.pathname,response.clone()).catch(() => {}));
        return response;
      } catch {
        return await cache.match(url.pathname) || Response.error();
      }
    })());
  } else if (request.mode==='navigate' && url.pathname==='/') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request,{ signal:AbortSignal.timeout(8000) });
        return response.ok ? response : recovery();
      } catch { return recovery(); }
    })());
  }
});
