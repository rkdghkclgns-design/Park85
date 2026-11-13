const tables=new Set(['work_sites','work_plans','work_plan_cycles','site_reporting','client_mail_recipients',
  'field_reports','charger_evidence','work_zones','work_camera_photos','work_progress','work_report_drafts',
  'work_guidance_receipts','settlement_payments','settlement_snapshots','operations_events','office_mail_signals']);

// SQL is application-owned. Scope source tables, retaining mutation targets and literals.
// Database guards independently prevent modifications to archived records.
export function operationalSql(sql) {
  let previous='',beforePrevious='';
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|\b[A-Za-z_][A-Za-z_0-9]*\b/g,(token,offset)=>{
    if(token.startsWith("'")||token.startsWith('--')||token.startsWith('/*'))return token;
    const quoted=token.startsWith('"'),word=(quoted?token.slice(1,-1):token).toLowerCase();
    const source=(previous==='from'||previous==='join')&&!(previous==='from'&&beforePrevious==='delete');
    const next=sql.slice(offset+token.length).replace(/^(?:\s|--[^\n]*|\/\*[\s\S]*?\*\/)+/,'');
    const nextWord=/^(?:"[^"]+"|[A-Za-z_][A-Za-z_0-9]*)/.exec(next)?.[0];
    const explicitAlias=nextWord&&!/^(?:where|join|left|right|inner|outer|cross|full|natural|on|group|order|limit|offset|having|returning|union|except|intersect|window|indexed|not|set|values)$/i.test(nextWord);
    const result=source&&tables.has(word)?(quoted?'"operational_'+word+'"':'operational_'+word)+(explicitAlias?'':' AS '+token):token;
    beforePrevious=previous;previous=word;return result;
  });
}

export function operationalEnvironment(env) {
  if(!env.DB||env.BONYEON_VERIFICATION_MODE||env.BONYEON_ALL_DATA_DB)return env;
  return {...env,BONYEON_ALL_DATA_DB:env.DB,DB:{prepare:sql=>env.DB.prepare(operationalSql(sql))}};
}

export async function archivedDetailDb(env,kind,id) {
  const db=env.BONYEON_ALL_DATA_DB;
  if(!db||!['site','report'].includes(kind))return null;
  const site=kind==='site'?id:(await db.prepare('SELECT site_id FROM field_reports WHERE id=?').bind(id).first())?.site_id;
  return site&&await db.prepare('SELECT 1 FROM production_test_sites WHERE site_id=?').bind(site).first()?db:null;
}

export async function readTestArchive(db) {
  const {results:sites}=await db.prepare(`SELECT w.id,w.name,w.address,a.reason,a.archived_at AS archivedAt,
    (SELECT COUNT(*) FROM field_reports r WHERE r.site_id=w.id) AS reportCount,
    (SELECT COUNT(*) FROM work_camera_photos p WHERE p.site_id=w.id) AS photoCount
    FROM production_test_sites a JOIN work_sites w ON w.id=a.site_id ORDER BY w.name,w.id`).all();
  const {results:reports}=await db.prepare(`SELECT r.id,r.site_id AS siteId,r.site_name AS siteName,r.work_date AS workDate,r.units,r.status
    FROM field_reports r JOIN production_test_sites a ON a.site_id=r.site_id ORDER BY r.work_date DESC,r.site_name`).all();
  return {sites,reports,readOnly:true};
}

export async function archivedPhotoDb(env,id,account) {
  if(!env.BONYEON_ALL_DATA_DB||!['owner','admin'].includes(account.role))return null;
  const db=env.BONYEON_ALL_DATA_DB;
  return await db.prepare(`SELECT 1 FROM work_camera_photos p JOIN production_test_sites a ON a.site_id=p.site_id WHERE p.id=?`).bind(id).first()?db:null;
}

export async function archivedEvidenceDb(env,id,account) {
  if(!env.BONYEON_ALL_DATA_DB||!['owner','admin'].includes(account.role))return null;
  const db=env.BONYEON_ALL_DATA_DB;
  return await db.prepare('SELECT 1 FROM charger_evidence e JOIN production_test_sites a ON a.site_id=e.site_id WHERE e.id=?').bind(id).first()?db:null;
}
