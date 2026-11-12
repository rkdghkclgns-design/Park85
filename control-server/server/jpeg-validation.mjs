import createMozJpeg from './vendor/jpeg/mozjpeg_dec.js';

const maxPhotoBytes = 1_200_000;
const maxPhotoEdge = 2048;
const maxPhotoPixels = 4_194_304;

// Bound the decoded allocation before entering native/WASM code. This deliberately
// stays independent of camera.mjs so a new caller cannot bypass the memory bound.
function jpegDimensions(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 64 || bytes.byteLength > maxPhotoBytes
    || bytes[0] !== 255 || bytes[1] !== 216
    || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return null;
  let offset = 2;
  let dimensions;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 255) return null;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218) return dimensions ?? null;
    if (marker === 0 || marker === 216 || marker === 217 || (marker >= 208 && marker <= 215)
      || offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (marker === 192 || marker === 193 || marker === 194) {
      if (dimensions || length < 11 || bytes[offset + 2] !== 8) return null;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const components = bytes[offset + 7];
      if (!width || !height || width > maxPhotoEdge || height > maxPhotoEdge
        || width * height > maxPhotoPixels || ![1, 3, 4].includes(components)
        || length !== 8 + 3 * components) return null;
      dimensions = { width, height };
    } else if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) return null;
    offset += length;
  }
  return null;
}

/**
 * Build a fail-closed JPEG proof validator from a locally bundled, compiled WASM
 * module. Node tests compile the exact same binary with WebAssembly.compile.
 * No network, automatic WASM loading, image APIs or eval are used here.
 */
export function createJpegValidator(wasmModule) {
  if (!(wasmModule instanceof WebAssembly.Module)) throw new TypeError('Compiled JPEG WASM module is required.');
  let current;
  let pending = Promise.resolve();
  function runtime() {
    if (!current) {
      const state = { warned: false };
      state.ready = createMozJpeg({
        noInitialRun: true,
        instantiateWasm(imports, callback) {
          const instance = new WebAssembly.Instance(wasmModule, imports);
          callback(instance);
          return instance.exports;
        },
        // A truncated/corrupt stream may be decoded with recovery by libjpeg.
        // Recovery warnings are rejected rather than silently filling pixels.
        printErr() { state.warned = true; },
        print() {},
      }).catch(error => {
        if (current === state) current = undefined;
        throw error;
      });
      current = state;
    }
    return current;
  }
  async function decodeJpeg(bytes, dimensions) {
    const state = runtime();
    // Initialization/configuration errors must reach camera.mjs as service
    // failures rather than being reported as a damaged photograph.
    const decoder = await state.ready;
    state.warned = false;
    try {
      const input = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? bytes.buffer : bytes.slice().buffer;
      const image = decoder.decode(input, false);
      return !state.warned && image?.width === dimensions.width && image?.height === dimensions.height
        && image.data instanceof Uint8ClampedArray && image.data.length === dimensions.width * dimensions.height * 4;
    } catch {
      // libjpeg's fatal error exits abort its Emscripten instance. Retire that
      // instance so one malicious upload cannot poison subsequent good uploads.
      if (current === state) current = undefined;
      return false;
    }
  }
  return function validateJpeg(bytes) {
    const dimensions = jpegDimensions(bytes);
    if (!dimensions) return Promise.resolve(false);
    // Obtain the current instance only after the prior decode has completed.
    // Otherwise concurrent callers could retain an instance retired by a fatal
    // image and falsely reject a good photograph queued immediately after it.
    const operation = pending.then(() => decodeJpeg(bytes, dimensions));
    pending = operation.catch(() => {});
    return operation;
  };
}

// Only the private Durable Object binding can reach this handler. Images are
// decoded in memory and are never written to Durable Object storage.
export class JpegValidationHandler {
  constructor(wasmModule) {
    this.validate = createJpegValidator(wasmModule);
    this.inFlight = 0;
  }

  async fetch(request) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/validate') {
      return new Response(null, { status: 404 });
    }
    if (request.headers.get('Content-Type') !== 'application/octet-stream'
      || Number(request.headers.get('Content-Length')) > maxPhotoBytes || !request.body) {
      return new Response(null, { status: 400 });
    }
    // Bound queued raw buffers as well as each decoded image. Busy callers keep
    // their original offline photograph and retry through the existing 503 path.
    if (this.inFlight >= 4) return new Response(null, { status: 503 });
    this.inFlight++;
    try { return await this.#validateRequest(request); }
    finally { this.inFlight--; }
  }

  async #validateRequest(request) {
    const reader = request.body.getReader();
    const parts = [];
    let length = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maxPhotoBytes) {
          await reader.cancel();
          return new Response(null, { status: 400 });
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return new Response(null, { status: await this.validate(bytes) ? 204 : 400 });
  }
}

export async function validateJpegInDurableObject(namespace, bytes) {
  if (!namespace) throw new Error('JPEG validation service is not configured.');
  const id = namespace.idFromName('bonyeon-jpeg-validation-v1');
  const response = await namespace.get(id).fetch('https://jpeg.internal/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 204) return true;
  if (response.status === 400) return false;
  throw new Error('JPEG validation service is unavailable.');
}
