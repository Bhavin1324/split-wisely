const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 table for PNG chunk generation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePNG(width, height, rgbaBuffer) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Color type 6: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (width * 4 + 1);
    scanlines[scanlineOffset] = 0; // Filter byte 0 (None)
    rgbaBuffer.copy(scanlines, scanlineOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatChunk = createChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 }));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  let pos = 8;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') {
      idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  return { width, height, decompressed };
}

// Resample RGBA buffer with area box averaging
function resample(src, targetW, targetH, forceMonochromeWhite = false) {
  const { width: srcW, height: srcH, decompressed } = src;
  const out = Buffer.alloc(targetW * targetH * 4);
  const srcStride = srcW * 4 + 1;
  const xRatio = srcW / targetW;
  const yRatio = srcH / targetH;

  for (let ty = 0; ty < targetH; ty++) {
    const srcYStart = Math.floor(ty * yRatio);
    const srcYEnd = Math.min(srcH, Math.floor((ty + 1) * yRatio));
    for (let tx = 0; tx < targetW; tx++) {
      const srcXStart = Math.floor(tx * xRatio);
      const srcXEnd = Math.min(srcW, Math.floor((tx + 1) * xRatio));

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let sy = srcYStart; sy < srcYEnd; sy++) {
        const row = sy * srcStride + 1;
        for (let sx = srcXStart; sx < srcXEnd; sx++) {
          const idx = row + sx * 4;
          rSum += decompressed[idx];
          gSum += decompressed[idx + 1];
          bSum += decompressed[idx + 2];
          aSum += decompressed[idx + 3];
          count++;
        }
      }
      const outIdx = (ty * targetW + tx) * 4;
      if (count > 0) {
        const avgAlpha = Math.round(aSum / count);
        if (forceMonochromeWhite) {
          // Silhouette: pure white for any non-transparent pixel
          out[outIdx] = 255;
          out[outIdx + 1] = 255;
          out[outIdx + 2] = 255;
          out[outIdx + 3] = avgAlpha;
        } else {
          out[outIdx] = Math.round(rSum / count);
          out[outIdx + 1] = Math.round(gSum / count);
          out[outIdx + 2] = Math.round(bSum / count);
          out[outIdx + 3] = avgAlpha;
        }
      }
    }
  }
  return encodePNG(targetW, targetH, out);
}

const publicDir = path.resolve(__dirname, '../public');

// 1. Generate Monochrome Notification Badges from brand-logo.png
const brandLogo = decodePNG(path.join(publicDir, 'brand-logo.png'));
const badge96 = resample(brandLogo, 96, 96, true);
const badge192 = resample(brandLogo, 192, 192, true);

fs.writeFileSync(path.join(publicDir, 'badge-96x96.png'), badge96);
fs.writeFileSync(path.join(publicDir, 'badge-192x192.png'), badge192);
console.log('Created badge-96x96.png (' + badge96.length + ' bytes)');
console.log('Created badge-192x192.png (' + badge192.length + ' bytes)');

// 2. Generate Standard PWA App Icons from pwa-icon.png
const pwaLogo = decodePNG(path.join(publicDir, 'pwa-icon.png'));
const pwa192 = resample(pwaLogo, 192, 192, false);
const pwa512 = resample(pwaLogo, 512, 512, false);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Created pwa-192x192.png (' + pwa192.length + ' bytes)');
console.log('Created pwa-512x512.png (' + pwa512.length + ' bytes)');
