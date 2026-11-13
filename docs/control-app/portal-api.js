import { esc } from './ui.js';
import { installPrivateImageLoader } from './private-media.js';

const portalApiOrigin = document.querySelector('meta[name="bonyeon-api-origin"]')?.content || '';
const portalSessionKey = 'bonyeon-portal-session';
const portalVerificationKey = 'bonyeon-portal-verification';
const signedOutKey = 'bonyeon-portal-signed-out';
let portalAccount='';
export const independentPortal = Boolean(portalApiOrigin);
export const portalSignedOut=()=>independentPortal && sessionStorage.getItem(signedOutKey)==='1';
export function setPortalAccount(id) { portalAccount=typeof id==='string' ? id : ''; }

export function portalFetch(path, options = {}) {
  if (!independentPortal) return fetch(path, options);
  const verification = location.pathname.startsWith('/verification/worker/') ? '/verification/worker/'
    : location.pathname.startsWith('/verification/') ? '/verification/' : '/';
  const base = path.startsWith('./api/auth/') ? '/' : verification;
  const url = new URL(path,new URL(base,portalApiOrigin));
  const headers = new Headers(options.headers);
  const token = sessionStorage.getItem(portalSessionKey);
  if (token) headers.set('X-Bonyeon-Session',token);
  if (portalAccount && !path.startsWith('./api/auth/login')) headers.set('X-Bonyeon-Account',portalAccount);
  const verificationToken = sessionStorage.getItem(portalVerificationKey);
  if (base==='/verification/worker/' && verificationToken) headers.set('X-Bonyeon-Verification',verificationToken);
  return fetch(url,{ ...options,headers,credentials:'include',redirect:'error' });
}

export function storePortalSession(token) {
  if (!independentPortal) return;
  if (token) { sessionStorage.setItem(portalSessionKey,token);sessionStorage.removeItem(signedOutKey); }
  else { sessionStorage.removeItem(portalSessionKey);sessionStorage.setItem(signedOutKey,'1');setPortalAccount(null); }
}

export function storePortalVerification(token) {
  if (!independentPortal) return;
  if (token) sessionStorage.setItem(portalVerificationKey,token);
  else sessionStorage.removeItem(portalVerificationKey);
}

export function privateImage(path) {
  return `${independentPortal ? 'data-private-image' : 'src'}="${esc(path)}"`;
}

export function installPrivateMedia(root, notify) {
  if (!independentPortal) return;
  installPrivateImageLoader(root,portalFetch,{scope:()=>portalAccount});
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
