import assert from 'node:assert/strict';
import { createHash,randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { d1MediaStore } from '../server/d1-media.mjs';

const origin = 'https://archive.example.invalid';
const mailbox = 'central@example.invalid';
const cleaner = 'cleaner@example.invalid';
const secret = 'isolated-report-archive-test'.repeat(2);
const stamp = new Date().toISOString();
const today = new Date(Date.now()+9*3600_000).toISOString().slice(0,10);

async function harness() {
  const db = await createPreviewDb();
  let queries = 0;
  let failCommittedInsert = false;
  const counted = {
    prepare(sql) {
      const wrap = statement => ({
        bind:(...args)=>wrap(statement.bind(...args)),
        first:async(...args)=>{ queries++; return statement.first(...args); },
        all:async(...args)=>{ queries++; return statement.all(...args); },
        run:async(...args)=>{
          queries++;
          const result = await statement.run(...args);
          if (failCommittedInsert && /INSERT INTO report_mail/.test(sql) && result.meta.changes) {
            failCommittedInsert = false;
            throw Error('isolated lost database write response');
          }
          return result;
        },
      });
      return wrap(db.prepare(sql));
    },
  };
  const objects = new Map();
  let puts = 0;
  let failCommittedPut = false;
  const bucket = {
    async head(key) { queries++; return objects.has(key) ? {} : null; },
    async get(key) {
      queries++;
      const bytes = objects.get(key);
      return bytes ? { body:new Blob([bytes]).stream() } : null;
    },
    async put(key,value) {
      queries++;
      puts++;
      objects.set(key,Uint8Array.from(value));
      if (failCommittedPut) { failCommittedPut = false; throw Error('isolated lost archive write response'); }
    },
  };
  const env = { DB:counted,BUCKET:bucket,BONYEON_SITE_ORIGIN:origin,BONYEON_OWNER_EMAIL:mailbox,
    BONYEON_GMAIL_FROM:mailbox,BONYEON_REPORT_START_DATE:today,BONYEON_REPORT_RUN_SECRET:secret };
  async function call(path,method='GET',body,expected=200,email=mailbox) {
    const runner = path.startsWith('control/gmail/');
    const response = await handleApi(new Request(origin+'/api/'+path,{
      method,headers:{ Origin:origin,...(body ? {'Content-Type':'application/json'} : {}),
        ...(runner ? {Authorization:'Bearer '+secret} : {'oai-authenticated-user-id':email,'oai-authenticated-user-email':email}) },
      body:body ? JSON.stringify(body) : undefined,
    }),env,handleControl,handleWorkflows);
    const data = await response.json();
    assert.equal(response.status,expected,path+': '+JSON.stringify(data).slice(0,500));
    return data;
  }
  const runner = (action,body={},expected=200)=>call('control/gmail/'+action,'POST',body,expected);
  await runner('activate');
  await db.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,'테스트 작업자','cleaner',1,?)")
    .bind(cleaner,cleaner,stamp).run();
  await db.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('site','예시 현장','예시 주소',37,127,'done',?,?)")
    .bind(stamp,today).run();
  const seedReport = notes => db.prepare(`
    INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
      units,exterior,interior,notes,status,updated_at,completion_reported_at,contract_price,worker_price)
    VALUES ('report','site',?,?,'테스트 작업자','예시 현장','예시 주소',1,1,0,?,'submitted',?,?,20000,10000)
  `).bind(today,cleaner,notes,stamp,stamp).run();
  return { db,env,objects,runner,call,seedReport,puts:()=>puts,resetQueries:()=>{queries=0;},queryCount:()=>queries,
    loseNextPut:()=>{failCommittedPut=true;},loseNextInsert:()=>{failCommittedInsert=true;} };
}

function storedArchive(row) {
  const match = /^bonyeon-report:archive:([a-f0-9]{64}):([0-9]+):([a-f0-9]{64})$/.exec(row.body);
  assert.ok(match,'the database stores a small archive reference instead of a truncated report');
  assert.equal(row.html,'');
  return { hash:match[1],size:Number(match[2]),key:'report-archives/'+match[1] };
}

