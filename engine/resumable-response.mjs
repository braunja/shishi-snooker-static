const chunkBytes = 128 * 1024;
const parallelRequests = 4;

// Small ranges avoid restarting an entire compressed model after a slow
// cross-border connection closes. The caller keeps its existing gzip decoder.
export async function resumableResponse(original) {
  const size = Number(original.headers.get("content-length"));
  const etag = original.headers.get("etag");
  if (original.status !== 200 || !original.url || size <= chunkBytes * 2 ||
      !Number.isSafeInteger(size) || original.headers.get("content-encoding") ||
      original.headers.get("accept-ranges") !== "bytes" || !etag || etag.startsWith("W/")) {
    return original;
  }
  await original.body?.cancel();
  const controller = new AbortController();
  const pending = new Map();
  const count = Math.ceil(size / chunkBytes);
  let scheduled = 0;
  let consumed = 0;

  async function download(index) {
    const start = index * chunkBytes;
    const end = Math.min(size - 1, start + chunkBytes - 1);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(original.url, {
          headers: { Range: `bytes=${start}-${end}`, "If-Range": etag },
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status !== 206 || response.headers.get("etag") !== etag ||
            response.headers.get("content-range") !== `bytes ${start}-${end}/${size}`) {
          await response.body?.cancel();
          throw new Error("资源暂不可用，请刷新重试。");
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength !== end - start + 1) throw new Error("资源下载中断，请重试。");
        return bytes;
      } catch (error) {
        if (controller.signal.aborted || attempt === 2) throw error;
      }
    }
  }

  function schedule() {
    while (scheduled < count && pending.size < parallelRequests) {
      const index = scheduled++;
      // Keep a later chunk's failure handled while earlier chunks finish.
      pending.set(index, download(index).then(bytes => ({ bytes }), error => ({ error })));
    }
  }

  const body = new ReadableStream({
    start: schedule,
    async pull(stream) {
      const result = await pending.get(consumed);
      if (result.error) {
        controller.abort();
        stream.error(result.error);
        return;
      }
      pending.delete(consumed++);
      stream.enqueue(result.bytes);
      if (consumed === count) stream.close();
      else schedule();
    },
    cancel() {
      controller.abort();
    },
  });
  return new Response(body, { status: original.status, headers: original.headers });
}
