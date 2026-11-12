import { Buffer } from 'node:buffer';

const mediaPartSize = 600_000;

export function d1MediaStore(db) {
  return {
    async put(key, value, { httpMetadata } = {}) {
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      const statements = [
        db.prepare('DELETE FROM media_files WHERE key=?').bind(key),
        db.prepare('INSERT INTO media_files(key,content_type) VALUES (?,?)').bind(key,httpMetadata?.contentType || 'application/octet-stream'),
      ];
      for (let start=0;start<bytes.length;start+=mediaPartSize) {
        const part = bytes.subarray(start,start+mediaPartSize);
        const content = Buffer.from(part.buffer,part.byteOffset,part.byteLength).toString('base64');
        statements.push(db.prepare('INSERT INTO media_parts(key,sequence,content) VALUES (?,?,?)')
          .bind(key,start/mediaPartSize,content));
      }
      await db.batch(statements);
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
