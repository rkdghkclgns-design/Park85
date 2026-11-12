export const reportTabs = [['home','홈','홈'],['map','지도','현장 작업 지도'],['control','관제','현장 보고·관제'],
  ['analytics','분석','운영 분석'],['regions','구역','구역별 충전기'],['days','일자별','일자별 보고'],
  ['month','월간','월간 보고'],['alerts','보완 요청','보완 요청'],['users','사용자','사용자 관리'],['about','소개','본연 소개']];

const managerRoles = new Set(['owner','admin']);
const dateRoute = /^d-(\d{4}-\d{2}-\d{2})$/;
const isReportDate = route => {
  const match=dateRoute.exec(route);
  if (!match) return false;
  const date=new Date(match[1]+'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0,10)===match[1];
};

export const isLegacyRoute = route => ['home','days','month','alerts','legacy'].includes(route) || isReportDate(route);

export function navigationItems(account,{independentPortal=false,verification=false,month}={}) {
  const row=(key,shortLabel,label,href='#'+key,icon=key)=>({key,shortLabel,label,href,icon});
  if (account.role==='cleaner') return [row('control','내 작업','내 작업'),row('map','지도','현장 작업 지도'),
    row('payments','내 지급','내 지급 내역','#control-detail/worker/'+encodeURIComponent(account.id)+'?month='+month,'month'),
    row('history','작업 이력','작업 이력','#history','days'),row('more','더보기','도움말·더보기','#more','about')];
  if (independentPortal || verification) {
    const keys=managerRoles.has(account.role) ? ['control','map','analytics','users'] : ['map','regions'];
    return [...keys.map(key=>row(...reportTabs.find(tab=>tab[0]===key))),row('more','더보기','도움말·더보기','#more','about')];
  }
  return reportTabs.filter(([key])=>!['users','analytics','control'].includes(key)
    || (key==='control' ? managerRoles.has(account.role) : managerRoles.has(account.role))).map(tab=>row(...tab));
}

export function resolveNavigationRoute(hash,account,{independentPortal=false,verification=false,mail=''}={}) {
  if (!hash && /^[a-f0-9]{64}$/.test(mail)) return 'control-detail/mail/'+mail;
  if (/^control-detail\/(site|worker|report|mail|archive)\/[^/?]+(?:\?month=\d{4}-\d{2})?$/.test(hash)) return hash;
  if (hash==='history' && account.role==='cleaner') return 'control';
  if (verification && !['control','map','regions','users','analytics','about','more'].includes(hash)) return 'control';
  if (account.role==='cleaner' && !['control','map','regions','about','more'].includes(hash)) return 'control';
  if (!hash && account.nativeLogin) return managerRoles.has(account.role) || account.role==='cleaner' ? 'control' : 'map';
  if (reportTabs.some(([route])=>route===hash) || ['more','legacy'].includes(hash) || isReportDate(hash)) return hash;
  return independentPortal ? (managerRoles.has(account.role) || account.role==='cleaner' ? 'control' : 'map') : 'home';
}

export function browserWorkspaceExport(workspace,{workspaceKey,exportedAt}={}) {
  return { format:'bonyeon-browser-workspace-v1',workspaceKey,exportedAt,
    storage:'이 브라우저에 저장된 기존 보고서와 사진',workspace:structuredClone(workspace) };
}
