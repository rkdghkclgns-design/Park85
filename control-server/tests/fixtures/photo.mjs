import { readFileSync } from 'node:fs';
export const proofJpeg = new Uint8Array(readFileSync(new URL('./photo.jpg', import.meta.url)));
