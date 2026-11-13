const cameraSlots = ['exteriorBefore', 'exteriorAfter', 'interiorBefore', 'interiorAfter'];
const cameraUuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const cameraText = value => typeof value === 'string' ? value.trim() : '';
export const cameraPhotoKey = id => 'work-captures/' + id;

function validJpegStructure(bytes) {
  if (bytes.length<64 || bytes[0]!==255 || bytes[1]!==216) return false;
  let offset=2;
  let frame=null;
  let progressive=false;
  let scanSeen=false;
  let scanBytes=0;
  const quantization=new Set();
  const huffman=new Set();
  while (offset<bytes.length) {
    if (bytes[offset++]!==255) return false;
    while (bytes[offset]===255) offset++;
    const marker=bytes[offset++];
    if (marker===217) return offset===bytes.length && Boolean(frame) && scanSeen && scanBytes>0;
    if (marker===0 || marker===216 || (marker>=208 && marker<=215) || offset+2>bytes.length) return false;
    const length=(bytes[offset]<<8)|bytes[offset+1];
    const start=offset+2;
    const end=offset+length;
    if (length<2 || end>bytes.length) return false;
    if (marker===219) {
      let cursor=start;
      while (cursor<end) {
        const table=bytes[cursor++];
        if ((table>>4)>1 || (table&15)>3) return false;
        quantization.add(table&15);
        cursor+=64*((table>>4)+1);
      }
      if (cursor!==end) return false;
    } else if (marker===196) {
      let cursor=start;
      while (cursor<end) {
        const table=bytes[cursor++];
        if ((table>>4)>1 || (table&15)>3 || cursor+16>end) return false;
        let symbols=0;
        let availableCodes=1;
        for (let i=0;i<16;i++) {
          const count=bytes[cursor++];
          symbols+=count;
          availableCodes=availableCodes*2-count;
          if (availableCodes<0) return false;
        }
        if (!symbols || symbols>256) return false;
        cursor+=symbols;
        huffman.add(table);
      }
      if (cursor!==end) return false;
    } else if (marker===192 || marker===193 || marker===194) {
      if (frame || length<11 || bytes[start]!==8) return false;
      const height=(bytes[start+1]<<8)|bytes[start+2];
      const width=(bytes[start+3]<<8)|bytes[start+4];
      const count=bytes[start+5];
      if (!width || !height || width>2048 || height>2048 || width*height>4_194_304 || ![1,3,4].includes(count) || length!==8+count*3) return false;
      progressive=marker===194;
      frame=new Map();
      for (let i=0;i<count;i++) {
        const id=bytes[start+6+i*3], sampling=bytes[start+7+i*3], table=bytes[start+8+i*3];
        if (frame.has(id) || !(sampling>>4) || !(sampling&15) || (sampling>>4)>4 || (sampling&15)>4 || table>3) return false;
        frame.set(id,table);
      }
    } else if (marker===218) {
      const count=bytes[start];
      if (!frame || !count || count>frame.size || length!==6+2*count) return false;
      const spectralStart=bytes[start+1+count*2],spectralEnd=bytes[start+2+count*2];
      const approximation=bytes[start+3+count*2];
      if (spectralStart>spectralEnd || spectralEnd>63 || (approximation>>4)>13 || (approximation&15)>13
        || (!progressive && (spectralStart!==0 || spectralEnd!==63 || approximation!==0))
        || (progressive && ((spectralStart===0 && spectralEnd!==0) || (spectralStart>0 && count!==1)))) return false;
      for (let i=0;i<count;i++) {
        const component=bytes[start+1+i*2], tables=bytes[start+2+i*2];
        if (!frame.has(component) || !quantization.has(frame.get(component))
          || ((!progressive || (spectralStart===0 && (approximation>>4)===0)) && !huffman.has(tables>>4))
          || ((!progressive || spectralStart>0) && !huffman.has(16+(tables&15)))) return false;
      }
      scanSeen=true;
      offset=end;
      while (offset<bytes.length) {
        if (bytes[offset]!==255) { scanBytes++; offset++; continue; }
        if (bytes[offset+1]===0) { scanBytes++; offset+=2; continue; }
        if (bytes[offset+1]>=208 && bytes[offset+1]<=215) { offset+=2; continue; }
        break;
      }
      continue;
    } else if ((marker>=192 && marker<=207) && ![196,200,204].includes(marker)) return false;
    offset=end;
  }
  return false;
}

