import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createJpegValidator, JpegValidationHandler, validateJpegInDurableObject } from '../server/jpeg-validation.mjs';
import { validateProofJpeg } from '../server/camera.mjs';
import { forwardReportRequest, ReportRuntime, usesReportRuntime } from '../server/report-runtime.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { proofJpeg } from './fixtures/photo.mjs';

const wasmBytes = await readFile(new URL('../server/vendor/jpeg/mozjpeg_dec.wasm', import.meta.url));
const wasm = await WebAssembly.compile(wasmBytes);
const badHuffman = () => {
  const bytes = proofJpeg.slice();
  let offset = 2;
  while (offset < bytes.length) {
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 196) {
      // Keep all segment lengths and Kraft counts valid while introducing an
      // invalid DC category. Structural parsing alone accepts this photograph.
      bytes[offset + 4 + 1 + 16] = 255;
      return bytes;
    }
    offset += 2 + length;
  }
  throw new Error('JPEG fixture does not contain a Huffman table.');
};
class PhotoError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const file = bytes => new File([bytes], 'photo.jpg', { type: 'image/jpeg' });

test('the bundled decoder is pinned and decodes baseline photos and bounded typed-array views', async () => {
  assert.equal(createHash('sha256').update(wasmBytes).digest('hex'), 'a7c4b12169817e779ff4af137981393ae924944e167ad1bd95747c9199162d3e');
  const validate = createJpegValidator(wasm);
  assert.equal(await validate(proofJpeg), true);
  const buffer = new Uint8Array(proofJpeg.length + 32);
  buffer.set(proofJpeg, 16);
  assert.equal(await validate(buffer.subarray(16, -16)), true);
  assert.equal(await validate(new Uint8Array([255, 216, 255, 217])), false);
  assert.equal(await validate(new Uint8Array(1_200_001)), false);
});

test('structurally valid but undecodable Huffman data returns 400 and cannot poison concurrent good photos', async () => {
  const invalid = badHuffman();
  assert.deepEqual(await validateProofJpeg(file(invalid), PhotoError), invalid);
  const validate = createJpegValidator(wasm);
  await assert.rejects(validateProofJpeg(file(invalid), PhotoError, validate), error => error.status === 400);
  assert.deepEqual(await Promise.all([
    validate(invalid), validate(proofJpeg), validate(invalid), validate(proofJpeg),
  ]), [false, true, false, true]);
  assert.deepEqual(await validateProofJpeg(file(proofJpeg), PhotoError, validate), proofJpeg);
  await assert.rejects(validateProofJpeg(file(proofJpeg), PhotoError, async () => { throw new Error('service failed'); }),
    error => error.status === 503);
});

test('the private JPEG service rejects bad bodies and returns only validation status without persistence', async () => {
  const service = new JpegValidationHandler(wasm);
  const request = (bytes, headers = {}) => new Request('https://jpeg.internal/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream', ...headers }, body: bytes,
  });
  assert.equal((await service.fetch(request(proofJpeg))).status, 204);
  const invalid = await service.fetch(request(badHuffman()));
  assert.equal(invalid.status, 400);
  assert.equal(await invalid.text(), '');
  assert.equal((await service.fetch(request(new Uint8Array(1_200_001)))).status, 400);
  assert.equal((await service.fetch(request(proofJpeg, { 'Content-Type': 'image/jpeg' }))).status, 400);
  assert.equal((await service.fetch(new Request('https://jpeg.internal/validate'))).status, 404);
  assert.equal((await service.fetch(new Request('https://jpeg.internal/other', { method: 'POST' }))).status, 404);
  assert.equal((await service.fetch(request(proofJpeg))).status, 204);
});

