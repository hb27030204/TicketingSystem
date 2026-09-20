import { Buffer } from 'node:buffer'

import QRCode from 'npm:qrcode@1'
import { PNG } from 'npm:pngjs@7'
import jsQRImport from 'npm:jsqr@1.4.0'

// jsqr ships a "types" field (ESM-style `export default`) that doesn't
// match what its "main" field's webpack bundle actually exports at
// runtime (the function itself, CJS-style), which Deno's npm resolver
// mis-types as a non-callable namespace. The runtime shape is correct -
// this is the well-known, standard way this package is used - so we
// assert the real callable signature here instead of fighting the
// mismatched declaration file.
const jsQR = jsQRImport as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => { data: string } | null

// Generates a scan-reliable QR PNG: high error correction (survives a
// scratched/glare-hit phone screen), a full 4-module quiet zone, and a
// size large enough for typical door-scanner cameras.
export async function generateQrPng(text: string): Promise<Uint8Array> {
  const buffer: Buffer = await QRCode.toBuffer(text, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 500,
  })
  return new Uint8Array(buffer)
}

// Integrity check: decode the PNG we just generated and confirm it
// actually reads back to the same text, before we ever hand it to a
// guest. Catches a corrupt render instead of shipping an unscannable
// ticket.
export function verifyQrDecodesTo(pngBytes: Uint8Array, expectedText: string): boolean {
  const png = PNG.sync.read(Buffer.from(pngBytes))
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  return decoded?.data === expectedText
}
