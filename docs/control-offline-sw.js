const cacheName = 'bonyeon-control-shell-v10';
const files = [
  '', 'index.html', 'styles.css', 'app.js', 'portal-api.js', 'store.js', 'ui.js', 'reports.js', 'monthly.js',
  'operations.js', 'signup.js', 'form-guidance.js', 'regions.js', 'control.js', 'analytics.js', 'workflows.js',
  'camera.js', 'photo-queue.js', 'photo-sync.js', 'evidence-drafts.js', 'evidence-zone.js', 'field-guide.js', 'field-safety.js',
  'offline-entry.js', 'worker-floors.js', 'report-completion.js', 'settlement-export.js', 'public-intake.js',
  'navigation.js','control-presentation.js','report-autosave.js','work-recovery.js',
  'mail-preview.js','mail-preview-styles.js','mail-preview.css','photo-thumbnails.js','private-media.js','test-data.js','settlement-reconciliation.js',
  'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/xlsx.mini.min.js',
].map(file => '/control-app/'+file);
const shellPaths = new Set(files);
async function recovery() {
  const cache=await caches.open(cacheName);
  const shell=await cache.match('/control-app/index.html');
  if (!shell) return new Response(null,{status:302,headers:{Location:'/control-app/#control','Cache-Control':'no-store'}});
  const html=(await shell.text())
    .replaceAll(/(href|src)="\.\//g,'$1="/control-app/')
    .replace('<script type="module" src="/control-app/app.js">','<script src="/control-app/offline-entry.js"></script>\n  <script type="module" src="/control-app/app.js">');
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

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
      if (self.navigator?.onLine===false) return recovery();
      try {
        // The HTTP cache may return an old React shell while its hashed JS is
        // unavailable offline. Only a live homepage can replace the cached app.
        const response = await fetch(request,{ cache:'no-store',signal:AbortSignal.timeout(8000) });
        return response.ok ? response : recovery();
      } catch { return recovery(); }
    })());
  }
});
