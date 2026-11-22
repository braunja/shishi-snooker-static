import { gunzipSync } from './vendor/fflate.module.js';

export async function readGzipResponse(response) {
  if (typeof DecompressionStream === 'function' && response.body) {
    return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  // Older Safari can fetch gzip assets, but cannot decompress them as a stream.
  return gunzipSync(new Uint8Array(await response.arrayBuffer())).buffer;
}
