import worker from './independent-worker.mjs';

export function usesReportRuntime(url) {
  return url.pathname.startsWith('/api/control/gmail/')
    || /^\/api\/control\/mail(?:\/|$)/.test(url.pathname)
    || (url.pathname === '/api/control/detail' && url.searchParams.get('kind') === 'mail');
}

export async function forwardReportRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const frontend = origin === env.BONYEON_FRONTEND_ORIGIN;
  const gmail = url.pathname.startsWith('/api/control/gmail/') && origin === url.origin;
  if (!frontend && !gmail) return worker.fetch(request, env);
  try {
    if (!env.REPORT_RUNTIME) throw new Error('Report runtime is not configured.');
    return await env.REPORT_RUNTIME.get(env.REPORT_RUNTIME.idFromName('bonyeon-report-runtime-v1')).fetch(request);
  } catch {
    return Response.json({ error: '보고서 처리가 잠시 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        ...(frontend ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}) },
    });
  }
}

// The same handler performs all original Origin/session/role checks. This class
// has no public route and is reachable only through the private namespace.
export class ReportRuntime {
  constructor(_state, env) { this.env = env; }
  fetch(request) { return worker.fetch(request, this.env); }
}
