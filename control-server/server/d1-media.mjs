import { Buffer } from 'node:buffer';

const mediaPartSize = 600_000;
const proofBudgets={owner:70_000_000,site:140_000_000,global:350_000_000};
const proofScope=(key,value)=>(key.startsWith('verification/')?'verification:':'production:')+value;
const proofIdentity=value=>typeof value==='string' && value.length>0 && value.length<=200;

export function d1MediaStore(db) {
  return {
    async put(key, value, { httpMetadata,customMetadata } = {}) {
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      const capture=/^(?:verification\/)?work-(?:captures|evidence)\//.test(key);
      if (capture && (!proofIdentity(customMetadata?.proofOwner) || !proofIdentity(customMetadata?.proofSite))) {
        throw new Error('photo_scope_required');
      }
      const statements = [
        db.prepare('DELETE FROM media_files WHERE key=?').bind(key),
        db.prepare('INSERT INTO media_files(key,content_type) VALUES (?,?)').bind(key,httpMetadata?.contentType || 'application/octet-stream'),
      ];
      if (capture) statements.push(db.prepare('INSERT INTO media_proof_scopes(key,owner_id,site_id) VALUES (?,?,?)')
        .bind(key,proofScope(key,customMetadata.proofOwner),proofScope(key,customMetadata.proofSite)));
      for (let start=0;start<bytes.length;start+=mediaPartSize) {
        const part = bytes.subarray(start,start+mediaPartSize);
        const content = Buffer.from(part.buffer,part.byteOffset,part.byteLength).toString('base64');
        statements.push(db.prepare('INSERT INTO media_parts(key,sequence,content) VALUES (?,?,?)')
          .bind(key,start/mediaPartSize,content));
      }
      await db.batch(statements);
    },
    async proofUsage({ownerId,siteId,verification=false}) {
      if (!proofIdentity(ownerId) || !proofIdentity(siteId)) throw new Error('photo_scope_required');
      const prefix=verification?'verification/':'';
      const row=await db.prepare(`SELECT
        COALESCE((SELECT stored_bytes FROM media_proof_usage WHERE kind='owner' AND scope_id=?),0) AS owner_bytes,
        COALESCE((SELECT stored_bytes FROM media_proof_usage WHERE kind='site' AND scope_id=?),0) AS site_bytes,
        (SELECT proof_bytes FROM media_storage_usage WHERE id=1) AS global_bytes`)
        .bind(proofScope(prefix,ownerId),proofScope(prefix,siteId)).first();
      return Object.fromEntries(Object.entries(proofBudgets).map(([kind,limit])=>{
        const used=Number(row?.[kind+'_bytes'] || 0);
        return [kind,{used,limit,remaining:Math.max(0,limit-used)}];
      }));
    },
    async head(key) {
      return db.prepare('SELECT 1 FROM media_files WHERE key=?').bind(key).first();
    },
    async get(key) {
      const [file, parts] = await db.batch([
        db.prepare('SELECT content_type FROM media_files WHERE key=?').bind(key),
        db.prepare('SELECT content FROM media_parts WHERE key=? ORDER BY sequence').bind(key),
      ]);
      if (!file.results.length) return null;
      const httpMetadata = { contentType:file.results[0].content_type };
      return { httpMetadata, body:new Blob(parts.results.map(row=>Buffer.from(row.content,'base64')),{type:httpMetadata.contentType}).stream() };
    },
    async delete(key) {
      await db.prepare('DELETE FROM media_files WHERE key=?').bind(key).run();
    },
  };
}
