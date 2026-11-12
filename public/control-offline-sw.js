const cacheName = 'bonyeon-control-shell-v1';
const files = [
  '', 'index.html', 'styles.css', 'app.js', 'portal-api.js', 'store.js', 'ui.js', 'reports.js', 'monthly.js',
  'operations.js', 'signup.js', 'form-guidance.js', 'regions.js', 'control.js', 'analytics.js', 'workflows.js',
  'camera.js', 'photo-queue.js', 'evidence-drafts.js', 'evidence-zone.js', 'field-guide.js', 'field-safety.js',
  'report-completion.js', 'settlement-export.js', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/xlsx.mini.min.js',
].map(file => '/control-app/'+file);
const shellPaths = new Set(files);

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
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(cacheName);
      return await cache.match(url.pathname) || Response.error();
    }));
  } else if (request.mode==='navigate' && url.pathname==='/') {
    event.respondWith(fetch(request).catch(() => new Response(
      '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>본연 오프라인</title><main><h1>인터넷 연결이 끊겼습니다</h1><p>이 기기에 저장된 현장 사진은 연결이 복구되면 보낼 수 있습니다.</p><p><a href="/control-app/#control">본연 관제 복구 열기</a></p></main></html>',
      { headers:{ 'Content-Type':'text/html; charset=utf-8' } },
    )));
  }
});
