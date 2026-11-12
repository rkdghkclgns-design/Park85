import { esc } from './ui.js';

const portalApiOrigin = document.querySelector('meta[name="bonyeon-api-origin"]')?.content || '';
const portalSessionKey = 'bonyeon-portal-session';
export const independentPortal = Boolean(portalApiOrigin);

export function portalFetch(path, options = {}) {
  if (!independentPortal) return fetch(path, options);
  const url = new URL(path.replace(/^\.\//, '/'),portalApiOrigin);
  const headers = new Headers(options.headers);
  const token = sessionStorage.getItem(portalSessionKey);
  if (token) headers.set('X-Bonyeon-Session',token);
  return fetch(url,{ ...options,headers,credentials:'omit',redirect:'error' });
}

export function storePortalSession(token) {
  if (!independentPortal) return;
  if (token) sessionStorage.setItem(portalSessionKey,token);
  else sessionStorage.removeItem(portalSessionKey);
}

export function privateImage(path) {
  return `${independentPortal ? 'data-private-image' : 'src'}="${esc(path)}"`;
}

export function installPrivateMedia(root, notify) {
  if (!independentPortal) return;
  const urls = new Map();
  const seen = new WeakSet();
  const sync = () => {
    for (const [image,url] of urls) {
      if (!root.contains(image)) {
        URL.revokeObjectURL(url);
        urls.delete(image);
      }
    }
    for (const image of root.querySelectorAll('img[data-private-image]')) {
      if (seen.has(image)) continue;
      seen.add(image);
      portalFetch(image.dataset.privateImage,{cache:'no-store'}).then(response => {
        if (!response.ok) throw new Error();
        return response.blob();
      }).then(blob => {
        if (!root.contains(image)) return;
        const url = URL.createObjectURL(blob);
        urls.set(image,url);
        image.src = url;
      }).catch(() => { image.alt += ' · 사진을 불러오지 못했습니다'; });
    }
  };
  new MutationObserver(sync).observe(root,{childList:true,subtree:true});
  root.addEventListener('click',async event => {
    const link = event.target.closest('a[href^="./api/"]');
    if (!link || event.defaultPrevented) return;
    event.preventDefault();
    const popup = link.target==='_blank' ? window.open('about:blank','_blank') : null;
    if (popup) popup.opener=null;
    try {
      const response = await portalFetch(link.getAttribute('href'),{cache:'no-store'});
      if (!response.ok) throw new Error();
      const blob = URL.createObjectURL(await response.blob());
      if (popup) popup.location.replace(blob);
      else {
        const download = document.createElement('a');
        download.href=blob;
        download.download=/filename="([a-zA-Z0-9._-]+)"/.exec(response.headers.get('Content-Disposition') || '')?.[1] || '본연-첨부파일.jpg';
        download.click();
      }
      setTimeout(()=>URL.revokeObjectURL(blob),60_000);
    } catch {
      popup?.close();
      notify('첨부 파일을 열 수 없습니다. 로그인 상태와 인터넷 연결을 확인해 주세요.');
    }
  });
}