const cameraWithinAssignedQuantity = `
  EXISTS (SELECT 1 FROM work_camera_photos old WHERE old.site_id=w.id AND old.asset_code=? AND (old.author_id=? OR old.evidence_id IS NOT NULL)
    AND old.work_date>=COALESCE((SELECT first_date FROM work_progress WHERE site_id=w.id),
      (SELECT evidence_from FROM work_plan_cycles WHERE site_id=w.id),?))
  OR (
    SELECT COUNT(DISTINCT asset_code) FROM (
      SELECT asset_code FROM work_camera_photos WHERE site_id=w.id AND (author_id=? OR evidence_id IS NOT NULL)
        AND work_date>=COALESCE((SELECT first_date FROM work_progress WHERE site_id=w.id),
          (SELECT evidence_from FROM work_plan_cycles WHERE site_id=w.id),?)
      UNION
      SELECT asset_code FROM charger_evidence WHERE site_id=w.id
        AND work_date>=COALESCE((SELECT first_date FROM work_progress WHERE site_id=w.id),
          (SELECT evidence_from FROM work_plan_cycles WHERE site_id=w.id),?)
    )
  ) < COALESCE((SELECT planned_units FROM work_progress WHERE site_id=w.id),w.planned_units,0)
`;

export async function validateProofJpeg(file, HttpError, decodeJpeg) {
  if (!(file instanceof File) || file.type !== 'image/jpeg' || file.size < 4 || file.size > 1_200_000) {
    throw new HttpError(400, '작업 전후 증빙 사진을 확인해 주세요.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validJpegStructure(bytes)) {
    throw new HttpError(400, '손상된 사진입니다. 카메라에서 다시 촬영해 주세요.');
  }
  if (decodeJpeg) {
    let valid;
    try { valid=await decodeJpeg(bytes); }
    catch { throw new HttpError(503,'사진 검증에 연결하지 못했습니다. 촬영본을 보관하고 다시 전송해 주세요.'); }
    if (!valid) throw new HttpError(400,'열 수 없는 사진입니다. 카메라에서 다시 촬영해 주세요.');
  }
  return bytes;
}

async function cameraSite(db, siteId, account, admin, HttpError) {
  if (!siteId || siteId.length > 80) throw new HttpError(400, '작업 현장을 선택해 주세요.');
  const allowed = await db.prepare(`
    SELECT 1 FROM work_sites w WHERE w.id = ? AND (? OR EXISTS (
      SELECT 1 FROM work_plans p WHERE p.site_id = w.id AND p.worker_email = ?
    ))
  `).bind(siteId, Number(admin), account.email).first();
  if (!allowed) throw new HttpError(404, '배정된 현장을 찾을 수 없습니다.');
}

export async function validateWorkZone(db, siteId, zoneId, HttpError, { allowArchived = false } = {}) {
  if (!zoneId) return null;
  const zone = cameraUuid(zoneId) && await db.prepare('SELECT name,deleted_at FROM work_zones WHERE id=? AND site_id=?')
    .bind(zoneId,siteId).first();
  if (!zone) throw new HttpError(400,'해당 현장의 작업 구역을 선택해 주세요.');
  if (zone.deleted_at && !allowArchived) throw new HttpError(409,'삭제된 구역입니다. 사진을 보내려면 ‘' + zone.name + '’ 구역을 다시 추가해 주세요.');
  return zoneId;
}

async function removeWorkZone(db,siteId,zoneId,account,admin,HttpError) {
  if (!cameraUuid(zoneId)) throw new HttpError(400,'삭제할 작업 구역을 선택해 주세요.');
  const result = await db.prepare(`
    UPDATE work_zones AS z SET deleted_at=?
    WHERE z.id=? AND z.site_id=? AND z.deleted_at IS NULL
      AND (? OR EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id=z.site_id AND p.worker_email=?))
      AND NOT EXISTS (SELECT 1 FROM work_camera_photos c WHERE c.site_id=z.site_id AND c.zone_id=z.id)
      AND NOT EXISTS (SELECT 1 FROM charger_evidence e WHERE e.site_id=z.site_id AND e.zone_id=z.id)
  `).bind(new Date().toISOString(),zoneId,siteId,Number(admin),account.email).run();
  if (result.meta.changes) return;
  const zone = await db.prepare(`
    SELECT z.deleted_at FROM work_zones z WHERE z.id=? AND z.site_id=?
      AND (? OR EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id=z.site_id AND p.worker_email=?))
  `).bind(zoneId,siteId,Number(admin),account.email).first();
  if (!zone) throw new HttpError(404,'해당 현장의 작업 구역을 찾을 수 없습니다.');
  if (!zone.deleted_at) throw new HttpError(409,'사진이나 작업 기록이 연결된 구역은 삭제할 수 없습니다.');
}

async function renameWorkZone(db,siteId,zoneId,name,account,admin,HttpError) {
  if (!cameraUuid(zoneId)) throw new HttpError(400,'이름을 수정할 작업 구역을 선택해 주세요.');
  const renamed = await db.prepare(`
    UPDATE work_zones AS z SET name=?
    WHERE z.id=? AND z.site_id=? AND z.deleted_at IS NULL
      AND (? OR EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id=z.site_id AND p.worker_email=?))
      AND NOT EXISTS (SELECT 1 FROM work_zones other WHERE other.site_id=z.site_id AND other.id<>z.id AND other.name=?)
    RETURNING id,name
  `).bind(name,zoneId,siteId,Number(admin),account.email,name).first();
  if (renamed) return renamed;
  const active = await db.prepare(`
    SELECT 1 FROM work_zones z WHERE z.id=? AND z.site_id=? AND z.deleted_at IS NULL
      AND (? OR EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id=z.site_id AND p.worker_email=?))
  `).bind(zoneId,siteId,Number(admin),account.email).first();
  if (!active) throw new HttpError(404,'해당 현장의 작업 구역을 찾을 수 없습니다.');
  throw new HttpError(409,'이 현장에서 이미 사용된 구역 이름입니다. 다른 이름을 입력해 주세요.');
}

async function cameraContext(db, fields, account, admin, { HttpError, validDate, koreaDate }, zoneOptions) {
  const siteId = cameraText(fields.get('siteId'));
  const date = cameraText(fields.get('workDate'));
  const asset = cameraText(fields.get('assetCode')).normalize('NFKC').toUpperCase();
  if (!validDate(date) || date > koreaDate() || !asset || asset.length > 100) {
    throw new HttpError(400, '작업일과 충전기 식별 코드를 확인해 주세요.');
  }
  await cameraSite(db, siteId, account, admin, HttpError);
  const zone = await validateWorkZone(db, siteId, fields.get('zoneId'), HttpError, zoneOptions);
  return [siteId, date, asset, zone, account.id];
}

export function captureSelectionIds(raw,HttpError) {
  let ids;
  try { ids = JSON.parse(raw || '[]'); } catch { ids = null; }
  if (!Array.isArray(ids) || ids.length > 24 || new Set(ids).size !== ids.length || ids.some(id => !cameraUuid(id))) {
    throw new HttpError(400, '등록할 사진을 다시 확인해 주세요.');
  }
  return ids;
}

export async function readCaptureSelection(db, raw, scope, slots, HttpError) {
  const ids=captureSelectionIds(raw,HttpError);
  const { results } = await db.prepare(`
    SELECT id, slot FROM work_camera_photos
    WHERE site_id = ? AND work_date = ? AND asset_code = ? AND zone_id IS ? AND author_id = ?
      AND evidence_id IS NULL AND id IN (SELECT value FROM json_each(?))
  `).bind(...scope, JSON.stringify(ids)).all();
  if (results.length !== ids.length || slots.some(slot => !results.some(photo => photo.slot === slot))
    || results.some(photo => !slots.includes(photo.slot))) {
    throw new HttpError(400, '선택한 청소 범위의 작업 전과 후 사진을 각각 한 장 이상 촬영해 주세요.');
  }
  return ids;
}

export async function handleCameraWork(path, request, env, account, admin, context, readForm) {
  const { HttpError, json, readJson } = context;
  const db = env.DB;
  const query = new URL(request.url).searchParams;
  const method = request.method;
  if (path === '/api/work/zones' && ['GET','POST','PATCH','DELETE'].includes(method)) {
    const body = method==='GET' ? null : await readJson(request,env);
    const siteId = cameraText(method==='GET' ? query.get('siteId') : body?.siteId);
    await cameraSite(db, siteId, account, admin, HttpError);
    if (method==='DELETE') {
      await removeWorkZone(db,siteId,body?.zoneId,account,admin,HttpError);
      return json({ ok:true });
    }
    if (method==='POST' || method==='PATCH') {
      const name = cameraText(body?.name).normalize('NFKC').trim();
      if (!name || name.length > 80) throw new HttpError(400, '구역 이름을 80자 이내로 입력해 주세요.');
      if (method==='PATCH') return json({ zone:await renameWorkZone(db,siteId,body?.zoneId,name,account,admin,HttpError) });
      await db.prepare(`
        INSERT INTO work_zones(id,site_id,name,created_at,created_by)
        SELECT ?,w.id,?,?,? FROM work_sites w WHERE w.id = ?
          AND (? OR EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id = w.id AND p.worker_email = ?))
        ON CONFLICT(site_id,name) DO UPDATE SET deleted_at=NULL WHERE work_zones.deleted_at IS NOT NULL
      `).bind(crypto.randomUUID(), name, new Date().toISOString(), account.id, siteId, Number(admin), account.email).run();
      const zone = await db.prepare('SELECT id,name FROM work_zones WHERE site_id=? AND name=? AND deleted_at IS NULL')
        .bind(siteId,name).first();
      if (!zone) throw new HttpError(409, '현장 배정을 다시 확인해 주세요.');
      return json({ zone });
    }
    const { results } = await db.prepare('SELECT id,name FROM work_zones WHERE site_id=? AND deleted_at IS NULL ORDER BY name')
      .bind(siteId).all();
    return json({ zones: results });
  }
  if (path === '/api/work/captures' && method === 'GET') {
    const scope = await cameraContext(db, query, account, admin, context);
    const { results } = await db.prepare(`
      SELECT id, slot, created_at AS createdAt FROM work_camera_photos
      WHERE site_id = ? AND work_date = ? AND asset_code = ? AND zone_id IS ? AND author_id = ? AND evidence_id IS NULL
      ORDER BY created_at, id
    `).bind(...scope).all();
    const [site,date,asset,zone,author] = scope;
    const { results: inProgress } = await db.prepare(`
      SELECT asset_code AS assetCode,COUNT(*) AS count FROM work_camera_photos
      WHERE site_id=? AND work_date=? AND zone_id IS ? AND author_id=? AND asset_code<>? AND evidence_id IS NULL
      GROUP BY asset_code ORDER BY MAX(created_at) DESC LIMIT 20
    `).bind(site,date,zone,author,asset).all();
    const registration=await db.prepare(`SELECT id FROM charger_evidence
      WHERE site_id=? AND work_date=? AND asset_code=? AND author_id=?`).bind(site,date,asset,author).first();
    if (registration) {
      const {results:photos}=await db.prepare('SELECT id,slot,created_at AS createdAt FROM work_camera_photos WHERE evidence_id=? AND author_id=? ORDER BY created_at,id')
        .bind(registration.id,author).all();
      registration.photos=photos;
    }
    return json({ captures: results, inProgress,registration });
  }
  if (path === '/api/work/captures' && method === 'POST') {
    if (!env.BUCKET) throw new HttpError(503, '증빙 사진 저장소를 확인해 주세요.');
    const form = await readForm(request, env, context);
    const scope = await cameraContext(db, form, account, admin, context,{ allowArchived:true });
    const [site, date, asset, zone, author] = scope;
    const slot = form.get('slot');
    if (!cameraSlots.includes(slot)) throw new HttpError(400, '작업 전 또는 후 촬영 위치를 선택해 주세요.');
    const bytes = await validateProofJpeg(form.get('photo'), HttpError, env.JPEG_VALIDATE);
    const uploadId = form.get('uploadId');
    if (uploadId !== null && !cameraUuid(uploadId)) throw new HttpError(400, '사진 전송 번호를 확인해 주세요.');
    const uploadHash = uploadId ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      byte => byte.toString(16).padStart(2, '0')).join('') : null;
    async function previouslySaved() {
      if (!uploadId) return null;
      const match = await db.prepare(`
        SELECT id, slot, created_at AS createdAt, site_id, work_date, asset_code,
          COALESCE(upload_zone_before_move,zone_id,'') AS uploadedZone,upload_hash
        FROM work_camera_photos WHERE author_id = ? AND upload_id = ?
      `).bind(author, uploadId).first();
      if (!match) return null;
      if (match.site_id !== site || match.work_date !== date || match.asset_code !== asset || match.uploadedZone !== (zone ?? '')
        || match.slot !== slot || match.upload_hash !== uploadHash) {
        throw new HttpError(409, '전송 번호가 다른 사진에 사용되었습니다.');
      }
      return { id: match.id, slot: match.slot, createdAt: match.createdAt };
    }
    async function confirmStored(photo) {
      const key = cameraPhotoKey(photo.id);
      const stored = env.BUCKET.head ? await env.BUCKET.head(key) : await env.BUCKET.get(key);
      if (!stored) await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
      return json(photo);
    }
    const existing = await previouslySaved();
    if (existing) return confirmStored(existing);
    await validateWorkZone(db,site,zone,HttpError);
    const capacity=await db.prepare(`SELECT 1 FROM work_sites w WHERE w.id=? AND (${cameraWithinAssignedQuantity})
      AND ?>=COALESCE((SELECT first_date FROM work_progress WHERE site_id=w.id),(SELECT evidence_from FROM work_plan_cycles WHERE site_id=w.id),?)`)
      .bind(site,asset,author,date,author,date,date,date,date).first();
    if (!capacity) throw new HttpError(409,'배정 설비 수량을 확인해 주세요. 수량을 초과하는 새 충전기 사진은 등록할 수 없습니다.');
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const before = slot.endsWith('After') ? slot.replace('After', 'Before') : null;
    try {
      await env.BUCKET.put(cameraPhotoKey(id), bytes, { httpMetadata: { contentType:'image/jpeg' } });
    } catch (error) {
      if (String(error).includes('photo_media_limit')) throw new HttpError(507,'사진 보관함이 가득 찼습니다. 촬영본은 기기에 보관되며, 관리자 확인 후 다시 전송해 주세요.');
      throw error;
    }
    try {
      const saved = await db.prepare(`
        INSERT INTO work_camera_photos(id,site_id,work_date,asset_code,zone_id,author_id,slot,created_at,upload_id,upload_hash)
        SELECT ?,w.id,?,?,?,?,?,?,?,? FROM work_sites w WHERE w.id = ?
          AND (? OR EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id = w.id AND p.worker_email = ?))
          AND (${cameraWithinAssignedQuantity})
          AND ?>=COALESCE((SELECT first_date FROM work_progress WHERE site_id=w.id),(SELECT evidence_from FROM work_plan_cycles WHERE site_id=w.id),?)
          AND (? IS NULL OR EXISTS (SELECT 1 FROM work_zones z WHERE z.id=? AND z.site_id=w.id AND z.deleted_at IS NULL))
          AND NOT EXISTS (SELECT 1 FROM settlement_months c WHERE c.month = substr(?,1,7))
          AND NOT EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id=w.id AND ? BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date AND r.status='approved')
          AND (SELECT COUNT(*) FROM work_camera_photos p WHERE p.site_id=w.id
            AND p.work_date>=COALESCE((SELECT first_date FROM work_progress WHERE site_id=w.id),
              (SELECT evidence_from FROM work_plan_cycles WHERE site_id=w.id),?)
            AND p.asset_code=? AND p.slot=? AND (p.author_id=? OR p.evidence_id IS NOT NULL)) < 6
          AND (? IS NULL OR EXISTS (SELECT 1 FROM work_camera_photos p WHERE p.site_id = w.id AND p.work_date = ?
            AND p.asset_code = ? AND p.zone_id IS ? AND p.author_id = ? AND p.slot = ? AND p.evidence_id IS NULL))
        ON CONFLICT DO NOTHING
      `).bind(id, date, asset, zone, author, slot, createdAt, uploadId, uploadHash, site, Number(admin), account.email, asset,author,date,author,date,date,date,date, zone,zone,date,date,
        date, asset, slot, author, before, date, asset, zone, author, before).run();
      if (!saved.meta.changes) {
        await Promise.allSettled([env.BUCKET.delete(cameraPhotoKey(id))]);
        const concurrent = await previouslySaved();
        if (concurrent) return confirmStored(concurrent);
        await validateWorkZone(db,site,zone,HttpError);
        throw new HttpError(409, '작업 전 사진, 배정 및 승인 상태를 확인해 주세요. 한 항목에 6장까지 등록할 수 있습니다.');
      }
    } catch (error) {
      // D1 may have committed even when the caller lost its response.
      const metadata = await db.prepare('SELECT id FROM work_camera_photos WHERE id=?')
        .bind(id).first().catch(() => undefined);
      if (metadata) return json({ id, slot, createdAt }, 201);
      if (metadata === null) await Promise.allSettled([env.BUCKET.delete(cameraPhotoKey(id))]);
      throw error;
    }
    return json({ id, slot, createdAt }, 201);
  }
  if (path === '/api/work/captures' && method === 'DELETE') {
    const { id } = (await readJson(request, env)) ?? {};
    if (!cameraUuid(id)) throw new HttpError(400, '삭제할 사진을 선택해 주세요.');
    const result = await db.prepare('DELETE FROM work_camera_photos WHERE id = ? AND author_id = ? AND evidence_id IS NULL').bind(id, account.id).run();
    if (!result.meta.changes) throw new HttpError(409, '임시 촬영 사진을 찾을 수 없습니다.');
    if (env.BUCKET) await env.BUCKET.delete(cameraPhotoKey(id));
    return json({ ok: true });
  }
  if (path === '/api/work/capture' && method === 'GET') {
    const id = query.get('id');
    if (!cameraUuid(id) || !(await db.prepare('SELECT 1 FROM work_camera_photos WHERE id = ? AND (? OR author_id = ?)').bind(id, Number(admin), account.id).first())) {
      throw new HttpError(404, '사진을 찾을 수 없습니다.');
    }
    const photo = await env.BUCKET?.get(cameraPhotoKey(id));
    if (!photo) throw new HttpError(404, '사진을 찾을 수 없습니다.');
    return new Response(photo.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' } });
  }
  throw new HttpError(404, '요청한 촬영 기능을 찾을 수 없습니다.');
}
