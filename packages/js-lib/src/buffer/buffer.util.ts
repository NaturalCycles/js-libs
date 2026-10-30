/**
 * Returns an ArrayBuffer that contains exactly the bytes of the given view (e.g Uint8Array or Buffer).
 *
 * Safe alternative to `view.buffer`, which returns the whole underlying ArrayBuffer.
 * It can be larger than the view, and the view may start at a non-zero offset:
 * e.g Node.js allocates small Buffers from a shared pool (`Buffer.from(string)`,
 * `fs.readFileSync` of small files), or the view was created with `subarray()`.
 *
 * Zero-copy when the view covers the whole ArrayBuffer, otherwise copies exactly its bytes.
 */
export function _toArrayBuffer<T extends ArrayBufferLike>(view: ArrayBufferView<T>): T {
  const { buffer, byteOffset, byteLength } = view
  if (byteOffset === 0 && byteLength === buffer.byteLength) return buffer
  return buffer.slice(byteOffset, byteOffset + byteLength) as T
}

/**
 * Same as _chunk, but for Uint8Array (or Buffer).
 * Chunks are zero-copy views (subarray) into the input, and preserve its type
 * (e.g Buffer in - Buffer[] out).
 */
export function _chunkBuffer<T extends Uint8Array>(buf: T, size: number): T[] {
  const out: T[] = []

  for (let i = 0; i < buf.length; i += size) {
    // subarray preserves the subclass at runtime (Buffer#subarray returns a Buffer)
    out.push(buf.subarray(i, i + size) as T)
  }

  return out
}
