import { portalFetch } from './portal-api.js';

let challengeScript;
function loadChallengeScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  challengeScript ??= new Promise((resolve,reject) => {
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=()=>window.turnstile ? resolve(window.turnstile) : reject(new Error('보안 확인을 불러오지 못했습니다.'));
    script.onerror=()=>{ script.remove(); challengeScript=undefined; reject(new Error('보안 확인에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')); };
    document.head.append(script);
  });
  return challengeScript;
}

export async function mountIntakeChallenge(container, action, signal, button) {
  container.tabIndex=-1;
  container.innerHTML='<p class="small" role="status">보안 확인을 준비하고 있습니다.</p><div data-intake-widget></div>';
  const status=container.querySelector('[role="status"]');
  if (button) button.disabled=true;
  const response=await portalFetch('./api/public-intake/settings',{ signal,cache:'no-store' });
  const settings=await response.json();
  if (!response.ok || !settings.configured || !settings.siteKey) throw new Error('보안 확인에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  const service=await loadChallengeScript();
  if (signal.aborted) throw new DOMException('Aborted','AbortError');
  let token='';
  const update=(value,message)=>{
    token=value;
    status.textContent=message;
    if (button) button.disabled=!token;
  };
  const widget=service.render(container.querySelector('[data-intake-widget]'),{
    sitekey:settings.siteKey,action,size:window.matchMedia('(max-width: 360px)').matches ? 'compact' : 'normal',
    callback:value=>update(value,'보안 확인을 마쳤습니다.'),
    'expired-callback':()=>update('','보안 확인이 만료됐습니다. 다시 확인해 주세요.'),
    'error-callback':()=>update('','보안 확인을 완료하지 못했습니다. 연결을 확인해 주세요.'),
  });
  signal.addEventListener('abort',()=>service.remove(widget),{ once:true });
  return {
    readToken() {
      if (!token) { container.focus(); throw new Error('보안 확인을 먼저 완료해 주세요.'); }
      return token;
    },
    reset() { update('','보안 확인을 다시 진행하고 있습니다.'); service.reset(widget); },
  };
}