test('large high-entropy reports use verified archives, replay exactly, and require administrator downloads',async()=>{
  const h = await harness();
  const notes = randomBytes(800_000).toString('base64');
  await h.seedReport(notes);
  const requestId = crypto.randomUUID();
  h.resetQueries();
  const first = (await h.runner('claim',{requestId})).message;
  assert.ok(h.queryCount()<=50,'main and media database calls together fit the Free query allowance');
  assert.ok(first.body.includes(notes));
  const row = await h.db.prepare("SELECT * FROM report_mail WHERE kind='completion'").first();
  const archive = storedArchive(row);
  assert.ok(archive.size<12_000_000);
  assert.equal(h.puts(),1);
  assert.deepEqual((await h.runner('claim',{requestId})).message,first);
  const downloaded = await h.call('control/mail/archive?id='+archive.hash);
  assert.equal(downloaded.text,first.body);
  assert.equal(downloaded.html,first.html);
  await h.call('control/mail/archive?id='+archive.hash,'GET',undefined,403,cleaner);
  await h.call('control/mail/archive?id='+'0'.repeat(64),'GET',undefined,404);
  await h.runner('complete',{id:first.id,claim:first.claim});
  assert.ok((await h.db.prepare('SELECT sent_at FROM report_mail WHERE id=?').bind(first.id).first()).sent_at);
});

test('uncertain archive and database commits recover without extra messages or duplicate archive writes',async()=>{
  const h = await harness();
  await h.seedReport(randomBytes(800_000).toString('base64'));
  const requestId = crypto.randomUUID();
  h.loseNextPut();
  await h.runner('claim',{requestId},500);
  assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM report_mail').first()).count,0);
  assert.equal(h.objects.size,1);
  h.loseNextInsert();
  await h.runner('claim',{requestId},500);
  const recovered = (await h.runner('claim',{requestId})).message;
  assert.ok(recovered);
  assert.equal(h.puts(),1);
  assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM report_mail').first()).count,1);
  await h.runner('complete',{id:recovered.id,claim:recovered.claim});
  assert.equal((await h.runner('claim',{requestId})).message,null);
});

test('missing or corrupt archives cannot replay, download, or be acknowledged as sent',async()=>{
  const h = await harness();
  await h.seedReport(randomBytes(800_000).toString('base64'));
  const requestId = crypto.randomUUID();
  const first = (await h.runner('claim',{requestId})).message;
  const archive = storedArchive(await h.db.prepare('SELECT body,html FROM report_mail WHERE id=?').bind(first.id).first());
  const bytes = h.objects.get(archive.key);
  for (const invalid of [null,Uint8Array.of(1,2,3)]) {
    if (invalid) h.objects.set(archive.key,invalid); else h.objects.delete(archive.key);
    await h.runner('claim',{requestId},500);
    await h.runner('complete',{id:first.id,claim:first.claim},500);
    await h.call('control/mail/archive?id='+archive.hash,'GET',undefined,500);
    assert.equal((await h.db.prepare('SELECT sent_at FROM report_mail WHERE id=?').bind(first.id).first()).sent_at,null);
  }
  h.objects.set(archive.key,bytes);
  assert.deepEqual((await h.runner('claim',{requestId})).message,first);
  await h.runner('complete',{id:first.id,claim:first.claim});
});

test('reports over 12 MB always archive the complete files and send a small authenticated portal link',async()=>{
  const h = await harness();
  const notes = '대용량 상세 보고 '.repeat(250_000);
  await h.seedReport(notes);
  const requestId = crypto.randomUUID();
  h.resetQueries();
  const first = (await h.runner('claim',{requestId})).message;
  assert.ok(h.queryCount()<=50);
  const archive = storedArchive(await h.db.prepare('SELECT body,html FROM report_mail WHERE id=?').bind(first.id).first());
  assert.ok(archive.size>12_000_000 && archive.size<=24_000_000);
  assert.ok(first.body.length<2000 && first.html.length<3000);
  assert.match(first.body,new RegExp('control-detail/archive/'+archive.hash));
  const downloaded = await h.call('control/mail/archive?id='+archive.hash);
  assert.ok(downloaded.text.includes(notes));
  assert.ok(downloaded.html.includes(notes));
  assert.deepEqual((await h.runner('claim',{requestId})).message,first);
  await h.runner('complete',{id:first.id,claim:first.claim});
});

