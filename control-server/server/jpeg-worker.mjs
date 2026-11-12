import worker from './independent-worker.mjs';
import { JpegValidationHandler, validateJpegInDurableObject } from './jpeg-validation.mjs';
import { forwardReportRequest, usesReportRuntime } from './report-runtime.mjs';
import jpegModule from './vendor/jpeg/mozjpeg_dec.wasm';

export { ReportRuntime } from './report-runtime.mjs';

export class JpegValidation extends JpegValidationHandler {
  constructor() { super(jpegModule); }
}

export default {
  fetch(request, env, context) {
    if (usesReportRuntime(new URL(request.url))) {
      return forwardReportRequest(request, env);
    }
    return worker.fetch(request, {
      ...env, JPEG_VALIDATE: bytes => validateJpegInDurableObject(env.JPEG_DECODER, bytes),
    }, context);
  },
};
