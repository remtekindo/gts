/**
 * Client-side image compression for uploads (payment proofs,
 * merchant QRIS image). Downscales to a max 1200px longest side
 * and re-encodes as JPEG quality 0.8, so uploads stay small. The
 * server still enforces its own ~500 KB cap — compression here is
 * a courtesy, not the gate.
 */

/** Read a Blob (File or canvas output) as a data URL. */
function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('read-failed'))
    r.readAsDataURL(blob)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('bad-image'))
    img.src = src
  })
}

/**
 * Compress an image file to a JPEG data URL (max 1200px longest
 * side, quality 0.8). A small image is returned as-is when it is
 * already a JPEG under the limit; anything else is re-encoded.
 * Throws on an unreadable or non-image file.
 */
export async function compressImageFile(file: File, maxSide = 1200, quality = 0.8): Promise<string> {
  const src = await readAsDataUrl(file)
  const img = await loadImage(src)
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  if (longest <= maxSide && src.startsWith('data:image/jpeg')) return src
  const scale = Math.min(1, maxSide / longest)
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no-canvas')
  ctx.drawImage(img, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('encode-failed')); return }
        readAsDataUrl(blob).then(resolve, reject)
      },
      'image/jpeg',
      quality
    )
  })
}

/** Approximate byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}