test('reports over the physical safety limit remain visibly held while other recipients can progress',async()=>{
  const h = await harness();
  await h.seedReport('가'.repeat(4_100_000));
  assert.equal((await h.runner('claim',{requestId:crypto.randomUUID()})).message,null);
  const row = await h.db.prepare("SELECT * FROM report_mail WHERE kind='completion'").first();
  assert.ok(row.hold_at);
  assert.equal(row.claim_request_id,null);
  assert.match(row.body,/저장 한도/);
  assert.equal(h.objects.size,0);
  await h.db.prepare(`INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,requested_by)
    VALUES ('gmail:consultation:test','consultation','test',?,?,'예시 상담','예시 내용','',?,'public-consultation')`)
    .bind(mailbox,mailbox,stamp).run();
  const next = (await h.runner('claim',{requestId:crypto.randomUUID()})).message;
  assert.equal(next.id,'gmail:consultation:test');
});

test('existing inline gzip reports keep replaying without an archive store',async()=>{
  const h = await harness();
  const notes = '기존 압축 보고 내용 '.repeat(50_000);
  await h.seedReport(notes);
  const requestId = crypto.randomUUID();
  const first = (await h.runner('claim',{requestId})).message;
  const row = await h.db.prepare('SELECT body,html FROM report_mail WHERE id=?').bind(first.id).first();
  assert.match(row.body,/^bonyeon-report:gzip:/);
  assert.equal(h.objects.size,0);
  delete h.env.BUCKET;
  assert.ok(first.body.includes(notes));
  assert.deepEqual((await h.runner('claim',{requestId})).message,first);
});

test('an existing valid archive keeps its encoding and references across gzip implementation changes',async()=>{
  const h = await harness();
  await h.seedReport(randomBytes(800_000).toString('base64'));
  const first = (await h.runner('claim',{requestId:crypto.randomUUID()})).message;
  const row = await h.db.prepare('SELECT body,html FROM report_mail WHERE id=?').bind(first.id).first();
  const archive = storedArchive(row);
  const otherEncoding = gzipSync(JSON.stringify([first.body,first.html]),{level:1});
  const otherHash = createHash('sha256').update(otherEncoding).digest('hex');
  assert.notEqual(otherHash,row.body.split(':').at(-1));
  h.objects.set(archive.key,otherEncoding);
  const otherMarker = row.body.replace(/[a-f0-9]{64}$/,otherHash);
  await h.db.prepare('UPDATE report_mail SET body=?,canceled_at=? WHERE id=?').bind(otherMarker,stamp,first.id).run();
  const next = (await h.runner('claim',{requestId:crypto.randomUUID()})).message;
  assert.equal(next.body,first.body);
  const saved = await h.db.prepare('SELECT body,html FROM report_mail WHERE id=?').bind(next.id).first();
  assert.equal(saved.body,otherMarker);
  assert.equal(h.puts(),1,'a valid existing content address is never overwritten just to change gzip encoding');
  assert.deepEqual(h.objects.get(archive.key),otherEncoding);
});

test('archive storage round-trips through the production chunked D1 adapter within the combined query budget',async()=>{
  const h = await harness();
  const database = new DatabaseSync(':memory:');
  try {
    for (const file of ['d1-media.sql','d1-media-hardening.sql','d1-media-capacity.sql']) {
      database.exec(await readFile(new URL('../server/'+file,import.meta.url),'utf8'));
    }
    let mediaQueries = 0;
    const media = {
      prepare(sql) {
        const statement = database.prepare(sql);
        return { bind(...args) { return {
          execute:()=>({results:statement.all(...args)}),
          first:async()=>{mediaQueries++;return statement.get(...args) ?? null;},
        }; } };
      },
      async batch(statements) {
        mediaQueries++;
        database.exec('BEGIN');
        try { const results=statements.map(statement=>statement.execute()); database.exec('COMMIT');return results; }
        catch (error) { database.exec('ROLLBACK');throw error; }
      },
    };
    h.env.BUCKET = d1MediaStore(media);
    await h.seedReport(randomBytes(800_000).toString('base64'));
    h.resetQueries();
    const requestId = crypto.randomUUID();
    const first = (await h.runner('claim',{requestId})).message;
    assert.ok(h.queryCount()+mediaQueries<=50);
    assert.equal(mediaQueries,3,'head, atomic chunk write, and verified chunk read each use one D1 call');
    assert.ok(database.prepare('SELECT COUNT(*) AS count FROM media_parts').get().count>1);
    assert.deepEqual((await h.runner('claim',{requestId})).message,first);
    await h.runner('complete',{id:first.id,claim:first.claim});
  } finally { database.close(); }
});