test('the JPEG namespace uses one fixed object, fails closed and does not make external codec calls', async () => {
  const service = new JpegValidationHandler(wasm);
  const namespace = {
    idFromName(name) { assert.equal(name, 'bonyeon-jpeg-validation-v1'); return name; },
    get(id) {
      assert.equal(id, 'bonyeon-jpeg-validation-v1');
      return { fetch: (url, options) => {
        assert.equal(url, 'https://jpeg.internal/validate');
        return service.fetch(new Request(url, options));
      } };
    },
  };
  assert.equal(await validateJpegInDurableObject(namespace, proofJpeg), true);
  assert.equal(await validateJpegInDurableObject(namespace, badHuffman()), false);
  await assert.rejects(validateJpegInDurableObject(undefined, proofJpeg), /not configured/);
  await assert.rejects(validateJpegInDurableObject({ idFromName: () => 'id', get: () => ({ fetch: async () => new Response(null, { status: 503 }) }) }, proofJpeg), /unavailable/);
});

test('the JPEG service bounds concurrent raw buffers and recovers when the queue drains', async () => {
  const service = new JpegValidationHandler(wasm);
  const release = [];
  const waiting = Array.from({ length: 4 }, () => service.fetch(new Request('https://jpeg.internal/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, duplex: 'half',
    body: new ReadableStream({ start(controller) { release.push(() => controller.close()); } }),
  })));
  const extra = () => service.fetch(new Request('https://jpeg.internal/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: proofJpeg,
  }));
  assert.equal((await extra()).status, 503);
  for (const close of release) close();
  assert.deepEqual((await Promise.all(waiting)).map(response => response.status), [400, 400, 400, 400]);
  assert.equal((await extra()).status, 204);
});

test('report runtime routing is limited to the existing mail and Gmail paths', () => {
  for (const path of ['/api/control/gmail/claim', '/api/control/gmail/run', '/api/control/mail',
    '/api/control/mail/archive?id=one', '/api/control/detail?kind=mail&id=one']) {
    assert.equal(usesReportRuntime(new URL('https://worker.test' + path)), true, path);
  }
  for (const path of ['/api/auth/login', '/api/work/captures', '/api/control/detail?kind=worker',
    '/api/control/mailbox', '/api/control/gmail', '/verification/api/control/mail']) {
    assert.equal(usesReportRuntime(new URL('https://worker.test' + path)), false, path);
  }
});

test('report runtime retains Origin, session and Gmail runner authorization checks', async () => {
  const origin = 'https://bonyeonclean.com';
  const runtime = new ReportRuntime(null, { DB: await createPreviewDb(), BONYEON_FRONTEND_ORIGIN: origin,
    BONYEON_APP_LOGIN_REQUIRED: '1', BONYEON_OWNER_EMAIL: 'owner@example.invalid' });
  const call = (path, source = origin, method = 'GET') => runtime.fetch(new Request('https://worker.test' + path,
    { method, headers: { Origin: source, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: '{}' } : {}) }));
  assert.equal((await call('/api/control/mail')).status, 401);
  assert.equal((await call('/api/control/mail', 'https://outside.invalid')).status, 403);
  assert.equal((await call('/api/control/detail?kind=mail&id=one')).status, 401);
  const runner = await call('/api/control/gmail/claim', 'https://worker.test', 'POST');
  assert.ok([401, 403, 503].includes(runner.status));
});

test('report forwarding preserves requests and handles private runtime unavailability without bypassing Origin checks', async () => {
  const origin = 'https://bonyeonclean.com';
  const env = { BONYEON_FRONTEND_ORIGIN: origin };
  const request = source => new Request('https://worker.test/api/control/mail', { headers: { Origin: source } });
  const missing = await forwardReportRequest(request(origin), env);
  assert.equal(missing.status, 503);
  assert.equal(missing.headers.get('Access-Control-Allow-Origin'), origin);
  assert.match((await missing.json()).error, /잠시/);
  assert.equal((await forwardReportRequest(request('https://outside.invalid'), env)).status, 403);
  const original = request(origin);
  env.REPORT_RUNTIME = {
    idFromName(name) { assert.equal(name, 'bonyeon-report-runtime-v1'); return name; },
    get() { return { fetch(received) { assert.equal(received, original); return new Response('original auth result', { status: 401 }); } }; },
  };
  assert.equal((await forwardReportRequest(original, env)).status, 401);
});
