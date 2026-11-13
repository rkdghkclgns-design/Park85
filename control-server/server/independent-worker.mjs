import { handleApi } from './api.mjs';
import { handleControl, queueVerificationCompletion } from './control.mjs';
import { handleWorkflows } from './workflows.mjs';
import { handleVerification } from './verification.mjs';
import { d1MediaStore } from './d1-media.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const verification = /^\/verification\/(?:worker\/)?api\//.test(url.pathname);
    if (!verification && !url.pathname.startsWith('/api/')) return new Response('Not found',{status:404});
    const origin = request.headers.get('Origin');
    const frontend = origin === env.BONYEON_FRONTEND_ORIGIN;
    const gmail = url.pathname.startsWith('/api/control/gmail/') && origin === url.origin;
    if (!frontend && !gmail) return new Response('Forbidden',{status:403});
    const cors = {
      'Access-Control-Allow-Origin':env.BONYEON_FRONTEND_ORIGIN,
      'Access-Control-Allow-Credentials':'true',
      'Access-Control-Allow-Methods':'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type, X-Bonyeon-Session, X-Bonyeon-Account, X-Bonyeon-Work-Mode, X-Bonyeon-Verification',
      'Access-Control-Expose-Headers':'Content-Disposition',
      'Access-Control-Max-Age':'600',
      'Vary':'Origin',
    };
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    const settings = { ...env,BONYEON_SITE_ORIGIN:env.BONYEON_FRONTEND_ORIGIN, BUCKET:d1MediaStore(env.MEDIA_DB) };
    const runApi = (target, options) => handleApi(target,options,handleControl,handleWorkflows);
    const response = verification
      ? await handleVerification(request,settings,() => new Response('Not found',{status:404}),runApi,queueVerificationCompletion)
      : await runApi(request,settings);
    if (!frontend) return response;
    const headers = new Headers(response.headers);
    for (const [name,value] of Object.entries(cors)) headers.set(name,value);
    return new Response(response.body,{status:response.status,headers});
  },
};
